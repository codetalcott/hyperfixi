/**
 * URL Validation Helpers - Shared utilities for URL handling
 *
 * Used by: push-url, replace-url commands
 *
 * These utilities handle:
 * - URL validation with descriptive error messages
 * - External URL detection
 * - URL normalization
 *
 * Bundle size savings: ~20 lines per command using these helpers
 */

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate a URL value for navigation commands
 *
 * Throws descriptive errors for invalid URLs.
 *
 * @param url - URL value to validate
 * @param commandName - Command name for error messages
 * @param debugInfo - Optional debug info to include in errors
 * @returns Validated URL string
 * @throws Error if URL is invalid
 */
export function validateUrl(url: unknown, commandName: string, debugInfo?: string): string {
  const debugSuffix = debugInfo ? ` Debug: ${debugInfo}` : '';

  // Check for null/undefined
  if (url === null || url === undefined) {
    throw new Error(`[HyperFixi] ${commandName}: URL is required.${debugSuffix}`);
  }

  // Check for non-string types
  if (typeof url !== 'string') {
    throw new Error(
      `[HyperFixi] ${commandName}: URL must be a string (got ${typeof url}: ${String(url)}).${debugSuffix}`
    );
  }

  // Check for empty string
  if (url.trim() === '') {
    throw new Error(`[HyperFixi] ${commandName}: URL cannot be empty.${debugSuffix}`);
  }

  // Check for literal "undefined" string (common evaluation bug)
  if (url === 'undefined') {
    throw new Error(
      `[HyperFixi] ${commandName}: URL evaluated to string 'undefined' - check your expression.${debugSuffix}`
    );
  }

  // Check for literal "null" string
  if (url === 'null') {
    throw new Error(
      `[HyperFixi] ${commandName}: URL evaluated to string 'null' - check your expression.${debugSuffix}`
    );
  }

  return url;
}

// ============================================================================
// URL Utilities
// ============================================================================

/**
 * Check if a URL is external (different origin)
 *
 * @param url - URL to check
 * @returns true if URL is external
 */
export function isExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin !== window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Check if a URL is safe for navigation
 *
 * Rejects javascript:, data:, and other potentially dangerous schemes.
 *
 * @param url - URL to check
 * @returns true if URL is safe
 */
export function isSafeUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();

  // Block dangerous schemes
  if (trimmed.startsWith('javascript:')) return false;
  if (trimmed.startsWith('data:')) return false;
  if (trimmed.startsWith('vbscript:')) return false;

  // Allow relative URLs, hash URLs, and standard schemes
  return true;
}

/**
 * Normalize a URL for history operations
 *
 * Handles relative URLs, hash changes, and query strings.
 *
 * @param url - URL to normalize
 * @returns Normalized URL string
 */
export function normalizeUrl(url: string): string {
  // If it's a hash-only URL, return as-is
  if (url.startsWith('#')) {
    return url;
  }

  // If it's a relative URL starting with /, return as-is
  if (url.startsWith('/')) {
    return url;
  }

  // If it's an absolute URL with origin, extract the path
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin === window.location.origin) {
      // Same origin - use pathname + search + hash
      return parsed.pathname + parsed.search + parsed.hash;
    }
    // External URL - return as-is
    return url;
  } catch {
    // Invalid URL - return as-is
    return url;
  }
}

/**
 * Extract search params from URL
 *
 * @param url - URL to extract params from
 * @returns URLSearchParams object
 */
export function extractSearchParams(url: string): URLSearchParams {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.searchParams;
  } catch {
    return new URLSearchParams();
  }
}

/**
 * Build a URL with query parameters
 *
 * @param basePath - Base path (e.g., "/search")
 * @param params - Parameters to add
 * @returns URL with query string
 */
export function buildUrlWithParams(
  basePath: string,
  params: Record<string, string> | URLSearchParams | FormData
): string {
  const searchParams = new URLSearchParams();

  if (params instanceof URLSearchParams) {
    params.forEach((value, key) => searchParams.append(key, value));
  } else if (params instanceof FormData) {
    params.forEach((value, key) => {
      if (typeof value === 'string') {
        searchParams.append(key, value);
      }
    });
  } else {
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, value);
    });
  }

  const queryString = searchParams.toString();
  if (!queryString) {
    return basePath;
  }

  return basePath.includes('?') ? `${basePath}&${queryString}` : `${basePath}?${queryString}`;
}
