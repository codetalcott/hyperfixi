/**
 * MCP Debug Prompts — AI-assisted debugging prompt templates
 *
 * Exposes debugging workflows as MCP Prompts that Claude can use to
 * help developers understand execution state, diagnose issues, and
 * suggest appropriate breakpoint placements.
 */

import type { Prompt, GetPromptResult } from '@modelcontextprotocol/sdk/types.js';

// =============================================================================
// Prompt Definitions
// =============================================================================

const DEBUG_PROMPTS: Prompt[] = [
  {
    name: 'debug_explain_state',
    description:
      'Explain the current debug state when paused in the HyperFixi debugger. Provide a snapshot of the execution state and get a human-friendly explanation.',
    arguments: [
      {
        name: 'snapshot',
        description:
          'JSON-serialized DebugSnapshot: { commandName, element, variables, depth, index }',
        required: true,
      },
      {
        name: 'handler_code',
        description: 'The full hyperscript handler code for additional context',
        required: false,
      },
    ],
  },
  {
    name: 'debug_why_wrong',
    description:
      'Diagnose why a variable has an unexpected value during debugging. Provide the execution history and expected vs actual values.',
    arguments: [
      {
        name: 'variable',
        description: 'The variable name (e.g., "it", ":count", "me")',
        required: true,
      },
      {
        name: 'expected',
        description: 'What the developer expected the value to be',
        required: true,
      },
      {
        name: 'actual',
        description: 'The actual value observed',
        required: true,
      },
      {
        name: 'history',
        description: 'JSON-serialized array of DebugSnapshot objects showing execution history',
        required: false,
      },
    ],
  },
  {
    name: 'debug_suggest_breakpoints',
    description:
      'Given hyperscript code and a description of the issue, suggest where to place breakpoints for effective debugging.',
    arguments: [
      {
        name: 'code',
        description: 'The hyperscript event handler code',
        required: true,
      },
      {
        name: 'issue',
        description: 'Description of the problem to debug (e.g., "the counter does not increment")',
        required: true,
      },
    ],
  },
];

// =============================================================================
// Exports
// =============================================================================

export function getDebugPromptDefinitions(): Prompt[] {
  return DEBUG_PROMPTS;
}

export function renderDebugPrompt(name: string, args: Record<string, string>): GetPromptResult {
  switch (name) {
    case 'debug_explain_state':
      return renderExplainState(args);
    case 'debug_why_wrong':
      return renderWhyWrong(args);
    case 'debug_suggest_breakpoints':
      return renderSuggestBreakpoints(args);
    default:
      throw new Error(`Unknown debug prompt: ${name}`);
  }
}

export function isDebugPrompt(name: string): boolean {
  return DEBUG_PROMPTS.some(p => p.name === name);
}

// =============================================================================
// Renderers
// =============================================================================

function renderExplainState(args: Record<string, string>): GetPromptResult {
  const { snapshot, handler_code } = args;

  let text = `I'm paused in the HyperFixi interactive debugger. Here is my current execution state:\n\n`;
  text += `**Debug Snapshot:**\n\`\`\`json\n${snapshot}\n\`\`\`\n\n`;

  if (handler_code) {
    text += `**Full handler code:**\n\`\`\`hyperscript\n${handler_code}\n\`\`\`\n\n`;
  }

  text += `Please explain:\n`;
  text += `1. What command is about to execute and what it will do\n`;
  text += `2. What the current variable state tells us\n`;
  text += `3. What will likely happen next\n`;
  text += `4. Any potential issues you see in the state`;

  return {
    description: 'Explain current debug state',
    messages: [{ role: 'user', content: { type: 'text', text } }],
  };
}

function renderWhyWrong(args: Record<string, string>): GetPromptResult {
  const { variable, expected, actual, history } = args;

  let text = `I'm debugging a HyperFixi hyperscript handler and a variable has an unexpected value.\n\n`;
  text += `**Variable:** \`${variable}\`\n`;
  text += `**Expected:** ${expected}\n`;
  text += `**Actual:** ${actual}\n\n`;

  if (history) {
    text += `**Execution history (DebugSnapshots):**\n\`\`\`json\n${history}\n\`\`\`\n\n`;
  }

  text += `Please analyze:\n`;
  text += `1. What likely caused \`${variable}\` to be \`${actual}\` instead of \`${expected}\`\n`;
  text += `2. Which command in the history is the most likely source of the problem\n`;
  text += `3. How to fix it`;

  return {
    description: `Diagnose unexpected value of ${variable}`,
    messages: [{ role: 'user', content: { type: 'text', text } }],
  };
}

function renderSuggestBreakpoints(args: Record<string, string>): GetPromptResult {
  const { code, issue } = args;

  let text = `I need to debug this HyperFixi hyperscript code:\n\n`;
  text += `\`\`\`hyperscript\n${code}\n\`\`\`\n\n`;
  text += `**Issue:** ${issue}\n\n`;
  text += `Please suggest:\n`;
  text += `1. Where to place breakpoints (by command name or element selector)\n`;
  text += `2. What variables to watch at each breakpoint\n`;
  text += `3. A step-by-step debugging strategy to isolate the issue`;

  return {
    description: `Debug strategy for: ${issue}`,
    messages: [{ role: 'user', content: { type: 'text', text } }],
  };
}
