/**
 * Analysis Tools
 *
 * Code analysis capabilities using @hyperfixi/core/ast-utils.
 * These tools help LLMs understand hyperscript code structure and quality.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// =============================================================================
// Tool Definitions
// =============================================================================

export const analysisTools: Tool[] = [
  {
    name: 'analyze_complexity',
    description:
      'Calculate code complexity metrics (cyclomatic, cognitive, Halstead) for hyperscript',
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
  {
    name: 'analyze_metrics',
    description:
      'Perform comprehensive code analysis including patterns, code smells, and quality metrics',
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
  {
    name: 'explain_code',
    description: 'Generate natural language explanation of hyperscript code',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The hyperscript code to explain',
        },
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
    description: 'Analyze hyperscript code to understand its purpose and classify common patterns',
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
// Tool Handlers
// =============================================================================

export async function handleAnalysisTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  // Phase 7: Validate required parameters first
  const code = args.code as string;
  if (!code || typeof code !== 'string') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: 'Missing required parameter: code',
              received: args,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  // Try to import ast-utils from core, but don't fail if unavailable
  let astToolkit: any = null;
  try {
    astToolkit = await import('@hyperfixi/core/ast-utils');
  } catch {
    // core/ast-utils not available - will use fallback functions
  }

  try {
    switch (name) {
      case 'analyze_complexity': {
        // Use fallback if core/ast-utils unavailable
        if (!astToolkit) {
          return simpleAnalysis(code, 'complexity');
        }
        // Parse code to AST first
        const ast = await parseHyperscript(code);
        if (!ast) {
          return simpleAnalysis(code, 'complexity');
        }
        const complexity = astToolkit.calculateComplexity(ast);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  cyclomatic: complexity.cyclomatic,
                  cognitive: complexity.cognitive,
                  halstead: complexity.halstead,
                  summary: `Cyclomatic: ${complexity.cyclomatic}, Cognitive: ${complexity.cognitive}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'analyze_metrics': {
        // Use fallback if core/ast-utils unavailable
        if (!astToolkit) {
          return simpleAnalysis(code, 'metrics');
        }
        const ast = await parseHyperscript(code);
        if (!ast) {
          return simpleAnalysis(code, 'metrics');
        }
        const metrics = astToolkit.analyzeMetrics(ast);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  complexity: metrics.complexity,
                  patterns: metrics.patterns,
                  smells: metrics.smells,
                  summary: `Found ${metrics.patterns?.length || 0} patterns, ${metrics.smells?.length || 0} code smells`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'explain_code': {
        const audience = (args.audience as string) || 'intermediate';
        const detail = (args.detail as string) || 'detailed';
        // Use fallback if core/ast-utils unavailable or explainCode not exported
        if (!astToolkit || typeof astToolkit.explainCode !== 'function') {
          return simpleExplanation(code, audience, detail);
        }
        const ast = await parseHyperscript(code);
        if (!ast) {
          return simpleExplanation(code, audience, detail);
        }
        const explanation = astToolkit.explainCode(ast, { audience, detail });
        return {
          content: [{ type: 'text', text: JSON.stringify(explanation, null, 2) }],
        };
      }

      case 'recognize_intent': {
        // Use fallback if core/ast-utils unavailable or recognizeIntent not exported
        if (!astToolkit || typeof astToolkit.recognizeIntent !== 'function') {
          return simpleIntentRecognition(code);
        }
        const intent = astToolkit.recognizeIntent(code);
        return {
          content: [{ type: 'text', text: JSON.stringify(intent, null, 2) }],
        };
      }

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
              code,
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
// Helpers
// =============================================================================

async function parseHyperscript(code: string): Promise<any> {
  try {
    const core = await import('@hyperfixi/core');
    if (core.parse) {
      return await core.parse(code);
    }
  } catch {
    // Core not available, fall back to simple analysis
  }
  return null;
}

function simpleAnalysis(
  code: string,
  type: 'complexity' | 'metrics'
): { content: Array<{ type: string; text: string }> } {
  // Simple regex-based analysis when core/ast-utils isn't available
  const lines = code.split('\n').length;
  const commands = code.match(/\b(toggle|add|remove|show|hide|set|put|fetch|wait|send)\b/gi) || [];
  const conditionals = code.match(/\b(if|else|unless)\b/gi) || [];
  const loops = code.match(/\b(repeat|for|while)\b/gi) || [];

  const result = {
    lines,
    commandCount: commands.length,
    commands: [...new Set(commands.map(c => c.toLowerCase()))],
    conditionalCount: conditionals.length,
    loopCount: loops.length,
    estimatedComplexity: 1 + conditionals.length + loops.length,
    note: 'Simple analysis (full AST analysis requires @hyperfixi/core)',
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}

function simpleExplanation(
  code: string,
  audience: string,
  detail: string
): { content: Array<{ type: string; text: string }> } {
  // Generate explanation based on pattern matching with matchAll for all occurrences
  const parts: string[] = [];

  // Detect event handler(s)
  for (const eventMatch of code.matchAll(/on\s+(\w+)/gi)) {
    parts.push(`This code runs when a ${eventMatch[1]} event occurs.`);
  }

  // Command patterns - use matchAll to find all occurrences
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

  // Detect control flow
  if (/\bif\b/i.test(code)) {
    parts.push('It includes conditional logic.');
  }
  if (/\brepeat\b|\bfor\s+each\b/i.test(code)) {
    parts.push('It includes a loop.');
  }

  if (parts.length === 0) {
    parts.push('This is hyperscript code that adds interactivity to an element.');
  }

  // Adjust based on detail level
  let overview = parts.join(' ');
  if (detail === 'brief' && parts.length > 3) {
    overview = parts.slice(0, 3).join(' ') + ' ...and more.';
  } else if (detail === 'comprehensive') {
    // Add more context for comprehensive
    const commandCount = (code.match(/\bthen\b/gi) || []).length + 1;
    if (commandCount > 1) {
      overview = `This is a ${commandCount}-step script. ` + overview;
    }
  }

  // Adjust language based on audience
  if (audience === 'beginner') {
    overview = overview.replace(/toggles/g, 'switches on/off');
    overview = overview.replace(/fetches/g, 'retrieves data');
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            overview,
            audience,
            detail,
            code,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Phase 7: Simple pattern-based intent recognition as fallback.
 * Detects common hyperscript patterns without full AST analysis.
 */
function simpleIntentRecognition(code: string): { content: Array<{ type: string; text: string }> } {
  const intents: string[] = [];
  const confidence: Record<string, number> = {};

  // Event handling
  if (
    /on\s+(click|submit|change|input|keydown|keyup|keypress|load|scroll|mouseenter|mouseleave|focus|blur)/i.test(
      code
    )
  ) {
    intents.push('event-handling');
    confidence['event-handling'] = 0.9;
  }

  // DOM manipulation
  if (/\b(toggle|add|remove|show|hide)\b/i.test(code)) {
    intents.push('dom-manipulation');
    confidence['dom-manipulation'] = 0.85;
  }

  // Data fetching
  if (/\b(fetch|get|post)\b/i.test(code)) {
    intents.push('data-fetching');
    confidence['data-fetching'] = 0.85;
  }

  // Form handling
  if (/\b(submit|validate|form|input)\b/i.test(code)) {
    intents.push('form-handling');
    confidence['form-handling'] = 0.7;
  }

  // Animation
  if (/\b(transition|animate|settle|wait)\b/i.test(code)) {
    intents.push('animation');
    confidence['animation'] = 0.75;
  }

  // State management
  if (/\b(set|put|increment|decrement)\b/i.test(code)) {
    intents.push('state-management');
    confidence['state-management'] = 0.8;
  }

  // Navigation
  if (/\b(go\s+to|navigate|redirect)\b/i.test(code)) {
    intents.push('navigation');
    confidence['navigation'] = 0.8;
  }

  // Default if no patterns matched
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
            note: 'Pattern-based analysis (full intent recognition requires @hyperfixi/core)',
          },
          null,
          2
        ),
      },
    ],
  };
}
