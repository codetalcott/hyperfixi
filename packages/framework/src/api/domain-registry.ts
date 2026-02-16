/**
 * Domain Registry
 *
 * Provides auto-discovery and registration of framework domains for MCP servers.
 * Instead of hardcoding tool definitions and dispatch logic per domain, domains
 * export a `DomainDescriptor` and the registry generates everything automatically.
 *
 * @example
 * ```typescript
 * import { DomainRegistry } from '@lokascript/framework';
 *
 * const registry = new DomainRegistry();
 *
 * // Register domains (each provides a descriptor)
 * registry.register({
 *   name: 'sql',
 *   description: 'Natural language SQL',
 *   languages: ['en', 'es', 'ja', 'ar'],
 *   inputLabel: 'query',
 *   inputDescription: 'SQL query in natural language',
 *   getDSL: () => import('@lokascript/domain-sql').then(m => m.createSQLDSL()),
 *   getRenderer: () => import('@lokascript/domain-sql').then(m => m.renderSQL),
 * });
 *
 * // Auto-generate MCP tool definitions
 * const tools = registry.getToolDefinitions();
 *
 * // Dispatch a tool call
 * const result = await registry.handleToolCall('parse_sql', { query: 'select name from users' });
 * ```
 */

import type { SemanticNode } from '../core/types';
import type { MultilingualDSL, CompileResult, ValidationResult } from './create-dsl';
import type { NaturalLanguageRenderer } from '../generation/renderer';

// =============================================================================
// Descriptor Interface
// =============================================================================

/**
 * Describes a domain for auto-registration in MCP servers.
 *
 * Domains provide this descriptor to the registry, which generates
 * tool definitions and handles dispatch automatically.
 */
export interface DomainDescriptor {
  /** Short identifier (used in tool names: parse_{name}, compile_{name}, etc.) */
  readonly name: string;

  /** Human-readable description */
  readonly description: string;

  /** Supported language codes */
  readonly languages: readonly string[];

  /** Label for the primary input parameter (e.g., 'query', 'scenario', 'code') */
  readonly inputLabel: string;

  /** Description of the primary input parameter */
  readonly inputDescription: string;

  /**
   * Factory to lazily create the DSL instance.
   * Called once on first tool use. The result is cached.
   */
  readonly getDSL: () => MultilingualDSL | Promise<MultilingualDSL>;

  /**
   * Factory to lazily create the renderer.
   * Required for translate_{name} tool. Called once on first use.
   */
  readonly getRenderer?: () =>
    | NaturalLanguageRenderer
    | ((node: SemanticNode, language: string) => string)
    | Promise<NaturalLanguageRenderer | ((node: SemanticNode, language: string) => string)>;

  /**
   * Which standard tools to generate. Default: all four.
   */
  readonly tools?: readonly ('parse' | 'compile' | 'validate' | 'translate')[];

  /**
   * Optional scan configuration for AOT compilation and Vite plugin.
   * Declares which HTML attributes/script types this domain uses.
   */
  readonly scanConfig?: {
    /** Attribute names to scan for (e.g., ['data-sql', '_sql']) */
    readonly attributes: readonly string[];
    /** Script tag types to scan for (e.g., ['text/sql-dsl']) */
    readonly scriptTypes?: readonly string[];
    /** Default language when not specified on element */
    readonly defaultLanguage?: string;
    /** Keywords for detection, keyed by language code */
    readonly keywords?: Readonly<Record<string, readonly string[]>>;
  };
}

// =============================================================================
// MCP Tool Types (minimal — compatible with @modelcontextprotocol/sdk)
// =============================================================================

/**
 * MCP tool definition. Compatible with the MCP SDK's tool schema.
 */
export interface MCPToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: {
    readonly type: 'object';
    readonly properties: Record<string, unknown>;
    readonly required: readonly string[];
  };
}

/**
 * MCP tool response. Compatible with the MCP SDK's response format.
 */
export interface MCPToolResponse {
  readonly content: ReadonlyArray<{ readonly type: string; readonly text: string }>;
  readonly isError?: boolean;
}

// =============================================================================
// Domain Registry
// =============================================================================

/**
 * Registry for framework domains.
 *
 * Manages domain descriptors, generates MCP tool definitions,
 * and dispatches tool calls to the appropriate domain.
 */
export class DomainRegistry {
  private descriptors = new Map<string, DomainDescriptor>();
  private dslCache = new Map<string, MultilingualDSL>();
  private rendererCache = new Map<
    string,
    NaturalLanguageRenderer | ((node: SemanticNode, language: string) => string)
  >();

  /**
   * Register a domain.
   * @throws if a domain with the same name is already registered
   */
  register(descriptor: DomainDescriptor): void {
    if (this.descriptors.has(descriptor.name)) {
      throw new Error(`Domain already registered: ${descriptor.name}`);
    }
    this.descriptors.set(descriptor.name, descriptor);
  }

  /**
   * Get all registered domain names.
   */
  getDomainNames(): string[] {
    return Array.from(this.descriptors.keys());
  }

  /**
   * Get a specific domain descriptor.
   */
  getDescriptor(name: string): DomainDescriptor | undefined {
    return this.descriptors.get(name);
  }

  /**
   * Generate MCP tool definitions for all registered domains.
   */
  getToolDefinitions(): MCPToolDefinition[] {
    const tools: MCPToolDefinition[] = [];
    for (const desc of this.descriptors.values()) {
      tools.push(...generateToolDefinitions(desc));
    }
    return tools;
  }

  /**
   * Check if a tool name belongs to a registered domain.
   */
  canHandle(toolName: string): boolean {
    const parsed = parseToolName(toolName);
    if (!parsed) return false;
    return this.descriptors.has(parsed.domain);
  }

  /**
   * Handle a tool call by dispatching to the appropriate domain.
   * Returns null if the tool name doesn't match any registered domain.
   */
  async handleToolCall(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<MCPToolResponse | null> {
    const parsed = parseToolName(toolName);
    if (!parsed) return null;

    const descriptor = this.descriptors.get(parsed.domain);
    if (!descriptor) return null;

    try {
      const dsl = await this.getDSL(descriptor);

      switch (parsed.operation) {
        case 'parse':
          return await this.handleParse(descriptor, dsl, args);
        case 'compile':
          return await this.handleCompile(descriptor, dsl, args);
        case 'validate':
          return await this.handleValidate(descriptor, dsl, args);
        case 'translate':
          return await this.handleTranslate(descriptor, dsl, args);
        default:
          return jsonResponse({ error: `Unknown operation: ${parsed.operation}` }, true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return jsonResponse({ error: `${descriptor.name} tool error: ${message}` }, true);
    }
  }

  /**
   * Get the DSL instance for a named domain.
   * Returns null if the domain is not registered.
   * The DSL is lazily created and cached.
   */
  async getDSLForDomain(name: string): Promise<MultilingualDSL | null> {
    const descriptor = this.descriptors.get(name);
    if (!descriptor) return null;
    return this.getDSL(descriptor);
  }

  // ---------------------------------------------------------------------------
  // Private: DSL/renderer lifecycle
  // ---------------------------------------------------------------------------

  private async getDSL(descriptor: DomainDescriptor): Promise<MultilingualDSL> {
    const cached = this.dslCache.get(descriptor.name);
    if (cached) return cached;

    const dsl = await descriptor.getDSL();
    this.dslCache.set(descriptor.name, dsl);
    return dsl;
  }

  private async getRenderer(
    descriptor: DomainDescriptor
  ): Promise<NaturalLanguageRenderer | ((node: SemanticNode, language: string) => string) | null> {
    if (!descriptor.getRenderer) return null;

    const cached = this.rendererCache.get(descriptor.name);
    if (cached) return cached;

    const renderer = await descriptor.getRenderer();
    this.rendererCache.set(descriptor.name, renderer);
    return renderer;
  }

  // ---------------------------------------------------------------------------
  // Private: Tool handlers
  // ---------------------------------------------------------------------------

  private async handleParse(
    descriptor: DomainDescriptor,
    dsl: MultilingualDSL,
    args: Record<string, unknown>
  ): Promise<MCPToolResponse> {
    const input = getString(args, descriptor.inputLabel);
    if (!input) return missingParam(descriptor.inputLabel);
    const language = getString(args, 'language', 'en');

    const node = dsl.parse(input, language);

    const roles: Record<string, unknown> = {};
    for (const [key, value] of node.roles) {
      roles[key] = value;
    }

    return jsonResponse({
      action: node.action,
      roles,
      language,
      [descriptor.inputLabel]: input,
    });
  }

  private async handleCompile(
    descriptor: DomainDescriptor,
    dsl: MultilingualDSL,
    args: Record<string, unknown>
  ): Promise<MCPToolResponse> {
    const input = getString(args, descriptor.inputLabel);
    if (!input) return missingParam(descriptor.inputLabel);
    const language = getString(args, 'language', 'en');

    const result: CompileResult = dsl.compile(input, language);

    return jsonResponse({
      ok: result.ok,
      code: result.code,
      errors: result.errors,
      language,
      input,
    });
  }

  private async handleValidate(
    descriptor: DomainDescriptor,
    dsl: MultilingualDSL,
    args: Record<string, unknown>
  ): Promise<MCPToolResponse> {
    const input = getString(args, descriptor.inputLabel);
    if (!input) return missingParam(descriptor.inputLabel);
    const language = getString(args, 'language', 'en');

    const result: ValidationResult = dsl.validate(input, language);

    return jsonResponse({
      valid: result.valid,
      errors: result.errors,
      language,
      [descriptor.inputLabel]: input,
    });
  }

  private async handleTranslate(
    descriptor: DomainDescriptor,
    dsl: MultilingualDSL,
    args: Record<string, unknown>
  ): Promise<MCPToolResponse> {
    const input = getString(args, descriptor.inputLabel);
    if (!input) return missingParam(descriptor.inputLabel);
    const from = getString(args, 'from');
    if (!from) return missingParam('from');
    const to = getString(args, 'to');
    if (!to) return missingParam('to');

    // Parse in source language
    const node = dsl.parse(input, from);

    // Compile (language-neutral output)
    const compiled = dsl.compile(input, from);

    // Render to target language
    let rendered: string | null = null;
    const renderer = await this.getRenderer(descriptor);
    if (renderer) {
      try {
        rendered = typeof renderer === 'function' ? renderer(node, to) : renderer.render(node, to);
      } catch {
        // Fall through with rendered = null
      }
    }

    const roles: Record<string, unknown> = {};
    for (const [key, value] of node.roles) {
      roles[key] = value;
    }

    return jsonResponse({
      input: { [descriptor.inputLabel]: input, language: from },
      ...(rendered != null && { rendered: { text: rendered, language: to } }),
      semantic: { action: node.action, roles },
      ...(compiled.ok && compiled.code != null && { compiled: compiled.code }),
    });
  }
}

// =============================================================================
// Tool Definition Generator
// =============================================================================

function generateToolDefinitions(desc: DomainDescriptor): MCPToolDefinition[] {
  const tools: MCPToolDefinition[] = [];
  const ops = desc.tools ?? (['parse', 'compile', 'validate', 'translate'] as const);
  const langList = desc.languages.join(', ');

  for (const op of ops) {
    switch (op) {
      case 'parse':
        tools.push({
          name: `parse_${desc.name}`,
          description: `Parse a ${desc.description} input into a semantic representation. Supports: ${langList}.`,
          inputSchema: {
            type: 'object',
            properties: {
              [desc.inputLabel]: {
                type: 'string',
                description: desc.inputDescription,
              },
              language: {
                type: 'string',
                description: `Language code: ${langList}`,
                default: 'en',
              },
            },
            required: [desc.inputLabel],
          },
        });
        break;

      case 'compile':
        tools.push({
          name: `compile_${desc.name}`,
          description: `Compile a ${desc.description} input to target code. Supports: ${langList}.`,
          inputSchema: {
            type: 'object',
            properties: {
              [desc.inputLabel]: {
                type: 'string',
                description: desc.inputDescription,
              },
              language: {
                type: 'string',
                description: `Language code: ${langList}`,
                default: 'en',
              },
            },
            required: [desc.inputLabel],
          },
        });
        break;

      case 'validate':
        tools.push({
          name: `validate_${desc.name}`,
          description: `Validate ${desc.description} syntax. Returns whether it parses successfully and any errors. Supports: ${langList}.`,
          inputSchema: {
            type: 'object',
            properties: {
              [desc.inputLabel]: {
                type: 'string',
                description: `${desc.inputDescription} to validate`,
              },
              language: {
                type: 'string',
                description: `Language code: ${langList}`,
                default: 'en',
              },
            },
            required: [desc.inputLabel],
          },
        });
        break;

      case 'translate':
        tools.push({
          name: `translate_${desc.name}`,
          description: `Translate ${desc.description} input between natural languages. Parses in source language and renders in target language.`,
          inputSchema: {
            type: 'object',
            properties: {
              [desc.inputLabel]: {
                type: 'string',
                description: `${desc.inputDescription} to translate`,
              },
              from: {
                type: 'string',
                description: `Source language code: ${langList}`,
              },
              to: {
                type: 'string',
                description: `Target language code: ${langList}`,
              },
            },
            required: [desc.inputLabel, 'from', 'to'],
          },
        });
        break;
    }
  }

  return tools;
}

// =============================================================================
// Helpers
// =============================================================================

function parseToolName(name: string): { operation: string; domain: string } | null {
  const match = name.match(/^(parse|compile|validate|translate)_(.+)$/);
  if (!match) return null;
  return { operation: match[1], domain: match[2] };
}

function getString(args: Record<string, unknown>, name: string, defaultValue = ''): string {
  const value = args[name];
  return typeof value === 'string' ? value : defaultValue;
}

function jsonResponse(data: unknown, isError?: boolean): MCPToolResponse {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    ...(isError && { isError: true }),
  };
}

function missingParam(param: string): MCPToolResponse {
  return jsonResponse({ error: `Missing required parameter: ${param}` }, true);
}
