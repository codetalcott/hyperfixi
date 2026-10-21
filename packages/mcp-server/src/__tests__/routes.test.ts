/**
 * Tests for the ServerBridge route MCP tools.
 *
 * Both tools read `scanRoutes(...).routes` from the array scanRoutes returns, and threw
 * "Cannot read properties of undefined (reading 'length')" on every input from the day they
 * were added until 7.2.0; no test named either one.
 */

import { describe, it, expect } from 'vitest';
import { handleRouteTool } from '../tools/routes.js';

function parseResult(response: { content: Array<{ text: string }> }) {
  return JSON.parse(response.content[0].text);
}

const PAGE = `
  <button hx-post="/api/save">Save</button>
  <div _="on load fetch /api/items as json then put it into me"></div>
`;

describe('extract_routes', () => {
  it('finds an htmx route and a hyperscript fetch', async () => {
    const response = await handleRouteTool('extract_routes', { html: PAGE });
    expect(response.isError).toBeUndefined();
    const data = parseResult(response);
    expect(data.count).toBe(2);
    const byPath = Object.fromEntries(
      data.routes.map((r: { path: string; method: string }) => [r.path, r.method])
    );
    expect(byPath['/api/save']).toBe('POST');
    expect(byPath['/api/items']).toBe('GET');
    expect(data.conflicts).toEqual([]);
  });

  it('answers an empty page with no routes', async () => {
    const data = parseResult(await handleRouteTool('extract_routes', { html: '<p>hi</p>' }));
    expect(data.count).toBe(0);
  });
});

describe('generate_server_routes', () => {
  it('writes Express scaffolding for the routes it finds', async () => {
    const response = await handleRouteTool('generate_server_routes', {
      html: PAGE,
      framework: 'express',
    });
    expect(response.isError).toBeUndefined();
    const data = parseResult(response);
    expect(data.framework).toBe('express');
    expect(data.routes).toBe(2);
    const code = data.files.map((f: { content: string }) => f.content).join('\n');
    expect(code).toContain('/api/save');
    expect(code).toContain('/api/items');
  });

  it('refuses a framework it does not know', async () => {
    const response = await handleRouteTool('generate_server_routes', {
      html: PAGE,
      framework: 'rails',
    });
    expect(response.isError).toBe(true);
  });
});
