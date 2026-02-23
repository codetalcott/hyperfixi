/**
 * Template Inventory Tools
 *
 * MCP tools for scanning project directories and querying
 * hyperscript/htmx usage across HTML templates.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { jsonResponse, errorResponse, getString, getNumber } from './utils.js';

type ToolResponse = { content: Array<{ type: string; text: string }>; isError?: boolean };

// Lazy-loaded extractor
let extractSnippetsFromProjectImpl: ((dir: string, options?: any) => Promise<any[]>) | null = null;

async function getExtractor() {
  if (extractSnippetsFromProjectImpl) return extractSnippetsFromProjectImpl;
  try {
    const mod = await import('@hyperfixi/developer-tools/analyzer');
    // Try the inventory module path
    const inv = await import(
      /* webpackIgnore: true */
      '../../../developer-tools/src/inventory/extractor.js'
    ).catch(() => null);

    if (inv?.extractSnippetsFromProject) {
      extractSnippetsFromProjectImpl = inv.extractSnippetsFromProject;
    } else {
      // Fallback: inline implementation for when developer-tools isn't built
      extractSnippetsFromProjectImpl = createInlineExtractor();
    }
    return extractSnippetsFromProjectImpl!;
  } catch {
    extractSnippetsFromProjectImpl = createInlineExtractor();
    return extractSnippetsFromProjectImpl;
  }
}

// Cached scan results for query_inventory
let cachedSnippets: any[] = [];
let cachedProjectDir = '';

// =============================================================================
// Tool Definitions
// =============================================================================

export const inventoryTools: Tool[] = [
  {
    name: 'scan_inventory',
    description:
      'Scan a project directory for all hyperscript (_=), htmx (hx-*), and fixi (fx-*) ' +
      'attributes across HTML templates. Returns a summary with snippet counts by category, ' +
      'command, event, and element type, plus the full snippet list. ' +
      'Use this to understand how a project uses hyperscript and htmx.',
    inputSchema: {
      type: 'object',
      properties: {
        directory: {
          type: 'string',
          description:
            'Absolute path to the project directory to scan (e.g., "/path/to/project/templates")',
        },
        category: {
          type: 'string',
          description:
            'Filter by category: "hyperscript", "htmx-request", "htmx-swap", ' +
            '"htmx-target", "htmx-trigger", "htmx-other", "fixi". Omit for all.',
        },
        limit: {
          type: 'number',
          description:
            'Maximum number of snippets to return (default: 50). Use 0 for summary only.',
        },
      },
      required: ['directory'],
    },
  },
  {
    name: 'query_inventory',
    description:
      'Search and filter within previously scanned inventory results. ' +
      'Must call scan_inventory first. Supports filtering by text search, ' +
      'category, command, event, file path, and element type.',
    inputSchema: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description:
            'Text search across snippet values, file paths, attribute names, commands, and events',
        },
        category: {
          type: 'string',
          description: 'Filter by snippet category',
        },
        command: {
          type: 'string',
          description: 'Filter by hyperscript command (e.g., "toggle", "add", "fetch")',
        },
        event: {
          type: 'string',
          description: 'Filter by event name (e.g., "click", "load", "change")',
        },
        file: {
          type: 'string',
          description: 'Filter by file path (substring match)',
        },
        element: {
          type: 'string',
          description: 'Filter by HTML element type (e.g., "button", "form", "div")',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of snippets to return (default: 30)',
        },
      },
    },
  },
];

// =============================================================================
// Tool Handler
// =============================================================================

export async function handleInventoryTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResponse> {
  try {
    switch (name) {
      case 'scan_inventory':
        return await scanInventory(args);
      case 'query_inventory':
        return queryInventory(args);
      default:
        return errorResponse(`Unknown inventory tool: ${name}`) as ToolResponse;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(`Inventory tool error: ${message}`) as ToolResponse;
  }
}

// =============================================================================
// Implementations
// =============================================================================

async function scanInventory(args: Record<string, unknown>): Promise<ToolResponse> {
  const directory = getString(args, 'directory');
  if (!directory) {
    return errorResponse('Missing required parameter: directory') as ToolResponse;
  }

  const category = getString(args, 'category') || undefined;
  const limit = getNumber(args, 'limit', 50);

  const extract = await getExtractor();
  const allSnippets = await extract(directory);

  // Cache for subsequent query_inventory calls
  cachedSnippets = allSnippets;
  cachedProjectDir = directory;

  // Filter by category if specified
  let snippets = allSnippets;
  if (category) {
    snippets = snippets.filter((s: any) => s.category === category);
  }

  // Compute summary
  const summary = computeSummary(snippets);

  // Limit output
  const returnSnippets = limit === 0 ? [] : snippets.slice(0, limit).map(formatSnippet);

  return jsonResponse({
    projectDir: directory,
    total: snippets.length,
    summary,
    snippets: returnSnippets,
    ...(snippets.length > limit && limit > 0
      ? {
          note: `Showing ${limit} of ${snippets.length}. Use query_inventory to filter or increase limit.`,
        }
      : {}),
  }) as ToolResponse;
}

function queryInventory(args: Record<string, unknown>): ToolResponse {
  if (cachedSnippets.length === 0) {
    return errorResponse(
      'No inventory data. Call scan_inventory first to scan a project directory.'
    ) as ToolResponse;
  }

  const search = getString(args, 'search') || undefined;
  const category = getString(args, 'category') || undefined;
  const command = getString(args, 'command') || undefined;
  const event = getString(args, 'event') || undefined;
  const file = getString(args, 'file') || undefined;
  const element = getString(args, 'element') || undefined;
  const limit = getNumber(args, 'limit', 30);

  let snippets = cachedSnippets;

  if (category) snippets = snippets.filter((s: any) => s.category === category);
  if (command) snippets = snippets.filter((s: any) => s.commands?.includes(command));
  if (event) snippets = snippets.filter((s: any) => s.events?.includes(event));
  if (file) snippets = snippets.filter((s: any) => s.relativePath?.includes(file));
  if (element) snippets = snippets.filter((s: any) => s.elementType === element);
  if (search) {
    const q = search.toLowerCase();
    snippets = snippets.filter(
      (s: any) =>
        s.value?.toLowerCase().includes(q) ||
        s.relativePath?.toLowerCase().includes(q) ||
        s.attributeName?.toLowerCase().includes(q) ||
        s.commands?.some((c: string) => c.includes(q)) ||
        s.events?.some((e: string) => e.includes(q))
    );
  }

  const summary = computeSummary(snippets);
  const returnSnippets = snippets.slice(0, limit).map(formatSnippet);

  return jsonResponse({
    projectDir: cachedProjectDir,
    matched: snippets.length,
    summary,
    snippets: returnSnippets,
    ...(snippets.length > limit
      ? { note: `Showing ${limit} of ${snippets.length}. Narrow your filters or increase limit.` }
      : {}),
  }) as ToolResponse;
}

// =============================================================================
// Helpers
// =============================================================================

function computeSummary(snippets: any[]) {
  const files = new Set(snippets.map((s: any) => s.filePath || s.relativePath));
  const byCategory: Record<string, number> = {};
  const byCommand: Record<string, number> = {};
  const byEvent: Record<string, number> = {};
  const byElementType: Record<string, number> = {};

  for (const s of snippets) {
    byCategory[s.category] = (byCategory[s.category] ?? 0) + 1;
    if (s.elementType) byElementType[s.elementType] = (byElementType[s.elementType] ?? 0) + 1;
    for (const cmd of s.commands ?? []) {
      byCommand[cmd] = (byCommand[cmd] ?? 0) + 1;
    }
    for (const evt of s.events ?? []) {
      byEvent[evt] = (byEvent[evt] ?? 0) + 1;
    }
  }

  return {
    totalFiles: files.size,
    totalSnippets: snippets.length,
    byCategory,
    ...(Object.keys(byCommand).length > 0 ? { byCommand } : {}),
    ...(Object.keys(byEvent).length > 0 ? { byEvent } : {}),
    ...(Object.keys(byElementType).length > 0 ? { byElementType } : {}),
  };
}

function formatSnippet(s: any) {
  return {
    file: s.relativePath,
    line: s.line,
    attribute: s.attributeName,
    value: s.value,
    category: s.category,
    element: s.elementType,
    ...(s.commands?.length ? { commands: s.commands } : {}),
    ...(s.events?.length ? { events: s.events } : {}),
  };
}

// =============================================================================
// Inline Extractor (when developer-tools isn't available as a built package)
// =============================================================================

function createInlineExtractor() {
  // Inline the core extraction logic so the MCP tool works independently
  return async function extractSnippets(dir: string, _options?: any): Promise<any[]> {
    const fs = await import('fs');
    const path = await import('path');
    const crypto = await import('crypto');
    const { glob } = await import('glob');

    const globs = [
      '**/*.html',
      '**/*.htm',
      '**/*.djhtml',
      '**/*.jinja',
      '**/*.j2',
      '**/*.erb',
      '**/*.php',
      '**/*.vue',
      '**/*.svelte',
      '**/*.jsx',
      '**/*.tsx',
      '**/*.hbs',
      '**/*.ejs',
      '**/*.astro',
    ];
    const ignore = ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/venv/**', '**/.venv/**'];

    const files = await glob(globs, { cwd: dir, ignore, absolute: true });
    const snippets: any[] = [];

    // Attribute patterns: [attrRegex, category]
    const patterns: [RegExp, string][] = [
      [/(_)\s*=\s*"((?:[^"\\]|\\.)*)"/gi, 'hyperscript'],
      [/(_)\s*=\s*'((?:[^'\\]|\\.)*)'/gi, 'hyperscript'],
      [/(hx-on:\w+)\s*=\s*"((?:[^"\\]|\\.)*)"/gi, 'hyperscript'],
      [/(hx-(?:get|post|put|patch|delete))\s*=\s*"((?:[^"\\]|\\.)*)"/gi, 'htmx-request'],
      [/(hx-(?:get|post|put|patch|delete))\s*=\s*'((?:[^'\\]|\\.)*)'/gi, 'htmx-request'],
      [/((?:hx|fx)-swap)\s*=\s*"((?:[^"\\]|\\.)*)"/gi, 'htmx-swap'],
      [/((?:hx|fx)-target)\s*=\s*"((?:[^"\\]|\\.)*)"/gi, 'htmx-target'],
      [/((?:hx|fx)-trigger)\s*=\s*"((?:[^"\\]|\\.)*)"/gi, 'htmx-trigger'],
      [/(fx-action)\s*=\s*"((?:[^"\\]|\\.)*)"/gi, 'fixi'],
      [
        /(hx-(?:confirm|push-url|replace-url|indicator|select|vals|headers|include|boost|ext|encoding|params))\s*=\s*"((?:[^"\\]|\\.)*)"/gi,
        'htmx-other',
      ],
      [
        /(hx-(?:confirm|push-url|replace-url|indicator|select|vals|headers|include|boost|ext|encoding|params))\s*=\s*'((?:[^'\\]|\\.)*)'/gi,
        'htmx-other',
      ],
    ];

    const cmdRe =
      /\b(toggle|add|remove|show|hide|set|get|put|append|take|increment|decrement|log|send|trigger|wait|transition|go|call|focus|blur|return|fetch|tell|install)\b/g;
    const evtRe = /\bon\s+(\w+)/g;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const stat = fs.statSync(file);
        const relPath = path.relative(dir, file);
        const seen = new Set<number>();

        for (const [pattern, category] of patterns) {
          const re = new RegExp(pattern.source, pattern.flags);
          let m;
          while ((m = re.exec(content))) {
            const attrName = m[1];
            const value = m[2];
            const offset = m.index + m[0].indexOf(m[2]);
            if (seen.has(offset)) continue;
            seen.add(offset);

            // Line number
            let line = 1;
            for (let i = 0; i < m.index && i < content.length; i++) {
              if (content[i] === '\n') line++;
            }

            // Element type
            let start = m.index;
            while (start > 0 && content[start] !== '<') start--;
            const tagMatch = content.slice(start).match(/^<\s*(\w[\w-]*)/);
            const elementType = tagMatch ? tagMatch[1].toLowerCase() : 'unknown';

            // Commands & events
            const isHS = category === 'hyperscript';
            const commands: string[] = [];
            const events: string[] = [];
            if (isHS) {
              let cm;
              const cr = new RegExp(cmdRe.source, 'g');
              while ((cm = cr.exec(value))) commands.push(cm[1]);
              const er = new RegExp(evtRe.source, 'g');
              while ((cm = er.exec(value))) events.push(cm[1]);
            }

            const id = crypto
              .createHash('md5')
              .update(`${file}:${offset}`)
              .digest('hex')
              .slice(0, 12);

            snippets.push({
              id,
              filePath: file,
              relativePath: relPath,
              attributeName: attrName,
              value,
              isMultiline: value.includes('\n'),
              line,
              column: 1,
              elementType,
              category,
              commands: [...new Set(commands)],
              events: [...new Set(events)],
              fileMtime: stat.mtimeMs,
            });
          }
        }
      } catch {
        /* skip unreadable files */
      }
    }

    snippets.sort(
      (a: any, b: any) => a.relativePath.localeCompare(b.relativePath) || a.line - b.line
    );
    return snippets;
  };
}
