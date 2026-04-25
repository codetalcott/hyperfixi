/**
 * Learn Domain Command Schemas
 *
 * 15 core verbs formalized as CommandSchemas using the framework's
 * defineCommand/defineRole helpers. Each schema defines the semantic
 * roles and per-language marker overrides for sentence rendering.
 *
 * Role markers are the RESOLVED values combining:
 *   - @lokascript/semantic schema markerOverrides (Tiers 1-2)
 *   - lokascript-learn LEARNING_OVERRIDES (Tier 3)
 *   - LANGUAGE_RENDERING_OVERRIDES (Tier 4)
 *   - Profile defaults (Tier 5)
 *
 * This collapses the 5-tier resolution into flat markerOverride maps.
 */

import { defineCommand, defineRole } from '@lokascript/framework';

// ─── Markers used across multiple verbs ─────────────────────────

/** Destination markers: "to" / allative */
const DEST_TO = {
  en: 'to',
  ja: '',
  es: 'a',
  ar: 'إلى',
  zh: '到',
  ko: '에',
  fr: 'à',
  tr: 'a',
  de: 'zu',
  pt: 'a',
};

/** Destination markers: "into" / illative */
const DEST_INTO = {
  en: 'into',
  ja: '',
  es: 'en',
  ar: 'في',
  zh: '到',
  ko: '에',
  fr: 'dans',
  tr: 'a',
  de: 'in',
  pt: 'em',
};

/** Destination markers: "on" / locative (default profile) */
const DEST_ON = {
  en: 'on',
  ja: '',
  es: 'en',
  ar: 'على',
  zh: '在',
  ko: '에',
  fr: 'sur',
  tr: 'da',
  de: 'auf',
  pt: 'em',
};

/** Source markers: "from" / ablative */
const SOURCE_FROM = {
  en: 'from',
  ja: '',
  es: 'de',
  ar: 'من',
  zh: '从',
  ko: '에서',
  fr: 'de',
  tr: 'dan',
  de: 'von',
  pt: 'de',
};

/** Patient markers: empty for SVO, particles for SOV */
const PATIENT = {
  en: '',
  ja: '',
  es: '',
  ar: '',
  zh: '',
  ko: '',
  fr: '',
  tr: '',
  de: '',
  pt: '',
};

// =============================================================================
// add — ditransitive: patient + destination (to)
// =============================================================================

export const addSchema = defineCommand({
  action: 'add',
  description: 'Add a class or attribute to an element',
  category: 'mutation',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'The class or attribute to add',
      required: true,
      expectedTypes: ['selector', 'literal', 'expression'],
      svoPosition: 3,
      sovPosition: 1,
      markerOverride: PATIENT,
    }),
    defineRole({
      role: 'destination',
      description: 'The target element',
      required: false,
      expectedTypes: ['selector', 'reference', 'expression'],
      svoPosition: 2,
      sovPosition: 2,
      markerOverride: DEST_TO,
    }),
  ],
});

// =============================================================================
// remove — ditransitive: patient + source (from)
// =============================================================================

export const removeSchema = defineCommand({
  action: 'remove',
  description: 'Remove a class or attribute from an element',
  category: 'mutation',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'The class or attribute to remove',
      required: true,
      expectedTypes: ['selector', 'literal', 'expression'],
      svoPosition: 3,
      sovPosition: 1,
      markerOverride: PATIENT,
    }),
    defineRole({
      role: 'source',
      description: 'The element to remove from',
      required: false,
      expectedTypes: ['selector', 'reference', 'expression'],
      svoPosition: 2,
      sovPosition: 2,
      markerOverride: SOURCE_FROM,
    }),
  ],
});

// =============================================================================
// toggle — ditransitive: patient + destination (on)
// =============================================================================

export const toggleSchema = defineCommand({
  action: 'toggle',
  description: 'Toggle a class or attribute on an element',
  category: 'mutation',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'The class or attribute to toggle',
      required: true,
      expectedTypes: ['selector', 'literal', 'expression'],
      svoPosition: 3,
      sovPosition: 1,
      markerOverride: PATIENT,
    }),
    defineRole({
      role: 'destination',
      description: 'The target element',
      required: false,
      expectedTypes: ['selector', 'reference', 'expression'],
      svoPosition: 2,
      sovPosition: 2,
      markerOverride: DEST_ON,
    }),
  ],
});

// =============================================================================
// put — ditransitive: patient + destination (into)
// =============================================================================

export const putSchema = defineCommand({
  action: 'put',
  description: 'Put content into a target element',
  category: 'mutation',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'The content to put',
      required: true,
      expectedTypes: ['literal', 'selector', 'reference', 'expression'],
      svoPosition: 3,
      sovPosition: 1,
      markerOverride: PATIENT,
    }),
    defineRole({
      role: 'destination',
      description: 'Where to put the content',
      required: false,
      expectedTypes: ['selector', 'reference', 'expression'],
      svoPosition: 2,
      sovPosition: 2,
      markerOverride: DEST_INTO,
    }),
  ],
});

// =============================================================================
// set — ditransitive: destination (the property) + patient (the value)
// Note: set has swapped primary role — destination comes first
// =============================================================================

export const setSchema = defineCommand({
  action: 'set',
  description: 'Set a property or variable to a value',
  category: 'variable',
  primaryRole: 'destination',
  roles: [
    defineRole({
      role: 'destination',
      description: 'The property to set',
      required: true,
      expectedTypes: ['selector', 'reference', 'expression'],
      svoPosition: 3,
      sovPosition: 1,
      markerOverride: {
        en: '',
        ja: 'を',
        es: '',
        ar: '',
        zh: '',
        ko: '를',
        fr: '',
        tr: '',
        de: '',
        pt: '',
      },
    }),
    defineRole({
      role: 'patient',
      description: 'The value to set',
      required: true,
      expectedTypes: ['literal', 'expression', 'reference'],
      svoPosition: 2,
      sovPosition: 2,
      markerOverride: {
        en: 'to',
        ja: 'に',
        es: 'a',
        ar: 'إلى',
        zh: '到',
        ko: '으로',
        fr: 'à',
        tr: 'e',
        de: 'auf',
        pt: 'para',
      },
    }),
  ],
});

// =============================================================================
// show — transitive: patient only
// =============================================================================

export const showSchema = defineCommand({
  action: 'show',
  description: 'Show an element',
  category: 'visibility',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'The element to show',
      required: true,
      expectedTypes: ['selector', 'reference', 'expression'],
      svoPosition: 2,
      sovPosition: 1,
      markerOverride: PATIENT,
    }),
  ],
});

// =============================================================================
// hide — transitive: patient only
// =============================================================================

export const hideSchema = defineCommand({
  action: 'hide',
  description: 'Hide an element',
  category: 'visibility',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'The element to hide',
      required: true,
      expectedTypes: ['selector', 'reference', 'expression'],
      svoPosition: 2,
      sovPosition: 1,
      markerOverride: PATIENT,
    }),
  ],
});

// =============================================================================
// get — transitive: source (what to get)
// Note: get has no patient; source is the primary role
// =============================================================================

export const getSchema = defineCommand({
  action: 'get',
  description: 'Get a value from an element or property',
  category: 'variable',
  primaryRole: 'source',
  roles: [
    defineRole({
      role: 'source',
      description: 'The value to get',
      required: true,
      expectedTypes: ['selector', 'reference', 'expression'],
      svoPosition: 2,
      sovPosition: 1,
      markerOverride: {
        en: '',
        ja: 'を',
        es: '',
        ar: '',
        zh: '',
        ko: '를',
        fr: '',
        tr: '',
        de: '',
        pt: '',
      },
    }),
  ],
});

// =============================================================================
// wait — transitive: patient (duration or event)
// =============================================================================

export const waitSchema = defineCommand({
  action: 'wait',
  description: 'Wait for a duration or event',
  category: 'async',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'Duration or event to wait for',
      required: true,
      expectedTypes: ['literal', 'expression'],
      svoPosition: 2,
      sovPosition: 1,
      markerOverride: PATIENT,
    }),
  ],
});

// =============================================================================
// fetch — transitive: source (URL)
// Simplified for learning: just source role (URL to fetch)
// =============================================================================

export const fetchSchema = defineCommand({
  action: 'fetch',
  description: 'Fetch data from a URL',
  category: 'async',
  primaryRole: 'source',
  roles: [
    defineRole({
      role: 'source',
      description: 'The URL to fetch from',
      required: true,
      expectedTypes: ['literal', 'expression'],
      svoPosition: 2,
      sovPosition: 1,
      // renderOverride in semantic has en: '' — no preposition in rendered output
      markerOverride: {
        en: '',
        ja: 'を',
        es: '',
        ar: '',
        zh: '',
        ko: '를',
        fr: '',
        tr: '',
        de: '',
        pt: '',
      },
    }),
  ],
});

// =============================================================================
// send — ditransitive: event (patient-like) + destination
// Note: send's patient-equivalent is the 'event' role
// =============================================================================

export const sendSchema = defineCommand({
  action: 'send',
  description: 'Send an event to an element',
  category: 'event',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'The event to send',
      required: true,
      expectedTypes: ['literal', 'expression'],
      svoPosition: 3,
      sovPosition: 1,
      markerOverride: PATIENT,
    }),
    defineRole({
      role: 'destination',
      description: 'The target element',
      required: false,
      expectedTypes: ['selector', 'reference', 'expression'],
      svoPosition: 2,
      sovPosition: 2,
      markerOverride: {
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
    }),
  ],
});

// =============================================================================
// go — transitive: destination only (no patient)
// =============================================================================

export const goSchema = defineCommand({
  action: 'go',
  description: 'Navigate to a URL',
  category: 'navigation',
  primaryRole: 'destination',
  roles: [
    defineRole({
      role: 'destination',
      description: 'The URL to navigate to',
      required: true,
      expectedTypes: ['literal', 'expression'],
      svoPosition: 2,
      sovPosition: 1,
      // renderOverride en: '' means no preposition in rendered sentences
      markerOverride: {
        en: '',
        ja: '',
        es: 'a',
        ar: 'إلى',
        zh: '',
        ko: '에',
        fr: 'à',
        tr: 'a',
        de: 'zu',
        pt: 'para',
      },
    }),
  ],
});

// =============================================================================
// increment — transitive: patient
// =============================================================================

export const incrementSchema = defineCommand({
  action: 'increment',
  description: 'Increment a counter or value',
  category: 'variable',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'The value to increment',
      required: true,
      expectedTypes: ['selector', 'reference', 'expression'],
      svoPosition: 2,
      sovPosition: 1,
      markerOverride: PATIENT,
    }),
  ],
});

// =============================================================================
// decrement — transitive: patient
// =============================================================================

export const decrementSchema = defineCommand({
  action: 'decrement',
  description: 'Decrement a counter or value',
  category: 'variable',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'The value to decrement',
      required: true,
      expectedTypes: ['selector', 'reference', 'expression'],
      svoPosition: 2,
      sovPosition: 1,
      markerOverride: PATIENT,
    }),
  ],
});

// =============================================================================
// take — ditransitive: patient + source (from)
// =============================================================================

export const takeSchema = defineCommand({
  action: 'take',
  description: 'Take a class or element from a source',
  category: 'mutation',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'The class or element to take',
      required: true,
      expectedTypes: ['selector', 'expression'],
      svoPosition: 3,
      sovPosition: 1,
      markerOverride: PATIENT,
    }),
    defineRole({
      role: 'source',
      description: 'The element to take from',
      required: false,
      expectedTypes: ['selector', 'reference', 'expression'],
      svoPosition: 2,
      sovPosition: 2,
      markerOverride: SOURCE_FROM,
    }),
  ],
});

// =============================================================================
// All Schemas
// =============================================================================

export const allSchemas = [
  addSchema,
  removeSchema,
  toggleSchema,
  putSchema,
  setSchema,
  showSchema,
  hideSchema,
  getSchema,
  waitSchema,
  fetchSchema,
  sendSchema,
  goSchema,
  incrementSchema,
  decrementSchema,
  takeSchema,
];
