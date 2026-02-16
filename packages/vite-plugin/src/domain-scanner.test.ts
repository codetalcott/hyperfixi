import { describe, it, expect } from 'vitest';
import { DomainScanner, descriptorToScanRule } from './domain-scanner';

// =============================================================================
// DomainScanner Tests
// =============================================================================

describe('DomainScanner', () => {
  describe('scan', () => {
    it('detects snippets from custom attributes', () => {
      const scanner = new DomainScanner([{ domain: 'sql', attributes: ['data-sql'] }]);

      const code = `<button data-sql="select name from users">Load</button>`;
      const results = scanner.scan(code, 'test.html');

      expect(results).toHaveLength(1);
      expect(results[0].domain).toBe('sql');
      expect(results[0].snippetCount).toBe(1);
    });

    it('detects from single-quoted attributes', () => {
      const scanner = new DomainScanner([{ domain: 'sql', attributes: ['data-sql'] }]);

      const code = `<button data-sql='select id from users'>Load</button>`;
      const results = scanner.scan(code, 'test.html');

      expect(results).toHaveLength(1);
      expect(results[0].snippetCount).toBe(1);
    });

    it('counts multiple snippets in same file', () => {
      const scanner = new DomainScanner([{ domain: 'sql', attributes: ['data-sql'] }]);

      const code = `
        <button data-sql="select name">One</button>
        <button data-sql="select id">Two</button>
      `;
      const results = scanner.scan(code, 'test.html');

      expect(results).toHaveLength(1);
      expect(results[0].snippetCount).toBe(2);
    });

    it('handles multiple domains in same file', () => {
      const scanner = new DomainScanner([
        { domain: 'sql', attributes: ['data-sql'] },
        { domain: 'bdd', attributes: ['data-bdd'] },
      ]);

      const code = `
        <button data-sql="select name">SQL</button>
        <div data-bdd="given page http://example.com">BDD</div>
      `;
      const results = scanner.scan(code, 'test.html');

      expect(results).toHaveLength(2);
      const domains = results.map(r => r.domain).sort();
      expect(domains).toEqual(['bdd', 'sql']);
    });

    it('detects keywords within snippets', () => {
      const scanner = new DomainScanner([
        {
          domain: 'sql',
          attributes: ['data-sql'],
          keywords: {
            en: ['select', 'insert', 'update', 'delete'],
          },
        },
      ]);

      const code = `<button data-sql="select name from users">Load</button>`;
      const results = scanner.scan(code, 'test.html');

      expect(results).toHaveLength(1);
      expect(results[0].detectedKeywords.has('select')).toBe(true);
      expect(results[0].detectedLanguages.has('en')).toBe(true);
    });

    it('detects non-Latin keywords', () => {
      const scanner = new DomainScanner([
        {
          domain: 'sql',
          attributes: ['data-sql'],
          keywords: {
            ja: ['選択', '挿入'],
          },
        },
      ]);

      const code = `<button data-sql="選択 name">Load</button>`;
      const results = scanner.scan(code, 'test.html');

      expect(results).toHaveLength(1);
      expect(results[0].detectedKeywords.has('選択')).toBe(true);
      expect(results[0].detectedLanguages.has('ja')).toBe(true);
    });

    it('detects from script tags', () => {
      const scanner = new DomainScanner([
        { domain: 'bdd', attributes: [], scriptTypes: ['text/behaviorspec'] },
      ]);

      const code = `<script type="text/behaviorspec">given page http://example.com</script>`;
      const results = scanner.scan(code, 'test.html');

      expect(results).toHaveLength(1);
      expect(results[0].domain).toBe('bdd');
      expect(results[0].snippetCount).toBe(1);
    });

    it('returns empty array when no matches', () => {
      const scanner = new DomainScanner([{ domain: 'sql', attributes: ['data-sql'] }]);

      const code = `<button class="btn">No domain attributes</button>`;
      const results = scanner.scan(code, 'test.html');

      expect(results).toHaveLength(0);
    });

    it('skips empty attribute values', () => {
      const scanner = new DomainScanner([{ domain: 'sql', attributes: ['data-sql'] }]);

      const code = `<button data-sql="">Empty</button>`;
      const results = scanner.scan(code, 'test.html');

      expect(results).toHaveLength(0);
    });
  });

  describe('hasAnyDomainUsage', () => {
    it('returns true when domain attributes present', () => {
      const scanner = new DomainScanner([{ domain: 'sql', attributes: ['data-sql'] }]);

      expect(scanner.hasAnyDomainUsage('<button data-sql="select">Load</button>')).toBe(true);
    });

    it('returns false when no domain attributes', () => {
      const scanner = new DomainScanner([{ domain: 'sql', attributes: ['data-sql'] }]);

      expect(scanner.hasAnyDomainUsage('<button class="btn">Load</button>')).toBe(false);
    });

    it('checks script types too', () => {
      const scanner = new DomainScanner([
        { domain: 'bdd', attributes: [], scriptTypes: ['text/behaviorspec'] },
      ]);

      expect(scanner.hasAnyDomainUsage('<script type="text/behaviorspec">')).toBe(true);
    });

    it('returns false for empty rules', () => {
      const scanner = new DomainScanner([]);
      expect(scanner.hasAnyDomainUsage('<button>anything</button>')).toBe(false);
    });
  });
});

// =============================================================================
// descriptorToScanRule Tests
// =============================================================================

describe('descriptorToScanRule', () => {
  it('converts a descriptor with scanConfig', () => {
    const rule = descriptorToScanRule({
      name: 'sql',
      scanConfig: {
        attributes: ['data-sql'],
        scriptTypes: ['text/sql-dsl'],
        keywords: { en: ['select', 'insert'] },
      },
    });

    expect(rule).not.toBeNull();
    expect(rule!.domain).toBe('sql');
    expect(rule!.attributes).toEqual(['data-sql']);
    expect(rule!.scriptTypes).toEqual(['text/sql-dsl']);
    expect(rule!.keywords).toEqual({ en: ['select', 'insert'] });
  });

  it('returns null without scanConfig', () => {
    const rule = descriptorToScanRule({ name: 'test' });
    expect(rule).toBeNull();
  });

  it('handles minimal scanConfig', () => {
    const rule = descriptorToScanRule({
      name: 'minimal',
      scanConfig: { attributes: ['data-min'] },
    });

    expect(rule).not.toBeNull();
    expect(rule!.domain).toBe('minimal');
    expect(rule!.attributes).toEqual(['data-min']);
    expect(rule!.scriptTypes).toBeUndefined();
    expect(rule!.keywords).toBeUndefined();
  });
});
