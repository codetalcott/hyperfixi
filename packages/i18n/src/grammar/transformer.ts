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
} from './types';
import { reorderRoles, insertMarkers } from './types';
import { getProfile, profiles } from './profiles';
import { hasDirectMapping, getDirectMapping } from './direct-mappings';
import { dictionaries } from '../dictionaries';
import { findInDictionary, translateFromEnglish } from '../types';
import {
  ENGLISH_MODIFIER_ROLES,
  CONDITIONAL_KEYWORDS,
  THEN_KEYWORDS,
} from '../constants';

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
export function parseStatement(
  input: string,
  sourceLocale: string = 'en'
): ParsedStatement | null {
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

    // Split on whitespace unless in selector
    if (/\s/.test(char) && !inSelector) {
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
 * Pattern: on {event} {command} {target?}
 */
function parseEventHandler(tokens: string[], _profile: LanguageProfile): ParsedStatement {
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

  // Next token is typically the action
  if (tokens[startIndex]) {
    roles.set('action', {
      role: 'action',
      value: tokens[startIndex],
    });
    startIndex++;
  }

  // Remaining tokens are the patient (target)
  if (tokens[startIndex]) {
    const patientValue = tokens.slice(startIndex).join(' ');
    roles.set('patient', {
      role: 'patient',
      value: patientValue,
      isSelector: /^[#.<@]/.test(patientValue),
    });
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
function translateWord(
  word: string,
  sourceLocale: string,
  targetLocale: string
): string {
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
 * Translate all elements in a parsed statement
 */
function translateElements(
  parsed: ParsedStatement,
  sourceLocale: string,
  targetLocale: string
): void {
  for (const [_role, element] of parsed.roles) {
    if (!element.isSelector && !element.isLiteral) {
      element.translated = translateWord(element.value, sourceLocale, targetLocale);
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
   * Transform a hyperscript statement from source to target language
   */
  transform(input: string): string {
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
      return result.join(' ');
    }

    // 7. Join without markers
    return reordered.map(e => e.translated || e.value).join(' ');
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
  const translated = tokens.map((token) => {
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
