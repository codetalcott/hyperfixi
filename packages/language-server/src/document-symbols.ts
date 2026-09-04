/**
 * Document symbols (outline view).
 *
 * Regex-based extraction of event handlers, behaviors, functions and init
 * blocks. Two rules keep it honest:
 *
 * - A keyword only counts at COMMAND POSITION: the start of a line (after
 *   indentation) or directly after a block-closing `end`. Without this, the
 *   `on` in `toggle .active on me` was reported as an event handler and the
 *   `.init` in `add .init` as an init block.
 * - Word boundaries are Unicode-aware. `\b` is ASCII-only, so `\b設定` can
 *   never match and the ten non-Latin languages silently produced no symbols.
 */

import { type DocumentSymbol, SymbolKind } from 'vscode-languageserver/node.js';
import { escapeRegExp } from './utils.js';

/** Matches at line start (after indentation) or right after a block-closing `end`. */
const COMMAND_POSITION = '(?<=^[ \\t]*|(?<![\\p{L}\\p{N}_])end\\s+)';
const NOT_WORD_AFTER = '(?![\\p{L}\\p{N}_])';
const NAME = '([\\p{L}\\p{N}_]+)';

function alternation(words: readonly string[]): string {
  return `(${words.map(escapeRegExp).join('|')})`;
}

function symbol(
  name: string,
  detail: string,
  kind: SymbolKind,
  line: number,
  start: number,
  length: number
): DocumentSymbol {
  const range = {
    start: { line, character: start },
    end: { line, character: start + length },
  };
  return { name, detail, kind, range, selectionRange: range };
}

/**
 * Extract outline symbols from a hyperscript region.
 *
 * @param code      The region's source text (region-local coordinates).
 * @param getVariants Returns the localized spellings of an English keyword
 *                    (the English form first). Defaults to English only.
 */
export function extractDocumentSymbols(
  code: string,
  getVariants: (eng: string) => string[] = eng => [eng]
): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = [];
  const lines = code.split('\n');

  const onPattern = new RegExp(
    `${COMMAND_POSITION}${alternation(getVariants('on'))}\\s+(${NAME.slice(1, -1)}(?::[\\p{L}\\p{N}_]+)?(?:\\[.*?\\])?)`,
    'giu'
  );
  const behaviorPattern = new RegExp(
    `${COMMAND_POSITION}${alternation(getVariants('behavior'))}\\s+${NAME}`,
    'giu'
  );
  const defPattern = new RegExp(
    `${COMMAND_POSITION}${alternation(getVariants('def'))}\\s+${NAME}`,
    'giu'
  );
  const initPattern = new RegExp(
    `${COMMAND_POSITION}${alternation(getVariants('init'))}${NOT_WORD_AFTER}`,
    'giu'
  );

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const m of line.matchAll(onPattern)) {
      const at = m.index ?? 0;
      symbols.push(
        symbol(`${m[1]} ${m[2]}`, 'Event Handler', SymbolKind.Event, i, at, m[0].length)
      );
    }
    for (const m of line.matchAll(behaviorPattern)) {
      const at = m.index ?? 0;
      symbols.push(
        symbol(`${m[1]} ${m[2]}`, 'Behavior Definition', SymbolKind.Class, i, at, m[0].length)
      );
    }
    for (const m of line.matchAll(defPattern)) {
      const at = m.index ?? 0;
      symbols.push(
        symbol(`${m[1]} ${m[2]}`, 'Function Definition', SymbolKind.Function, i, at, m[0].length)
      );
    }
    for (const m of line.matchAll(initPattern)) {
      const at = m.index ?? 0;
      symbols.push(symbol(m[1], 'Initialization', SymbolKind.Constructor, i, at, m[1].length));
    }
  }

  return symbols;
}
