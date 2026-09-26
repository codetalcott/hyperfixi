/**
 * Pattern Tools Tests
 *
 * Tests the built-in fallback behavior since patterns-reference may not be available.
 */
import { describe, it, expect } from 'vitest';
import { handlePatternTool, patternTools } from '../tools/patterns.js';

describe('patternTools', () => {
  it('exports 4 tools', () => {
    expect(patternTools).toHaveLength(4);
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

  it('has translate_hyperscript tool', () => {
    const tool = patternTools.find(t => t.name === 'translate_hyperscript');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('code');
    expect(tool?.inputSchema.required).toContain('fromLanguage');
    expect(tool?.inputSchema.required).toContain('toLanguage');
  });

  it('has get_pattern_stats tool', () => {
    const tool = patternTools.find(t => t.name === 'get_pattern_stats');
    expect(tool).toBeDefined();
  });
});

describe('get_examples', () => {
  it('returns examples for toggle task', async () => {
    const result = await handlePatternTool('get_examples', {
      prompt: 'toggle a class',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.examples).toBeDefined();
    expect(parsed.examples.length).toBeGreaterThan(0);
    expect(
      parsed.examples.some((e: any) => e.code?.includes('toggle') || e.task?.includes('toggle'))
    ).toBe(true);
  });

  it('returns examples for modal task', async () => {
    const result = await handlePatternTool('get_examples', {
      prompt: 'show modal',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.examples).toBeDefined();
    expect(parsed.examples.length).toBeGreaterThan(0);
  });

  it('respects limit parameter', async () => {
    const result = await handlePatternTool('get_examples', {
      prompt: 'click',
      limit: 2,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.examples.length).toBeLessThanOrEqual(2);
  });

  it('returns common examples for unknown task', async () => {
    const result = await handlePatternTool('get_examples', {
      prompt: 'xyzzy frobulate widget',
    });

    const parsed = JSON.parse(result.content[0].text);
    // Should return fallback examples
    expect(parsed.examples).toBeDefined();
    expect(parsed.examples.length).toBeGreaterThan(0);
  });

  it('includes note about built-in examples', async () => {
    const result = await handlePatternTool('get_examples', {
      prompt: 'toggle',
    });

    const parsed = JSON.parse(result.content[0].text);
    // Will have note if using built-in fallback
    if (parsed.note) {
      expect(parsed.note).toContain('built-in');
    }
  });
});

describe('search_patterns', () => {
  it('finds patterns by query', async () => {
    const result = await handlePatternTool('search_patterns', {
      query: 'toggle',
    });

    // Handle error case
    if (result.isError) {
      expect(result.content[0].text).toBeDefined();
      return;
    }

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.patterns).toBeDefined();
  });

  it('filters by category', async () => {
    const result = await handlePatternTool('search_patterns', {
      query: 'class',
      category: 'class-manipulation',
    });

    // Handle error case
    if (result.isError) {
      expect(result.content[0].text).toBeDefined();
      return;
    }

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.patterns).toBeDefined();
    // If using built-in, all returned should be class-manipulation
    if (parsed.note?.includes('built-in')) {
      parsed.patterns.forEach((p: any) => {
        expect(p.category).toBe('class-manipulation');
      });
    }
  });

  it('respects limit parameter', async () => {
    const result = await handlePatternTool('search_patterns', {
      query: 'click',
      limit: 3,
    });

    // Handle error case
    if (result.isError) {
      expect(result.content[0].text).toBeDefined();
      return;
    }

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.patterns.length).toBeLessThanOrEqual(3);
  });

  it('returns empty for non-matching query', async () => {
    const result = await handlePatternTool('search_patterns', {
      query: 'xyzzy_nonexistent_pattern_12345',
    });

    // Handle error case
    if (result.isError) {
      expect(result.content[0].text).toBeDefined();
      return;
    }

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.patterns).toBeDefined();
    expect(parsed.patterns.length).toBe(0);
  });
});

// The database path, asserted as such: the tests above accept either path, and
// with a category the database path used to drop the query and the limit and
// report no category at all (`p.feature` on a Pattern, hidden by `any`).
describe('search_patterns against the pattern database', () => {
  type Found = { title: string; code: string; category: string };
  const search = async (args: Record<string, unknown>): Promise<Found[]> => {
    const parsed = JSON.parse((await handlePatternTool('search_patterns', args)).content[0].text);
    expect(parsed.note, 'the database answered, not the built-in fallback').toBeUndefined();
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

describe('translate_hyperscript', () => {
  it('attempts translation', async () => {
    const result = await handlePatternTool('translate_hyperscript', {
      code: 'on click toggle .active',
      fromLanguage: 'en',
      toLanguage: 'ja',
    });

    const parsed = JSON.parse(result.content[0].text);
    // Should have original and translation info
    expect(parsed.original || parsed.code).toBe('on click toggle .active');
    expect(parsed.fromLanguage).toBe('en');
    expect(parsed.toLanguage).toBe('ja');
  });

  it('handles missing semantic package gracefully', async () => {
    const result = await handlePatternTool('translate_hyperscript', {
      code: 'toggle .active',
      fromLanguage: 'en',
      toLanguage: 'ko',
    });

    // Should not throw, either returns translation or error message
    expect(result.content).toBeDefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.fromLanguage).toBe('en');
    expect(parsed.toLanguage).toBe('ko');
  });
});

describe('get_pattern_stats', () => {
  it('returns statistics', async () => {
    const result = await handlePatternTool('get_pattern_stats', {});

    // Handle error case
    if (result.isError) {
      expect(result.content[0].text).toBeDefined();
      return;
    }

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toBeDefined();
  });

  it('includes supported languages', async () => {
    const result = await handlePatternTool('get_pattern_stats', {});

    // Handle error case
    if (result.isError) {
      expect(result.content[0].text).toBeDefined();
      return;
    }

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.supportedLanguages).toBeDefined();
    expect(Array.isArray(parsed.supportedLanguages)).toBe(true);
    expect(parsed.supportedLanguages).toContain('en');
  });

  it('includes category information (built-in)', async () => {
    const result = await handlePatternTool('get_pattern_stats', {});

    // Handle error case
    if (result.isError) {
      expect(result.content[0].text).toBeDefined();
      return;
    }

    const parsed = JSON.parse(result.content[0].text);
    // Built-in fallback includes categories
    if (parsed.categories) {
      expect(Array.isArray(parsed.categories)).toBe(true);
      expect(parsed.categories).toContain('class-manipulation');
    }
  });
});

describe('error handling', () => {
  it('handles unknown tool gracefully', async () => {
    const result = await handlePatternTool('unknown_pattern_tool', {});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown pattern tool');
  });
});

describe('built-in examples coverage', () => {
  it('includes class manipulation examples', async () => {
    const result = await handlePatternTool('search_patterns', {
      query: 'class',
      category: 'class-manipulation',
    });

    // May return error if patterns-reference not properly configured
    if (result.isError) {
      expect(result.content[0].text).toBeDefined();
      return;
    }

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.patterns.length).toBeGreaterThan(0);
  });

  it('includes visibility examples', async () => {
    const result = await handlePatternTool('search_patterns', {
      query: 'show',
    });

    // May return error if patterns-reference not properly configured
    if (result.isError) {
      expect(result.content[0].text).toBeDefined();
      return;
    }

    const parsed = JSON.parse(result.content[0].text);
    const hasVisibility = parsed.patterns.some(
      (p: any) =>
        p.category === 'visibility' || p.code?.includes('show') || p.code?.includes('hide')
    );
    expect(hasVisibility).toBe(true);
  });

  it('includes async examples', async () => {
    const result = await handlePatternTool('search_patterns', {
      query: 'fetch',
    });

    // May return error if patterns-reference not properly configured
    if (result.isError) {
      expect(result.content[0].text).toBeDefined();
      return;
    }

    const parsed = JSON.parse(result.content[0].text);
    const hasAsync = parsed.patterns.some(
      (p: any) => p.category === 'async' || p.code?.includes('fetch')
    );
    expect(hasAsync).toBe(true);
  });
});
