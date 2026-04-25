/**
 * FlowScript Code Generator
 *
 * Transforms semantic AST nodes into either:
 * 1. Vanilla JavaScript strings (primary output via CodeGenerator interface)
 * 2. Structured FlowSpec JSON (via toFlowSpec helper)
 */

import type { SemanticNode, CodeGenerator } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';
import type { FlowSpec } from '../types.js';

// =============================================================================
// Duration Parsing
// =============================================================================

/**
 * Parse a duration string to milliseconds.
 * Supports: 500ms, 5s, 1m, 1h, plain number (treated as ms)
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(ms|s|m|h)?$/);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  switch (match[2]) {
    case 'h':
      return value * 3600000;
    case 'm':
      return value * 60000;
    case 's':
      return value * 1000;
    case 'ms':
      return value;
    default:
      return value; // plain number = ms
  }
}

// =============================================================================
// FlowSpec Extraction
// =============================================================================

/**
 * Extract a structured FlowSpec from a parsed SemanticNode.
 */
export function toFlowSpec(node: SemanticNode, language: string): FlowSpec {
  const action = node.action as FlowSpec['action'];
  const roles: Record<string, string | undefined> = {};

  for (const [key, val] of node.roles) {
    roles[key] =
      typeof val === 'string' ? val : ((val as { value?: string })?.value ?? String(val));
  }

  const base: FlowSpec = {
    action,
    metadata: { sourceLanguage: language, roles },
  };

  switch (action) {
    case 'fetch': {
      base.url = extractRoleValue(node, 'source') || undefined;
      base.responseFormat = normalizeFormat(extractRoleValue(node, 'style'));
      base.target = extractRoleValue(node, 'destination') || undefined;
      base.method = 'GET';
      break;
    }
    case 'poll': {
      base.url = extractRoleValue(node, 'source') || undefined;
      base.responseFormat = normalizeFormat(extractRoleValue(node, 'style'));
      base.target = extractRoleValue(node, 'destination') || undefined;
      base.method = 'GET';
      const dur = extractRoleValue(node, 'duration');
      if (dur) base.intervalMs = parseDuration(dur);
      break;
    }
    case 'stream': {
      base.url = extractRoleValue(node, 'source') || undefined;
      base.responseFormat = 'sse';
      base.target = extractRoleValue(node, 'destination') || undefined;
      base.method = 'GET';
      break;
    }
    case 'submit': {
      base.formSelector = extractRoleValue(node, 'patient') || undefined;
      base.url = extractRoleValue(node, 'destination') || undefined;
      base.responseFormat = normalizeFormat(extractRoleValue(node, 'style'));
      base.method = 'POST';
      break;
    }
    case 'transform': {
      base.transformFn = extractRoleValue(node, 'instrument') || undefined;
      break;
    }
    case 'enter': {
      base.url = extractRoleValue(node, 'source') || undefined;
      break;
    }
    case 'follow': {
      base.linkRel = extractRoleValue(node, 'patient') || undefined;
      break;
    }
    case 'perform': {
      base.actionName = extractRoleValue(node, 'patient') || undefined;
      base.dataSource = extractRoleValue(node, 'source') || undefined;
      break;
    }
    case 'capture': {
      base.captureAs = extractRoleValue(node, 'destination') || undefined;
      base.capturePath = extractRoleValue(node, 'patient') || undefined;
      break;
    }
  }

  return base;
}

function normalizeFormat(format: string | null): FlowSpec['responseFormat'] {
  if (!format) return undefined;
  const lower = format.toLowerCase();
  if (lower === 'json') return 'json';
  if (lower === 'html') return 'html';
  if (lower === 'text') return 'text';
  if (lower === 'sse') return 'sse';
  return undefined;
}

// =============================================================================
// String Escaping
// =============================================================================

/** Escape a string for safe inclusion in single-quoted JS string literals. */
function escapeStr(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// =============================================================================
// Per-Command JS Generators
// =============================================================================

function generateFetch(node: SemanticNode): string {
  const url = extractRoleValue(node, 'source') || '/';
  const format = extractRoleValue(node, 'style')?.toLowerCase() || 'text';
  const target = extractRoleValue(node, 'destination');

  const parseMethod = format === 'json' ? '.json()' : '.text()';
  const lines: string[] = [`fetch('${escapeStr(url)}')`, `  .then(r => r${parseMethod})`];

  if (target) {
    lines.push(`  .then(data => {`);
    if (format === 'json') {
      lines.push(
        `    document.querySelector('${escapeStr(target)}').innerHTML = typeof data === 'string' ? data : JSON.stringify(data);`
      );
    } else {
      lines.push(`    document.querySelector('${escapeStr(target)}').innerHTML = data;`);
    }
    lines.push(`  })`);
  }

  lines.push(`  .catch(err => console.error('Fetch error:', err));`);
  return lines.join('\n');
}

function generatePoll(node: SemanticNode): string {
  const url = extractRoleValue(node, 'source') || '/';
  const duration = extractRoleValue(node, 'duration') || '5s';
  const format = extractRoleValue(node, 'style')?.toLowerCase() || 'text';
  const target = extractRoleValue(node, 'destination');
  const ms = parseDuration(duration);

  const parseMethod = format === 'json' ? '.json()' : '.text()';
  const lines: string[] = [
    `setInterval(async () => {`,
    `  try {`,
    `    const r = await fetch('${escapeStr(url)}');`,
    `    const data = await r${parseMethod};`,
  ];

  if (target) {
    if (format === 'json') {
      lines.push(
        `    document.querySelector('${escapeStr(target)}').innerHTML = typeof data === 'string' ? data : JSON.stringify(data);`
      );
    } else {
      lines.push(`    document.querySelector('${escapeStr(target)}').innerHTML = data;`);
    }
  }

  lines.push(`  } catch (err) {`, `    console.error('Poll error:', err);`, `  }`, `}, ${ms});`);

  return lines.join('\n');
}

function generateStream(node: SemanticNode): string {
  const url = extractRoleValue(node, 'source') || '/';
  const target = extractRoleValue(node, 'destination');

  const lines: string[] = [`const es = new EventSource('${escapeStr(url)}');`];

  if (target) {
    lines.push(
      `es.onmessage = (event) => {`,
      `  document.querySelector('${escapeStr(target)}').insertAdjacentHTML('beforeend', event.data);`,
      `};`
    );
  } else {
    lines.push(`es.onmessage = (event) => {`, `  console.log('Stream data:', event.data);`, `};`);
  }

  lines.push(`es.onerror = () => {`, `  console.error('Stream error, reconnecting...');`, `};`);

  return lines.join('\n');
}

function generateSubmit(node: SemanticNode): string {
  const form = extractRoleValue(node, 'patient') || '#form';
  const url = extractRoleValue(node, 'destination') || '/';
  const format = extractRoleValue(node, 'style')?.toLowerCase();

  const lines: string[] = [
    `const form = document.querySelector('${escapeStr(form)}');`,
    `const formData = new FormData(form);`,
  ];

  if (format === 'json') {
    lines.push(
      `fetch('${escapeStr(url)}', {`,
      `  method: 'POST',`,
      `  headers: { 'Content-Type': 'application/json' },`,
      `  body: JSON.stringify(Object.fromEntries(formData)),`,
      `})`,
      `  .then(r => r.json())`,
      `  .catch(err => console.error('Submit error:', err));`
    );
  } else {
    lines.push(
      `fetch('${escapeStr(url)}', {`,
      `  method: 'POST',`,
      `  body: formData,`,
      `})`,
      `  .then(r => r.text())`,
      `  .catch(err => console.error('Submit error:', err));`
    );
  }

  return lines.join('\n');
}

function generateTransform(node: SemanticNode): string {
  const data = extractRoleValue(node, 'patient') || 'data';
  const fn = extractRoleValue(node, 'instrument') || 'identity';

  return `const result = ${fn}(${data});`;
}

// =============================================================================
// HATEOAS Command JS Generators
// =============================================================================

function generateEnter(node: SemanticNode): string {
  const url = extractRoleValue(node, 'source') || '/';
  return [
    `// HATEOAS: Connect to entry point`,
    `const agent = new SirenAgent('${escapeStr(url)}');`,
    `await agent.start();`,
  ].join('\n');
}

function generateFollow(node: SemanticNode): string {
  const rel = extractRoleValue(node, 'patient') || 'self';
  return [
    `// HATEOAS: Follow link relation '${escapeStr(rel)}'`,
    `await agent.followLink('${escapeStr(rel)}');`,
  ].join('\n');
}

function generatePerform(node: SemanticNode): string {
  const action = extractRoleValue(node, 'patient') || '';
  const dataSource = extractRoleValue(node, 'source');
  const lines = [`// HATEOAS: Execute action '${escapeStr(action)}'`];

  if (dataSource) {
    lines.push(
      `const data = Object.fromEntries(new FormData(document.querySelector('${escapeStr(dataSource)}')));`
    );
    lines.push(`await agent.executeAction('${escapeStr(action)}', data);`);
  } else {
    lines.push(`await agent.executeAction('${escapeStr(action)}');`);
  }

  return lines.join('\n');
}

function generateCapture(node: SemanticNode): string {
  const varName = extractRoleValue(node, 'destination') || 'captured';
  const path = extractRoleValue(node, 'patient');

  if (path) {
    return `const ${varName} = agent.currentEntity.properties?.['${escapeStr(path)}'];`;
  }
  return `const ${varName} = agent.currentEntity.properties;`;
}

// =============================================================================
// Public Code Generator
// =============================================================================

/**
 * FlowScript code generator implementation.
 * Returns vanilla JavaScript — ready to execute in a browser.
 */
export const flowCodeGenerator: CodeGenerator = {
  generate(node: SemanticNode): string {
    switch (node.action) {
      case 'fetch':
        return generateFetch(node);
      case 'poll':
        return generatePoll(node);
      case 'stream':
        return generateStream(node);
      case 'submit':
        return generateSubmit(node);
      case 'transform':
        return generateTransform(node);
      case 'enter':
        return generateEnter(node);
      case 'follow':
        return generateFollow(node);
      case 'perform':
        return generatePerform(node);
      case 'capture':
        return generateCapture(node);
      default:
        throw new Error(`Unknown FlowScript command: ${node.action}`);
    }
  },
};
