/**
 * HTML Transformer
 *
 * Transforms HTML files to replace _="..." attributes with data-h="..." attributes
 * for compile mode.
 */

import type { CompiledHandler } from './compiler';

export interface TransformResult {
  /** Transformed HTML code */
  code: string;

  /** Whether the HTML was modified */
  modified: boolean;

  /** Scripts that were found but couldn't be compiled */
  fallbacks: string[];
}

/**
 * Transform HTML to use compiled handler IDs
 */
export function transformHTML(
  html: string,
  handlerMap: Map<string, string>,
  fallbackScripts: Set<string>
): TransformResult {
  let modified = false;
  const fallbacks: string[] = [];

  // Regex patterns for _="..." attributes
  const patterns = [
    /(\s)_\s*=\s*"([^"]+)"/g,           // _="..."
    /(\s)_\s*=\s*'([^']+)'/g,           // _='...'
    /(\s)_\s*=\s*`([^`]+)`/g,           // _=`...`
  ];

  let result = html;

  for (const pattern of patterns) {
    result = result.replace(pattern, (match, whitespace, script) => {
      const handlerId = handlerMap.get(script);

      if (handlerId) {
        modified = true;
        return `${whitespace}data-h="${handlerId}"`;
      }

      // Script couldn't be compiled - check if it's a known fallback
      if (fallbackScripts.has(script)) {
        fallbacks.push(script);
        // Keep original for fallback runtime
        return match;
      }

      // Unknown script - keep original but warn
      fallbacks.push(script);
      return match;
    });
  }

  return {
    code: result,
    modified,
    fallbacks,
  };
}

/**
 * Build a handler map from compiled handlers
 */
export function buildHandlerMap(handlers: CompiledHandler[]): Map<string, string> {
  const map = new Map<string, string>();

  for (const handler of handlers) {
    map.set(handler.original, handler.id);
  }

  return map;
}

/**
 * Extract all hyperscript snippets from HTML
 */
export function extractScripts(html: string): string[] {
  const scripts: string[] = [];

  const patterns = [
    /_\s*=\s*"([^"]+)"/g,
    /_\s*=\s*'([^']+)'/g,
    /_\s*=\s*`([^`]+)`/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html))) {
      scripts.push(match[1]);
    }
  }

  return scripts;
}
