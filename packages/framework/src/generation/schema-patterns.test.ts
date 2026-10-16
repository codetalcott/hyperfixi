/**
 * The schema-pattern generator semantic's hyperscript parser runs (domains
 * rethink Phase 4.4), on a schema of its own: the grammar's position order,
 * the variants, and a profile's optional markers.
 */
import { describe, expect, it } from 'vitest';
import { defineCommand, defineRole } from '../schema';
import type { PatternToken } from '../core/types';
import {
  createSchemaPatternGenerator,
  withoutVariantOnlyRoles,
  type SchemaPatternProfile,
} from './schema-patterns';

const send = defineCommand({
  action: 'send',
  primaryRole: 'patient',
  roles: [
    defineRole({ role: 'patient', required: true, expectedTypes: ['expression'], svoPosition: 1 }),
    defineRole({
      role: 'destination',
      required: false,
      expectedTypes: ['selector'],
      svoPosition: 2,
      sovPosition: 1,
    }),
  ],
});

const en: SchemaPatternProfile = {
  code: 'en',
  wordOrder: 'SVO',
  keywords: { send: { primary: 'send' } },
  roleMarkers: { destination: { primary: 'to', position: 'before' } },
};

const tr: SchemaPatternProfile = {
  code: 'tr',
  wordOrder: 'SOV',
  keywords: { send: { primary: 'gönder' } },
  roleMarkers: { destination: { primary: 'e', position: 'after' } },
  markersOptional: true,
};

/** A pattern's tokens as text: literals as themselves, roles as {role}, groups in brackets. */
function shape(tokens: readonly PatternToken[]): string {
  return tokens
    .map(t =>
      t.type === 'literal'
        ? t.value
        : t.type === 'role'
          ? `{${t.role}}`
          : `[${shape(t.tokens)}${'renderRequired' in t && t.renderRequired ? '!' : ''}]`
    )
    .join(' ');
}

describe('createSchemaPatternGenerator', () => {
  it("sorts roles in the grammar's position order", () => {
    const ascending = createSchemaPatternGenerator({ positionOrder: 'ascending' });
    const descending = createSchemaPatternGenerator({ positionOrder: 'descending' });
    expect(shape(ascending.generatePattern(send, en).template.tokens)).toBe(
      'send {patient} [to {destination}]'
    );
    expect(shape(descending.generatePattern(send, en).template.tokens)).toBe(
      'send [to {destination}] {patient}'
    );
  });

  it('builds the simple and SOV verb-first variants', () => {
    const generator = createSchemaPatternGenerator({ positionOrder: 'ascending' });
    const variants = generator.generatePatternVariants(send, tr, {
      basePriority: 100,
      generateSimpleVariants: true,
    });
    expect(variants.map(p => [p.id, p.priority, shape(p.template.tokens)])).toEqual([
      ['send-tr-generated', 100, '[{destination} [e!]] {patient} gönder'],
      ['send-tr-generated-simple', 95, '{patient} gönder'],
      ['send-tr-generated-verb-first', 80, 'gönder {patient}'],
    ]);
  });

  it('drops variant-only roles', () => {
    const scroll = defineCommand({
      action: 'scroll',
      roles: [
        defineRole({ role: 'patient', required: true, expectedTypes: ['selector'] }),
        defineRole({
          role: 'quantity',
          required: false,
          expectedTypes: ['literal'],
          variantOnly: true,
        }),
      ],
    });
    expect(withoutVariantOnlyRoles(scroll).roles.map(r => r.role)).toEqual(['patient']);
    expect(withoutVariantOnlyRoles(send)).toBe(send);
  });
});
