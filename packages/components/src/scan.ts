/**
 * DOM scanner — finds `<template component="tag-name">` elements and
 * registers them. Also supports `<script type="text/hyperscript-template"
 * component="tag-name">` for upstream compatibility.
 */

import type { RuntimeLike } from './types';
import { registerTemplateComponent } from './register';

interface ScanOptions {
  runtime?: RuntimeLike;
}

/**
 * Scan the given root (defaults to `document`) for template definitions and
 * register each as a custom element.
 *
 * Returns the number of new registrations performed.
 */
export function scanAndRegister(
  root: ParentNode = typeof document !== 'undefined' ? document : (null as never),
  options: ScanOptions = {}
): number {
  if (!root) return 0;
  let count = 0;

  // <template component="tag-name">
  const templates = root.querySelectorAll('template[component]');
  templates.forEach(t => {
    if (registerTemplateComponent(t as HTMLTemplateElement, options)) count++;
  });

  // <script type="text/hyperscript-template" component="tag-name" _="init script">
  // Upstream uses this form; we support it for compat. Convert to a
  // synthetic HTMLTemplateElement so register code is shared. Init scripts
  // (`_=`) are preserved so they run once per instance.
  const scripts = root.querySelectorAll('script[type="text/hyperscript-template"][component]');
  scripts.forEach(s => {
    const fake = document.createElement('template');
    const componentAttr = s.getAttribute('component');
    if (componentAttr) fake.setAttribute('component', componentAttr);
    const initScript = s.getAttribute('_');
    if (initScript) fake.setAttribute('data-init', initScript);
    fake.innerHTML = s.textContent ?? '';
    if (registerTemplateComponent(fake, options)) count++;
  });

  return count;
}

/**
 * Start watching the document for dynamically-added template definitions.
 * Returns a disposer that stops the observer.
 *
 * Safe to call in non-DOM environments (returns a no-op disposer).
 */
export function watchForTemplates(options: ScanOptions = {}): () => void {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
    return () => {};
  }

  const observer = new MutationObserver(mutations => {
    for (const mut of mutations) {
      for (const node of Array.from(mut.addedNodes)) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const el = node as Element;
        // Added node itself
        if (el.tagName === 'TEMPLATE' && el.hasAttribute('component')) {
          registerTemplateComponent(el as HTMLTemplateElement, options);
        }
        if (
          el.tagName === 'SCRIPT' &&
          el.getAttribute('type') === 'text/hyperscript-template' &&
          el.hasAttribute('component')
        ) {
          const fake = document.createElement('template');
          const componentAttr = el.getAttribute('component');
          if (componentAttr) fake.setAttribute('component', componentAttr);
          const initScript = el.getAttribute('_');
          if (initScript) fake.setAttribute('data-init', initScript);
          fake.innerHTML = el.textContent ?? '';
          registerTemplateComponent(fake, options);
        }
        // Descendants
        scanAndRegister(el, options);
      }
    }
  });

  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true,
  });

  return () => observer.disconnect();
}
