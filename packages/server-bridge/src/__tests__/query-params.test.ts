import { describe, it, expect } from 'vitest';
import { extractQueryParams } from '../conventions/url-patterns.js';
import { extractHtmxRoutes } from '../scanner/htmx-extractor.js';
import { extractHyperscriptRoutes } from '../scanner/hyperscript-extractor.js';
import { scanRoutes } from '../scanner/route-scanner.js';

const FILE = 'test.html';

describe('extractQueryParams', () => {
  it('extracts single query param', () => {
    const params = extractQueryParams('/api/search?q=hello');
    expect(params).toEqual([{ name: 'q', type: 'string', required: true }]);
  });

  it('extracts multiple query params', () => {
    const params = extractQueryParams('/api/search?q=hello&limit=10&offset=0');
    expect(params).toHaveLength(3);
    expect(params.map(p => p.name)).toEqual(['q', 'limit', 'offset']);
  });

  it('handles URL-encoded param names', () => {
    const params = extractQueryParams('/api/search?query%20text=hello');
    expect(params[0].name).toBe('query text');
  });

  it('returns empty array for no query string', () => {
    expect(extractQueryParams('/api/users')).toEqual([]);
  });

  it('returns empty array for empty query string', () => {
    expect(extractQueryParams('/api/users?')).toEqual([]);
  });

  it('strips fragment after query string', () => {
    const params = extractQueryParams('/api/search?q=hello#results');
    expect(params).toHaveLength(1);
    expect(params[0].name).toBe('q');
  });

  it('deduplicates repeated param names', () => {
    const params = extractQueryParams('/api/search?q=hello&q=world');
    expect(params).toHaveLength(1);
  });

  it('handles params without values', () => {
    const params = extractQueryParams('/api/search?verbose&q=hello');
    expect(params).toHaveLength(2);
    expect(params[0].name).toBe('verbose');
    expect(params[1].name).toBe('q');
  });

  it('handles malformed percent-encoded param names gracefully', () => {
    const params = extractQueryParams('/api/search?%ZZ=hello&q=world');
    expect(params).toHaveLength(2);
    expect(params[0].name).toBe('%ZZ');
    expect(params[1].name).toBe('q');
  });
});

describe('query params in htmx extractor', () => {
  it('extracts query params from hx-get URL', () => {
    const html = `<div hx-get="/api/search?q=test&limit=10">`;
    const routes = extractHtmxRoutes(html, { file: FILE });
    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('/api/search');
    expect(routes[0].queryParams).toEqual([
      { name: 'q', type: 'string', required: true },
      { name: 'limit', type: 'string', required: true },
    ]);
  });

  it('omits queryParams when URL has no query string', () => {
    const html = `<div hx-get="/api/users">`;
    const routes = extractHtmxRoutes(html, { file: FILE });
    expect(routes[0].queryParams).toBeUndefined();
  });
});

describe('query params in hyperscript extractor', () => {
  it('extracts query params from fetch URL', () => {
    const html = `<button _="on click fetch /api/data?id=123 as json">`;
    const routes = extractHyperscriptRoutes(html, { file: FILE });
    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('/api/data');
    expect(routes[0].queryParams).toEqual([{ name: 'id', type: 'string', required: true }]);
  });
});

describe('query params in scanRoutes', () => {
  it('preserves query params through full scan pipeline', () => {
    const html = `
      <div hx-get="/api/search?q=test&limit=10" hx-target="#results">
      <button _="on click fetch /api/data?format=csv as json">
    `;
    const routes = scanRoutes(html, FILE);
    const searchRoute = routes.find(r => r.path === '/api/search');
    const dataRoute = routes.find(r => r.path === '/api/data');
    expect(searchRoute?.queryParams).toHaveLength(2);
    expect(dataRoute?.queryParams).toHaveLength(1);
  });
});
