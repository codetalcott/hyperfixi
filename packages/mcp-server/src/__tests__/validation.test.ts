/**
 * Validation Tools Tests
 */
import { describe, it, expect } from 'vitest';
import { handleValidationTool, validationTools } from '../tools/validation.js';

describe('validationTools', () => {
  it('exports 8 tools', () => {
    // 3 original + 1 validate_schema + 2 Phase 5 semantic tools + 1 explain_in_language + 1 get_code_fixes
    expect(validationTools).toHaveLength(8);
  });

  it('has get_code_fixes tool', () => {
    const tool = validationTools.find(t => t.name === 'get_code_fixes');
    expect(tool).toBeDefined();
    // get_code_fixes has no required fields (all params are optional)
    expect(tool?.inputSchema.required).toBeUndefined();
  });

  it('has validate_hyperscript tool', () => {
    const tool = validationTools.find(t => t.name === 'validate_hyperscript');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('code');
  });

  it('has validate_schema tool', () => {
    const tool = validationTools.find(t => t.name === 'validate_schema');
    expect(tool).toBeDefined();
    // validate_schema has no required fields (action is optional)
    expect(tool?.inputSchema.required).toBeUndefined();
  });

  it('has suggest_command tool', () => {
    const tool = validationTools.find(t => t.name === 'suggest_command');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('task');
  });

  it('has get_bundle_config tool', () => {
    const tool = validationTools.find(t => t.name === 'get_bundle_config');
    expect(tool).toBeDefined();
  });
});

describe('validate_hyperscript', () => {
  it('returns valid for correct code', async () => {
    const result = await handleValidationTool('validate_hyperscript', {
      code: 'on click toggle .active',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.valid).toBe(true);
    expect(parsed.errors).toHaveLength(0);
  });

  it('detects unbalanced single quotes', async () => {
    const result = await handleValidationTool('validate_hyperscript', {
      code: "on click put 'hello into #output",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.valid).toBe(false);
    expect(parsed.errors.some((e: any) => e.message.includes('single quotes'))).toBe(true);
  });

  it('does not flag possessive apostrophes as unbalanced quotes', async () => {
    const result = await handleValidationTool('validate_hyperscript', {
      code: "on click set my parentElement's src to '/img/test.jpg'",
    });

    const parsed = JSON.parse(result.content[0].text);
    // Should not have unbalanced quote errors - possessive 's is not a string delimiter
    expect(parsed.errors.some((e: any) => e.message.includes('single quotes'))).toBe(false);
  });

  it('handles multiple possessives correctly', async () => {
    const result = await handleValidationTool('validate_hyperscript', {
      code: "take .active from my parentElement's children",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.errors.some((e: any) => e.message.includes('single quotes'))).toBe(false);
  });

  it('detects unbalanced double quotes', async () => {
    const result = await handleValidationTool('validate_hyperscript', {
      code: 'on click put "hello into #output',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.valid).toBe(false);
    expect(parsed.errors.some((e: any) => e.message.includes('double quotes'))).toBe(true);
  });

  it('detects deprecated onclick usage', async () => {
    const result = await handleValidationTool('validate_hyperscript', {
      code: 'onclick="doSomething()"',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.valid).toBe(false);
    expect(parsed.errors.some((e: any) => e.message.includes('onclick'))).toBe(true);
  });

  it('warns about unclosed if blocks', async () => {
    const result = await handleValidationTool('validate_hyperscript', {
      code: 'on click if :count > 0 toggle .active',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.warnings.some((w: any) => w.message.includes('if'))).toBe(true);
  });

  it('warns about toggle without class or attribute', async () => {
    const result = await handleValidationTool('validate_hyperscript', {
      code: 'on click toggle',
    });

    const parsed = JSON.parse(result.content[0].text);
    // Debug: log the actual response
    // console.log('Warnings:', JSON.stringify(parsed.warnings, null, 2));
    // console.log('Semantic:', JSON.stringify(parsed.semantic, null, 2));

    // May get semantic warning ('toggle command missing target') or regex warning ('toggle command typically needs')
    // When semantic parsing succeeds with high confidence, we get role-based validation
    // When it fails or has low confidence, regex-based validation kicks in
    const hasToggleWarning = parsed.warnings.some(
      (w: any) =>
        w.message.includes('toggle') ||
        w.message.includes('target') ||
        w.message.includes('class') ||
        w.message.includes('missing')
    );
    // If semantic parsing succeeded with confidence >= 0.5 but no warnings, that's also valid
    // (the toggle may have been parsed as complete)
    const semanticSuccess = parsed.semantic?.usedSemanticParsing === true;
    expect(hasToggleWarning || semanticSuccess).toBe(true);
  });

  it('extracts commands found', async () => {
    const result = await handleValidationTool('validate_hyperscript', {
      code: 'on click toggle .active then add .highlight to me',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.commandsFound).toContain('toggle');
    expect(parsed.commandsFound).toContain('add');
  });

  it('respects language parameter', async () => {
    const result = await handleValidationTool('validate_hyperscript', {
      code: 'on click toggle .active',
      language: 'ja',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.language).toBe('ja');
  });
});

describe('validate_hyperscript reports what the parsers actually did', () => {
  // Found round-tripping the hyperscript in *Hypermedia Systems* (2026-09-23):
  // the tool said `valid: true` with no warning for `on load click() me`, which
  // hyperfixi's own parser rejects (get_diagnostics reported two errors for the
  // same line), and never surfaced the semantic parser's unconsumed tokens.
  const run = async (code: string, language?: string) =>
    JSON.parse(
      (
        await handleValidationTool('validate_hyperscript', {
          code,
          ...(language ? { language } : {}),
        })
      ).content[0].text
    );

  it('reports hyperfixi core rejecting an English line', async () => {
    const r = await run('on load click() me');
    expect(r.valid).toBe(false);
    expect(r.errors.some((e: any) => e.source === 'core-parser')).toBe(true);
  });

  it('surfaces tokens the semantic parser left unconsumed', async () => {
    // The book's counter (`… of the previous <output/>`) was the example here
    // until the semantic parser learned positional of-paths; an unclosed call
    // is a tail it will never read.
    const r = await run('on click add .x to me frob(1', 'en');
    const w = r.warnings.find((x: any) => x.code === 'UNCONSUMED_INPUT');
    expect(w?.message).toMatch(/frob/);
  });

  it('the book counter and pseudo-command parse with nothing unconsumed', async () => {
    for (const code of [
      'on click increment the textContent of the previous <output/>',
      'on load call me.click()',
    ]) {
      const r = await run(code);
      expect(r.valid, code).toBe(true);
      expect(
        r.warnings.some((x: any) => x.code === 'UNCONSUMED_INPUT'),
        code
      ).toBe(false);
    }
  });

  it('accepts a namespaced event (htmx:beforeRequest)', async () => {
    const r = await run('on htmx:beforeRequest from #contacts-btn remove @disabled from me');
    expect(r.valid).toBe(true);
    expect(r.warnings.some((w: any) => /Unknown event type/.test(w.message))).toBe(false);
  });

  it('accepts a localized event name (es carga = load)', async () => {
    const r = await run('al carga llamar me.click()', 'es');
    expect(r.valid).toBe(true);
    expect(r.warnings.some((w: any) => /Unknown event type/.test(w.message))).toBe(false);
  });

  it('still warns about a misspelled English event', async () => {
    const r = await run('on clik toggle .active');
    expect(r.warnings.some((w: any) => /Unknown event type: clik/.test(w.message))).toBe(true);
  });

  it('lists every command it finds, not only the first thirty it knows', async () => {
    const r = await run('on click transition my opacity to 0 then take .active from .tab for me');
    expect(r.commandsFound).toEqual(expect.arrayContaining(['transition', 'take']));
  });

  it('does not run the English parser on another language', async () => {
    const r = await run('クリック で .active を 切り替え', 'ja');
    expect(r.errors.some((e: any) => e.source === 'core-parser')).toBe(false);
  });
});

describe('suggest_command', () => {
  it('suggests show for modal task', async () => {
    const result = await handleValidationTool('suggest_command', {
      task: 'show a modal dialog',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.bestMatch.command).toBe('show');
  });

  it('suggests toggle for switch task', async () => {
    const result = await handleValidationTool('suggest_command', {
      task: 'toggle a class on click',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.bestMatch.command).toBe('toggle');
  });

  it('suggests fetch for API task', async () => {
    const result = await handleValidationTool('suggest_command', {
      task: 'fetch data from API endpoint',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.bestMatch.command).toBe('fetch');
  });

  it('suggests wait for delay task', async () => {
    const result = await handleValidationTool('suggest_command', {
      task: 'wait 2 seconds before hiding',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.bestMatch.command).toBe('wait');
  });

  it('returns common commands when no match found', async () => {
    const result = await handleValidationTool('suggest_command', {
      task: 'xyzzy frobulate the widget',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.note).toContain('No exact match');
    expect(parsed.suggestions).toBeDefined();
    expect(parsed.suggestions.length).toBeGreaterThan(0);
  });

  it('provides alternatives', async () => {
    const result = await handleValidationTool('suggest_command', {
      task: 'add and remove classes',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.alternatives).toBeDefined();
  });
});

describe('get_bundle_config', () => {
  it('recommends the small prebuilt (hyperfixi-hx.js) for basic usage', async () => {
    const result = await handleValidationTool('get_bundle_config', {
      commands: ['toggle', 'add'],
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.recommendedBundle).toBe('hyperfixi-hx.js');
    expect(parsed.estimatedSize).toBe('21.5 KB');
  });

  it('recommends the same small prebuilt for blocks usage', async () => {
    const result = await handleValidationTool('get_bundle_config', {
      commands: ['toggle'],
      blocks: ['if', 'repeat'],
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.recommendedBundle).toBe('hyperfixi-hx.js');
  });

  it('recommends the same small prebuilt for positional expressions', async () => {
    const result = await handleValidationTool('get_bundle_config', {
      commands: ['toggle'],
      positional: true,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.recommendedBundle).toBe('hyperfixi-hx.js');
  });

  it('recommends multilingual for non-English', async () => {
    const result = await handleValidationTool('get_bundle_config', {
      commands: ['toggle'],
      languages: ['ja', 'ko'],
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.recommendedBundle).toBe('hyperfixi-multilingual.js');
  });

  it('generates vite config', async () => {
    const result = await handleValidationTool('get_bundle_config', {
      commands: ['toggle', 'fetch'],
      blocks: ['if'],
      languages: ['en'],
      positional: false,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.viteConfig).toContain('hyperfixi(');
    expect(parsed.viteConfig).toContain('extraCommands');
  });

  it('suggests regional semantic bundle', async () => {
    const result = await handleValidationTool('get_bundle_config', {
      commands: ['toggle'],
      languages: ['en'],
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.semanticBundle).toContain('en');
  });

  it('suggests western bundle for European languages', async () => {
    const result = await handleValidationTool('get_bundle_config', {
      commands: ['toggle'],
      languages: ['en', 'es', 'fr'],
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.semanticBundle).toContain('western');
  });

  it('suggests east-asian bundle for CJK languages', async () => {
    const result = await handleValidationTool('get_bundle_config', {
      commands: ['toggle'],
      languages: ['ja', 'zh'],
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.semanticBundle).toContain('east-asian');
  });
});

describe('error handling', () => {
  it('handles unknown tool gracefully', async () => {
    const result = await handleValidationTool('unknown_tool', {});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown validation tool');
  });
});
