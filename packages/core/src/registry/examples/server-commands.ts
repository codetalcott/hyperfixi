/**
 * Example: Server-Side Commands
 *
 * Demonstrates how to create custom commands for server-side hyperscript.
 * These commands work with HTTP request/response in the execution context.
 *
 * Usage in hyperscript:
 *   on request(GET, /api/users)
 *     set users to [{ name: 'Alice' }, { name: 'Bob' }]
 *     respond with <json> users </json>
 *
 *   on request(POST, /api/login)
 *     if not valid(request.body)
 *       respond with status 400 and <json> { error: 'Invalid' } </json>
 *     end
 *     setHeader 'X-Auth-Token' to token
 *     respond with <json> { success: true } </json>
 *
 *   on request(GET, /dashboard)
 *     redirect to '/login' if not authenticated
 *
 * Installation:
 *   import { commands } from '@hyperfixi/core/registry';
 *   import { respondCommand, redirectCommand, setHeaderCommand } from './server-commands';
 *
 *   commands.register(respondCommand);
 *   commands.register(redirectCommand);
 *   commands.register(setHeaderCommand);
 */

import type { CommandWithParseInput } from '../../runtime/command-adapter';
import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Response interface (matches server-event-source.ts)
 */
interface ServerResponse {
  status(code: number): ServerResponse;
  header(name: string, value: string): ServerResponse;
  json(data: unknown): void;
  html(content: string): void;
  text(content: string): void;
  redirect(url: string, code?: number): void;
  send(data: unknown): void;
}

// ============================================================================
// respond command
// ============================================================================

interface RespondInput {
  content: unknown;
  contentType: 'json' | 'html' | 'text' | 'auto';
  statusCode: number;
}

/**
 * respond command - Send HTTP response
 *
 * Syntax:
 *   respond with <content>
 *   respond with status <code> and <content>
 *   respond with <json> data </json>
 *   respond with <html> content </html>
 */
export const respondCommand: CommandWithParseInput = {
  name: 'respond',

  metadata: {
    description: 'Send HTTP response to client',
    syntax: [
      'respond with <content>',
      'respond with status <code> and <content>',
      'respond with <json> data </json>',
      'respond with <html> content </html>',
    ],
    examples: [
      'respond with users',
      'respond with status 201 and newUser',
      'respond with <json> { success: true } </json>',
    ],
    category: 'server',
  },

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, any> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<RespondInput> {
    let content: unknown = null;
    let contentType: 'json' | 'html' | 'text' | 'auto' = 'auto';
    let statusCode = 200;

    const args = raw.args || [];

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      // Check for 'status' keyword
      if (arg.type === 'identifier' && (arg as any).name?.toLowerCase() === 'status') {
        const nextArg = args[i + 1];
        if (nextArg) {
          statusCode = Number(await evaluator.evaluate(nextArg, context)) || 200;
          i++; // Skip the status code arg
        }
        continue;
      }

      // Check for content type markers
      if (arg.type === 'identifier') {
        const name = ((arg as any).name || '').toLowerCase();
        if (name === 'json') {
          contentType = 'json';
          continue;
        } else if (name === 'html') {
          contentType = 'html';
          continue;
        } else if (name === 'text') {
          contentType = 'text';
          continue;
        }
      }

      // Evaluate content
      if (content === null) {
        content = await evaluator.evaluate(arg, context);
      }
    }

    // Handle modifiers
    if (raw.modifiers?.status) {
      statusCode = Number(await evaluator.evaluate(raw.modifiers.status, context)) || 200;
    }
    if (raw.modifiers?.as) {
      const asType = String(await evaluator.evaluate(raw.modifiers.as, context)).toLowerCase();
      if (asType === 'json' || asType === 'html' || asType === 'text') {
        contentType = asType;
      }
    }

    return { content, contentType, statusCode };
  },

  async execute(input: RespondInput, context: TypedExecutionContext): Promise<void> {
    const response = context.locals.get('response') as ServerResponse | undefined;

    if (!response) {
      throw new Error(
        "respond command requires 'response' in context. " +
          "Make sure you're in a server request handler."
      );
    }

    // Set status code
    response.status(input.statusCode);

    // Send response based on content type
    switch (input.contentType) {
      case 'json':
        response.json(input.content);
        break;
      case 'html':
        response.html(String(input.content));
        break;
      case 'text':
        response.text(String(input.content));
        break;
      case 'auto':
      default:
        // Auto-detect based on content
        if (typeof input.content === 'object' && input.content !== null) {
          response.json(input.content);
        } else if (typeof input.content === 'string' && input.content.trim().startsWith('<')) {
          response.html(input.content);
        } else {
          response.send(input.content);
        }
    }
  },
};

// ============================================================================
// redirect command
// ============================================================================

interface RedirectInput {
  url: string;
  statusCode: number;
}

/**
 * redirect command - HTTP redirect response
 *
 * Syntax:
 *   redirect to <url>
 *   redirect to <url> with status <code>
 *   redirect permanently to <url>
 */
export const redirectCommand: CommandWithParseInput = {
  name: 'redirect',

  metadata: {
    description: 'Send HTTP redirect response',
    syntax: [
      'redirect to <url>',
      'redirect to <url> with status <code>',
      'redirect permanently to <url>',
    ],
    examples: [
      'redirect to "/login"',
      'redirect to "/dashboard" with status 303',
      'redirect permanently to "https://new-domain.com"',
    ],
    category: 'server',
  },

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, any> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<RedirectInput> {
    let url = '/';
    let statusCode = 302; // Default to temporary redirect

    const args = raw.args || [];

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      // Check for 'permanently' keyword -> 301
      if (arg.type === 'identifier' && (arg as any).name?.toLowerCase() === 'permanently') {
        statusCode = 301;
        continue;
      }

      // Check for 'temporarily' keyword -> 302
      if (arg.type === 'identifier' && (arg as any).name?.toLowerCase() === 'temporarily') {
        statusCode = 302;
        continue;
      }

      // Evaluate URL
      const value = await evaluator.evaluate(arg, context);
      if (typeof value === 'string') {
        url = value;
      }
    }

    // Handle modifiers
    if (raw.modifiers?.status) {
      statusCode = Number(await evaluator.evaluate(raw.modifiers.status, context)) || 302;
    }

    return { url, statusCode };
  },

  async execute(input: RedirectInput, context: TypedExecutionContext): Promise<void> {
    const response = context.locals.get('response') as ServerResponse | undefined;

    if (!response) {
      throw new Error(
        "redirect command requires 'response' in context. " +
          "Make sure you're in a server request handler."
      );
    }

    response.redirect(input.url, input.statusCode);
  },
};

// ============================================================================
// setHeader command
// ============================================================================

interface SetHeaderInput {
  name: string;
  value: string;
}

/**
 * setHeader command - Set HTTP response header
 *
 * Syntax:
 *   setHeader <name> to <value>
 *   setHeader 'Content-Type' to 'application/json'
 */
export const setHeaderCommand: CommandWithParseInput = {
  name: 'setHeader',

  metadata: {
    description: 'Set HTTP response header',
    aliases: ['setheader', 'header'],
    syntax: ['setHeader <name> to <value>', "setHeader 'Header-Name' to value"],
    examples: [
      "setHeader 'Content-Type' to 'application/json'",
      "setHeader 'Cache-Control' to 'no-cache'",
      "setHeader 'X-Custom' to customValue",
    ],
    category: 'server',
  },

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, any> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<SetHeaderInput> {
    let name = '';
    let value = '';

    const args = raw.args || [];

    // First arg is header name
    if (args[0]) {
      name = String(await evaluator.evaluate(args[0], context));
    }

    // Look for 'to' modifier or second arg
    if (raw.modifiers?.to) {
      value = String(await evaluator.evaluate(raw.modifiers.to, context));
    } else if (args[1]) {
      value = String(await evaluator.evaluate(args[1], context));
    }

    return { name, value };
  },

  async execute(input: SetHeaderInput, context: TypedExecutionContext): Promise<void> {
    const response = context.locals.get('response') as ServerResponse | undefined;

    if (!response) {
      throw new Error(
        "setHeader command requires 'response' in context. " +
          "Make sure you're in a server request handler."
      );
    }

    if (!input.name) {
      throw new Error('setHeader requires a header name');
    }

    response.header(input.name, input.value);
  },
};

// ============================================================================
// Server plugin bundle
// ============================================================================

import { definePlugin } from '../index';

/**
 * Server plugin - Bundle of server-side commands and context providers
 *
 * Installation:
 *   import { registry } from '@hyperfixi/core';
 *   import { serverPlugin } from '@hyperfixi/core/registry/examples/server-commands';
 *
 *   registry.use(serverPlugin);
 */
export const serverPlugin = definePlugin({
  name: 'hyperfixi-server',
  version: '1.0.0',

  commands: [respondCommand, redirectCommand, setHeaderCommand],

  contextProviders: [
    {
      name: 'request',
      provide: ctx => ctx.locals.get('request'),
      options: { description: 'Current HTTP request', cache: false },
    },
    {
      name: 'response',
      provide: ctx => ctx.locals.get('response'),
      options: { description: 'HTTP response builder', cache: false },
    },
    {
      name: 'body',
      provide: ctx => {
        const request = ctx.locals.get('request') as { body?: unknown } | undefined;
        return request?.body;
      },
      options: { description: 'Request body', cache: true },
    },
    {
      name: 'query',
      provide: ctx => {
        const request = ctx.locals.get('request') as { query?: unknown } | undefined;
        return request?.query;
      },
      options: { description: 'Query parameters', cache: true },
    },
    {
      name: 'params',
      provide: ctx => {
        const request = ctx.locals.get('request') as { params?: unknown } | undefined;
        return request?.params;
      },
      options: { description: 'Route parameters', cache: true },
    },
  ],

  setup(registry) {
    console.log('[hyperfixi-server] Server plugin installed');
  },
});
