/**
 * Clipboard Behavior — Imperative Implementation
 *
 * Copies text to clipboard on click with visual feedback.
 * Uses navigator.clipboard.writeText() with execCommand fallback.
 */

import { clipboardSchema } from '../schemas/clipboard.schema';
import type { LokaScriptInstance } from '../schemas/types';
import { resolveRuntime } from '../schemas/types';

// Re-export schema-derived values
export const clipboardSource = clipboardSchema.source;
export const clipboardMetadata = clipboardSchema;

/**
 * Copy text to clipboard using the modern Clipboard API,
 * falling back to execCommand for older browsers.
 */
async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  // Fallback: temporary textarea + execCommand
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
}

/**
 * Resolve a selector parameter to an HTMLElement.
 */
function resolveElement(element: HTMLElement, param: unknown): HTMLElement | null {
  if (!param || param === 'me') return element;
  if (param instanceof HTMLElement) return param;
  if (typeof param === 'string') {
    return (
      (element.querySelector(param) as HTMLElement) ||
      (document.querySelector(param) as HTMLElement) ||
      null
    );
  }
  return null;
}

/**
 * Imperative installer for Clipboard behavior.
 */
function installClipboard(element: HTMLElement, params: Record<string, any>): void {
  const feedbackDuration =
    typeof params.feedbackDuration === 'number' ? params.feedbackDuration : 2000;

  element.addEventListener('click', async () => {
    // Determine text to copy
    let copyText: string;
    if (params.text != null) {
      copyText = String(params.text);
    } else {
      const sourceEl = resolveElement(element, params.source) || element;
      copyText = (sourceEl as HTMLInputElement).value ?? sourceEl.textContent ?? '';
    }

    try {
      await copyToClipboard(copyText);

      // Show feedback
      const feedbackEl = resolveElement(element, params.feedback) || element;
      feedbackEl.classList.add('copied');
      setTimeout(() => feedbackEl.classList.remove('copied'), feedbackDuration);

      element.dispatchEvent(
        new CustomEvent('clipboard:copied', {
          bubbles: true,
          detail: { text: copyText },
        })
      );
    } catch (error) {
      element.dispatchEvent(
        new CustomEvent('clipboard:error', {
          bubbles: true,
          detail: { error },
        })
      );
    }
  });
}

/**
 * Register the Clipboard behavior with LokaScript.
 */
export async function registerClipboard(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf = hyperfixi || resolveRuntime();

  if (!hf) {
    throw new Error(
      'LokaScript not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  const syntheticNode = {
    type: 'behavior',
    name: 'Clipboard',
    parameters: ['text', 'source', 'feedback', 'feedbackDuration'],
    eventHandlers: [],
    imperativeInstaller: installClipboard,
  };
  const ctx = hf.createContext ? hf.createContext() : { locals: new Map(), globals: new Map() };
  await hf.execute(syntheticNode, ctx);
}

// Auto-register when loaded as a script tag
if (resolveRuntime()) {
  registerClipboard().catch(console.error);
}

export default {
  source: clipboardSchema.source,
  metadata: clipboardSchema,
  register: registerClipboard,
};
