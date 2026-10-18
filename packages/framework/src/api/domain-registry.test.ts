import { describe, it, expect, beforeEach } from 'vitest';
import { DomainRegistry } from './domain-registry';
import type { DomainDescriptor, MCPToolDefinition } from './domain-registry';
import { UnreadInputError, type MultilingualDSL } from './create-dsl';
import type { SemanticNode } from '../core/types';

// =============================================================================
// Test Helpers
// =============================================================================

function createMockDSL(): MultilingualDSL {
  return {
    parse(input: string, language: string): SemanticNode {
      // A rendering is `[<lang>] <source>`: read the source back out of it.
      const source = input.replace(/^\[\w+\] /, '');
      if (source.includes(' zzqx'))
        throw new UnreadInputError(
          input,
          language,
          this.parse(source.replace(' zzqx', ''), language),
          'zzqx'
        );
      return {
        kind: 'command',
        action: source.split(/\s+/)[0].toLowerCase(),
        roles: new Map([['raw', { type: 'expression' as const, raw: source }]]),
        metadata: { sourceLanguage: language },
      };
    },
    parseWithConfidence(input: string, language: string) {
      return { node: this.parse(input, language), confidence: 0.9 };
    },
    validate(input: string, language: string) {
      try {
        this.parse(input, language);
        return { valid: true };
      } catch {
        return { valid: false, errors: ['Parse failed'] };
      }
    },
    compile(input: string, language: string) {
      try {
        const node = this.parse(input, language);
        return { ok: true, code: `compiled(${input})`, node };
      } catch (error) {
        if (error instanceof UnreadInputError)
          return { ok: false, errors: [error.message], errorCode: error.code };
        return { ok: false, errors: ['Compile failed'] };
      }
    },
    translate(input: string, fromLanguage: string, toLanguage: string) {
      return `[${toLanguage}] ${input}`;
    },
    getSupportedLanguages() {
      return ['en', 'ja'];
    },
  };
}

/** Writes the whole source, so a rendering reads back. */
function mockRenderer(node: SemanticNode, language: string): string {
  const raw = (node.roles.get('raw') as { raw?: string } | undefined)?.raw ?? node.action;
  return `[${language}] ${raw}`;
}

/** Writes the action alone: `select name` comes out as `select`, which does not read back. */
function lossyRenderer(node: SemanticNode, language: string): string {
  return `[${language}] ${node.action}`;
}

function createTestDescriptor(overrides?: Partial<DomainDescriptor>): DomainDescriptor {
  return {
    name: 'test',
    description: 'Test domain',
    languages: ['en', 'ja'],
    inputLabel: 'query',
    inputDescription: 'Test query',
    getDSL: () => createMockDSL(),
    getRenderer: () => mockRenderer,
    ...overrides,
  };
}

// =============================================================================
// Registration
// =============================================================================

describe('DomainRegistry', () => {
  let registry: DomainRegistry;

  beforeEach(() => {
    registry = new DomainRegistry();
  });

  describe('register', () => {
    it('registers a domain', () => {
      registry.register(createTestDescriptor());
      expect(registry.getDomainNames()).toEqual(['test']);
    });

    it('throws on duplicate registration', () => {
      registry.register(createTestDescriptor());
      expect(() => registry.register(createTestDescriptor())).toThrow(
        'Domain already registered: test'
      );
    });

    it('registers multiple domains', () => {
      registry.register(createTestDescriptor({ name: 'sql' }));
      registry.register(createTestDescriptor({ name: 'bdd' }));
      expect(registry.getDomainNames()).toEqual(['sql', 'bdd']);
    });
  });

  describe('getDescriptor', () => {
    it('returns descriptor for registered domain', () => {
      registry.register(createTestDescriptor());
      const desc = registry.getDescriptor('test');
      expect(desc?.name).toBe('test');
    });

    it('returns undefined for unknown domain', () => {
      expect(registry.getDescriptor('nope')).toBeUndefined();
    });
  });

  // =============================================================================
  // Tool Definition Generation
  // =============================================================================

  describe('getToolDefinitions', () => {
    it('generates 4 standard tools per domain', () => {
      registry.register(createTestDescriptor());
      const tools = registry.getToolDefinitions();
      expect(tools).toHaveLength(4);

      const names = tools.map(t => t.name);
      expect(names).toContain('parse_test');
      expect(names).toContain('compile_test');
      expect(names).toContain('validate_test');
      expect(names).toContain('translate_test');
    });

    it('uses domain inputLabel in tool schemas', () => {
      registry.register(createTestDescriptor({ inputLabel: 'scenario' }));
      const tools = registry.getToolDefinitions();
      const parseTool = tools.find(t => t.name === 'parse_test')!;
      expect(parseTool.inputSchema.properties).toHaveProperty('scenario');
      expect(parseTool.inputSchema.required).toContain('scenario');
    });

    it('includes language list in descriptions', () => {
      registry.register(createTestDescriptor({ languages: ['en', 'es', 'ja'] }));
      const tools = registry.getToolDefinitions();
      expect(tools[0].description).toContain('en, es, ja');
    });

    it('respects tools subset', () => {
      registry.register(createTestDescriptor({ tools: ['parse', 'validate'] }));
      const tools = registry.getToolDefinitions();
      expect(tools).toHaveLength(2);
      const names = tools.map(t => t.name);
      expect(names).toContain('parse_test');
      expect(names).toContain('validate_test');
      expect(names).not.toContain('compile_test');
    });

    it('generates tools for multiple domains', () => {
      registry.register(createTestDescriptor({ name: 'sql' }));
      registry.register(createTestDescriptor({ name: 'bdd' }));
      const tools = registry.getToolDefinitions();
      expect(tools).toHaveLength(8); // 4 per domain
    });
  });

  // =============================================================================
  // canHandle
  // =============================================================================

  describe('canHandle', () => {
    it('returns true for registered domain tools', () => {
      registry.register(createTestDescriptor({ name: 'sql' }));
      expect(registry.canHandle('parse_sql')).toBe(true);
      expect(registry.canHandle('compile_sql')).toBe(true);
      expect(registry.canHandle('validate_sql')).toBe(true);
      expect(registry.canHandle('translate_sql')).toBe(true);
    });

    it('returns false for unregistered domains', () => {
      expect(registry.canHandle('parse_sql')).toBe(false);
    });

    it('returns false for non-matching tool names', () => {
      registry.register(createTestDescriptor({ name: 'sql' }));
      expect(registry.canHandle('analyze_complexity')).toBe(false);
      expect(registry.canHandle('sql_parse')).toBe(false);
    });
  });

  // =============================================================================
  // Tool Call Dispatch
  // =============================================================================

  describe('handleToolCall', () => {
    it('returns null for unrecognized tool names', async () => {
      registry.register(createTestDescriptor());
      const result = await registry.handleToolCall('unknown_tool', {});
      expect(result).toBeNull();
    });

    it('returns null for unregistered domains', async () => {
      const result = await registry.handleToolCall('parse_sql', { query: 'test' });
      expect(result).toBeNull();
    });

    describe('parse', () => {
      it('parses input and returns semantic representation', async () => {
        registry.register(createTestDescriptor());
        const result = await registry.handleToolCall('parse_test', {
          query: 'select name',
          language: 'en',
        });

        expect(result).not.toBeNull();
        const data = JSON.parse(result!.content[0].text);
        expect(data.action).toBe('select');
        expect(data.language).toBe('en');
        expect(data.query).toBe('select name');
      });

      it('returns error for missing input', async () => {
        registry.register(createTestDescriptor());
        const result = await registry.handleToolCall('parse_test', {});
        expect(result!.isError).toBe(true);
      });

      it('defaults language to en', async () => {
        registry.register(createTestDescriptor());
        const result = await registry.handleToolCall('parse_test', { query: 'test' });
        const data = JSON.parse(result!.content[0].text);
        expect(data.language).toBe('en');
      });
    });

    describe('compile', () => {
      it('compiles input to target code', async () => {
        registry.register(createTestDescriptor());
        const result = await registry.handleToolCall('compile_test', {
          query: 'select name',
          language: 'en',
        });

        const data = JSON.parse(result!.content[0].text);
        expect(data.ok).toBe(true);
        expect(data.code).toBe('compiled(select name)');
      });

      it('reports input left unread as an UNREAD_INPUT diagnostic', async () => {
        registry.register(createTestDescriptor());
        const result = await registry.handleToolCall('compile_test', {
          query: 'select name zzqx',
          language: 'en',
        });

        const data = JSON.parse(result!.content[0].text);
        expect(data.ok).toBe(false);
        expect(data.diagnostics[0].code).toBe('UNREAD_INPUT');
        expect(data.diagnostics[0].message).toMatch(/zzqx/);
      });
    });

    describe('validate', () => {
      it('validates input', async () => {
        registry.register(createTestDescriptor());
        const result = await registry.handleToolCall('validate_test', {
          query: 'select name',
          language: 'en',
        });

        const data = JSON.parse(result!.content[0].text);
        expect(data.valid).toBe(true);
      });
    });

    describe('translate', () => {
      it('translates between languages', async () => {
        registry.register(createTestDescriptor());
        const result = await registry.handleToolCall('translate_test', {
          query: 'select name',
          from: 'en',
          to: 'ja',
        });

        const data = JSON.parse(result!.content[0].text);
        expect(data.input.query).toBe('select name');
        expect(data.input.language).toBe('en');
        expect(data.ok).toBe(true);
        expect(data.rendered.text).toBe('[ja] select name');
        expect(data.rendered.language).toBe('ja');
      });

      it('refuses a rendering that does not read back, with its text under partial', async () => {
        registry.register(createTestDescriptor({ getRenderer: () => lossyRenderer }));
        const result = await registry.handleToolCall('translate_test', {
          query: 'select name',
          from: 'en',
          to: 'ja',
        });

        expect(result!.isError).toBe(true);
        const data = JSON.parse(result!.content[0].text);
        expect(data.ok).toBe(false);
        expect(data.partial).toBe('[ja] select');
        expect(data.rendered).toBeUndefined();
        expect(data.diagnostics[0].code).toBe('TRANSLATION_DOES_NOT_READ_BACK');
        expect(data.diagnostics[0].message).toMatch(/raw: select name → select/);
      });

      it('refuses input left unread, naming it', async () => {
        registry.register(createTestDescriptor());
        const result = await registry.handleToolCall('translate_test', {
          query: 'select name zzqx',
          from: 'en',
          to: 'ja',
        });

        expect(result!.isError).toBe(true);
        const data = JSON.parse(result!.content[0].text);
        expect(data.ok).toBe(false);
        expect(data.unread).toBe('zzqx');
        expect(data.reading.action).toBe('select');
        expect(data.diagnostics[0].code).toBe('UNREAD_INPUT');
      });

      it('returns error when from/to missing', async () => {
        registry.register(createTestDescriptor());

        const result1 = await registry.handleToolCall('translate_test', {
          query: 'test',
          to: 'ja',
        });
        expect(result1!.isError).toBe(true);

        const result2 = await registry.handleToolCall('translate_test', {
          query: 'test',
          from: 'en',
        });
        expect(result2!.isError).toBe(true);
      });

      it('works without renderer', async () => {
        registry.register(createTestDescriptor({ getRenderer: undefined }));
        const result = await registry.handleToolCall('translate_test', {
          query: 'select name',
          from: 'en',
          to: 'ja',
        });

        const data = JSON.parse(result!.content[0].text);
        expect(data.semantic.action).toBe('select');
        // No rendered field when renderer is missing
        expect(data.rendered).toBeUndefined();
      });
    });

    describe('error handling', () => {
      it('catches and reports domain errors', async () => {
        registry.register(
          createTestDescriptor({
            getDSL: () => {
              throw new Error('Module not found');
            },
          })
        );

        const result = await registry.handleToolCall('parse_test', { query: 'test' });
        expect(result!.isError).toBe(true);
        const data = JSON.parse(result!.content[0].text);
        expect(data.error).toContain('Module not found');
      });
    });

    describe('DSL caching', () => {
      it('reuses DSL instance across calls', async () => {
        let callCount = 0;
        registry.register(
          createTestDescriptor({
            getDSL: () => {
              callCount++;
              return createMockDSL();
            },
          })
        );

        await registry.handleToolCall('parse_test', { query: 'a' });
        await registry.handleToolCall('parse_test', { query: 'b' });
        expect(callCount).toBe(1);
      });
    });
  });
});
