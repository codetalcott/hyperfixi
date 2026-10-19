/**
 * Validation Tools Tests
 */
import { describe, it, expect } from 'vitest';
import { handleValidationTool, validationTools } from '../tools/validation.js';

describe('validationTools', () => {
  it('exports 6 tools', () => {
    // validate_schema, suggest_command, get_bundle_config, translate_to_english, explain_in_language, get_code_fixes
    expect(validationTools).toHaveLength(6);
  });

  it('has get_code_fixes tool', () => {
    const tool = validationTools.find(t => t.name === 'get_code_fixes');
    expect(tool).toBeDefined();
    // get_code_fixes has no required fields (all params are optional)
    expect(tool?.inputSchema.required).toBeUndefined();
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
  it("recommends the engine's script-tag bundle (hyperfixi-hs.js) for basic usage", async () => {
    const result = await handleValidationTool('get_bundle_config', {
      commands: ['toggle', 'add'],
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.recommendedBundle).toBe('hyperfixi-hs.js');
    expect(parsed.estimatedSize).toBe('34.1 KB');
  });

  it('recommends the same bundle for blocks usage', async () => {
    const result = await handleValidationTool('get_bundle_config', {
      commands: ['toggle'],
      blocks: ['if', 'repeat'],
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.recommendedBundle).toBe('hyperfixi-hs.js');
  });

  it('recommends the same bundle for positional expressions', async () => {
    const result = await handleValidationTool('get_bundle_config', {
      commands: ['toggle'],
      positional: true,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.recommendedBundle).toBe('hyperfixi-hs.js');
  });

  it('recommends hyperfixi-hs.js with the adapter for non-English', async () => {
    const result = await handleValidationTool('get_bundle_config', {
      commands: ['toggle'],
      languages: ['ja', 'ko'],
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.recommendedBundle).toBe('hyperfixi-hs.js');
    expect(parsed.adapter.package).toBe('@lokascript/hyperscript-adapter');
    expect(parsed.adapter.bundle).toBe('hyperscript-i18n-east-asian.global.js');
    expect(parsed.adapter.setup).toContain('hyperfixi-hs.js');
  });

  it('names no adapter for English', async () => {
    const result = await handleValidationTool('get_bundle_config', {
      commands: ['toggle'],
      languages: ['en'],
    });

    expect(JSON.parse(result.content[0].text).adapter).toBeUndefined();
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

describe('translate_to_english refuses what it would drop (M1 fail-loud)', () => {
  it.each([false, true])('getAllLanguages=%s', async getAllLanguages => {
    const result = await handleValidationTool('translate_to_english', {
      // `halt default` (P56, halt's modes) has no reader yet: the mode is dropped.
      code: 'on click halt default then put 1 into me',
      sourceLanguage: 'en',
      getAllLanguages,
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.refused).toBe(true);
    expect(parsed.lost).toContain('default');
    expect(parsed.english).toBeUndefined();
    expect(parsed.translations).toBeUndefined();
  });
});
