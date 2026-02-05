/**
 * Code Formatting Module for the LokaScript Language Server
 */

import { findNextNonEmptyLine } from './utils.js';

/**
 * Simple pattern-based hyperscript formatter.
 * Handles indentation for blocks and normalizes whitespace.
 */
export function formatHyperscript(code: string, indentStr: string = '  '): string {
  const lines = code.split('\n');
  const formattedLines: string[] = [];
  let indentLevel = 0;

  // Block-starting keywords that always increase indent (require matching 'end')
  const blockKeywords = /^(behavior|def|if|repeat|for|while)\b/i;
  // Keywords that decrease indent
  const dedentKeywords = /^(end|else)\b/i;
  // 'on' is special - only increases indent if it's a multiline declaration
  const onKeyword = /^on\b/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      formattedLines.push('');
      continue;
    }

    // Decrease indent for dedent keywords (before adding line)
    if (dedentKeywords.test(trimmed)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Add the formatted line
    const indent = indentStr.repeat(indentLevel);
    formattedLines.push(indent + trimmed);

    // Increase indent for block keywords (after adding line)
    // But not if the line also contains 'end' (single-line blocks)
    if (blockKeywords.test(trimmed) && !/\bend\s*$/i.test(trimmed)) {
      indentLevel++;
    }

    // 'on' keyword: increase indent unless next non-empty line is 'end' or another 'on'
    // Single-line handlers like "on click toggle .active" followed by "end" or another handler
    // don't need extra indentation
    if (onKeyword.test(trimmed)) {
      const nextLine = findNextNonEmptyLine(lines, i + 1);
      // Only skip indent increase if next line is 'end' or another 'on' at same level
      if (nextLine && !/^(end|on)\b/i.test(nextLine)) {
        indentLevel++;
      }
    }

    // Special case: "else" increases indent after itself
    if (/^else\b/i.test(trimmed)) {
      indentLevel++;
    }
  }

  return formattedLines.join('\n');
}
