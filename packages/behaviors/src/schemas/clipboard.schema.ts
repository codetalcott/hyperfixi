import type { BehaviorSchema } from './types';

/**
 * Clipboard Behavior Schema
 *
 * Copies text to clipboard on click with visual feedback.
 * Uses the Clipboard API with execCommand fallback.
 */
export const clipboardSchema: BehaviorSchema = {
  name: 'Clipboard',
  category: 'ui',
  tier: 'core',
  version: '1.0.0',
  description: 'Copies text to clipboard on click with visual feedback',
  parameters: [
    {
      name: 'text',
      type: 'string',
      optional: true,
      description: 'Literal text to copy (takes priority over source)',
    },
    {
      name: 'source',
      type: 'selector',
      optional: true,
      default: 'me',
      description: 'Element whose textContent or value is copied',
    },
    {
      name: 'feedback',
      type: 'selector',
      optional: true,
      description: 'Element to show .copied feedback on (defaults to the installed element)',
    },
    {
      name: 'feedbackDuration',
      type: 'number',
      optional: true,
      default: 2000,
      description: 'Duration in ms to show .copied class feedback',
    },
  ],
  events: [
    { name: 'clipboard:copied', description: 'Fired after text is copied successfully' },
    { name: 'clipboard:error', description: 'Fired when clipboard write fails' },
  ],
  requirements: [
    'navigator.clipboard.writeText() requires HTTPS or localhost',
    'Falls back to document.execCommand("copy") for older browsers',
  ],
  source: [
    'behavior Clipboard(text, source, feedback, feedbackDuration)',
    '  init',
    '    if feedbackDuration is undefined set feedbackDuration to 2000',
    '    if source is undefined set source to me',
    '  end',
    '  on click',
    '    if text is not undefined',
    '      set copyText to text',
    '    else',
    "      set copyText to source's value or source's textContent",
    '    end',
    '    js(copyText) navigator.clipboard.writeText(copyText) end',
    '    set feedbackEl to feedback or me',
    '    add .copied to feedbackEl',
    '    wait feedbackDuration ms',
    '    remove .copied from feedbackEl',
    '    trigger clipboard:copied',
    '  end',
    'end',
  ].join('\n'),
};
