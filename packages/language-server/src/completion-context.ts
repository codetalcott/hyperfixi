/**
 * Completion context inference.
 *
 * Classifies the text before the cursor so the completion handler can offer
 * the right family of items. Lives outside server.ts so it can be unit-tested
 * against the shipped implementation (server.ts is an entry script with no
 * exports).
 */

export type CompletionContext =
  'caret' | 'attrs-property' | 'event' | 'command' | 'selector' | 'expression' | 'default';

export function inferContext(beforeCursor: string): CompletionContext {
  // Caret-var: cursor right after `^` or after `^name` (partial). Tested
  // against the raw beforeCursor (not trimmed) so `^` at end of input wins.
  if (/\^\w*$/.test(beforeCursor)) return 'caret';
  // attrs.: cursor right after `attrs.` or partial `attrs.foo`.
  if (/\battrs\.\w*$/.test(beforeCursor)) return 'attrs-property';

  const trimmed = beforeCursor.trim();

  if (/\bon\s*$/.test(trimmed)) return 'event';
  if (/\bthen\s*$/.test(trimmed)) return 'command';
  if (/^(on\s+\w+\s*)$/.test(trimmed)) return 'command';
  if (/(to|from|into|on)\s*$/.test(trimmed)) return 'selector';
  if (/\bif\s*$/.test(trimmed)) return 'expression';
  if (/\bset\s+:\w+\s+to\s*$/.test(trimmed)) return 'expression';

  return 'default';
}
