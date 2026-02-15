/**
 * JSX Domain MCP Tools
 *
 * Provides multilingual JSX/React code generation, parsing, and validation
 * via the @lokascript/domain-jsx package. Supports 4 languages (EN, ES, JA, AR)
 * with SVO, SOV, and VSO word orders.
 */

import { validateRequired, getString, jsonResponse, errorResponse } from './utils.js';

// Lazy-loaded JSX DSL instance
let jsxDSL: any = null;

async function getJSX() {
  if (jsxDSL) return jsxDSL;

  try {
    const mod = await import('@lokascript/domain-jsx');
    jsxDSL = mod.createJSXDSL();
    return jsxDSL;
  } catch {
    throw new Error('@lokascript/domain-jsx not available. Install it to use JSX domain tools.');
  }
}

// =============================================================================
// Tool Definitions
// =============================================================================

export const jsxDomainTools = [
  {
    name: 'parse_jsx',
    description:
      'Parse a natural-language JSX/React description into a semantic representation. ' +
      'Supports 6 commands (element, component, render, state, effect, fragment) in ' +
      'English (SVO), Spanish (SVO), Japanese (SOV), and Arabic (VSO).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        code: {
          type: 'string',
          description:
            'JSX description in natural language (e.g., "element div with className \\"app\\"", ' +
            '"render App into root", "state count initial 0")',
        },
        language: {
          type: 'string',
          description: 'Language code: en, es, ja, ar',
          default: 'en',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'compile_jsx',
    description:
      'Compile a natural-language JSX/React description to JavaScript/JSX code. ' +
      'Generates React-compatible output (JSX elements, useState, useEffect, createRoot, etc.).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        code: {
          type: 'string',
          description: 'JSX description in natural language',
        },
        language: {
          type: 'string',
          description: 'Language code: en, es, ja, ar',
          default: 'en',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'validate_jsx',
    description:
      'Validate a natural-language JSX/React description. Returns whether it parses ' +
      'successfully and any errors. Supports 4 languages.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        code: {
          type: 'string',
          description: 'JSX description to validate',
        },
        language: {
          type: 'string',
          description: 'Language code: en, es, ja, ar',
          default: 'en',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'translate_jsx',
    description:
      'Translate a JSX/React description between natural languages. Parses in the ' +
      'source language and compiles to JSX/React code.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        code: {
          type: 'string',
          description: 'JSX description to translate',
        },
        from: {
          type: 'string',
          description: 'Source language code: en, es, ja, ar',
        },
        to: {
          type: 'string',
          description: 'Target language code: en, es, ja, ar',
        },
      },
      required: ['code', 'from', 'to'],
    },
  },
];

// =============================================================================
// Handler
// =============================================================================

type ToolResponse = { content: Array<{ type: string; text: string }>; isError?: boolean };

export async function handleJSXDomainTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResponse> {
  try {
    switch (name) {
      case 'parse_jsx':
        return await parseJsx(args);
      case 'compile_jsx':
        return await compileJsx(args);
      case 'validate_jsx':
        return await validateJsx(args);
      case 'translate_jsx':
        return await translateJsx(args);
      default:
        return errorResponse(`Unknown JSX tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(`JSX tool error: ${message}`);
  }
}

// =============================================================================
// Helpers
// =============================================================================

function serializeRoles(roles: Map<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of roles) {
    result[key] = value;
  }
  return result;
}

// =============================================================================
// Tool Implementations
// =============================================================================

async function parseJsx(args: Record<string, unknown>): Promise<ToolResponse> {
  const error = validateRequired(args, ['code']);
  if (error) return error;

  const code = getString(args, 'code');
  const language = getString(args, 'language', 'en');

  const jsx = await getJSX();
  const node = jsx.parse(code, language);

  return jsonResponse({
    action: node.action,
    roles: serializeRoles(node.roles),
    language,
    input: code,
  });
}

async function compileJsx(args: Record<string, unknown>): Promise<ToolResponse> {
  const error = validateRequired(args, ['code']);
  if (error) return error;

  const code = getString(args, 'code');
  const language = getString(args, 'language', 'en');

  const jsx = await getJSX();
  const result = jsx.compile(code, language);

  return jsonResponse({
    ok: result.ok,
    jsx: result.code,
    errors: result.errors,
    language,
    input: code,
  });
}

async function validateJsx(args: Record<string, unknown>): Promise<ToolResponse> {
  const error = validateRequired(args, ['code']);
  if (error) return error;

  const code = getString(args, 'code');
  const language = getString(args, 'language', 'en');

  const jsx = await getJSX();
  const result = jsx.validate(code, language);

  return jsonResponse({
    valid: result.valid,
    errors: result.errors,
    language,
    code,
  });
}

async function translateJsx(args: Record<string, unknown>): Promise<ToolResponse> {
  const error = validateRequired(args, ['code', 'from', 'to']);
  if (error) return error;

  const code = getString(args, 'code');
  const from = getString(args, 'from');
  const to = getString(args, 'to');

  const jsx = await getJSX();

  // Parse in source language
  const node = jsx.parse(code, from);

  // Compile to JSX (language-neutral output)
  const compiled = jsx.compile(code, from);

  return jsonResponse({
    input: { code, language: from },
    semantic: { action: node.action, roles: serializeRoles(node.roles) },
    jsx: compiled.ok ? compiled.code : null,
    errors: compiled.errors,
    note: `JSX output is language-neutral. Natural language rendering in '${to}' requires a renderer (not yet implemented for JSX domain).`,
  });
}
