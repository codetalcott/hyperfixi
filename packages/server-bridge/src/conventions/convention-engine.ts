import type { HttpMethod } from '../types.js';
import { urlToHandlerName } from './url-patterns.js';

export interface ConventionContext {
  /** HTML element tag (e.g., 'form', 'button') */
  elementTag?: string;
  /** Explicit response type from hyperscript (e.g., 'json', 'html') */
  fetchResponseType?: string;
  /** Explicit method from source (e.g., from hx-post, fx-method) */
  explicitMethod?: string;
}

export interface ConventionResult {
  method: HttpMethod;
  responseFormat: 'json' | 'text' | 'html';
  handlerName: string;
  notes: string[];
}

/**
 * Infer HTTP method, response format, and handler name from URL and context.
 *
 * Priority:
 * 1. Explicit method always wins (hx-post, fx-method, fetch via POST)
 * 2. Form context implies POST
 * 3. Default: GET
 *
 * Response format:
 * 1. Explicit format from hyperscript (as json, as html)
 * 2. URL ending in .html → html
 * 3. Default: json
 */
export function inferConventions(url: string, context: ConventionContext = {}): ConventionResult {
  const notes: string[] = [];

  // --- Method ---
  let method: HttpMethod;
  if (context.explicitMethod) {
    method = context.explicitMethod.toUpperCase() as HttpMethod;
  } else if (context.elementTag === 'form') {
    method = 'POST';
    notes.push('Inferred POST from <form> context');
  } else {
    method = 'GET';
  }

  // --- Response Format ---
  let responseFormat: 'json' | 'text' | 'html';
  if (context.fetchResponseType) {
    const fmt = context.fetchResponseType.toLowerCase();
    if (fmt === 'json' || fmt === 'html' || fmt === 'text') {
      responseFormat = fmt;
    } else {
      responseFormat = 'json';
      notes.push(`Unknown response type "${context.fetchResponseType}", defaulting to json`);
    }
  } else if (url.endsWith('.html') || url.includes('/pages/') || url.includes('/partials/')) {
    responseFormat = 'html';
    notes.push('Inferred html response from URL pattern');
  } else {
    responseFormat = 'json';
  }

  // --- Handler Name ---
  const handlerName = urlToHandlerName(url, method);

  return { method, responseFormat, handlerName, notes };
}
