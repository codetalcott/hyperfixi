/**
 * Validation Tools
 *
 * Hyperscript syntax validation and development assistance.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// =============================================================================
// Tool Definitions
// =============================================================================

export const validationTools: Tool[] = [
  {
    name: 'validate_hyperscript',
    description: 'Validate hyperscript syntax and return any errors',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The hyperscript code to validate',
        },
        language: {
          type: 'string',
          description: 'Language code if not English',
          default: 'en',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'suggest_command',
    description: 'Suggest the best hyperscript command for a task',
    inputSchema: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description: 'Description of what you want to do',
        },
      },
      required: ['task'],
    },
  },
  {
    name: 'get_bundle_config',
    description: 'Get recommended vite-plugin configuration based on usage',
    inputSchema: {
      type: 'object',
      properties: {
        commands: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of commands used',
        },
        blocks: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of block commands used (if, repeat, for, etc.)',
        },
        languages: {
          type: 'array',
          items: { type: 'string' },
          description: 'Languages used',
        },
        positional: {
          type: 'boolean',
          description: 'Whether positional expressions are used (first, last, next, etc.)',
        },
      },
    },
  },
];

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
        const language = (args.language as string) || 'en';
        return validateHyperscript(code, language);
      }

      case 'suggest_command': {
        const task = args.task as string;
        return suggestCommand(task);
      }

      case 'get_bundle_config': {
        const commands = (args.commands as string[]) || [];
        const blocks = (args.blocks as string[]) || [];
        const languages = (args.languages as string[]) || ['en'];
        const positional = (args.positional as boolean) || false;
        return getBundleConfig(commands, blocks, languages, positional);
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

function validateHyperscript(
  code: string,
  language: string
): { content: Array<{ type: string; text: string }>; isError?: boolean } {
  const errors: Array<{ message: string; suggestion?: string }> = [];
  const warnings: Array<{ message: string; suggestion?: string }> = [];

  // Basic syntax checks
  const lines = code.split('\n');

  // Check for common issues
  if (code.includes('onclick') || code.includes('onClick')) {
    errors.push({
      message: 'Use hyperscript event syntax instead of onclick attribute',
      suggestion: 'Replace onclick="..." with _="on click ..."',
    });
  }

  // Check for unbalanced quotes
  const singleQuotes = (code.match(/'/g) || []).length;
  const doubleQuotes = (code.match(/"/g) || []).length;
  if (singleQuotes % 2 !== 0) {
    errors.push({ message: 'Unbalanced single quotes' });
  }
  if (doubleQuotes % 2 !== 0) {
    errors.push({ message: 'Unbalanced double quotes' });
  }

  // Check for unclosed blocks
  const ifCount = (code.match(/\bif\b/gi) || []).length;
  const endCount = (code.match(/\bend\b/gi) || []).length;
  if (ifCount > endCount) {
    warnings.push({
      message: `Found ${ifCount} 'if' statements but only ${endCount} 'end' keywords`,
      suggestion: 'Add missing end keywords or use inline if syntax',
    });
  }

  // Check for valid event handlers
  const eventMatch = code.match(/on\s+(\w+)/gi);
  if (eventMatch) {
    const validEvents = [
      'click', 'dblclick', 'mouseenter', 'mouseleave', 'mouseover', 'mouseout',
      'mousedown', 'mouseup', 'mousemove',
      'keydown', 'keyup', 'keypress',
      'focus', 'blur', 'focusin', 'focusout',
      'input', 'change', 'submit', 'reset',
      'load', 'unload', 'scroll', 'resize',
      'touchstart', 'touchend', 'touchmove',
      'dragstart', 'dragend', 'drag', 'drop',
      'intersection', 'mutation',
      'every', // timer
    ];
    for (const match of eventMatch) {
      const event = match.replace(/on\s+/i, '').toLowerCase();
      if (!validEvents.includes(event) && !event.includes('.')) {
        warnings.push({
          message: `Unknown event type: ${event}`,
          suggestion: `Did you mean one of: ${validEvents.slice(0, 5).join(', ')}...?`,
        });
      }
    }
  }

  // Check for valid commands
  const validCommands = [
    'toggle', 'add', 'remove', 'show', 'hide',
    'set', 'get', 'put', 'append', 'prepend',
    'increment', 'decrement', 'log', 'send', 'trigger',
    'wait', 'fetch', 'call', 'go', 'focus', 'blur',
    'return', 'break', 'continue', 'exit', 'halt', 'throw',
    'transition', 'settle', 'measure', 'take',
  ];

  const commandMatches = code.match(/\b(toggle|add|remove|show|hide|set|get|put|append|prepend|increment|decrement|log|send|trigger|wait|fetch|call|go|focus|blur|return|break|continue|exit|halt|throw|transition|settle|measure|take)\b/gi);

  // Validate command usage patterns
  if (code.includes('toggle') && !code.includes('.') && !code.includes('@')) {
    warnings.push({
      message: 'toggle command typically needs a class (.class) or attribute (@attr)',
      suggestion: 'Example: toggle .active or toggle @disabled',
    });
  }

  const result = {
    valid: errors.length === 0,
    errors,
    warnings,
    code,
    language,
    commandsFound: commandMatches ? [...new Set(commandMatches.map(c => c.toLowerCase()))] : [],
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    isError: errors.length > 0,
  };
}

// =============================================================================
// Command Suggestion
// =============================================================================

const COMMAND_SUGGESTIONS: Record<string, { command: string; example: string; description: string }> = {
  'toggle': { command: 'toggle', example: 'toggle .active', description: 'Toggle a class, attribute, or visibility' },
  'add': { command: 'add', example: 'add .highlight to me', description: 'Add a class, attribute, or style' },
  'remove': { command: 'remove', example: 'remove .error from #form', description: 'Remove a class, attribute, or element' },
  'show': { command: 'show', example: 'show #modal with *opacity', description: 'Show a hidden element' },
  'hide': { command: 'hide', example: 'hide me with *opacity', description: 'Hide an element' },
  'set': { command: 'set', example: 'set :count to 0', description: 'Set a variable or property' },
  'put': { command: 'put', example: 'put "Hello" into #greeting', description: 'Set element content' },
  'fetch': { command: 'fetch', example: 'fetch /api as json', description: 'Make HTTP request' },
  'wait': { command: 'wait', example: 'wait 500ms', description: 'Pause execution' },
  'send': { command: 'send', example: 'send refresh to #list', description: 'Dispatch custom event' },
  'go': { command: 'go', example: 'go to /page', description: 'Navigate to URL' },
  'increment': { command: 'increment', example: 'increment :count', description: 'Add 1 to a number' },
  'decrement': { command: 'decrement', example: 'decrement :count', description: 'Subtract 1 from a number' },
  'focus': { command: 'focus', example: 'focus #input', description: 'Focus an element' },
  'call': { command: 'call', example: 'call myFunction()', description: 'Call a JavaScript function' },
  'log': { command: 'log', example: 'log me', description: 'Log to console' },
};

const TASK_KEYWORDS: Record<string, string[]> = {
  'toggle': ['toggle', 'switch', 'flip', 'alternate', 'on/off', 'open/close'],
  'add': ['add', 'insert', 'include', 'attach', 'apply', 'highlight'],
  'remove': ['remove', 'delete', 'clear', 'erase', 'detach'],
  'show': ['show', 'display', 'reveal', 'appear', 'visible', 'open', 'popup', 'modal'],
  'hide': ['hide', 'conceal', 'invisible', 'close', 'dismiss'],
  'set': ['set', 'assign', 'store', 'save', 'update', 'change', 'variable'],
  'put': ['put', 'content', 'text', 'html', 'innerHTML', 'display text'],
  'fetch': ['fetch', 'api', 'ajax', 'request', 'http', 'load data', 'get data', 'post'],
  'wait': ['wait', 'delay', 'pause', 'sleep', 'timeout', 'after'],
  'send': ['send', 'emit', 'dispatch', 'event', 'trigger', 'notify'],
  'go': ['go', 'navigate', 'redirect', 'link', 'url', 'page'],
  'increment': ['increment', 'increase', 'count up', 'add 1', 'plus'],
  'decrement': ['decrement', 'decrease', 'count down', 'subtract', 'minus'],
  'focus': ['focus', 'select', 'cursor', 'active element'],
  'call': ['call', 'execute', 'run', 'invoke', 'function'],
  'log': ['log', 'debug', 'console', 'print', 'output'],
};

function suggestCommand(task: string): { content: Array<{ type: string; text: string }> } {
  const taskLower = task.toLowerCase();
  const matches: Array<{ command: string; score: number; suggestion: typeof COMMAND_SUGGESTIONS[string] }> = [];

  for (const [command, keywords] of Object.entries(TASK_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (taskLower.includes(keyword)) {
        score += keyword.length; // Longer matches score higher
      }
    }
    if (score > 0) {
      matches.push({
        command,
        score,
        suggestion: COMMAND_SUGGESTIONS[command],
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);

  if (matches.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              task,
              suggestions: Object.values(COMMAND_SUGGESTIONS).slice(0, 5),
              note: 'No exact match found. Here are common commands.',
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
            task,
            bestMatch: matches[0].suggestion,
            alternatives: matches.slice(1, 4).map((m) => m.suggestion),
          },
          null,
          2
        ),
      },
    ],
  };
}

// =============================================================================
// Bundle Configuration
// =============================================================================

function getBundleConfig(
  commands: string[],
  blocks: string[],
  languages: string[],
  positional: boolean
): { content: Array<{ type: string; text: string }> } {
  // Determine recommended bundle
  let bundle = 'hyperfixi-lite.js'; // 1.9 KB
  let bundleSize = '1.9 KB';

  if (blocks.length > 0 || positional) {
    bundle = 'hyperfixi-hybrid-complete.js'; // 6.7 KB
    bundleSize = '6.7 KB';
  }

  if (languages.length > 1 || languages.some((l) => l !== 'en')) {
    bundle = 'hyperfixi-multilingual.js'; // 250 KB
    bundleSize = '250 KB';
  }

  // Generate vite config
  const viteConfig = {
    plugins: [
      `hyperfixi({
  extraCommands: ${JSON.stringify(commands.filter((c) => !['toggle', 'add', 'remove', 'show', 'hide', 'set', 'put'].includes(c)))},
  extraBlocks: ${JSON.stringify(blocks)},
  positional: ${positional},
  languages: ${JSON.stringify(languages)},
})`,
    ],
  };

  // Regional bundle suggestion
  let regionalBundle = 'browser.global.js';
  if (languages.length === 1 && languages[0] === 'en') {
    regionalBundle = 'browser-en.global.js (20 KB)';
  } else if (languages.every((l) => ['en', 'es', 'pt', 'fr', 'de'].includes(l))) {
    regionalBundle = 'browser-western.global.js (30 KB)';
  } else if (languages.every((l) => ['ja', 'zh', 'ko'].includes(l))) {
    regionalBundle = 'browser-east-asian.global.js (24 KB)';
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            recommendedBundle: bundle,
            estimatedSize: bundleSize,
            viteConfig: `// vite.config.js
import { hyperfixi } from '@hyperfixi/vite-plugin';

export default {
  plugins: [
    ${viteConfig.plugins[0]}
  ]
};`,
            semanticBundle: regionalBundle,
            usage: {
              commands,
              blocks,
              languages,
              positional,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}
