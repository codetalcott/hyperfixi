/**
 * Browser Behavior Resolver Bundle
 *
 * IIFE entry point that registers a behavior resolver with the hyperfixi runtime.
 * Include after hyperfixi.js — all standard behaviors will resolve on demand.
 *
 * Usage:
 *   <script src="hyperfixi.js"></script>
 *   <script src="hyperfixi-behaviors.js"></script>
 *   <!-- install Toggleable, Draggable, etc. just work -->
 */

import { createBehaviorResolver } from './behavior-resolver';

if (typeof window !== 'undefined') {
  const hf = (window as any).hyperfixi;
  const hs = (window as any)._hyperscript;

  if (hf && hs?.behaviors) {
    hs.behaviors.resolve = createBehaviorResolver(hf, hs.behaviors);
  }
}
