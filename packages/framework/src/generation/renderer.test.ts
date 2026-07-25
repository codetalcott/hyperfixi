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
  // Positions sort DESCENDING (higher = earlier), matching pattern generation:
  // columns (2) precedes source (1) → "select name from users".
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
          svoPosition: 2,
        }),
        defineRole({
          role: 'source',
          required: true,
          expectedTypes: ['expression'],
          svoPosition: 1,
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
            svoPosition: 3,
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
            svoPosition: 1,
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

  describe('role positions', () => {
    // Declaration order deliberately disagrees with the declared positions.
    const outOfOrder: CommandSchema[] = [
      defineCommand({
        action: 'select',
        description: 'Select data',
        category: 'query',
        primaryRole: 'columns',
        roles: [
          defineRole({
            role: 'source',
            required: true,
            expectedTypes: ['expression'],
            svoPosition: 1,
            sovPosition: 1,
            markerOverride: { en: 'from', ja: 'から' },
          }),
          defineRole({
            role: 'columns',
            required: true,
            expectedTypes: ['expression'],
            svoPosition: 2,
            sovPosition: 2,
          }),
        ],
      }),
    ];

    it('orders roles by svoPosition, not declaration order', () => {
      const renderer = createSchemaRenderer(outOfOrder, profiles);
      const node = makeNode('select', { columns: 'name', source: 'users' });
      expect(renderer.render(node, 'en')).toBe('select name from users');
    });

    it('orders roles by sovPosition for SOV languages', () => {
      const renderer = createSchemaRenderer(outOfOrder, profiles);
      const node = makeNode('select', { columns: 'name', source: 'users' });
      expect(renderer.render(node, 'ja')).toBe('name users から 選択');
    });
  });

  describe('role defaults', () => {
    const withDefault: CommandSchema[] = [
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
            svoPosition: 2,
            default: { type: 'literal', value: '*' },
          }),
          defineRole({
            role: 'source',
            required: true,
            expectedTypes: ['expression'],
            svoPosition: 1,
            markerOverride: { en: 'from' },
          }),
        ],
      }),
    ];

    it("renders a schema default in an absent role's place", () => {
      const renderer = createSchemaRenderer(withDefault, profiles);
      const node = makeNode('select', { source: 'users' });
      expect(renderer.render(node, 'en')).toBe('select * from users');
    });

    it('prefers the node value over the default', () => {
      const renderer = createSchemaRenderer(withDefault, profiles);
      const node = makeNode('select', { columns: 'name', source: 'users' });
      expect(renderer.render(node, 'en')).toBe('select name from users');
    });
  });

  describe('marker placement and formatting', () => {
    const capabilities: CommandSchema[] = [
      defineCommand({
        action: 'summarize',
        description: 'Summarize content',
        category: 'llm',
        primaryRole: 'patient',
        roles: [
          defineRole({
            role: 'patient',
            required: true,
            expectedTypes: ['expression'],
            svoPosition: 3,
            sovPosition: 3,
            quoteMultiword: true,
          }),
          defineRole({
            role: 'quantity',
            required: false,
            expectedTypes: ['expression'],
            svoPosition: 2,
            sovPosition: 2,
            markerOverride: { en: 'in', ja: 'で' },
            // Japanese renders this marker BEFORE its value despite SOV default
            markerPositionOverride: { ja: 'before' },
          }),
          defineRole({
            role: 'manner',
            required: false,
            expectedTypes: ['expression'],
            svoPosition: 1,
            sovPosition: 1,
            markerOverride: { en: 'as', ja: 'として' },
            sovSlot: 'postVerb',
          }),
          defineRole({
            role: 'source',
            required: false,
            expectedTypes: ['expression'],
            svoPosition: 0,
            markerOverride: { en: '' }, // parser-only marker; renders bare
          }),
        ],
      }),
    ];

    const capProfiles: PatternGenLanguageProfile[] = [
      {
        code: 'en',
        wordOrder: 'SVO',
        keywords: { summarize: { primary: 'summarize' } },
        roleMarkers: {},
      },
      {
        code: 'ja',
        wordOrder: 'SOV',
        keywords: { summarize: { primary: '要約' } },
        roleMarkers: {},
      },
    ];

    it('quotes a multi-word value for quoteMultiword roles', () => {
      const renderer = createSchemaRenderer(capabilities, capProfiles);
      const node = makeNode('summarize', { patient: 'the annual report' });
      expect(renderer.render(node, 'en')).toBe('summarize "the annual report"');
    });

    it('leaves a single-word value unquoted', () => {
      const renderer = createSchemaRenderer(capabilities, capProfiles);
      const node = makeNode('summarize', { patient: '#document' });
      expect(renderer.render(node, 'en')).toBe('summarize #document');
    });

    it('does not double-quote an already-quoted value', () => {
      const renderer = createSchemaRenderer(capabilities, capProfiles);
      const node = makeNode('summarize', { patient: '"the annual report"' });
      expect(renderer.render(node, 'en')).toBe('summarize "the annual report"');
    });

    it('honors markerPositionOverride against the word-order default', () => {
      const renderer = createSchemaRenderer(capabilities, capProfiles);
      const node = makeNode('summarize', { patient: '#doc', quantity: '3' });
      // ja default would be "3 で"; the override puts the marker first
      expect(renderer.render(node, 'ja')).toBe('#doc で 3 要約');
    });

    it('renders a sovSlot:postVerb role after the verb', () => {
      const renderer = createSchemaRenderer(capabilities, capProfiles);
      const node = makeNode('summarize', { patient: '#doc', manner: 'bullets' });
      expect(renderer.render(node, 'ja')).toBe('#doc 要約 bullets として');
      // SVO is unaffected — sovSlot applies only to SOV languages
      expect(renderer.render(node, 'en')).toBe('summarize #doc as bullets');
    });

    it("treats renderOverride '' as no marker", () => {
      const renderer = createSchemaRenderer(capabilities, capProfiles);
      const node = makeNode('summarize', { patient: '#doc', source: '#feed' });
      expect(renderer.render(node, 'en')).toBe('summarize #doc #feed');
    });
  });
});
