/**
 * Symbol Table for HyperScript/LokaScript
 *
 * Extracts definitions and usages from hyperscript regions, providing a unified
 * lookup API for go-to-definition, find-references, and rename.
 *
 * Works with regex extraction (no core parser dependency) so it functions
 * in both the full LokaScript extension and the standalone _hyperscript extension.
 */

import type { HyperscriptRegion, RegionPosition } from './types.js';
import { escapeRegExp } from './utils.js';

// =============================================================================
// Types
// =============================================================================

export type SymbolKind = 'behavior' | 'function' | 'variable' | 'event';

export interface SymbolLocation {
  /** Line in the overall document (0-based). */
  line: number;
  /** Character offset in the line (0-based). */
  character: number;
  /** Length of the symbol text. */
  length: number;
}

export interface SymbolEntry {
  name: string;
  kind: SymbolKind;
  /** 'global' for behaviors/functions/$vars, 'local' for :vars */
  scope: 'global' | 'local';
  /** Where this symbol is defined. */
  definitions: SymbolLocation[];
  /** Where this symbol is referenced (excluding definitions). */
  usages: SymbolLocation[];
}

export interface SymbolTable {
  symbols: Map<string, SymbolEntry>;
  /** Look up the symbol at a document position, if any. */
  symbolAt(line: number, character: number): SymbolEntry | undefined;
}

// =============================================================================
// Builder
// =============================================================================

/**
 * Build a symbol table from hyperscript regions.
 *
 * @param regions - Extracted hyperscript regions (from HTML or pure .hs file)
 * @param getKeywordVariants - Optional function to get multilingual keyword variants
 */
export function buildSymbolTable(
  regions: HyperscriptRegion[],
  getKeywordVariants?: (eng: string) => string[]
): SymbolTable {
  const symbols = new Map<string, SymbolEntry>();
  const locationIndex: Array<{ line: number; start: number; end: number; name: string }> = [];

  const variants = (eng: string) => (getKeywordVariants ? getKeywordVariants(eng) : [eng]);

  const behaviorKws = variants('behavior');
  const defKws = variants('def');
  const setKws = variants('set');
  const defaultKws = variants('default');
  const installKws = variants('install');
  const callKws = variants('call');

  // Patterns for definitions
  const behaviorDefPat = new RegExp(`\\b(${behaviorKws.join('|')})\\s+(\\w+)`, 'gi');
  const funcDefPat = new RegExp(`\\b(${defKws.join('|')})\\s+(\\w+)`, 'gi');
  // Variable definitions: set :x, set $x, default :x
  const varDefPat = new RegExp(`\\b(${[...setKws, ...defaultKws].join('|')})\\s+([:$]\\w+)`, 'gi');

  // Patterns for usages
  const installPat = new RegExp(`\\b(${installKws.join('|')})\\s+(\\w+)`, 'gi');
  const callPat = new RegExp(`\\b(${callKws.join('|')})\\s+(\\w+)`, 'gi');
  // Variable references: :x or $x anywhere
  const varRefPat = /[:$]\w+/g;
  // Function calls: word followed by (
  const funcCallPat = /\b(\w+)\s*\(/g;

  function getOrCreate(name: string, kind: SymbolKind, scope: 'global' | 'local'): SymbolEntry {
    let entry = symbols.get(name);
    if (!entry) {
      entry = { name, kind, scope, definitions: [], usages: [] };
      symbols.set(name, entry);
    }
    return entry;
  }

  function toDocLine(region: HyperscriptRegion, localLine: number): number {
    return region.startLine + localLine;
  }

  function toDocChar(region: HyperscriptRegion, localLine: number, localChar: number): number {
    return localLine === 0 ? region.startChar + localChar : localChar;
  }

  function addLocation(
    entry: SymbolEntry,
    kind: 'def' | 'use',
    region: HyperscriptRegion,
    localLine: number,
    localChar: number,
    length: number
  ): void {
    const loc: SymbolLocation = {
      line: toDocLine(region, localLine),
      character: toDocChar(region, localLine, localChar),
      length,
    };
    if (kind === 'def') {
      entry.definitions.push(loc);
    } else {
      entry.usages.push(loc);
    }
    locationIndex.push({
      line: loc.line,
      start: loc.character,
      end: loc.character + length,
      name: entry.name,
    });
  }

  function findLocalLine(code: string, offset: number): number {
    let line = 0;
    for (let i = 0; i < offset && i < code.length; i++) {
      if (code[i] === '\n') line++;
    }
    return line;
  }

  function findLocalChar(code: string, offset: number): number {
    let lastNewline = -1;
    for (let i = 0; i < offset && i < code.length; i++) {
      if (code[i] === '\n') lastNewline = i;
    }
    return offset - lastNewline - 1;
  }

  // Track which variable offsets are definitions (to avoid double-counting as usages)
  const defVarOffsets = new Map<HyperscriptRegion, Set<number>>();

  for (const region of regions) {
    const code = region.code;
    const regionDefOffsets = new Set<number>();
    defVarOffsets.set(region, regionDefOffsets);

    // --- Definitions ---

    // Behavior definitions
    for (const m of code.matchAll(behaviorDefPat)) {
      const name = m[2]!;
      const nameOffset = (m.index ?? 0) + m[0].indexOf(name);
      const localLine = findLocalLine(code, nameOffset);
      const localChar = findLocalChar(code, nameOffset);
      addLocation(
        getOrCreate(name, 'behavior', 'global'),
        'def',
        region,
        localLine,
        localChar,
        name.length
      );
    }

    // Function definitions
    for (const m of code.matchAll(funcDefPat)) {
      const name = m[2]!;
      const nameOffset = (m.index ?? 0) + m[0].indexOf(name);
      const localLine = findLocalLine(code, nameOffset);
      const localChar = findLocalChar(code, nameOffset);
      addLocation(
        getOrCreate(name, 'function', 'global'),
        'def',
        region,
        localLine,
        localChar,
        name.length
      );
    }

    // Variable definitions (set :x, default :x, set $x)
    for (const m of code.matchAll(varDefPat)) {
      const varName = m[2]!;
      const varOffset = (m.index ?? 0) + m[0].indexOf(varName);
      const localLine = findLocalLine(code, varOffset);
      const localChar = findLocalChar(code, varOffset);
      const scope = varName.startsWith('$') ? 'global' : 'local';
      addLocation(
        getOrCreate(varName, 'variable', scope),
        'def',
        region,
        localLine,
        localChar,
        varName.length
      );
      regionDefOffsets.add(varOffset);
    }

    // --- Usages ---

    // install Behavior
    for (const m of code.matchAll(installPat)) {
      const name = m[2]!;
      const nameOffset = (m.index ?? 0) + m[0].indexOf(name);
      const localLine = findLocalLine(code, nameOffset);
      const localChar = findLocalChar(code, nameOffset);
      const entry = getOrCreate(name, 'behavior', 'global');
      addLocation(entry, 'use', region, localLine, localChar, name.length);
    }

    // call funcName
    for (const m of code.matchAll(callPat)) {
      const name = m[2]!;
      const nameOffset = (m.index ?? 0) + m[0].indexOf(name);
      const localLine = findLocalLine(code, nameOffset);
      const localChar = findLocalChar(code, nameOffset);
      const entry = getOrCreate(name, 'function', 'global');
      addLocation(entry, 'use', region, localLine, localChar, name.length);
    }

    // Variable references (:x, $x) — skip ones already recorded as definitions
    for (const m of code.matchAll(varRefPat)) {
      const varName = m[0];
      const varOffset = m.index ?? 0;
      if (regionDefOffsets.has(varOffset)) continue;
      const localLine = findLocalLine(code, varOffset);
      const localChar = findLocalChar(code, varOffset);
      const scope = varName.startsWith('$') ? 'global' : 'local';
      const entry = getOrCreate(varName, 'variable', scope);
      addLocation(entry, 'use', region, localLine, localChar, varName.length);
    }

    // Function calls: name( — skip keywords
    const keywords = new Set([
      'if',
      'else',
      'end',
      'on',
      'then',
      'repeat',
      'for',
      'while',
      'return',
      'set',
      'get',
      'put',
      'add',
      'remove',
      'toggle',
      'show',
      'hide',
      'fetch',
      'send',
      'trigger',
      'wait',
      'log',
      'call',
      'default',
      'behavior',
      'def',
      'install',
      'init',
      'async',
      ...behaviorKws,
      ...defKws,
      ...setKws,
      ...installKws,
      ...callKws,
    ]);
    for (const m of code.matchAll(funcCallPat)) {
      const name = m[1]!;
      if (keywords.has(name.toLowerCase())) continue;
      const nameOffset = m.index ?? 0;
      const localLine = findLocalLine(code, nameOffset);
      const localChar = findLocalChar(code, nameOffset);
      const entry = getOrCreate(name, 'function', 'global');
      // Only add as usage if not already a definition at this offset
      addLocation(entry, 'use', region, localLine, localChar, name.length);
    }
  }

  return {
    symbols,
    symbolAt(line: number, character: number): SymbolEntry | undefined {
      for (const loc of locationIndex) {
        if (loc.line === line && character >= loc.start && character < loc.end) {
          return symbols.get(loc.name);
        }
      }
      return undefined;
    },
  };
}

// =============================================================================
// Cache
// =============================================================================

const cache = new Map<string, { version: number; table: SymbolTable }>();

/**
 * Get or rebuild the symbol table for a document.
 */
export function getSymbolTable(
  uri: string,
  version: number,
  regions: HyperscriptRegion[],
  getKeywordVariants?: (eng: string) => string[]
): SymbolTable {
  const cached = cache.get(uri);
  if (cached && cached.version === version) {
    return cached.table;
  }
  const table = buildSymbolTable(regions, getKeywordVariants);
  cache.set(uri, { version, table });
  return table;
}

/**
 * Invalidate the cache for a document.
 */
export function invalidateSymbolTable(uri: string): void {
  cache.delete(uri);
}
