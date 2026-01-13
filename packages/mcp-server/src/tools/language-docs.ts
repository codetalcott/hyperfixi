/**
 * Language Documentation Tools
 *
 * MCP tools for querying hyperscript language documentation:
 * commands, expressions, keywords, features, and special symbols.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// =============================================================================
// Tool Definitions
// =============================================================================

export const languageDocsTools: Tool[] = [
  {
    name: 'get_command_docs',
    description:
      'Get documentation for a specific hyperscript command. Returns syntax, description, and usage details.',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The command name (e.g., "toggle", "add", "fetch")',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'get_expression_docs',
    description:
      'Get documentation for hyperscript expression types. Returns description, category, operators, and examples.',
    inputSchema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'The expression name (e.g., "attribute-ref", "query-reference", "it")',
        },
      },
      required: ['expression'],
    },
  },
  {
    name: 'search_language_elements',
    description:
      'Search across all hyperscript language elements (commands, expressions, keywords, features, special symbols). Useful for discovering available features.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query to find matching language elements',
        },
        types: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['command', 'expression', 'keyword', 'feature', 'special_symbol'],
          },
          description: 'Filter by element types. If not specified, searches all types.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 10,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'suggest_best_practices',
    description:
      'Analyze hyperscript code and suggest improvements based on patterns and common best practices.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The hyperscript code to analyze',
        },
      },
      required: ['code'],
    },
  },
];

// =============================================================================
// Best Practices Rules
// =============================================================================

interface BestPractice {
  id: string;
  name: string;
  description: string;
  check: (code: string) => { applies: boolean; suggestion?: string; improved?: string };
}

const BEST_PRACTICES: BestPractice[] = [
  {
    id: 'prefer-toggle',
    name: 'Prefer toggle over add/remove pairs',
    description:
      'Use toggle when you want to switch a class on/off rather than separate add/remove',
    check: (code: string) => {
      // Check for patterns like "if has .class remove else add"
      if (
        /if.*has.*\.([\w-]+).*remove.*\1.*else.*add.*\1/i.test(code) ||
        /if.*has.*\.([\w-]+).*add.*\1.*else.*remove.*\1/i.test(code)
      ) {
        const match = code.match(/\.([\w-]+)/);
        const className = match ? match[1] : 'active';
        return {
          applies: true,
          suggestion: `Consider using "toggle .${className}" instead of if/else with add/remove`,
          improved: `toggle .${className}`,
        };
      }
      return { applies: false };
    },
  },
  {
    id: 'use-then-chaining',
    name: 'Use then for command chaining',
    description: 'Chain multiple commands with "then" for sequential execution',
    check: (code: string) => {
      // Check for multiple separate on handlers doing related things
      const onCount = (code.match(/\bon\s+\w+/gi) || []).length;
      const thenCount = (code.match(/\bthen\b/gi) || []).length;
      if (onCount > 1 && thenCount === 0 && code.length < 200) {
        return {
          applies: true,
          suggestion: 'Consider combining related handlers using "then" for sequential commands',
        };
      }
      return { applies: false };
    },
  },
  {
    id: 'avoid-deep-nesting',
    name: 'Avoid deeply nested if statements',
    description:
      'Deeply nested conditionals are hard to read; consider early returns or separate behaviors',
    check: (code: string) => {
      // Count nested if levels
      const ifMatches = code.matchAll(/\bif\b/gi);
      const endMatches = code.matchAll(/\bend\b/gi);
      const ifCount = [...ifMatches].length;
      const endCount = [...endMatches].length;

      // Simple heuristic: more than 2 nested ifs
      if (ifCount >= 3 && endCount >= 3) {
        return {
          applies: true,
          suggestion:
            'Consider simplifying nested conditionals using guard clauses or breaking into separate behaviors',
        };
      }
      return { applies: false };
    },
  },
  {
    id: 'use-wait-for-timing',
    name: 'Use wait for delays instead of setTimeout',
    description: 'Hyperscript provides built-in "wait" for cleaner delay syntax',
    check: (code: string) => {
      if (/setTimeout|setInterval/i.test(code)) {
        return {
          applies: true,
          suggestion: 'Use hyperscript "wait 100ms" instead of JavaScript setTimeout',
          improved: 'wait 100ms then ...',
        };
      }
      return { applies: false };
    },
  },
  {
    id: 'prefer-css-selectors',
    name: 'Use CSS selectors for element references',
    description: 'Prefer CSS selectors (#id, .class) over document.querySelector',
    check: (code: string) => {
      if (/document\.querySelector|document\.getElementById|document\.getElementsBy/i.test(code)) {
        return {
          applies: true,
          suggestion:
            'Use hyperscript CSS selectors like "#id" or ".class" instead of document methods',
          improved: 'set #myElement.textContent to "Hello"',
        };
      }
      return { applies: false };
    },
  },
  {
    id: 'use-me-reference',
    name: 'Use "me" for current element',
    description: 'Use "me" to reference the current element instead of explicit selectors',
    check: (code: string) => {
      // Check if code references an ID that could be "me"
      if (/on\s+\w+.*set\s+#\w+\.\w+/i.test(code) && !/\bme\b/i.test(code)) {
        return {
          applies: true,
          suggestion:
            'Consider using "me" to reference the current element instead of an explicit selector',
        };
      }
      return { applies: false };
    },
  },
  {
    id: 'use-possessive-syntax',
    name: 'Use possessive syntax for properties',
    description: 'Use "element\'s property" syntax for cleaner property access',
    check: (code: string) => {
      // Check for .property access that could use possessive
      if (/\]\.(textContent|innerHTML|value|checked|disabled)/i.test(code)) {
        return {
          applies: true,
          suggestion:
            'Consider using possessive syntax like "the input\'s value" instead of ".value"',
        };
      }
      return { applies: false };
    },
  },
  {
    id: 'avoid-inline-javascript',
    name: 'Avoid inline JavaScript in hyperscript',
    description: 'Keep JavaScript separate from hyperscript for maintainability',
    check: (code: string) => {
      if (/js\s*{[^}]{50,}}/i.test(code)) {
        return {
          applies: true,
          suggestion:
            'Large JavaScript blocks in hyperscript reduce readability. Consider moving to a separate function.',
        };
      }
      return { applies: false };
    },
  },
];

// =============================================================================
// Tool Handlers
// =============================================================================

export async function handleLanguageDocsTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    // Try to import patterns-reference
    let patternsRef: any;
    try {
      patternsRef = await import('@hyperfixi/patterns-reference');
    } catch {
      // Fall back to built-in responses
      return handleWithBuiltinDocs(name, args);
    }

    switch (name) {
      case 'get_command_docs': {
        const commandName = args.command as string;
        const command = await patternsRef.getCommandByName(commandName);

        if (!command) {
          // Try searching for similar commands
          const allCommands = await patternsRef.getAllCommands();
          const suggestions = allCommands
            .filter((c: any) => c.name.includes(commandName) || commandName.includes(c.name))
            .slice(0, 3)
            .map((c: any) => c.name);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    found: false,
                    command: commandName,
                    message: `Command "${commandName}" not found`,
                    suggestions: suggestions.length > 0 ? suggestions : undefined,
                    availableCommands: allCommands.slice(0, 10).map((c: any) => c.name),
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
                  found: true,
                  command: command.name,
                  description: command.description,
                  syntax: command.syntax,
                  purpose: command.purpose,
                  implicitTarget: command.implicitTarget,
                  implicitResultTarget: command.implicitResultTarget,
                  isBlocking: command.isBlocking,
                  hasBody: command.hasBody,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_expression_docs': {
        const expressionName = args.expression as string;
        const expression = await patternsRef.getExpressionByName(expressionName);

        if (!expression) {
          const allExpressions = await patternsRef.getAllExpressions();
          const suggestions = allExpressions
            .filter((e: any) => e.name.includes(expressionName) || expressionName.includes(e.name))
            .slice(0, 3)
            .map((e: any) => e.name);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    found: false,
                    expression: expressionName,
                    message: `Expression "${expressionName}" not found`,
                    suggestions: suggestions.length > 0 ? suggestions : undefined,
                    availableExpressions: allExpressions.slice(0, 10).map((e: any) => e.name),
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
                  found: true,
                  expression: expression.name,
                  description: expression.description,
                  category: expression.category,
                  evaluatesToType: expression.evaluatesToType,
                  precedence: expression.precedence,
                  associativity: expression.associativity,
                  operators: expression.operators,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'search_language_elements': {
        const query = args.query as string;
        const types = args.types as string[] | undefined;
        const limit = (args.limit as number) || 10;

        const results = await patternsRef.searchLanguageElements(query, types);
        const limitedResults = results.slice(0, limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  query,
                  types: types || ['command', 'expression', 'keyword', 'feature', 'special_symbol'],
                  totalResults: results.length,
                  results: limitedResults.map((r: any) => ({
                    type: r.type,
                    name: r.element.name,
                    description: r.element.description,
                    ...(r.type === 'command' && { syntax: r.element.syntax }),
                    ...(r.type === 'expression' && { category: r.element.category }),
                    ...(r.type === 'feature' && { trigger: r.element.trigger }),
                    ...(r.type === 'special_symbol' && { symbol: r.element.symbol }),
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'suggest_best_practices': {
        const code = args.code as string;
        return analyzeBestPractices(code);
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
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
// Best Practices Analysis
// =============================================================================

function analyzeBestPractices(code: string): {
  content: Array<{ type: string; text: string }>;
} {
  const suggestions: Array<{
    rule: string;
    description: string;
    suggestion: string;
    improved?: string;
  }> = [];

  for (const practice of BEST_PRACTICES) {
    const result = practice.check(code);
    if (result.applies) {
      suggestions.push({
        rule: practice.name,
        description: practice.description,
        suggestion: result.suggestion || practice.description,
        improved: result.improved,
      });
    }
  }

  // Also check for common patterns from database if available
  const patternSuggestions = findSimilarPatterns(code);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            code,
            analysisComplete: true,
            suggestionsCount: suggestions.length,
            suggestions,
            similarPatterns: patternSuggestions,
            overallScore:
              suggestions.length === 0
                ? 'good'
                : suggestions.length <= 2
                  ? 'could improve'
                  : 'needs attention',
          },
          null,
          2
        ),
      },
    ],
  };
}

function findSimilarPatterns(code: string): Array<{ pattern: string; example: string }> {
  const patterns: Array<{ pattern: string; example: string }> = [];

  // Simple pattern detection
  if (/toggle\s+\./i.test(code)) {
    patterns.push({
      pattern: 'Class toggle',
      example: 'on click toggle .active on me',
    });
  }

  if (/fetch\s+/i.test(code)) {
    patterns.push({
      pattern: 'Data fetching',
      example: 'fetch /api/data as json then put result into #target',
    });
  }

  if (/on\s+click/i.test(code) && /add\s+\./i.test(code)) {
    patterns.push({
      pattern: 'Click handler with class',
      example: 'on click add .selected to me then remove .selected from .siblings',
    });
  }

  if (/wait\s+\d+/i.test(code)) {
    patterns.push({
      pattern: 'Timed action',
      example: 'on click add .loading then wait 500ms then remove .loading',
    });
  }

  return patterns;
}

// =============================================================================
// Built-in Fallbacks
// =============================================================================

const BUILTIN_COMMANDS: Record<string, any> = {
  toggle: {
    name: 'toggle',
    description: 'Toggle a class, attribute, or visibility on elements',
    syntax: 'toggle <class-ref | attribute-ref | visibility> [on <target>]',
  },
  add: {
    name: 'add',
    description: 'Add a class or attribute to elements',
    syntax: 'add <class-ref | attribute-ref> [to <target>]',
  },
  remove: {
    name: 'remove',
    description: 'Remove a class, attribute, or element',
    syntax: 'remove <class-ref | attribute-ref | element> [from <target>]',
  },
  set: {
    name: 'set',
    description: 'Set a property or variable value',
    syntax: 'set <target> to <value>',
  },
  put: {
    name: 'put',
    description: 'Put content into an element',
    syntax: 'put <value> into|before|after|at start of|at end of <target>',
  },
  fetch: {
    name: 'fetch',
    description: 'Fetch data from a URL',
    syntax: 'fetch <url> [as <type>] [with <options>]',
  },
  wait: {
    name: 'wait',
    description: 'Wait for a time duration or event',
    syntax: 'wait <time> | wait for <event>',
  },
  hide: {
    name: 'hide',
    description: 'Hide an element',
    syntax: 'hide [<target>] [with <strategy>]',
  },
  show: {
    name: 'show',
    description: 'Show a hidden element',
    syntax: 'show [<target>] [with <strategy>]',
  },
  send: {
    name: 'send',
    description: 'Send/trigger a custom event',
    syntax: 'send <event-name> [to <target>] [with <details>]',
  },
};

function handleWithBuiltinDocs(
  name: string,
  args: Record<string, unknown>
): { content: Array<{ type: string; text: string }>; isError?: boolean } {
  switch (name) {
    case 'get_command_docs': {
      const commandName = (args.command as string).toLowerCase();
      const command = BUILTIN_COMMANDS[commandName];

      if (!command) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  found: false,
                  command: commandName,
                  message: `Command "${commandName}" not found in built-in docs`,
                  availableCommands: Object.keys(BUILTIN_COMMANDS),
                  note: 'Install @hyperfixi/patterns-reference for full documentation',
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
                found: true,
                ...command,
                note: 'Using built-in docs. Install @hyperfixi/patterns-reference for full documentation.',
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'get_expression_docs': {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                found: false,
                expression: args.expression,
                message: 'Expression documentation requires @hyperfixi/patterns-reference',
                note: 'Run migration script to populate language documentation',
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'search_language_elements': {
      const query = (args.query as string).toLowerCase();
      const matches = Object.entries(BUILTIN_COMMANDS)
        .filter(
          ([name, cmd]) => name.includes(query) || cmd.description?.toLowerCase().includes(query)
        )
        .map(([_, cmd]) => ({
          type: 'command',
          name: cmd.name,
          description: cmd.description,
          syntax: cmd.syntax,
        }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                query,
                totalResults: matches.length,
                results: matches,
                note: 'Using built-in docs. Install @hyperfixi/patterns-reference for full search.',
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'suggest_best_practices': {
      return analyzeBestPractices(args.code as string);
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
}
