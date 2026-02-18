/**
 * Shared Renderer Helpers
 *
 * Pure utility functions used by React, Vue, and Svelte component renderers.
 * Framework-agnostic: naming, type inference, tag inference, string escaping.
 */

import type { BehaviorSpec, TargetRef } from '../operations/types.js';

// =============================================================================
// String Utilities
// =============================================================================

export function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function isNumeric(s: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(s);
}

export function cleanVarName(name: string): string {
  return name.replace(/^:/, '').replace(/[^a-zA-Z0-9]/g, '');
}

// =============================================================================
// Target Helpers
// =============================================================================

export function targetKey(target: TargetRef): string {
  if (target.kind === 'self') return 'self';
  return target.value;
}

export function stateKey(prefix: string, name: string, target: TargetRef): string {
  return `${prefix}:${name}:${targetKey(target)}`;
}

export function targetStateName(target: TargetRef, suffix: string): string {
  if (target.kind === 'selector') {
    const clean = target.value.replace(/^[#.]/, '');
    return clean + suffix;
  }
  return suffix.toLowerCase();
}

export function targetRefName(target: TargetRef): string {
  if (target.kind === 'selector') {
    const clean = target.value.replace(/^[#.]/, '');
    return clean + 'Ref';
  }
  return 'elementRef';
}

// =============================================================================
// Type Inference
// =============================================================================

export function inferType(value: string): string {
  if (isNumeric(value)) return '<number>';
  if (value === 'true' || value === 'false') return '<boolean>';
  return '<string>';
}

export function inferInitial(value: string, typeAnn: string): string {
  if (typeAnn === '<number>') return isNumeric(value) ? value : '0';
  if (typeAnn === '<boolean>') return value === 'true' ? 'true' : 'false';
  return `'${escapeString(value)}'`;
}

// =============================================================================
// Tag and Selector Inference
// =============================================================================

export function selectorToTag(selector: string): string {
  if (selector.startsWith('#')) {
    const id = selector.slice(1).toLowerCase();
    if (['btn', 'button', 'submit', 'trigger'].includes(id)) return 'button';
    if (['input', 'search', 'email', 'text', 'field'].includes(id)) return 'input';
    if (['form', 'signup', 'login'].includes(id)) return 'form';
    return 'div';
  }
  return 'div';
}

export function inferTriggerTag(spec: BehaviorSpec): string {
  if (spec.triggerTarget.kind === 'selector') {
    return selectorToTag(spec.triggerTarget.value);
  }
  if (spec.trigger.event === 'submit') return 'form';
  if (spec.trigger.event === 'input' || spec.trigger.event === 'change') return 'input';
  return 'button';
}

export function inferTriggerContent(spec: BehaviorSpec): string {
  const tag = inferTriggerTag(spec);
  if (tag === 'input' || tag === 'form') return '';
  if (spec.triggerTarget.kind === 'selector') {
    const id = spec.triggerTarget.value.replace(/^[#.]/, '');
    return capitalize(id);
  }
  return 'Click';
}

// =============================================================================
// Component Naming
// =============================================================================

export function generateComponentName(spec: BehaviorSpec): string {
  if (spec.operations.length === 0) return 'Component';

  const parts: string[] = [];
  const firstOp = spec.operations[0];

  switch (firstOp.op) {
    case 'toggleClass':
      parts.push('Toggle', capitalize(firstOp.className));
      break;
    case 'addClass':
      parts.push('Add', capitalize(firstOp.className));
      break;
    case 'removeClass':
      parts.push('Remove', capitalize(firstOp.className));
      break;
    case 'show':
      parts.push('Show');
      appendTargetName(parts, firstOp.target);
      break;
    case 'hide':
      parts.push('Hide');
      appendTargetName(parts, firstOp.target);
      break;
    case 'setContent':
      parts.push('SetContent');
      appendTargetName(parts, firstOp.target);
      break;
    case 'navigate':
      parts.push('NavigateTo');
      parts.push(capitalize(firstOp.url.replace(/[^a-zA-Z0-9]/g, '')));
      break;
    case 'fetch':
      parts.push('FetchData');
      break;
    case 'increment':
      parts.push('Increment');
      appendTargetName(parts, firstOp.target);
      break;
    case 'decrement':
      parts.push('Decrement');
      appendTargetName(parts, firstOp.target);
      break;
    case 'focus':
      parts.push('Focus');
      appendTargetName(parts, firstOp.target);
      break;
    default:
      parts.push('Component');
  }

  if (spec.trigger.event !== 'click') {
    parts.push('On', capitalize(spec.trigger.event));
  }

  return parts.join('') || 'Component';
}

function appendTargetName(parts: string[], target: TargetRef): void {
  if (target.kind === 'selector') {
    const clean = target.value.replace(/^[#.]/, '');
    parts.push(capitalize(clean));
  }
}

// =============================================================================
// Class State Extraction
// =============================================================================

/**
 * Find class operations on the trigger element ('self') and look up their state variable names.
 * Works with any renderer's stateMap as long as keys follow the `target:class:className` pattern.
 */
export function getSelfClassStates(
  spec: BehaviorSpec,
  stateMap: Map<string, string>
): { stateName: string; className: string }[] {
  const result: { stateName: string; className: string }[] = [];
  for (const op of spec.operations) {
    if (
      (op.op === 'toggleClass' || op.op === 'addClass' || op.op === 'removeClass') &&
      op.target.kind === 'self'
    ) {
      const stateVar = stateMap.get('self:class:' + op.className);
      if (stateVar) {
        result.push({ stateName: stateVar, className: op.className });
      }
    }
  }
  return result;
}
