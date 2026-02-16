import { describe, it, expect, beforeEach } from 'vitest';
import { CrossDomainDispatcher } from './dispatcher';
import { DomainRegistry } from './domain-registry';
import type { DomainDescriptor } from './domain-registry';
import type { MultilingualDSL } from './create-dsl';
import type { SemanticNode } from '../core/types';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a mock DSL that parses input starting with a given keyword.
 * Confidence is configurable. Throws on non-matching input.
 */
function createMockDSL(keyword: string, confidence = 0.9): MultilingualDSL {
  return {
    parse(input: string, language: string): SemanticNode {
      const lower = input.toLowerCase().trim();
      if (!lower.startsWith(keyword)) {
        throw new Error(`Input does not start with "${keyword}"`);
      }
      return {
        kind: 'command',
        action: keyword,
        roles: new Map([['raw', { type: 'expression' as const, raw: input }]]),
        metadata: { sourceLanguage: language },
      };
    },
    parseWithConfidence(input: string, language: string) {
      const node = this.parse(input, language);
      return { node, confidence };
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
        return { ok: true, code: `compiled:${keyword}(${input})`, node };
      } catch {
        return { ok: false, errors: ['Compile failed'] };
      }
    },
    translate(input: string, _from: string, to: string) {
      return `[${to}] ${input}`;
    },
    getSupportedLanguages() {
      return ['en', 'ja'];
    },
  };
}

function createDescriptor(name: string, keyword: string, confidence = 0.9): DomainDescriptor {
  return {
    name,
    description: `${name} domain`,
    languages: ['en', 'ja'],
    inputLabel: 'input',
    inputDescription: `${name} input`,
    getDSL: () => createMockDSL(keyword, confidence),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('CrossDomainDispatcher', () => {
  let registry: DomainRegistry;

  beforeEach(() => {
    registry = new DomainRegistry();
  });

  // ---------------------------------------------------------------------------
  // detect()
  // ---------------------------------------------------------------------------

  describe('detect', () => {
    it('returns null when no domains are registered', async () => {
      const dispatcher = new CrossDomainDispatcher(registry);
      const result = await dispatcher.detect('anything');
      expect(result).toBeNull();
    });

    it('detects the correct domain for matching input', async () => {
      registry.register(createDescriptor('sql', 'select'));
      const dispatcher = new CrossDomainDispatcher(registry);

      const result = await dispatcher.detect('select name from users');
      expect(result).not.toBeNull();
      expect(result!.domain).toBe('sql');
      expect(result!.node.action).toBe('select');
      expect(result!.confidence).toBe(0.9);
    });

    it('returns null when no domain matches', async () => {
      registry.register(createDescriptor('sql', 'select'));
      const dispatcher = new CrossDomainDispatcher(registry);

      const result = await dispatcher.detect('toggle .active');
      expect(result).toBeNull();
    });

    it('picks the highest confidence when multiple domains match', async () => {
      // Both domains accept "select" but with different confidence
      registry.register(createDescriptor('sql', 'select', 0.95));
      registry.register(createDescriptor('query', 'select', 0.7));
      const dispatcher = new CrossDomainDispatcher(registry);

      const result = await dispatcher.detect('select name from users');
      expect(result).not.toBeNull();
      expect(result!.domain).toBe('sql');
      expect(result!.confidence).toBe(0.95);
    });

    it('breaks confidence ties using priority order', async () => {
      registry.register(createDescriptor('alpha', 'select', 0.9));
      registry.register(createDescriptor('beta', 'select', 0.9));
      const dispatcher = new CrossDomainDispatcher(registry, {
        priority: ['beta', 'alpha'],
      });

      const result = await dispatcher.detect('select name from users');
      expect(result).not.toBeNull();
      expect(result!.domain).toBe('beta');
    });

    it('respects minConfidence threshold', async () => {
      registry.register(createDescriptor('sql', 'select', 0.4));
      const dispatcher = new CrossDomainDispatcher(registry, {
        minConfidence: 0.5,
      });

      const result = await dispatcher.detect('select name from users');
      expect(result).toBeNull();
    });

    it('uses default minConfidence of 0.5', async () => {
      registry.register(createDescriptor('sql', 'select', 0.5));
      const dispatcher = new CrossDomainDispatcher(registry);

      const result = await dispatcher.detect('select name from users');
      expect(result).not.toBeNull();
    });

    it('handles domains that throw on parse', async () => {
      registry.register(createDescriptor('sql', 'select'));
      registry.register(createDescriptor('bdd', 'given'));
      const dispatcher = new CrossDomainDispatcher(registry);

      // "given" input — sql will throw, bdd will match
      const result = await dispatcher.detect('given page http://example.com');
      expect(result).not.toBeNull();
      expect(result!.domain).toBe('bdd');
    });

    it('uses default language "en"', async () => {
      registry.register(createDescriptor('sql', 'select'));
      const dispatcher = new CrossDomainDispatcher(registry);

      const result = await dispatcher.detect('select name');
      expect(result!.node.metadata?.sourceLanguage).toBe('en');
    });

    it('passes language parameter through', async () => {
      registry.register(createDescriptor('sql', 'select'));
      const dispatcher = new CrossDomainDispatcher(registry);

      const result = await dispatcher.detect('select name', 'ja');
      expect(result!.node.metadata?.sourceLanguage).toBe('ja');
    });
  });

  // ---------------------------------------------------------------------------
  // parseComposite()
  // ---------------------------------------------------------------------------

  describe('parseComposite', () => {
    it('parses multi-line input across domains', async () => {
      registry.register(createDescriptor('sql', 'select'));
      registry.register(createDescriptor('bdd', 'given'));
      const dispatcher = new CrossDomainDispatcher(registry);

      const result = await dispatcher.parseComposite(
        'select name from users\ngiven page http://example.com'
      );

      expect(result.statements).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.statements[0].domain).toBe('sql');
      expect(result.statements[0].line).toBe(1);
      expect(result.statements[1].domain).toBe('bdd');
      expect(result.statements[1].line).toBe(2);
    });

    it('skips empty lines', async () => {
      registry.register(createDescriptor('sql', 'select'));
      const dispatcher = new CrossDomainDispatcher(registry);

      const result = await dispatcher.parseComposite('\n\nselect name\n\n');
      expect(result.statements).toHaveLength(1);
      expect(result.statements[0].line).toBe(3);
      expect(result.errors).toHaveLength(0);
    });

    it('skips comment lines (// and -- and #)', async () => {
      registry.register(createDescriptor('sql', 'select'));
      const dispatcher = new CrossDomainDispatcher(registry);

      const result = await dispatcher.parseComposite(
        '// this is a comment\n-- another comment\n# hash comment\nselect name'
      );
      expect(result.statements).toHaveLength(1);
      expect(result.statements[0].line).toBe(4);
      expect(result.errors).toHaveLength(0);
    });

    it('collects unrecognized lines as errors', async () => {
      registry.register(createDescriptor('sql', 'select'));
      const dispatcher = new CrossDomainDispatcher(registry);

      const result = await dispatcher.parseComposite('select name\nunknown command\nselect id');
      expect(result.statements).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].line).toBe(2);
      expect(result.errors[0].input).toBe('unknown command');
      expect(result.errors[0].message).toBe('No domain matched this input');
    });

    it('handles fully empty input', async () => {
      const dispatcher = new CrossDomainDispatcher(registry);
      const result = await dispatcher.parseComposite('');
      expect(result.statements).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('trims line whitespace before parsing', async () => {
      registry.register(createDescriptor('sql', 'select'));
      const dispatcher = new CrossDomainDispatcher(registry);

      const result = await dispatcher.parseComposite('  select name  ');
      expect(result.statements).toHaveLength(1);
      expect(result.statements[0].input).toBe('select name');
    });
  });

  // ---------------------------------------------------------------------------
  // compile()
  // ---------------------------------------------------------------------------

  describe('compile', () => {
    it('compiles using auto-detected domain', async () => {
      registry.register(createDescriptor('sql', 'select'));
      const dispatcher = new CrossDomainDispatcher(registry);

      const result = await dispatcher.compile('select name from users');
      expect(result).not.toBeNull();
      expect(result!.ok).toBe(true);
      expect(result!.domain).toBe('sql');
      expect(result!.code).toBe('compiled:select(select name from users)');
    });

    it('returns null when no domain matches', async () => {
      registry.register(createDescriptor('sql', 'select'));
      const dispatcher = new CrossDomainDispatcher(registry);

      const result = await dispatcher.compile('unknown input');
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // validate()
  // ---------------------------------------------------------------------------

  describe('validate', () => {
    it('validates using auto-detected domain', async () => {
      registry.register(createDescriptor('sql', 'select'));
      const dispatcher = new CrossDomainDispatcher(registry);

      const result = await dispatcher.validate('select name from users');
      expect(result.valid).toBe(true);
      expect(result.domain).toBe('sql');
    });

    it('returns invalid when no domain matches', async () => {
      registry.register(createDescriptor('sql', 'select'));
      const dispatcher = new CrossDomainDispatcher(registry);

      const result = await dispatcher.validate('unknown input');
      expect(result.valid).toBe(false);
      expect(result.domain).toBeUndefined();
      expect(result.errors).toContain('No domain matched this input');
    });
  });

  // ---------------------------------------------------------------------------
  // getDSLForDomain (DomainRegistry extension)
  // ---------------------------------------------------------------------------

  describe('DomainRegistry.getDSLForDomain', () => {
    it('returns DSL for registered domain', async () => {
      registry.register(createDescriptor('sql', 'select'));
      const dsl = await registry.getDSLForDomain('sql');
      expect(dsl).not.toBeNull();
      expect(dsl!.getSupportedLanguages()).toContain('en');
    });

    it('returns null for unregistered domain', async () => {
      const dsl = await registry.getDSLForDomain('unknown');
      expect(dsl).toBeNull();
    });

    it('caches DSL instance across calls', async () => {
      let callCount = 0;
      registry.register({
        ...createDescriptor('sql', 'select'),
        getDSL: () => {
          callCount++;
          return createMockDSL('select');
        },
      });

      await registry.getDSLForDomain('sql');
      await registry.getDSLForDomain('sql');
      expect(callCount).toBe(1);
    });
  });
});
