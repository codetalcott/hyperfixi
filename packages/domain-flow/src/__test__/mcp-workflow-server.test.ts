/**
 * Tests for MCP Workflow Server — Siren → MCP tool generation
 */

import { describe, it, expect } from 'vitest';
import {
  actionsToTools,
  linksToTools,
  entityToTools,
  McpWorkflowServer,
} from '../runtime/mcp-workflow-server.js';

// =============================================================================
// actionsToTools
// =============================================================================

describe('actionsToTools', () => {
  it('converts a Siren action to an action__ tool', () => {
    const tools = actionsToTools([
      {
        name: 'create-order',
        title: 'Create a new order',
        href: '/api/orders',
        method: 'POST',
        fields: [
          { name: 'product', type: 'text', title: 'Product name' },
          { name: 'quantity', type: 'number', title: 'Quantity' },
        ],
      },
    ]);

    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('action__create-order');
    expect(tools[0].description).toBe('Create a new order');
    expect(tools[0].inputSchema.type).toBe('object');
    expect(tools[0].inputSchema.properties).toEqual({
      product: { type: 'string', description: 'Product name' },
      quantity: { type: 'number', description: 'Quantity' },
    });
    expect(tools[0].inputSchema.required).toEqual(['product', 'quantity']);
  });

  it('uses default description when title is absent', () => {
    const tools = actionsToTools([{ name: 'search', href: '/search', method: 'GET' }]);

    expect(tools[0].description).toBe('Execute the "search" action (GET /search)');
  });

  it('defaults method to POST in description', () => {
    const tools = actionsToTools([{ name: 'submit', href: '/submit' }]);
    expect(tools[0].description).toContain('POST');
  });

  it('marks fields with default values as optional', () => {
    const tools = actionsToTools([
      {
        name: 'create',
        href: '/api',
        fields: [
          { name: 'required_field', type: 'text' },
          { name: 'optional_field', type: 'text', value: 'default' },
        ],
      },
    ]);

    expect(tools[0].inputSchema.required).toEqual(['required_field']);
    expect(tools[0].inputSchema.properties['optional_field']).toEqual({
      type: 'string',
      default: 'default',
    });
  });

  it('handles actions with no fields', () => {
    const tools = actionsToTools([{ name: 'delete', href: '/api/1', method: 'DELETE' }]);
    expect(tools[0].inputSchema.properties).toEqual({});
    expect(tools[0].inputSchema.required).toBeUndefined();
  });

  it('maps field types to JSON Schema types', () => {
    const tools = actionsToTools([
      {
        name: 'test',
        href: '/test',
        fields: [
          { name: 'num', type: 'number' },
          { name: 'rng', type: 'range' },
          { name: 'chk', type: 'checkbox' },
          { name: 'txt', type: 'text' },
          { name: 'em', type: 'email' },
          { name: 'dt', type: 'date' },
          { name: 'hid', type: 'hidden' },
        ],
      },
    ]);

    const props = tools[0].inputSchema.properties;
    expect((props['num'] as Record<string, unknown>).type).toBe('number');
    expect((props['rng'] as Record<string, unknown>).type).toBe('number');
    expect((props['chk'] as Record<string, unknown>).type).toBe('boolean');
    expect((props['txt'] as Record<string, unknown>).type).toBe('string');
    expect((props['em'] as Record<string, unknown>).type).toBe('string');
    expect((props['dt'] as Record<string, unknown>).type).toBe('string');
    expect((props['hid'] as Record<string, unknown>).type).toBe('string');
  });
});

// =============================================================================
// linksToTools
// =============================================================================

describe('linksToTools', () => {
  it('converts Siren links to navigate__ tools', () => {
    const tools = linksToTools([
      { rel: ['orders'], href: '/api/orders', title: 'View all orders' },
      { rel: ['next'], href: '/api/orders?page=2' },
    ]);

    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('navigate__orders');
    expect(tools[0].description).toBe('View all orders');
    expect(tools[1].name).toBe('navigate__next');
    expect(tools[1].description).toBe('Navigate to "next" (/api/orders?page=2)');
  });

  it('skips self links', () => {
    const tools = linksToTools([
      { rel: ['self'], href: '/api/orders' },
      { rel: ['next'], href: '/api/orders?page=2' },
    ]);

    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('navigate__next');
  });

  it('deduplicates by first rel', () => {
    const tools = linksToTools([
      { rel: ['item'], href: '/api/orders/1' },
      { rel: ['item'], href: '/api/orders/2' },
    ]);

    expect(tools).toHaveLength(1);
  });

  it('navigate tools have empty input schema', () => {
    const tools = linksToTools([{ rel: ['up'], href: '/api' }]);
    expect(tools[0].inputSchema).toEqual({ type: 'object', properties: {} });
  });
});

// =============================================================================
// entityToTools
// =============================================================================

describe('entityToTools', () => {
  it('combines actions and links into a single tool set', () => {
    const tools = entityToTools({
      actions: [{ name: 'create', href: '/api', method: 'POST' }],
      links: [
        { rel: ['self'], href: '/api' },
        { rel: ['next'], href: '/api?page=2' },
      ],
    });

    expect(tools).toHaveLength(2); // 1 action + 1 link (self skipped)
    expect(tools[0].name).toBe('action__create');
    expect(tools[1].name).toBe('navigate__next');
  });

  it('handles entity with no actions or links', () => {
    const tools = entityToTools({ properties: { foo: 'bar' } });
    expect(tools).toHaveLength(0);
  });
});

// =============================================================================
// McpWorkflowServer
// =============================================================================

describe('McpWorkflowServer', () => {
  it('returns server info', () => {
    const server = new McpWorkflowServer({
      entryPoint: 'http://example.com/api',
      name: 'test-server',
      version: '2.0.0',
    });

    expect(server.getServerInfo()).toEqual({
      name: 'test-server',
      version: '2.0.0',
    });
  });

  it('uses default name and version', () => {
    const server = new McpWorkflowServer({
      entryPoint: 'http://example.com/api',
    });

    expect(server.getServerInfo()).toEqual({
      name: 'hateoas-mcp-server',
      version: '1.0.0',
    });
  });

  it('returns capabilities with tools.listChanged', () => {
    const server = new McpWorkflowServer({
      entryPoint: 'http://example.com/api',
    });

    expect(server.getCapabilities()).toEqual({
      tools: { listChanged: true },
      resources: {},
    });
  });

  it('returns empty tool list before initialization', () => {
    const server = new McpWorkflowServer({
      entryPoint: 'http://example.com/api',
    });

    expect(server.listTools()).toEqual([]);
  });

  it('returns null entity before initialization', () => {
    const server = new McpWorkflowServer({
      entryPoint: 'http://example.com/api',
    });

    expect(server.getCurrentEntity()).toBeNull();
  });

  it('tracks current URL', () => {
    const server = new McpWorkflowServer({
      entryPoint: 'http://example.com/api',
    });

    expect(server.getCurrentUrl()).toBe('http://example.com/api');
  });

  it('returns error when calling tool before initialization', async () => {
    const server = new McpWorkflowServer({
      entryPoint: 'http://example.com/api',
    });

    const result = await server.callTool('action__test', {});
    expect(result.isError).toBe(true);
    expect(result.content).toContain('not initialized');
  });

  it('returns error for unknown tool prefix', async () => {
    // We need to get past the initialization check by setting internal state
    // Use a real server with a mock entity approach
    const server = new McpWorkflowServer({
      entryPoint: 'http://example.com/api',
    });

    // Access internal state to bypass initialization check
    (server as unknown as { currentEntity: unknown }).currentEntity = {
      actions: [],
      links: [],
    };

    const result = await server.callTool('unknown__test', {});
    expect(result.isError).toBe(true);
    expect(result.content).toContain('Unknown tool prefix');
  });

  it('returns error when action not found', async () => {
    const server = new McpWorkflowServer({
      entryPoint: 'http://example.com/api',
    });

    (server as unknown as { currentEntity: unknown }).currentEntity = {
      actions: [{ name: 'existing', href: '/api' }],
      links: [],
    };

    const result = await server.callTool('action__nonexistent', {});
    expect(result.isError).toBe(true);
    expect(result.content).toContain('not available');
    expect(result.content).toContain('existing');
  });

  it('returns error when link not found', async () => {
    const server = new McpWorkflowServer({
      entryPoint: 'http://example.com/api',
    });

    (server as unknown as { currentEntity: unknown }).currentEntity = {
      actions: [],
      links: [{ rel: ['orders'], href: '/api/orders' }],
    };

    const result = await server.callTool('navigate__nonexistent', {});
    expect(result.isError).toBe(true);
    expect(result.content).toContain('not available');
    expect(result.content).toContain('orders');
  });

  it('fires toolChangeListeners on registration', () => {
    const server = new McpWorkflowServer({
      entryPoint: 'http://example.com/api',
    });

    let called = false;
    server.onToolsChanged(() => {
      called = true;
    });

    // Manually trigger state update via internal method
    (server as unknown as { updateState: (entity: unknown, url: string) => void }).updateState(
      { actions: [], links: [] },
      'http://example.com/api'
    );

    expect(called).toBe(true);
  });
});
