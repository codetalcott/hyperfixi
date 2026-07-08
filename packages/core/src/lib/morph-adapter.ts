/**
 * Morph Adapter — thin wrapper over morphlex for DOM morphing.
 *
 * Defaults `preserveChanges: true` so in-flight form input isn't clobbered
 * when the server re-renders a region during typing.
 */

// MUST stay the first import: ESM evaluates dependencies in declaration
// order, so the shim runs before morphlex's module-scope Element access.
import { domGlobalsEnsured } from './dom-globals-shim';
import { morph as morphlexMorph, morphInner as morphlexMorphInner } from 'morphlex';

export interface MorphOptions {
  /**
   * When true, preserves modified form inputs during morphing so user-entered
   * data is not overwritten.
   * @default true (morphlex's own default is false)
   */
  preserveChanges?: boolean;
}

function toMorphlexOptions(options?: MorphOptions): { preserveChanges: boolean } {
  // domGlobalsEnsured is always true; using it creates a hard data dependency
  // on the shim (see dom-globals-shim.ts).
  return { preserveChanges: domGlobalsEnsured && (options?.preserveChanges ?? true) };
}

export const morphAdapter = {
  /** Morph the entire element (outer morph). */
  morph(target: Element, content: string | Element, options?: MorphOptions): void {
    morphlexMorph(target, content, toMorphlexOptions(options));
  },

  /** Morph only the children of the element (inner morph). */
  morphInner(target: Element, content: string | Element, options?: MorphOptions): void {
    let contentEl: Element;
    if (typeof content === 'string') {
      const wrapper = document.createElement(target.tagName);
      wrapper.innerHTML = content;
      contentEl = wrapper;
    } else {
      contentEl = content;
    }
    morphlexMorphInner(target, contentEl, toMorphlexOptions(options));
  },
};

export default morphAdapter;
