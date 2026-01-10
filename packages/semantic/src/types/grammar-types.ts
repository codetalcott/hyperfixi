/**
 * Grammar Types for Semantic Multilingual Parsing
 *
 * These types define the semantic role system used across all 13 supported languages.
 * Originally from @hyperfixi/i18n, now consolidated here for package independence.
 *
 * Key Linguistic Concepts:
 * - Word Order: SVO, SOV, VSO (and variations)
 * - Adposition Type: Preposition (English) vs Postposition (Japanese/Korean)
 * - Morphology: Isolating (Chinese) vs Agglutinative (Turkish) vs Fusional (Arabic)
 * - Text Direction: LTR vs RTL
 */

// =============================================================================
// Core Types
// =============================================================================

/**
 * Semantic roles in hyperscript commands.
 * These are universal across all 13 supported languages - only the surface form changes.
 *
 * ## Core Thematic Roles (from linguistic theory)
 * | Role        | Usage | Purpose                     | Example                   |
 * |-------------|-------|-----------------------------|---------------------------|
 * | action      | 100%  | Command verb                | toggle, put, fetch        |
 * | patient     | 90%   | What is acted upon          | .active, #count           |
 * | destination | 40%   | Where something goes        | into #output, to .class   |
 * | source      | 13%   | Where something comes from  | from #input, from URL     |
 * | event       | 106%  | Trigger events              | click, keydown, submit    |
 * | condition   | 8%    | Boolean expressions         | if x > 5, when visible    |
 * | agent       | 0%    | Who performs action         | Reserved for future use   |
 * | goal        | 1%    | Target value/state          | to 'red' (in transition)  |
 *
 * ## Quantitative Roles (answer "how much/long")
 * | Role     | Usage | Purpose        | Example              |
 * |----------|-------|----------------|----------------------|
 * | quantity | 7%    | Numeric amount | by 5, 3 times        |
 * | duration | 1%    | Time span      | for 5 seconds, 500ms |
 *
 * ## Adverbial/Modifier Roles (answer "how/by what means")
 * | Role         | Usage | Purpose                   | Example           |
 * |--------------|-------|---------------------------|-------------------|
 * | style        | 2%    | Animation/behavior        | with fade         |
 * | manner       | 2%    | Insertion position        | before, after     |
 * | method       | 1%    | HTTP method/technique     | via POST, as GET  |
 * | responseType | 1%    | Response format           | as json, as html  |
 *
 * ## Control Flow Roles
 * | Role     | Usage | Purpose      | Example               |
 * |----------|-------|--------------|-----------------------|
 * | loopType | 6%    | Loop variant | forever, until, times |
 *
 * ## Design Notes
 * - Low-usage roles (agent, goal, method, responseType) are intentionally kept for:
 *   - Linguistic completeness across all 13 languages
 *   - Future extensibility (AI agents, server-side execution)
 *   - Command-specific semantics (fetch, transition)
 * - Each role has distinct grammatical markers per language (see profiles/index.ts)
 * - Usage percentages based on pattern database analysis
 */
export type SemanticRole =
  // Core thematic roles
  | 'action'       // The command/verb (increment, put, toggle)
  | 'agent'        // Who/what performs action (reserved for future: AI agents, server-side)
  | 'patient'      // What is acted upon (the counter, .active)
  | 'source'       // Origin (from #input, from URL)
  | 'destination'  // Target location (into #output, to .class)
  | 'goal'         // Target value/state (to 'red', to 100)
  | 'event'        // Trigger (click, input, keydown)
  | 'condition'    // Boolean expression (if x > 5)
  // Quantitative roles
  | 'quantity'     // Numeric amount (by 5, 3 times)
  | 'duration'     // Time span (for 5 seconds, over 500ms)
  // Adverbial roles
  | 'responseType' // Response format (as json, as text, as html)
  | 'method'       // HTTP method/technique (via POST, using GET)
  | 'style'        // Visual/behavioral manner (with fade, smoothly)
  | 'manner'       // Insertion position (before, after)
  // Control flow roles
  | 'loopType'     // Loop variant: forever, times, for, while, until, until-event
  // Structural roles (for parser control)
  | 'continues';   // Continuation marker (then-chains)

/**
 * Word order patterns
 * These represent the major typological categories
 */
export type WordOrder = 'SVO' | 'SOV' | 'VSO' | 'VOS' | 'OVS' | 'OSV' | 'free';

/**
 * Where grammatical markers appear relative to their noun/verb
 */
export type AdpositionType = 'preposition' | 'postposition' | 'circumposition' | 'none';

/**
 * Morphological typology - how words are constructed
 */
export type MorphologyType =
  | 'isolating'      // Chinese - no inflection, word order matters
  | 'agglutinative'  // Turkish, Japanese - morphemes stack predictably
  | 'fusional'       // Arabic, Spanish - morphemes blend together
  | 'polysynthetic'; // Quechua - complex words encode full sentences

/**
 * A grammatical marker (particle, case ending, preposition)
 */
export interface GrammaticalMarker {
  form: string;              // The actual text (を, に, to, 的)
  role: SemanticRole;        // What semantic role it marks
  position: AdpositionType;  // Where it appears
  required: boolean;         // Is it mandatory?
  alternatives?: string[];   // Alternative forms (e.g., 을/를 in Korean)
}

// =============================================================================
// Language Profile
// =============================================================================

/**
 * Complete grammatical profile for a language
 * This captures the essential typological features needed for transformation
 */
export interface LanguageProfile {
  code: string;           // ISO 639-1 code
  name: string;           // Native name

  // Typological features
  wordOrder: WordOrder;
  adpositionType: AdpositionType;
  morphology: MorphologyType;
  direction: 'ltr' | 'rtl';

  // Grammatical markers for each semantic role
  markers: GrammaticalMarker[];

  // Role ordering - which semantic roles come in what order
  // E.g., Japanese: ['patient', 'source', 'destination', 'action']
  // E.g., English: ['action', 'patient', 'source', 'destination']
  canonicalOrder: SemanticRole[];

  // Special rules
  rules?: GrammarRule[];
}

/**
 * Pattern for transforming hyperscript structures
 */
export interface GrammarRule {
  name: string;
  description: string;

  // Pattern matching (in canonical English form)
  match: PatternMatcher;

  // How to transform for this language
  transform: PatternTransform;

  // Priority (higher = checked first)
  priority: number;
}

/**
 * Matches a hyperscript pattern
 */
export interface PatternMatcher {
  // Command type(s) this matches
  commands?: string[];

  // Required semantic roles
  requiredRoles: SemanticRole[];

  // Optional roles
  optionalRoles?: SemanticRole[];

  // Custom predicate for complex matching
  predicate?: (parsed: ParsedStatement) => boolean;
}

/**
 * Defines how to transform a matched pattern
 */
export interface PatternTransform {
  // Reorder roles for target language
  roleOrder: SemanticRole[];

  // Insert markers between roles
  insertMarkers?: boolean;

  // Custom transformation function
  custom?: (parsed: ParsedStatement, profile: LanguageProfile) => string;
}

// =============================================================================
// Parsed Structures
// =============================================================================

/**
 * A parsed hyperscript statement broken into semantic components
 */
export interface ParsedStatement {
  type: 'event-handler' | 'command' | 'conditional' | 'loop';
  roles: Map<SemanticRole, ParsedElement>;
  original: string;
}

/**
 * A single element with its semantic role
 */
export interface ParsedElement {
  role: SemanticRole;
  value: string;           // Original English value
  translated?: string;     // Translated value
  isSelector?: boolean;    // CSS selector (don't translate)
  isLiteral?: boolean;     // Literal value (don't translate)
}

// =============================================================================
// Universal Pattern Templates
// =============================================================================

/**
 * Universal templates for common hyperscript patterns
 * These define the semantic structure independent of surface form
 */
export const UNIVERSAL_PATTERNS = {
  // on click increment #count
  eventIncrement: {
    name: 'event-increment',
    roles: ['event', 'action', 'patient'] as SemanticRole[],
    english: 'on {event} {action} {patient}',
  },

  // put X into Y
  putInto: {
    name: 'put-into',
    roles: ['action', 'patient', 'destination'] as SemanticRole[],
    english: '{action} {patient} into {destination}',
  },

  // add .class to element
  addTo: {
    name: 'add-to',
    roles: ['action', 'patient', 'destination'] as SemanticRole[],
    english: '{action} {patient} to {destination}',
  },

  // toggle .class on element
  toggleOn: {
    name: 'toggle-on',
    roles: ['action', 'patient', 'destination'] as SemanticRole[],
    english: '{action} {patient} on {destination}',
  },

  // wait 2 seconds
  waitDuration: {
    name: 'wait-duration',
    roles: ['action', 'quantity'] as SemanticRole[],
    english: '{action} {quantity}',
  },

  // if condition then ... end
  conditional: {
    name: 'conditional',
    roles: ['action', 'condition'] as SemanticRole[],
    english: '{action} {condition} then ... end',
  },

  // fetch URL as type
  fetchAs: {
    name: 'fetch-as',
    roles: ['action', 'source', 'method'] as SemanticRole[],
    english: '{action} {source} as {method}',
  },

  // show element with animation
  showWith: {
    name: 'show-with',
    roles: ['action', 'patient', 'style'] as SemanticRole[],
    english: '{action} {patient} with {style}',
  },

  // transition property over duration
  transitionOver: {
    name: 'transition-over',
    roles: ['action', 'patient', 'duration'] as SemanticRole[],
    english: '{action} {patient} over {duration}',
  },
} as const;

// =============================================================================
// Language Family Defaults
// =============================================================================

/**
 * Default profiles for major language families
 * Individual languages inherit and override these
 */
export const LANGUAGE_FAMILY_DEFAULTS: Record<string, Partial<LanguageProfile>> = {
  // Germanic (English, German, Dutch)
  germanic: {
    wordOrder: 'SVO',
    adpositionType: 'preposition',
    morphology: 'fusional',
    direction: 'ltr',
    canonicalOrder: ['action', 'patient', 'source', 'destination', 'quantity', 'duration', 'method', 'style'],
  },

  // Romance (Spanish, French, Italian, Portuguese)
  romance: {
    wordOrder: 'SVO',
    adpositionType: 'preposition',
    morphology: 'fusional',
    direction: 'ltr',
    canonicalOrder: ['action', 'patient', 'source', 'destination', 'quantity', 'duration', 'method', 'style'],
  },

  // Japonic (Japanese)
  japonic: {
    wordOrder: 'SOV',
    adpositionType: 'postposition',
    morphology: 'agglutinative',
    direction: 'ltr',
    canonicalOrder: ['patient', 'source', 'destination', 'quantity', 'duration', 'method', 'style', 'action'],
  },

  // Koreanic (Korean)
  koreanic: {
    wordOrder: 'SOV',
    adpositionType: 'postposition',
    morphology: 'agglutinative',
    direction: 'ltr',
    canonicalOrder: ['patient', 'source', 'destination', 'quantity', 'duration', 'method', 'style', 'action'],
  },

  // Turkic (Turkish, Azerbaijani)
  turkic: {
    wordOrder: 'SOV',
    adpositionType: 'postposition',
    morphology: 'agglutinative',
    direction: 'ltr',
    canonicalOrder: ['patient', 'source', 'destination', 'quantity', 'duration', 'method', 'style', 'action'],
  },

  // Sinitic (Chinese, Cantonese)
  sinitic: {
    wordOrder: 'SVO',  // Topic-prominent, flexible
    adpositionType: 'preposition',
    morphology: 'isolating',
    direction: 'ltr',
    canonicalOrder: ['action', 'patient', 'source', 'destination', 'quantity', 'duration', 'method', 'style'],
  },

  // Semitic (Arabic, Hebrew)
  semitic: {
    wordOrder: 'VSO',
    adpositionType: 'preposition',
    morphology: 'fusional',  // Root-pattern system
    direction: 'rtl',
    canonicalOrder: ['action', 'agent', 'patient', 'destination', 'source', 'quantity', 'duration', 'method', 'style'],
  },

  // Austronesian (Indonesian, Tagalog)
  austronesian: {
    wordOrder: 'SVO',
    adpositionType: 'preposition',
    morphology: 'agglutinative',
    direction: 'ltr',
    canonicalOrder: ['action', 'patient', 'source', 'destination', 'quantity', 'duration', 'method', 'style'],
  },

  // Quechuan (Quechua)
  quechuan: {
    wordOrder: 'SOV',
    adpositionType: 'postposition',
    morphology: 'agglutinative',  // Actually polysynthetic but simplified
    direction: 'ltr',
    canonicalOrder: ['patient', 'source', 'destination', 'quantity', 'duration', 'method', 'style', 'action'],
  },

  // Bantu (Swahili)
  bantu: {
    wordOrder: 'SVO',
    adpositionType: 'preposition',
    morphology: 'agglutinative',
    direction: 'ltr',
    canonicalOrder: ['action', 'patient', 'source', 'destination', 'quantity', 'duration', 'method', 'style'],
  },
};

// =============================================================================
// Transformation Utilities
// =============================================================================

/**
 * Reorder semantic roles according to target language.
 * Includes a safety net to append any roles present in input
 * but missing from the target order, preventing data loss.
 */
export function reorderRoles(
  roles: Map<SemanticRole, ParsedElement>,
  targetOrder: SemanticRole[]
): ParsedElement[] {
  const result: ParsedElement[] = [];
  const usedRoles = new Set<SemanticRole>();

  // 1. Add roles that are explicitly in the canonical order
  for (const role of targetOrder) {
    const element = roles.get(role);
    if (element) {
      result.push(element);
      usedRoles.add(role);
    }
  }

  // 2. Safety Net: Append any roles present in input but missing from target order
  // This prevents data loss (e.g., if 'manner' or 'instrument' isn't in the profile)
  for (const [role, element] of roles) {
    if (!usedRoles.has(role)) {
      result.push(element);
    }
  }

  return result;
}

/**
 * Insert grammatical markers between elements
 */
export function insertMarkers(
  elements: ParsedElement[],
  markers: GrammaticalMarker[],
  adpositionType: AdpositionType
): string[] {
  const result: string[] = [];

  for (const element of elements) {
    const marker = markers.find(m => m.role === element.role);

    if (marker) {
      if (adpositionType === 'preposition') {
        // Marker before element: "to element"
        if (marker.form) result.push(marker.form);
        result.push(element.translated || element.value);
      } else if (adpositionType === 'postposition') {
        // Marker after element: "element を"
        result.push(element.translated || element.value);
        if (marker.form) result.push(marker.form);
      } else {
        result.push(element.translated || element.value);
      }
    } else {
      result.push(element.translated || element.value);
    }
  }

  return result;
}

/**
 * Intelligently joins tokens, handling agglutinative suffixes and prefixes.
 *
 * Rules:
 * 1. If a token ends with '-' (prefix marker), no space after it
 * 2. If a token starts with '-' (suffix marker), no space before it
 * 3. Removes the hyphen indicators from the final output
 *
 * Examples:
 * - ['#count', '-ta'] → '#countta' (Quechua accusative suffix)
 * - ['بـ-', 'الماوس'] → 'بـالماوس' (Arabic prefix attachment)
 * - ['value', 'を'] → 'value を' (Japanese particle, normal spacing)
 */
export function joinTokens(tokens: string[]): string {
  if (tokens.length === 0) return '';

  let result = '';

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const nextToken = tokens[i + 1];

    // Check if current token is a prefix (ends with -)
    const isPrefix = token.endsWith('-');
    // Check if current token is a suffix (starts with -)
    const isSuffix = token.startsWith('-');

    // Get the display form (strip hyphen markers)
    let displayToken = token;
    if (isPrefix) displayToken = token.slice(0, -1);
    if (isSuffix) displayToken = token.substring(1);

    result += displayToken;

    // Determine if we need a space before the next token
    if (nextToken) {
      const nextIsSuffix = nextToken.startsWith('-');

      // Don't add space if:
      // - Current token is a prefix (ends with -)
      // - Next token is a suffix (starts with -)
      if (!isPrefix && !nextIsSuffix) {
        result += ' ';
      }
    }
  }

  return result;
}

/**
 * Transform a parsed statement to target language
 */
export function transformStatement(
  parsed: ParsedStatement,
  _sourceProfile: LanguageProfile,
  targetProfile: LanguageProfile
): string {
  // 1. Reorder roles for target language
  const reordered = reorderRoles(parsed.roles, targetProfile.canonicalOrder);

  // 2. Insert grammatical markers
  const withMarkers = insertMarkers(
    reordered,
    targetProfile.markers,
    targetProfile.adpositionType
  );

  // 3. Join with intelligent spacing for agglutinative languages
  // (handles suffixes like -ta, prefixes like بـ-, etc.)
  return joinTokens(withMarkers);
}
