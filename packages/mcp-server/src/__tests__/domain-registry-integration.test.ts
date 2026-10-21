import { describe, it, expect } from 'vitest';
import { createDomainRegistry } from '../tools/domain-registry-setup.js';
import {
  isMultiLineBehaviorSpec,
  handleBehaviorSpecMultiLine,
} from '../tools/behaviorspec-extras.js';

// =============================================================================
// Registry Setup Tests
// =============================================================================

describe('DomainRegistry Integration', () => {
  it('registers 6 domains: bdd left in domains 5.0.0, learn in 7.1.0 (to lokascript-learn)', () => {
    const registry = createDomainRegistry();
    const names = registry.getDomainNames().sort();
    expect(names).toEqual(['behaviorspec', 'flow', 'llm', 'sql', 'todo', 'voice']);
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
    expect(toolNames).not.toContain('parse_bdd');
    expect(toolNames).toContain('parse_behaviorspec');
    expect(toolNames).not.toContain('parse_learn');
  });

  it('tool descriptions advertise the expanded language sets', () => {
    const registry = createDomainRegistry();
    const tools = registry.getToolDefinitions();

    // Bridge-expanded domains list all 11 languages (was 8 pre-bridge).
    const parseSql = tools.find(t => t.name === 'parse_sql')!;
    expect(parseSql.description).toContain('en, es, ja, ar, ko, zh, tr, fr, de, pt, ru');

    // behaviorspec keeps the pre-bridge 8.
    const parseBs = tools.find(t => t.name === 'parse_behaviorspec')!;
    expect(parseBs.description).toContain('en, es, ja, ar, ko, zh, tr, fr');
    expect(parseBs.description).not.toContain('ru');
  });

  it('uses correct inputLabel per domain', () => {
    const registry = createDomainRegistry();
    const tools = registry.getToolDefinitions();

    const parseSql = tools.find(t => t.name === 'parse_sql')!;
    expect(parseSql.inputSchema.required).toContain('query');

    const parseFlow = tools.find(t => t.name === 'parse_flow')!;
    expect(parseFlow.inputSchema.required).toContain('pipeline');

    const parseBs = tools.find(t => t.name === 'parse_behaviorspec')!;
    expect(parseBs.inputSchema.required).toContain('scenario');
  });

  it('canHandle returns true for registered domain tools', () => {
    const registry = createDomainRegistry();
    expect(registry.canHandle('parse_sql')).toBe(true);
    expect(registry.canHandle('compile_bdd')).toBe(false);
    expect(registry.canHandle('validate_todo')).toBe(true);
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

  it('todo single-step compile dispatches through registry', async () => {
    const registry = createDomainRegistry();
    const result = await registry.handleToolCall('compile_todo', {
      command: 'add milk to groceries',
      language: 'en',
    });

    expect(result).not.toBeNull();
    expect(result!.isError).toBeUndefined();

    const data = JSON.parse(result!.content[0].text);
    expect(data.ok).toBe(true);
  });

  // Phase 3 of the domains rethink: a parse that leaves input unread, and a translation that does not
  // read back as its source, are refused with a diagnostic rather than answered.
  it('compile_sql refuses a trailing word with an UNREAD_INPUT diagnostic', async () => {
    const registry = createDomainRegistry();
    const result = await registry.handleToolCall('compile_sql', {
      query: 'select name from users banana',
      language: 'en',
    });
    const data = JSON.parse(result!.content[0].text);
    expect(data.ok).toBe(false);
    expect(data.diagnostics[0].code).toBe('UNREAD_INPUT');
  });

  it('translate_sql answers ok when the rendering reads back as the source', async () => {
    const registry = createDomainRegistry();
    const result = await registry.handleToolCall('translate_sql', {
      query: 'select name from users',
      from: 'en',
      to: 'es',
    });
    expect(result!.isError).toBeUndefined();
    const data = JSON.parse(result!.content[0].text);
    expect(data.ok).toBe(true);
    expect(data.rendered.language).toBe('es');
  });

  it('returns null for unknown domain tools', async () => {
    const registry = createDomainRegistry();
    const result = await registry.handleToolCall('parse_unknown', { input: 'test' });
    expect(result).toBeNull();
  });

  // Bridge-expansion end-to-end: the three languages added by the
  // framework↔semantic bridge dispatch through the registry, not just
  // through direct DSL calls (arc Phase 3 verification).
  it.each([
    ['de', 'auswählen name von users'],
    ['pt', 'selecionar nome de usuarios'],
    ['ru', 'выбрать name из users'],
  ])('SQL parse + compile round-trips %s through the registry', async (language, query) => {
    const registry = createDomainRegistry();

    const parsed = await registry.handleToolCall('parse_sql', { query, language });
    expect(parsed).not.toBeNull();
    expect(parsed!.isError).toBeUndefined();
    const parsedData = JSON.parse(parsed!.content[0].text);
    expect(parsedData.action).toBe('select');
    expect(parsedData.language).toBe(language);

    const compiled = await registry.handleToolCall('compile_sql', { query, language });
    expect(compiled).not.toBeNull();
    expect(compiled!.isError).toBeUndefined();
    const compiledData = JSON.parse(compiled!.content[0].text);
    expect(compiledData.ok).toBe(true);
    expect(compiledData.code).toMatch(/^SELECT /);
  });
});

// =============================================================================
// Multi-Step Detection Tests
// =============================================================================

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

  // lokascript-domains #54: on domains 5.0.1 this answered ok: true with the test body
  // `await page.goto('/login');` and the two later lines gone.
  const unreadLines =
    'test "Login"\n  given page /login\n  when I click #submit\n  then #result is visible';

  it('refuses to compile a spec with a line it cannot read, naming each line', async () => {
    const result = await handleBehaviorSpecMultiLine('compile_behaviorspec', {
      scenario: unreadLines,
      language: 'en',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.ok).toBe(false);
    expect(data.code).toBeUndefined();
    expect(data.errors).toHaveLength(2);
    expect(data.errors[0]).toMatch(/^Line 3: .*when I click #submit/);
    expect(data.partial).toContain("page.goto('/login')");
  });

  it('compiles every step of a spec it reads', async () => {
    const result = await handleBehaviorSpecMultiLine('compile_behaviorspec', {
      scenario:
        'test "Login"\n  given page /login\n  when user clicks on #submit\n    #toast appears',
      language: 'en',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.ok).toBe(true);
    expect(data.code).toContain("page.locator('#submit').click()");
    expect(data.code).toContain("expect(page.locator('#toast')).toBeVisible()");
  });

  it('validates and translates as compile does', async () => {
    // Each line parses, but the URL takes the rest of its line: the compiler refuses it.
    const oneLine = 'test "B"\n  given page /login when user clicks on #b';
    const valid = JSON.parse(
      (
        await handleBehaviorSpecMultiLine('validate_behaviorspec', {
          scenario: oneLine,
          language: 'en',
        })
      ).content[0].text
    );
    expect(valid.valid).toBe(false);
    expect(valid.errors.join('\n')).toMatch(/leaving "when user clicks on #b" unread/);

    const translated = JSON.parse(
      (
        await handleBehaviorSpecMultiLine('translate_behaviorspec', {
          scenario: unreadLines,
          from: 'en',
          to: 'es',
        })
      ).content[0].text
    );
    expect(translated.translated).toBeNull();
    expect(translated.playwright).toBeNull();
    expect(translated.errors).toHaveLength(2);
  });
});
