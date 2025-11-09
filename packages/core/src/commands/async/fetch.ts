/**
 * Fetch Command Implementation
 * HTTP requests with comprehensive lifecycle events
 *
 * Syntax:
 *   fetch <url> [as (json|html|response|Type)] [with <options>]
 *
 * Supports:
 * - All HTTP methods (GET, POST, PUT, DELETE, etc.)
 * - Response types: json, html, response, text, custom conversions
 * - Request configuration via 'with' clause
 * - Lifecycle events: beforeRequest, afterResponse, afterRequest, error
 * - Abort support via 'fetch:abort' event
 * - Timeouts
 * - Template literals for dynamic URLs
 */

import { v, z } from '../../validation/lightweight-validators';
import type {
  TypedCommandImplementation,
  TypedExecutionContext,
  EvaluationResult,
  CommandMetadata,
  LLMDocumentation,
} from '../../types/command-types';

// ============================================================================
// Type Definitions
// ============================================================================

export type FetchResponseType = 'text' | 'json' | 'html' | 'response';

// Internal parsed input type for documentation
export interface FetchCommandInputData {
  url: string;
  responseType?: FetchResponseType;
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string | FormData | Blob | ArrayBuffer | URLSearchParams;
    timeout?: number;
    mode?: RequestMode;
    credentials?: RequestCredentials;
    cache?: RequestCache;
    redirect?: RequestRedirect;
    referrer?: string;
    referrerPolicy?: ReferrerPolicy;
    integrity?: string;
  };
}

type FetchCommandInput = any; // Inferred from RuntimeValidator

export interface FetchCommandOutput {
  status: number;
  statusText: string;
  headers: Headers;
  data: any;
  url: string;
  duration: number;
}

// ============================================================================
// Input Validation Schema
// ============================================================================

const FetchOptionsSchema = v.object({
  method: v.string().optional().describe('HTTP method (GET, POST, etc.)'),
  headers: z.record(v.string(), v.string()).optional().describe('Request headers'),
  body: v.unknown().optional().describe('Request body'),
  timeout: v.number().min(0).optional().describe('Timeout in milliseconds'),
  mode: v.string().optional().describe('Request mode'),
  credentials: v.string().optional().describe('Credentials mode'),
  cache: v.string().optional().describe('Cache mode'),
  redirect: v.string().optional().describe('Redirect mode'),
  referrer: v.string().optional().describe('Referrer'),
  referrerPolicy: v.string().optional().describe('Referrer policy'),
  integrity: v.string().optional().describe('Subresource integrity'),
});

const FetchCommandInputSchema = v.object({
  url: v.string().describe('URL to fetch from'),
  responseType: z
    .enum(['text', 'json', 'html', 'response'])
    .optional()
    .describe('Response parsing type'),
  options: FetchOptionsSchema.optional().describe('Fetch options'),
});

// ============================================================================
// Fetch Command Implementation
// ============================================================================

/**
 * Fetch Command - HTTP requests with lifecycle events
 *
 * This command implements the hyperscript fetch functionality:
 * - All HTTP methods
 * - Response type handling
 * - Event lifecycle management
 * - Request cancellation
 * - Timeout handling
 */
export class FetchCommand
  implements
    TypedCommandImplementation<FetchCommandInput, FetchCommandOutput, TypedExecutionContext>
{
  public readonly name = 'fetch' as const;
  public readonly syntax = 'fetch <url> [as (json|html|response)] [with <options>]';
  public readonly description = 'Issues HTTP requests with comprehensive lifecycle event support';
  public readonly inputSchema = FetchCommandInputSchema;
  public readonly outputType = 'object' as const;

  public readonly metadata: CommandMetadata = {
    category: 'Communication',
    complexity: 'complex',
    sideEffects: ['network', 'event-dispatching'],
    examples: [
      {
        code: 'fetch /api/data',
        description: 'Fetch data as text',
        expectedOutput: 'string',
      },
      {
        code: 'fetch /api/users as json',
        description: 'Fetch and parse JSON',
        expectedOutput: 'object',
      },
      {
        code: 'fetch /api/save as json with method:"POST"',
        description: 'POST request with JSON response',
        expectedOutput: 'object',
      },
      {
        code: 'fetch /page as html',
        description: 'Fetch HTML fragment',
        expectedOutput: 'HTMLElement',
      },
      {
        code: 'fetch /slow with timeout:5000',
        description: 'Fetch with 5 second timeout',
        expectedOutput: 'string',
      },
    ],
    relatedCommands: ['wait', 'async', 'call'],
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Issues HTTP requests using the Fetch API with lifecycle event support',
    examples: [
      {
        title: 'Basic GET request',
        code: 'fetch "/api/users" as json',
        explanation: 'Fetch JSON data from an API endpoint',
        output: '{ users: [...] }',
      },
      {
        title: 'POST request with data',
        code: 'fetch "/api/users" with { method: "POST", body: data }',
        explanation: 'Send a POST request with body data',
        output: 'Response',
      },
      {
        title: 'HTML fragment fetch',
        code: 'fetch "/partial.html" as html',
        explanation: 'Fetch and parse HTML fragment',
        output: 'HTMLElement | DocumentFragment',
      },
    ],
    parameters: [
      {
        name: 'url',
        type: 'string',
        description: 'URL to fetch from (supports template literals)',
        optional: false,
        examples: ['/api/data', 'https://example.com', '`/users/${userId}`'],
      },
      {
        name: 'responseType',
        type: '"json" | "html" | "response" | "text"',
        description: 'How to parse the response',
        optional: true,
        examples: ['json', 'html', 'response'],
      },
      {
        name: 'options',
        type: 'object',
        description: 'Fetch options (method, headers, body, timeout, etc.)',
        optional: true,
        examples: ['{ method: "POST" }', '{ headers: { "X-Auth": "token" } }'],
      },
    ],
    returns: {
      type: 'Promise<any>',
      description: 'Resolves with parsed response based on responseType',
      examples: ['{ name: "John" }', '<div>HTML</div>', 'text content'],
    },
    seeAlso: ['go', 'post', 'put', 'delete'],
    tags: ['async', 'http', 'network', 'request', 'ajax'],
  };

  /**
   * Validate command arguments
   */
  validate(_args: unknown[]): import('../../types/base-types').ValidationResult {
    // Basic validation - accept any args for now
    // More sophisticated validation could check URL formats, options, etc.
    return {
      isValid: true,
      errors: [],
      suggestions: [],
    };
  }

  /**
   * Execute the fetch command
   */
  async execute(
    context: TypedExecutionContext,
    ...args: any[]
  ): Promise<EvaluationResult<FetchCommandOutput>> {
    const startTime = Date.now();

    // Parse input - args[0] contains the parsed input object from the parser
    const input = args[0] as FetchCommandInputData;
    const { url, responseType = 'text', options = {} } = input;

    // Setup abort controller for cancellation support
    const abortController = new AbortController();
    let abortListener: (() => void) | undefined;

    if (context.me) {
      abortListener = () => abortController.abort();
      context.me.addEventListener('fetch:abort', abortListener, { once: true });
    }

    // Prepare request details
    const detail: any = {
      ...options,
      sender: context.me,
      headers: options.headers || {},
      signal: abortController.signal,
    };

    // Fire beforeRequest event (allows header configuration)
    if (context.me) {
      this.dispatchEvent(context.me, 'fetch:beforeRequest', detail);
      this.dispatchEvent(context.me, 'hyperscript:beforeFetch', detail); // Legacy support
    }

    // Setup timeout if specified
    let timeoutId: NodeJS.Timeout | undefined;
    if (options.timeout) {
      timeoutId = setTimeout(() => {
        abortController.abort();
      }, options.timeout);
    }

    try {
      // Execute fetch
      let response = await fetch(url, detail);

      // Fire afterResponse event (allows response mutation)
      if (context.me) {
        const responseDetail = { response };
        this.dispatchEvent(context.me, 'fetch:afterResponse', responseDetail);
        response = responseDetail.response; // Allow event handler to mutate response
      }

      // Parse response based on type
      let result: any;

      if (responseType === 'response') {
        // Return raw response object
        result = response;
      } else if (responseType === 'json') {
        // Parse as JSON
        result = await response.json();
      } else if (responseType === 'html') {
        // Parse as HTML fragment
        const text = await response.text();
        result = this.parseHTML(text);
      } else {
        // Default: parse as text
        result = await response.text();
      }

      // Fire afterRequest event
      if (context.me) {
        this.dispatchEvent(context.me, 'fetch:afterRequest', { result });
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        value: {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: result,
          url: response.url,
          duration,
        },
        type: 'object',
      };
    } catch (error) {
      // Fire error event
      if (context.me) {
        this.dispatchEvent(context.me, 'fetch:error', {
          reason: error instanceof Error ? error.message : String(error),
          error,
        });
      }

      return {
        success: false,
        error: {
          name: 'FetchError',
          type: 'runtime-error',
          message: `Fetch failed for ${url}: ${error instanceof Error ? error.message : String(error)}`,
          code: 'FETCH_FAILED',
          suggestions: [
            'Check URL validity',
            'Verify network connectivity',
            'Review CORS settings',
          ],
        },
        type: 'error',
      };
    } finally {
      // Cleanup
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (context.me && abortListener) {
        context.me.removeEventListener('fetch:abort', abortListener);
      }
    }
  }

  /**
   * Parse HTML string into DOM fragment
   */
  private parseHTML(html: string): DocumentFragment | HTMLElement | null {
    // Use DOMParser for safer HTML parsing
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Return body content as fragment
    const fragment = document.createDocumentFragment();
    Array.from(doc.body.childNodes).forEach(node => {
      fragment.appendChild(node.cloneNode(true));
    });

    // If single element, return that element
    if (fragment.childNodes.length === 1 && fragment.firstChild instanceof HTMLElement) {
      return fragment.firstChild;
    }

    return fragment;
  }

  /**
   * Dispatch custom event
   */
  private dispatchEvent(target: EventTarget, eventName: string, detail: any): void {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true,
    });
    target.dispatchEvent(event);
  }
}

/**
 * Factory function to create the fetch command
 */
export function createFetchCommand(): FetchCommand {
  return new FetchCommand();
}

export default FetchCommand;
