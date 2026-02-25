/**
 * MCP Prompts — LSE (LokaScript Explicit Syntax) Prompt Templates
 *
 * Two prompts for LLM ↔ LSE integration:
 * - lse_generate: Generate LSE from a task description
 * - lse_fix: Fix invalid LSE given diagnostics
 */

import type { Prompt, GetPromptResult } from '@modelcontextprotocol/sdk/types.js';

// =============================================================================
// Prompt Definitions
// =============================================================================

const LSE_PROMPTS: Prompt[] = [
  {
    name: 'lse_generate',
    description:
      'Generate LokaScript Explicit Syntax (LSE) from a task description. Includes schema-aware system prompt context.',
    arguments: [
      {
        name: 'task',
        description:
          'Natural language description of what to do (e.g., "fetch users from API and show in a list")',
        required: true,
      },
      {
        name: 'domain',
        description:
          'Domain to generate for (flow, sql, bdd, llm, jsx, todo, behaviorspec, voice). Default: flow',
        required: false,
      },
      {
        name: 'format',
        description:
          'Output format: explicit (bracket syntax), json (LLM-simplified), or both. Default: explicit',
        required: false,
      },
    ],
  },
  {
    name: 'lse_fix',
    description:
      'Fix invalid LSE given the original input and diagnostic errors. Returns corrected LSE with explanation.',
    arguments: [
      {
        name: 'input',
        description: 'The invalid LSE bracket syntax or JSON that failed validation',
        required: true,
      },
      {
        name: 'errors',
        description: 'Error messages or diagnostic output from the validator',
        required: true,
      },
      {
        name: 'domain',
        description: 'Domain context (flow, sql, bdd, etc.). Helps narrow valid commands.',
        required: false,
      },
    ],
  },
];

// =============================================================================
// Handlers
// =============================================================================

export function getLSEPromptDefinitions(): Prompt[] {
  return LSE_PROMPTS;
}

export function isLSEPrompt(name: string): boolean {
  return name === 'lse_generate' || name === 'lse_fix';
}

export function renderLSEPrompt(name: string, args: Record<string, string>): GetPromptResult {
  switch (name) {
    case 'lse_generate':
      return renderGeneratePrompt(args);
    case 'lse_fix':
      return renderFixPrompt(args);
    default:
      throw new Error(`Unknown LSE prompt: ${name}`);
  }
}

// =============================================================================
// Prompt Renderers
// =============================================================================

function renderGeneratePrompt(args: Record<string, string>): GetPromptResult {
  const { task, domain, format } = args;
  const domainName = domain || 'flow';
  const outputFormat = format || 'explicit';

  const systemPrompt = buildLSESystemPrompt(domainName, outputFormat);
  const userPrompt = task || '(no task provided)';

  return {
    description: `Generate LSE for: ${task}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `${systemPrompt}\n\n---\n\n**Task:** ${userPrompt}\n\nGenerate the LSE output for this task.`,
        },
      },
    ],
  };
}

function renderFixPrompt(args: Record<string, string>): GetPromptResult {
  const { input, errors, domain } = args;
  const domainNote = domain ? ` in the ${domain} domain` : '';

  const text = `You are fixing invalid LokaScript Explicit Syntax (LSE)${domainNote}.

**Original input:**
\`\`\`
${input || '(no input provided)'}
\`\`\`

**Errors:**
\`\`\`
${errors || '(no errors provided)'}
\`\`\`

**Rules for fixing:**
1. Preserve the original intent — only fix what's broken
2. Use valid bracket syntax: \`[command role:value ...]\`
3. All required roles must be present
4. Value types must match the role's expected type
5. Command names must be lowercase

**Output:** Provide the corrected LSE and briefly explain what was wrong.`;

  return {
    description: `Fix LSE: ${(input || '').slice(0, 50)}...`,
    messages: [{ role: 'user', content: { type: 'text', text } }],
  };
}

// =============================================================================
// System Prompt Builder
// =============================================================================

function buildLSESystemPrompt(domain: string, format: string): string {
  const formatInstructions =
    format === 'json'
      ? 'Output valid JSON in the full-fidelity format: { "kind": "command", "action": "...", "roles": { "roleName": { "type": "...", "value": "..." } } }'
      : format === 'both'
        ? 'Output EITHER bracket syntax [command role:value ...] OR full-fidelity JSON { "kind": "command", "action": "...", "roles": { ... } }.'
        : 'Output valid LSE bracket syntax: [command role:value ...]';

  return `You are generating LokaScript Explicit Syntax (LSE) for the "${domain}" domain.

**LSE Bracket Syntax:**
- Commands: \`[action role1:value1 role2:value2 +flag]\`
- No spaces around the colon in role:value pairs
- Selectors: \`#id\`, \`.class\`, \`[attr]\`, \`@aria\`, \`*wild\`
- Strings with spaces: \`"hello world"\`
- References: \`me\`, \`you\`, \`it\`, \`result\`, \`event\`, \`target\`, \`body\`
- Flags: \`+enabled\`, \`~disabled\`
- Durations: \`500ms\`, \`2s\`, \`1m\`, \`1h\`
- Compound: \`[add patient:.loading] then [fetch source:/api]\` (chain operators: then, and, async, sequential)

**Event Handlers:**
\`[on event:click body:[toggle patient:.active]]\`

**Conditional (v1.1):**
\`[if condition:"x > 0" then:[toggle patient:.active] else:[remove patient:.active]]\`

**Loop (v1.1):**
- \`[repeat loopVariant:forever body:[wait delay:1s]]\`
- \`[repeat quantity:5 loopVariant:times body:[increment patient:#count]]\`
- \`[repeat source:#items loopVariant:for loopVariable:item body:[add patient:.active]]\`
- \`[repeat condition:"x > 0" loopVariant:while body:[decrement patient:#count]]\`

**Value types:** selector, literal (string/number/boolean/duration), reference, expression, property-path, flag.

**Node kinds (JSON):** command, event-handler, compound.
- Conditionals are \`command\` nodes with \`thenBranch\`/\`elseBranch\` arrays.
- Loops are \`command\` nodes with \`loopVariant\`, \`loopBody\`, \`loopVariable\`?, \`indexVariable\`?.

**${formatInstructions}**

Every value must have a role name. Do not invent commands or roles not in the schema. When unsure, use the "expression" value type.`;
}
