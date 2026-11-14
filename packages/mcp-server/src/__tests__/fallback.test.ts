/**
 * Phase 7: Fallback Behavior Tests
 *
 * The analysis tools' keyword scans. analyze_complexity and analyze_metrics use theirs only
 * for code @lokascript/semantic cannot read (every input here that parses is measured from
 * its parse, and the tests say so); recognize_intent has no other path.
 */
import { describe, it, expect } from 'vitest';
import { handleAnalysisTool, analysisTools } from '../tools/analysis.js';

// Helper to safely extract text from MCP content
function getTextContent(result: { content: Array<{ type: string; text?: string }> }): string {
  const item = result.content[0];
  if (item.type === 'text' && item.text) {
    return item.text;
  }
  return '';
}

// =============================================================================
// Input Validation Tests
// =============================================================================

describe('Analysis tools input validation', () => {
  it('returns error for missing code parameter', async () => {
    const result = await handleAnalysisTool('analyze_complexity', {});

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.error).toContain('Missing required parameter');
  });

  it('returns error for null code parameter', async () => {
    const result = await handleAnalysisTool('analyze_complexity', { code: null });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.error).toContain('Missing required parameter');
  });

  it('returns error for non-string code parameter', async () => {
    const result = await handleAnalysisTool('analyze_complexity', { code: 123 });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.error).toContain('Missing required parameter');
  });
});

// =============================================================================
// Fallback Behavior Tests
// =============================================================================

const analyze = async (name: string, args: Record<string, unknown>) => {
  const result = await handleAnalysisTool(name, args);
  expect(result.isError).toBeUndefined();
  return JSON.parse(getTextContent(result));
};

const SIMPLE_NOTE = 'Simple analysis (@lokascript/semantic could not read the code)';

describe('analyze_complexity fallback', () => {
  it('measures code that parses from its parse, with no fallback note', async () => {
    const parsed = await analyze('analyze_complexity', { code: 'on click toggle .active' });
    expect(parsed.note).toBeUndefined();
    expect(parsed.cyclomatic).toBe(1);
    expect(parsed).not.toHaveProperty('commandCount');
    expect(parsed).not.toHaveProperty('estimatedComplexity');
  });

  it('returns simple metrics for code that does not parse', async () => {
    const parsed = await analyze('analyze_complexity', { code: '123 toggle .active' });
    expect(parsed.note).toBe(SIMPLE_NOTE);
    expect(parsed.commandCount).toBe(1);
    expect(parsed.estimatedComplexity).toBe(1);
    expect(parsed).not.toHaveProperty('cyclomatic');
  });

  it('counts commands in code that does not parse', async () => {
    const parsed = await analyze('analyze_complexity', {
      code: '123 toggle .active add .highlight',
    });
    expect(parsed.note).toBe(SIMPLE_NOTE);
    expect(parsed.commandCount).toBe(2);
    expect(parsed.commands).toEqual(['toggle', 'add']);
  });

  it('counts conditionals in code that does not parse', async () => {
    const parsed = await analyze('analyze_complexity', {
      code: '123 wait 1s unless x toggle .a',
    });
    expect(parsed.note).toBe(SIMPLE_NOTE);
    expect(parsed.conditionalCount).toBe(1);
    expect(parsed.estimatedComplexity).toBe(2);
  });

  it('counts the if of code that parses as one decision', async () => {
    const parsed = await analyze('analyze_complexity', {
      code: 'on click if .active toggle .active else add .active end',
    });
    expect(parsed.note).toBeUndefined();
    expect(parsed.cyclomatic).toBe(2);
  });
});

describe('analyze_metrics fallback', () => {
  it('measures code that parses from its parse', async () => {
    const parsed = await analyze('analyze_metrics', { code: 'on click toggle .active' });
    expect(parsed.note).toBeUndefined();
    expect(parsed.complexity.cyclomatic).toBe(1);
    expect(parsed).not.toHaveProperty('lines');
  });

  it('returns simple metrics for code that does not parse', async () => {
    const parsed = await analyze('analyze_metrics', { code: '123 toggle .active' });
    expect(parsed.note).toBe(SIMPLE_NOTE);
    expect(parsed.lines).toBe(1);
    expect(parsed.commandCount).toBe(1);
    expect(parsed).not.toHaveProperty('complexity');
  });
});

describe('explain_code fallback', () => {
  it('explains code that parses from its parse', async () => {
    const parsed = await analyze('explain_code', {
      code: 'on click toggle .active',
      audience: 'beginner',
    });
    expect(parsed.overview).toBe('`on click` runs `toggle .active`.');
    expect(parsed.note).toBeUndefined();
  });

  it('names the event of a handler whose body does not parse, and says what it left out', async () => {
    const parsed = await analyze('explain_code', { code: 'on submit validate form' });
    expect(parsed.overview).toBe('`on submit` runs nothing it could parse.');
    expect(parsed.note).toContain('"validate form"');
  });

  it('detects fetch commands in explanation', async () => {
    const parsed = await analyze('explain_code', { code: 'on click fetch /api/data' });
    expect(parsed.overview).toBe('`on click` runs `fetch "/api/data"`.');
  });

  it("scans keywords, in a beginner's words, for code that does not parse", async () => {
    const parsed = await analyze('explain_code', {
      code: '123 toggle .active',
      audience: 'beginner',
    });
    expect(parsed.note).toMatch(/keyword scan/);
    expect(parsed.overview).toBe('It switches on/off .active.');
  });
});

// recognize_intent is a keyword match and nothing else: @hyperfixi/core/ast-utils exports no
// recognizeIntent, so every answer carries the note.
describe('recognize_intent fallback', () => {
  const intentsOf = async (code: string) => {
    const parsed = await analyze('recognize_intent', { code });
    expect(parsed.note).toBe('Pattern-based analysis');
    return parsed;
  };

  it('returns pattern-based intent for event handling code', async () => {
    const parsed = await intentsOf('on click toggle .active');
    expect(parsed.primaryIntent).toBe('event-handling');
    expect(parsed.allIntents).toEqual(['event-handling', 'dom-manipulation']);
  });

  it('detects data fetching intent', async () => {
    const parsed = await intentsOf('on click fetch /api/users then put result into #list');
    expect(parsed.allIntents).toContain('data-fetching');
  });

  it('detects form handling intent', async () => {
    const parsed = await intentsOf('on submit validate form then send data');
    expect(parsed.allIntents).toContain('form-handling');
  });

  it('detects state management intent', async () => {
    const parsed = await intentsOf('on click set :count to :count + 1');
    expect(parsed.allIntents).toContain('state-management');
  });

  it('returns general-interactivity for unknown patterns', async () => {
    const parsed = await intentsOf('call myCustomFunction()');
    expect(parsed.primaryIntent).toBe('general-interactivity');
    expect(parsed.allIntents).toEqual(['general-interactivity']);
  });
});

// =============================================================================
// Tool Definition Tests
// =============================================================================

describe('Analysis tool definitions', () => {
  it('exports 4 analysis tools', () => {
    expect(analysisTools).toHaveLength(4);
  });

  it('all tools have required schema properties', () => {
    for (const tool of analysisTools) {
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.properties).toHaveProperty('code');
      expect(tool.inputSchema.required).toContain('code');
    }
  });
});
