import { describe, it, expect } from 'vitest';
import { DomainAwareScanner } from './domain-scanner';
import { AOTOrchestrator } from './aot-orchestrator';
import type { DomainScanConfig, ExtractedSnippet } from './types';
import type { DomainCompilationBackend } from './aot-orchestrator';
import type { MultilingualDSL, CodeGenerator } from '../api/create-dsl';
import type { SemanticNode } from '../core/types';

// =============================================================================
// Test Helpers
// =============================================================================

function createMockDSL(keyword: string): MultilingualDSL {
  return {
    parse(input: string, language: string): SemanticNode {
      return {
        kind: 'command',
        action: keyword,
        roles: new Map([['raw', { type: 'expression' as const, raw: input }]]),
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
      const node = this.parse(input, language);
      return { ok: true, code: `${keyword}_output(${input})`, node };
    },
    translate(input: string, _from: string, to: string) {
      return `[${to}] ${input}`;
    },
    getSupportedLanguages() {
      return ['en'];
    },
  };
}

function createMockCodeGenerator(prefix: string): CodeGenerator {
  return {
    generate(node: SemanticNode): string {
      return `${prefix}: ${node.action}`;
    },
  };
}

function createBackend(
  domain: string,
  attributes: string[],
  scriptTypes?: string[]
): DomainCompilationBackend {
  return {
    domain,
    dsl: createMockDSL(domain),
    codeGenerator: createMockCodeGenerator(domain),
    scanConfig: {
      domain,
      attributes,
      scriptTypes,
    },
  };
}

// =============================================================================
// DomainAwareScanner Tests
// =============================================================================

describe('DomainAwareScanner', () => {
  it('extracts snippets from custom attributes', () => {
    const scanner = new DomainAwareScanner([{ domain: 'sql', attributes: ['data-sql'] }]);

    const html = `<button data-sql="select name from users">Load</button>`;
    const snippets = scanner.extract(html, 'test.html');

    expect(snippets).toHaveLength(1);
    expect(snippets[0].domain).toBe('sql');
    expect(snippets[0].code).toBe('select name from users');
    expect(snippets[0].file).toBe('test.html');
    expect(snippets[0].language).toBe('en');
  });

  it('extracts from single-quoted attributes', () => {
    const scanner = new DomainAwareScanner([{ domain: 'sql', attributes: ['data-sql'] }]);

    const html = `<button data-sql='select id'>Load</button>`;
    const snippets = scanner.extract(html, 'test.html');

    expect(snippets).toHaveLength(1);
    expect(snippets[0].code).toBe('select id');
  });

  it('handles multiple domains in the same file', () => {
    const scanner = new DomainAwareScanner([
      { domain: 'sql', attributes: ['data-sql'] },
      { domain: 'bdd', attributes: ['data-bdd'] },
    ]);

    const html = `
      <button data-sql="select name from users">SQL</button>
      <div data-bdd="given page http://example.com">BDD</div>
    `;
    const snippets = scanner.extract(html, 'test.html');

    expect(snippets).toHaveLength(2);
    expect(snippets[0].domain).toBe('sql');
    expect(snippets[1].domain).toBe('bdd');
  });

  it('extracts from script tags', () => {
    const scanner = new DomainAwareScanner([
      { domain: 'bdd', attributes: [], scriptTypes: ['text/behaviorspec'] },
    ]);

    const html = `<script type="text/behaviorspec">given page http://example.com</script>`;
    const snippets = scanner.extract(html, 'test.html');

    expect(snippets).toHaveLength(1);
    expect(snippets[0].domain).toBe('bdd');
    expect(snippets[0].code).toBe('given page http://example.com');
  });

  it('picks up lang attribute from element', () => {
    const scanner = new DomainAwareScanner([{ domain: 'sql', attributes: ['data-sql'] }]);

    const html = `<button lang="ja" data-sql="select name">Load</button>`;
    const snippets = scanner.extract(html, 'test.html');

    expect(snippets).toHaveLength(1);
    expect(snippets[0].language).toBe('ja');
  });

  it('uses defaultLanguage when no lang attribute', () => {
    const scanner = new DomainAwareScanner([
      { domain: 'sql', attributes: ['data-sql'], defaultLanguage: 'es' },
    ]);

    const html = `<button data-sql="select name">Load</button>`;
    const snippets = scanner.extract(html, 'test.html');

    expect(snippets).toHaveLength(1);
    expect(snippets[0].language).toBe('es');
  });

  it('picks up element ID', () => {
    const scanner = new DomainAwareScanner([{ domain: 'sql', attributes: ['data-sql'] }]);

    const html = `<button id="load-btn" data-sql="select name">Load</button>`;
    const snippets = scanner.extract(html, 'test.html');

    expect(snippets).toHaveLength(1);
    expect(snippets[0].elementId).toBe('load-btn');
  });

  it('skips empty attribute values', () => {
    const scanner = new DomainAwareScanner([{ domain: 'sql', attributes: ['data-sql'] }]);

    const html = `<button data-sql="">Load</button>`;
    const snippets = scanner.extract(html, 'test.html');

    expect(snippets).toHaveLength(0);
  });

  it('returns empty array for no matches', () => {
    const scanner = new DomainAwareScanner([{ domain: 'sql', attributes: ['data-sql'] }]);

    const html = `<button class="btn">Load</button>`;
    const snippets = scanner.extract(html, 'test.html');

    expect(snippets).toHaveLength(0);
  });

  it('extracts from multiple files', async () => {
    const scanner = new DomainAwareScanner([{ domain: 'sql', attributes: ['data-sql'] }]);

    const files: Record<string, string> = {
      'a.html': `<button data-sql="select name">A</button>`,
      'b.html': `<button data-sql="select id">B</button>`,
    };

    const snippets = await scanner.extractFromFiles(Object.keys(files), async path => files[path]);

    expect(snippets).toHaveLength(2);
    expect(snippets[0].file).toBe('a.html');
    expect(snippets[1].file).toBe('b.html');
  });

  it('skips unreadable files gracefully', async () => {
    const scanner = new DomainAwareScanner([{ domain: 'sql', attributes: ['data-sql'] }]);

    const snippets = await scanner.extractFromFiles(['good.html', 'bad.html'], async path => {
      if (path === 'bad.html') throw new Error('Cannot read');
      return `<button data-sql="select name">A</button>`;
    });

    expect(snippets).toHaveLength(1);
  });
});

// =============================================================================
// AOTOrchestrator Tests
// =============================================================================

describe('AOTOrchestrator', () => {
  it('compiles a single snippet', () => {
    const orchestrator = new AOTOrchestrator();
    orchestrator.registerBackend(createBackend('sql', ['data-sql']));

    const snippet: ExtractedSnippet = {
      domain: 'sql',
      code: 'select name from users',
      language: 'en',
      file: 'test.html',
      line: 1,
      column: 1,
    };

    const result = orchestrator.compileSnippet(snippet);
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.domain).toBe('sql');
      expect(result.compiled).toBe('sql_output(select name from users)');
    }
  });

  it('returns error for unknown domain', () => {
    const orchestrator = new AOTOrchestrator();

    const snippet: ExtractedSnippet = {
      domain: 'unknown',
      code: 'test',
      language: 'en',
      file: 'test.html',
      line: 1,
      column: 1,
    };

    const result = orchestrator.compileSnippet(snippet);
    expect('error' in result).toBe(true);
  });

  it('throws on duplicate backend registration', () => {
    const orchestrator = new AOTOrchestrator();
    orchestrator.registerBackend(createBackend('sql', ['data-sql']));
    expect(() => orchestrator.registerBackend(createBackend('sql', ['data-sql2']))).toThrow(
      'Backend already registered for domain: sql'
    );
  });

  it('compiles files with multiple domains', async () => {
    const orchestrator = new AOTOrchestrator();
    orchestrator.registerBackend(createBackend('sql', ['data-sql']));
    orchestrator.registerBackend(createBackend('bdd', ['data-bdd']));

    const files: Record<string, string> = {
      'index.html': `
        <button data-sql="select name from users">SQL</button>
        <div data-bdd="given page http://example.com">BDD</div>
      `,
    };

    const result = await orchestrator.compileFiles(Object.keys(files), async path => files[path]);

    expect(result.compiled).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.stats.totalSnippets).toBe(2);
    expect(result.stats.compiledCount).toBe(2);
    expect(result.stats.errorCount).toBe(0);
    expect(result.stats.domainBreakdown).toEqual({ sql: 1, bdd: 1 });
  });

  it('collects errors and continues by default', async () => {
    const orchestrator = new AOTOrchestrator();

    // Create a backend that fails compilation
    const failingDSL = createMockDSL('sql');
    failingDSL.compile = () => ({ ok: false, errors: ['Syntax error'] });

    orchestrator.registerBackend({
      domain: 'sql',
      dsl: failingDSL,
      codeGenerator: createMockCodeGenerator('sql'),
      scanConfig: { domain: 'sql', attributes: ['data-sql'] },
    });
    orchestrator.registerBackend(createBackend('bdd', ['data-bdd']));

    const files: Record<string, string> = {
      'test.html': `
        <button data-sql="bad query">SQL</button>
        <div data-bdd="given page http://example.com">BDD</div>
      `,
    };

    const result = await orchestrator.compileFiles(Object.keys(files), async path => files[path]);

    expect(result.compiled).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].domain).toBe('sql');
    expect(result.errors[0].message).toBe('Syntax error');
  });

  it('handles empty file list', async () => {
    const orchestrator = new AOTOrchestrator();
    orchestrator.registerBackend(createBackend('sql', ['data-sql']));

    const result = await orchestrator.compileFiles([], async () => '');

    expect(result.compiled).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
    expect(result.stats.totalSnippets).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // generateOutput()
  // ---------------------------------------------------------------------------

  describe('generateOutput', () => {
    function createBatchResult(): import('./types').AOTBatchResult {
      return {
        compiled: [
          {
            domain: 'sql',
            source: 'select name',
            compiled: 'SELECT name',
            language: 'en',
            file: 'a.html',
            line: 1,
          },
          {
            domain: 'sql',
            source: 'select id',
            compiled: 'SELECT id',
            language: 'en',
            file: 'a.html',
            line: 5,
          },
          {
            domain: 'bdd',
            source: 'given page',
            compiled: 'test("given page")',
            language: 'en',
            file: 'b.html',
            line: 1,
          },
        ],
        errors: [],
        stats: {
          totalSnippets: 3,
          compiledCount: 3,
          errorCount: 0,
          domainBreakdown: { sql: 2, bdd: 1 },
        },
      };
    }

    it('generates ESM output grouped by domain', () => {
      const orchestrator = new AOTOrchestrator();
      const output = orchestrator.generateOutput(createBatchResult());

      expect(output).toContain('=== Domain: sql ===');
      expect(output).toContain('=== Domain: bdd ===');
      expect(output).toContain('SELECT name');
      expect(output).toContain('test("given page")');
      expect(output).not.toContain("'use strict'");
      expect(output).not.toContain('(function()');
    });

    it('generates CJS output', () => {
      const orchestrator = new AOTOrchestrator();
      const output = orchestrator.generateOutput(createBatchResult(), { format: 'cjs' });

      expect(output).toContain("'use strict'");
      expect(output).toContain('SELECT name');
    });

    it('generates IIFE output', () => {
      const orchestrator = new AOTOrchestrator();
      const output = orchestrator.generateOutput(createBatchResult(), { format: 'iife' });

      expect(output).toContain('(function()');
      expect(output).toContain('})();');
    });

    it('omits comments when includeComments is false', () => {
      const orchestrator = new AOTOrchestrator();
      const output = orchestrator.generateOutput(createBatchResult(), {
        includeComments: false,
      });

      expect(output).not.toContain('===');
      expect(output).not.toContain('Source:');
      expect(output).toContain('SELECT name');
    });

    it('flattens output when groupByDomain is false', () => {
      const orchestrator = new AOTOrchestrator();
      const output = orchestrator.generateOutput(createBatchResult(), {
        groupByDomain: false,
      });

      expect(output).not.toContain('=== Domain:');
      expect(output).toContain('[sql]');
      expect(output).toContain('[bdd]');
    });
  });
});
