import type { HttpMethod } from '../types.js';

/**
 * Extract path parameter names from a URL pattern.
 * Handles both `:param` and `{param}` styles.
 *
 * @example
 *   extractPathParams('/api/users/:id') // ['id']
 *   extractPathParams('/api/users/{id}/orders/{orderId}') // ['id', 'orderId']
 */
export function extractPathParams(url: string): string[] {
  const params: string[] = [];
  // Match :param style
  for (const match of url.matchAll(/:(\w+)/g)) {
    params.push(match[1]);
  }
  // Match {param} style
  for (const match of url.matchAll(/\{(\w+)\}/g)) {
    if (!params.includes(match[1])) {
      params.push(match[1]);
    }
  }
  return params;
}

/**
 * Normalize a URL path:
 * - Convert `{param}` to `:param`
 * - Strip trailing slashes
 * - Ensure leading slash
 * - Strip query strings
 * - Strip fragments
 */
export function normalizeUrl(url: string): string {
  // Strip query string and fragment
  let normalized = url.split('?')[0].split('#')[0];

  // Convert {param} to :param
  normalized = normalized.replace(/\{(\w+)\}/g, ':$1');

  // Ensure leading slash
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }

  // Strip trailing slash (but keep root /)
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

/**
 * Convert a URL path + method into a handler function name.
 *
 * @example
 *   urlToHandlerName('/api/users', 'GET') // 'getApiUsers'
 *   urlToHandlerName('/api/users/:id', 'POST') // 'postApiUsersById'
 */
export function urlToHandlerName(url: string, method: HttpMethod): string {
  const prefix = method.toLowerCase();

  // Remove leading slash, split by / and :
  const segments = url
    .replace(/^\//, '')
    .split('/')
    .map(segment => {
      if (segment.startsWith(':')) {
        // :id -> ById, :userId -> ByUserId
        const param = segment.slice(1);
        return 'By' + capitalize(param);
      }
      // api -> Api, user-list -> UserList
      return segment.split(/[-_]/).map(capitalize).join('');
    });

  return prefix + segments.join('');
}

function capitalize(s: string): string {
  if (!s) return '';
  return s[0].toUpperCase() + s.slice(1);
}
