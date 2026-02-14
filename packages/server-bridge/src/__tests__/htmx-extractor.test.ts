import { describe, it, expect } from 'vitest';
import { extractHtmxRoutes } from '../scanner/htmx-extractor.js';

const FILE = 'test.html';

describe('extractHtmxRoutes', () => {
  it('extracts hx-get', () => {
    const html = `<div hx-get="/api/users" hx-target="#list">`;
    const routes = extractHtmxRoutes(html, { file: FILE });
    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('/api/users');
    expect(routes[0].method).toBe('GET');
  });

  it('extracts hx-post', () => {
    const html = `<form hx-post="/api/users" hx-target="#result">`;
    const routes = extractHtmxRoutes(html, { file: FILE });
    expect(routes).toHaveLength(1);
    expect(routes[0].method).toBe('POST');
  });

  it('extracts hx-delete', () => {
    const html = `<button hx-delete="/api/users/:id">`;
    const routes = extractHtmxRoutes(html, { file: FILE });
    expect(routes).toHaveLength(1);
    expect(routes[0].method).toBe('DELETE');
    expect(routes[0].pathParams).toEqual(['id']);
  });

  it('defaults to html response format for htmx', () => {
    const html = `<div hx-get="/api/users">`;
    const routes = extractHtmxRoutes(html, { file: FILE });
    expect(routes[0].responseFormat).toBe('html');
  });

  it('extracts fx-action with fx-method', () => {
    const html = `<button fx-action="/api/search" fx-method="GET" fx-target="#results">`;
    const routes = extractHtmxRoutes(html, { file: FILE });
    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('/api/search');
    expect(routes[0].method).toBe('GET');
    expect(routes[0].source.kind).toBe('fx-attr');
  });

  it('extracts fx-action without fx-method (defaults to GET)', () => {
    const html = `<button fx-action="/api/data">`;
    const routes = extractHtmxRoutes(html, { file: FILE });
    expect(routes).toHaveLength(1);
    expect(routes[0].method).toBe('GET');
  });

  it('extracts multiple htmx routes from one file', () => {
    const html = `
      <div hx-get="/api/users" hx-target="#users">
      <form hx-post="/api/users" hx-target="#result">
      <button hx-delete="/api/users/:id">
    `;
    const routes = extractHtmxRoutes(html, { file: FILE });
    expect(routes).toHaveLength(3);
  });

  it('skips external URLs', () => {
    const html = `<div hx-get="https://external.com/api/data">`;
    const routes = extractHtmxRoutes(html, { file: FILE });
    expect(routes).toHaveLength(0);
  });

  it('deduplicates same method+path', () => {
    const html = `
      <button hx-get="/api/users">Load</button>
      <div hx-get="/api/users">Refresh</div>
    `;
    const routes = extractHtmxRoutes(html, { file: FILE });
    expect(routes).toHaveLength(1);
  });

  it('records source information', () => {
    const html = `\n<button hx-post="/api/submit">`;
    const routes = extractHtmxRoutes(html, { file: FILE });
    expect(routes[0].source.file).toBe(FILE);
    expect(routes[0].source.kind).toBe('hx-attr');
    expect(routes[0].source.raw).toBe('hx-post="/api/submit"');
  });
});
