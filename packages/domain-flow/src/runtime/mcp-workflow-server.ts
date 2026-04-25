/**
 * MCP Workflow Server — HATEOAS → MCP tool bridge
 *
 * An MCP server that wraps a Siren API, exposing current entity affordances
 * (actions and links) as dynamic MCP tools. As the agent navigates through
 * hypermedia states, tools appear and disappear — `tools/list_changed` fires
 * on every state transition.
 *
 * This is the novel contribution: MCP's tool protocol becomes a first-class
 * HATEOAS mechanism. External LLM clients (Claude Code, Cursor, etc.) see
 * affordance-driven tool sets without needing to understand Siren.
 *
 * Tool naming convention:
 *   action__{name}    — Execute a Siren action
 *   navigate__{rel}   — Follow a Siren link
 *   resolve__{name}   — Resolve a 409 prerequisite action
 *
 * @example
 * ```typescript
 * import { createMcpWorkflowServer } from '@lokascript/domain-flow/runtime';
 *
 * const server = createMcpWorkflowServer({
 *   entryPoint: 'http://api.example.com/',
 *   name: 'order-api',
 *   version: '1.0.0',
 * });
 *
 * await server.start(); // Connects to API, builds initial tools, listens on stdio
 * ```
 */

import type { WorkflowSpec } from '../types.js';

// =============================================================================
// Types
// =============================================================================

/** Siren entity structure (subset for our needs) */
interface SirenEntity {
  class?: string[];
  properties?: Record<string, unknown>;
  entities?: Array<Record<string, unknown>>;
  actions?: SirenAction[];
  links?: SirenLink[];
}

interface SirenAction {
  name: string;
  title?: string;
  href: string;
  method?: string;
  type?: string;
  fields?: SirenField[];
}

interface SirenField {
  name: string;
  type?: string;
  value?: unknown;
  title?: string;
}

interface SirenLink {
  rel: string[];
  href: string;
  title?: string;
  type?: string;
}

/** MCP tool definition */
interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/** Configuration for the MCP workflow server */
export interface McpWorkflowServerConfig {
  /** API entry point URL */
  entryPoint: string;
  /** Server name for MCP identification */
  name?: string;
  /** Server version */
  version?: string;
  /** HTTP headers (e.g., auth) for all API requests */
  headers?: Record<string, string>;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Optional pre-compiled WorkflowSpec to auto-execute */
  workflow?: WorkflowSpec;
}

// =============================================================================
// Tool Generation from Siren Affordances
// =============================================================================

/**
 * Convert Siren actions to MCP tool definitions.
 *
 * Each action becomes an `action__{name}` tool with input schema
 * generated from the action's fields.
 */
export function actionsToTools(actions: SirenAction[]): McpTool[] {
  return actions.map(action => {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const field of action.fields ?? []) {
      properties[field.name] = {
        type: fieldTypeToJsonSchema(field.type),
        ...(field.title ? { description: field.title } : {}),
        ...(field.value !== undefined ? { default: field.value } : {}),
      };
      // Siren fields are required by default unless they have a default value
      if (field.value === undefined) {
        required.push(field.name);
      }
    }

    return {
      name: `action__${action.name}`,
      description:
        action.title ??
        `Execute the "${action.name}" action (${action.method ?? 'POST'} ${action.href})`,
      inputSchema: {
        type: 'object' as const,
        properties,
        ...(required.length > 0 ? { required } : {}),
      },
    };
  });
}

/**
 * Convert Siren links to MCP tool definitions.
 *
 * Each link becomes a `navigate__{rel}` tool with no required inputs.
 */
export function linksToTools(links: SirenLink[]): McpTool[] {
  // Deduplicate by first rel
  const seen = new Set<string>();
  const tools: McpTool[] = [];

  for (const link of links) {
    const rel = link.rel[0];
    if (!rel || rel === 'self' || seen.has(rel)) continue;
    seen.add(rel);

    tools.push({
      name: `navigate__${rel}`,
      description: link.title ?? `Navigate to "${rel}" (${link.href})`,
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
    });
  }

  return tools;
}

/**
 * Convert Siren field type to JSON Schema type.
 */
function fieldTypeToJsonSchema(type?: string): string {
  switch (type) {
    case 'number':
    case 'range':
      return 'number';
    case 'checkbox':
      return 'boolean';
    case 'hidden':
    case 'text':
    case 'email':
    case 'url':
    case 'password':
    case 'search':
    case 'tel':
    case 'date':
    case 'datetime-local':
    case 'time':
    case 'month':
    case 'week':
    default:
      return 'string';
  }
}

/**
 * Build the complete tool set from a Siren entity.
 */
export function entityToTools(entity: SirenEntity): McpTool[] {
  return [...actionsToTools(entity.actions ?? []), ...linksToTools(entity.links ?? [])];
}

// =============================================================================
// MCP Server (protocol-level, transport-agnostic)
// =============================================================================

/**
 * MCP Workflow Server state machine.
 *
 * Manages the Siren agent state and translates between MCP tool
 * calls and Siren API interactions. Transport (stdio, SSE, etc.)
 * is handled externally.
 *
 * The server lifecycle:
 * 1. initialize() — fetch entry point, build initial tool set
 * 2. listTools() — return current affordance-derived tools
 * 3. callTool(name, args) — execute action or navigate, rebuild tools
 * 4. On each state change, emit tools/list_changed notification
 */
export class McpWorkflowServer {
  private config: Required<Pick<McpWorkflowServerConfig, 'entryPoint' | 'name' | 'version'>> &
    McpWorkflowServerConfig;
  private currentEntity: SirenEntity | null = null;
  private currentUrl: string;
  private currentTools: McpTool[] = [];
  private toolChangeListeners: Array<() => void> = [];

  constructor(config: McpWorkflowServerConfig) {
    this.config = {
      name: 'hateoas-mcp-server',
      version: '1.0.0',
      ...config,
    };
    this.currentUrl = config.entryPoint;
  }

  /**
   * Register a listener for tool list changes (maps to tools/list_changed).
   */
  onToolsChanged(listener: () => void): void {
    this.toolChangeListeners.push(listener);
  }

  /**
   * Initialize the server by fetching the entry point entity.
   */
  async initialize(): Promise<void> {
    const entity = await this.fetchEntity(this.config.entryPoint);
    this.updateState(entity, this.config.entryPoint);
  }

  /**
   * Get the current list of available MCP tools.
   */
  listTools(): McpTool[] {
    return this.currentTools;
  }

  /**
   * Get the current entity as an MCP resource.
   */
  getCurrentEntity(): SirenEntity | null {
    return this.currentEntity;
  }

  /**
   * Get the current URL.
   */
  getCurrentUrl(): string {
    return this.currentUrl;
  }

  /**
   * Call a tool (action or navigation).
   *
   * Returns the result text and triggers tools/list_changed if the
   * entity state changed.
   */
  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<{ content: string; isError?: boolean }> {
    if (!this.currentEntity) {
      return { content: 'Server not initialized. Call initialize() first.', isError: true };
    }

    // Parse tool name
    const [prefix, ...rest] = name.split('__');
    const identifier = rest.join('__'); // Handle names with double underscores

    try {
      switch (prefix) {
        case 'action': {
          const action = this.currentEntity.actions?.find(a => a.name === identifier);
          if (!action) {
            return {
              content: `Action "${identifier}" not available. Available: ${(this.currentEntity.actions ?? []).map(a => a.name).join(', ')}`,
              isError: true,
            };
          }
          const result = await this.executeAction(action, args);
          return { content: JSON.stringify(result.properties ?? result, null, 2) };
        }

        case 'navigate': {
          const link = this.currentEntity.links?.find(l => l.rel.includes(identifier));
          if (!link) {
            return {
              content: `Link "${identifier}" not available. Available: ${(this.currentEntity.links ?? []).map(l => l.rel[0]).join(', ')}`,
              isError: true,
            };
          }
          const entity = await this.fetchEntity(link.href);
          this.updateState(entity, link.href);
          return { content: JSON.stringify(entity.properties ?? entity, null, 2) };
        }

        default:
          return { content: `Unknown tool prefix: ${prefix}`, isError: true };
      }
    } catch (error) {
      return {
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  }

  /**
   * Get MCP server capabilities for the initialize response.
   */
  getCapabilities() {
    return {
      tools: { listChanged: true },
      resources: {},
    };
  }

  /**
   * Get MCP server info for the initialize response.
   */
  getServerInfo() {
    return {
      name: this.config.name,
      version: this.config.version,
    };
  }

  // ===========================================================================
  // Private
  // ===========================================================================

  private async fetchEntity(url: string): Promise<SirenEntity> {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.siren+json, application/json',
        ...this.config.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as SirenEntity;
  }

  private async executeAction(
    action: SirenAction,
    data: Record<string, unknown>
  ): Promise<SirenEntity> {
    const method = action.method?.toUpperCase() ?? 'POST';
    const headers: Record<string, string> = {
      Accept: 'application/vnd.siren+json, application/json',
      ...this.config.headers,
    };

    let body: string | undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      headers['Content-Type'] = action.type ?? 'application/json';
      body = JSON.stringify(data);
    }

    const response = await fetch(action.href, { method, headers, body });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const entity = (await response.json()) as SirenEntity;
    this.updateState(entity, action.href);
    return entity;
  }

  private updateState(entity: SirenEntity, url: string): void {
    this.currentEntity = entity;
    this.currentUrl = url;
    this.currentTools = entityToTools(entity);

    // Notify listeners (maps to MCP tools/list_changed)
    for (const listener of this.toolChangeListeners) {
      listener();
    }
  }
}

/**
 * Create a new MCP workflow server instance.
 */
export function createMcpWorkflowServer(config: McpWorkflowServerConfig): McpWorkflowServer {
  return new McpWorkflowServer(config);
}
