import { describe, it, expect } from 'vitest';
import { createDomainRegistry } from '../tools/domain-registry-setup.js';
import { isMultiStepBDD, handleBDDMultiStep } from '../tools/bdd-extras.js';
import {
  isMultiLineBehaviorSpec,
  handleBehaviorSpecMultiLine,
} from '../tools/behaviorspec-extras.js';

// =============================================================================
// Registry Setup Tests
// =============================================================================

describe('DomainRegistry Integration', () => {
  it('registers all 6 domains', () => {
    const registry = createDomainRegistry();
    const names = registry.getDomainNames().sort();
    expect(names).toEqual(['bdd', 'behaviorspec', 'jsx', 'llm', 'sql', 'todo']);
  });

  it('generates 24 tool definitions (4 per domain)', () => {
    const registry = createDomainRegistry();
    const tools = registry.getToolDefinitions();
    expect(tools).toHaveLength(24);

    const toolNames = tools.map(t => t.name).sort();
    expect(toolNames).toContain('parse_sql');
    expect(toolNames).toContain('compile_sql');
    expect(toolNames).toContain('validate_sql');
    expect(toolNames).toContain('translate_sql');
    expect(toolNames).toContain('parse_bdd');
    expect(toolNames).toContain('parse_jsx');
    expect(toolNames).toContain('parse_behaviorspec');
  });

  it('uses correct inputLabel per domain', () => {
    const registry = createDomainRegistry();
    const tools = registry.getToolDefinitions();

    const parseSql = tools.find(t => t.name === 'parse_sql')!;
    expect(parseSql.inputSchema.required).toContain('query');

    const parseBdd = tools.find(t => t.name === 'parse_bdd')!;
    expect(parseBdd.inputSchema.required).toContain('scenario');

    const parseJsx = tools.find(t => t.name === 'parse_jsx')!;
    expect(parseJsx.inputSchema.required).toContain('code');

    const parseBs = tools.find(t => t.name === 'parse_behaviorspec')!;
    expect(parseBs.inputSchema.required).toContain('scenario');
  });

  it('canHandle returns true for registered domain tools', () => {
    const registry = createDomainRegistry();
    expect(registry.canHandle('parse_sql')).toBe(true);
    expect(registry.canHandle('compile_bdd')).toBe(true);
    expect(registry.canHandle('validate_jsx')).toBe(true);
    expect(registry.canHandle('translate_behaviorspec')).toBe(true);
  });

  it('canHandle returns false for non-domain tools', () => {
    const registry = createDomainRegistry();
    expect(registry.canHandle('analyze_complexity')).toBe(false);
    expect(registry.canHandle('get_diagnostics')).toBe(false);
    expect(registry.canHandle('compile_hyperscript')).toBe(false);
  });

  it('SQL single-step parse dispatches through registry', async () => {
    const registry = createDomainRegistry();
    const result = await registry.handleToolCall('parse_sql', {
      query: 'select name from users',
      language: 'en',
    });

    expect(result).not.toBeNull();
    expect(result!.isError).toBeUndefined();

    const data = JSON.parse(result!.content[0].text);
    expect(data.action).toBe('select');
    expect(data.language).toBe('en');
  });

  it('JSX single-step compile dispatches through registry', async () => {
    const registry = createDomainRegistry();
    const result = await registry.handleToolCall('compile_jsx', {
      code: 'element div with className "app"',
      language: 'en',
    });

    expect(result).not.toBeNull();
    expect(result!.isError).toBeUndefined();

    const data = JSON.parse(result!.content[0].text);
    expect(data.ok).toBe(true);
  });

  it('returns null for unknown domain tools', async () => {
    const registry = createDomainRegistry();
    const result = await registry.handleToolCall('parse_unknown', { input: 'test' });
    expect(result).toBeNull();
  });
});

// =============================================================================
// Multi-Step Detection Tests
// =============================================================================

describe('BDD Multi-Step Detection', () => {
  it('detects comma-separated steps as multi-step', () => {
    expect(isMultiStepBDD({ scenario: 'given #button is exists, when click on #button' })).toBe(
      true
    );
  });

  it('detects newline-separated steps as multi-step', () => {
    expect(isMultiStepBDD({ scenario: 'given #button is exists\nwhen click on #button' })).toBe(
      true
    );
  });

  it('detects single step as not multi-step', () => {
    expect(isMultiStepBDD({ scenario: 'given #button is exists' })).toBe(false);
  });

  it('returns false for empty scenario', () => {
    expect(isMultiStepBDD({ scenario: '' })).toBe(false);
    expect(isMultiStepBDD({})).toBe(false);
  });
});

describe('BehaviorSpec Multi-Line Detection', () => {
  it('detects multi-line input', () => {
    expect(isMultiLineBehaviorSpec({ scenario: 'test "Login"\n  given page /login' })).toBe(true);
  });

  it('detects single-line as not multi-line', () => {
    expect(isMultiLineBehaviorSpec({ scenario: 'given page /login' })).toBe(false);
  });

  it('returns false for empty scenario', () => {
    expect(isMultiLineBehaviorSpec({ scenario: '' })).toBe(false);
    expect(isMultiLineBehaviorSpec({})).toBe(false);
  });
});

// =============================================================================
// Multi-Step Handler Tests
// =============================================================================

describe('BDD Multi-Step Handler', () => {
  it('parses multi-step BDD scenario', async () => {
    const result = await handleBDDMultiStep('parse_bdd', {
      scenario: 'given #button is exists, when click on #button, then #button has .active',
      language: 'en',
    });

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.type).toBe('scenario');
    expect(data.stepCount).toBeGreaterThan(0);
  });

  it('returns error for missing scenario', async () => {
    const result = await handleBDDMultiStep('parse_bdd', {});
    expect(result.isError).toBe(true);
  });
});

describe('BehaviorSpec Multi-Line Handler', () => {
  it('parses multi-line BehaviorSpec', async () => {
    const result = await handleBehaviorSpecMultiLine('parse_behaviorspec', {
      scenario:
        'test "Login"\n  given page /login\n  when user clicks on #submit\n    #toast appears',
      language: 'en',
    });

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.type).toBe('spec');
    expect(data.testCount).toBeGreaterThan(0);
  });

  it('returns error for missing scenario', async () => {
    const result = await handleBehaviorSpecMultiLine('parse_behaviorspec', {});
    expect(result.isError).toBe(true);
  });
});
