/**
 * Morph Adapter - Pluggable DOM Morphing Interface
 *
 * Provides a unified interface for DOM morphing libraries, enabling users
 * to swap between morphlex (default), idiomorph, or custom implementations.
 *
 * Default: morphlex (~2.4KB, LIS algorithm, optimal DOM operations)
 * Alternative: idiomorph (~3.3KB, htmx's choice)
 *
 * @example
 * ```typescript
 * // Use default (morphlex)
 * import { morphAdapter } from './lib/morph-adapter';
 * morphAdapter.morph(target, content);
 *
 * // Swap to idiomorph
 * import { setMorphEngine, MorphEngine } from './lib/morph-adapter';
 * import Idiomorph from 'idiomorph';
 *
 * const idiomorphEngine: MorphEngine = {
 *   morph: (target, content) => Idiomorph.morph(target, content, { morphStyle: 'outerHTML' }),
 *   morphInner: (target, content) => Idiomorph.morph(target, content, { morphStyle: 'innerHTML' }),
 * };
 * setMorphEngine(idiomorphEngine);
 * ```
 */

// Morphlex imports - wrapped in browser check to avoid crashes during bundling
// The library uses Element.prototype at module load time which fails in Node
let morphlexMorph: ((fromNode: Element, toNode: Element | string, options?: any) => void) | null = null;
let morphlexMorphInner: ((fromNode: Element, toNode: Element | string, options?: any) => void) | null = null;
let morphlexLoaded = false;
let morphlexLoadError: Error | null = null;

// Type for MorphlexOptions (inline since we can't import from morphlex at bundle time)
// Note: preserveChanges maps to ignoreActiveValue in morphlex internals
type MorphlexOptions = {
  ignoreActiveValue?: boolean;
  preserveChanges?: boolean;
  beforeNodeMorphed?: (fromNode: Node, toNode: Node) => boolean;
  afterNodeMorphed?: (fromNode: Node, toNode: Node) => void;
  beforeNodeVisited?: (fromNode: Node, toNode: Node) => boolean;
  afterNodeVisited?: (fromNode: Node, toNode: Node) => void;
  beforeNodeAdded?: (node: Node) => boolean;
  afterNodeAdded?: (node: Node) => void;
  beforeNodeRemoved?: (node: Node) => boolean;
  afterNodeRemoved?: (node: Node) => void;
};

// Load morphlex synchronously when first needed (browser runtime only)
function ensureMorphlexLoaded(): void {
  if (morphlexLoaded || morphlexLoadError) return;

  // Only attempt to load in browser environment
  if (typeof Element === 'undefined' || typeof document === 'undefined') {
    morphlexLoadError = new Error('morphlex requires a browser environment');
    return;
  }

  try {
    // Dynamic require for browser bundle - Rollup will inline this
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const morphlex = require('morphlex');
    morphlexMorph = morphlex.morph;
    morphlexMorphInner = morphlex.morphInner;
    morphlexLoaded = true;
  } catch (e) {
    morphlexLoadError = e instanceof Error ? e : new Error('Failed to load morphlex');
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Options for morphing operations
 */
export interface MorphOptions {
  /**
   * When true, preserves modified form inputs during morphing.
   * This prevents user-entered data from being overwritten.
   * @default true (changed from morphlex default of false)
   */
  preserveChanges?: boolean;

  /**
   * Called before a node is visited during morphing.
   * @returns false to skip morphing this node
   */
  beforeNodeVisited?: (fromNode: Node, toNode: Node) => boolean;

  /**
   * Called after a node has been morphed.
   */
  afterNodeVisited?: (fromNode: Node, toNode: Node) => void;

  /**
   * Called before a node is added to the DOM.
   * @returns false to prevent adding the node
   */
  beforeNodeAdded?: (parent: ParentNode, node: Node, insertionPoint: ChildNode | null) => boolean;

  /**
   * Called after a node has been added.
   */
  afterNodeAdded?: (node: Node) => void;

  /**
   * Called before a node is removed from the DOM.
   * @returns false to prevent removal
   */
  beforeNodeRemoved?: (node: Node) => boolean;

  /**
   * Called after a node has been removed.
   */
  afterNodeRemoved?: (node: Node) => void;
}

/**
 * Pluggable morph engine interface
 *
 * Implement this interface to use a custom morphing library.
 */
export interface MorphEngine {
  /**
   * Morph the entire element (outer morph)
   * Replaces the target element with content, intelligently diffing.
   *
   * @param target - Element to morph
   * @param content - New content (string or element)
   * @param options - Morphing options
   */
  morph(target: Element, content: string | Element, options?: MorphOptions): void;

  /**
   * Morph only the children of the element (inner morph)
   * Replaces the target's children with content's children.
   *
   * @param target - Element whose children to morph
   * @param content - New content (string or element)
   * @param options - Morphing options
   */
  morphInner(target: Element, content: string | Element, options?: MorphOptions): void;
}

// ============================================================================
// Default Engine (morphlex)
// ============================================================================

/**
 * Convert our MorphOptions to morphlex Options
 */
function toMorphlexOptions(options?: MorphOptions): MorphlexOptions | undefined {
  if (!options) {
    // Default: preserve form changes for better UX
    return { preserveChanges: true };
  }

  return {
    preserveChanges: options.preserveChanges ?? true,
    beforeNodeVisited: options.beforeNodeVisited,
    afterNodeVisited: options.afterNodeVisited,
    // Adapt beforeNodeAdded signature: morphlex only passes node, but our API expects (parent, node, insertionPoint)
    beforeNodeAdded: options.beforeNodeAdded
      ? (node: Node) => options.beforeNodeAdded!(node.parentNode as ParentNode, node, null)
      : undefined,
    afterNodeAdded: options.afterNodeAdded,
    beforeNodeRemoved: options.beforeNodeRemoved,
    afterNodeRemoved: options.afterNodeRemoved,
  };
}

/**
 * Default morph engine using morphlex
 */
const morphlexEngine: MorphEngine = {
  morph(target: Element, content: string | Element, options?: MorphOptions): void {
    ensureMorphlexLoaded();
    if (!morphlexMorph) {
      // Fallback to outerHTML replacement if morphlex unavailable
      if (typeof content === 'string') {
        target.outerHTML = content;
      } else {
        target.replaceWith(content);
      }
      return;
    }
    morphlexMorph(target, content as Element | string, toMorphlexOptions(options));
  },

  morphInner(target: Element, content: string | Element, options?: MorphOptions): void {
    ensureMorphlexLoaded();
    if (!morphlexMorphInner) {
      // Fallback to innerHTML replacement if morphlex unavailable
      if (typeof content === 'string') {
        target.innerHTML = content;
      } else {
        target.innerHTML = '';
        target.appendChild(content);
      }
      return;
    }
    morphlexMorphInner(target, content as Element | string, toMorphlexOptions(options));
  },
};

// ============================================================================
// Engine Management
// ============================================================================

/**
 * Current morph engine (defaults to morphlex)
 */
let currentEngine: MorphEngine = morphlexEngine;

/**
 * Set a custom morph engine
 *
 * @param engine - Custom MorphEngine implementation
 *
 * @example
 * ```typescript
 * import Idiomorph from 'idiomorph';
 *
 * setMorphEngine({
 *   morph: (target, content, opts) =>
 *     Idiomorph.morph(target, content, { morphStyle: 'outerHTML' }),
 *   morphInner: (target, content, opts) =>
 *     Idiomorph.morph(target, content, { morphStyle: 'innerHTML' }),
 * });
 * ```
 */
export function setMorphEngine(engine: MorphEngine): void {
  currentEngine = engine;
}

/**
 * Get the current morph engine
 */
export function getMorphEngine(): MorphEngine {
  return currentEngine;
}

/**
 * Reset to the default morphlex engine
 */
export function resetMorphEngine(): void {
  currentEngine = morphlexEngine;
}

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Morph adapter - unified interface to the current morph engine
 *
 * This is the primary export for use in commands.
 */
export const morphAdapter = {
  /**
   * Morph entire element (outer morph)
   */
  morph(target: Element, content: string | Element, options?: MorphOptions): void {
    currentEngine.morph(target, content, options);
  },

  /**
   * Morph children only (inner morph)
   */
  morphInner(target: Element, content: string | Element, options?: MorphOptions): void {
    currentEngine.morphInner(target, content, options);
  },
};

export default morphAdapter;
