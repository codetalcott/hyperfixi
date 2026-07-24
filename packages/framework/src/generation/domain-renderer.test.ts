/**
 * createDomainRenderer: hand-written overrides + schema fallthrough + null.
 *
 * Domains used to render through a hardcoded `switch (node.action)` whose
 * default returned a sentinel string (`-- Unknown: <action>`), so a downstream
 * consumer could neither add a command nor distinguish failure from success
 * without string matching. This composes the two halves instead.
 */

import { describe, it, expect, vi } from 'vitest';
import { createDomainRenderer, createSchemaRenderer } from './renderer';
import type { SemanticNode } from '../core/types';
import type { CommandSchema } from '../schema';
import { defineCommand, defineRole } from '../schema';
import type { PatternGenLanguageProfile } from './pattern-generator';

function makeNode(action: string, roles: Record<string, string>): SemanticNode {
  const rolesMap = new Map<string, { type: 'expression'; raw: string }>();
  for (const [k, v] of Object.entries(roles)) {
    rolesMap.set(k, { type: 'expression', raw: v });
  }
  return { kind: 'command', action, roles: rolesMap };
}

const selectSchema = defineCommand({
  action: 'select',
  description: 'Select data',
  category: 'query',
  primaryRole: 'columns',
  roles: [
    defineRole({ role: 'columns', required: true, expectedTypes: ['expression'] }),
    defineRole({
      role: 'source',
      required: true,
      expectedTypes: ['expression'],
      markerOverride: { en: 'from', ja: 'から', ar: 'من' },
    }),
  ],
});

/** Stands in for a command a downstream consumer added without editing the domain. */
const researchSchema = defineCommand({
  action: 'research',
  description: 'Research a topic',
  category: 'query',
  primaryRole: 'patient',
  roles: [
    defineRole({ role: 'patient', required: true, expectedTypes: ['expression'] }),
    defineRole({
      role: 'source',
      required: true,
      expectedTypes: ['expression'],
      markerOverride: { en: 'from', ja: 'から', ar: 'من' },
    }),
  ],
});

const profiles: PatternGenLanguageProfile[] = [
  {
    code: 'en',
    wordOrder: 'SVO',
    keywords: { select: { primary: 'select' }, research: { primary: 'research' } },
    roleMarkers: {},
  },
  {
    code: 'ja',
    wordOrder: 'SOV',
    keywords: { select: { primary: '選択' }, research: { primary: '調査' } },
    roleMarkers: {},
  },
  {
    code: 'ar',
    wordOrder: 'VSO',
    keywords: { select: { primary: 'اختر' }, research: { primary: 'ابحث' } },
    roleMarkers: {},
  },
];

const schemas: CommandSchema[] = [selectSchema, researchSchema];

describe('createDomainRenderer', () => {
  describe('overrides take precedence', () => {
    it('uses the hand-written renderer for an action it covers', () => {
      const render = createDomainRenderer({
        schemas,
        profiles,
        overrides: { select: () => 'HAND WRITTEN' },
      });
      expect(render(makeNode('select', { columns: 'name', source: 'users' }), 'en')).toBe(
        'HAND WRITTEN'
      );
    });

    it('passes the node and language through to the override', () => {
      const override = vi.fn(() => 'x');
      const render = createDomainRenderer({ schemas, profiles, overrides: { select: override } });
      const node = makeNode('select', { columns: 'name', source: 'users' });

      render(node, 'ja');

      expect(override).toHaveBeenCalledWith(node, 'ja');
    });
  });

  describe('schema fallthrough', () => {
    // These are the outputs a downstream consumer gets for a command the domain
    // package has never heard of — the whole point of the fallthrough.
    const render = createDomainRenderer({
      schemas,
      profiles,
      overrides: { select: () => 'HAND WRITTEN' },
    });
    const node = makeNode('research', { patient: '"climate"', source: '#wiki' });

    it('renders SVO', () => {
      expect(render(node, 'en')).toBe('research "climate" from #wiki');
    });

    it('renders verb-final for SOV', () => {
      expect(render(node, 'ja')).toBe('"climate" #wiki から 調査');
    });

    it('renders verb-initial for VSO', () => {
      expect(render(node, 'ar')).toBe('ابحث "climate" من #wiki');
    });

    it('matches createSchemaRenderer for the same schema', () => {
      const schemaRenderer = createSchemaRenderer(schemas, profiles);
      for (const language of ['en', 'ja', 'ar']) {
        expect(render(node, language)).toBe(schemaRenderer.render(node, language));
      }
    });
  });

  describe('unknown actions', () => {
    it('returns null rather than a sentinel string', () => {
      const render = createDomainRenderer({ schemas, profiles });
      expect(render(makeNode('nonsense', { patient: 'x' }), 'en')).toBeNull();
    });

    it('returns null even when other actions have overrides', () => {
      const render = createDomainRenderer({
        schemas,
        profiles,
        overrides: { select: () => 'HAND WRITTEN' },
      });
      expect(render(makeNode('nonsense', {}), 'ja')).toBeNull();
    });
  });

  it('builds its tables lazily', () => {
    // Constructing a renderer at module scope must not walk every schema and
    // profile; domains create one per module whether or not it is ever called.
    const profileAccess = vi.fn(() => 'SVO' as const);
    const watchedProfiles = [
      {
        code: 'en',
        keywords: { select: { primary: 'select' } },
        roleMarkers: {},
        get wordOrder() {
          return profileAccess();
        },
      } as unknown as PatternGenLanguageProfile,
    ];

    const render = createDomainRenderer({ schemas, profiles: watchedProfiles });
    expect(profileAccess).not.toHaveBeenCalled();

    render(makeNode('select', { columns: 'name', source: 'users' }), 'en');
    expect(profileAccess).toHaveBeenCalled();
  });
});
