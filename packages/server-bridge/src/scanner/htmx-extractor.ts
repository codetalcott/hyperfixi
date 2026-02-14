import type { RouteDescriptor, HttpMethod, RouteSource } from '../types.js';
import { extractPathParams, normalizeUrl } from '../conventions/url-patterns.js';
import { inferConventions } from '../conventions/convention-engine.js';

/**
 * Regex patterns forked from packages/vite-plugin/src/scanner.ts (lines 12-21)
 * with URL capture groups added for route extraction.
 */
const HTMX_REQUEST_PATTERN =
  /\b(hx-get|hx-post|hx-put|hx-patch|hx-delete)\s*=\s*["']([^"']+)["']/gi;

const FIXI_ACTION_PATTERN = /\bfx-action\s*=\s*["']([^"']+)["']/gi;
const FIXI_METHOD_PATTERN = /\bfx-method\s*=\s*["'](GET|POST|PUT|PATCH|DELETE)["']/gi;

const HTMX_TARGET_PATTERN = /\b(?:hx-target|fx-target)\s*=\s*["']([^"']+)["']/gi;
const HTMX_SWAP_PATTERN = /\b(?:hx-swap|fx-swap)\s*=\s*["']([^"']+)["']/gi;

/** Map hx-{method} attribute names to HTTP methods */
const HTMX_METHOD_MAP: Record<string, HttpMethod> = {
  'hx-get': 'GET',
  'hx-post': 'POST',
  'hx-put': 'PUT',
  'hx-patch': 'PATCH',
  'hx-delete': 'DELETE',
};

interface ExtractionOptions {
  file: string;
}

/**
 * Extract route descriptors from htmx (hx-*) and fixi (fx-*) attributes.
 */
export function extractHtmxRoutes(content: string, options: ExtractionOptions): RouteDescriptor[] {
  const routes: RouteDescriptor[] = [];
  const seen = new Set<string>();

  // --- htmx request attributes: hx-get, hx-post, etc. ---
  HTMX_REQUEST_PATTERN.lastIndex = 0;
  let match;
  while ((match = HTMX_REQUEST_PATTERN.exec(content)) !== null) {
    const attrName = match[1].toLowerCase();
    const rawUrl = match[2];
    const method = HTMX_METHOD_MAP[attrName];
    if (!method) continue;

    addRoute(routes, seen, rawUrl, {
      file: options.file,
      line: lineNumberAt(content, match.index),
      kind: 'hx-attr',
      raw: `${match[1]}="${match[2]}"`,
      explicitMethod: method,
      // htmx default response is html (server-rendered partials)
      fetchResponseType: 'html',
    });
  }

  // --- fixi action attributes ---
  // Collect fx-method if present (for context)
  const fxMethods = collectFxMethods(content);

  FIXI_ACTION_PATTERN.lastIndex = 0;
  while ((match = FIXI_ACTION_PATTERN.exec(content)) !== null) {
    const rawUrl = match[1];
    const line = lineNumberAt(content, match.index);

    // Try to find a fx-method near this fx-action (within ~200 chars)
    const nearbyMethod = findNearbyFxMethod(content, match.index, fxMethods);

    addRoute(routes, seen, rawUrl, {
      file: options.file,
      line,
      kind: 'fx-attr',
      raw: `fx-action="${match[1]}"`,
      explicitMethod: nearbyMethod,
    });
  }

  return routes;
}

function lineNumberAt(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === '\n') line++;
  }
  return line;
}

interface FxMethodMatch {
  method: string;
  index: number;
}

function collectFxMethods(content: string): FxMethodMatch[] {
  const methods: FxMethodMatch[] = [];
  FIXI_METHOD_PATTERN.lastIndex = 0;
  let match;
  while ((match = FIXI_METHOD_PATTERN.exec(content)) !== null) {
    methods.push({ method: match[1], index: match.index });
  }
  return methods;
}

/**
 * Find an fx-method attribute near an fx-action attribute.
 * "Near" means within the same HTML element (~300 chars).
 */
function findNearbyFxMethod(
  content: string,
  actionIndex: number,
  fxMethods: FxMethodMatch[]
): string | undefined {
  for (const fm of fxMethods) {
    if (Math.abs(fm.index - actionIndex) < 300) {
      return fm.method;
    }
  }
  return undefined;
}

interface AddRouteOptions {
  file: string;
  line: number;
  kind: RouteSource['kind'];
  raw: string;
  explicitMethod?: string;
  fetchResponseType?: string;
}

function addRoute(
  routes: RouteDescriptor[],
  seen: Set<string>,
  rawUrl: string,
  options: AddRouteOptions
): void {
  // Skip external URLs
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    return;
  }

  const path = normalizeUrl(rawUrl);

  const conventions = inferConventions(path, {
    explicitMethod: options.explicitMethod,
    fetchResponseType: options.fetchResponseType,
  });

  const key = `${conventions.method}:${path}`;
  if (seen.has(key)) return;
  seen.add(key);

  routes.push({
    path,
    method: conventions.method,
    responseFormat: conventions.responseFormat,
    source: {
      file: options.file,
      line: options.line,
      kind: options.kind,
      raw: options.raw,
    },
    pathParams: extractPathParams(path),
    handlerName: conventions.handlerName,
    notes: conventions.notes,
  });
}
