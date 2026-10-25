/**
 * Upstream's `tailwind` extension (`src/ext/tailwind.js`, 0.9.93): three hide/show strategies
 * that work through Tailwind's classes. `hide with twDisplay` adds `hidden`, `twVisibility`
 * adds `invisible`, `twOpacity` adds `opacity-0`; `show` removes the class, `toggle` flips it.
 * Upstream's tests for it (`test/ext/tailwind.js`) are in the gate.
 *
 *   <script src="hyperfixi-hs.js"></script>
 *   <script src="ext/tailwind.js"></script>
 *
 * or, from `@hyperfixi/engine/ext/tailwind`, `register(...everything, tailwind)`.
 *
 * One difference from upstream, which its tests do not see: upstream replaces
 * `config.hideShowStrategies`, dropping any strategy a page added before it; this adds to it.
 */
import type { Module } from '../engine';
import { config } from '../kit';

const byClass = (cls: string) => (op: 'hide' | 'show' | 'toggle', elt: HTMLElement) => {
  if (op === 'toggle') elt.classList.toggle(cls);
  else elt.classList.toggle(cls, op === 'hide');
};

export const tailwind: Module = () => {
  Object.assign(config.hideShowStrategies, {
    twDisplay: byClass('hidden'),
    twVisibility: byClass('invisible'),
    twOpacity: byClass('opacity-0'),
  });
};
