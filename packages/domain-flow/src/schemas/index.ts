/**
 * FlowScript Command Schemas
 *
 * Defines the semantic structure of data flow commands using the framework's
 * defineCommand/defineRole helpers. Each schema specifies roles (source, destination,
 * style, duration, etc.) and per-language marker overrides for 11 languages.
 */

import { defineCommand, defineRole } from '@lokascript/framework';

// =============================================================================
// FETCH — Single HTTP request with target
// =============================================================================

export const fetchSchema = defineCommand({
  action: 'fetch',
  description: 'Fetch data from a URL and deliver to a target element',
  category: 'source',
  primaryRole: 'source',
  roles: [
    defineRole({
      role: 'source',
      description: 'URL to fetch from',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 2,
      // The URL follows the verb bare — "fetch /api", never "fetch with /api".
      // The profile's `source` marker stays accepted when parsing; it is just
      // never written. Same for `poll` and `stream` below.
      renderOverride: { '*': '' },
    }),
    defineRole({
      role: 'style',
      description: 'Response format (json, html, text)',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
      markerOverride: {
        en: 'as',
        es: 'como',
        ja: 'で',
        ar: 'ك',
        ko: '로',
        zh: '以',
        tr: 'olarak',
        fr: 'comme',
        de: 'als',
        pt: 'como',
        ru: 'как',
      },
    }),
    defineRole({
      role: 'destination',
      description: 'Target element to deliver data to',
      required: false,
      expectedTypes: ['selector', 'expression'],
      svoPosition: 0,
      sovPosition: 0,
      // SOV languages put the delivery target AFTER the verb here:
      // `/api json で 取得 #out に`, not `/api json で #out に 取得`. The data
      // has to be fetched before it can land anywhere, and the surface follows.
      sovSlot: 'postVerb',
      markerOverride: {
        en: 'into',
        es: 'en',
        ja: 'に',
        ar: 'في',
        ko: '에',
        zh: '到',
        tr: 'e',
        fr: 'dans',
        de: 'in',
        pt: 'em',
        ru: 'в',
      },
    }),
  ],
});

// =============================================================================
// POLL — Repeated fetch with interval
// =============================================================================

export const pollSchema = defineCommand({
  action: 'poll',
  description: 'Repeatedly fetch data at a specified interval',
  category: 'source',
  primaryRole: 'source',
  roles: [
    defineRole({
      role: 'source',
      description: 'URL to poll',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 4,
      sovPosition: 4,
      renderOverride: { '*': '' },
    }),
    defineRole({
      role: 'duration',
      description: 'Polling interval (e.g., 5s, 30s, 1m)',
      required: true,
      expectedTypes: ['expression', 'literal'],
      svoPosition: 3,
      sovPosition: 3,
      markerOverride: {
        en: 'every',
        es: 'cada',
        ja: 'ごとに',
        ar: 'كل',
        ko: '마다',
        zh: '每',
        tr: 'her',
        fr: 'chaque',
        de: 'alle',
        pt: 'cada',
        ru: 'каждые',
      },
    }),
    defineRole({
      role: 'style',
      description: 'Response format (json, html, text)',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 2,
      markerOverride: {
        en: 'as',
        es: 'como',
        ja: 'で',
        ar: 'ك',
        ko: '로',
        zh: '以',
        tr: 'olarak',
        fr: 'comme',
        de: 'als',
        pt: 'como',
        ru: 'как',
      },
    }),
    defineRole({
      role: 'destination',
      description: 'Target element for poll results',
      required: false,
      expectedTypes: ['selector', 'expression'],
      svoPosition: 1,
      sovPosition: 1,
      sovSlot: 'postVerb',
      markerOverride: {
        en: 'into',
        es: 'en',
        ja: 'に',
        ar: 'في',
        ko: '에',
        zh: '到',
        tr: 'e',
        fr: 'dans',
        de: 'in',
        pt: 'em',
        ru: 'в',
      },
    }),
  ],
});

// =============================================================================
// STREAM — Server-Sent Events connection
// =============================================================================

export const streamSchema = defineCommand({
  action: 'stream',
  description: 'Open a streaming connection (SSE) to a URL',
  category: 'source',
  primaryRole: 'source',
  roles: [
    defineRole({
      role: 'source',
      description: 'URL for SSE stream',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 2,
      renderOverride: { '*': '' },
    }),
    defineRole({
      role: 'style',
      description: 'Stream type (sse)',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
      markerOverride: {
        en: 'as',
        es: 'como',
        ja: 'で',
        ar: 'ك',
        ko: '로',
        zh: '以',
        tr: 'olarak',
        fr: 'comme',
        de: 'als',
        pt: 'como',
        ru: 'как',
      },
    }),
    defineRole({
      role: 'destination',
      description: 'Target element for streamed data',
      required: false,
      expectedTypes: ['selector', 'expression'],
      svoPosition: 0,
      sovPosition: 0,
      sovSlot: 'postVerb',
      markerOverride: {
        en: 'into',
        es: 'en',
        ja: 'に',
        ar: 'في',
        ko: '에',
        zh: '到',
        tr: 'e',
        fr: 'dans',
        de: 'in',
        pt: 'em',
        ru: 'в',
      },
    }),
  ],
});

// =============================================================================
// SUBMIT — Form submission
// =============================================================================

export const submitSchema = defineCommand({
  action: 'submit',
  description: 'Submit form data to a URL',
  category: 'action',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'Form element to submit',
      required: true,
      expectedTypes: ['selector', 'expression'],
      svoPosition: 2,
      // The form comes before its target in SOV too — `#form /api に 送信`,
      // the neutral object-then-goal order. (Higher position = earlier.)
      sovPosition: 2,
    }),
    defineRole({
      role: 'destination',
      description: 'URL to submit to',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
      markerOverride: {
        en: 'to',
        es: 'a',
        ja: 'に',
        ar: 'إلى',
        ko: '로',
        zh: '到',
        tr: 'e',
        fr: 'vers',
        de: 'an',
        pt: 'para',
        ru: 'на',
      },
    }),
    defineRole({
      role: 'style',
      description: 'Request encoding (json, form, multipart)',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 0,
      sovPosition: 0,
      markerOverride: {
        en: 'as',
        es: 'como',
        ja: 'で',
        ar: 'ك',
        ko: '로',
        zh: '以',
        tr: 'olarak',
        fr: 'comme',
        de: 'als',
        pt: 'como',
        ru: 'как',
      },
    }),
  ],
});

// =============================================================================
// TRANSFORM — Data transformation step
// =============================================================================

export const transformSchema = defineCommand({
  action: 'transform',
  description: 'Transform data using a function or format string',
  category: 'transform',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'Data to transform',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      // Object before instrument in SOV as well — `data uppercase で 変換`.
      // (Higher position = earlier.)
      sovPosition: 2,
    }),
    defineRole({
      role: 'instrument',
      description: 'Transform function, format string, or mapping',
      required: true,
      expectedTypes: ['expression', 'literal'],
      svoPosition: 1,
      sovPosition: 1,
      markerOverride: {
        en: 'with',
        es: 'con',
        ja: 'で',
        ar: 'ب',
        ko: '로',
        zh: '用',
        tr: 'ile',
        fr: 'avec',
        de: 'mit',
        pt: 'com',
        ru: 'с',
      },
    }),
  ],
});

// =============================================================================
// HATEOAS Schemas (re-exported from dedicated file)
// =============================================================================

export {
  enterSchema,
  followSchema,
  performSchema,
  captureSchema,
  hateoasSchemas,
} from './hateoas-schemas.js';
import { hateoasSchemas } from './hateoas-schemas.js';

// =============================================================================
// All Schemas
// =============================================================================

export const allSchemas = [
  fetchSchema,
  pollSchema,
  streamSchema,
  submitSchema,
  transformSchema,
  ...hateoasSchemas,
];
