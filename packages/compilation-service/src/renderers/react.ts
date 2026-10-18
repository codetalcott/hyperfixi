/**
 * React Component Renderer
 *
 * Generates complete React functional components from BehaviorSpecs.
 * Maps abstract operations to React hooks (useState, useRef, useCallback) and JSX.
 */

import type { AbstractOperation, BehaviorSpec, TargetRef } from '../operations/types.js';
import type {
  ComponentRenderer,
  ComponentRenderOptions,
  GeneratedComponent,
} from './component-types.js';
import {
  capitalize,
  cleanVarName,
  escapeString,
  generateComponentName,
  getSelfClassStates,
  inferInitial,
  inferTriggerContent,
  inferTriggerTag,
  inferType,
  isNumeric,
  selectorToTag,
  stateKey,
  targetKey,
  targetRefName,
  targetStateName,
} from './renderer-helpers.js';

// =============================================================================
// Renderer
// =============================================================================

/** @deprecated Removed in @lokascript/compilation-service 6.0, with `generateComponent`. */
export class ReactRenderer implements ComponentRenderer {
  readonly framework = 'react';

  render(spec: BehaviorSpec, options: ComponentRenderOptions = {}): GeneratedComponent {
    const componentName = options.componentName ?? generateComponentName(spec);
    const ts = options.typescript !== false;

    // Pre-pass: analyze what hooks and state we need
    const analysis = analyzeOperations(spec);

    const lines: string[] = [];

    // Imports
    const hooksList = [...analysis.hooks];
    if (hooksList.length > 0) {
      lines.push(`import { ${hooksList.join(', ')} } from 'react';`);
    }
    lines.push('');

    // Component function
    const propsType = ts ? '()' : '()';
    lines.push(`export function ${componentName}${propsType} {`);

    // State declarations
    for (const state of analysis.states) {
      const typeAnn = ts ? state.typeAnnotation : '';
      lines.push(
        `  const [${state.name}, ${state.setter}] = useState${typeAnn}(${state.initialValue});`
      );
    }

    // Ref declarations
    for (const ref of analysis.refs) {
      const typeAnn = ts ? ref.typeAnnotation : '';
      lines.push(`  const ${ref.name} = useRef${typeAnn}(null);`);
    }

    if (analysis.states.length > 0 || analysis.refs.length > 0) {
      lines.push('');
    }

    // Event handler
    const handlerName = `handle${capitalize(spec.trigger.event)}`;
    const asyncPrefix = spec.async ? 'async ' : '';
    lines.push(`  const ${handlerName} = useCallback(${asyncPrefix}() => {`);

    for (const op of spec.operations) {
      const opLines = generateOperationCode(op, analysis);
      for (const l of opLines) {
        lines.push(`    ${l}`);
      }
    }

    lines.push('  }, []);');
    lines.push('');

    // JSX return
    lines.push('  return (');
    const jsx = generateJSX(spec, analysis, handlerName);
    for (const l of jsx) {
      lines.push(`    ${l}`);
    }
    lines.push('  );');
    lines.push('}');
    lines.push('');

    return {
      name: componentName,
      code: lines.join('\n'),
      framework: 'react',
      operations: spec.operations,
      hooks: hooksList,
    };
  }
}

// =============================================================================
// Operation Analysis (pre-pass)
// =============================================================================

interface StateDecl {
  name: string;
  setter: string;
  typeAnnotation: string;
  initialValue: string;
  /** The target selector this state is associated with */
  targetKey: string;
}

interface RefDecl {
  name: string;
  typeAnnotation: string;
  targetKey: string;
}

interface OperationAnalysis {
  hooks: Set<string>;
  states: StateDecl[];
  refs: RefDecl[];
  /** Map from target key → state variable name */
  stateMap: Map<string, string>;
  /** Map from target key → ref variable name */
  refMap: Map<string, string>;
}

function analyzeOperations(spec: BehaviorSpec): OperationAnalysis {
  const hooks = new Set<string>();
  const states: StateDecl[] = [];
  const refs: RefDecl[] = [];
  const stateMap = new Map<string, string>();
  const refMap = new Map<string, string>();
  const seenStates = new Set<string>();

  // Always need useCallback for the handler
  hooks.add('useCallback');

  for (const op of spec.operations) {
    switch (op.op) {
      case 'toggleClass': {
        const key = stateKey('has', op.className, op.target);
        if (!seenStates.has(key)) {
          seenStates.add(key);
          hooks.add('useState');
          const name = `has${capitalize(op.className)}`;
          states.push({
            name,
            setter: `set${capitalize(name)}`,
            typeAnnotation: '<boolean>',
            initialValue: 'false',
            targetKey: targetKey(op.target),
          });
          stateMap.set(targetKey(op.target) + ':class:' + op.className, name);
        }
        break;
      }

      case 'addClass':
      case 'removeClass': {
        const key = stateKey('has', op.className, op.target);
        if (!seenStates.has(key)) {
          seenStates.add(key);
          hooks.add('useState');
          const name = `has${capitalize(op.className)}`;
          const initial = op.op === 'removeClass' ? 'true' : 'false';
          states.push({
            name,
            setter: `set${capitalize(name)}`,
            typeAnnotation: '<boolean>',
            initialValue: initial,
            targetKey: targetKey(op.target),
          });
          stateMap.set(targetKey(op.target) + ':class:' + op.className, name);
        }
        break;
      }

      case 'show':
      case 'hide': {
        const tk = targetKey(op.target);
        const key = 'visible:' + tk;
        if (!seenStates.has(key)) {
          seenStates.add(key);
          hooks.add('useState');
          const name = targetStateName(op.target, 'Visible');
          states.push({
            name,
            setter: `set${capitalize(name)}`,
            typeAnnotation: '<boolean>',
            initialValue: op.op === 'hide' ? 'true' : 'false',
            targetKey: tk,
          });
          stateMap.set(tk + ':visible', name);
        }
        break;
      }

      case 'setContent':
      case 'appendContent': {
        const tk = targetKey(op.target);
        const key = 'content:' + tk;
        if (!seenStates.has(key)) {
          seenStates.add(key);
          hooks.add('useState');
          const name = targetStateName(op.target, 'Content');
          states.push({
            name,
            setter: `set${capitalize(name)}`,
            typeAnnotation: '<string>',
            initialValue: "''",
            targetKey: tk,
          });
          stateMap.set(tk + ':content', name);
        }
        break;
      }

      case 'setVariable': {
        const key = 'var:' + op.name;
        if (!seenStates.has(key)) {
          seenStates.add(key);
          hooks.add('useState');
          const name = cleanVarName(op.name);
          const typeAnn = inferType(op.value);
          states.push({
            name,
            setter: `set${capitalize(name)}`,
            typeAnnotation: typeAnn,
            initialValue: inferInitial(op.value, typeAnn),
            targetKey: 'var:' + op.name,
          });
          stateMap.set('var:' + op.name, name);
        }
        break;
      }

      case 'increment':
      case 'decrement': {
        const tk = targetKey(op.target);
        const key = 'num:' + tk;
        if (!seenStates.has(key)) {
          seenStates.add(key);
          hooks.add('useState');
          const name = targetStateName(op.target, 'Count');
          states.push({
            name,
            setter: `set${capitalize(name)}`,
            typeAnnotation: '<number>',
            initialValue: '0',
            targetKey: tk,
          });
          stateMap.set(tk + ':num', name);
        }
        break;
      }

      case 'fetch': {
        // Need state for the fetched data
        if (op.target) {
          const tk = targetKey(op.target);
          const key = 'content:' + tk;
          if (!seenStates.has(key)) {
            seenStates.add(key);
            hooks.add('useState');
            const name = targetStateName(op.target, 'Content');
            states.push({
              name,
              setter: `set${capitalize(name)}`,
              typeAnnotation: '<string>',
              initialValue: "''",
              targetKey: tk,
            });
            stateMap.set(tk + ':content', name);
          }
        }
        break;
      }

      case 'focus':
      case 'blur': {
        const tk = targetKey(op.target);
        if (!refMap.has(tk)) {
          hooks.add('useRef');
          const name = targetRefName(op.target);
          refs.push({
            name,
            typeAnnotation: '<HTMLElement>',
            targetKey: tk,
          });
          refMap.set(tk, name);
        }
        break;
      }

      case 'triggerEvent': {
        const tk = targetKey(op.target);
        if (!refMap.has(tk)) {
          hooks.add('useRef');
          const name = targetRefName(op.target);
          refs.push({
            name,
            typeAnnotation: '<HTMLElement>',
            targetKey: tk,
          });
          refMap.set(tk, name);
        }
        break;
      }

      // navigate, historyBack, historyForward, wait, log — no state/refs needed
    }
  }

  return { hooks, states, refs, stateMap, refMap };
}

// =============================================================================
// Operation Code Generation
// =============================================================================

function generateOperationCode(op: AbstractOperation, analysis: OperationAnalysis): string[] {
  switch (op.op) {
    case 'toggleClass': {
      const stateVar = analysis.stateMap.get(targetKey(op.target) + ':class:' + op.className);
      const setter = stateVar ? `set${capitalize(stateVar)}` : 'setState';
      return [`${setter}(prev => !prev);`];
    }

    case 'addClass': {
      const stateVar = analysis.stateMap.get(targetKey(op.target) + ':class:' + op.className);
      const setter = stateVar ? `set${capitalize(stateVar)}` : 'setState';
      return [`${setter}(true);`];
    }

    case 'removeClass': {
      const stateVar = analysis.stateMap.get(targetKey(op.target) + ':class:' + op.className);
      const setter = stateVar ? `set${capitalize(stateVar)}` : 'setState';
      return [`${setter}(false);`];
    }

    case 'show': {
      const stateVar = analysis.stateMap.get(targetKey(op.target) + ':visible');
      const setter = stateVar ? `set${capitalize(stateVar)}` : 'setVisible';
      return [`${setter}(true);`];
    }

    case 'hide': {
      const stateVar = analysis.stateMap.get(targetKey(op.target) + ':visible');
      const setter = stateVar ? `set${capitalize(stateVar)}` : 'setVisible';
      return [`${setter}(false);`];
    }

    case 'setContent': {
      const stateVar = analysis.stateMap.get(targetKey(op.target) + ':content');
      const setter = stateVar ? `set${capitalize(stateVar)}` : 'setContent';
      return [`${setter}('${escapeString(op.content)}');`];
    }

    case 'appendContent': {
      const stateVar = analysis.stateMap.get(targetKey(op.target) + ':content');
      const setter = stateVar ? `set${capitalize(stateVar)}` : 'setContent';
      return [`${setter}(prev => prev + '${escapeString(op.content)}');`];
    }

    case 'setVariable': {
      const stateVar = analysis.stateMap.get('var:' + op.name);
      const setter = stateVar ? `set${capitalize(stateVar)}` : 'setValue';
      const val = isNumeric(op.value) ? op.value : `'${escapeString(op.value)}'`;
      return [`${setter}(${val});`];
    }

    case 'increment': {
      const stateVar = analysis.stateMap.get(targetKey(op.target) + ':num');
      const setter = stateVar ? `set${capitalize(stateVar)}` : 'setCount';
      return [`${setter}(prev => prev + ${op.amount});`];
    }

    case 'decrement': {
      const stateVar = analysis.stateMap.get(targetKey(op.target) + ':num');
      const setter = stateVar ? `set${capitalize(stateVar)}` : 'setCount';
      return [`${setter}(prev => prev - ${op.amount});`];
    }

    case 'navigate':
      return [`window.location.href = '${escapeString(op.url)}';`];

    case 'historyBack':
      return ['window.history.back();'];

    case 'historyForward':
      return ['window.history.forward();'];

    case 'fetch': {
      const lines: string[] = [];
      lines.push(`const response = await fetch('${escapeString(op.url)}');`);
      if (op.format === 'json') {
        lines.push('const data = await response.json();');
      } else if (op.format === 'html') {
        lines.push('const data = await response.text();');
      } else {
        lines.push('const data = await response.text();');
      }
      if (op.target) {
        const stateVar = analysis.stateMap.get(targetKey(op.target) + ':content');
        const setter = stateVar ? `set${capitalize(stateVar)}` : 'setContent';
        if (op.format === 'json') {
          lines.push(`${setter}(JSON.stringify(data));`);
        } else {
          lines.push(`${setter}(data);`);
        }
      }
      return lines;
    }

    case 'wait':
      return [`await new Promise(resolve => setTimeout(resolve, ${op.durationMs}));`];

    case 'focus': {
      const refName = analysis.refMap.get(targetKey(op.target));
      return [`${refName ?? 'ref'}?.current?.focus();`];
    }

    case 'blur': {
      const refName = analysis.refMap.get(targetKey(op.target));
      return [`${refName ?? 'ref'}?.current?.blur();`];
    }

    case 'triggerEvent': {
      const refName = analysis.refMap.get(targetKey(op.target));
      return [
        `${refName ?? 'ref'}?.current?.dispatchEvent(new CustomEvent('${escapeString(op.eventName)}', { bubbles: true }));`,
      ];
    }

    case 'log':
      return [`console.log(${op.values.map(v => `'${escapeString(v)}'`).join(', ')});`];

    default:
      return [`// Unsupported: ${(op as AbstractOperation).op}`];
  }
}

// =============================================================================
// JSX Generation
// =============================================================================

function generateJSX(
  spec: BehaviorSpec,
  analysis: OperationAnalysis,
  handlerName: string
): string[] {
  const lines: string[] = [];
  const elements = collectJSXElements(spec, analysis);
  const eventProp = eventToReactProp(spec.trigger.event);

  const needsFragment = elements.length > 1 || elements.length === 0;

  if (needsFragment) lines.push('<>');

  // Trigger element
  const triggerTag = inferTriggerTag(spec);
  const triggerAttrs: string[] = [`${eventProp}={${handlerName}}`];

  // If trigger is 'self' and there are class operations on self, add className
  const selfClassStates = getSelfClassStates(spec, analysis.stateMap);
  if (selfClassStates.length > 0) {
    const classExpr = selfClassStates
      .map(s => `\${${s.stateName} ? '${s.className}' : ''}`)
      .join(' ')
      .trim();
    triggerAttrs.push(`className={\`${classExpr}\`.trim()}`);
  }

  const indent = needsFragment ? '  ' : '';
  lines.push(
    `${indent}<${triggerTag} ${triggerAttrs.join(' ')}>${inferTriggerContent(spec)}</${triggerTag}>`
  );

  // Target elements (that aren't the trigger)
  for (const el of elements) {
    const elLines = renderJSXElement(el, analysis);
    for (const l of elLines) {
      lines.push(`${indent}${l}`);
    }
  }

  if (needsFragment) lines.push('</>');

  return lines;
}

interface JSXElement {
  selector: string;
  tag: string;
  id?: string;
  className?: string;
  content?: string;
  /** Operations targeting this element */
  ops: AbstractOperation[];
}

function collectJSXElements(spec: BehaviorSpec, _analysis: OperationAnalysis): JSXElement[] {
  const seen = new Set<string>();
  const elements: JSXElement[] = [];

  for (const op of spec.operations) {
    if (!('target' in op)) continue;
    const target = (op as { target: TargetRef }).target;
    if (target.kind !== 'selector') continue;

    // Skip if this is the trigger element (it's rendered separately)
    if (spec.triggerTarget.kind === 'selector' && spec.triggerTarget.value === target.value)
      continue;

    const sel = target.value;
    if (seen.has(sel)) {
      // Add op to existing element
      const existing = elements.find(e => e.selector === sel);
      if (existing) existing.ops.push(op);
      continue;
    }
    seen.add(sel);

    const tag = selectorToTag(sel);
    const id = sel.startsWith('#') ? sel.slice(1) : undefined;
    const cls = sel.startsWith('.') ? sel.slice(1) : undefined;

    elements.push({
      selector: sel,
      tag,
      id,
      className: cls,
      ops: [op],
    });
  }

  return elements;
}

function renderJSXElement(el: JSXElement, analysis: OperationAnalysis): string[] {
  const lines: string[] = [];
  const attrs: string[] = [];

  if (el.id) attrs.push(`id="${el.id}"`);

  // Check for class state on this element
  const classStates: { stateName: string; className: string }[] = [];
  for (const op of el.ops) {
    if (op.op === 'toggleClass' || op.op === 'addClass' || op.op === 'removeClass') {
      const stateVar = analysis.stateMap.get(el.selector + ':class:' + op.className);
      if (stateVar) {
        classStates.push({ stateName: stateVar, className: op.className });
      }
    }
  }

  if (classStates.length > 0) {
    const parts = classStates.map(s => `\${${s.stateName} ? '${s.className}' : ''}`);
    if (el.className) {
      attrs.push(`className={\`${el.className} ${parts.join(' ')}\`.trim()}`);
    } else {
      attrs.push(`className={\`${parts.join(' ')}\`.trim()}`);
    }
  } else if (el.className) {
    attrs.push(`className="${el.className}"`);
  }

  // Check for ref on this element
  const refName = analysis.refMap.get(el.selector);
  if (refName) {
    attrs.push(`ref={${refName}}`);
  }

  // Check for visibility state
  const visState = analysis.stateMap.get(el.selector + ':visible');

  // Check for content state
  const contentState = analysis.stateMap.get(el.selector + ':content');

  // Check for numeric state
  const numState = analysis.stateMap.get(el.selector + ':num');

  const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
  const content = contentState
    ? `{${contentState}}`
    : numState
      ? `{${numState}}`
      : (el.content ?? el.id ?? '');

  const elementLine = `<${el.tag}${attrStr}>${content}</${el.tag}>`;

  if (visState) {
    lines.push(`{${visState} && ${elementLine}}`);
  } else {
    lines.push(elementLine);
  }

  return lines;
}

// =============================================================================
// React-specific Helpers
// =============================================================================

function eventToReactProp(event: string): string {
  switch (event) {
    case 'click':
      return 'onClick';
    case 'dblclick':
      return 'onDoubleClick';
    case 'mouseenter':
      return 'onMouseEnter';
    case 'mouseover':
      return 'onMouseOver';
    case 'mouseleave':
      return 'onMouseLeave';
    case 'focus':
      return 'onFocus';
    case 'blur':
      return 'onBlur';
    case 'keydown':
      return 'onKeyDown';
    case 'keyup':
      return 'onKeyUp';
    case 'keypress':
      return 'onKeyPress';
    case 'input':
      return 'onInput';
    case 'change':
      return 'onChange';
    case 'submit':
      return 'onSubmit';
    default:
      return `on${capitalize(event)}`;
  }
}
