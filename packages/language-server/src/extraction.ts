/**
 * HTML Hyperscript Extraction Module
 *
 * Extracts hyperscript regions from HTML documents and handles position mapping.
 */

import type { HyperscriptRegion, RegionPosition } from './types.js';

/**
 * Checks if a document is HTML based on URI or content
 */
export function isHtmlDocument(uri: string, content: string): boolean {
  if (uri.endsWith('.html') || uri.endsWith('.htm')) return true;
  if (content.trim().startsWith('<!DOCTYPE') || content.trim().startsWith('<html')) return true;
  // Check for HTML tags
  if (/<\w+[^>]*>/.test(content) && !content.trim().startsWith('on ')) return true;
  return false;
}

/**
 * Extracts hyperscript regions from HTML content.
 * Returns regions for _="..." and _='...' attributes and <script type="text/hyperscript"> tags.
 */
export function extractHyperscriptRegions(content: string): HyperscriptRegion[] {
  const regions: HyperscriptRegion[] = [];

  // Track position for multiline matching
  const fullContent = content;

  // Extract _="..." attributes (double quotes, handles multiline)
  const doubleQuoteRegex = /_="([^"\\]*(?:\\.[^"\\]*)*)"/g;
  let match;

  while ((match = doubleQuoteRegex.exec(fullContent)) !== null) {
    const code = match[1].replace(/\\"/g, '"'); // Unescape quotes
    const startOffset = match.index + 3; // After _="
    const endOffset = match.index + match[0].length - 1; // Before final "

    // Convert offset to line/character
    const startPos = offsetToPosition(content, startOffset);
    const endPos = offsetToPosition(content, endOffset);

    regions.push({
      code,
      startLine: startPos.line,
      startChar: startPos.character,
      endLine: endPos.line,
      endChar: endPos.character,
      type: 'attribute',
    });
  }

  // Extract _='...' attributes (single quotes, handles multiline)
  const singleQuoteRegex = /_='([^'\\]*(?:\\.[^'\\]*)*)'/g;

  while ((match = singleQuoteRegex.exec(fullContent)) !== null) {
    const code = match[1].replace(/\\'/g, "'"); // Unescape quotes
    const startOffset = match.index + 3; // After _='
    const endOffset = match.index + match[0].length - 1; // Before final '

    // Convert offset to line/character
    const startPos = offsetToPosition(content, startOffset);
    const endPos = offsetToPosition(content, endOffset);

    regions.push({
      code,
      startLine: startPos.line,
      startChar: startPos.character,
      endLine: endPos.line,
      endChar: endPos.character,
      type: 'attribute',
    });
  }

  // Extract <script type="text/hyperscript">...</script>
  const scriptRegex = /<script\s+type=["']text\/hyperscript["'][^>]*>([\s\S]*?)<\/script>/gi;

  while ((match = scriptRegex.exec(fullContent)) !== null) {
    const code = match[1];
    const startOffset = match.index + match[0].indexOf('>') + 1;
    const endOffset = match.index + match[0].lastIndexOf('</script>');

    const startPos = offsetToPosition(content, startOffset);
    const endPos = offsetToPosition(content, endOffset);

    regions.push({
      code,
      startLine: startPos.line,
      startChar: startPos.character,
      endLine: endPos.line,
      endChar: endPos.character,
      type: 'script',
    });
  }

  return regions;
}

/**
 * Converts a character offset to line/character position.
 * Handles both Unix (LF) and Windows (CRLF) line endings.
 */
export function offsetToPosition(
  content: string,
  offset: number
): { line: number; character: number } {
  let line = 0;
  let character = 0;

  // Clamp offset to valid range
  const maxOffset = Math.min(offset, content.length);

  for (let i = 0; i < maxOffset; i++) {
    if (content[i] === '\r' && content[i + 1] === '\n') {
      // CRLF: count as single newline, skip the \r
      line++;
      character = 0;
      i++; // Skip the \n in next iteration
    } else if (content[i] === '\n') {
      // LF only
      line++;
      character = 0;
    } else if (content[i] === '\r') {
      // CR only (old Mac style, rare)
      line++;
      character = 0;
    } else {
      character++;
    }
  }

  return { line, character };
}

/**
 * Finds which hyperscript region (if any) contains the given position
 */
export function findRegionAtPosition(
  regions: HyperscriptRegion[],
  line: number,
  character: number
): RegionPosition | null {
  for (const region of regions) {
    // Check if position is within region bounds
    const afterStart =
      line > region.startLine || (line === region.startLine && character >= region.startChar);
    const beforeEnd =
      line < region.endLine || (line === region.endLine && character <= region.endChar);

    if (afterStart && beforeEnd) {
      // Calculate local position within the region
      const localLine = line - region.startLine;
      let localChar: number;

      if (line === region.startLine) {
        localChar = character - region.startChar;
      } else {
        localChar = character;
      }

      return { region, localLine, localChar };
    }
  }
  return null;
}

/**
 * Find line number within a region given a character offset
 */
export function findLineInRegion(code: string, offset: number): number {
  let line = 0;
  for (let i = 0; i < offset && i < code.length; i++) {
    if (code[i] === '\n') line++;
  }
  return line;
}

/**
 * Find character position in line given a character offset
 */
export function findCharInLine(code: string, offset: number): number {
  let lastNewline = -1;
  for (let i = 0; i < offset && i < code.length; i++) {
    if (code[i] === '\n') lastNewline = i;
  }
  return offset - lastNewline - 1;
}
