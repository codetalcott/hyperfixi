/**
 * FlowScript Command Schemas
 *
 * Defines the semantic structure of data flow commands using the framework's
 * defineCommand/defineRole helpers. Each schema specifies roles (source, destination,
 * style, duration, etc.) and per-language marker overrides for 8 languages.
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
      },
    }),
    defineRole({
      role: 'destination',
      description: 'Target element to deliver data to',
      required: false,
      expectedTypes: ['selector', 'expression'],
      svoPosition: 0,
      sovPosition: 0,
      markerOverride: {
        en: 'into',
        es: 'en',
        ja: 'に',
        ar: 'في',
        ko: '에',
        zh: '到',
        tr: 'e',
        fr: 'dans',
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
      },
    }),
    defineRole({
      role: 'destination',
      description: 'Target element for poll results',
      required: false,
      expectedTypes: ['selector', 'expression'],
      svoPosition: 1,
      sovPosition: 1,
      markerOverride: {
        en: 'into',
        es: 'en',
        ja: 'に',
        ar: 'في',
        ko: '에',
        zh: '到',
        tr: 'e',
        fr: 'dans',
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
      },
    }),
    defineRole({
      role: 'destination',
      description: 'Target element for streamed data',
      required: false,
      expectedTypes: ['selector', 'expression'],
      svoPosition: 0,
      sovPosition: 0,
      markerOverride: {
        en: 'into',
        es: 'en',
        ja: 'に',
        ar: 'في',
        ko: '에',
        zh: '到',
        tr: 'e',
        fr: 'dans',
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
      sovPosition: 1,
    }),
    defineRole({
      role: 'destination',
      description: 'URL to submit to',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 2,
      markerOverride: {
        en: 'to',
        es: 'a',
        ja: 'に',
        ar: 'إلى',
        ko: '로',
        zh: '到',
        tr: 'e',
        fr: 'vers',
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
      sovPosition: 1,
    }),
    defineRole({
      role: 'instrument',
      description: 'Transform function, format string, or mapping',
      required: true,
      expectedTypes: ['expression', 'literal'],
      svoPosition: 1,
      sovPosition: 2,
      markerOverride: {
        en: 'with',
        es: 'con',
        ja: 'で',
        ar: 'ب',
        ko: '로',
        zh: '用',
        tr: 'ile',
        fr: 'avec',
      },
    }),
  ],
});

// =============================================================================
// All Schemas
// =============================================================================

export const allSchemas = [fetchSchema, pollSchema, streamSchema, submitSchema, transformSchema];
