/**
 * HATEOAS → MCP End-to-End Demo
 *
 * Demonstrates the full pipeline:
 * 1. Parse HATEOAS commands in natural language (FlowScript)
 * 2. Compile to WorkflowSpec
 * 3. Show MCP server tool generation from Siren entities
 *
 * Run with: npx tsx examples/hateoas-demo.ts
 * (from packages/domain-flow directory)
 */

import { createFlowDSL, toFlowSpec, toWorkflowSpec, toSirenGrailSteps } from '../src/index.js';
import {
  McpWorkflowServer,
  actionsToTools,
  linksToTools,
  entityToTools,
} from '../src/runtime/mcp-workflow-server.js';

// =============================================================================
// Part 1: Parse FlowScript HATEOAS commands in 8 languages
// =============================================================================

console.log('═══════════════════════════════════════════════════════════');
console.log(' Part 1: Multilingual HATEOAS Command Parsing');
console.log('═══════════════════════════════════════════════════════════\n');

const flow = createFlowDSL();

// Parse an "enter" command in all 8 languages
const enterCommands: Array<{ lang: string; input: string }> = [
  { lang: 'en', input: 'enter /api' },
  { lang: 'es', input: 'entrar /api' },
  { lang: 'ja', input: '/api 入る' },
  { lang: 'ar', input: 'ادخل /api' },
  { lang: 'ko', input: '/api 진입' },
  { lang: 'zh', input: '进入 /api' },
  { lang: 'tr', input: '/api gir' },
  { lang: 'fr', input: 'entrer /api' },
];

console.log('Parsing "enter /api" across 8 languages:\n');

for (const { lang, input } of enterCommands) {
  const result = flow.validate(input, lang);
  if (result.valid) {
    const spec = toFlowSpec(result.node!, lang);
    console.log(`  [${lang}] "${input}" → action=${spec.action}, url=${spec.url}`);
  } else {
    console.log(`  [${lang}] "${input}" → FAILED: ${result.errors?.join(', ')}`);
  }
}

// =============================================================================
// Part 2: Build a complete workflow from FlowScript
// =============================================================================

console.log('\n═══════════════════════════════════════════════════════════');
console.log(' Part 2: Workflow Compilation');
console.log('═══════════════════════════════════════════════════════════\n');

const workflowInputs = [
  'enter /api',
  'follow orders',
  'perform createOrder with #checkout',
  'capture as orderId',
];

console.log('FlowScript source:');
for (const input of workflowInputs) {
  console.log(`  ${input}`);
}

const specs = workflowInputs.map((input) => {
  const node = flow.parse(input, 'en');
  return toFlowSpec(node, 'en');
});

const workflowSpec = toWorkflowSpec(specs);

console.log('\nCompiled WorkflowSpec:');
console.log(JSON.stringify(workflowSpec, null, 2));

const sirenSteps = toSirenGrailSteps(workflowSpec);
console.log('\nsiren-grail compatible steps:');
console.log(JSON.stringify(sirenSteps, null, 2));

// =============================================================================
// Part 3: MCP Server — Dynamic Tool Generation from Siren Entities
// =============================================================================

console.log('\n═══════════════════════════════════════════════════════════');
console.log(' Part 3: MCP Tool Generation from Siren Entities');
console.log('═══════════════════════════════════════════════════════════\n');

// Simulate a Siren entity from an order management API
const orderCollectionEntity = {
  class: ['collection', 'orders'],
  properties: { count: 3, page: 1 },
  actions: [
    {
      name: 'create-order',
      title: 'Create a new order',
      href: '/api/orders',
      method: 'POST',
      type: 'application/json',
      fields: [
        { name: 'product', type: 'text', title: 'Product name' },
        { name: 'quantity', type: 'number', title: 'Quantity to order' },
        { name: 'priority', type: 'text', value: 'normal', title: 'Priority level' },
      ],
    },
    {
      name: 'search',
      title: 'Search orders',
      href: '/api/orders/search',
      method: 'GET',
      fields: [{ name: 'q', type: 'search', title: 'Search query' }],
    },
  ],
  links: [
    { rel: ['self'], href: '/api/orders', title: 'This collection' },
    { rel: ['next'], href: '/api/orders?page=2', title: 'Next page' },
    { rel: ['up'], href: '/api', title: 'API root' },
    { rel: ['item'], href: '/api/orders/123', title: 'Order #123' },
  ],
};

console.log('Siren entity (order collection):');
console.log(`  class: ${orderCollectionEntity.class.join(', ')}`);
console.log(`  actions: ${orderCollectionEntity.actions.map((a) => a.name).join(', ')}`);
console.log(`  links: ${orderCollectionEntity.links.map((l) => l.rel[0]).join(', ')}`);

const tools = entityToTools(orderCollectionEntity);

console.log(`\nGenerated MCP tools (${tools.length}):\n`);
for (const tool of tools) {
  const params = Object.keys(tool.inputSchema.properties);
  const required = tool.inputSchema.required ?? [];
  console.log(`  ${tool.name}`);
  console.log(`    ${tool.description}`);
  if (params.length > 0) {
    console.log(
      `    params: ${params.map((p) => (required.includes(p) ? p : `${p}?`)).join(', ')}`
    );
  }
  console.log();
}

// =============================================================================
// Part 4: State Transition — Tools Change After Navigation
// =============================================================================

console.log('═══════════════════════════════════════════════════════════');
console.log(' Part 4: Dynamic Tool Updates (HATEOAS State Transitions)');
console.log('═══════════════════════════════════════════════════════════\n');

// Simulate navigating to a specific order — tools change!
const orderDetailEntity = {
  class: ['order'],
  properties: { id: 123, product: 'Widget', quantity: 5, status: 'pending' },
  actions: [
    {
      name: 'update-status',
      title: 'Update order status',
      href: '/api/orders/123/status',
      method: 'PUT',
      fields: [{ name: 'status', type: 'text', title: 'New status' }],
    },
    {
      name: 'cancel',
      title: 'Cancel this order',
      href: '/api/orders/123',
      method: 'DELETE',
    },
  ],
  links: [
    { rel: ['self'], href: '/api/orders/123' },
    { rel: ['collection'], href: '/api/orders', title: 'Back to all orders' },
    { rel: ['payment'], href: '/api/orders/123/payment', title: 'Payment details' },
  ],
};

console.log('Before navigation (order collection):');
const collectionTools = entityToTools(orderCollectionEntity);
console.log(`  Tools: ${collectionTools.map((t) => t.name).join(', ')}`);

console.log('\nAfter navigation to order #123:');
const detailTools = entityToTools(orderDetailEntity);
console.log(`  Tools: ${detailTools.map((t) => t.name).join(', ')}`);

console.log('\n  Tools that appeared:');
const collectionToolNames = new Set(collectionTools.map((t) => t.name));
for (const tool of detailTools) {
  if (!collectionToolNames.has(tool.name)) {
    console.log(`    + ${tool.name}: ${tool.description}`);
  }
}

console.log('\n  Tools that disappeared:');
const detailToolNames = new Set(detailTools.map((t) => t.name));
for (const tool of collectionTools) {
  if (!detailToolNames.has(tool.name)) {
    console.log(`    - ${tool.name}: ${tool.description}`);
  }
}

// =============================================================================
// Part 5: MCP Server Lifecycle
// =============================================================================

console.log('\n═══════════════════════════════════════════════════════════');
console.log(' Part 5: MCP Server Configuration');
console.log('═══════════════════════════════════════════════════════════\n');

// Show what the MCP server would look like
const server = new McpWorkflowServer({
  entryPoint: 'http://api.example.com/',
  name: 'order-management',
  version: '1.0.0',
  headers: { Authorization: 'Bearer <token>' },
  workflow: workflowSpec,
});

console.log('MCP Server info:', server.getServerInfo());
console.log('MCP Capabilities:', JSON.stringify(server.getCapabilities(), null, 2));

console.log('\nServer lifecycle:');
console.log('  1. initialize() — fetches entry point, builds initial tool set');
console.log('  2. listTools()  — returns current affordance-derived tools');
console.log('  3. callTool()   — executes action/navigation, rebuilds tools');
console.log('  4. On state change → tools/list_changed notification fires');

// Register a listener to show the notification mechanism
server.onToolsChanged(() => {
  console.log('  [notification] tools/list_changed — tool set updated');
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log(' Demo Complete');
console.log('═══════════════════════════════════════════════════════════');
console.log('\nKey insight: MCP tools/list_changed IS a HATEOAS mechanism.');
console.log('As the agent navigates hypermedia states, available tools');
console.log('appear and disappear — LLM clients see affordance-driven');
console.log('tool sets without needing to understand Siren.\n');
