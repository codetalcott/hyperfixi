/**
 * Pattern Tools
 *
 * Pattern lookup and LLM example retrieval from @hyperfixi/patterns-reference.
 * These tools help LLMs generate correct hyperscript by providing examples.
 */

import type { Tool } from '@modelcontextprotocol/server';
import type { Pattern } from '@hyperfixi/patterns-reference';

// =============================================================================
// Tool Definitions
// =============================================================================

export const patternTools: Tool[] = [
  {
    name: 'get_examples',
    description:
      'Get hyperscript code examples matching a natural language task description (e.g., "toggle a class on click"). Returns code verified to run on at least one engine, each tagged with `engine` (both = upstream _hyperscript and hyperfixi, hyperscript = upstream only, lokascript = hyperfixi only), plus quality scores. Best for generating new code by example. `source` says where the answer came from: "database", or "built-in" (a short English list) with `fallback` saying why: the database has no example for the prompt in that language, or @hyperfixi/patterns-reference could not be loaded. A database failure is an error (ok: false, PATTERN_DATABASE_ERROR), never a built-in answer.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Description of what you want to do (e.g., "toggle a class on click")',
        },
        language: {
          type: 'string',
          description: 'Language code (en, ja, ko, zh, es, etc.)',
          default: 'en',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of examples to return',
          default: 5,
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'search_patterns',
    description:
      'Search the pattern database by keyword, optionally within one category (events, dom-manipulation, class-manipulation, visibility, forms, async, etc.). Unlike get_examples which takes task descriptions, this searches pattern names and content. `source` is "database"; if @hyperfixi/patterns-reference cannot be loaded the search runs over a short built-in list instead and says so (`source: "built-in"`, with `fallback` giving the reason). A database failure is an error (ok: false, PATTERN_DATABASE_ERROR), never a built-in answer.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g., "modal", "form validation", "infinite scroll")',
        },
        category: {
          type: 'string',
          description: 'Filter by category (e.g., "class-manipulation", "visibility", "async")',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of patterns to return',
          default: 10,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_pattern_stats',
    description:
      'Get statistics about available patterns and languages. `source` is "database", or "built-in" (with `fallback` giving the reason) when @hyperfixi/patterns-reference cannot be loaded; a database failure is an error (ok: false, PATTERN_DATABASE_ERROR).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// =============================================================================
// Tool Handlers
// =============================================================================

type ToolResult = { content: Array<{ type: string; text: string }>; isError?: boolean };

/** Why an answer came from the built-in list and not from the pattern database. */
interface Fallback {
  code: 'PATTERNS_REFERENCE_UNAVAILABLE' | 'NO_DATABASE_MATCH';
  reason: string;
}

const PATTERN_TOOL_NAMES = new Set(patternTools.map(t => t.name));

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * The package loaded, so its database is expected to answer: a query that throws (no
 * database file, a missing table, a failed native binding) is reported as an error. It
 * used to be answered from the built-in list, which a caller could not tell from a
 * real result.
 */
function databaseError(name: string, error: unknown): ToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            ok: false,
            code: 'PATTERN_DATABASE_ERROR',
            error: `${name}: the pattern database could not answer: ${messageOf(error)}`,
            hint: 'The database ships in @hyperfixi/patterns-reference (data/patterns.db; LSP_DB_PATH or HYPERSCRIPT_LSP_DB overrides the path). Check the override, or reinstall the package.',
          },
          null,
          2
        ),
      },
    ],
    isError: true,
  };
}

export async function handlePatternTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!PATTERN_TOOL_NAMES.has(name)) {
    return {
      content: [{ type: 'text', text: `Unknown pattern tool: ${name}` }],
      isError: true,
    };
  }

  // patterns-reference is an optional peer. Without it the tools answer from the
  // built-in list, and say so: a degraded mode, named in the result.
  let patternsRef: any;
  try {
    patternsRef = await import('@hyperfixi/patterns-reference');
  } catch (error) {
    return handleWithBuiltinExamples(name, args, {
      code: 'PATTERNS_REFERENCE_UNAVAILABLE',
      reason: `@hyperfixi/patterns-reference could not be loaded: ${messageOf(error)}`,
    });
  }

  switch (name) {
    case 'get_examples': {
      const prompt = args.prompt as string;
      const language = (args.language as string) || 'en';
      const limit = (args.limit as number) || 5;

      try {
        const examples = await patternsRef.getLLMExamples(prompt, language, limit);

        if (!examples || examples.length === 0) {
          return handleWithBuiltinExamples(name, args, {
            code: 'NO_DATABASE_MATCH',
            reason: `The pattern database has no "${language}" example matching the prompt.`,
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  examples: examples.map((ex: any) => ({
                    task: ex.prompt,
                    code: ex.completion,
                    quality: ex.qualityScore,
                    // Which engine(s) are verified to run it (both | lokascript |
                    // hyperscript) — patterns-reference never serves one that
                    // runs on neither.
                    engine: ex.engine,
                  })),
                  count: examples.length,
                  language,
                  source: 'database',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return databaseError(name, error);
      }
    }

    case 'search_patterns': {
      const query = args.query as string;
      const category = args.category as string | undefined;
      const limit = (args.limit as number) || 10;

      try {
        const ref = patternsRef.createPatternsReference({ readonly: true });
        let patterns: Pattern[];

        try {
          // One call: a category narrows the search, it does not replace it (the
          // query and the limit used to be dropped whenever a category was given).
          patterns = await ref.searchPatterns(query, { category, limit });
        } finally {
          ref.close();
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  patterns: patterns.map(p => ({
                    id: p.id,
                    title: p.title,
                    code: p.rawCode,
                    category: p.category,
                  })),
                  count: patterns.length,
                  query,
                  source: 'database',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return databaseError(name, error);
      }
    }

    case 'get_pattern_stats': {
      try {
        const ref = patternsRef.createPatternsReference({ readonly: true });
        let stats;
        let llmStats;

        try {
          stats = await ref.getStats();
          llmStats = await patternsRef.getLLMStats();
        } finally {
          ref.close();
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  patterns: stats,
                  llmExamples: llmStats,
                  // The languages the database holds translations in (a hand-written
                  // list of 13 stood here while the database held 24).
                  supportedLanguages: Object.keys(stats.byLanguage).sort(),
                  source: 'database',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return databaseError(name, error);
      }
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown pattern tool: ${name}` }],
        isError: true,
      };
  }
}

// =============================================================================
// Built-in Examples (when patterns-reference cannot be loaded, or has no example)
// =============================================================================

const BUILTIN_EXAMPLES = [
  // Basic class manipulation
  {
    task: 'toggle a class on click',
    code: 'on click toggle .active',
    category: 'class-manipulation',
  },
  {
    task: 'add a class to an element',
    code: 'on click add .highlight to me',
    category: 'class-manipulation',
  },
  {
    task: 'remove a class from an element',
    code: 'on click remove .error from #form',
    category: 'class-manipulation',
  },
  {
    task: 'take active class from siblings',
    code: "take .active from my parentElement's children",
    category: 'class-manipulation',
  },
  // Visibility
  {
    task: 'show a modal',
    code: 'on click show #modal with *opacity',
    category: 'visibility',
  },
  {
    task: 'hide an element',
    code: 'on click hide me with *opacity',
    category: 'visibility',
  },
  // Async operations
  {
    task: 'fetch data from API',
    code: 'on click fetch /api/data as json put it.name into #result',
    category: 'async',
  },
  {
    task: 'loading state for button',
    code: 'on click add .loading to me fetch /api remove .loading from me',
    category: 'async',
  },
  {
    task: 'submit form with fetch',
    code: 'on submit prevent default fetch /api { method: "POST", body: me as FormData }',
    category: 'async',
  },
  // Validation
  {
    task: 'form validation on blur',
    code: 'on blur if my value is empty add .error else remove .error',
    category: 'validation',
  },
  // Loops
  {
    task: 'countdown timer',
    code: 'on click repeat 10 times decrement #counter.textContent wait 1s',
    category: 'loops',
  },
  {
    task: 'iterate over elements',
    code: 'on load for link in <a/> in me add .nav-link to link end',
    category: 'loops',
  },
  // Events
  {
    task: 'toggle menu on click',
    code: 'on click toggle .open on #nav',
    category: 'class-manipulation',
  },
  {
    task: 'debounced input handler',
    code: 'on input.debounce(300ms) put my value into #preview',
    category: 'events',
  },
  {
    task: 'scroll event from window',
    code: 'on scroll from window if window.scrollY > 100 add .scrolled to <body/> else remove .scrolled from <body/> end',
    category: 'events',
  },
  {
    task: 'multiple events with or',
    code: 'on load or mutation from <#tableBody/> set :count to the length of <tr/> in me',
    category: 'events',
  },
  // Tell blocks
  {
    task: 'tell block for multiple commands',
    code: 'tell #snackbar remove .hidden then add .visible then wait 3s then remove .visible then add .hidden end',
    category: 'tell',
  },
  // Transition/Animation
  {
    task: 'animate style property',
    code: "on scroll from window transition my *top to '-60px' over 300ms",
    category: 'animation',
  },
  // Object creation
  {
    task: 'create date object',
    code: 'make a Date then set my value to it.toISOString()',
    category: 'objects',
  },
  // Content manipulation
  {
    task: 'append content to element',
    code: 'append it to #results',
    category: 'content',
  },
  // Conditional with otherwise
  {
    task: 'conditional with otherwise',
    code: 'if I.checked tell #panel show end otherwise tell #panel hide end',
    category: 'control-flow',
  },
  // Dynamic class with braces
  {
    task: 'dynamic class with special characters',
    code: "on click add .{'hover:scale-105'} to me",
    category: 'class-manipulation',
  },
];

/** Every built-in answer names itself and carries why the database did not answer. */
function handleWithBuiltinExamples(
  name: string,
  args: Record<string, unknown>,
  fallback: Fallback
): ToolResult {
  const origin = {
    source: 'built-in',
    fallback,
    note:
      fallback.code === 'NO_DATABASE_MATCH'
        ? 'Built-in English examples: the pattern database had no match (see fallback).'
        : 'Built-in list, not the pattern database (see fallback). Install @hyperfixi/patterns-reference for the database: patterns, their translations in 24 languages, and LLM examples.',
  };
  switch (name) {
    case 'get_examples': {
      const prompt = (args.prompt as string).toLowerCase();
      const limit = (args.limit as number) || 5;

      // Simple keyword matching
      const keywords = prompt.split(/\s+/);
      const matches = BUILTIN_EXAMPLES.filter(ex =>
        keywords.some(
          kw =>
            ex.task.toLowerCase().includes(kw) ||
            ex.code.toLowerCase().includes(kw) ||
            ex.category.includes(kw)
        )
      ).slice(0, limit);

      if (matches.length === 0) {
        // No built-in example matches either: the first few, marked as unmatched
        const common = BUILTIN_EXAMPLES.slice(0, limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  examples: common,
                  count: common.length,
                  matched: false,
                  ...origin,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                examples: matches,
                count: matches.length,
                matched: true,
                ...origin,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'search_patterns': {
      const query = (args.query as string).toLowerCase();
      const category = args.category as string | undefined;
      const limit = (args.limit as number) || 10;

      let matches = BUILTIN_EXAMPLES;
      if (category) {
        matches = matches.filter(ex => ex.category === category);
      }
      matches = matches
        .filter(
          ex => ex.task.toLowerCase().includes(query) || ex.code.toLowerCase().includes(query)
        )
        .slice(0, limit);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                patterns: matches,
                count: matches.length,
                query: args.query,
                ...origin,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'get_pattern_stats': {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                builtinExamples: BUILTIN_EXAMPLES.length,
                categories: [...new Set(BUILTIN_EXAMPLES.map(ex => ex.category))],
                supportedLanguages: ['en'],
                ...origin,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown pattern tool: ${name}` }],
        isError: true,
      };
  }
}
