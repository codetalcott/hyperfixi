import { describe, it, expect } from 'vitest';
import { extractFormFields, extractFormBodies } from '../scanner/form-scanner.js';

describe('extractFormFields', () => {
  it('extracts named input fields', () => {
    const html = `
      <input name="username" type="text" required>
      <input name="email" type="email" required>
      <input name="age" type="number">
    `;
    const fields = extractFormFields(html);
    expect(fields).toHaveLength(3);
    expect(fields[0]).toEqual({ name: 'username', type: 'string', required: true });
    expect(fields[1]).toEqual({ name: 'email', type: 'string', required: true });
    expect(fields[2]).toEqual({ name: 'age', type: 'number', required: false });
  });

  it('handles select and textarea', () => {
    const html = `
      <select name="country" required></select>
      <textarea name="bio"></textarea>
    `;
    const fields = extractFormFields(html);
    expect(fields).toHaveLength(2);
    expect(fields[0]).toEqual({ name: 'country', type: 'string', required: true });
    expect(fields[1]).toEqual({ name: 'bio', type: 'string', required: false });
  });

  it('maps checkbox to boolean and file to file', () => {
    const html = `
      <input name="agree" type="checkbox">
      <input name="avatar" type="file">
    `;
    const fields = extractFormFields(html);
    expect(fields[0].type).toBe('boolean');
    expect(fields[1].type).toBe('file');
  });

  it('deduplicates by name', () => {
    const html = `
      <input name="q" type="text">
      <input name="q" type="search">
    `;
    const fields = extractFormFields(html);
    expect(fields).toHaveLength(1);
  });

  it('defaults to string for unknown type', () => {
    const html = `<input name="data">`;
    const fields = extractFormFields(html);
    expect(fields[0].type).toBe('string');
  });
});

describe('extractFormBodies', () => {
  it('associates form fields with hx-post URL', () => {
    const html = `
      <form hx-post="/api/users">
        <input name="name" type="text" required>
        <input name="email" type="email" required>
        <button type="submit">Create</button>
      </form>
    `;
    const bodies = extractFormBodies(html);
    expect(bodies.size).toBe(1);
    const fields = bodies.get('/api/users');
    expect(fields).toHaveLength(2);
    expect(fields![0].name).toBe('name');
    expect(fields![1].name).toBe('email');
  });

  it('handles fx-action forms', () => {
    const html = `
      <form fx-action="/api/search">
        <input name="q" type="search">
      </form>
    `;
    const bodies = extractFormBodies(html);
    expect(bodies.has('/api/search')).toBe(true);
  });

  it('skips forms without route-implying attributes', () => {
    const html = `
      <form action="/submit">
        <input name="data">
      </form>
    `;
    const bodies = extractFormBodies(html);
    expect(bodies.size).toBe(0);
  });
});
