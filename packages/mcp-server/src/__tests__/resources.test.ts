/**
 * MCP Resources Tests
 */
import { describe, it, expect } from 'vitest';
import { listResources, readResource } from '../resources/index.js';

describe('listResources', () => {
  it('returns 5 resources', () => {
    const resources = listResources();
    expect(resources).toHaveLength(5);
  });

  it('includes commands reference', () => {
    const resources = listResources();
    const commands = resources.find(r => r.uri === 'hyperscript://docs/commands');
    expect(commands).toBeDefined();
    expect(commands?.name).toContain('Commands');
    expect(commands?.mimeType).toBe('text/markdown');
  });

  it('includes expressions guide', () => {
    const resources = listResources();
    const expressions = resources.find(r => r.uri === 'hyperscript://docs/expressions');
    expect(expressions).toBeDefined();
    expect(expressions?.name).toContain('Expressions');
    expect(expressions?.mimeType).toBe('text/markdown');
  });

  it('includes events reference', () => {
    const resources = listResources();
    const events = resources.find(r => r.uri === 'hyperscript://docs/events');
    expect(events).toBeDefined();
    expect(events?.name).toContain('Events');
    expect(events?.mimeType).toBe('text/markdown');
  });

  it('includes common patterns', () => {
    const resources = listResources();
    const patterns = resources.find(r => r.uri === 'hyperscript://examples/common');
    expect(patterns).toBeDefined();
    expect(patterns?.name).toContain('Patterns');
    expect(patterns?.mimeType).toBe('text/markdown');
  });

  it('includes languages', () => {
    const resources = listResources();
    const languages = resources.find(r => r.uri === 'hyperscript://languages');
    expect(languages).toBeDefined();
    expect(languages?.mimeType).toBe('application/json');
  });

  it('all resources have required properties', () => {
    const resources = listResources();
    resources.forEach(resource => {
      expect(resource.uri).toBeDefined();
      expect(resource.name).toBeDefined();
      expect(resource.description).toBeDefined();
      expect(resource.mimeType).toBeDefined();
    });
  });
});

describe('readResource - commands', () => {
  it('returns markdown content', () => {
    const result = readResource('hyperscript://docs/commands');
    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].mimeType).toBe('text/markdown');
    expect(result.contents[0].text).toContain('# Hyperscript Commands');
  });

  it('includes toggle command', () => {
    const result = readResource('hyperscript://docs/commands');
    expect(result.contents[0].text).toContain('toggle');
  });

  it('includes add command', () => {
    const result = readResource('hyperscript://docs/commands');
    expect(result.contents[0].text).toContain('add');
  });

  it('includes fetch command', () => {
    const result = readResource('hyperscript://docs/commands');
    expect(result.contents[0].text).toContain('fetch');
  });

  it('includes examples', () => {
    const result = readResource('hyperscript://docs/commands');
    expect(result.contents[0].text).toContain('toggle .active');
  });
});

describe('readResource - expressions', () => {
  it('returns markdown content', () => {
    const result = readResource('hyperscript://docs/expressions');
    expect(result.contents[0].mimeType).toBe('text/markdown');
    expect(result.contents[0].text).toContain('Expressions');
  });

  it('includes me reference', () => {
    const result = readResource('hyperscript://docs/expressions');
    expect(result.contents[0].text.toLowerCase()).toContain('me');
  });
});

describe('readResource - events', () => {
  it('returns markdown content', () => {
    const result = readResource('hyperscript://docs/events');
    expect(result.contents[0].mimeType).toBe('text/markdown');
    expect(result.contents[0].text).toContain('Event');
  });

  it('includes click event', () => {
    const result = readResource('hyperscript://docs/events');
    expect(result.contents[0].text).toContain('click');
  });

  it('includes event modifiers', () => {
    const result = readResource('hyperscript://docs/events');
    // Should mention modifiers like .prevent, .once, etc.
    expect(
      result.contents[0].text.includes('prevent') ||
        result.contents[0].text.includes('modifier') ||
        result.contents[0].text.includes('.once')
    ).toBe(true);
  });
});

describe('readResource - common patterns', () => {
  it('returns markdown content', () => {
    const result = readResource('hyperscript://examples/common');
    expect(result.contents[0].mimeType).toBe('text/markdown');
  });

  it('includes code examples', () => {
    const result = readResource('hyperscript://examples/common');
    // Should have code blocks
    expect(result.contents[0].text).toContain('```');
  });

  it('includes common patterns', () => {
    const result = readResource('hyperscript://examples/common');
    // Should include some common pattern
    expect(
      result.contents[0].text.includes('toggle') ||
        result.contents[0].text.includes('modal') ||
        result.contents[0].text.includes('validation')
    ).toBe(true);
  });
});

describe('readResource - languages', () => {
  it('returns JSON content', () => {
    const result = readResource('hyperscript://languages');
    expect(result.contents[0].mimeType).toBe('application/json');
  });

  it('is valid JSON', () => {
    const result = readResource('hyperscript://languages');
    expect(() => JSON.parse(result.contents[0].text)).not.toThrow();
  });

  it('includes English', () => {
    const result = readResource('hyperscript://languages');
    const data = JSON.parse(result.contents[0].text);
    const languages = data.supported || data;
    expect(languages.some((l: any) => l.code === 'en' || l.language === 'en')).toBe(true);
  });

  it('includes Japanese', () => {
    const result = readResource('hyperscript://languages');
    const data = JSON.parse(result.contents[0].text);
    const languages = data.supported || data;
    expect(languages.some((l: any) => l.code === 'ja' || l.language === 'ja')).toBe(true);
  });

  it('includes word order information', () => {
    const result = readResource('hyperscript://languages');
    const data = JSON.parse(result.contents[0].text);
    const languages = data.supported || data;
    // At least one language should have word order
    const hasWordOrder = languages.some((l: any) => l.wordOrder || l.order);
    expect(hasWordOrder).toBe(true);
  });

  it('lists multiple languages', () => {
    const result = readResource('hyperscript://languages');
    const data = JSON.parse(result.contents[0].text);
    const languages = data.supported || data;
    expect(languages.length).toBeGreaterThan(5);
  });
});

describe('readResource - error handling', () => {
  it('throws for unknown URI', () => {
    expect(() => readResource('hyperscript://unknown/resource')).toThrow('Unknown resource');
  });

  it('throws for invalid URI', () => {
    expect(() => readResource('invalid-uri')).toThrow();
  });
});

describe('resource URIs', () => {
  it('uses hyperscript:// protocol', () => {
    const resources = listResources();
    resources.forEach(resource => {
      expect(resource.uri.startsWith('hyperscript://')).toBe(true);
    });
  });

  it('URIs are unique', () => {
    const resources = listResources();
    const uris = resources.map(r => r.uri);
    const uniqueUris = [...new Set(uris)];
    expect(uniqueUris.length).toBe(uris.length);
  });
});
