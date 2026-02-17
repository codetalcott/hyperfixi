/**
 * Validation Tools for original _hyperscript
 *
 * Pattern-based hyperscript syntax validation.
 * No external dependencies — pure regex analysis.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// =============================================================================
// Tool Definitions
// =============================================================================

export const validationTools: Tool[] = [
  {
    name: 'validate_hyperscript',
    description: 'Validate _hyperscript syntax and return any errors or warnings',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The hyperscript code to validate',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'suggest_command',
    description: 'Suggest the best _hyperscript command for a task',
    inputSchema: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description:
            'Description of what you want to do (e.g., "show a modal", "toggle a class")',
        },
      },
      required: ['task'],
    },
  },
  {
    name: 'get_code_fixes',
    description:
      'Get suggested fixes for common _hyperscript errors. Pass an error code or use listAll to see all fixable errors.',
    inputSchema: {
      type: 'object',
      properties: {
        errorCode: {
          type: 'string',
          description: 'Error code (e.g., "unmatched-quote", "unclosed-block", "missing-then")',
        },
        listAll: {
          type: 'boolean',
          description: 'If true, list all error codes that have fixes',
          default: false,
        },
      },
    },
  },
];

// =============================================================================
// Hyperscript Commands (English only)
// =============================================================================

const VALID_COMMANDS = [
  'toggle',
  'add',
  'remove',
  'show',
  'hide',
  'set',
  'get',
  'put',
  'append',
  'prepend',
  'increment',
  'decrement',
  'log',
  'send',
  'trigger',
  'wait',
  'fetch',
  'call',
  'go',
  'focus',
  'blur',
  'return',
  'break',
  'continue',
  'exit',
  'halt',
  'throw',
  'transition',
  'take',
  'tell',
  'repeat',
  'for',
  'while',
  'if',
  'unless',
  'js',
  'default',
];

const EVENT_KEYWORDS = ['on'];
const BLOCK_KEYWORDS = ['behavior', 'def', 'init', 'worker', 'eventsource', 'socket'];

// =============================================================================
// Error Fixes Registry
// =============================================================================

interface CodeFix {
  code: string;
  title: string;
  description: string;
}

const ERROR_FIXES: Record<string, CodeFix[]> = {
  'unmatched-quote': [
    {
      code: 'close-quote',
      title: 'Close the unmatched quote',
      description: 'Ensure all single and double quotes are properly paired',
    },
  ],
  'unmatched-backtick': [
    {
      code: 'close-backtick',
      title: 'Close the unmatched backtick',
      description: 'Ensure backticks are properly paired',
    },
  ],
  'unclosed-block': [
    {
      code: 'add-end',
      title: 'Add missing "end" keyword',
      description: 'if/repeat/for/while blocks must be closed with "end"',
    },
  ],
  'missing-then': [
    {
      code: 'add-then',
      title: 'Add "then" between commands',
      description: 'Separate consecutive commands with "then" for sequential execution',
    },
  ],
  'onclick-usage': [
    {
      code: 'use-hyperscript-event',
      title: 'Use _hyperscript event syntax',
      description: 'Replace onclick="..." with _="on click ..."',
    },
  ],
  'unknown-command': [
    {
      code: 'check-spelling',
      title: 'Check command spelling',
      description: 'Verify the command name against the _hyperscript reference',
    },
  ],
  'missing-target': [
    {
      code: 'add-target',
      title: 'Add a target class, attribute, or selector',
      description: 'Commands like toggle, add, remove require a target (.class, @attr, or #id)',
    },
  ],
  'missing-destination': [
    {
      code: 'add-destination',
      title: 'Add "into #element" destination',
      description: 'The put command requires a destination (e.g., put "text" into #output)',
    },
  ],
};

// =============================================================================
// Tool Handlers
// =============================================================================

export async function handleValidationTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case 'validate_hyperscript': {
        const code = args.code as string;
        if (!code || typeof code !== 'string') {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Missing required parameter: code' }, null, 2),
              },
            ],
            isError: true,
          };
        }
        return validateHyperscript(code);
      }

      case 'suggest_command': {
        const task = args.task as string;
        if (!task || typeof task !== 'string') {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Missing required parameter: task' }, null, 2),
              },
            ],
            isError: true,
          };
        }
        return suggestCommand(task);
      }

      case 'get_code_fixes': {
        const errorCode = args.errorCode as string | undefined;
        const listAll = (args.listAll as boolean) || false;
        return getCodeFixes(errorCode, listAll);
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown validation tool: ${name}` }],
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
// Validation Implementation
// =============================================================================

function validateHyperscript(code: string): { content: Array<{ type: string; text: string }> } {
  const errors: Array<{ message: string; line?: number; code?: string; suggestion?: string }> = [];
  const warnings: Array<{ message: string; line?: number; code?: string; suggestion?: string }> =
    [];
  const lines = code.split('\n');

  // Check for onclick misuse
  if (code.includes('onclick') || code.includes('onClick')) {
    errors.push({
      message: 'Use _hyperscript event syntax instead of onclick attribute',
      suggestion: 'Replace onclick="..." with _="on click ..."',
      code: 'onclick-usage',
    });
  }

  // Per-line analysis
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Unmatched quotes
    const possessivePattern = /\w's(?=\s|$|[.,;:!?)}\]])/g;
    const possessiveCount = (line.match(possessivePattern) || []).length;
    const allSingleQuotes = (line.match(/'/g) || []).length;
    const singleQuotes = allSingleQuotes - possessiveCount;
    const doubleQuotes = (line.match(/"/g) || []).length;
    const backticks = (line.match(/`/g) || []).length;

    if (singleQuotes % 2 !== 0) {
      errors.push({ message: 'Unmatched single quote', line: i, code: 'unmatched-quote' });
    }
    if (doubleQuotes % 2 !== 0) {
      errors.push({ message: 'Unmatched double quote', line: i, code: 'unmatched-quote' });
    }
    if (backticks % 2 !== 0) {
      errors.push({ message: 'Unmatched backtick', line: i, code: 'unmatched-backtick' });
    }

    // Missing 'then' between commands
    const commandPattern = VALID_COMMANDS.slice(0, 10).join('|');
    const missingThenRegex = new RegExp(
      `\\b(${commandPattern})\\s+\\.\\w+\\s+(${commandPattern})\\b`,
      'i'
    );
    if (missingThenRegex.test(line)) {
      warnings.push({
        message: 'Missing "then" between commands',
        line: i,
        code: 'missing-then',
        suggestion: 'Separate consecutive commands with "then"',
      });
    }

    // Check for unknown commands at the start of a command position
    const commandStartMatch = line.match(/^\s*(\w+)\s/);
    if (commandStartMatch) {
      const word = commandStartMatch[1].toLowerCase();
      const allKeywords = [
        ...VALID_COMMANDS,
        ...EVENT_KEYWORDS,
        ...BLOCK_KEYWORDS,
        'then',
        'end',
        'else',
        'on',
      ];
      if (
        word.length > 2 &&
        !allKeywords.includes(word) &&
        !/^(true|false|null|undefined|me|you|it|its|my|result)$/.test(word)
      ) {
        const closest = findClosestCommand(word, VALID_COMMANDS);
        if (closest) {
          warnings.push({
            message: `Unknown command "${word}"`,
            line: i,
            code: 'unknown-command',
            suggestion: `Did you mean "${closest.command}"?`,
          });
        }
      }
    }
  }

  // Unclosed blocks
  const ifCount = (code.match(/\bif\b/gi) || []).length;
  const repeatCount = (code.match(/\brepeat\b/gi) || []).length;
  const forCount = (code.match(/\bfor\b/gi) || []).length;
  const whileCount = (code.match(/\bwhile\b/gi) || []).length;
  const endCount = (code.match(/\bend\b/gi) || []).length;
  const blockOpens = ifCount + repeatCount + forCount + whileCount;
  if (blockOpens > endCount) {
    warnings.push({
      message: `Possibly unclosed block: ${blockOpens} block openings but only ${endCount} "end" keywords`,
      code: 'unclosed-block',
    });
  }

  // Command-specific checks
  if (/\btoggle\s*$/.test(code.trim())) {
    warnings.push({
      message: 'toggle command missing target',
      code: 'missing-target',
      suggestion: 'Add a class (.class), attribute (@attr), or selector',
    });
  }
  if (/\bput\b/i.test(code) && !/\binto\b/i.test(code)) {
    warnings.push({
      message: 'put command may be missing destination',
      code: 'missing-destination',
      suggestion: 'Add "into #element" to specify where to put the content',
    });
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            valid: errors.length === 0,
            errors,
            warnings,
            counts: {
              errors: errors.length,
              warnings: warnings.length,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}

// =============================================================================
// Command Suggestion
// =============================================================================

interface CommandSuggestion {
  command: string;
  syntax: string;
  example: string;
  description: string;
}

const COMMAND_SUGGESTIONS: Record<string, CommandSuggestion[]> = {
  toggle: [
    {
      command: 'toggle',
      syntax: 'toggle <class|attr> [on <target>]',
      example: 'toggle .active on #menu',
      description: 'Toggle a class or attribute on/off',
    },
  ],
  show: [
    {
      command: 'show',
      syntax: 'show <target> [with <transition>]',
      example: 'show #modal with *opacity',
      description: 'Show a hidden element',
    },
  ],
  hide: [
    {
      command: 'hide',
      syntax: 'hide <target> [with <transition>]',
      example: 'hide #modal with *opacity',
      description: 'Hide an element',
    },
  ],
  add: [
    {
      command: 'add',
      syntax: 'add <class|attr> [to <target>]',
      example: 'add .highlight to me',
      description: 'Add a class or attribute to an element',
    },
  ],
  remove: [
    {
      command: 'remove',
      syntax: 'remove <class|attr> [from <target>]',
      example: 'remove .error from #form',
      description: 'Remove a class, attribute, or element',
    },
  ],
  set: [
    {
      command: 'set',
      syntax: 'set <property> to <value>',
      example: 'set :count to 0',
      description: 'Set a variable or property value',
    },
  ],
  put: [
    {
      command: 'put',
      syntax: 'put <value> into <target>',
      example: 'put "Hello" into #greeting',
      description: 'Set element content',
    },
  ],
  fetch: [
    {
      command: 'fetch',
      syntax: 'fetch <url> [as <type>]',
      example: 'fetch /api/data as json',
      description: 'Make an HTTP request',
    },
  ],
  wait: [
    {
      command: 'wait',
      syntax: 'wait <duration>',
      example: 'wait 500ms',
      description: 'Pause execution for a duration',
    },
  ],
  send: [
    {
      command: 'send',
      syntax: 'send <event> [to <target>]',
      example: 'send refresh to #list',
      description: 'Dispatch a custom event',
    },
  ],
  trigger: [
    {
      command: 'trigger',
      syntax: 'trigger <event> [on <target>]',
      example: 'trigger submit on #form',
      description: 'Trigger an event on an element',
    },
  ],
  call: [
    {
      command: 'call',
      syntax: 'call <function>(args)',
      example: 'call alert("Hello")',
      description: 'Call a JavaScript function',
    },
  ],
  log: [
    {
      command: 'log',
      syntax: 'log <expression>',
      example: 'log me',
      description: 'Log a value to the console',
    },
  ],
  increment: [
    {
      command: 'increment',
      syntax: 'increment <variable>',
      example: 'increment :count',
      description: 'Add 1 to a variable',
    },
  ],
  decrement: [
    {
      command: 'decrement',
      syntax: 'decrement <variable>',
      example: 'decrement :count',
      description: 'Subtract 1 from a variable',
    },
  ],
  go: [
    {
      command: 'go',
      syntax: 'go to <url>',
      example: 'go to /dashboard',
      description: 'Navigate to a URL',
    },
  ],
  append: [
    {
      command: 'append',
      syntax: 'append <content> to <target>',
      example: 'append "<li>New</li>" to #list',
      description: 'Append content to an element',
    },
  ],
  take: [
    {
      command: 'take',
      syntax: 'take <class> from <group>',
      example: 'take .active from .tabs',
      description: 'Move a class from siblings to current element',
    },
  ],
  transition: [
    {
      command: 'transition',
      syntax: 'transition <property> to <value> over <duration>',
      example: 'transition *opacity to 0 over 500ms',
      description: 'Animate a CSS property',
    },
  ],
};

const TASK_PATTERNS: Array<{ pattern: RegExp; commands: string[] }> = [
  { pattern: /toggle|switch|on.off|flip/i, commands: ['toggle'] },
  { pattern: /show|display|visible|appear|reveal/i, commands: ['show'] },
  { pattern: /hide|invisible|disappear|conceal/i, commands: ['hide'] },
  { pattern: /add|attach|apply|include/i, commands: ['add'] },
  { pattern: /remove|delete|detach|strip/i, commands: ['remove'] },
  { pattern: /set|assign|update|change/i, commands: ['set'] },
  { pattern: /content|html|text|put|insert/i, commands: ['put'] },
  { pattern: /fetch|request|api|ajax|http|load.data/i, commands: ['fetch'] },
  { pattern: /wait|delay|pause|sleep|timeout/i, commands: ['wait'] },
  { pattern: /send|dispatch|emit|fire/i, commands: ['send', 'trigger'] },
  { pattern: /call|invoke|run|execute/i, commands: ['call'] },
  { pattern: /log|debug|print|console/i, commands: ['log'] },
  { pattern: /count|increment|add.1|increase/i, commands: ['increment'] },
  { pattern: /decrement|subtract|decrease/i, commands: ['decrement'] },
  { pattern: /navigate|redirect|go|url|page/i, commands: ['go'] },
  { pattern: /append|add.to.list|push/i, commands: ['append'] },
  { pattern: /tab|exclusive|active.class|take/i, commands: ['take'] },
  { pattern: /animate|transition|fade|slide/i, commands: ['transition'] },
  { pattern: /modal|dialog|popup|overlay/i, commands: ['show', 'toggle'] },
  { pattern: /form|submit|validate/i, commands: ['fetch', 'send'] },
  { pattern: /class|css|style/i, commands: ['toggle', 'add', 'remove'] },
];

function suggestCommand(task: string): { content: Array<{ type: string; text: string }> } {
  const suggestions: CommandSuggestion[] = [];

  for (const { pattern, commands } of TASK_PATTERNS) {
    if (pattern.test(task)) {
      for (const cmd of commands) {
        const cmdSuggestions = COMMAND_SUGGESTIONS[cmd];
        if (cmdSuggestions) {
          suggestions.push(...cmdSuggestions);
        }
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  const unique = suggestions.filter(s => {
    if (seen.has(s.command)) return false;
    seen.add(s.command);
    return true;
  });

  if (unique.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              suggestions: [],
              message: 'No specific command matched. Try describing your task more specifically.',
              availableCommands: VALID_COMMANDS,
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
        text: JSON.stringify({ suggestions: unique, task }, null, 2),
      },
    ],
  };
}

// =============================================================================
// Code Fixes
// =============================================================================

function getCodeFixes(
  errorCode: string | undefined,
  listAll: boolean
): { content: Array<{ type: string; text: string }>; isError?: boolean } {
  if (listAll) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              fixableErrors: Object.keys(ERROR_FIXES),
              totalFixes: Object.values(ERROR_FIXES).flat().length,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (!errorCode) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: 'Provide errorCode or set listAll=true' }, null, 2),
        },
      ],
      isError: true,
    };
  }

  const fixes = ERROR_FIXES[errorCode];
  if (!fixes) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: `No fixes for error code: ${errorCode}`,
              availableCodes: Object.keys(ERROR_FIXES),
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
        text: JSON.stringify({ errorCode, fixes }, null, 2),
      },
    ],
  };
}

// =============================================================================
// Helpers
// =============================================================================

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function findClosestCommand(
  word: string,
  commands: string[]
): { command: string; distance: number } | null {
  let closest: { command: string; distance: number } | null = null;
  for (const cmd of commands) {
    const dist = levenshteinDistance(word, cmd);
    if (dist <= 2 && (!closest || dist < closest.distance)) {
      closest = { command: cmd, distance: dist };
    }
  }
  return closest;
}
