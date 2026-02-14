import { describe, it, expect } from 'vitest';
import { extractPathParams, normalizeUrl, urlToHandlerName } from '../conventions/url-patterns.js';

describe('extractPathParams', () => {
  it('extracts :param style parameters', () => {
    expect(extractPathParams('/api/users/:id')).toEqual(['id']);
  });

  it('extracts {param} style parameters', () => {
    expect(extractPathParams('/api/users/{id}')).toEqual(['id']);
  });

  it('extracts multiple parameters', () => {
    expect(extractPathParams('/api/users/:userId/orders/:orderId')).toEqual(['userId', 'orderId']);
  });

  it('returns empty array for no params', () => {
    expect(extractPathParams('/api/users')).toEqual([]);
  });

  it('deduplicates mixed styles', () => {
    expect(extractPathParams('/api/:id/{id}')).toEqual(['id']);
  });
});

describe('normalizeUrl', () => {
  it('converts {param} to :param', () => {
    expect(normalizeUrl('/api/users/{id}')).toBe('/api/users/:id');
  });

  it('strips query strings', () => {
    expect(normalizeUrl('/api/search?q=hello')).toBe('/api/search');
  });

  it('strips fragments', () => {
    expect(normalizeUrl('/api/users#top')).toBe('/api/users');
  });

  it('ensures leading slash', () => {
    expect(normalizeUrl('api/users')).toBe('/api/users');
  });

  it('strips trailing slash', () => {
    expect(normalizeUrl('/api/users/')).toBe('/api/users');
  });

  it('preserves root path', () => {
    expect(normalizeUrl('/')).toBe('/');
  });
});

describe('urlToHandlerName', () => {
  it('generates camelCase from path + method', () => {
    expect(urlToHandlerName('/api/users', 'GET')).toBe('getApiUsers');
  });

  it('converts params to ByParam', () => {
    expect(urlToHandlerName('/api/users/:id', 'GET')).toBe('getApiUsersById');
  });

  it('handles POST method', () => {
    expect(urlToHandlerName('/api/users', 'POST')).toBe('postApiUsers');
  });

  it('handles hyphenated segments', () => {
    expect(urlToHandlerName('/api/user-list', 'GET')).toBe('getApiUserList');
  });

  it('handles multiple params', () => {
    expect(urlToHandlerName('/api/users/:userId/orders/:orderId', 'DELETE')).toBe(
      'deleteApiUsersByUserIdOrdersByOrderId'
    );
  });
});
