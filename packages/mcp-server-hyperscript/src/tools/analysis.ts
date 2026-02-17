/**
 * Analysis Tools for original _hyperscript
 *
 * Pattern-based code analysis — complexity, explanation, intent recognition.
 * No external dependencies.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// =============================================================================
// Tool Definitions
// =============================================================================

export const analysisTools: Tool[] = [
  {
    name: 'analyze_complexity',
    description:
      'Estimate code complexity metrics for _hyperscript code (commands, conditionals, loops)',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'The hyperscript code to analyze' },
      },
      required: ['code'],
    },
  },
  {
    name: 'explain_code',
    description: 'Generate a natural language explanation of _hyperscript code',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'The hyperscript code to explain' },
        audience: {
          type: 'string',
          enum: ['beginner', 'intermediate', 'expert'],
          description: 'Target audience level',
        },
        detail: {
          type: 'string',
          enum: ['brief', 'detailed', 'comprehensive'],
          description: 'Level of detail',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'recognize_intent',
    description:
      'Classify the purpose of _hyperscript code (event-handling, dom-manipulation, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'The hyperscript code to analyze' },
      },
      required: ['code'],
    },
  },
];

// =============================================================================
// Tool Handlers
// =============================================================================

export async function handleAnalysisTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
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

  try {
    switch (name) {
      case 'analyze_complexity':
        return analyzeComplexity(code);
      case 'explain_code':
        return explainCode(
          code,
          (args.audience as string) || 'intermediate',
          (args.detail as string) || 'detailed'
        );
      case 'recognize_intent':
        return recognizeIntent(code);
      default:
        return {
          content: [{ type: 'text', text: `Unknown analysis tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: `Error in ${name}`,
              message: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}

// =============================================================================
// Complexity Analysis
// =============================================================================

function analyzeComplexity(code: string): { content: Array<{ type: string; text: string }> } {
  const lines = code.split('\n').length;
  const commands =
    code.match(
      /\b(toggle|add|remove|show|hide|set|put|fetch|wait|send|trigger|call|log|increment|decrement|append|take|go|focus|transition)\b/gi
    ) || [];
  const conditionals = code.match(/\b(if|else|unless)\b/gi) || [];
  const loops = code.match(/\b(repeat|for|while)\b/gi) || [];
  const events = code.match(/\bon\s+\w+/gi) || [];

  const estimatedCyclomatic = 1 + conditionals.length + loops.length;
  const estimatedCognitive = conditionals.length + loops.length * 2;

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            lines,
            commandCount: commands.length,
            uniqueCommands: [...new Set(commands.map(c => c.toLowerCase()))],
            conditionalCount: conditionals.length,
            loopCount: loops.length,
            eventHandlerCount: events.length,
            estimatedCyclomatic,
            estimatedCognitive,
            summary: `${lines} lines, ${commands.length} commands, cyclomatic ~${estimatedCyclomatic}, cognitive ~${estimatedCognitive}`,
          },
          null,
          2
        ),
      },
    ],
  };
}

// =============================================================================
// Code Explanation
// =============================================================================

function explainCode(
  code: string,
  audience: string,
  detail: string
): { content: Array<{ type: string; text: string }> } {
  const parts: string[] = [];

  // Detect event handlers
  for (const eventMatch of code.matchAll(/on\s+(\w+)/gi)) {
    parts.push(`This code runs when a ${eventMatch[1]} event occurs.`);
  }

  // Command patterns
  const commandPatterns: Array<{ pattern: RegExp; format: (m: RegExpMatchArray) => string }> = [
    { pattern: /toggle\s+([.\w#@-]+)/gi, format: m => `It toggles ${m[1]}.` },
    {
      pattern: /add\s+([.\w#@-]+)(?:\s+to\s+([^\s]+))?/gi,
      format: m => (m[2] ? `It adds ${m[1]} to ${m[2]}.` : `It adds ${m[1]}.`),
    },
    {
      pattern: /remove\s+([.\w#@-]+)(?:\s+from\s+([^\s]+))?/gi,
      format: m => (m[2] ? `It removes ${m[1]} from ${m[2]}.` : `It removes ${m[1]}.`),
    },
    { pattern: /set\s+([^\s]+)\s+to\s+([^\s]+)/gi, format: m => `It sets ${m[1]} to ${m[2]}.` },
    { pattern: /put\s+([^\s]+)\s+into\s+([^\s]+)/gi, format: m => `It puts ${m[1]} into ${m[2]}.` },
    {
      pattern: /fetch\s+([^\s]+)(?:\s+as\s+(\w+))?/gi,
      format: m => (m[2] ? `It fetches from ${m[1]} as ${m[2]}.` : `It fetches from ${m[1]}.`),
    },
    {
      pattern: /wait\s+(\d+\s*(?:ms|s|seconds?|milliseconds?))/gi,
      format: m => `It waits ${m[1]}.`,
    },
    { pattern: /send\s+(\w+)/gi, format: m => `It sends a ${m[1]} event.` },
    { pattern: /call\s+([^\s(]+)/gi, format: m => `It calls ${m[1]}.` },
    { pattern: /show\s+([^\s]+)/gi, format: m => `It shows ${m[1]}.` },
    { pattern: /hide\s+([^\s]+)/gi, format: m => `It hides ${m[1]}.` },
    { pattern: /log\s+([^\s]+)/gi, format: m => `It logs ${m[1]}.` },
    { pattern: /increment\s+([^\s]+)/gi, format: m => `It increments ${m[1]}.` },
    { pattern: /decrement\s+([^\s]+)/gi, format: m => `It decrements ${m[1]}.` },
  ];

  for (const { pattern, format } of commandPatterns) {
    for (const match of code.matchAll(pattern)) {
      parts.push(format(match));
    }
  }

  if (/\bif\b/i.test(code)) parts.push('It includes conditional logic.');
  if (/\brepeat\b|\bfor\s+each\b/i.test(code)) parts.push('It includes a loop.');

  if (parts.length === 0) {
    parts.push('This is hyperscript code that adds interactivity to an element.');
  }

  let overview = parts.join(' ');
  if (detail === 'brief' && parts.length > 3) {
    overview = parts.slice(0, 3).join(' ') + ' ...and more.';
  } else if (detail === 'comprehensive') {
    const commandCount = (code.match(/\bthen\b/gi) || []).length + 1;
    if (commandCount > 1) {
      overview = `This is a ${commandCount}-step script. ` + overview;
    }
  }

  if (audience === 'beginner') {
    overview = overview.replace(/toggles/g, 'switches on/off');
    overview = overview.replace(/fetches/g, 'retrieves data');
  }

  return {
    content: [
      { type: 'text', text: JSON.stringify({ overview, audience, detail, code }, null, 2) },
    ],
  };
}

// =============================================================================
// Intent Recognition
// =============================================================================

function recognizeIntent(code: string): { content: Array<{ type: string; text: string }> } {
  const intents: string[] = [];
  const confidence: Record<string, number> = {};

  if (
    /on\s+(click|submit|change|input|keydown|keyup|load|scroll|mouseenter|mouseleave|focus|blur)/i.test(
      code
    )
  ) {
    intents.push('event-handling');
    confidence['event-handling'] = 0.9;
  }
  if (/\b(toggle|add|remove|show|hide)\b/i.test(code)) {
    intents.push('dom-manipulation');
    confidence['dom-manipulation'] = 0.85;
  }
  if (/\b(fetch|get|post)\b/i.test(code)) {
    intents.push('data-fetching');
    confidence['data-fetching'] = 0.85;
  }
  if (/\b(submit|validate|form|input)\b/i.test(code)) {
    intents.push('form-handling');
    confidence['form-handling'] = 0.7;
  }
  if (/\b(transition|animate|wait)\b/i.test(code)) {
    intents.push('animation');
    confidence['animation'] = 0.75;
  }
  if (/\b(set|put|increment|decrement)\b/i.test(code)) {
    intents.push('state-management');
    confidence['state-management'] = 0.8;
  }
  if (/\b(go\s+to|navigate|redirect)\b/i.test(code)) {
    intents.push('navigation');
    confidence['navigation'] = 0.8;
  }
  if (intents.length === 0) {
    intents.push('general-interactivity');
    confidence['general-interactivity'] = 0.5;
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            primaryIntent: intents[0],
            allIntents: intents,
            confidence,
            code,
          },
          null,
          2
        ),
      },
    ],
  };
}
