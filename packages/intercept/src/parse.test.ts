/**
 * Parser tests — drive the real `parse()` from @hyperfixi/core after
 * installing the plugin, then inspect the resulting AST. This validates both
 * our parser function and its integration with `registerFeature` dispatch.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { parse, getParserExtensionRegistry } from '@hyperfixi/core';
import { createInterceptPlugin, _resetForTest } from './index';
import type { InterceptFeatureNode } from './parse';

// Install the plugin against the shared parser-extension registry. We only
// need the *parser* hooks for these tests — no runtime, no navigator.
const registry = getParserExtensionRegistry();
const plugin = createInterceptPlugin({ swUrl: '/hyperfixi-sw.js' });

function installParserHooksOnly(): void {
  plugin.install({
    commandRegistry: {} as never,
    parserExtensions: registry,
    runtime: {} as never,
  });
}

describe('parseInterceptFeature', () => {
  let baseline: ReturnType<typeof registry.snapshot>;

  beforeAll(() => {
    installParserHooksOnly();
  });

  beforeEach(() => {
    baseline = registry.snapshot();
    _resetForTest();
    installParserHooksOnly();
  });

  afterEach(() => {
    registry.restore(baseline);
  });

  function getFeature(input: string): InterceptFeatureNode {
    const r = parse(input);
    expect(r.success, `parse failed: ${JSON.stringify(r.errors)}`).toBe(true);
    // Top-level `parse` returns the single statement directly, or a Program
    // node with `statements` when there are multiple. We only parse one
    // feature per test, so the node is either the feature directly or
    // accessible via .statements[0].
    const root = r.node as { type?: string; statements?: InterceptFeatureNode[] };
    const node =
      root?.type === 'interceptFeature'
        ? (root as unknown as InterceptFeatureNode)
        : root?.statements?.find(s => s?.type === 'interceptFeature');
    expect(node, `expected an interceptFeature node; got root.type=${root?.type}`).toBeDefined();
    return node!;
  }

  it('parses a minimal intercept with only scope and end', () => {
    const node = getFeature('intercept "/"\nend');
    expect(node.config.scope).toBe('/');
    expect(node.config.precache).toBe(null);
    expect(node.config.routes).toEqual([]);
    expect(node.config.offlineFallback).toBe(null);
  });

  it('parses precache with a single URL and no version', () => {
    const node = getFeature('intercept "/"\n  precache "/index.html"\nend');
    expect(node.config.precache).toEqual({ urls: ['/index.html'], version: null });
  });

  it('parses precache with multiple URLs and a version', () => {
    const node = getFeature('intercept "/"\n  precache "/", "/app.js", "/style.css" as "v3"\nend');
    expect(node.config.precache).toEqual({
      urls: ['/', '/app.js', '/style.css'],
      version: 'v3',
    });
  });

  it('parses a route with a single pattern and strategy', () => {
    const node = getFeature('intercept "/"\n  on "/api/*" use network-first\nend');
    expect(node.config.routes).toEqual([{ patterns: ['/api/*'], strategy: 'network-first' }]);
  });

  it('parses a route with multiple patterns', () => {
    const node = getFeature('intercept "/"\n  on "*.css", "*.js" use cache-first\nend');
    expect(node.config.routes).toEqual([{ patterns: ['*.css', '*.js'], strategy: 'cache-first' }]);
  });

  it('accepts all five cache strategies', () => {
    const strategies = [
      'cache-first',
      'network-first',
      'stale-while-revalidate',
      'network-only',
      'cache-only',
    ];
    for (const strat of strategies) {
      const node = getFeature(`intercept "/"\n  on "/a" use ${strat}\nend`);
      expect(node.config.routes[0]!.strategy).toBe(strat);
    }
  });

  it('rejects an unknown strategy', () => {
    const r = parse('intercept "/"\n  on "/a" use bogus\nend');
    expect(r.success).toBe(false);
    const msg = (r.errors ?? [r.error]).map(e => e?.message).join(' | ');
    expect(msg).toMatch(/unknown strategy/);
  });

  it('parses multiple routes in order', () => {
    const node = getFeature(
      'intercept "/"\n' +
        '  on "/api/*" use network-first\n' +
        '  on "*.css" use cache-first\n' +
        'end'
    );
    expect(node.config.routes).toEqual([
      { patterns: ['/api/*'], strategy: 'network-first' },
      { patterns: ['*.css'], strategy: 'cache-first' },
    ]);
  });

  it('parses offline fallback', () => {
    const node = getFeature('intercept "/"\n  offline fallback "/offline.html"\nend');
    expect(node.config.offlineFallback).toBe('/offline.html');
  });

  it('parses a full upstream-equivalent config', () => {
    const node = getFeature(
      'intercept "/"\n' +
        '  precache "/", "/index.html" as "v2"\n' +
        '  on "/api/*" use network-first\n' +
        '  on "*.css", "*.js" use cache-first\n' +
        '  offline fallback "/offline.html"\n' +
        'end'
    );
    expect(node.config).toEqual({
      scope: '/',
      precache: { urls: ['/', '/index.html'], version: 'v2' },
      routes: [
        { patterns: ['/api/*'], strategy: 'network-first' },
        { patterns: ['*.css', '*.js'], strategy: 'cache-first' },
      ],
      offlineFallback: '/offline.html',
    });
  });

  it('accepts a naked-path scope (v2.1)', () => {
    const node = getFeature('intercept /\nend');
    expect(node.config.scope).toBe('/');
  });

  it('parses precache with naked paths', () => {
    const node = getFeature('intercept /\n  precache /, /style.css, /app.js as "v1"\nend');
    expect(node.config.precache).toEqual({
      urls: ['/', '/style.css', '/app.js'],
      version: 'v1',
    });
  });

  it('parses a route with naked-path patterns', () => {
    const node = getFeature('intercept /\n  on /api/*, *.css use network-first\nend');
    expect(node.config.routes).toEqual([
      { patterns: ['/api/*', '*.css'], strategy: 'network-first' },
    ]);
  });

  it('parses offline fallback with a naked path', () => {
    const node = getFeature('intercept /\n  offline fallback /offline.html\nend');
    expect(node.config.offlineFallback).toBe('/offline.html');
  });

  it('mixes quoted and naked paths in a single clause', () => {
    const node = getFeature('intercept /\n  precache /, "/index.html", /style.css\nend');
    expect(node.config.precache?.urls).toEqual(['/', '/index.html', '/style.css']);
  });

  it('parses a full upstream-canonical config with naked paths', () => {
    const node = getFeature(
      'intercept /\n' +
        '  precache /, /style.css, /app.js as "v1"\n' +
        '  on /api/* use network-first\n' +
        '  on *.css, *.js use cache-first\n' +
        '  on * use stale-while-revalidate\n' +
        '  offline fallback /offline.html\n' +
        'end'
    );
    expect(node.config).toEqual({
      scope: '/',
      precache: { urls: ['/', '/style.css', '/app.js'], version: 'v1' },
      routes: [
        { patterns: ['/api/*'], strategy: 'network-first' },
        { patterns: ['*.css', '*.js'], strategy: 'cache-first' },
        { patterns: ['*'], strategy: 'stale-while-revalidate' },
      ],
      offlineFallback: '/offline.html',
    });
  });

  it('rejects intercept without a terminating end', () => {
    const r = parse('intercept "/"\n  precache "/"');
    expect(r.success).toBe(false);
  });

  it('rejects an unknown clause keyword', () => {
    const r = parse('intercept "/"\n  bogus "/x"\nend');
    expect(r.success).toBe(false);
  });

  it('emits the correct AST node type', () => {
    const node = getFeature('intercept "/"\nend');
    expect(node.type).toBe('interceptFeature');
  });
});
