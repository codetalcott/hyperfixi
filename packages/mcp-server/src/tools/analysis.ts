/**
 * Analysis Tools
 *
 * Code analysis capabilities using @hyperfixi/core/ast-utils.
 * These tools help LLMs understand hyperscript code structure and quality.
 *
 * The trees come from @lokascript/semantic: its interchange nodes (cyclomatic and
 * cognitive complexity, counted on `if` / `while` / `for each`) and its AST builder's
 * tree (Halstead, patterns, smells). Until Phase C4 both came from @hyperfixi/core's
 * parse, whose analyzer counted every comparison as a decision.
 */

import type { Tool } from '@modelcontextprotocol/server';

// =============================================================================
// Tool Definitions
// =============================================================================

export const analysisTools: Tool[] = [
  {
    name: 'analyze_complexity',
    description:
      'Calculate numeric complexity scores for hyperscript: cyclomatic, cognitive, and Halstead metrics. Use for code review when deciding if code is too complex.',
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
      'Detect code smells and quality issues in hyperscript. Returns patterns, problems (too many commands, missing error handling), and quality scores. More detailed than analyze_complexity.',
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
    description:
      'Generate a plain English explanation of hyperscript code for humans. Use when a user asks "what does this code do?" Supports beginner/intermediate/expert audience levels.',
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
    description:
      'Classify what hyperscript code does: returns intent labels (dom-manipulation, form-handling, data-fetching, animation, etc.) with confidence scores. Use to categorize code purpose, not measure quality.',
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
        const trees = await parseHyperscript(code);
        if (!trees) {
          return simpleAnalysis(code, 'complexity');
        }
        const complexity = complexityOf(astToolkit, trees);
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
        const trees = await parseHyperscript(code);
        if (!trees) {
          return simpleAnalysis(code, 'metrics');
        }
        const metrics = {
          ...astToolkit.analyzeMetrics(trees.ast),
          complexity: complexityOf(astToolkit, trees),
        };
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
        // From the parse; the keyword scan only for code that does not parse. (Core's
        // ast-utils lost its explainCode, so the scan answered every call until 7.2.0.)
        return (
          (await explainFromParse(code, audience, detail)) ??
          simpleExplanation(code, audience, detail)
        );
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

/** English hyperscript as semantic reads it: the AST builder's tree and its interchange nodes. */
async function parseHyperscript(code: string): Promise<{ ast: any; nodes: any[] } | null> {
  try {
    const semantic: any = await import('@lokascript/semantic');
    const node = semantic.parseSemantic(code, 'en')?.node;
    const ast = node ? semantic.buildAST(node)?.ast : null;
    if (!ast) return null;
    const converted = semantic.fromSemanticAST(ast);
    const nodes = (Array.isArray(converted) ? converted : [converted]).filter(
      (n: { type?: string }) => n?.type !== 'error'
    );
    return { ast, nodes };
  } catch {
    // semantic not available, or it cannot read the code: fall back to simple analysis
    return null;
  }
}

/**
 * Cyclomatic and cognitive complexity of a program: one entry path plus each top-level
 * feature's decision points, and the sum of their nesting-weighted decisions. Halstead from
 * the AST builder's tree.
 */
function complexityOf(
  astToolkit: any,
  trees: { ast: any; nodes: any[] }
): { cyclomatic: number; cognitive: number; halstead: unknown } {
  let cyclomatic = 1;
  let cognitive = 0;
  for (const node of trees.nodes) {
    cyclomatic += astToolkit.calculateCyclomatic(node) - 1;
    cognitive += astToolkit.calculateCognitive(node);
  }
  return { cyclomatic, cognitive, halstead: astToolkit.calculateComplexity(trees.ast).halstead };
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
    note: 'Simple analysis (@lokascript/semantic could not read the code)',
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}

/** One step of a parsed script, in the order it runs. */
interface ExplainedStep {
  /** The step as the engine reads it: the parse rendered back to English. */
  code: string;
  /** What the command does, from its schema. */
  does?: string;
  /** The roles it fills, with each role's meaning. */
  roles?: Array<{ role: string; value: string; meaning?: string }>;
  /** A block's commands (an `if`'s, when its condition holds). */
  body?: ExplainedStep[];
  /** An `if`'s commands when its condition does not hold. */
  otherwise?: ExplainedStep[];
}

/**
 * Explain code from its semantic parse: each step in the order it runs, rendered back to English,
 * with its command's documented description. null when the code does not parse. (It replaced
 * a keyword scan that listed commands by kind, not by order: toggle → wait → add came out
 * "toggles … adds … waits", without `toggle`'s target.)
 */
async function explainFromParse(
  code: string,
  audience: string,
  detail: string
): Promise<{ content: Array<{ type: string; text: string }> } | null> {
  let semantic: any;
  try {
    semantic = await import('@lokascript/semantic');
  } catch {
    return null;
  }
  const result = semantic.parseSemantic(code, 'en');
  if (!result?.node) return null;

  const options = {
    withRoles: detail === 'comprehensive' || audience === 'beginner',
    withDoes: !(audience === 'expert' && detail !== 'comprehensive'),
  };
  const steps = explainNodes(semantic, [result.node], options);
  const unread = ((result.node.diagnostics ?? []) as Array<{ code?: string; message?: string }>)
    .filter(d => d.code === 'unconsumed-input' || d.code === 'verbatim-clause')
    .map(d => d.message);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            overview: overviewOf(steps),
            ...(detail === 'brief' ? {} : { steps }),
            ...(unread.length > 0 && {
              note: `Part of the code did not parse, so it is not explained: ${unread.join('; ')}. validate_and_compile shows why.`,
            }),
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

function explainNodes(
  semantic: any,
  nodes: any[],
  options: { withRoles: boolean; withDoes: boolean }
): ExplainedStep[] {
  const steps: ExplainedStep[] = [];
  for (const node of nodes) {
    if (!node) continue;
    if (node.kind === 'compound') {
      steps.push(...explainNodes(semantic, node.statements ?? [], options));
      continue;
    }
    const isBlock = Array.isArray(node.body) || Array.isArray(node.thenBranch);
    const step: ExplainedStep = {
      code: isBlock ? blockHeader(semantic, node) : rendered(semantic, node),
    };
    const schema = semantic.commandSchemas?.[node.action];
    if (options.withDoes) {
      const event = valueText(node.roles?.get?.('event'));
      const does =
        node.kind === 'event-handler' && event
          ? `Runs each time a ${event} event fires.`
          : schema?.description;
      if (does) step.does = does;
    }
    if (options.withRoles && node.roles?.size) {
      step.roles = [...node.roles.entries()].flatMap(([role, value]: [string, unknown]) => {
        const text = valueText(value);
        if (text === undefined) return [];
        const meaning = schema?.roles?.find((r: { role: string }) => r.role === role)?.description;
        return [{ role, value: text, ...(meaning && { meaning }) }];
      });
    }
    if (Array.isArray(node.thenBranch)) {
      step.body = explainNodes(semantic, node.thenBranch, options);
      if (Array.isArray(node.elseBranch) && node.elseBranch.length > 0) {
        step.otherwise = explainNodes(semantic, node.elseBranch, options);
      }
    } else if (Array.isArray(node.body)) {
      step.body = explainNodes(semantic, node.body, options);
    }
    steps.push(step);
  }
  return steps;
}

function rendered(semantic: any, node: any): string {
  try {
    return semantic.render(node, 'en');
  } catch {
    return String(node.action ?? node.kind);
  }
}

/** A block's first line: `on click`, `if I match .x`, `repeat 3 times`. */
function blockHeader(semantic: any, node: any): string {
  const empty = { ...node, body: [], statements: [], thenBranch: [], elseBranch: undefined };
  return rendered(semantic, empty).replace(/\s+(?:then\s+)?end$/, '');
}

function valueText(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as {
    raw?: unknown;
    value?: unknown;
    type?: string;
    object?: unknown;
    property?: unknown;
  };
  if (typeof v.raw === 'string') return v.raw;
  if (['string', 'number', 'boolean'].includes(typeof v.value)) return String(v.value);
  if (v.type === 'property-path' && typeof v.property === 'string') {
    const owner = valueText(v.object);
    return owner ? `${owner}'s ${v.property}` : v.property;
  }
  return undefined;
}

/** The steps in one or two sentences, naming each command in order. */
function overviewOf(steps: ExplainedStep[]): string {
  const sequence = (list: ExplainedStep[]): string =>
    list.length === 0
      ? 'nothing it could parse'
      : list
          .map(s => {
            if (!s.body) return `\`${s.code}\``;
            const otherwise = s.otherwise ? `; otherwise ${sequence(s.otherwise)}` : '';
            return `\`${s.code}\` (${sequence(s.body)}${otherwise})`;
          })
          .join(', then ');
  if (steps.every(s => !s.body)) return `It runs ${sequence(steps)}.`;
  return steps
    .map(s => {
      if (!s.body) return `It runs \`${s.code}\`.`;
      const otherwise = s.otherwise ? `; otherwise ${sequence(s.otherwise)}` : '';
      return `\`${s.code}\` runs ${sequence(s.body)}${otherwise}.`;
    })
    .join(' ');
}

/** For code that does not parse: a keyword scan, sentences in source order. */
function simpleExplanation(
  code: string,
  audience: string,
  detail: string
): { content: Array<{ type: string; text: string }> } {
  // Sentences keyed by where their match starts, so they come out in source order.
  const found: Array<{ at: number; text: string }> = [];

  // Detect event handler(s): `on` where a handler starts, not the `on` of `toggle .x on #el`
  for (const eventMatch of code.matchAll(/(?:^|\n|\bend\s+)\s*on\s+(\w+)/gi)) {
    found.push({
      at: eventMatch.index ?? 0,
      text: `This code runs when a ${eventMatch[1]} event occurs.`,
    });
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
      found.push({ at: match.index ?? 0, text: format(match) });
    }
  }
  const parts = found.sort((a, b) => a.at - b.at).map(f => f.text);

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
            note: 'The code did not parse, so this is a keyword scan, not an explanation of what runs. validate_and_compile shows why it did not parse.',
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
            note: 'Pattern-based analysis',
          },
          null,
          2
        ),
      },
    ],
  };
}
