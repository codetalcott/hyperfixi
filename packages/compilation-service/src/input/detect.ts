/**
 * Input format detection.
 *
 * Determines whether input is natural language, explicit syntax, or LLM JSON.
 */

import type { InputFormat } from '../types.js';

/**
 * Detect the input format from a string.
 */
export function detectFormat(input: string): InputFormat {
  const trimmed = input.trim();

  // Explicit syntax: [command role:value ...]
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return 'explicit';
  }

  // LLM JSON: { "action": "...", ... }
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && typeof parsed.action === 'string') {
        return 'json';
      }
    } catch {
      // Not valid JSON — fall through to natural language
    }
  }

  return 'natural';
}
