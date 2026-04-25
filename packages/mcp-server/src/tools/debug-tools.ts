/**
 * MCP Debug Tools — AI-assisted debugging for HyperFixi
 *
 * These tools operate on serialized debug state (DebugSnapshot JSON),
 * enabling Claude to inspect execution state, explain behavior,
 * suggest fixes, and trace variable changes.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// =============================================================================
// Tool Definitions
// =============================================================================

export const debugTools: Tool[] = [
  {
    name: 'debug_analyze_snapshot',
    description:
      'Analyze a HyperFixi debug snapshot. Given the current command, element, variables, and execution depth, explains what the command does, what state is available, and predicts what will happen next. Use when a developer is paused in the debugger and wants to understand the current state.',
    inputSchema: {
      type: 'object',
      properties: {
        snapshot: {
          type: 'object',
          description:
            'A DebugSnapshot object: { commandName, element, variables, timestamp, depth, index }',
          properties: {
            commandName: {
              type: 'string',
              description: 'The hyperscript command about to execute',
            },
            element: {
              type: 'string',
              description: 'Description of the target element, e.g. "<button#submit.primary>"',
            },
            variables: {
              type: 'object',
              description:
                'Map of variable names to values (it, result, me, :locals, event.type, etc.)',
            },
            depth: { type: 'number', description: 'Nesting depth (0 = top-level)' },
            index: { type: 'number', description: 'Sequential command index' },
          },
          required: ['commandName'],
        },
      },
      required: ['snapshot'],
    },
  },
  {
    name: 'debug_explain_handler',
    description:
      'Explain a hyperscript event handler step-by-step. Given the full handler code, breaks down what each command does, identifies potential issues (null references, missing elements, type mismatches), and suggests where to set breakpoints for debugging.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description:
            'The full hyperscript event handler code (e.g., "on click toggle .active on me then add .clicked")',
        },
        issue: {
          type: 'string',
          description:
            'Optional description of the problem being debugged (e.g., "the class is not toggling")',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'debug_suggest_fix',
    description:
      'Given a debug snapshot where something went wrong (unexpected variable value, wrong element, error), analyze the state and suggest likely causes and fixes. Combines debug state analysis with hyperscript diagnostics.',
    inputSchema: {
      type: 'object',
      properties: {
        snapshot: {
          type: 'object',
          description: 'The DebugSnapshot at the point of failure',
          properties: {
            commandName: { type: 'string' },
            element: { type: 'string' },
            variables: { type: 'object' },
            depth: { type: 'number' },
            index: { type: 'number' },
          },
          required: ['commandName'],
        },
        expected: {
          type: 'string',
          description:
            'What the developer expected to happen (e.g., "it should be 5 but it is null")',
        },
        error: {
          type: 'string',
          description: 'Error message if an exception occurred',
        },
      },
      required: ['snapshot'],
    },
  },
  {
    name: 'debug_trace_variable',
    description:
      'Given an array of debug snapshots (execution history) and a variable name, trace how that variable changed over time. Shows each step where the variable was modified, its old and new values, and which command caused the change.',
    inputSchema: {
      type: 'object',
      properties: {
        history: {
          type: 'array',
          description: 'Array of DebugSnapshot objects from the execution history',
          items: {
            type: 'object',
            properties: {
              commandName: { type: 'string' },
              variables: { type: 'object' },
              index: { type: 'number' },
            },
          },
        },
        variable: {
          type: 'string',
          description: 'The variable name to trace (e.g., "it", ":count", "me")',
        },
      },
      required: ['history', 'variable'],
    },
  },
];

// =============================================================================
// Tool Handler
// =============================================================================

export async function handleDebugTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case 'debug_analyze_snapshot':
        return analyzeSnapshot(args.snapshot as Record<string, unknown>);

      case 'debug_explain_handler':
        return explainHandler(args.code as string, args.issue as string | undefined);

      case 'debug_suggest_fix':
        return suggestFix(
          args.snapshot as Record<string, unknown>,
          args.expected as string | undefined,
          args.error as string | undefined
        );

      case 'debug_trace_variable':
        return traceVariable(
          args.history as Array<Record<string, unknown>>,
          args.variable as string
        );

      default:
        return {
          content: [{ type: 'text', text: `Unknown debug tool: ${name}` }],
          isError: true,
        };
    }
  } catch (err) {
    return {
      content: [
        {
          type: 'text',
          text: `Debug tool error: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
      isError: true,
    };
  }
}

// =============================================================================
// Implementations
// =============================================================================

function analyzeSnapshot(snapshot: Record<string, unknown>): {
  content: Array<{ type: string; text: string }>;
} {
  const cmd = snapshot.commandName as string;
  const element = snapshot.element as string | null;
  const variables = (snapshot.variables || {}) as Record<string, unknown>;
  const depth = (snapshot.depth as number) || 0;
  const index = (snapshot.index as number) || 0;

  const analysis: string[] = [];

  analysis.push(`## Debug Snapshot Analysis (Step ${index})`);
  analysis.push('');

  // Command explanation
  analysis.push(`**Current Command:** \`${cmd}\``);
  analysis.push(
    `**Nesting Depth:** ${depth} ${depth === 0 ? '(top-level)' : `(${depth} level${depth > 1 ? 's' : ''} deep)`}`
  );

  if (element) {
    analysis.push(`**Target Element:** \`${element}\``);
  }

  // Command-specific insights
  const insight = getCommandInsight(cmd);
  if (insight) {
    analysis.push('');
    analysis.push(`**What this command does:** ${insight}`);
  }

  // Variable state
  const varEntries = Object.entries(variables);
  if (varEntries.length > 0) {
    analysis.push('');
    analysis.push('**Available State:**');
    for (const [name, value] of varEntries) {
      analysis.push(`- \`${name}\` = \`${formatVal(value)}\``);
    }
  }

  // Potential issues
  const warnings = detectIssues(cmd, element, variables);
  if (warnings.length > 0) {
    analysis.push('');
    analysis.push('**Potential Issues:**');
    for (const w of warnings) {
      analysis.push(`- ${w}`);
    }
  }

  return { content: [{ type: 'text', text: analysis.join('\n') }] };
}

function explainHandler(
  code: string,
  issue?: string
): { content: Array<{ type: string; text: string }> } {
  if (!code) {
    return {
      content: [{ type: 'text', text: 'Error: code parameter is required' }],
      isError: true,
    } as any;
  }

  const lines: string[] = [];
  lines.push('## Event Handler Analysis');
  lines.push('');
  lines.push('```hyperscript');
  lines.push(code);
  lines.push('```');
  lines.push('');

  // Split into commands (rough tokenization by "then")
  const commands = code
    .replace(/^on\s+\w+\s*/, '') // Strip event prefix
    .split(/\s+then\s+/)
    .map(c => c.trim())
    .filter(Boolean);

  lines.push('**Step-by-step breakdown:**');
  commands.forEach((cmd, i) => {
    lines.push(`${i + 1}. \`${cmd}\``);
    const insight = getCommandInsightFromCode(cmd);
    if (insight) lines.push(`   ${insight}`);
  });

  // Suggested breakpoints
  lines.push('');
  lines.push('**Suggested breakpoints:**');
  const bpSuggestions = suggestBreakpoints(commands, issue);
  for (const bp of bpSuggestions) {
    lines.push(`- ${bp}`);
  }

  if (issue) {
    lines.push('');
    lines.push(`**Regarding "${issue}":**`);
    lines.push(diagnoseIssue(commands, issue));
  }

  return { content: [{ type: 'text', text: lines.join('\n') }] };
}

function suggestFix(
  snapshot: Record<string, unknown>,
  expected?: string,
  error?: string
): { content: Array<{ type: string; text: string }> } {
  const cmd = snapshot.commandName as string;
  const element = snapshot.element as string | null;
  const variables = (snapshot.variables || {}) as Record<string, unknown>;

  const lines: string[] = [];
  lines.push('## Debug Fix Suggestions');
  lines.push('');
  lines.push(`**Failed at:** \`${cmd}\``);

  if (error) {
    lines.push(`**Error:** ${error}`);
    lines.push('');
    lines.push('**Likely causes:**');
    const causes = diagnosError(cmd, error, variables);
    for (const c of causes) {
      lines.push(`- ${c}`);
    }
  }

  if (expected) {
    lines.push('');
    lines.push(`**Expected:** ${expected}`);
    lines.push('');
    lines.push('**Analysis:**');

    // Check for common mismatches
    if (variables['it'] === null || variables['it'] === undefined) {
      lines.push('- `it` is null/undefined. The previous command may not have returned a value.');
      lines.push('  Check if a `get` or `fetch` command ran successfully before this step.');
    }
    if (!element) {
      lines.push('- No target element. The CSS selector may not match any element on the page.');
    }
  }

  lines.push('');
  lines.push('**Suggested fixes:**');
  const fixes = generateFixes(cmd, element, variables, error);
  for (const f of fixes) {
    lines.push(`- ${f}`);
  }

  return { content: [{ type: 'text', text: lines.join('\n') }] };
}

function traceVariable(
  history: Array<Record<string, unknown>>,
  variable: string
): { content: Array<{ type: string; text: string }> } {
  if (!history || !Array.isArray(history) || !variable) {
    return {
      content: [{ type: 'text', text: 'Error: history array and variable name are required' }],
      isError: true,
    } as any;
  }

  const lines: string[] = [];
  lines.push(`## Variable Trace: \`${variable}\``);
  lines.push('');

  let prevValue: unknown = undefined;
  const changes: Array<{ index: number; cmd: string; oldVal: unknown; newVal: unknown }> = [];

  for (const snap of history) {
    const vars = (snap.variables || {}) as Record<string, unknown>;
    const currentValue = vars[variable];
    const index = snap.index as number;
    const cmd = snap.commandName as string;

    if (currentValue !== prevValue) {
      changes.push({
        index,
        cmd,
        oldVal: prevValue,
        newVal: currentValue,
      });
      prevValue = currentValue;
    }
  }

  if (changes.length === 0) {
    lines.push(`Variable \`${variable}\` was not found in any snapshot, or never changed.`);
  } else {
    lines.push(`| Step | Command | Old Value | New Value |`);
    lines.push(`|------|---------|-----------|-----------|`);
    for (const c of changes) {
      lines.push(
        `| ${c.index} | \`${c.cmd}\` | \`${formatVal(c.oldVal)}\` | \`${formatVal(c.newVal)}\` |`
      );
    }
    lines.push('');
    lines.push(`**Total changes:** ${changes.length}`);
    lines.push(`**Final value:** \`${formatVal(prevValue)}\``);
  }

  return { content: [{ type: 'text', text: lines.join('\n') }] };
}

// =============================================================================
// Helpers
// =============================================================================

function formatVal(v: unknown): string {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  if (typeof v === 'string') return v.length > 40 ? `"${v.slice(0, 37)}..."` : `"${v}"`;
  return String(v);
}

const COMMAND_INSIGHTS: Record<string, string> = {
  toggle:
    'Toggles a CSS class on the target element. If the class is present, it removes it; if absent, it adds it.',
  add: 'Adds a CSS class or attribute to the target element.',
  remove: 'Removes a CSS class, attribute, or the element itself from the DOM.',
  set: 'Sets a variable or property to a value.',
  get: 'Evaluates an expression and stores the result in `it`.',
  put: 'Places content into an element (similar to setting innerHTML or textContent).',
  show: 'Makes a hidden element visible (removes display:none or similar).',
  hide: 'Hides an element (sets display:none or similar).',
  fetch: 'Makes an HTTP request and stores the response in `it`.',
  wait: 'Pauses execution for a specified duration.',
  trigger: 'Dispatches a custom event on an element.',
  send: 'Sends a custom event to a target element.',
  log: 'Logs a value to the browser console.',
  call: 'Calls a JavaScript function.',
  if: 'Conditional branch — executes commands only if the condition is true.',
  repeat: 'Loops over commands a specified number of times or for each item.',
  increment: 'Increases a numeric value by 1 (or a specified amount).',
  decrement: 'Decreases a numeric value by 1 (or a specified amount).',
  append: 'Appends content to an element (adds to end, does not replace).',
  go: 'Navigates to a URL.',
};

function getCommandInsight(cmd: string): string | null {
  return COMMAND_INSIGHTS[cmd] || null;
}

function getCommandInsightFromCode(code: string): string | null {
  const firstWord = code.trim().split(/\s+/)[0].toLowerCase();
  return COMMAND_INSIGHTS[firstWord] || null;
}

function detectIssues(
  cmd: string,
  element: string | null,
  variables: Record<string, unknown>
): string[] {
  const issues: string[] = [];

  if (['toggle', 'add', 'remove', 'show', 'hide'].includes(cmd) && !element) {
    issues.push('No target element — DOM commands need an element to act on.');
  }

  if (['put', 'set'].includes(cmd) && variables['it'] === null) {
    issues.push(
      '`it` is null — if using `it` as the value to set/put, this may produce unexpected results.'
    );
  }

  if (cmd === 'fetch' && !element) {
    issues.push('fetch command detected — ensure the URL is correct and the server is running.');
  }

  return issues;
}

function suggestBreakpoints(commands: string[], issue?: string): string[] {
  const suggestions: string[] = [];

  if (commands.length > 1) {
    suggestions.push(
      `Set breakpoint on command \`${commands[0].split(/\s+/)[0]}\` to verify the first step executes correctly.`
    );
  }

  // If there's a fetch, suggest breakpoint after it
  const fetchIdx = commands.findIndex(c => c.trim().startsWith('fetch'));
  if (fetchIdx >= 0) {
    suggestions.push(
      `Set breakpoint after \`fetch\` (step ${fetchIdx + 1}) to inspect the response in \`it\`.`
    );
  }

  // If there's conditional logic, suggest breakpoint on the condition
  const ifIdx = commands.findIndex(c => c.trim().startsWith('if'));
  if (ifIdx >= 0) {
    suggestions.push(
      `Set breakpoint on \`if\` (step ${ifIdx + 1}) to inspect the condition value.`
    );
  }

  if (issue && suggestions.length === 0) {
    suggestions.push(
      'Set breakpoint on the first command and step through to find where behavior diverges from expectations.'
    );
  }

  return suggestions.length > 0
    ? suggestions
    : ['Step through from the beginning with F10 (Step Over).'];
}

function diagnoseIssue(commands: string[], issue: string): string {
  const lowerIssue = issue.toLowerCase();

  if (lowerIssue.includes('not toggling') || lowerIssue.includes('class')) {
    return 'Check that the CSS selector in `toggle` matches the intended element. Use the element highlighter in the debug overlay to verify which element is being targeted.';
  }
  if (lowerIssue.includes('null') || lowerIssue.includes('undefined')) {
    return 'A variable is unexpectedly null. Step through each command and check `it` after each step — a command may be failing silently.';
  }
  if (
    lowerIssue.includes('fetch') ||
    lowerIssue.includes('network') ||
    lowerIssue.includes('api')
  ) {
    return 'The fetch command may be failing. Set a breakpoint after `fetch` and check `it` for the response. Also check the browser Network tab for HTTP errors.';
  }
  return 'Set a breakpoint on the first command and use Step Over (F10) to execute one command at a time, checking variables after each step.';
}

function diagnosError(cmd: string, error: string, variables: Record<string, unknown>): string[] {
  const causes: string[] = [];
  const lowerError = error.toLowerCase();

  if (lowerError.includes('null') || lowerError.includes('undefined')) {
    causes.push(
      'A variable or element reference is null. Check that selectors match existing elements.'
    );
    if (variables['me'] === null || variables['me'] === undefined) {
      causes.push('`me` is null — the command may not have a valid context element.');
    }
  }

  if (lowerError.includes('not a function')) {
    causes.push(
      'Attempting to call something that is not a function. Check that the method or function name is spelled correctly.'
    );
  }

  if (lowerError.includes('network') || lowerError.includes('fetch')) {
    causes.push(
      'Network request failed. Check the URL, CORS settings, and that the server is running.'
    );
  }

  if (causes.length === 0) {
    causes.push(
      `The \`${cmd}\` command threw an error. Check the command syntax and that all referenced elements/variables exist.`
    );
  }

  return causes;
}

function generateFixes(
  cmd: string,
  element: string | null,
  variables: Record<string, unknown>,
  error?: string
): string[] {
  const fixes: string[] = [];

  if (!element && ['toggle', 'add', 'remove'].includes(cmd)) {
    fixes.push(
      'Add a target element: e.g., `toggle .active on me` or `toggle .active on #myElement`'
    );
  }

  if (variables['it'] === null && ['put', 'set'].includes(cmd)) {
    fixes.push(
      'Ensure a previous command sets `it` before using it. Try adding `get ...` or `set ... to ...` before this command.'
    );
  }

  if (error && error.includes('not found')) {
    fixes.push(
      'Verify the CSS selector matches an element in the DOM. Use browser DevTools Elements panel to check.'
    );
  }

  if (fixes.length === 0) {
    fixes.push(
      'Use the debug overlay to step through execution and identify the exact point where behavior diverges.'
    );
    fixes.push('Check the browser console for additional error details.');
  }

  return fixes;
}
