/**
 * Pattern Tools Tests
 *
 * @hyperfixi/patterns-reference is a workspace dependency here, so these tests
 * run against its database and assert that it answered (`source: 'database'`).
 * The two other cases are staged with a mock of the package: it cannot be
 * loaded (the built-in list answers and says so), and it loads but a query
 * throws (an error, never a built-in answer).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { handlePatternTool, patternTools } from '../tools/patterns.js';

describe('patternTools', () => {
  it('exports 3 tools', () => {
    expect(patternTools).toHaveLength(3);
  });

  it('has get_examples tool', () => {
    const tool = patternTools.find(t => t.name === 'get_examples');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('prompt');
  });

  it('has search_patterns tool', () => {
    const tool = patternTools.find(t => t.name === 'search_patterns');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('query');
  });

  it('has get_pattern_stats tool', () => {
    const tool = patternTools.find(t => t.name === 'get_pattern_stats');
    expect(tool).toBeDefined();
  });
});

const call = async (name: string, args: Record<string, unknown>) => {
  const result = await handlePatternTool(name, args);
  return { result, parsed: JSON.parse(result.content[0].text) };
};

/** A call the database must have answered. */
const fromDatabase = async (name: string, args: Record<string, unknown>) => {
  const { result, parsed } = await call(name, args);
  expect(result.isError).toBeUndefined();
  expect(parsed.source).toBe('database');
  expect(parsed.fallback).toBeUndefined();
  return parsed;
};

describe('get_examples', () => {
  it('returns examples for toggle task', async () => {
    const parsed = await fromDatabase('get_examples', { prompt: 'toggle a class' });
    expect(parsed.examples.length).toBeGreaterThan(0);
    expect(parsed.count).toBe(parsed.examples.length);
    expect(parsed.examples.some((e: any) => e.code.includes('toggle'))).toBe(true);
    for (const e of parsed.examples) {
      expect(['both', 'hyperscript', 'lokascript']).toContain(e.engine);
    }
  });

  it('returns examples for modal task', async () => {
    const parsed = await fromDatabase('get_examples', { prompt: 'show modal' });
    expect(parsed.examples.some((e: any) => e.code.includes('show #modal'))).toBe(true);
  });

  it('respects limit parameter', async () => {
    // More than two examples match "click": the limit is what holds it to two.
    const parsed = await fromDatabase('get_examples', { prompt: 'click', limit: 2 });
    expect(parsed.examples).toHaveLength(2);
  });

  it('answers from the built-in list, and says so, when the database has no match', async () => {
    const { result, parsed } = await call('get_examples', { prompt: 'xyzzy frobulate' });
    expect(result.isError).toBeUndefined();
    expect(parsed.source).toBe('built-in');
    expect(parsed.fallback.code).toBe('NO_DATABASE_MATCH');
    expect(parsed.fallback.reason).toContain('"en"');
    // No built-in example matches either: the first few, marked as unmatched.
    expect(parsed.matched).toBe(false);
    expect(parsed.examples).toHaveLength(5);
    expect(parsed.count).toBe(5);
    // It used to say "install @hyperfixi/patterns-reference" with the package installed.
    expect(parsed.note).not.toContain('Install');
  });

  it('counts the examples it returns when the limit exceeds the built-in list', async () => {
    const { parsed } = await call('get_examples', { prompt: 'xyzzy frobulate', limit: 500 });
    expect(parsed.source).toBe('built-in');
    expect(parsed.examples.length).toBeLessThan(500);
    expect(parsed.count).toBe(parsed.examples.length);
  });

  it('says its examples are built-in English ones for a language the database has none in', async () => {
    const { parsed } = await call('get_examples', { prompt: 'toggle', language: 'ja' });
    expect(parsed.source).toBe('built-in');
    expect(parsed.fallback.code).toBe('NO_DATABASE_MATCH');
    expect(parsed.fallback.reason).toContain('"ja"');
    expect(parsed.matched).toBe(true);
    expect(parsed.examples.length).toBeGreaterThan(0);
    for (const e of parsed.examples) expect(`${e.task} ${e.code}`).toContain('toggle');
  });
});

describe('search_patterns', () => {
  it('finds patterns by query', async () => {
    const parsed = await fromDatabase('search_patterns', { query: 'toggle' });
    expect(parsed.patterns.length).toBeGreaterThan(0);
    expect(parsed.count).toBe(parsed.patterns.length);
    expect(parsed.query).toBe('toggle');
    expect(parsed.patterns.map((p: any) => p.id)).toContain('toggle-class-basic');
  });

  it('filters by category', async () => {
    const parsed = await fromDatabase('search_patterns', {
      query: 'class',
      category: 'class-manipulation',
    });
    expect(parsed.patterns.length).toBeGreaterThan(0);
    for (const p of parsed.patterns) expect(p.category).toBe('class-manipulation');
  });

  it('respects limit parameter', async () => {
    // More than three patterns match "click": the limit is what holds it to three.
    const parsed = await fromDatabase('search_patterns', { query: 'click', limit: 3 });
    expect(parsed.patterns).toHaveLength(3);
  });

  it('returns empty for non-matching query, from the database', async () => {
    const parsed = await fromDatabase('search_patterns', {
      query: 'xyzzy_nonexistent_pattern_12345',
    });
    expect(parsed.patterns).toEqual([]);
    expect(parsed.count).toBe(0);
  });

  it('finds visibility patterns', async () => {
    const parsed = await fromDatabase('search_patterns', { query: 'show' });
    expect(parsed.patterns.map((p: any) => p.id)).toContain('show-element');
  });

  it('finds async patterns', async () => {
    const parsed = await fromDatabase('search_patterns', { query: 'fetch' });
    const fetchBasic = parsed.patterns.find((p: any) => p.id === 'fetch-basic');
    expect(fetchBasic).toMatchObject({ category: 'async' });
    expect(fetchBasic.code).toContain('fetch');
  });
});

// With a category the database path used to drop the query and the limit and
// report no category at all (`p.feature` on a Pattern, hidden by `any`).
describe('search_patterns against the pattern database', () => {
  type Found = { title: string; code: string; category: string };
  const search = async (args: Record<string, unknown>): Promise<Found[]> => {
    const parsed = JSON.parse((await handlePatternTool('search_patterns', args)).content[0].text);
    expect(parsed.source, 'the database answered, not the built-in list').toBe('database');
    return parsed.patterns;
  };

  it('narrows a search to a category, keeping the query and the limit', async () => {
    const found = await search({ query: 'toggle', category: 'class-manipulation', limit: 2 });
    expect(found).toHaveLength(2);
    for (const p of found) {
      expect(p.category).toBe('class-manipulation');
      expect(`${p.title} ${p.code}`.toLowerCase()).toContain('toggle');
    }
  });

  it("reports each pattern's category", async () => {
    const found = await search({ query: 'toggle', limit: 5 });
    expect(found.length).toBeGreaterThan(0);
    for (const p of found) expect(typeof p.category, p.title).toBe('string');
  });

  it('advertises only categories the database has', async () => {
    const tool = patternTools.find(t => t.name === 'search_patterns')!;
    const inDescription = /\(([^)]*)\)/
      .exec(tool.description ?? '')![1]!
      .split(',')
      .map(s => s.trim())
      .filter(s => s !== '' && s !== 'etc.');
    const categoryHelp = (tool.inputSchema.properties as Record<string, { description: string }>)
      .category!.description;
    const inHelp = [...categoryHelp.matchAll(/"([^"]+)"/g)].map(m => m[1]!);
    const ref = await import('@hyperfixi/patterns-reference');
    for (const category of [...inDescription, ...inHelp]) {
      expect((await ref.getPatternsByCategory(category)).length, category).toBeGreaterThan(0);
    }
  });
});

describe('get_pattern_stats', () => {
  it("returns the database's statistics", async () => {
    const parsed = await fromDatabase('get_pattern_stats', {});
    expect(parsed.patterns.totalPatterns).toBeGreaterThan(100);
    expect(parsed.patterns.totalTranslations).toBeGreaterThan(parsed.patterns.totalPatterns);
    expect(parsed.llmExamples).toBeDefined();
    // The built-in answer's keys are not in a database answer.
    expect(parsed.categories).toBeUndefined();
    expect(parsed.builtinExamples).toBeUndefined();
  });

  it('lists the languages the database has translations in', async () => {
    // A hand-written list of 13 stood here while the database held 24.
    const parsed = await fromDatabase('get_pattern_stats', {});
    expect(parsed.supportedLanguages).toEqual(Object.keys(parsed.patterns.byLanguage).sort());
    expect(parsed.supportedLanguages).toHaveLength(24);
    expect(parsed.supportedLanguages).toContain('en');
    expect(parsed.supportedLanguages).toContain('he');
  });
});

describe('error handling', () => {
  it('handles unknown tool gracefully', async () => {
    const result = await handlePatternTool('unknown_pattern_tool', {});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown pattern tool');
  });
});

// The package cannot be loaded (it is an optional peer): the built-in list answers,
// and every answer says that it did and why.
describe('without @hyperfixi/patterns-reference', () => {
  const unavailable = async (name: string, args: Record<string, unknown>) => {
    vi.doMock('@hyperfixi/patterns-reference', () => {
      throw new Error('not installed');
    });
    const { result, parsed } = await call(name, args);
    expect(result.isError).toBeUndefined();
    expect(parsed.source).toBe('built-in');
    expect(parsed.fallback.code).toBe('PATTERNS_REFERENCE_UNAVAILABLE');
    // The import's own message follows (here vitest's, about the throwing mock).
    expect(parsed.fallback.reason).toMatch(
      /^@hyperfixi\/patterns-reference could not be loaded: \S/
    );
    expect(parsed.note).toContain('Install @hyperfixi/patterns-reference');
    return parsed;
  };
  afterEach(() => {
    vi.doUnmock('@hyperfixi/patterns-reference');
  });

  it('search_patterns searches the built-in list', async () => {
    const parsed = await unavailable('search_patterns', { query: 'toggle' });
    expect(parsed.patterns.map((p: any) => p.code)).toEqual([
      'on click toggle .active',
      'on click toggle .open on #nav',
    ]);
    expect(parsed.count).toBe(2);
    expect(parsed.query).toBe('toggle');
  });

  it('search_patterns narrows the built-in list to a category', async () => {
    const parsed = await unavailable('search_patterns', {
      query: 'class',
      category: 'class-manipulation',
    });
    expect(parsed.patterns.length).toBeGreaterThan(0);
    for (const p of parsed.patterns) expect(p.category).toBe('class-manipulation');
  });

  it('search_patterns keeps to the limit, and counts what it returns', async () => {
    const parsed = await unavailable('search_patterns', { query: 'click', limit: 3 });
    expect(parsed.patterns).toHaveLength(3);
    expect(parsed.count).toBe(3);
  });

  it('search_patterns returns nothing for a query the built-in list lacks', async () => {
    const parsed = await unavailable('search_patterns', { query: 'xyzzy_nonexistent' });
    expect(parsed.patterns).toEqual([]);
  });

  it('get_examples matches the built-in list', async () => {
    const parsed = await unavailable('get_examples', { prompt: 'fetch data', limit: 2 });
    expect(parsed.matched).toBe(true);
    expect(parsed.examples).toHaveLength(2);
    expect(parsed.examples[0].code).toContain('fetch');
  });

  it('get_pattern_stats describes the built-in list', async () => {
    const parsed = await unavailable('get_pattern_stats', {});
    expect(parsed.builtinExamples).toBeGreaterThan(0);
    expect(parsed.categories).toContain('class-manipulation');
    expect(parsed.supportedLanguages).toEqual(['en']);
    expect(parsed.patterns).toBeUndefined();
  });
});

// The package loads, so its database is expected to answer. A query that throws used to
// be answered from the built-in list, which a caller could not tell from a real result.
describe('when the pattern database fails', () => {
  const closed = vi.fn();
  const failing = async (name: string, args: Record<string, unknown>) => {
    const boom = () => {
      throw new Error('unable to open database file');
    };
    vi.doMock('@hyperfixi/patterns-reference', () => ({
      createPatternsReference: () => ({ searchPatterns: boom, getStats: boom, close: closed }),
      getLLMExamples: boom,
      getLLMStats: boom,
    }));
    const { result, parsed } = await call(name, args);
    expect(result.isError).toBe(true);
    expect(parsed.ok).toBe(false);
    expect(parsed.code).toBe('PATTERN_DATABASE_ERROR');
    expect(parsed.error).toContain(name);
    expect(parsed.error).toContain('unable to open database file');
    // Nothing a caller could read as a result.
    expect(parsed.patterns).toBeUndefined();
    expect(parsed.examples).toBeUndefined();
    expect(parsed.source).toBeUndefined();
    return parsed;
  };
  afterEach(() => {
    vi.doUnmock('@hyperfixi/patterns-reference');
    closed.mockClear();
  });

  it('search_patterns reports the error', async () => {
    await failing('search_patterns', { query: 'toggle' });
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('get_examples reports the error', async () => {
    await failing('get_examples', { prompt: 'toggle a class' });
  });

  it('get_pattern_stats reports the error', async () => {
    await failing('get_pattern_stats', {});
    expect(closed).toHaveBeenCalledTimes(1);
  });
});
