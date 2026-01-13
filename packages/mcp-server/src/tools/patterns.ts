/**
 * Pattern Tools
 *
 * Pattern lookup and LLM example retrieval from @hyperfixi/patterns-reference.
 * These tools help LLMs generate correct hyperscript by providing examples.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// =============================================================================
// Tool Definitions
// =============================================================================

export const patternTools: Tool[] = [
  {
    name: 'get_examples',
    description: 'Get hyperscript examples relevant to a task for few-shot learning',
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
    description: 'Search the pattern database for hyperscript examples',
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
    name: 'translate_hyperscript',
    description: 'Translate hyperscript between languages',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The hyperscript code to translate',
        },
        fromLanguage: {
          type: 'string',
          description: 'Source language code',
        },
        toLanguage: {
          type: 'string',
          description: 'Target language code',
        },
      },
      required: ['code', 'fromLanguage', 'toLanguage'],
    },
  },
  {
    name: 'get_pattern_stats',
    description: 'Get statistics about available patterns and languages',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// =============================================================================
// Tool Handlers
// =============================================================================

export async function handlePatternTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    // Try to import patterns-reference
    let patternsRef: any;
    try {
      patternsRef = await import('@hyperfixi/patterns-reference');
    } catch {
      // Fall back to built-in examples
      return handleWithBuiltinExamples(name, args);
    }

    switch (name) {
      case 'get_examples': {
        const prompt = args.prompt as string;
        const language = (args.language as string) || 'en';
        const limit = (args.limit as number) || 5;

        const examples = await patternsRef.getLLMExamples(prompt, language, limit);

        if (examples.length === 0) {
          return handleWithBuiltinExamples(name, args);
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
                  })),
                  count: examples.length,
                  language,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'search_patterns': {
        const query = args.query as string;
        const category = args.category as string | undefined;
        const limit = (args.limit as number) || 10;

        const ref = patternsRef.createPatternsReference({ readonly: true });
        let patterns;

        if (category) {
          patterns = await ref.getPatternsByCategory(category);
        } else {
          patterns = await ref.searchPatterns(query, { limit });
        }

        ref.close();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  patterns: patterns.map((p: any) => ({
                    id: p.id,
                    title: p.title,
                    code: p.rawCode,
                    category: p.feature,
                  })),
                  count: patterns.length,
                  query,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'translate_hyperscript': {
        const code = args.code as string;
        const fromLanguage = args.fromLanguage as string;
        const toLanguage = args.toLanguage as string;

        // Try semantic package for translation
        try {
          const semantic = await import('@hyperfixi/semantic');
          const translated = await semantic.translate(code, fromLanguage, toLanguage);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    original: code,
                    translated,
                    fromLanguage,
                    toLanguage,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'Translation requires @hyperfixi/semantic package',
                  original: code,
                  fromLanguage,
                  toLanguage,
                }),
              },
            ],
            isError: true,
          };
        }
      }

      case 'get_pattern_stats': {
        const ref = patternsRef.createPatternsReference({ readonly: true });
        const stats = await ref.getStats();
        const llmStats = await patternsRef.getLLMStats();
        ref.close();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  patterns: stats,
                  llmExamples: llmStats,
                  supportedLanguages: [
                    'en',
                    'es',
                    'pt',
                    'fr',
                    'de',
                    'ja',
                    'zh',
                    'ko',
                    'ar',
                    'tr',
                    'id',
                    'sw',
                    'qu',
                  ],
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
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error in ${name}: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

// =============================================================================
// Built-in Examples (fallback when patterns-reference isn't available)
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

function handleWithBuiltinExamples(
  name: string,
  args: Record<string, unknown>
): { content: Array<{ type: string; text: string }>; isError?: boolean } {
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
        // Return top examples as fallback
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  examples: BUILTIN_EXAMPLES.slice(0, limit),
                  count: limit,
                  note: 'No exact matches found, showing common examples',
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
                note: 'Using built-in examples (install @hyperfixi/patterns-reference for 400+ examples)',
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
      matches = matches.filter(
        ex => ex.task.toLowerCase().includes(query) || ex.code.toLowerCase().includes(query)
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                patterns: matches.slice(0, limit),
                count: matches.length,
                note: 'Using built-in patterns (install @hyperfixi/patterns-reference for 100+ patterns)',
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
                note: 'Install @hyperfixi/patterns-reference for 106 patterns, 1378 translations, 414 LLM examples',
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'translate_hyperscript': {
      const code = args.code as string;
      const fromLanguage = args.fromLanguage as string;
      const toLanguage = args.toLanguage as string;
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Translation requires @hyperfixi/semantic package',
                original: code,
                fromLanguage,
                toLanguage,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown pattern tool: ${name}` }],
        isError: true,
      };
  }
}
