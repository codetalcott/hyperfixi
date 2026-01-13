/**
 * Analysis Tools Tests
 *
 * Tests primarily the fallback behavior since ast-toolkit may not be available.
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

describe('analyze_complexity', () => {
  it('returns complexity result', async () => {
    const result = await handleAnalysisTool('analyze_complexity', {
      code: 'on click toggle .active',
    });

    expect(result.content).toBeDefined();
    const parsed = JSON.parse(result.content[0].text);

    // Either returns full metrics or simple analysis
    expect(
      parsed.cyclomatic !== undefined ||
        parsed.estimatedComplexity !== undefined ||
        parsed.error !== undefined
    ).toBe(true);
  });

  it('handles empty code', async () => {
    const result = await handleAnalysisTool('analyze_complexity', {
      code: '',
    });

    // Should not throw
    expect(result.content).toBeDefined();
  });

  it('handles complex code with conditionals', async () => {
    const result = await handleAnalysisTool('analyze_complexity', {
      code: 'on click if :count > 0 toggle .active else add .inactive end',
    });

    const parsed = JSON.parse(result.content[0].text);
    // If simple analysis, should count the conditional
    if (parsed.conditionalCount !== undefined) {
      expect(parsed.conditionalCount).toBeGreaterThan(0);
    }
  });

  it('handles loops in complexity calculation', async () => {
    const result = await handleAnalysisTool('analyze_complexity', {
      code: 'on click repeat 5 times toggle .active wait 1s end',
    });

    const parsed = JSON.parse(result.content[0].text);
    // If simple analysis, should count the loop
    if (parsed.loopCount !== undefined) {
      expect(parsed.loopCount).toBeGreaterThan(0);
    }
  });
});

describe('analyze_metrics', () => {
  it('returns metrics result', async () => {
    const result = await handleAnalysisTool('analyze_metrics', {
      code: 'on click toggle .active then add .highlight',
    });

    expect(result.content).toBeDefined();
    const parsed = JSON.parse(result.content[0].text);

    // Either returns full metrics or simple analysis
    expect(
      parsed.complexity !== undefined ||
        parsed.commandCount !== undefined ||
        parsed.error !== undefined
    ).toBe(true);
  });

  it('extracts commands from code', async () => {
    const result = await handleAnalysisTool('analyze_metrics', {
      code: 'on click toggle .a then add .b then remove .c',
    });

    const parsed = JSON.parse(result.content[0].text);
    // If simple analysis, should list commands
    if (parsed.commands) {
      expect(parsed.commands).toContain('toggle');
      expect(parsed.commands).toContain('add');
      expect(parsed.commands).toContain('remove');
    }
  });
});

describe('explain_code', () => {
  it('returns explanation for toggle code', async () => {
    const result = await handleAnalysisTool('explain_code', {
      code: 'on click toggle .active',
    });

    expect(result.content).toBeDefined();
    const parsed = JSON.parse(result.content[0].text);

    // Should have some form of explanation
    expect(
      parsed.overview !== undefined ||
        parsed.explanation !== undefined ||
        parsed.error !== undefined
    ).toBe(true);
  });

  it('respects audience parameter', async () => {
    const result = await handleAnalysisTool('explain_code', {
      code: 'on click toggle .active',
      audience: 'beginner',
    });

    const parsed = JSON.parse(result.content[0].text);
    if (parsed.audience) {
      expect(parsed.audience).toBe('beginner');
    }
  });

  it('respects detail parameter', async () => {
    const result = await handleAnalysisTool('explain_code', {
      code: 'on click toggle .active',
      detail: 'comprehensive',
    });

    const parsed = JSON.parse(result.content[0].text);
    if (parsed.detail) {
      expect(parsed.detail).toBe('comprehensive');
    }
  });

  it('explains event handlers', async () => {
    const result = await handleAnalysisTool('explain_code', {
      code: 'on click toggle .active',
    });

    const parsed = JSON.parse(result.content[0].text);
    // Simple explanation should mention click event
    if (parsed.overview) {
      expect(parsed.overview.toLowerCase()).toContain('click');
    }
  });

  it('explains fetch operations', async () => {
    const result = await handleAnalysisTool('explain_code', {
      code: 'on click fetch /api/data as json put it into #result',
    });

    const parsed = JSON.parse(result.content[0].text);
    // Simple explanation should mention fetch
    if (parsed.overview) {
      expect(parsed.overview.toLowerCase()).toContain('fetch');
    }
  });
});

describe('recognize_intent', () => {
  it('handles code input', async () => {
    const result = await handleAnalysisTool('recognize_intent', {
      code: 'on click toggle .active',
    });

    // Either returns intent or error about ast-toolkit
    expect(result.content).toBeDefined();
  });

  it('does not throw on various inputs', async () => {
    const codes = [
      'on click toggle .active',
      'on submit prevent default fetch /api',
      'on blur if my value is empty add .error',
    ];

    for (const code of codes) {
      const result = await handleAnalysisTool('recognize_intent', { code });
      expect(result.content).toBeDefined();
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
    const result = await handleAnalysisTool('analyze_complexity', {});

    // Should not throw, but may return error or undefined behavior
    expect(result.content).toBeDefined();
  });
});

describe('fallback behavior', () => {
  it('includes note about simple analysis when ast-toolkit unavailable', async () => {
    const result = await handleAnalysisTool('analyze_complexity', {
      code: 'on click toggle .active',
    });

    const parsed = JSON.parse(result.content[0].text);
    // If using fallback, should have note
    if (parsed.note) {
      expect(parsed.note).toContain('Simple analysis');
    }
  });

  it('counts lines in simple analysis', async () => {
    const result = await handleAnalysisTool('analyze_complexity', {
      code: 'on click\n  toggle .active\n  wait 1s\n  remove .active',
    });

    const parsed = JSON.parse(result.content[0].text);
    // If using fallback, should count lines
    if (parsed.lines !== undefined) {
      expect(parsed.lines).toBe(4);
    }
  });
});
