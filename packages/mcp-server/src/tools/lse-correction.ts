/**
 * MCP Tool — lse_generate_with_correction
 *
 * Stateless correction helper for LLM-driven LSE generation.
 *
 * The tool does NOT call Claude internally. Instead, it provides everything
 * the calling LLM needs to drive its own correction loop:
 *
 *   Round 0 — no attempt yet:
 *     Returns a generation prompt (system context + schema + examples) and a
 *     `nextPrompt` the LLM should use to generate its first attempt.
 *
 *   Round N — attempt provided:
 *     Validates the attempt. If valid, returns the node and bracket LSE.
 *     If invalid, returns structured feedback + corrected example + a new
 *     `nextPrompt` Claude can use to produce a better attempt.
 *
 * Usage pattern (Claude drives the loop):
 *   1. Call with { task } → get nextPrompt
 *   2. Generate LSE using nextPrompt
 *   3. Call again with { task, attempt, round: 1 } → validate
 *   4. If not ok, use feedback.nextPrompt to generate again
 *   5. Repeat up to maxRounds (default 3)
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { jsonResponse, errorResponse } from './utils.js';

// =============================================================================
// Tool Definition
// =============================================================================

export const lseCorrectionTools: Tool[] = [
  {
    name: 'lse_generate_with_correction',
    description:
      'Stateless LSE generation helper. Without an attempt, returns a generation prompt and schema ' +
      'context for producing LSE protocol JSON. With an attempt, validates it and returns either ' +
      'the valid node or structured feedback + corrected example + a refined prompt. ' +
      'Call repeatedly (up to maxRounds) to converge on valid LSE. ' +
      'Supports bracket syntax ([command role:value ...]) or raw protocol JSON.',
    inputSchema: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description:
            'Natural language description of the UI interaction to generate. ' +
            'E.g. "A button that toggles .active on #sidebar when clicked".',
        },
        attempt: {
          type: 'string',
          description:
            'Your current LSE attempt — bracket syntax or JSON string. ' +
            'Omit on round 0 to get a generation prompt.',
        },
        domain: {
          type: 'string',
          description:
            'Optional command domain for schema validation: hyperscript, flow, sql, bdd, voice, etc.',
        },
        round: {
          type: 'number',
          description: 'Current correction round (0-based, default 0).',
        },
        maxRounds: {
          type: 'number',
          description: 'Maximum rounds before giving up (default 3).',
        },
      },
      required: ['task'],
    },
  },
];

// =============================================================================
// Handler
// =============================================================================

type ToolResponse = { content: Array<{ type: string; text: string }>; isError?: boolean };

export async function handleLseCorrectionTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResponse> {
  if (name !== 'lse_generate_with_correction') {
    return errorResponse(`Unknown correction tool: ${name}`);
  }

  const task = args.task as string;
  if (!task || typeof task !== 'string') {
    return errorResponse('Missing required parameter: task');
  }

  const attempt = typeof args.attempt === 'string' ? args.attempt.trim() : undefined;
  const domain = typeof args.domain === 'string' ? args.domain : undefined;
  const round = typeof args.round === 'number' ? args.round : 0;
  const maxRounds = typeof args.maxRounds === 'number' ? args.maxRounds : 3;

  // Round 0 with no attempt → return generation prompt
  if (!attempt) {
    return handleGenerationPrompt(task, domain);
  }

  // Round N with attempt → validate and return feedback or success
  if (round >= maxRounds) {
    return jsonResponse({
      ok: false,
      exhausted: true,
      round,
      maxRounds,
      message:
        `Maximum correction rounds (${maxRounds}) reached without valid LSE. ` +
        'Review the task description and try a simpler interaction pattern.',
    });
  }

  return handleValidateAttempt(task, attempt, domain, round, maxRounds);
}

// =============================================================================
// Round 0: Generation Prompt
// =============================================================================

async function handleGenerationPrompt(task: string, domain?: string): Promise<ToolResponse> {
  const schemaContext = await buildSchemaContext(domain);

  const systemContext = [
    '## LSE (LokaScript Explicit Syntax) Generation',
    '',
    'LSE uses bracket syntax: `[command role:value role:value ...]`',
    '',
    '### Value types',
    '- Selector: `.class`, `#id`, `element`, or complex selectors → `patient:.active`',
    '- Literal: quoted strings or numbers → `source:"/api/data"`, `count:3`',
    '- Reference: built-in refs (me, it, you, body, window, document) → `destination:me`',
    '- Flag: boolean flag → `+async` (enabled), `~async` (disabled)',
    '',
    '### Common patterns',
    '- Toggle class: `[toggle patient:.active]`',
    '- Add/remove class: `[add patient:.highlight destination:#target]`',
    '- Set value: `[set patient:#input value:"hello"]`',
    '- Fetch data: `[fetch source:"/api/data" target:#results]`',
    '- Show/hide: `[show patient:#modal]` / `[hide patient:#modal]`',
    '',
    '### Protocol JSON (alternative format)',
    '```json',
    '{"action":"toggle","roles":{"patient":{"type":"selector","value":".active"}}}',
    '```',
  ];

  if (schemaContext) {
    systemContext.push('', '### Available commands for this domain', schemaContext);
  }

  const nextPrompt = [
    `Task: ${task}`,
    '',
    'Generate LSE bracket syntax or protocol JSON for the above task.',
    'Return ONLY the LSE — no explanation, no markdown fences.',
    'If using bracket syntax: `[command role:value ...]`',
    'If using JSON: `{"action":"...","roles":{...}}`',
  ].join('\n');

  return jsonResponse({
    ok: false,
    needsAttempt: true,
    round: 0,
    systemContext: systemContext.join('\n'),
    nextPrompt,
    instructions:
      'Use systemContext as your system prompt and nextPrompt as your user message. ' +
      'Pass the response back as `attempt` in the next call.',
  });
}

// =============================================================================
// Round N: Validate Attempt
// =============================================================================

async function handleValidateAttempt(
  task: string,
  attempt: string,
  domain: string | undefined,
  round: number,
  maxRounds: number
): Promise<ToolResponse> {
  const { parseExplicit, renderExplicit, toProtocolJSON, validateProtocolJSON, fromProtocolJSON } =
    await import('@lokascript/framework');

  let node: import('@lokascript/framework').SemanticNode | null = null;
  const diagnostics: Array<{ severity: string; code: string; message: string }> = [];

  // ── Parse ────────────────────────────────────────────────────────────────

  const isJSON = attempt.trimStart().startsWith('{');

  if (isJSON) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(attempt);
    } catch {
      diagnostics.push({
        severity: 'error',
        code: 'INVALID_JSON',
        message: 'Attempt is not valid JSON',
      });
    }

    if (parsed) {
      const protoDiags = validateProtocolJSON(parsed as Record<string, unknown>);
      for (const d of protoDiags) diagnostics.push(d);
      if (!protoDiags.some(d => d.severity === 'error')) {
        try {
          node = fromProtocolJSON(parsed as Parameters<typeof fromProtocolJSON>[0]);
        } catch (e) {
          diagnostics.push({
            severity: 'error',
            code: 'DESERIALIZE_ERROR',
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }
  } else {
    try {
      node = parseExplicit(attempt);
    } catch (e) {
      diagnostics.push({
        severity: 'error',
        code: 'PARSE_ERROR',
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const hasErrors = diagnostics.some(d => d.severity === 'error');

  // ── Success ───────────────────────────────────────────────────────────────

  if (!hasErrors && node) {
    const lse = renderExplicit(node);
    const protocol = toProtocolJSON(node);
    return jsonResponse({
      ok: true,
      round,
      lse,
      protocol,
      diagnostics,
      message:
        round === 0
          ? 'Valid LSE on first attempt.'
          : `Valid LSE after ${round} correction round${round === 1 ? '' : 's'}.`,
    });
  }

  // ── Correction feedback ───────────────────────────────────────────────────

  const correctedExample = buildCorrectedExample(attempt, diagnostics);
  const remaining = maxRounds - round - 1;

  let nextPrompt: string;
  if (remaining > 0) {
    nextPrompt = [
      `Task: ${task}`,
      '',
      'Your previous attempt had errors:',
      ...diagnostics.filter(d => d.severity === 'error').map(d => `  • [${d.code}] ${d.message}`),
      '',
      correctedExample ? `Corrected example:\n${correctedExample}` : '',
      '',
      'Generate a corrected LSE. Return ONLY the LSE — no explanation.',
    ]
      .filter(Boolean)
      .join('\n');
  } else {
    nextPrompt = [
      `Task: ${task}`,
      '',
      'Final attempt. Your previous LSE had these errors:',
      ...diagnostics.filter(d => d.severity === 'error').map(d => `  • [${d.code}] ${d.message}`),
      '',
      'Produce the simplest valid LSE you can for this task.',
    ].join('\n');
  }

  return jsonResponse({
    ok: false,
    round,
    remainingRounds: remaining,
    diagnostics,
    correctedExample,
    nextPrompt,
    instructions:
      remaining > 0
        ? `Use nextPrompt to generate a corrected attempt, then call again with round: ${round + 1}.`
        : 'Last correction round — generate the simplest valid LSE you can.',
  });
}

// =============================================================================
// Helpers
// =============================================================================

function buildCorrectedExample(
  attempt: string,
  diagnostics: Array<{ severity: string; code: string; message: string }>
): string | null {
  // Extract the action from the attempt (best-effort)
  const bracketMatch = attempt.match(/^\[\s*(\w+)/);
  const jsonMatch = attempt.match(/"action"\s*:\s*"(\w+)"/);
  const action = bracketMatch?.[1] ?? jsonMatch?.[1];

  if (!action) return null;

  // Build a minimal corrected skeleton based on error codes
  const missingRoles = diagnostics
    .filter(d => d.code === 'MISSING_REQUIRED_ROLE')
    .map(d => {
      const m = d.message.match(/role "(\w+)"/);
      return m?.[1];
    })
    .filter(Boolean);

  if (missingRoles.length > 0) {
    const roleParts = missingRoles.map(r => `${r}:.<value>`).join(' ');
    return `[${action} ${roleParts}]`;
  }

  // Generic skeleton for parse errors
  return `[${action} patient:.<selector>]`;
}

async function buildSchemaContext(domain?: string): Promise<string | null> {
  if (!domain) return null;

  try {
    const { loadDomainSchemas } = (await import('./feedback-tools.js')) as {
      loadDomainSchemas?: (d: string) => Promise<unknown[] | null>;
    };
    if (typeof loadDomainSchemas !== 'function') return null;

    const schemas = await loadDomainSchemas(domain);
    if (!schemas || schemas.length === 0) return null;

    return (
      schemas as Array<{
        action: string;
        description?: string;
        roles?: Array<{ role: string; required: boolean }>;
      }>
    )
      .map(s => {
        const roles = (s.roles ?? []).map(r => `${r.role}${r.required ? '' : '?'}`).join(', ');
        return `- \`${s.action}\`${roles ? ` (${roles})` : ''}${s.description ? ': ' + s.description : ''}`;
      })
      .join('\n');
  } catch {
    return null;
  }
}
