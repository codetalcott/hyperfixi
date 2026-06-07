/**
 * Grammar-Aware Transformer
 *
 * Transforms hyperscript statements between languages using the
 * generalized grammar system. The key insight is that semantic
 * roles are universal - only their surface realization differs.
 */

import type {
  LanguageProfile,
  ParsedStatement,
  ParsedElement,
  SemanticRole,
  GrammarRule,
  LineMetadata,
} from './types';
import { reorderRoles, insertMarkers, joinTokens } from './types';
import { getProfile, profiles } from './profiles';
import { hasDirectMapping, getDirectMapping } from './direct-mappings';
import { dictionaries } from '../dictionaries';
import { findInDictionary, translateFromEnglish } from '../types';
import {
  ENGLISH_MODIFIER_ROLES,
  ENGLISH_COMMANDS,
  CONDITIONAL_KEYWORDS,
  THEN_KEYWORDS,
} from '../constants';

// =============================================================================
// Compound Statement Handling
// =============================================================================

/**
 * Get all command keywords including translated ones for a locale.
 */
function getCommandKeywordsForLocale(locale: string): Set<string> {
  const keywords = new Set(ENGLISH_COMMANDS);

  // Add translated command keywords from dictionaries
  const dict = dictionaries[locale];
  if (dict?.commands) {
    Object.values(dict.commands).forEach(cmd => {
      if (typeof cmd === 'string') {
        keywords.add(cmd.toLowerCase());
      }
    });
  }

  return keywords;
}

/**
 * Split a compound statement into parts at "then" boundaries, newlines,
 * AND command keyword boundaries.
 *
 * Example: "on click wait 1s then increment #count then toggle .active"
 * Returns: ["on click wait 1s", "increment #count", "toggle .active"]
 *
 * Example: "on click\n  increment #count\n  toggle .highlight"
 * Returns: ["on click", "increment #count", "toggle .highlight"]
 *
 * Example: "wait 2s toggle .highlight"
 * Returns: ["wait 2s", "toggle .highlight"]
 */
/**
 * A reactive-block structure pulled apart by `extractBlockStructure`.
 * Block-syntactic tokens (head, optional condition expression, optional
 * connector, optional `end` tail) live outside the inner body so the
 * body can be transformed by the regular pipeline (SOV reordering,
 * possessives, etc.) without having block delimiters dragged into role
 * values or moved by the canonical-order reorder.
 */
interface BlockStructure {
  headKeyword: string;
  /** Condition expression for `when X changes Y` / `unless X Y`. */
  prefixExpr?: string;
  /** `changes` for `when`; undefined for `live`/`unless`. */
  connector?: string;
  body: string;
  /** `end` if the source had one; undefined otherwise. */
  tailKeyword?: string;
}

/**
 * Detect a reactive block (`live ... end`, `when X changes Y [end]`,
 * `unless X Y [end]`) and decompose it. Returns `null` when the input
 * is not a reactive block, when there's content after the matched
 * `end`, or when the heuristic can't locate a body — all of which fall
 * through to the standard `parseStatement` path.
 */
function extractBlockStructure(input: string, sourceLocale: string): BlockStructure | null {
  const tokens = input.split(/\s+/);
  const head = tokens[0]?.toLowerCase();
  if (!head || !BLOCK_HEAD_KEYWORDS.has(head)) return null;

  // Depth-aware match for the closing `end` so nested blocks
  // (`live when X changes Y end end`) slice correctly.
  let depth = 1;
  let endIdx = -1;
  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i].toLowerCase();
    if (BLOCK_HEAD_KEYWORDS.has(t)) depth++;
    else if (t === 'end') {
      depth--;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }
  }

  // If there's trailing content after the matched `end`, bail out and
  // let the existing splitter handle it. (`splitOnThen` normally
  // separates trailing code before we get here.)
  if (endIdx !== -1 && endIdx !== tokens.length - 1) return null;

  const inner = endIdx !== -1 ? tokens.slice(1, endIdx) : tokens.slice(1);
  const base: BlockStructure = { headKeyword: tokens[0], body: '' };
  if (endIdx !== -1) base.tailKeyword = tokens[endIdx];

  if (head === 'live') {
    return { ...base, body: inner.join(' ') };
  }

  if (head === 'when') {
    // Reactive: `when <expr> changes <body>`. Without `changes`, fall
    // through to the standard event-wait path (parseConditional).
    const idx = inner.findIndex(t => t.toLowerCase() === 'changes');
    if (idx >= 0) {
      return {
        ...base,
        prefixExpr: inner.slice(0, idx).join(' '),
        connector: inner[idx],
        body: inner.slice(idx + 1).join(' '),
      };
    }
    return null;
  }

  // `unless <cond> <body>`: condition runs up to the first command
  // keyword in `inner`. Heuristic — works because hyperscript bodies
  // always start with a command verb, and `unless` conditions rarely
  // contain bare command keywords as values.
  const commands = getCommandKeywordsForLocale(sourceLocale);
  let bodyStart = -1;
  for (let i = 0; i < inner.length; i++) {
    if (commands.has(inner[i].toLowerCase())) {
      bodyStart = i;
      break;
    }
  }
  if (bodyStart <= 0) return null;
  return {
    ...base,
    prefixExpr: inner.slice(0, bodyStart).join(' '),
    body: inner.slice(bodyStart).join(' '),
  };
}

function splitCompoundStatement(input: string, sourceLocale: string): string[] {
  // First, split on newlines (preserving non-empty lines)
  const lines = input
    .split(/\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // If we have multiple lines, treat each as a separate part
  // (but still need to handle "then" within each line)
  const parts: string[] = [];

  for (const line of lines) {
    const lineParts = splitOnThen(line, sourceLocale);
    // Further split each part on command boundaries
    for (const part of lineParts) {
      const commandParts = splitOnCommandBoundaries(part, sourceLocale);
      parts.push(...commandParts);
    }
  }

  return parts;
}

// =============================================================================
// Line Structure Preservation
// =============================================================================

/**
 * Result of splitting with preserved line metadata.
 */
interface SplitWithMetadataResult {
  /** The processed parts (commands/statements) */
  parts: string[];
  /** Metadata for each original line (for reconstruction) */
  lineMetadata: LineMetadata[];
  /** Mapping from parts back to their original line indices */
  partToLineIndex: number[];
}

/**
 * Split a compound statement while preserving line structure metadata.
 * This tracks indentation and blank lines for reconstruction.
 */
function splitCompoundStatementWithMetadata(
  input: string,
  sourceLocale: string
): SplitWithMetadataResult {
  const rawLines = input.split('\n');
  const lineMetadata: LineMetadata[] = [];
  const parts: string[] = [];
  const partToLineIndex: number[] = [];

  for (let lineIndex = 0; lineIndex < rawLines.length; lineIndex++) {
    const rawLine = rawLines[lineIndex];

    // Capture leading whitespace
    const indentMatch = rawLine.match(/^(\s*)/);
    const originalIndent = indentMatch ? indentMatch[1] : '';
    const trimmed = rawLine.trim();

    lineMetadata.push({
      content: trimmed,
      originalIndent,
      isBlank: trimmed.length === 0,
    });

    if (trimmed.length > 0) {
      // Process non-empty lines for "then" and command boundaries
      const lineParts = splitOnThen(trimmed, sourceLocale);
      for (const part of lineParts) {
        const commandParts = splitOnCommandBoundaries(part, sourceLocale);
        for (const cmdPart of commandParts) {
          parts.push(cmdPart);
          partToLineIndex.push(lineIndex);
        }
      }
    }
  }

  return { parts, lineMetadata, partToLineIndex };
}

/**
 * Normalize indentation to consistent 4-space levels.
 * Preserves relative indentation structure while standardizing spacing.
 */
function normalizeIndentation(lineMetadata: LineMetadata[]): string[] {
  // Find non-blank lines with indentation
  const indentedLines = lineMetadata.filter(m => !m.isBlank && m.originalIndent.length > 0);

  if (indentedLines.length === 0) {
    // No indented lines, return empty strings
    return lineMetadata.map(() => '');
  }

  // Find minimum non-zero indent (the base unit)
  const indentLengths = indentedLines.map(m => {
    // Convert tabs to 4 spaces for consistent measurement
    const normalized = m.originalIndent.replace(/\t/g, '    ');
    return normalized.length;
  });
  const minIndent = Math.min(...indentLengths);
  const baseUnit = minIndent > 0 ? minIndent : 4;

  // Normalize each line's indentation
  return lineMetadata.map(meta => {
    if (meta.isBlank) {
      return ''; // Blank lines get no indentation
    }
    if (meta.originalIndent.length === 0) {
      return ''; // No original indent
    }

    // Convert tabs and calculate level
    const normalized = meta.originalIndent.replace(/\t/g, '    ');
    const level = Math.round(normalized.length / baseUnit);
    return '    '.repeat(level); // 4 spaces per level
  });
}

/**
 * Reconstruct output with preserved line structure.
 * Maps transformed parts back to their original lines with proper indentation.
 */
function reconstructWithLineStructure(
  transformedParts: string[],
  lineMetadata: LineMetadata[],
  partToLineIndex: number[],
  targetThen: string
): string {
  // If there's only one non-blank line, simple case
  const nonBlankCount = lineMetadata.filter(m => !m.isBlank).length;
  if (nonBlankCount <= 1 && transformedParts.length <= 1) {
    const normalizedIndents = normalizeIndentation(lineMetadata);
    const result: string[] = [];

    for (let i = 0; i < lineMetadata.length; i++) {
      if (lineMetadata[i].isBlank) {
        result.push('');
      } else if (transformedParts.length > 0) {
        result.push(normalizedIndents[i] + transformedParts[0]);
      }
    }
    return result.join('\n');
  }

  // Normalize indentation
  const normalizedIndents = normalizeIndentation(lineMetadata);

  // Group transformed parts by their original line
  const partsPerLine: Map<number, string[]> = new Map();
  for (let i = 0; i < transformedParts.length; i++) {
    const lineIdx = partToLineIndex[i];
    if (!partsPerLine.has(lineIdx)) {
      partsPerLine.set(lineIdx, []);
    }
    partsPerLine.get(lineIdx)!.push(transformedParts[i]);
  }

  // Build result lines
  const result: string[] = [];
  for (let i = 0; i < lineMetadata.length; i++) {
    const meta = lineMetadata[i];
    const indent = normalizedIndents[i];

    if (meta.isBlank) {
      result.push('');
    } else {
      const lineParts = partsPerLine.get(i) || [];
      if (lineParts.length > 0) {
        // Join multiple parts on same line with "then"
        const lineContent = lineParts.join(` ${targetThen} `);
        result.push(indent + lineContent);
      }
    }
  }

  return result.join('\n');
}

/**
 * Split a statement on command keyword boundaries.
 * E.g., "wait 2s toggle .highlight" → ["wait 2s", "toggle .highlight"]
 *
 * Special cases:
 * - "on <event> <command>" stays together (event handler with first command)
 * - Modifiers like "to", "from" don't trigger splits
 */
/**
 * English modifier keywords that should not trigger command boundary splits.
 * These are the base set; localized equivalents (e.g. Japanese `に`, Spanish
 * `a`, Arabic `إلى`) are layered on per source locale by
 * `getBoundaryModifiersForLocale`, so a preposition in a non-English source
 * is also recognized as a modifier rather than a spurious command boundary.
 */
const BOUNDARY_MODIFIERS = new Set([
  'to',
  'into',
  'from',
  'with',
  'by',
  'as',
  'at',
  'in',
  'on',
  'of',
  'over',
]);

/**
 * Boundary modifiers resolved for a given source locale: the English base set
 * (always kept, since input may mix English keywords) plus every grammatical
 * marker form declared by the locale's profile. Profile markers are the
 * surface realizations of semantic roles (destination, source, style, …) —
 * they always bind to a following value, so none should be treated as a
 * command boundary. Cached per locale because profiles are static.
 */
const boundaryModifiersCache = new Map<string, Set<string>>();

function getBoundaryModifiersForLocale(locale: string): Set<string> {
  const cached = boundaryModifiersCache.get(locale);
  if (cached) return cached;

  const modifiers = new Set(BOUNDARY_MODIFIERS);

  const profile = getProfile(locale);
  profile?.markers.forEach(marker => {
    const form = marker.form.replace(/^-|-$/g, '').toLowerCase();
    if (form) modifiers.add(form);

    marker.alternatives?.forEach(alt => {
      const altForm = alt.replace(/^-|-$/g, '').toLowerCase();
      if (altForm) modifiers.add(altForm);
    });
  });

  boundaryModifiersCache.set(locale, modifiers);
  return modifiers;
}

/**
 * Block-introducing keywords whose body should not be split at command
 * boundaries by `splitOnCommandBoundaries`. Inputs starting with one of
 * these are also routed around `parseStatement` entirely by
 * `extractBlockStructure` + `transformBlock` so block-syntactic tokens
 * never reach `parseCommand`/`parseConditional` (where they'd be
 * misinterpreted as command verbs or swept into role values).
 *
 * `if` deliberately stays out: `if X then Y end` already works via the
 * `splitOnThen` + `parseConditional` path.
 */
const BLOCK_HEAD_KEYWORDS = new Set(['live', 'when', 'unless']);

function splitOnCommandBoundaries(input: string, sourceLocale: string): string[] {
  const commandKeywords = getCommandKeywordsForLocale(sourceLocale);
  const boundaryModifiers = getBoundaryModifiersForLocale(sourceLocale);
  const tokens = input.split(/\s+/);

  if (tokens.length === 0) return [input];

  const parts: string[] = [];
  let currentPart: string[] = [];

  // Check if this starts with an event handler pattern (on/em/en/bei/で + event)
  const firstTokenLower = tokens[0]?.toLowerCase();
  const isEventHandler = EVENT_KEYWORDS.has(firstTokenLower);

  // If it's an event handler, the first command after the event is part of the handler
  // So we need to track whether we've seen the first command yet
  let seenFirstCommand = !isEventHandler; // If not event handler, we're already past the "first command" phase

  // Track block-scope depth (live/when/bind/if/unless/for/while/...). While
  // inside a block, do not split on command boundaries — the body belongs
  // to the block head and must transform as one unit. See comments on
  // BLOCK_HEAD_KEYWORDS for the failure mode this prevents.
  let blockDepth = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const lowerToken = token.toLowerCase();

    // Update block-scope depth before any split decision.
    if (BLOCK_HEAD_KEYWORDS.has(lowerToken)) {
      blockDepth++;
    } else if (lowerToken === 'end' && blockDepth > 0) {
      blockDepth--;
    }

    // If this is a command keyword and we already have tokens in current part
    if (commandKeywords.has(lowerToken) && currentPart.length > 0) {
      // Check if the previous token looks like it could end a command
      const prevToken = currentPart[currentPart.length - 1];
      const prevLower = prevToken.toLowerCase();

      // For event handlers: don't split before the first command
      // E.g., "on click wait 1s" should stay together
      if (!seenFirstCommand) {
        // Mark that we've now seen the first command
        seenFirstCommand = true;
        currentPart.push(token);
        continue;
      }

      // Don't split inside a block (live/when/bind/unless body, etc.).
      // The block head and its body must transform as one statement.
      if (blockDepth > 0) {
        currentPart.push(token);
        continue;
      }

      if (!boundaryModifiers.has(prevLower) && !commandKeywords.has(prevLower)) {
        // This looks like a command boundary - save current part and start new one
        parts.push(currentPart.join(' '));
        currentPart = [token];
        continue;
      }
    }

    currentPart.push(token);
  }

  // Add the last part
  if (currentPart.length > 0) {
    parts.push(currentPart.join(' '));
  }

  return parts.filter(p => p.length > 0);
}

/**
 * Split a single line on "then" keywords.
 */
function splitOnThen(input: string, sourceLocale: string): string[] {
  // Build regex pattern from all known "then" keywords
  const thenKeywords = Array.from(THEN_KEYWORDS);

  // Add any dictionary-specific "then" keyword for the source locale
  const sourceDict = sourceLocale === 'en' ? null : dictionaries[sourceLocale];
  if (sourceDict?.modifiers?.then) {
    thenKeywords.push(sourceDict.modifiers.then);
  }
  // Also check logical.then since some dictionaries put it there
  if ((sourceDict?.logical as Record<string, string>)?.then) {
    thenKeywords.push((sourceDict?.logical as Record<string, string>).then);
  }

  // Create a regex that matches any "then" keyword as a whole word
  // Use word boundaries to avoid matching "then" inside other words
  const escapedKeywords = thenKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`\\s+(${escapedKeywords.join('|')})\\s+`, 'gi');

  // Split on "then" keywords
  const parts = input.split(pattern).filter(part => {
    // Filter out the "then" keywords themselves (captured by the group)
    const lowerPart = part.toLowerCase().trim();
    return lowerPart && !thenKeywords.some(k => k.toLowerCase() === lowerPart);
  });

  return parts.map(p => p.trim()).filter(p => p.length > 0);
}

/**
 * Get the "then" keyword in the target language.
 * Checks both modifiers and logical sections since dictionaries vary.
 */
function getTargetThenKeyword(targetLocale: string): string {
  if (targetLocale === 'en') return 'then';

  const targetDict = dictionaries[targetLocale];
  if (!targetDict) return 'then';

  // Check modifiers first, then logical (dictionaries vary)
  return (
    targetDict.modifiers?.then || (targetDict.logical as Record<string, string>)?.then || 'then'
  );
}

// =============================================================================
// Derived Constants from Profiles
// =============================================================================

/**
 * Derive event keywords from all language profiles.
 * This replaces the hardcoded eventKeywords array.
 */
function deriveEventKeywordsFromProfiles(): Set<string> {
  const keywords = new Set<string>();

  // Add 'on' as the English default
  keywords.add('on');

  // Extract event markers from all profiles
  for (const profile of Object.values(profiles)) {
    for (const marker of profile.markers) {
      if (marker.role === 'event') {
        // Strip hyphen notation and add
        const form = marker.form.replace(/^-|-$/g, '').toLowerCase();
        if (form) keywords.add(form);

        // Add alternatives
        marker.alternatives?.forEach(alt => {
          const altForm = alt.replace(/^-|-$/g, '').toLowerCase();
          if (altForm) keywords.add(altForm);
        });
      }
    }
  }

  return keywords;
}

/** Event keywords derived from language profiles */
const EVENT_KEYWORDS = deriveEventKeywordsFromProfiles();

// =============================================================================
// Helper: Dynamic Modifier Map
// =============================================================================

/**
 * Generates a lookup map for semantic roles based on the language profile.
 * Maps markers (e.g., 'to', 'に', 'into', 'إلى') to their semantic roles.
 * This enables parsing non-English input by using the profile's markers.
 */
function generateModifierMap(profile: LanguageProfile): Record<string, SemanticRole> {
  const map: Record<string, SemanticRole> = {};

  // Map markers to roles from the profile
  profile.markers.forEach(marker => {
    // Strip hyphen notation for suffix/prefix markers
    const form = marker.form.replace(/^-|-$/g, '').toLowerCase();
    if (form) {
      map[form] = marker.role;
    }

    // Map alternatives if they exist (e.g., Korean vowel harmony variants)
    marker.alternatives?.forEach(alt => {
      const altForm = alt.replace(/^-|-$/g, '').toLowerCase();
      if (altForm) {
        map[altForm] = marker.role;
      }
    });
  });

  // Add English modifiers as fallback (don't override profile-specific markers)
  for (const [key, role] of Object.entries(ENGLISH_MODIFIER_ROLES)) {
    if (!(key in map)) {
      map[key] = role;
    }
  }

  return map;
}

// =============================================================================
// Statement Parser
// =============================================================================

/**
 * Parse a hyperscript statement into semantic roles
 * This is the core analysis step that identifies WHAT each part means
 */
export function parseStatement(input: string, sourceLocale: string = 'en'): ParsedStatement | null {
  const profile = getProfile(sourceLocale);
  if (!profile) return null;

  const tokens = tokenize(input, profile);

  // Identify statement type and extract roles
  const statementType = identifyStatementType(tokens, profile);

  switch (statementType) {
    case 'event-handler':
      return parseEventHandler(tokens, profile);
    case 'command':
      return parseCommand(tokens, profile);
    case 'conditional':
      return parseConditional(tokens, profile);
    default:
      return null;
  }
}

/**
 * Known suffixes that may attach to words without spaces.
 * These are split off during tokenization for proper parsing.
 */
const ATTACHED_SUFFIXES: Record<string, string[]> = {
  // Chinese: 时 (time/when) often attaches to events like 点击时 (when clicking)
  zh: ['时', '的', '地', '得'],
  // Japanese: Some particles may attach in casual writing
  ja: [],
  // Korean: Particles sometimes written without spaces
  ko: [],
};

/**
 * Known prefixes that may attach to words without spaces.
 */
const ATTACHED_PREFIXES: Record<string, string[]> = {
  // Chinese: 当 (when) sometimes written attached
  zh: ['当'],
  // Arabic: Prepositions that attach
  ar: ['بـ', 'كـ', 'و'],
};

/**
 * Post-process tokens to split attached suffixes/prefixes.
 * E.g., "点击时" → ["点击", "时"]
 */
function splitAttachedAffixes(tokens: string[], locale: string): string[] {
  const suffixes = ATTACHED_SUFFIXES[locale] || [];
  const prefixes = ATTACHED_PREFIXES[locale] || [];

  if (suffixes.length === 0 && prefixes.length === 0) {
    return tokens;
  }

  const result: string[] = [];

  for (const token of tokens) {
    // Skip CSS selectors and numbers
    if (/^[#.<@]/.test(token) || /^\d+/.test(token)) {
      result.push(token);
      continue;
    }

    let processed = token;
    let prefix = '';
    let suffix = '';

    // Check for attached prefixes
    for (const p of prefixes) {
      if (processed.startsWith(p) && processed.length > p.length) {
        prefix = p;
        processed = processed.slice(p.length);
        break;
      }
    }

    // Check for attached suffixes
    for (const s of suffixes) {
      if (processed.endsWith(s) && processed.length > s.length) {
        suffix = s;
        processed = processed.slice(0, -s.length);
        break;
      }
    }

    // Add tokens in order: prefix, main, suffix
    if (prefix) result.push(prefix);
    if (processed) result.push(processed);
    if (suffix) result.push(suffix);
  }

  return result;
}

/**
 * Simple tokenizer that handles:
 * - Keywords (from dictionary)
 * - CSS selectors (#id, .class, <tag/>)
 * - String literals
 * - Numbers
 * - Attached suffixes/prefixes (language-specific)
 */
function tokenize(input: string, profile: LanguageProfile): string[] {
  // Split on whitespace, preserving selectors and strings
  const tokens: string[] = [];
  let current = '';
  let inSelector = false;
  let selectorDepth = 0;
  let bracketDepth = 0;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    // Track CSS selector context
    if (char === '<') {
      inSelector = true;
      selectorDepth++;
    } else if (char === '>' && inSelector) {
      selectorDepth--;
      if (selectorDepth === 0) inSelector = false;
    }

    // Track event-guard / attribute brackets so `[key is 'Escape']` (which has
    // internal spaces) stays a single token instead of splitting into
    // `[key` / `is` / `'Escape']` — which mis-assigns `is` as the action verb.
    if (char === '[') {
      bracketDepth++;
    } else if (char === ']' && bracketDepth > 0) {
      bracketDepth--;
    }

    // Split on whitespace unless inside a selector or a bracket guard
    if (/\s/.test(char) && !inSelector && bracketDepth === 0) {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    tokens.push(current);
  }

  // Post-process to split attached affixes for languages that need it
  return splitAttachedAffixes(tokens, profile.code);
}

/**
 * Identify what type of statement this is
 */
function identifyStatementType(
  tokens: string[],
  profile: LanguageProfile
): 'event-handler' | 'command' | 'conditional' | 'unknown' {
  if (tokens.length === 0) return 'unknown';

  const firstToken = tokens[0].toLowerCase();

  // Check for event handler
  const eventMarker = profile.markers.find(m => m.role === 'event' && m.position === 'preposition');
  if (eventMarker && firstToken === eventMarker.form.toLowerCase()) {
    return 'event-handler';
  }

  // Check if first token is a known event keyword (derived from profiles)
  if (EVENT_KEYWORDS.has(firstToken)) {
    return 'event-handler';
  }

  // Check for conditional using shared constants
  if (CONDITIONAL_KEYWORDS.has(firstToken)) {
    return 'conditional';
  }

  return 'command';
}

/**
 * Parse an event handler statement
 * Pattern: on {event} {command} {target?} {modifiers?}
 *
 * Now handles modifiers like "by 3" in "on click increment #count by 3"
 */
function parseEventHandler(tokens: string[], profile: LanguageProfile): ParsedStatement {
  const roles = new Map<SemanticRole, ParsedElement>();

  // Skip the event keyword (e.g., 'on', 'で', '当', etc.) - derived from profiles
  let startIndex = EVENT_KEYWORDS.has(tokens[0]?.toLowerCase()) ? 1 : 0;

  // Next token is the event
  if (tokens[startIndex]) {
    roles.set('event', {
      role: 'event',
      value: tokens[startIndex],
    });
    startIndex++;
  }

  // Check for event source modifier before the action (e.g., "from #source" in "on input from #firstName set ...")
  // Only handle 'from' (event source) — other modifiers like circumfix markers (Chinese 时) should not be consumed.
  if (tokens[startIndex] && tokens[startIndex].toLowerCase() === 'from' && tokens[startIndex + 1]) {
    startIndex++; // skip 'from'
    // Collect source value tokens until a command keyword is found
    const sourceValue: string[] = [];
    while (tokens[startIndex]) {
      if (ENGLISH_COMMANDS.has(tokens[startIndex].toLowerCase())) break;
      sourceValue.push(tokens[startIndex]);
      startIndex++;
    }
    if (sourceValue.length > 0) {
      const value = sourceValue.join(' ');
      roles.set('source', {
        role: 'source',
        value,
        isSelector: /^[#.<@]/.test(value),
      });
    }
  }

  // Next token is the action (command verb)
  if (tokens[startIndex]) {
    roles.set('action', {
      role: 'action',
      value: tokens[startIndex],
    });
    startIndex++;
  }

  // Parse remaining tokens with modifier awareness (like parseCommand does)
  // This handles "by 3" in "on click increment #count by 3"
  if (tokens[startIndex]) {
    const modifierMap = generateModifierMap(profile);
    let currentRole: SemanticRole = 'patient';
    let currentValue: string[] = [];

    for (let i = startIndex; i < tokens.length; i++) {
      const token = tokens[i];
      const mappedRole = modifierMap[token.toLowerCase()];

      if (mappedRole) {
        // Save previous role
        if (currentValue.length > 0) {
          const value = currentValue.join(' ');
          roles.set(currentRole, {
            role: currentRole,
            value,
            isSelector: /^[#.<@]/.test(value),
          });
        }
        currentRole = mappedRole;
        currentValue = [];
      } else {
        currentValue.push(token);
      }
    }

    // Save final role
    if (currentValue.length > 0) {
      const value = currentValue.join(' ');
      roles.set(currentRole, {
        role: currentRole,
        value,
        isSelector: /^[#.<@]/.test(value),
      });
    }
  }

  return {
    type: 'event-handler',
    roles,
    original: tokens.join(' '),
  };
}

/**
 * Parse a command statement
 * Pattern: {command} {args...}
 */
function parseCommand(tokens: string[], profile: LanguageProfile): ParsedStatement {
  const roles = new Map<SemanticRole, ParsedElement>();

  if (tokens.length === 0) {
    return { type: 'command', roles, original: '' };
  }

  // First token is the command
  roles.set('action', {
    role: 'action',
    value: tokens[0],
  });

  // Generate dynamic modifier map from language profile
  // This enables parsing non-English input (e.g., Japanese に, Korean 에, Arabic إلى)
  const modifierMap = generateModifierMap(profile);

  let currentRole: SemanticRole = 'patient';
  let currentValue: string[] = [];

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    const mappedRole = modifierMap[token.toLowerCase()];

    if (mappedRole) {
      // Save previous role
      if (currentValue.length > 0) {
        const value = currentValue.join(' ');
        roles.set(currentRole, {
          role: currentRole,
          value,
          isSelector: /^[#.<@]/.test(value),
        });
      }
      currentRole = mappedRole;
      currentValue = [];
    } else {
      currentValue.push(token);
    }
  }

  // Save final role
  if (currentValue.length > 0) {
    const value = currentValue.join(' ');
    roles.set(currentRole, {
      role: currentRole,
      value,
      isSelector: /^[#.<@]/.test(value),
    });
  }

  return {
    type: 'command',
    roles,
    original: tokens.join(' '),
  };
}

/**
 * Parse a conditional statement
 */
function parseConditional(tokens: string[], _profile: LanguageProfile): ParsedStatement {
  const roles = new Map<SemanticRole, ParsedElement>();

  // First token is the 'if' keyword
  roles.set('action', {
    role: 'action',
    value: tokens[0],
  });

  // Find 'then' to split condition from body - using shared constants
  const thenIndex = tokens.findIndex(t => THEN_KEYWORDS.has(t.toLowerCase()));

  if (thenIndex > 1) {
    const conditionValue = tokens.slice(1, thenIndex).join(' ');
    roles.set('condition', {
      role: 'condition',
      value: conditionValue,
    });
  }

  return {
    type: 'conditional',
    roles,
    original: tokens.join(' '),
  };
}

// =============================================================================
// Translation
// =============================================================================

/**
 * Translate words using dictionary with type-safe access.
 */
function translateWord(word: string, sourceLocale: string, targetLocale: string): string {
  // Don't translate CSS selectors
  if (/^[#.<@]/.test(word)) {
    return word;
  }

  // Don't translate numbers
  if (/^\d+/.test(word)) {
    return word;
  }

  const sourceDict = sourceLocale === 'en' ? null : dictionaries[sourceLocale];
  const targetDict = dictionaries[targetLocale];

  if (!targetDict) return word;

  // If source is not English, first map to English using type-safe lookup
  let englishWord = word;
  if (sourceDict) {
    const found = findInDictionary(sourceDict, word);
    if (found) {
      englishWord = found.englishKey;
    }
  }

  // Now map English to target locale using type-safe lookup
  const translated = translateFromEnglish(targetDict, englishWord);
  return translated ?? word;
}

/**
 * Possessive markers for each language.
 * Used to transform "X's Y" patterns to target language structure.
 */
const POSSESSIVE_MARKERS: Record<
  string,
  { type: 'prefix' | 'suffix' | 'preposition' | 'particle'; marker: string }
> = {
  en: { type: 'suffix', marker: "'s" },
  es: { type: 'preposition', marker: 'de' },
  pt: { type: 'preposition', marker: 'de' },
  fr: { type: 'preposition', marker: 'de' },
  de: { type: 'preposition', marker: 'von' },
  ja: { type: 'suffix', marker: 'の' },
  ko: { type: 'suffix', marker: '의' },
  zh: { type: 'suffix', marker: '的' },
  ar: { type: 'preposition', marker: 'لـ' },
  // Spaced genitive particle (not the glued `'ın`), so the tokenizer can split
  // it off the selector — consistent with Turkish's other spaced case markers.
  tr: { type: 'particle', marker: 'ın' },
  id: { type: 'preposition', marker: 'dari' },
  // Latin-script genitive: must be a *spaced* particle (`#picker pa`), since a
  // glued `#pickerpa` can't be split from the selector by the tokenizer the
  // way a non-Latin suffix (の/의/র) can.
  qu: { type: 'particle', marker: 'pa' },
  // Bengali SOV postposition genitive, like ja/ko — a spaced suffix the
  // tokenizer splits off as a particle. Previously absent, so it fell back to
  // the English `'s` marker and its possessive property paths never parsed.
  // (Hindi `का` is intentionally omitted: its `bind` lacks a verb-final
  // grammar rule, so fixing its possessive alone yields a wrong `on` parse —
  // tracked as separate follow-up.)
  bn: { type: 'suffix', marker: 'র' },
  sw: { type: 'preposition', marker: 'ya' },
};

/**
 * Transform possessive 's syntax to target language.
 *
 * Examples:
 *   me's value → mi valor (Spanish - pronoun becomes possessive adjective)
 *   #button's textContent → textContent de #button (Spanish - prepositional)
 *   me's value → 私の値 (Japanese - の particle)
 */
function translatePossessive(token: string, sourceLocale: string, targetLocale: string): string {
  // Check for 's possessive pattern
  const possessiveMatch = token.match(/^(.+)'s$/i);
  if (!possessiveMatch) {
    return token;
  }

  const owner = possessiveMatch[1];
  const targetMarker = POSSESSIVE_MARKERS[targetLocale] || POSSESSIVE_MARKERS.en;

  // Check if owner is a pronoun that has a possessive form
  const pronounPossessives: Record<string, string> = {
    me: 'my',
    it: 'its',
    you: 'your',
  };

  const lowerOwner = owner.toLowerCase();
  if (pronounPossessives[lowerOwner]) {
    // Convert "me's" to "my" then translate
    const possessiveForm = pronounPossessives[lowerOwner];
    return translateWord(possessiveForm, 'en', targetLocale);
  }

  // For selectors and other owners, translate owner and apply target possessive marker
  const translatedOwner = translateWord(owner, sourceLocale, targetLocale);

  switch (targetMarker.type) {
    case 'suffix':
      // Japanese/Korean/Chinese: owner + marker (e.g., #buttonの, #button의)
      return `${translatedOwner}${targetMarker.marker}`;
    case 'particle':
      // Latin-script spaced genitive (Quechua `pa`): owner + space + marker
      // so the tokenizer can separate it from the selector.
      return `${translatedOwner} ${targetMarker.marker}`;
    case 'preposition':
      // Will be handled by caller - return marker + owner format
      // Store as special format to be processed later
      return `__POSS__${targetMarker.marker}__${translatedOwner}__POSS__`;
    default:
      return `${translatedOwner}'s`;
  }
}

// =============================================================================
// Possessive Dot Notation
// =============================================================================

/**
 * Regex to match possessive dot notation patterns.
 * Matches: my.prop, its.prop, your.prop, me.prop, it.prop, you.prop
 * Also matches optional chaining: my?.prop, me?.prop, etc.
 */
const POSSESSIVE_DOT_REGEX = /^(my|its|your|me|it|you)(\??\..+)$/i;

/**
 * Map pronoun forms to possessive adjective forms for dictionary lookup.
 */
const POSSESSIVE_DOT_PRONOUNS: Record<string, string> = {
  me: 'my',
  it: 'its',
  you: 'your',
  my: 'my',
  its: 'its',
  your: 'your',
};

/**
 * Translate possessive dot notation like my.textContent → mi.textContent.
 * Handles both possessive adjective forms (my, its, your) and pronoun forms (me, it, you).
 * Also handles optional chaining (my?.prop).
 * Returns null if the value doesn't match or no translation is available.
 */
function translatePossessiveDotNotation(
  value: string,
  sourceLocale: string,
  targetLocale: string
): string | null {
  const match = value.match(POSSESSIVE_DOT_REGEX);
  if (!match) return null;

  const possessiveWord = match[1].toLowerCase();
  const propertySuffix = match[2]; // ".textContent" or "?.textContent"

  // Normalize to possessive adjective form for dictionary lookup
  const possessiveKey = POSSESSIVE_DOT_PRONOUNS[possessiveWord] || possessiveWord;
  const translated = translateWord(possessiveKey, sourceLocale, targetLocale);

  // Skip if translation is multi-word (can't prefix dot notation)
  if (translated.includes(' ')) return null;

  if (translated !== possessiveKey) {
    return translated + propertySuffix;
  }

  // Try original pronoun form if different from possessive key
  if (possessiveWord !== possessiveKey) {
    const alt = translateWord(possessiveWord, sourceLocale, targetLocale);
    if (alt !== possessiveWord && !alt.includes(' ')) {
      return alt + propertySuffix;
    }
  }

  return null;
}

// =============================================================================
// Multi-Word Value Translation
// =============================================================================

/**
 * Translate a multi-word value, translating each word individually.
 * Handles possessives like "my value" → "mi valor" in Spanish.
 * Also handles 's possessive syntax like "me's value" → "mi valor".
 * Also handles possessive dot notation like "my.textContent" → "mi.textContent".
 */
function translateMultiWordValue(
  value: string,
  sourceLocale: string,
  targetLocale: string
): string {
  // Mask event-guard / attribute brackets (`[key is 'Escape']`): their contents
  // are expression syntax, not translatable keywords — translating `is` -> `ni`
  // etc. inside them breaks the guard. Restore verbatim after translation.
  if (value.includes('[')) {
    const guards: string[] = [];
    const masked = value.replace(/\[[^\]]*\]/g, match => {
      guards.push(match);
      return `${guards.length - 1}`;
    });
    if (guards.length > 0) {
      const translated = translateMultiWordValue(masked, sourceLocale, targetLocale);
      return translated.replace(/(\d+)/g, (_, n) => guards[Number(n)]);
    }
  }

  // If it's a single word, check for possessive then translate
  if (!value.includes(' ')) {
    // Check for possessive 's
    if (value.includes("'s")) {
      return translatePossessive(value, sourceLocale, targetLocale);
    }
    // Check for possessive dot notation (my.prop, its.prop, me.prop, etc.)
    const dotResult = translatePossessiveDotNotation(value, sourceLocale, targetLocale);
    if (dotResult !== null) return dotResult;

    return translateWord(value, sourceLocale, targetLocale);
  }

  // Split into words and translate each
  const words = value.split(/\s+/);
  const translated: string[] = [];
  let i = 0;

  while (i < words.length) {
    const word = words[i];

    // Check for possessive 's pattern FIRST (e.g., "me's value", "#button's textContent")
    // This must come before selector check because "#button's" starts with #
    if (word.includes("'s")) {
      const possessiveResult = translatePossessive(word, sourceLocale, targetLocale);

      // Check if it's a prepositional possessive that needs reordering
      const prepMatch = possessiveResult.match(/^__POSS__(.+)__(.+)__POSS__$/);
      if (prepMatch && i + 1 < words.length) {
        // Prepositional: "X's Y" → "Y marker X" (e.g., "textContent de #button")
        const marker = prepMatch[1];
        const owner = prepMatch[2];
        const property = words[i + 1];
        const translatedProperty = translateWord(property, sourceLocale, targetLocale);
        translated.push(`${translatedProperty} ${marker} ${owner}`);
        i += 2; // Skip property since we consumed it
        continue;
      } else if (prepMatch) {
        // No property following - just output owner with marker prefix
        const marker = prepMatch[1];
        const owner = prepMatch[2];
        translated.push(`${marker} ${owner}`);
        i++;
        continue;
      }

      // Suffix-style possessive (Japanese, Korean, etc.) or pronoun
      translated.push(possessiveResult);
      i++;
      continue;
    }

    // Skip pure CSS selectors and numbers (but NOT possessives which were handled above)
    if (/^[#.<@]/.test(word) || /^\d+/.test(word)) {
      translated.push(word);
      i++;
      continue;
    }

    // Skip quoted strings
    if (/^["'].*["']$/.test(word)) {
      translated.push(word);
      i++;
      continue;
    }

    // Check for possessive dot notation (my.prop, its.prop, me.prop, etc.)
    const dotResult = translatePossessiveDotNotation(word, sourceLocale, targetLocale);
    if (dotResult !== null) {
      translated.push(dotResult);
      i++;
      continue;
    }

    translated.push(translateWord(word, sourceLocale, targetLocale));
    i++;
  }

  return translated.join(' ');
}

/**
 * Translate all elements in a parsed statement
 */
function translateElements(
  parsed: ParsedStatement,
  sourceLocale: string,
  targetLocale: string
): void {
  for (const [_role, element] of parsed.roles) {
    // Always process possessive 's syntax, even for selectors
    // E.g., "#button's textContent" should translate the possessive
    if (element.value.includes("'s")) {
      element.translated = translateMultiWordValue(element.value, sourceLocale, targetLocale);
    } else if (!element.isSelector && !element.isLiteral) {
      element.translated = translateMultiWordValue(element.value, sourceLocale, targetLocale);
    } else {
      element.translated = element.value;
    }
  }
}

// =============================================================================
// Main Transformer
// =============================================================================

export class GrammarTransformer {
  private sourceProfile: LanguageProfile;
  private targetProfile: LanguageProfile;

  constructor(sourceLocale: string = 'en', targetLocale: string) {
    const source = getProfile(sourceLocale);
    const target = getProfile(targetLocale);

    if (!source) throw new Error(`Unknown source locale: ${sourceLocale}`);
    if (!target) throw new Error(`Unknown target locale: ${targetLocale}`);

    this.sourceProfile = source;
    this.targetProfile = target;
  }

  /**
   * Transform a hyperscript statement from source to target language.
   * Handles compound statements with "then" by splitting, transforming each part,
   * and rejoining with the target language's "then" keyword.
   *
   * For multi-line input, preserves line structure (indentation, blank lines).
   */
  transform(input: string): string {
    const targetThen = getTargetThenKeyword(this.targetProfile.code);

    // Inline JS blocks (`... js <raw js> end`) must be masked BEFORE any
    // splitting/reordering: the body is raw JavaScript, not hyperscript, so it
    // must never be tokenized, translated, or word-order reordered. (Single-line
    // only here; multi-line js bodies are handled with the behavior work.)
    if (!input.includes('\n')) {
      const jsBlock = this.tryTransformJsBlock(input);
      if (jsBlock !== null) return jsBlock;
    }

    // Check if input has multi-line structure worth preserving
    const hasMultiLineStructure = input.includes('\n');

    if (hasMultiLineStructure) {
      // Multi-line case - preserve structure (indentation, blank lines)
      const { parts, lineMetadata, partToLineIndex } = splitCompoundStatementWithMetadata(
        input,
        this.sourceProfile.code
      );

      const transformedParts = parts.map(part => this.transformSingle(part));

      return reconstructWithLineStructure(
        transformedParts,
        lineMetadata,
        partToLineIndex,
        targetThen
      );
    }

    // Single-line case - use existing logic
    const parts = splitCompoundStatement(input, this.sourceProfile.code);

    if (parts.length > 1) {
      const transformedParts = parts.map(part => this.transformSingle(part));
      return transformedParts.join(` ${targetThen} `);
    }

    // Single statement (no "then" splitting needed)
    return this.transformSingle(input);
  }

  /**
   * Transform a single hyperscript statement (no compound "then" chains).
   */
  private transformSingle(input: string): string {
    // 0. Reactive block? Route around parseStatement entirely so
    //    block-syntactic tokens (live/when/unless/end) aren't treated
    //    as command verbs or swept into role values, and so SOV/VSO
    //    reorder applies only inside the body.
    const block = extractBlockStructure(input, this.sourceProfile.code);
    if (block) {
      return this.transformBlock(block);
    }

    // 1. Parse into semantic roles
    const parsed = parseStatement(input, this.sourceProfile.code);
    if (!parsed) {
      return input; // Return unchanged if parsing fails
    }

    // 2. Translate individual words
    translateElements(parsed, this.sourceProfile.code, this.targetProfile.code);

    // 3. Find applicable rule
    const rule = this.findRule(parsed);

    // 4. Apply transformation
    if (rule?.transform.custom) {
      return rule.transform.custom(parsed, this.targetProfile);
    }

    // 5. Reorder according to target language's canonical order
    const roleOrder = rule?.transform.roleOrder || this.targetProfile.canonicalOrder;
    const reordered = reorderRoles(parsed.roles, roleOrder);

    // 6. Insert grammatical markers
    const shouldInsertMarkers = rule?.transform.insertMarkers ?? true;
    if (shouldInsertMarkers) {
      const result = insertMarkers(
        reordered,
        this.targetProfile.markers,
        this.targetProfile.adpositionType
      );
      // Use joinTokens for proper suffix/prefix attachment (Turkish -i, Quechua -ta, etc.)
      return joinTokens(result);
    }

    // 7. Join without markers (still use joinTokens for consistency)
    return joinTokens(reordered.map(e => e.translated || e.value));
  }

  /**
   * Detect and transform an inline JS block (`[on <event>] js <raw js> end`).
   *
   * The `js ... end` body is raw JavaScript: it must not be tokenized,
   * translated, or word-order reordered. We mask the whole block with a single
   * opaque placeholder, run the surrounding statement (the event-handler head,
   * if any) through the normal reorder pipeline so the placeholder lands in the
   * correct action position, then substitute the translated `js`/`end` keywords
   * around the verbatim body.
   *
   * Returns `null` (fall through to the normal path) when there is no js block,
   * no matching `end`, or trailing content after `end` (kept tight on purpose).
   */
  private tryTransformJsBlock(input: string): string | null {
    const src = this.sourceProfile.code;
    const dst = this.targetProfile.code;

    // The `js` / `end` keyword forms in the SOURCE language.
    const sourceJs = translateWord('js', 'en', src);
    const sourceEnd = translateWord('end', 'en', src).toLowerCase();

    const tokens = input.split(/\s+/).filter(t => t.length > 0);
    // The js command token, optionally with a `(locals)` suffix: `js`, `js(me)`.
    const escapedJs = sourceJs.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const jsRe = new RegExp(`^${escapedJs}(\\(.*\\))?$`, 'i');
    const jsIdx = tokens.findIndex(t => jsRe.test(t));
    if (jsIdx === -1) return null;

    // First `end` after the js keyword closes the block (raw JS never contains a
    // bare hyperscript `end` token).
    let endIdx = -1;
    for (let i = jsIdx + 1; i < tokens.length; i++) {
      if (tokens[i].toLowerCase() === sourceEnd) {
        endIdx = i;
        break;
      }
    }
    if (endIdx === -1) return null;
    // Trailing content after `end` — leave for the normal path.
    if (endIdx !== tokens.length - 1) return null;

    const jsToken = tokens[jsIdx];
    const jsParen = jsToken.match(jsRe)?.[1] ?? '';
    const jsKeywordRaw = jsParen ? jsToken.slice(0, jsToken.length - jsParen.length) : jsToken;

    const body = tokens.slice(jsIdx + 1, endIdx).join(' ');
    const targetJs = translateWord(jsKeywordRaw, src, dst) + jsParen;
    const targetEnd = translateWord(tokens[endIdx], src, dst);
    const replacement = [targetJs, body, targetEnd].filter(s => s.length > 0).join(' ');

    const before = tokens.slice(0, jsIdx);
    // Bare `js ... end` with no leading event-handler head: emit directly.
    if (before.length === 0) return replacement;

    // Mask the block as one opaque action token, reorder the surrounding
    // statement, then restore the verbatim block.
    const placeholder = 'JSBLOCKPLACEHOLDER';
    const reordered = this.transformSingle([...before, placeholder].join(' '));
    if (!reordered.includes(placeholder)) return null; // unexpected — fall through
    return reordered.replace(placeholder, replacement);
  }

  /**
   * Translate a reactive block by translating the head/tail/connector
   * via the dictionary, recursively transforming the body through the
   * regular pipeline, and rejoining in source-language position order.
   * Block-syntactic tokens are never reordered: they're delimiters, not
   * arguments, and authors expect them at start/end positions
   * regardless of target word order.
   */
  private transformBlock(block: BlockStructure): string {
    const src = this.sourceProfile.code;
    const dst = this.targetProfile.code;

    const head = translateWord(block.headKeyword, src, dst);
    const tail = block.tailKeyword ? translateWord(block.tailKeyword, src, dst) : '';
    const connector = block.connector ? translateWord(block.connector, src, dst) : '';
    const prefix = block.prefixExpr ? translateMultiWordValue(block.prefixExpr, src, dst) : '';

    // Recurse through `transform()` (not `transformSingle`) so the body
    // gets `then`-splitting and nested-block handling for free.
    const body = this.transform(block.body);

    return [head, prefix, connector, body, tail].filter(s => s.length > 0).join(' ');
  }

  /**
   * Find the best matching rule for this statement
   */
  private findRule(parsed: ParsedStatement): GrammarRule | undefined {
    if (!this.targetProfile.rules) return undefined;

    const matchingRules = this.targetProfile.rules
      .filter(rule => this.matchesRule(parsed, rule))
      .sort((a, b) => b.priority - a.priority);

    return matchingRules[0];
  }

  /**
   * Check if a parsed statement matches a rule
   */
  private matchesRule(parsed: ParsedStatement, rule: GrammarRule): boolean {
    const { match } = rule;

    // Check required roles
    for (const role of match.requiredRoles) {
      if (!parsed.roles.has(role)) {
        return false;
      }
    }

    // Check command match if specified
    if (match.commands && match.commands.length > 0) {
      const action = parsed.roles.get('action');
      if (!action) return false;

      const actionValue = action.value.toLowerCase();
      if (!match.commands.some(cmd => cmd.toLowerCase() === actionValue)) {
        return false;
      }
    }

    // Check custom predicate
    if (match.predicate && !match.predicate(parsed)) {
      return false;
    }

    return true;
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Transform hyperscript from English to target language
 */
export function toLocale(input: string, targetLocale: string): string {
  const transformer = new GrammarTransformer('en', targetLocale);
  return transformer.transform(input);
}

/**
 * Transform hyperscript from source language to English
 */
export function toEnglish(input: string, sourceLocale: string): string {
  const transformer = new GrammarTransformer(sourceLocale, 'en');
  return transformer.transform(input);
}

/**
 * Transform between any two languages.
 *
 * Uses direct translation for supported language pairs (ja↔zh, es↔pt, ko↔ja),
 * falling back to English pivot for other pairs.
 */
export function translate(input: string, sourceLocale: string, targetLocale: string): string {
  if (sourceLocale === targetLocale) return input;
  if (sourceLocale === 'en') return toLocale(input, targetLocale);
  if (targetLocale === 'en') return toEnglish(input, sourceLocale);

  // Try direct translation for supported pairs
  if (hasDirectMapping(sourceLocale, targetLocale)) {
    return translateDirect(input, sourceLocale, targetLocale);
  }

  // Fallback: Via English pivot
  const english = toEnglish(input, sourceLocale);
  return toLocale(english, targetLocale);
}

/**
 * Direct translation between language pairs without English pivot.
 * More accurate for closely related languages (ja↔zh, es↔pt).
 */
function translateDirect(input: string, sourceLocale: string, targetLocale: string): string {
  const mapping = getDirectMapping(sourceLocale, targetLocale);
  if (!mapping) {
    // Fallback to pivot translation
    return toLocale(toEnglish(input, sourceLocale), targetLocale);
  }

  // Tokenize input
  const tokens = input.split(/\s+/);

  // Translate each token using direct mapping
  const translated = tokens.map(token => {
    // Preserve CSS selectors and literals
    if (token.startsWith('#') || token.startsWith('.') || token.startsWith('@')) {
      return token;
    }
    if (token.startsWith('"') || token.startsWith("'")) {
      return token;
    }

    // Look up in direct mapping
    const directTranslation = mapping.words[token];
    if (directTranslation) {
      return directTranslation;
    }

    // Check for suffix-attached tokens (e.g., "#count-ta" in Quechua)
    const suffixMatch = token.match(/^(.+?)(-.+)$/);
    if (suffixMatch) {
      const [, base, suffix] = suffixMatch;
      const translatedBase = mapping.words[base] || base;
      return translatedBase + suffix;
    }

    // Return unchanged if no mapping found
    return token;
  });

  return translated.join(' ');
}

// =============================================================================
// Examples (for testing)
// =============================================================================

export const examples = {
  english: {
    eventHandler: 'on click increment #count',
    putInto: 'put my value into #output',
    toggle: 'toggle .active',
    wait: 'wait 2 seconds',
  },

  // Expected outputs (approximate, for reference)
  japanese: {
    eventHandler: '#count を クリック で 増加',
    putInto: '私の 値 を #output に 置く',
    toggle: '.active を 切り替え',
    wait: '2秒 待つ',
  },

  chinese: {
    eventHandler: '当 点击 时 增加 #count',
    putInto: '把 我的值 放 到 #output',
    toggle: '切换 .active',
    wait: '等待 2秒',
  },

  arabic: {
    eventHandler: 'زِد #count عند النقر',
    putInto: 'ضع قيمتي في #output',
    toggle: 'بدّل .active',
    wait: 'انتظر ثانيتين',
  },
};
