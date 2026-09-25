/**
 * How `beep!` reports a value: shared by the command (`beep! x, y`) and the
 * expression (`set $x to beep! x`), so the two forms cannot drift apart.
 *
 * Each value first fires upstream's `hyperscript:beep` on `me`, bubbling and
 * cancelable, with `detail: { element, value }`, as upstream's
 * `beepValueToConsole` does. A listener that cancels the event silences that
 * value. The console output is hyperfixi's own grouped Value / Type /
 * Representation block, which the command has always printed.
 *
 * **Console output is intentional**: reporting a value is `beep!`'s whole
 * purpose.
 */

import { isHTMLElement } from './element-check';

export interface BeepOutput {
  value: unknown;
  type: string;
  representation: string;
}

/**
 * Report each value, returning a description of every one, including those a
 * listener silenced.
 */
export function beepValues(me: unknown, values: readonly unknown[]): BeepOutput[] {
  const outputs = values.map(describeBeepValue);
  const shown = outputs.filter(output => announce(me, output.value));
  if (shown.length === 0) return outputs;

  console.group('🔔 beep! Debug Output');
  for (const output of shown) {
    console.log(`Value:`, output.value);
    console.log(`Type:`, output.type);
    console.log(`Representation:`, output.representation);
    console.log('---');
  }
  console.groupEnd();
  return outputs;
}

/** Fire `hyperscript:beep`; false when a listener cancelled it. */
function announce(me: unknown, value: unknown): boolean {
  const target = me as EventTarget | null | undefined;
  if (typeof CustomEvent !== 'function' || typeof target?.dispatchEvent !== 'function') return true;
  return target.dispatchEvent(
    new CustomEvent('hyperscript:beep', {
      bubbles: true,
      cancelable: true,
      detail: { element: me, value },
    })
  );
}

export function describeBeepValue(value: unknown): BeepOutput {
  return { value, type: typeOf(value), representation: representationOf(value) };
}

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  if (isHTMLElement(value)) return 'HTMLElement';
  if (typeof Element !== 'undefined' && value instanceof Element) return 'Element';
  if (typeof Node !== 'undefined' && value instanceof Node) return 'Node';
  if (value instanceof Error) return 'Error';
  if (value instanceof Date) return 'Date';
  if (value instanceof RegExp) return 'RegExp';
  return typeof value;
}

function representationOf(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) {
    return `Array(${value.length}) [${value
      .slice(0, 3)
      .map(v => representationOf(v))
      .join(', ')}${value.length > 3 ? '...' : ''}]`;
  }
  if (isHTMLElement(value)) {
    const el = value as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const classes = el.className ? `.${el.className.split(' ').join('.')}` : '';
    return `<${tag}${id}${classes}/>`;
  }
  if (value instanceof Error) return `Error: ${value.message}`;
  if (typeof value === 'string')
    return value.length > 50 ? `"${value.substring(0, 47)}..."` : `"${value}"`;
  if (typeof value === 'object') {
    try {
      const keys = Object.keys(value);
      return `Object {${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}`;
    } catch {
      return '[Object]';
    }
  }
  return String(value);
}
