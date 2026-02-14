import type { RouteDescriptor, RouteSource } from '../types.js';
import {
  extractPathParams,
  extractQueryParams,
  normalizeUrl,
} from '../conventions/url-patterns.js';
import { inferConventions } from '../conventions/convention-engine.js';

/**
 * Regex patterns for finding hyperscript with fetch commands.
 * Matches _="..." attributes in various quote styles.
 */
const ATTR_PATTERNS = [
  /_\s*=\s*"([^"]+)"/g,
  /_\s*=\s*'([^']+)'/g,
  /_\s*=\s*`([^`]+)`/g,
  /_=\{`([^`]+)`\}/g, // JSX template literal
  /_=\{['"]([^'"]+)['"]\}/g, // JSX string
];

const SCRIPT_PATTERN = /<script[^>]*type=["']?text\/hyperscript["']?[^>]*>([\s\S]*?)<\/script>/gi;

/**
 * Regex for fetch commands within hyperscript code.
 * Captures: url, optional response type (as json/html/text), optional method (via GET/POST)
 */
const FETCH_COMMAND = /\bfetch\s+['"]?([^\s'"]+)['"]?(?:\s+as\s+(\w+))?(?:\s+via\s+(\w+))?/gi;

/**
 * Regex for "send form to URL" pattern (implies POST).
 */
const SEND_FORM = /\bsend\s+(?:the\s+)?form\s+to\s+['"]?([^\s'"]+)['"]?(?:\s+as\s+(\w+))?/gi;

interface ExtractionOptions {
  file: string;
}

/**
 * Extract route descriptors from hyperscript attributes in file content.
 */
export function extractHyperscriptRoutes(
  content: string,
  options: ExtractionOptions
): RouteDescriptor[] {
  const routes: RouteDescriptor[] = [];
  const seen = new Set<string>();

  // Collect all hyperscript code regions with their line numbers
  const regions = extractHyperscriptRegions(content);

  for (const region of regions) {
    // Extract fetch commands
    for (const match of region.code.matchAll(FETCH_COMMAND)) {
      const rawUrl = match[1];
      const responseType = match[2]; // json, html, text
      const method = match[3]; // GET, POST, etc.

      addRoute(routes, seen, rawUrl, {
        file: options.file,
        line: region.line,
        kind: 'fetch',
        raw: match[0],
        explicitMethod: method,
        fetchResponseType: responseType,
      });
    }

    // Extract "send form to" commands
    for (const match of region.code.matchAll(SEND_FORM)) {
      const rawUrl = match[1];
      const responseType = match[2];

      addRoute(routes, seen, rawUrl, {
        file: options.file,
        line: region.line,
        kind: 'fetch',
        raw: match[0],
        explicitMethod: 'POST',
        fetchResponseType: responseType,
      });
    }
  }

  return routes;
}

interface RegionInfo {
  code: string;
  line: number;
}

function extractHyperscriptRegions(content: string): RegionInfo[] {
  const regions: RegionInfo[] = [];
  const lines = content.split('\n');

  // Search for _="..." attributes
  for (const pattern of ATTR_PATTERNS) {
    // Reset the regex
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const line = lineNumberAt(content, match.index);
      regions.push({ code: match[1], line });
    }
  }

  // Search for <script type="text/hyperscript"> blocks
  SCRIPT_PATTERN.lastIndex = 0;
  let match;
  while ((match = SCRIPT_PATTERN.exec(content)) !== null) {
    const line = lineNumberAt(content, match.index);
    regions.push({ code: match[1], line });
  }

  return regions;
}

function lineNumberAt(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === '\n') line++;
  }
  return line;
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

  // Skip template-only URLs (e.g., {{baseUrl}})
  if (rawUrl.startsWith('{{') || rawUrl.startsWith('${')) {
    return;
  }

  // Skip non-URL strings (e.g., CSS selectors, keywords, bare words ending in colon)
  if (!rawUrl.startsWith('/') && !rawUrl.includes('/')) {
    return;
  }

  // Extract query params BEFORE normalization (which strips them)
  const queryParams = extractQueryParams(rawUrl);
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
    ...(queryParams.length > 0 ? { queryParams } : {}),
    handlerName: conventions.handlerName,
    notes: conventions.notes,
  });
}
