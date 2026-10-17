/**
 * The schema-pattern generator semantic's hyperscript parser runs (domains
 * rethink Phase 4.4), on a schema of its own: the grammar's position order,
 * the variants, a profile's optional markers, and a role's word list.
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

  it("puts a role's word list for the pattern's language on its token, in every variant", () => {
    const close = defineCommand({
      action: 'send',
      roles: [
        defineRole({
          role: 'patient',
          required: true,
          expectedTypes: ['expression'],
          words: { '*': ['tab'], tr: ['sekme'] },
        }),
        defineRole({ role: 'destination', required: false, expectedTypes: ['selector'] }),
      ],
    });
    const generator = createSchemaPatternGenerator({ positionOrder: 'ascending' });
    const wordsOf = (tokens: readonly PatternToken[]): unknown[] =>
      tokens.flatMap(t =>
        t.type === 'role' ? [[t.role, t.words]] : t.type === 'group' ? wordsOf(t.tokens) : []
      );
    const at = (profile: SchemaPatternProfile) => {
      const variants = generator.generatePatternVariants(close, profile, {
        basePriority: 100,
        generateSimpleVariants: true,
      });
      const roles = variants.flatMap(p => wordsOf(p.template.tokens)) as [string, unknown][];
      return {
        variants: variants.length,
        patient: [
          ...new Set(roles.filter(([r]) => r === 'patient').map(([, w]) => JSON.stringify(w))),
        ],
        destination: [
          ...new Set(roles.filter(([r]) => r === 'destination').map(([, w]) => JSON.stringify(w))),
        ],
      };
    };
    expect(at(en)).toEqual({ variants: 2, patient: ['["tab"]'], destination: [undefined] });
    expect(at(tr)).toEqual({ variants: 3, patient: ['["tab","sekme"]'], destination: [undefined] });
    // No list, no field: the patterns of a grammar that lists no words are unchanged.
    expect(JSON.stringify(generator.generatePattern(send, en))).not.toContain('words');
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
