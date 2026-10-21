/**
 * Toolsets: LOKASCRIPT_MCP_TOOLSETS decides what tools/list shows, and nothing else.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { TOOLSET_NAMES, listedTools, parseToolsets, toolsetOf } from '../toolsets.js';

const noDomainTools = () => false;

describe('parseToolsets', () => {
  it('turns on core alone by default', () => {
    expect([...parseToolsets(undefined).enabled]).toEqual(['core']);
    expect([...parseToolsets('').enabled]).toEqual(['core']);
  });

  it('reads a comma or space list, in any case', () => {
    const { enabled, unknown } = parseToolsets(' Domains, lse grail ');
    expect([...enabled].sort()).toEqual(['core', 'domains', 'grail', 'lse']);
    expect(unknown).toEqual([]);
  });

  it('turns on every toolset for `all`', () => {
    expect(parseToolsets('all').enabled.size).toBe(TOOLSET_NAMES.length + 1);
  });

  it('reports names it does not know, and turns on the rest', () => {
    const { enabled, unknown } = parseToolsets('debug,dbg');
    expect(enabled.has('debug')).toBe(true);
    expect(unknown).toEqual(['dbg']);
  });
});

describe('listedTools', () => {
  const tools = [
    { name: 'validate_and_compile' },
    { name: 'grail_check' },
    { name: 'parse_sql' },
    { name: 'not_assigned' },
  ];
  const isDomainTool = (name: string) => name === 'parse_sql';

  it('lists the core tools by default', () => {
    expect(listedTools(tools, parseToolsets(undefined).enabled, isDomainTool)).toEqual([
      { name: 'validate_and_compile' },
    ]);
  });

  it("adds a toolset's tools, and a registry tool to domains", () => {
    const names = listedTools(tools, parseToolsets('grail,domains').enabled, isDomainTool).map(
      t => t.name
    );
    expect(names).toEqual(['validate_and_compile', 'grail_check', 'parse_sql']);
  });

  it('never lists a tool with no toolset', () => {
    expect(toolsetOf('not_assigned', noDomainTools)).toBeUndefined();
    const names = listedTools(tools, parseToolsets('all').enabled, isDomainTool).map(t => t.name);
    expect(names).not.toContain('not_assigned');
  });
});

describe('index.ts filters the list, not the calls', () => {
  // index.ts calls main() at module scope, so it is read as source (as dispatch-routing does).
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'index.ts'), 'utf8');
  const callHandler = src.slice(
    src.indexOf("setRequestHandler('tools/call'"),
    src.indexOf("setRequestHandler('prompts/list'")
  );

  it('reads the toolsets once, from LOKASCRIPT_MCP_TOOLSETS', () => {
    expect(src).toMatch(/parseToolsets\(process\.env\.LOKASCRIPT_MCP_TOOLSETS\)/);
  });

  it('dispatches a hidden tool like a listed one', () => {
    expect(callHandler.length).toBeGreaterThan(1000);
    expect(callHandler).not.toMatch(/TOOLSETS|listedTools|toolsetOf/);
  });
});
