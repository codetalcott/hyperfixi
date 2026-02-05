/**
 * Utility Functions for the LokaScript Language Server
 */

import type { WordAtPosition } from './types.js';

/**
 * Get the word at a specific position in a line
 */
export function getWordAtPosition(line: string, character: number): WordAtPosition | null {
  let start = character;
  let end = character;

  // Extended regex to handle:
  // - Latin characters with diacritics (á, ñ, ü, etc.)
  // - CJK characters (Japanese, Korean, Chinese)
  // - Arabic, Hebrew, Cyrillic, etc.
  // Using Unicode property escapes for proper multilingual support
  const isWordChar = (char: string): boolean => {
    if (!char) return false;
    // Match: letters, marks, numbers, hyphen, dot, underscore
    // This covers Latin, CJK, Arabic, Hebrew, Cyrillic, etc.
    return /[\p{L}\p{M}\p{N}_.-]/u.test(char);
  };

  while (start > 0 && isWordChar(line[start - 1])) {
    start--;
  }
  while (end < line.length && isWordChar(line[end])) {
    end++;
  }

  if (start === end) return null;
  return { text: line.slice(start, end), start, end };
}

/**
 * Escape special regex characters in a string
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find the next non-empty line starting from index
 */
export function findNextNonEmptyLine(lines: string[], startIndex: number): string | null {
  for (let i = startIndex; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed) return trimmed;
  }
  return null;
}
