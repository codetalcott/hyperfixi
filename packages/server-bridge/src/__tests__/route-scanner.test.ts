import { describe, it, expect } from 'vitest';
import { scanRoutes } from '../scanner/route-scanner.js';

describe('scanRoutes', () => {
  it('combines hyperscript and htmx routes from one file', () => {
    const html = `
      <button _="on click fetch /api/data as json then put it into #result">
      <div hx-get="/api/users" hx-target="#list">
    `;
    const routes = scanRoutes(html, 'test.html');
    expect(routes).toHaveLength(2);
    expect(routes.map(r => r.path).sort()).toEqual(['/api/data', '/api/users']);
  });

  it('deduplicates routes across extractors', () => {
    const html = `
      <button _="on click fetch /api/users as html">
      <div hx-get="/api/users">
    `;
    const routes = scanRoutes(html, 'test.html');
    // Both extract GET /api/users — should deduplicate
    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('/api/users');
  });

  it('enriches POST routes with form body fields', () => {
    const html = `
      <form hx-post="/api/users">
        <input name="name" type="text" required>
        <input name="email" type="email" required>
        <button type="submit">Create</button>
      </form>
    `;
    const routes = scanRoutes(html, 'test.html');
    expect(routes).toHaveLength(1);
    expect(routes[0].method).toBe('POST');
    expect(routes[0].requestBody).toHaveLength(2);
    expect(routes[0].requestBody![0].name).toBe('name');
    expect(routes[0].requestBody![1].name).toBe('email');
  });

  it('handles file with no routes', () => {
    const html = `<div>Hello world</div>`;
    const routes = scanRoutes(html, 'test.html');
    expect(routes).toHaveLength(0);
  });
});
