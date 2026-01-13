/**
 * FetchCommand - Decorated Implementation
 *
 * HTTP requests with lifecycle events.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   fetch <url>
 *   fetch <url> as json
 *   fetch <url> with { method:"POST", body:data }
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import {
  command,
  meta,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';

export type FetchResponseType = 'text' | 'json' | 'html' | 'response' | 'blob' | 'arrayBuffer';

export interface FetchCommandInput {
  url: string;
  responseType: FetchResponseType;
  options: RequestInit;
}

export interface FetchCommandOutput {
  status: number;
  statusText: string;
  headers: Headers;
  data: any;
  url: string;
  duration: number;
}

/**
 * FetchCommand - HTTP requests
 *
 * Before: 640 lines
 * After: ~250 lines (61% reduction)
 */
@meta({
  description: 'Make HTTP requests with lifecycle event support',
  syntax: ['fetch <url>', 'fetch <url> as <type>', 'fetch <url> with <options>'],
  examples: [
    'fetch "/api/data"',
    'fetch "/api/users" as json',
    'fetch "/api/save" with { method:"POST" }',
  ],
  sideEffects: ['network', 'event-dispatching'],
})
@command({ name: 'fetch', category: 'async' })
export class FetchCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<FetchCommandInput> {
    if (!raw.args?.length) throw new Error('fetch requires a URL');

    const url = await this.parseURL(raw.args[0], evaluator, context);
    const responseType = this.parseResponseType(raw.modifiers.as);
    const options = await this.parseRequestOptions(raw.modifiers.with, evaluator, context);

    return { url, responseType, options };
  }

  async execute(
    input: FetchCommandInput,
    context: TypedExecutionContext
  ): Promise<FetchCommandOutput> {
    const startTime = Date.now();
    const { url, responseType, options } = input;

    const abortController = new AbortController();
    let abortListener: (() => void) | undefined;
    if (context.me) {
      abortListener = () => abortController.abort();
      context.me.addEventListener('fetch:abort', abortListener, { once: true });
    }

    const requestOptions: RequestInit = { ...options, signal: abortController.signal };

    if (context.me) {
      const detail = {
        ...requestOptions,
        sender: context.me,
        headers: requestOptions.headers || {},
      };
      this.dispatchEvent(context.me, 'fetch:beforeRequest', detail);
      requestOptions.headers = detail.headers;
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if ((options as any).timeout) {
      timeoutId = setTimeout(() => abortController.abort(), (options as any).timeout);
    }

    try {
      let response = await fetch(url, requestOptions);

      if (context.me) {
        const detail = { response };
        this.dispatchEvent(context.me, 'fetch:afterResponse', detail);
        response = detail.response;
      }

      const data = await this.handleResponse(response, responseType);

      if (context.me) this.dispatchEvent(context.me, 'fetch:afterRequest', { result: data });

      const result = {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data,
        url: response.url,
        duration: Date.now() - startTime,
      };

      // Set 'it' to the actual data (not the wrapper) for _hyperscript compatibility
      // This allows `fetch url as json` followed by `it.property` to work correctly
      Object.assign(context, { it: data });

      return result;
    } catch (error) {
      if (context.me)
        this.dispatchEvent(context.me, 'fetch:error', {
          reason: error instanceof Error ? error.message : String(error),
          error,
        });
      if (error instanceof Error && error.name === 'AbortError')
        throw new Error(`Fetch aborted for ${url}`);
      throw new Error(
        `Fetch failed for ${url}: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (context.me && abortListener) context.me.removeEventListener('fetch:abort', abortListener);
    }
  }

  private async parseURL(
    arg: ASTNode,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<string> {
    const v = await evaluator.evaluate(arg, context);
    if (typeof v !== 'string' || !v) throw new Error('fetch: URL must be a non-empty string');
    return v;
  }

  private parseResponseType(asNode: ASTNode | undefined): FetchResponseType {
    if (!asNode) return 'text';
    const n = asNode as any;
    if (n.type === 'identifier') {
      const t = n.name.toLowerCase();
      if (['text', 'json', 'html', 'response', 'blob', 'arraybuffer'].includes(t))
        return t === 'arraybuffer' ? 'arrayBuffer' : (t as FetchResponseType);
      throw new Error(`fetch: invalid response type "${t}"`);
    }
    return 'text';
  }

  private async parseRequestOptions(
    withNode: ASTNode | undefined,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<RequestInit> {
    if (!withNode) return {};
    const opts = await evaluator.evaluate(withNode, context);
    if (typeof opts !== 'object' || opts === null)
      throw new Error('fetch: "with" options must be an object');

    const r: RequestInit = {};
    if ('method' in opts) r.method = String(opts.method).toUpperCase();
    if ('headers' in opts) r.headers = this.parseHeaders(opts.headers);
    if ('body' in opts) r.body = this.parseBody(opts.body);
    if ('credentials' in opts) r.credentials = opts.credentials as RequestCredentials;
    if ('mode' in opts) r.mode = opts.mode as RequestMode;
    if ('cache' in opts) r.cache = opts.cache as RequestCache;
    return r;
  }

  private parseHeaders(h: any): Headers {
    if (h instanceof Headers) return h;
    const headers = new Headers();
    if (typeof h === 'object' && h !== null) {
      for (const [k, v] of Object.entries(h)) headers.set(k, String(v));
    }
    return headers;
  }

  private parseBody(body: any): string | FormData | Blob | ArrayBuffer | URLSearchParams | null {
    if (body === null || body === undefined) return null;
    if (
      body instanceof FormData ||
      body instanceof Blob ||
      body instanceof ArrayBuffer ||
      body instanceof URLSearchParams
    )
      return body;
    if (typeof body === 'string') return body;
    if (typeof body === 'object') return JSON.stringify(body);
    return String(body);
  }

  private async handleResponse(response: Response, type: FetchResponseType): Promise<any> {
    switch (type) {
      case 'response':
        return response;
      case 'json':
        return response.json();
      case 'html':
        return this.parseHTML(await response.text());
      case 'blob':
        return response.blob();
      case 'arrayBuffer':
        return response.arrayBuffer();
      default:
        return response.text();
    }
  }

  private parseHTML(html: string): DocumentFragment | HTMLElement | null {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const fragment = document.createDocumentFragment();
    Array.from(doc.body.childNodes).forEach(n => fragment.appendChild(n.cloneNode(true)));
    if (fragment.childNodes.length === 1 && isHTMLElement(fragment.firstChild))
      return fragment.firstChild as HTMLElement;
    return fragment;
  }

  private dispatchEvent(target: EventTarget, name: string, detail: any): void {
    target.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, cancelable: true }));
  }
}

export const createFetchCommand = createFactory(FetchCommand);
export default FetchCommand;
