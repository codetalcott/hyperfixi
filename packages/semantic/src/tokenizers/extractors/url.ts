/**
 * URL Extractor
 *
 * Extracts URLs and paths: /path, ./relative, ../parent, http://, https://, //domain.com
 * This is hyperscript-specific syntax (used in fetch commands).
 */

import type { ValueExtractor, ExtractionResult } from '../value-extractor-types';

const URL_PREFIXES = ['http://', 'https://', '//', './', '../', '/'];

/**
 * Find the index just past the `}` that closes a `${` whose `{` sits at
 * `start - 1`. Inner braces are balanced; returns -1 if it never closes.
 */
function findInterpolationEnd(input: string, start: number): number {
  let depth = 1;
  for (let i = start; i < input.length; i++) {
    const ch = input[i];
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return i + 1;
  }
  return -1;
}

/**
 * Extract a URL from input at position.
 * Handles: /path, ./path, ../path, //domain.com, http://, https://
 */
export function extractUrl(input: string, position: number): string | null {
  const remaining = input.slice(position);
  const prefix = URL_PREFIXES.find(p => remaining.startsWith(p));
  if (!prefix) return null;

  // Consume to the first whitespace, except that a `${…}` interpolation span
  // is carried whole — the space inside `/api/search?q=${my value}` is part
  // of the URL, not a token boundary.
  let i = prefix.length;
  while (i < remaining.length) {
    const ch = remaining[i];
    if (ch === '$' && remaining[i + 1] === '{') {
      const end = findInterpolationEnd(remaining, i + 2);
      if (end !== -1) {
        i = end;
        continue;
      }
      // Unclosed `${` — no span to carry; the plain scan below applies.
    }
    if (/\s/.test(ch)) break;
    i++;
  }
  return remaining.slice(0, i);
}

/**
 * UrlExtractor - Extracts URLs and paths for hyperscript.
 */
export class UrlExtractor implements ValueExtractor {
  readonly name = 'url';

  canExtract(input: string, position: number): boolean {
    const remaining = input.slice(position);
    return (
      remaining.startsWith('http://') ||
      remaining.startsWith('https://') ||
      remaining.startsWith('//') ||
      remaining.startsWith('./') ||
      remaining.startsWith('../') ||
      remaining.startsWith('/')
    );
  }

  extract(input: string, position: number): ExtractionResult | null {
    const url = extractUrl(input, position);
    if (url) {
      return {
        value: url,
        length: url.length,
        metadata: { type: 'url' },
      };
    }
    return null;
  }
}
