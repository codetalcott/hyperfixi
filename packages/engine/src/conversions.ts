/**
 * The less common `as <Name>` conversions. Follows upstream
 * `core/runtime/conversions.js`; the everyday ones live in `runtime.ts`.
 */
import type { Grammar } from './parser';
import { conversions as table, dynamicResolvers, implicitLoop } from './runtime';
import { get, isIterable } from './util';

const list = (v: unknown): unknown[] => (isIterable(v) ? Array.from(v) : Array.from(Object(v)));

const toHtml = (v: unknown): string => {
  if (Array.isArray(v) || v instanceof NodeList) return list(v).map(toHtml).join('');
  return v instanceof HTMLElement ? v.outerHTML : v instanceof Node ? '' : String(v);
};

/** Form values of an element or the inputs inside it: `<form> as Values`. */
function values(root: unknown): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const addField = (node: unknown) => {
    const name = get(node, 'name');
    let value = get(node, 'value');
    const type = get(node, 'type');
    if (typeof name !== 'string' || value == null) return;
    if (type === 'radio' && !get(node, 'checked')) return;
    if (type === 'checkbox') value = get(node, 'checked') ? [value] : undefined;
    else if (node instanceof HTMLSelectElement && node.multiple) {
      value = Array.from(node.selectedOptions, option => option.value);
    }
    if (value === undefined) return;
    const existing = result[name];
    result[name] =
      existing === undefined
        ? value
        : (Array.isArray(existing) ? existing : [existing]).concat(value);
  };
  implicitLoop(root, node => {
    if (get(node, 'name') != null && get(node, 'value') != null) addField(node);
    else if (node instanceof Element)
      node.querySelectorAll('input,select,textarea').forEach(addField);
  });
  return result;
}

export function conversions(_g: Grammar): void {
  Object.assign(table, {
    Boolean: (v: unknown) => !!v,
    Date: (v: unknown) =>
      typeof v === 'number' || v instanceof Date ? new Date(v) : new Date(String(v)),
    Array: list,
    JSON: (v: unknown) => (v instanceof Response ? v.json() : JSON.parse(String(v))),
    JSONString: (v: unknown) => JSON.stringify(v),
    Object: (v: unknown) =>
      typeof v === 'string' || v instanceof String ? JSON.parse(String(v)) : { ...Object(v) },
    FormEncoded: (v: unknown) => new URLSearchParams(Object(v)).toString(),
    Set: (v: unknown) => new Set(list(v)),
    Map: (v: unknown) => new Map(Object.entries(Object(v))),
    Keys: (v: unknown) => (v instanceof Map ? Array.from(v.keys()) : Object.keys(Object(v))),
    Entries: (v: unknown) =>
      v instanceof Map ? Array.from(v.entries()) : Object.entries(Object(v)),
    Reversed: (v: unknown) => list(v).reverse(),
    Unique: (v: unknown) => [...new Set(list(v))],
    Flat: (v: unknown) => list(v).flat(),
    HTML: toHtml,
  });
  dynamicResolvers.push(
    (name, value) => {
      if (name === 'Fixed' || name.startsWith('Fixed:'))
        return Number(value).toFixed(parseInt(name.split(':')[1]) || 0);
    },
    (name, value) => (name === 'Values' ? values(value) : undefined)
  );
}
