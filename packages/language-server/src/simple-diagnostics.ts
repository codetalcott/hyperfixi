/**
 * Simple Diagnostics Module
 *
 * State-machine-based quote and bracket validation for hyperscript code.
 * Used as a fallback when Chevrotain and AST-based diagnostics produce
 * no results. Designed to avoid false positives on valid hyperscript patterns
 * like possessive 's, escaped quotes, and quotes nested inside other delimiters.
 */

import { type Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node.js';

const enum QuoteState {
  NORMAL,
  IN_SINGLE,
  IN_DOUBLE,
  IN_BACKTICK,
}

/**
 * Returns true if the character at position `i` is a possessive 's
 * (e.g., #element's property), not the start of a string literal.
 */
function isPossessive(code: string, i: number): boolean {
  // Must be preceded by a word character (letter, digit, hyphen, underscore)
  if (i === 0) return false;
  const prev = code[i - 1];
  if (!/[\w\-#.]/.test(prev)) return false;
  // Must be followed by 's' then a non-word-quote char (whitespace, punctuation, or end)
  if (i + 1 >= code.length || code[i + 1] !== 's') return false;
  if (i + 2 >= code.length) return true; // 's at end of code
  const after = code[i + 2];
  return /[\s),.\]}|@*]/.test(after);
}

export function runSimpleDiagnostics(code: string, _language: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  let state = QuoteState.NORMAL;
  let quoteStartLine = 0;
  let quoteStartChar = 0;
  let parenDepth = 0;
  let bracketDepth = 0;

  // Track line/column as we scan
  let line = 0;
  let col = 0;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i];

    if (ch === '\n') {
      line++;
      col = 0;
      continue;
    }

    if (state !== QuoteState.NORMAL) {
      // Inside a quoted string
      if (ch === '\\') {
        // Skip escaped character
        i++;
        col += 2;
        continue;
      }
      if (
        (state === QuoteState.IN_SINGLE && ch === "'") ||
        (state === QuoteState.IN_DOUBLE && ch === '"') ||
        (state === QuoteState.IN_BACKTICK && ch === '`')
      ) {
        state = QuoteState.NORMAL;
      }
      col++;
      continue;
    }

    // NORMAL state
    switch (ch) {
      case "'":
        if (isPossessive(code, i)) {
          // Skip the 's
          i++;
          col += 2;
          continue;
        }
        state = QuoteState.IN_SINGLE;
        quoteStartLine = line;
        quoteStartChar = col;
        break;
      case '"':
        state = QuoteState.IN_DOUBLE;
        quoteStartLine = line;
        quoteStartChar = col;
        break;
      case '`':
        state = QuoteState.IN_BACKTICK;
        quoteStartLine = line;
        quoteStartChar = col;
        break;
      case '(':
        parenDepth++;
        break;
      case ')':
        parenDepth--;
        break;
      case '[':
        bracketDepth++;
        break;
      case ']':
        bracketDepth--;
        break;
    }

    col++;
  }

  // Report unclosed string
  if (state !== QuoteState.NORMAL) {
    const quoteType =
      state === QuoteState.IN_SINGLE
        ? 'single'
        : state === QuoteState.IN_DOUBLE
          ? 'double'
          : 'backtick';
    diagnostics.push({
      range: {
        start: { line: quoteStartLine, character: quoteStartChar },
        end: { line: quoteStartLine, character: quoteStartChar + 1 },
      },
      severity: DiagnosticSeverity.Error,
      code: 'unmatched-quote',
      source: 'lokascript',
      message: `Unmatched ${quoteType} quote`,
    });
  }

  // Report unbalanced parentheses
  if (parenDepth !== 0) {
    diagnostics.push({
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
      severity: DiagnosticSeverity.Error,
      code: 'unbalanced-parens',
      source: 'lokascript',
      message: `Unbalanced parentheses`,
    });
  }

  // Report unbalanced brackets
  if (bracketDepth !== 0) {
    diagnostics.push({
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
      severity: DiagnosticSeverity.Error,
      code: 'unbalanced-brackets',
      source: 'lokascript',
      message: `Unbalanced brackets`,
    });
  }

  return diagnostics;
}
