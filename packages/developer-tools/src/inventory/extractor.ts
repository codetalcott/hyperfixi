/**
 * Template Inventory — Snippet Extractor
 *
 * Scans HTML/template files for _=, hx-*, and fx-* attributes.
 * Returns Snippet objects with byte offsets for safe editing.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { glob } from 'glob';
import type { Snippet, SnippetCategory, ExtractorOptions } from './types';

/** File extensions to scan */
const DEFAULT_GLOBS = [
  '**/*.html',
  '**/*.htm',
  '**/*.djhtml',
  '**/*.jinja',
  '**/*.j2',
  '**/*.erb',
  '**/*.php',
  '**/*.vue',
  '**/*.svelte',
  '**/*.jsx',
  '**/*.tsx',
  '**/*.hbs',
  '**/*.handlebars',
  '**/*.ejs',
  '**/*.astro',
];

const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.git/**',
  '**/venv/**',
  '**/.venv/**',
  '**/__pycache__/**',
];

/**
 * Pattern definition for attribute matching.
 * Each pattern captures: (attrName)(quoteChar)(value)(closingQuote)
 */
interface AttrPattern {
  regex: RegExp;
  category: SnippetCategory;
  /** Group index for the attribute name */
  nameGroup: number;
  /** Group index for the opening quote character */
  quoteGroup: number;
  /** Group index for the attribute value */
  valueGroup: number;
}

/**
 * Build regex patterns for matching attributes.
 * We create separate patterns for double and single quotes to correctly
 * track byte offsets. Backtick patterns are included for JSX templates.
 */
function buildPatterns(): AttrPattern[] {
  const patterns: AttrPattern[] = [];

  // Helper: create a pattern for a given attr regex and quote char
  function addPattern(attrRegex: string, category: SnippetCategory) {
    // Double-quoted
    patterns.push({
      regex: new RegExp(`(${attrRegex})\\s*=\\s*(")((?:[^"\\\\]|\\\\.)*)`, 'gi'),
      category,
      nameGroup: 1,
      quoteGroup: 2,
      valueGroup: 3,
    });
    // Single-quoted
    patterns.push({
      regex: new RegExp(`(${attrRegex})\\s*=\\s*(')((?:[^'\\\\]|\\\\.)*)`, 'gi'),
      category,
      nameGroup: 1,
      quoteGroup: 2,
      valueGroup: 3,
    });
  }

  // Hyperscript: _="..."
  addPattern('_', 'hyperscript');

  // hx-on:* handlers (hyperscript inside htmx)
  addPattern('hx-on:\\w+', 'hyperscript');

  // htmx request methods
  addPattern('hx-(?:get|post|put|patch|delete)', 'htmx-request');

  // htmx swap
  addPattern('(?:hx|fx)-swap', 'htmx-swap');

  // htmx target
  addPattern('(?:hx|fx)-target', 'htmx-target');

  // htmx trigger
  addPattern('(?:hx|fx)-trigger', 'htmx-trigger');

  // fixi-specific
  addPattern('fx-action', 'fixi');
  addPattern('fx-method', 'fixi');

  // Other htmx attrs
  addPattern(
    'hx-(?:confirm|push-url|replace-url|indicator|select|vals|headers|include|boost|ext|encoding|params)',
    'htmx-other'
  );

  return patterns;
}

const PATTERNS = buildPatterns();

/** Hyperscript command regex (from vite-plugin scanner) */
const COMMAND_REGEX =
  /\b(toggle|add|remove|removeClass|show|hide|set|get|put|append|take|increment|decrement|log|send|trigger|wait|transition|go|call|focus|blur|return|fetch|tell|install|halt|prevent|stop)\b/g;

/** Hyperscript event regex */
const EVENT_REGEX = /\bon\s+(\w+)/g;

/**
 * Compute 1-indexed line number at a byte offset in a string.
 */
function lineNumberAt(content: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < content.length; i++) {
    if (content[i] === '\n') line++;
  }
  return line;
}

/**
 * Compute 1-indexed column number at a byte offset in a string.
 */
function columnAt(content: string, offset: number): number {
  let col = 1;
  for (let i = offset - 1; i >= 0; i--) {
    if (content[i] === '\n') break;
    col++;
  }
  return col;
}

/**
 * Find the enclosing HTML opening tag for an attribute at a given offset.
 * Scans backwards from offset to find '<tagName' and then forward to find '>'.
 */
function findEnclosingElement(content: string, offset: number): { tag: string; type: string } {
  // Scan backwards for '<'
  let start = offset;
  while (start > 0 && content[start] !== '<') {
    start--;
  }

  // Scan forward for '>' from the attribute position
  let end = offset;
  while (end < content.length && content[end] !== '>') {
    end++;
  }
  if (end < content.length) end++; // include the '>'

  const tag = content.slice(start, end);

  // Extract element type from the tag
  const typeMatch = tag.match(/^<\s*(\w[\w-]*)/);
  const type = typeMatch ? typeMatch[1].toLowerCase() : 'unknown';

  // Truncate very long tags for display
  const displayTag = tag.length > 200 ? tag.slice(0, 200) + '...' : tag;

  return { tag: displayTag, type };
}

/**
 * Generate a unique ID for a snippet.
 */
function snippetId(filePath: string, byteOffset: number): string {
  const hash = createHash('md5').update(`${filePath}:${byteOffset}`).digest('hex').slice(0, 12);
  return hash;
}

/**
 * Detect hyperscript commands in a value string.
 */
function detectCommands(value: string): string[] {
  const commands = new Set<string>();
  let match;
  const regex = new RegExp(COMMAND_REGEX.source, 'g');
  while ((match = regex.exec(value))) {
    commands.add(match[1]);
  }
  return [...commands];
}

/**
 * Detect event names in a hyperscript value string.
 */
function detectEvents(value: string): string[] {
  const events = new Set<string>();
  let match;
  const regex = new RegExp(EVENT_REGEX.source, 'g');
  while ((match = regex.exec(value))) {
    events.add(match[1]);
  }
  return [...events];
}

/**
 * Extract all snippets from a single file.
 */
export function extractSnippetsFromFile(filePath: string, projectRoot: string): Snippet[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const stat = fs.statSync(filePath);
  const relativePath = path.relative(projectRoot, filePath);
  const snippets: Snippet[] = [];

  // Track seen offsets to avoid duplicates from overlapping patterns
  const seenOffsets = new Set<number>();

  for (const pattern of PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match;

    while ((match = regex.exec(content))) {
      const attrName = match[pattern.nameGroup];
      const quoteChar = match[pattern.quoteGroup];
      const value = match[pattern.valueGroup];

      // Calculate byte offset of the value (after the opening quote)
      const fullMatchStart = match.index;
      const attrNameEnd = fullMatchStart + match[0].indexOf(quoteChar) + 1;
      const valueByteOffset = attrNameEnd;
      const valueByteEndOffset = valueByteOffset + value.length;

      // Skip if we've already captured this position
      if (seenOffsets.has(valueByteOffset)) continue;
      seenOffsets.add(valueByteOffset);

      const line = lineNumberAt(content, fullMatchStart);
      const column = columnAt(content, fullMatchStart);
      const { tag, type } = findEnclosingElement(content, fullMatchStart);

      const isHyperscript = pattern.category === 'hyperscript';

      snippets.push({
        id: snippetId(filePath, valueByteOffset),
        filePath,
        relativePath,
        attributeName: attrName,
        value,
        isMultiline: value.includes('\n'),
        line,
        column,
        valueByteOffset,
        valueByteEndOffset,
        quoteChar,
        elementTag: tag,
        elementType: type,
        category: pattern.category,
        commands: isHyperscript ? detectCommands(value) : [],
        events: isHyperscript ? detectEvents(value) : [],
        fileMtime: stat.mtimeMs,
      });
    }
  }

  // Sort by line number
  snippets.sort((a, b) => a.line - b.line);

  return snippets;
}

/**
 * Extract all snippets from a project directory.
 */
export async function extractSnippetsFromProject(
  projectDir: string,
  options: ExtractorOptions = {}
): Promise<Snippet[]> {
  const resolvedDir = path.resolve(projectDir);

  const includeGlobs = options.include?.length ? options.include : DEFAULT_GLOBS;
  const ignorePatterns = [...DEFAULT_IGNORE, ...(options.exclude ?? [])];

  const files = await glob(includeGlobs, {
    cwd: resolvedDir,
    ignore: ignorePatterns,
    absolute: true,
  });

  const allSnippets: Snippet[] = [];

  for (const file of files) {
    try {
      const snippets = extractSnippetsFromFile(file, resolvedDir);
      allSnippets.push(...snippets);
    } catch {
      // Skip files that can't be read
    }
  }

  return allSnippets;
}
