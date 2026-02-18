/**
 * Svelte 5 Component Renderer
 *
 * Generates Svelte 5 components with runes ($state, $derived, $effect)
 * from BehaviorSpecs.
 * Maps abstract operations to direct state mutation and Svelte template syntax.
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

export class SvelteRenderer implements ComponentRenderer {
  readonly framework = 'svelte';

  render(spec: BehaviorSpec, options: ComponentRenderOptions = {}): GeneratedComponent {
    const componentName = options.componentName ?? generateComponentName(spec);
    const ts = options.typescript !== false;

    const analysis = analyzeOperations(spec, ts);

    // -- <script> block --
    const scriptLines: string[] = [];

    // State declarations ($state runes — no imports needed)
    for (const state of analysis.states) {
      scriptLines.push(`let ${state.name} = $state(${state.initialValue})`);
    }

    // Ref declarations (plain variables, bound via bind:this)
    for (const r of analysis.refs) {
      if (ts) {
        scriptLines.push(`let ${r.name}: HTMLElement`);
      } else {
        scriptLines.push(`let ${r.name}`);
      }
    }

    if (analysis.states.length > 0 || analysis.refs.length > 0) {
      scriptLines.push('');
    }

    // Event handler
    const handlerName = `handle${capitalize(spec.trigger.event)}`;
    const asyncPrefix = spec.async ? 'async ' : '';
    scriptLines.push(`${asyncPrefix}function ${handlerName}() {`);

    for (const op of spec.operations) {
      const opLines = generateOperationCode(op, analysis);
      for (const l of opLines) {
        scriptLines.push(`  ${l}`);
      }
    }

    scriptLines.push('}');

    // -- Template --
    const templateLines = generateTemplate(spec, analysis, handlerName);

    // -- Combine --
    const langAttr = ts ? ' lang="ts"' : '';
    const lines: string[] = [];
    lines.push(`<script${langAttr}>`);
    for (const l of scriptLines) {
      lines.push(`  ${l}`);
    }
    lines.push('</script>');
    lines.push('');
    for (const l of templateLines) {
      lines.push(l);
    }
    lines.push('');

    // Track which runes are used
    const hooks: string[] = [];
    if (analysis.states.length > 0) hooks.push('$state');

    return {
      name: componentName,
      code: lines.join('\n'),
      framework: 'svelte',
      operations: spec.operations,
      hooks,
    };
  }
}

// =============================================================================
// Operation Analysis
// =============================================================================

interface SvelteStateDecl {
  name: string;
  initialValue: string;
  targetKey: string;
}

interface SvelteRefDecl {
  name: string;
  targetKey: string;
}

interface SvelteAnalysis {
  states: SvelteStateDecl[];
  refs: SvelteRefDecl[];
  stateMap: Map<string, string>;
  refMap: Map<string, string>;
  ts: boolean;
}

function analyzeOperations(spec: BehaviorSpec, ts: boolean): SvelteAnalysis {
  const states: SvelteStateDecl[] = [];
  const refs: SvelteRefDecl[] = [];
  const stateMap = new Map<string, string>();
  const refMap = new Map<string, string>();
  const seenStates = new Set<string>();

  for (const op of spec.operations) {
    switch (op.op) {
      case 'toggleClass': {
        const key = stateKey('has', op.className, op.target);
        if (!seenStates.has(key)) {
          seenStates.add(key);
          const name = `has${capitalize(op.className)}`;
          states.push({ name, initialValue: 'false', targetKey: targetKey(op.target) });
          stateMap.set(targetKey(op.target) + ':class:' + op.className, name);
        }
        break;
      }

      case 'addClass':
      case 'removeClass': {
        const key = stateKey('has', op.className, op.target);
        if (!seenStates.has(key)) {
          seenStates.add(key);
          const name = `has${capitalize(op.className)}`;
          const initial = op.op === 'removeClass' ? 'true' : 'false';
          states.push({ name, initialValue: initial, targetKey: targetKey(op.target) });
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
          const name = targetStateName(op.target, 'Visible');
          states.push({
            name,
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
          const name = targetStateName(op.target, 'Content');
          states.push({ name, initialValue: "''", targetKey: tk });
          stateMap.set(tk + ':content', name);
        }
        break;
      }

      case 'setVariable': {
        const key = 'var:' + op.name;
        if (!seenStates.has(key)) {
          seenStates.add(key);
          const name = cleanVarName(op.name);
          const typeAnn = inferType(op.value);
          states.push({
            name,
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
          const name = targetStateName(op.target, 'Count');
          states.push({ name, initialValue: '0', targetKey: tk });
          stateMap.set(tk + ':num', name);
        }
        break;
      }

      case 'fetch': {
        if (op.target) {
          const tk = targetKey(op.target);
          const key = 'content:' + tk;
          if (!seenStates.has(key)) {
            seenStates.add(key);
            const name = targetStateName(op.target, 'Content');
            states.push({ name, initialValue: "''", targetKey: tk });
            stateMap.set(tk + ':content', name);
          }
        }
        break;
      }

      case 'focus':
      case 'blur': {
        const tk = targetKey(op.target);
        if (!refMap.has(tk)) {
          const name = targetRefName(op.target);
          refs.push({ name, targetKey: tk });
          refMap.set(tk, name);
        }
        break;
      }

      case 'triggerEvent': {
        const tk = targetKey(op.target);
        if (!refMap.has(tk)) {
          const name = targetRefName(op.target);
          refs.push({ name, targetKey: tk });
          refMap.set(tk, name);
        }
        break;
      }
    }
  }

  return { states, refs, stateMap, refMap, ts };
}

// =============================================================================
// Operation Code Generation (Svelte: direct mutation)
// =============================================================================

function generateOperationCode(op: AbstractOperation, analysis: SvelteAnalysis): string[] {
  switch (op.op) {
    case 'toggleClass': {
      const stateVar = analysis.stateMap.get(targetKey(op.target) + ':class:' + op.className);
      return [`${stateVar ?? 'state'} = !${stateVar ?? 'state'}`];
    }

    case 'addClass': {
      const stateVar = analysis.stateMap.get(targetKey(op.target) + ':class:' + op.className);
      return [`${stateVar ?? 'state'} = true`];
    }

    case 'removeClass': {
      const stateVar = analysis.stateMap.get(targetKey(op.target) + ':class:' + op.className);
      return [`${stateVar ?? 'state'} = false`];
    }

    case 'show': {
      const stateVar = analysis.stateMap.get(targetKey(op.target) + ':visible');
      return [`${stateVar ?? 'visible'} = true`];
    }

    case 'hide': {
      const stateVar = analysis.stateMap.get(targetKey(op.target) + ':visible');
      return [`${stateVar ?? 'visible'} = false`];
    }

    case 'setContent': {
      const stateVar = analysis.stateMap.get(targetKey(op.target) + ':content');
      return [`${stateVar ?? 'content'} = '${escapeString(op.content)}'`];
    }

    case 'appendContent': {
      const stateVar = analysis.stateMap.get(targetKey(op.target) + ':content');
      return [`${stateVar ?? 'content'} += '${escapeString(op.content)}'`];
    }

    case 'setVariable': {
      const stateVar = analysis.stateMap.get('var:' + op.name);
      const val = isNumeric(op.value) ? op.value : `'${escapeString(op.value)}'`;
      return [`${stateVar ?? 'value'} = ${val}`];
    }

    case 'increment': {
      const stateVar = analysis.stateMap.get(targetKey(op.target) + ':num');
      return [`${stateVar ?? 'count'} += ${op.amount}`];
    }

    case 'decrement': {
      const stateVar = analysis.stateMap.get(targetKey(op.target) + ':num');
      return [`${stateVar ?? 'count'} -= ${op.amount}`];
    }

    case 'navigate':
      return [`window.location.href = '${escapeString(op.url)}'`];

    case 'historyBack':
      return ['window.history.back()'];

    case 'historyForward':
      return ['window.history.forward()'];

    case 'fetch': {
      const lines: string[] = [];
      lines.push(`const response = await fetch('${escapeString(op.url)}')`);
      if (op.format === 'json') {
        lines.push('const data = await response.json()');
      } else {
        lines.push('const data = await response.text()');
      }
      if (op.target) {
        const stateVar = analysis.stateMap.get(targetKey(op.target) + ':content');
        if (op.format === 'json') {
          lines.push(`${stateVar ?? 'content'} = JSON.stringify(data)`);
        } else {
          lines.push(`${stateVar ?? 'content'} = data`);
        }
      }
      return lines;
    }

    case 'wait':
      return [`await new Promise(resolve => setTimeout(resolve, ${op.durationMs}))`];

    case 'focus': {
      const refName = analysis.refMap.get(targetKey(op.target));
      return [`${refName ?? 'ref'}?.focus()`];
    }

    case 'blur': {
      const refName = analysis.refMap.get(targetKey(op.target));
      return [`${refName ?? 'ref'}?.blur()`];
    }

    case 'triggerEvent': {
      const refName = analysis.refMap.get(targetKey(op.target));
      return [
        `${refName ?? 'ref'}?.dispatchEvent(new CustomEvent('${escapeString(op.eventName)}', { bubbles: true }))`,
      ];
    }

    case 'log':
      return [`console.log(${op.values.map(v => `'${escapeString(v)}'`).join(', ')})`];

    default:
      return [`// Unsupported: ${(op as AbstractOperation).op}`];
  }
}

// =============================================================================
// Template Generation
// =============================================================================

function generateTemplate(
  spec: BehaviorSpec,
  analysis: SvelteAnalysis,
  handlerName: string
): string[] {
  const lines: string[] = [];
  const elements = collectTargetElements(spec);
  const eventAttr = `on${spec.trigger.event}`;

  // Trigger element
  const triggerTag = inferTriggerTag(spec);
  const triggerAttrs: string[] = [`${eventAttr}={${handlerName}}`];

  // Class directives on trigger
  const selfClassStates = getSelfClassStates(spec, analysis.stateMap);
  for (const s of selfClassStates) {
    triggerAttrs.push(`class:${s.className}={${s.stateName}}`);
  }

  const triggerContent = inferTriggerContent(spec);
  lines.push(`<${triggerTag} ${triggerAttrs.join(' ')}>${triggerContent}</${triggerTag}>`);

  // Target elements
  for (const el of elements) {
    const elLines = renderSvelteElement(el, analysis);
    for (const l of elLines) {
      lines.push(l);
    }
  }

  return lines;
}

interface TemplateElement {
  selector: string;
  tag: string;
  id?: string;
  className?: string;
  ops: AbstractOperation[];
}

function collectTargetElements(spec: BehaviorSpec): TemplateElement[] {
  const seen = new Set<string>();
  const elements: TemplateElement[] = [];

  for (const op of spec.operations) {
    if (!('target' in op)) continue;
    const target = (op as { target: TargetRef }).target;
    if (target.kind !== 'selector') continue;

    if (spec.triggerTarget.kind === 'selector' && spec.triggerTarget.value === target.value)
      continue;

    const sel = target.value;
    if (seen.has(sel)) {
      const existing = elements.find(e => e.selector === sel);
      if (existing) existing.ops.push(op);
      continue;
    }
    seen.add(sel);

    const tag = selectorToTag(sel);
    const id = sel.startsWith('#') ? sel.slice(1) : undefined;
    const cls = sel.startsWith('.') ? sel.slice(1) : undefined;

    elements.push({ selector: sel, tag, id, className: cls, ops: [op] });
  }

  return elements;
}

function renderSvelteElement(el: TemplateElement, analysis: SvelteAnalysis): string[] {
  const lines: string[] = [];
  const attrs: string[] = [];

  if (el.id) attrs.push(`id="${el.id}"`);

  // Class directives
  const classStates: { stateName: string; className: string }[] = [];
  for (const op of el.ops) {
    if (op.op === 'toggleClass' || op.op === 'addClass' || op.op === 'removeClass') {
      const stateVar = analysis.stateMap.get(el.selector + ':class:' + op.className);
      if (stateVar) {
        classStates.push({ stateName: stateVar, className: op.className });
      }
    }
  }

  if (el.className) {
    attrs.push(`class="${el.className}"`);
  }
  for (const s of classStates) {
    attrs.push(`class:${s.className}={${s.stateName}}`);
  }

  // Ref binding
  const refName = analysis.refMap.get(el.selector);
  if (refName) {
    attrs.push(`bind:this={${refName}}`);
  }

  // Visibility
  const visState = analysis.stateMap.get(el.selector + ':visible');

  // Content
  const contentState = analysis.stateMap.get(el.selector + ':content');
  const numState = analysis.stateMap.get(el.selector + ':num');

  const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
  const content = contentState ? `{${contentState}}` : numState ? `{${numState}}` : (el.id ?? '');

  const elementLine = `<${el.tag}${attrStr}>${content}</${el.tag}>`;

  if (visState) {
    lines.push(`{#if ${visState}}`);
    lines.push(`  ${elementLine}`);
    lines.push('{/if}');
  } else {
    lines.push(elementLine);
  }

  return lines;
}
