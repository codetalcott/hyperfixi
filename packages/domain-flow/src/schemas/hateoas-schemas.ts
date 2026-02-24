/**
 * HATEOAS Command Schemas
 *
 * Defines 4 HATEOAS-aware FlowScript commands: enter, follow, perform, capture.
 * These compile to siren-grail workflow steps instead of vanilla JS.
 */

import { defineCommand, defineRole } from '@lokascript/framework';

// =============================================================================
// ENTER — Establish HATEOAS entry point
// =============================================================================

export const enterSchema = defineCommand({
  action: 'enter',
  description: 'Connect to a HATEOAS API entry point',
  category: 'source',
  primaryRole: 'source',
  roles: [
    defineRole({
      role: 'source',
      description: 'API entry point URL',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
    }),
  ],
});

// =============================================================================
// FOLLOW — Navigate by link relation
// =============================================================================

export const followSchema = defineCommand({
  action: 'follow',
  description: 'Navigate to a resource by following a link relation',
  category: 'action',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'Link relation name to follow (e.g., "orders", "next")',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 2,
    }),
    defineRole({
      role: 'instrument',
      description: 'Parameter or sub-resource identifier (e.g., item {id})',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
      markerOverride: {
        en: 'item',
        es: 'elemento',
        ja: 'の',
        ar: 'عنصر',
        ko: '항목',
        zh: '项',
        tr: 'öğe',
        fr: 'élément',
      },
    }),
  ],
});

// =============================================================================
// PERFORM — Execute a server-defined action
// =============================================================================

export const performSchema = defineCommand({
  action: 'perform',
  description: 'Execute a server-defined action (Siren affordance)',
  category: 'action',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'Action name to execute (e.g., "create-order", "ship-order")',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 1,
    }),
    defineRole({
      role: 'source',
      description: 'Data source — form selector or inline data',
      required: false,
      expectedTypes: ['selector', 'expression'],
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
// CAPTURE — Bind response data to a variable
// =============================================================================

export const captureSchema = defineCommand({
  action: 'capture',
  description: 'Bind response data to a named variable for later use',
  category: 'action',
  primaryRole: 'destination',
  roles: [
    defineRole({
      role: 'patient',
      description: 'Property path to capture (optional — captures entire entity if omitted)',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 2,
    }),
    defineRole({
      role: 'destination',
      description: 'Variable name to bind the captured value to',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
      markerOverride: {
        en: 'as',
        es: 'como',
        ja: 'として',
        ar: 'ك',
        ko: '로',
        zh: '为',
        tr: 'olarak',
        fr: 'comme',
      },
    }),
  ],
});

// =============================================================================
// All HATEOAS Schemas
// =============================================================================

export const hateoasSchemas = [enterSchema, followSchema, performSchema, captureSchema];
