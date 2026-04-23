import { describe, it, expect } from 'vitest';
import { matchesPattern, findRoute, cacheKeyFor } from './pattern-match';
import type { Strategy } from './types';

describe('matchesPattern', () => {
  it('matches everything with *', () => {
    expect(matchesPattern('/', '*')).toBe(true);
    expect(matchesPattern('/anything/nested', '*')).toBe(true);
    expect(matchesPattern('', '*')).toBe(true);
  });

  it('matches extension suffix with *.ext', () => {
    expect(matchesPattern('/style.css', '*.css')).toBe(true);
    expect(matchesPattern('/assets/style.css', '*.css')).toBe(true);
    expect(matchesPattern('/style.js', '*.css')).toBe(false);
    expect(matchesPattern('/cssfile', '*.css')).toBe(false);
  });

  it('matches directory prefix with /prefix/*', () => {
    expect(matchesPattern('/api/users', '/api/*')).toBe(true);
    expect(matchesPattern('/api/users/42', '/api/*')).toBe(true);
    expect(matchesPattern('/api/', '/api/*')).toBe(true);
    expect(matchesPattern('/other', '/api/*')).toBe(false);
    expect(matchesPattern('/apib/x', '/api/*')).toBe(false);
  });

  it('matches exact path', () => {
    expect(matchesPattern('/', '/')).toBe(true);
    expect(matchesPattern('/index.html', '/index.html')).toBe(true);
    expect(matchesPattern('/index.html', '/index')).toBe(false);
  });
});

describe('findRoute', () => {
  const routes: Array<{ patterns: string[]; strategy: Strategy }> = [
    { patterns: ['/api/*'], strategy: 'network-first' },
    { patterns: ['*.css', '*.js'], strategy: 'cache-first' },
    { patterns: ['/'], strategy: 'stale-while-revalidate' },
  ];

  it('returns the first matching route', () => {
    expect(findRoute('/api/users', routes)?.strategy).toBe('network-first');
    expect(findRoute('/style.css', routes)?.strategy).toBe('cache-first');
    expect(findRoute('/', routes)?.strategy).toBe('stale-while-revalidate');
  });

  it('returns null when nothing matches', () => {
    expect(findRoute('/unknown.html', routes)).toBe(null);
  });

  it('checks each pattern within a route', () => {
    expect(findRoute('/app.js', routes)?.strategy).toBe('cache-first');
  });

  it('respects route order — earlier routes win on overlap', () => {
    const overlapping: Array<{ patterns: string[]; strategy: Strategy }> = [
      { patterns: ['*'], strategy: 'network-only' },
      { patterns: ['/api/*'], strategy: 'network-first' },
    ];
    expect(findRoute('/api/x', overlapping)?.strategy).toBe('network-only');
  });
});

describe('cacheKeyFor', () => {
  it('returns the configured version when present', () => {
    expect(cacheKeyFor({ precache: { urls: [], version: 'v2' } })).toBe('v2');
  });
  it('defaults to hs-v1 when no precache', () => {
    expect(cacheKeyFor({ precache: null })).toBe('hs-v1');
  });
  it('defaults to hs-v1 when precache has no version', () => {
    expect(cacheKeyFor({ precache: { urls: ['/'], version: null } })).toBe('hs-v1');
  });
});
