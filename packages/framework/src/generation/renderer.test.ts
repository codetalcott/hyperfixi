import { describe, it, expect } from 'vitest';
import {
  lookupKeyword,
  lookupMarker,
  buildPhrase,
  buildTablesFromProfiles,
  detectWordOrders,
  createSchemaRenderer,
} from './renderer';
import type { KeywordTable, MarkerTable } from './renderer';
import type { SemanticNode } from '../core/types';
import type { CommandSchema } from '../schema';
import { defineCommand, defineRole } from '../schema';
import type { PatternGenLanguageProfile } from './pattern-generator';

// =============================================================================
// Test Data
// =============================================================================

const KEYWORDS: KeywordTable = {
  select: { en: 'select', ja: '選択', es: 'seleccionar' },
  delete: { en: 'delete', ja: '削除', es: 'eliminar' },
};

const MARKERS: MarkerTable = {
  from: { en: 'from', ja: 'から', es: 'de' },
  where: { en: 'where', ja: '条件', es: 'donde' },
};

function makeNode(action: string, roles: Record<string, string>): SemanticNode {
  const rolesMap = new Map<string, { type: 'expression'; raw: string }>();
  for (const [k, v] of Object.entries(roles)) {
    rolesMap.set(k, { type: 'expression', raw: v });
  }
  return { kind: 'command', action, roles: rolesMap };
}

// =============================================================================
// lookupKeyword / lookupMarker
// =============================================================================

describe('lookupKeyword', () => {
  it('returns translated keyword', () => {
    expect(lookupKeyword(KEYWORDS, 'select', 'ja')).toBe('選択');
  });

  it('falls back to action key if no translation', () => {
    expect(lookupKeyword(KEYWORDS, 'select', 'fr')).toBe('select');
  });

  it('falls back to action key if unknown action', () => {
    expect(lookupKeyword(KEYWORDS, 'unknown', 'en')).toBe('unknown');
  });
});

describe('lookupMarker', () => {
  it('returns translated marker', () => {
    expect(lookupMarker(MARKERS, 'from', 'ja')).toBe('から');
  });

  it('falls back to marker key', () => {
    expect(lookupMarker(MARKERS, 'from', 'fr')).toBe('from');
  });
});

// =============================================================================
// buildPhrase
// =============================================================================

describe('buildPhrase', () => {
  it('joins parts with spaces', () => {
    expect(buildPhrase('select', 'name', 'from', 'users')).toBe('select name from users');
  });

  it('filters empty strings', () => {
    expect(buildPhrase('select', '', 'name', '', 'from', 'users')).toBe('select name from users');
  });

  it('returns empty string for all empty parts', () => {
    expect(buildPhrase('', '', '')).toBe('');
  });
});

// =============================================================================
// buildTablesFromProfiles
// =============================================================================

describe('buildTablesFromProfiles', () => {
  const schemas: CommandSchema[] = [
    defineCommand({
      action: 'select',
      description: 'Select data',
      category: 'query',
      primaryRole: 'columns',
      roles: [
        defineRole({
          role: 'columns',
          required: true,
          expectedTypes: ['expression'],
          svoPosition: 1,
        }),
        defineRole({
          role: 'source',
          required: true,
          expectedTypes: ['expression'],
          svoPosition: 2,
          markerOverride: { en: 'from', ja: 'から' },
        }),
      ],
    }),
  ];

  const profiles: PatternGenLanguageProfile[] = [
    {
      code: 'en',
      wordOrder: 'SVO',
      keywords: { select: { primary: 'select' } },
      roleMarkers: {},
    },
    {
      code: 'ja',
      wordOrder: 'SOV',
      keywords: { select: { primary: '選択' } },
      roleMarkers: {},
    },
  ];

  it('builds keyword table from profiles', () => {
    const { keywords } = buildTablesFromProfiles(schemas, profiles);
    expect(keywords.select.en).toBe('select');
    expect(keywords.select.ja).toBe('選択');
  });

  it('builds marker table from schema markerOverrides', () => {
    const { markers } = buildTablesFromProfiles(schemas, profiles);
    expect(markers.source.en).toBe('from');
    expect(markers.source.ja).toBe('から');
  });
});

// =============================================================================
// detectWordOrders
// =============================================================================

describe('detectWordOrders', () => {
  const profiles: PatternGenLanguageProfile[] = [
    { code: 'en', wordOrder: 'SVO', keywords: {} },
    { code: 'ja', wordOrder: 'SOV', keywords: {} },
    { code: 'ar', wordOrder: 'VSO', keywords: {} },
    { code: 'es', wordOrder: 'SVO', keywords: {} },
  ];

  it('detects SOV languages', () => {
    const { sovLanguages } = detectWordOrders(profiles);
    expect(sovLanguages.has('ja')).toBe(true);
    expect(sovLanguages.has('en')).toBe(false);
  });

  it('detects VSO languages', () => {
    const { vsoLanguages } = detectWordOrders(profiles);
    expect(vsoLanguages.has('ar')).toBe(true);
    expect(vsoLanguages.has('en')).toBe(false);
  });
});

// =============================================================================
// createSchemaRenderer
// =============================================================================

describe('createSchemaRenderer', () => {
  const schemas: CommandSchema[] = [
    defineCommand({
      action: 'select',
      description: 'Select data',
      category: 'query',
      primaryRole: 'columns',
      roles: [
        defineRole({
          role: 'columns',
          required: true,
          expectedTypes: ['expression'],
          svoPosition: 1,
        }),
        defineRole({
          role: 'source',
          required: true,
          expectedTypes: ['expression'],
          svoPosition: 2,
          markerOverride: { en: 'from', ja: 'から' },
        }),
      ],
    }),
  ];

  const profiles: PatternGenLanguageProfile[] = [
    {
      code: 'en',
      wordOrder: 'SVO',
      keywords: { select: { primary: 'select' } },
      roleMarkers: {},
    },
    {
      code: 'ja',
      wordOrder: 'SOV',
      keywords: { select: { primary: '選択' } },
      roleMarkers: {},
    },
  ];

  it('renders SVO (English)', () => {
    const renderer = createSchemaRenderer(schemas, profiles);
    const node = makeNode('select', { columns: 'name', source: 'users' });
    expect(renderer.render(node, 'en')).toBe('select name from users');
  });

  it('renders SOV (Japanese)', () => {
    const renderer = createSchemaRenderer(schemas, profiles);
    const node = makeNode('select', { columns: 'name', source: 'users' });
    const result = renderer.render(node, 'ja');
    // SOV: roles first (value marker), then keyword
    expect(result).toBe('name users から 選択');
  });

  it('handles unknown action gracefully', () => {
    const renderer = createSchemaRenderer(schemas, profiles);
    const node = makeNode('unknown', {});
    expect(renderer.render(node, 'en')).toBe('unknown');
  });

  it('skips optional roles that are empty', () => {
    const schemasWithOptional: CommandSchema[] = [
      defineCommand({
        action: 'select',
        description: 'Select data',
        category: 'query',
        primaryRole: 'columns',
        roles: [
          defineRole({
            role: 'columns',
            required: true,
            expectedTypes: ['expression'],
            svoPosition: 1,
          }),
          defineRole({
            role: 'source',
            required: true,
            expectedTypes: ['expression'],
            svoPosition: 2,
            markerOverride: { en: 'from' },
          }),
          defineRole({
            role: 'condition',
            required: false,
            expectedTypes: ['expression'],
            svoPosition: 3,
            markerOverride: { en: 'where' },
          }),
        ],
      }),
    ];

    const renderer = createSchemaRenderer(schemasWithOptional, profiles);
    const node = makeNode('select', { columns: 'name', source: 'users' });
    expect(renderer.render(node, 'en')).toBe('select name from users');
  });

  describe('absent roles never leave a dangling marker', () => {
    // An "analyze"-shaped schema: `manner` is REQUIRED and marked, so a node
    // missing it used to render "analyze #content as" / "#content として 分析".
    const analyzeSchemas: CommandSchema[] = [
      defineCommand({
        action: 'analyze',
        description: 'Analyze content',
        category: 'llm',
        primaryRole: 'patient',
        roles: [
          defineRole({
            role: 'patient',
            required: true,
            expectedTypes: ['expression'],
            svoPosition: 2,
          }),
          defineRole({
            role: 'manner',
            required: true,
            expectedTypes: ['expression'],
            svoPosition: 1,
            markerOverride: { en: 'as', ja: 'として' },
          }),
        ],
      }),
    ];

    const analyzeProfiles: PatternGenLanguageProfile[] = [
      {
        code: 'en',
        wordOrder: 'SVO',
        keywords: { analyze: { primary: 'analyze' } },
        roleMarkers: {},
      },
      { code: 'ja', wordOrder: 'SOV', keywords: { analyze: { primary: '分析' } }, roleMarkers: {} },
    ];

    it('omits a required-but-absent role and its marker (SVO)', () => {
      const renderer = createSchemaRenderer(analyzeSchemas, analyzeProfiles);
      const node = makeNode('analyze', { patient: '#content' });
      expect(renderer.render(node, 'en')).toBe('analyze #content');
    });

    it('omits a required-but-absent role and its marker (SOV)', () => {
      const renderer = createSchemaRenderer(analyzeSchemas, analyzeProfiles);
      const node = makeNode('analyze', { patient: '#content' });
      expect(renderer.render(node, 'ja')).toBe('#content 分析');
    });

    it('still renders the marker when the role has a value', () => {
      const renderer = createSchemaRenderer(analyzeSchemas, analyzeProfiles);
      const node = makeNode('analyze', { patient: '#content', manner: 'sentiment' });
      expect(renderer.render(node, 'en')).toBe('analyze #content as sentiment');
    });
  });
});
