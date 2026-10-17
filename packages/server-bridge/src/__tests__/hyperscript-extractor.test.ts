import { describe, it, expect } from 'vitest';
import { extractHyperscriptRoutes } from '../scanner/hyperscript-extractor.js';

const FILE = 'test.html';

describe('extractHyperscriptRoutes', () => {
  it('extracts fetch with URL and response type', () => {
    const html = `<button _="on click fetch /api/users as json then put it into #list">`;
    const routes = extractHyperscriptRoutes(html, { file: FILE });
    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('/api/users');
    expect(routes[0].method).toBe('GET');
    expect(routes[0].responseFormat).toBe('json');
  });

  it('extracts fetch with html response type', () => {
    const html = `<div _="on load fetch /partials/header as html then put it into me">`;
    const routes = extractHyperscriptRoutes(html, { file: FILE });
    expect(routes).toHaveLength(1);
    expect(routes[0].responseFormat).toBe('html');
  });

  it('extracts fetch with explicit method via keyword', () => {
    const html = `<button _="on click fetch /api/users via POST">`;
    const routes = extractHyperscriptRoutes(html, { file: FILE });
    expect(routes).toHaveLength(1);
    expect(routes[0].method).toBe('POST');
  });

  it("reads upstream's method from the fetch options", () => {
    const cases: Array<[string, string, string]> = [
      [`fetch /api/users with {method:'POST'}`, 'POST', 'json'],
      [`fetch /api/users with method:'PUT' as json`, 'PUT', 'json'],
      [`fetch /api/users {method: 'DELETE'} as an html`, 'DELETE', 'html'],
      [
        `fetch '/api/todos' as html with {method:'POST', body: new FormData(me)} do not throw`,
        'POST',
        'html',
      ],
    ];
    for (const [code, method, format] of cases) {
      const routes = extractHyperscriptRoutes(`<form _="on submit ${code}">`, { file: FILE });
      expect(routes, code).toHaveLength(1);
      expect(routes[0].method, code).toBe(method);
      expect(routes[0].responseFormat, code).toBe(format);
    }
  });

  it("reads a method only from its own fetch's options", () => {
    const html = `<button _="on click fetch /api/a then fetch /api/b with {method:'POST'}">`;
    const routes = extractHyperscriptRoutes(html, { file: FILE });
    expect(routes.map(r => `${r.method} ${r.path}`)).toEqual(['GET /api/a', 'POST /api/b']);
  });

  it('extracts URL with path parameters', () => {
    const html = `<button _="on click fetch /api/users/:id as json">`;
    const routes = extractHyperscriptRoutes(html, { file: FILE });
    expect(routes).toHaveLength(1);
    expect(routes[0].pathParams).toEqual(['id']);
  });

  it('extracts multiple fetch commands from different attributes', () => {
    const html = `
      <ul _="on load fetch /api/users as json then put it into me">
      <button _="on click fetch /api/users/:id as json then put it into #detail">
    `;
    const routes = extractHyperscriptRoutes(html, { file: FILE });
    expect(routes).toHaveLength(2);
    expect(routes[0].path).toBe('/api/users');
    expect(routes[1].path).toBe('/api/users/:id');
  });

  it('extracts "send form to" as POST', () => {
    const html = `<form _="on submit send form to /api/users as json">`;
    const routes = extractHyperscriptRoutes(html, { file: FILE });
    expect(routes).toHaveLength(1);
    expect(routes[0].method).toBe('POST');
    expect(routes[0].path).toBe('/api/users');
  });

  it('extracts from script type=text/hyperscript blocks', () => {
    const html = `
      <script type="text/hyperscript">
        on load fetch /api/config as json
      </script>
    `;
    const routes = extractHyperscriptRoutes(html, { file: FILE });
    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('/api/config');
  });

  it('skips external URLs', () => {
    const html = `<button _="on click fetch https://api.stripe.com/v1/charges as json">`;
    const routes = extractHyperscriptRoutes(html, { file: FILE });
    expect(routes).toHaveLength(0);
  });

  it('deduplicates identical routes', () => {
    const html = `
      <button _="on click fetch /api/users as json">
      <div _="on load fetch /api/users as json">
    `;
    const routes = extractHyperscriptRoutes(html, { file: FILE });
    expect(routes).toHaveLength(1);
  });

  it('records source information', () => {
    const html = `\n\n<button _="on click fetch /api/data as json">`;
    const routes = extractHyperscriptRoutes(html, { file: FILE });
    expect(routes[0].source.file).toBe(FILE);
    expect(routes[0].source.kind).toBe('fetch');
    expect(routes[0].source.line).toBe(3);
  });
});
