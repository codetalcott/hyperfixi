/**
 * Analysis Tools Tests
 *
 * @hyperfixi/core/ast-utils and @lokascript/semantic are dependencies, so code that parses
 * is measured from its parse; the keyword scan ("Simple analysis") answers only for code
 * semantic cannot read. Each test says which of the two it expects.
 */
import { describe, it, expect } from 'vitest';
import { handleAnalysisTool, analysisTools } from '../tools/analysis.js';

describe('analysisTools', () => {
  it('exports 4 tools', () => {
    expect(analysisTools).toHaveLength(4);
  });

  it('has analyze_complexity tool', () => {
    const tool = analysisTools.find(t => t.name === 'analyze_complexity');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('code');
  });

  it('has analyze_metrics tool', () => {
    const tool = analysisTools.find(t => t.name === 'analyze_metrics');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('code');
  });

  it('has explain_code tool', () => {
    const tool = analysisTools.find(t => t.name === 'explain_code');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('code');
    expect(tool?.inputSchema.properties?.audience).toBeDefined();
    expect(tool?.inputSchema.properties?.detail).toBeDefined();
  });

  it('has recognize_intent tool', () => {
    const tool = analysisTools.find(t => t.name === 'recognize_intent');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('code');
  });
});

const analyze = async (name: string, args: Record<string, unknown>) => {
  const result = await handleAnalysisTool(name, args);
  return { result, parsed: JSON.parse(result.content[0].text) };
};

/** Code semantic cannot read: its parse returns no node, so the keyword scan answers. */
const UNPARSEABLE = '123 wait 1s toggle .a';

describe('analyze_complexity', () => {
  it('returns complexity result', async () => {
    const result = await handleAnalysisTool('analyze_complexity', {
      code: 'on click toggle .active',
    });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.cyclomatic).toBe(1);
    expect(parsed.cognitive).toBe(0);
    expect(parsed.halstead.vocabulary).toBeGreaterThan(0);
    expect(parsed.summary).toBe('Cyclomatic: 1, Cognitive: 0');
    // From the parse, not the keyword scan
    expect(parsed.note).toBeUndefined();
    expect(parsed.estimatedComplexity).toBeUndefined();
  });

  it('refuses empty code', async () => {
    const { result, parsed } = await analyze('analyze_complexity', { code: '' });
    expect(result.isError).toBe(true);
    expect(parsed.error).toBe('Missing required parameter: code');
  });

  it('handles complex code with conditionals', async () => {
    const result = await handleAnalysisTool('analyze_complexity', {
      code: 'on click if :count > 0 toggle .active else add .inactive end',
    });

    const parsed = JSON.parse(result.content[0].text);
    // One decision: the `if`
    expect(parsed.cyclomatic).toBe(2);
    expect(parsed.cognitive).toBe(2);
  });

  it('handles loops in complexity calculation', async () => {
    const result = await handleAnalysisTool('analyze_complexity', {
      code: 'on click repeat 5 times toggle .active wait 1s end',
    });

    const parsed = JSON.parse(result.content[0].text);
    // A counted loop has no condition: it is not a decision point
    expect(parsed.cyclomatic).toBe(1);

    // `repeat while` and `repeat for` are
    for (const code of [
      'on click repeat while :n < 3 increment :n end',
      'on click repeat for x in <li/> add .a to x end',
    ]) {
      expect((await analyze('analyze_complexity', { code })).parsed.cyclomatic, code).toBe(2);
    }
  });
});

describe('analyze_metrics', () => {
  it('returns metrics result', async () => {
    const result = await handleAnalysisTool('analyze_metrics', {
      code: 'on click toggle .active then add .highlight',
    });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.complexity.cyclomatic).toBe(1);
    expect(parsed.patterns.map((p: { type: string }) => p.type)).toContain('event-handler');
    expect(Array.isArray(parsed.smells)).toBe(true);
    expect(parsed.summary).toBe(
      `Found ${parsed.patterns.length} patterns, ${parsed.smells.length} code smells`
    );
    expect(parsed.note).toBeUndefined();
  });

  it('extracts commands from code', async () => {
    const result = await handleAnalysisTool('analyze_metrics', {
      code: 'on click toggle .a then add .b then remove .c',
    });

    const parsed = JSON.parse(result.content[0].text);
    // The handler it found carries the three commands, in order
    const handler = parsed.patterns.find((p: { type: string }) => p.type === 'event-handler');
    expect(handler.node.event).toBe('click');
    expect(handler.node.commands[0].commands.map((c: { name: string }) => c.name)).toEqual([
      'toggle',
      'add',
      'remove',
    ]);
  });

  it('lists the commands of code that does not parse, from the keyword scan', async () => {
    const { parsed } = await analyze('analyze_metrics', { code: UNPARSEABLE });
    expect(parsed.note).toContain('Simple analysis');
    expect(parsed.commands).toEqual(['wait', 'toggle']);
    expect(parsed.commandCount).toBe(2);
    expect(parsed.complexity).toBeUndefined();
  });
});

describe('explain_code', () => {
  it('returns explanation for toggle code', async () => {
    const result = await handleAnalysisTool('explain_code', {
      code: 'on click toggle .active',
    });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.overview).toBe('`on click` runs `toggle .active`.');
    expect(parsed.note).toBeUndefined();
  });

  it('respects audience parameter', async () => {
    const result = await handleAnalysisTool('explain_code', {
      code: 'on click toggle .active',
      audience: 'beginner',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.audience).toBe('beginner');
    // A beginner is given each step's roles
    expect(parsed.steps[0].body[0].roles).toContainEqual(
      expect.objectContaining({ role: 'patient', value: '.active' })
    );
  });

  it('respects detail parameter', async () => {
    const result = await handleAnalysisTool('explain_code', {
      code: 'on click toggle .active',
      detail: 'comprehensive',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.detail).toBe('comprehensive');
    expect(parsed.audience).toBe('intermediate');
    expect(parsed.steps[0].body[0].roles).toContainEqual(
      expect.objectContaining({ role: 'patient', value: '.active' })
    );
  });

  it('explains event handlers', async () => {
    const result = await handleAnalysisTool('explain_code', {
      code: 'on click toggle .active',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.overview).toContain('on click');
    expect(parsed.steps[0].does).toBe('Runs each time a click event fires.');
  });

  it('explains fetch operations', async () => {
    const result = await handleAnalysisTool('explain_code', {
      code: 'on click fetch /api/data as json put it into #result',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.overview).toBe(
      '`on click` runs `fetch "/api/data" as json`, then `put it into #result`.'
    );
  });
});

describe('recognize_intent', () => {
  // Its answer is a keyword match, and says so (`note`): core's ast-utils has no
  // recognizeIntent, so there is no other path.
  it('names the intents of a handler', async () => {
    const { result, parsed } = await analyze('recognize_intent', {
      code: 'on click toggle .active',
    });
    expect(result.isError).toBeUndefined();
    expect(parsed.note).toBe('Pattern-based analysis');
    expect(parsed.primaryIntent).toBe('event-handling');
    expect(parsed.allIntents).toEqual(['event-handling', 'dom-manipulation']);
    expect(parsed.confidence).toEqual({ 'event-handling': 0.9, 'dom-manipulation': 0.85 });
  });

  it('names the intents of various inputs', async () => {
    const cases: Array<[string, string[]]> = [
      [
        'on submit prevent default fetch /api',
        ['event-handling', 'data-fetching', 'form-handling'],
      ],
      ['on blur if my value is empty add .error', ['event-handling', 'dom-manipulation']],
    ];

    for (const [code, intents] of cases) {
      const { result, parsed } = await analyze('recognize_intent', { code });
      expect(result.isError, code).toBeUndefined();
      expect(parsed.allIntents, code).toEqual(intents);
    }
  });
});

describe('error handling', () => {
  it('handles unknown tool gracefully', async () => {
    const result = await handleAnalysisTool('unknown_analysis_tool', {
      code: 'test',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown analysis tool');
  });

  it('handles missing code parameter', async () => {
    const { result, parsed } = await analyze('analyze_complexity', {});
    expect(result.isError).toBe(true);
    expect(parsed.error).toBe('Missing required parameter: code');
  });
});

describe('the keyword scan, for code that does not parse', () => {
  it('says it is a simple analysis', async () => {
    const { result, parsed } = await analyze('analyze_complexity', { code: UNPARSEABLE });
    expect(result.isError).toBeUndefined();
    expect(parsed.note).toBe('Simple analysis (@lokascript/semantic could not read the code)');
    expect(parsed.estimatedComplexity).toBe(1);
    expect(parsed.cyclomatic).toBeUndefined();
  });

  it('counts lines', async () => {
    const { parsed } = await analyze('analyze_complexity', {
      code: '123\n  toggle .active\n  wait 1s\n  remove .active',
    });
    expect(parsed.note).toContain('Simple analysis');
    expect(parsed.lines).toBe(4);
  });

  it('is not used for code that parses', async () => {
    const { parsed } = await analyze('analyze_complexity', {
      code: 'on click\n  toggle .active\n  wait 1s\n  remove .active',
    });
    expect(parsed.note).toBeUndefined();
    expect(parsed.lines).toBeUndefined();
    expect(parsed.cyclomatic).toBe(1);
  });
});

describe('explain_code reads the parse', () => {
  // Through 7.2.0 it was a keyword scan that listed commands by kind: toggle → wait → add came
  // out "It toggles .open. It adds .seen to me. It waits 200ms.", without `on #menu`.
  const explain = async (args: Record<string, unknown>) =>
    JSON.parse((await handleAnalysisTool('explain_code', args)).content[0].text);

  it('names each step in the order it runs, with its target', async () => {
    const data = await explain({
      code: 'on click toggle .open on #menu then wait 200ms then add .seen to me',
    });
    expect(data.overview).toBe(
      '`on click` runs `toggle .open on #menu`, then `wait 200ms`, then `add .seen to me`.'
    );
    expect(data.steps[0].body.map((s: { code: string }) => s.code)).toEqual([
      'toggle .open on #menu',
      'wait 200ms',
      'add .seen to me',
    ]);
    expect(data.steps[0].body[0].does).toMatch(/toggle/i);
  });

  it("keeps an if's two branches apart", async () => {
    const data = await explain({
      code: 'on click if me matches .x then hide me else show me end',
    });
    const branch = data.steps[0].body[0];
    expect(branch.body.map((s: { code: string }) => s.code)).toEqual(['hide me']);
    expect(branch.otherwise.map((s: { code: string }) => s.code)).toEqual(['show me']);
  });

  it('lists the roles for a beginner', async () => {
    const data = await explain({ code: 'toggle .open on #menu', audience: 'beginner' });
    expect(data.steps[0].roles).toContainEqual(
      expect.objectContaining({ role: 'destination', value: '#menu' })
    );
  });

  it('says which part did not parse', async () => {
    const data = await explain({ code: 'toggle .a on me then wiggle wobble' });
    expect(data.overview).toBe('It runs `toggle .a on me`.');
    expect(data.note).toContain('wiggle wobble');
  });

  it('falls back to a keyword scan in source order for code that does not parse', async () => {
    const data = await explain({ code: '123 wait 1s toggle .a' });
    expect(data.note).toMatch(/keyword scan/);
    expect(data.overview.indexOf('waits')).toBeLessThan(data.overview.indexOf('toggles'));
  });
});
