/**
 * Learn Code Generator — The Inverted Generator
 *
 * Unlike domain-sql (natural language → SQL), this generator produces
 * natural language sentences WITH morphology applied as its "compiled output".
 *
 * The standard CodeGenerator.generate() interface returns the commanding form
 * in English. The extended generateForFunction() method produces sentences in
 * any language × communicative function combination.
 */

import type { SemanticNode, CodeGenerator } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';
import type {
  CommunicativeFunction,
  RenderedSentence,
  CommandProfile,
  LearnLanguageProfile,
  AnyForms,
  CoreVerb,
  SemanticRole,
} from '../types';

// ─── Command Profiles (derived from schemas) ────────────────────

const COMMAND_PROFILES: Record<string, CommandProfile> = {
  add: { verb: 'add', valence: 'ditransitive', targetRole: 'destination', hasPatient: true },
  remove: { verb: 'remove', valence: 'ditransitive', targetRole: 'source', hasPatient: true },
  toggle: { verb: 'toggle', valence: 'ditransitive', targetRole: 'destination', hasPatient: true },
  put: { verb: 'put', valence: 'ditransitive', targetRole: 'destination', hasPatient: true },
  set: { verb: 'set', valence: 'ditransitive', targetRole: 'destination', hasPatient: true },
  show: { verb: 'show', valence: 'transitive', targetRole: null, hasPatient: true },
  hide: { verb: 'hide', valence: 'transitive', targetRole: null, hasPatient: true },
  get: { verb: 'get', valence: 'transitive', targetRole: 'source', hasPatient: false },
  wait: { verb: 'wait', valence: 'transitive', targetRole: null, hasPatient: true },
  fetch: { verb: 'fetch', valence: 'transitive', targetRole: 'source', hasPatient: false },
  send: { verb: 'send', valence: 'ditransitive', targetRole: 'destination', hasPatient: true },
  go: { verb: 'go', valence: 'transitive', targetRole: 'destination', hasPatient: false },
  increment: { verb: 'increment', valence: 'transitive', targetRole: null, hasPatient: true },
  decrement: { verb: 'decrement', valence: 'transitive', targetRole: null, hasPatient: true },
  take: { verb: 'take', valence: 'ditransitive', targetRole: 'source', hasPatient: true },
};

// ─── Marker Resolution ──────────────────────────────────────────

export interface ResolvedMarker {
  marker: string;
  position: 'before' | 'after';
}

const EMPTY_MARKER: ResolvedMarker = { marker: '', position: 'before' };

/**
 * Collapsed marker lookup — pre-resolved from the 5-tier system.
 * Structure: MARKERS[verb][role][language] = marker string
 *
 * This is the flattened result of:
 *   Tier 1: renderOverride
 *   Tier 2: markerOverride
 *   Tier 3: LEARNING_OVERRIDES
 *   Tier 4: LANGUAGE_RENDERING_OVERRIDES
 *   Tier 5: profile defaults
 */
const MARKERS: Record<string, Record<string, Record<string, string>>> = {
  add: {
    patient: {
      en: '',
      ja: 'を',
      es: '',
      ar: '',
      zh: '',
      ko: '을',
      fr: '',
      tr: 'i',
      de: '',
      pt: '',
    },
    destination: {
      en: 'to',
      ja: 'に',
      es: 'a',
      ar: 'إلى',
      zh: '到',
      ko: '에',
      fr: 'à',
      tr: 'a',
      de: 'zu',
      pt: 'a',
    },
  },
  remove: {
    patient: {
      en: '',
      ja: 'を',
      es: '',
      ar: '',
      zh: '',
      ko: '을',
      fr: '',
      tr: 'i',
      de: '',
      pt: '',
    },
    source: {
      en: 'from',
      ja: 'から',
      es: 'de',
      ar: 'من',
      zh: '从',
      ko: '에서',
      fr: 'de',
      tr: 'dan',
      de: 'von',
      pt: 'de',
    },
  },
  toggle: {
    patient: {
      en: '',
      ja: 'を',
      es: '',
      ar: '',
      zh: '',
      ko: '을',
      fr: '',
      tr: 'i',
      de: '',
      pt: '',
    },
    destination: {
      en: 'on',
      ja: 'に',
      es: 'en',
      ar: 'على',
      zh: '在',
      ko: '에',
      fr: 'sur',
      tr: 'a',
      de: 'auf',
      pt: 'em',
    },
  },
  put: {
    patient: {
      en: '',
      ja: 'を',
      es: '',
      ar: '',
      zh: '',
      ko: '을',
      fr: '',
      tr: 'i',
      de: '',
      pt: '',
    },
    destination: {
      en: 'into',
      ja: 'に',
      es: 'en',
      ar: 'في',
      zh: '到',
      ko: '에',
      fr: 'dans',
      tr: 'a',
      de: 'in',
      pt: 'em',
    },
  },
  set: {
    destination: {
      en: '',
      ja: 'を',
      es: 'en',
      ar: '',
      zh: '在',
      ko: '를',
      fr: 'sur',
      tr: 'i',
      de: 'auf',
      pt: 'em',
    },
    patient: {
      en: 'to',
      ja: 'に',
      es: 'a',
      ar: 'إلى',
      zh: '',
      ko: '으로',
      fr: 'à',
      tr: 'e',
      de: 'auf',
      pt: 'para',
    },
  },
  show: {
    patient: {
      en: '',
      ja: 'を',
      es: '',
      ar: '',
      zh: '',
      ko: '을',
      fr: '',
      tr: 'i',
      de: '',
      pt: '',
    },
  },
  hide: {
    patient: {
      en: '',
      ja: 'を',
      es: '',
      ar: '',
      zh: '',
      ko: '을',
      fr: '',
      tr: 'i',
      de: '',
      pt: '',
    },
  },
  get: {
    source: {
      en: '',
      ja: 'を',
      es: '',
      ar: 'على',
      zh: '',
      ko: '를',
      fr: '',
      tr: 'i',
      de: '',
      pt: '',
    },
  },
  wait: {
    patient: {
      en: '',
      ja: 'を',
      es: '',
      ar: '',
      zh: '',
      ko: '을',
      fr: '',
      tr: 'i',
      de: '',
      pt: '',
    },
  },
  fetch: {
    source: {
      en: '',
      ja: 'から',
      es: 'de',
      ar: 'من',
      zh: '从',
      ko: '에서',
      fr: 'de',
      tr: 'dan',
      de: 'von',
      pt: 'de',
    },
  },
  send: {
    patient: {
      en: '',
      ja: 'を',
      es: '',
      ar: '',
      zh: '',
      ko: '을',
      fr: '',
      tr: 'i',
      de: '',
      pt: '',
    },
    destination: {
      en: 'to',
      ja: 'に',
      es: 'a',
      ar: 'إلى',
      zh: '到',
      ko: '에게',
      fr: 'à',
      tr: '-e',
      de: 'an',
      pt: 'para',
    },
  },
  go: {
    destination: {
      en: '',
      ja: 'に',
      es: 'a',
      ar: 'إلى',
      zh: '',
      ko: '에',
      fr: 'à',
      tr: 'a',
      de: 'zu',
      pt: 'para',
    },
  },
  increment: {
    patient: {
      en: '',
      ja: 'を',
      es: '',
      ar: '',
      zh: '',
      ko: '을',
      fr: '',
      tr: 'i',
      de: '',
      pt: '',
    },
  },
  decrement: {
    patient: {
      en: '',
      ja: 'を',
      es: '',
      ar: '',
      zh: '',
      ko: '을',
      fr: '',
      tr: 'i',
      de: '',
      pt: '',
    },
  },
  take: {
    patient: {
      en: '',
      ja: 'を',
      es: '',
      ar: '',
      zh: '',
      ko: '을',
      fr: '',
      tr: 'i',
      de: '',
      pt: '',
    },
    source: {
      en: 'from',
      ja: 'から',
      es: 'de',
      ar: 'من',
      zh: '从',
      ko: '에서',
      fr: 'de',
      tr: 'dan',
      de: 'von',
      pt: 'de',
    },
  },
};

/** Languages where particles follow nouns (no space) — postpositional */
const POSTPOSITIONAL = new Set(['ja', 'ko', 'tr']);

export function resolveMarker(verb: string, role: string, language: string): ResolvedMarker {
  const marker = MARKERS[verb]?.[role]?.[language];
  if (marker === undefined) return EMPTY_MARKER;
  const position = POSTPOSITIONAL.has(language) ? 'after' : 'before';
  return { marker, position };
}

export function attachMarker(value: string, resolved: ResolvedMarker): string {
  if (!resolved.marker) return value;
  if (resolved.position === 'before') return `${resolved.marker} ${value}`;
  return `${value}${resolved.marker}`;
}

// ─── Form Resolution ────────────────────────────────────────────

function resolveFormPath(forms: AnyForms, path: string): string {
  const parts = path.split('.');
  let current: unknown = forms;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return `[${path}?]`;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : `[${path}?]`;
}

// ─── Sentence Generator ─────────────────────────────────────────

/** Registry of language profiles — populated by registerProfile() */
const profileRegistry: Record<string, LearnLanguageProfile> = {};

export function registerProfile(code: string, profile: LearnLanguageProfile): void {
  profileRegistry[code] = profile;
}

export function getProfile(code: string): LearnLanguageProfile | undefined {
  return profileRegistry[code];
}

/**
 * Generate a sentence for a SemanticNode in a specific language and
 * communicative function.
 */
export function generateForFunction(
  node: SemanticNode,
  fn: CommunicativeFunction,
  language: string
): RenderedSentence | null {
  const profile = profileRegistry[language];
  if (!profile) return null;

  const verb = node.action as CoreVerb;
  const forms = profile.morphologyTable[verb];
  if (!forms) return null;

  const frame = profile.frames.frames.find(f => f.function === fn);
  if (!frame) return null;

  const verbValue = resolveFormPath(forms, frame.verbForm);
  const subject = profile.defaultSubject;
  const cmdProfile = COMMAND_PROFILES[verb];

  // Extract patient/target from SemanticNode roles
  const patientValue = extractRoleValue(node, 'patient') || '';
  const targetRole = cmdProfile?.targetRole;

  // For verbs like get/fetch/go, the primary value is in source/destination
  let targetValue = '';
  if (targetRole) {
    targetValue = extractRoleValue(node, targetRole) || '';
  }

  // Build patient string with marker
  let patientStr = '';
  if (patientValue && cmdProfile?.hasPatient) {
    const patientMarker = resolveMarker(verb, 'patient', language);
    patientStr = attachMarker(patientValue, patientMarker);
  }

  // Build target string with marker
  let targetStr = '';
  if (targetValue && targetRole) {
    const targetMarker = resolveMarker(verb, targetRole, language);
    targetStr = attachMarker(targetValue, targetMarker);
  }

  let sentence = frame.template
    .replace(/\{subject\}/g, subject)
    .replace(/\{patient\}/g, patientStr)
    .replace(/\{target\}/g, targetStr);

  // Replace verb form references: {verb.base}, {verb.present.el}, etc.
  sentence = sentence.replace(/\{verb\.([^}]+)\}/g, (_match, path: string) => {
    return resolveFormPath(forms, path);
  });

  // Clean up extra spaces
  sentence = sentence.replace(/\s+/g, ' ').trim();

  return {
    language,
    function: fn,
    sentence,
    verbForm: frame.verbForm,
    verbValue,
  };
}

/**
 * Standard CodeGenerator interface — returns the commanding form in English.
 * This satisfies the framework's CodeGenerator contract.
 */
export const learnCodeGenerator: CodeGenerator = {
  generate(node: SemanticNode): string {
    const result = generateForFunction(node, 'commanding', 'en');
    return result?.sentence ?? `[${node.action}]`;
  },
};

// ─── Convenience Functions ──────────────────────────────────────

/** Render across all communicative functions for a language */
export function generateAllFunctions(node: SemanticNode, language: string): RenderedSentence[] {
  const profile = profileRegistry[language];
  if (!profile) return [];
  return profile.frames.frames
    .map(f => generateForFunction(node, f.function, language))
    .filter((r): r is RenderedSentence => r !== null);
}

/** Render across all registered languages for a single function */
export function generateCrossLingual(
  node: SemanticNode,
  fn: CommunicativeFunction
): RenderedSentence[] {
  return Object.keys(profileRegistry)
    .map(lang => generateForFunction(node, fn, lang))
    .filter((r): r is RenderedSentence => r !== null);
}
