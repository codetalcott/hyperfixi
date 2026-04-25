/**
 * LLM Prompt Generator
 *
 * Auto-generates LLM system prompts from CommandSchema[]. Given a set of
 * domain schemas, produces a structured markdown prompt that teaches LLMs
 * to output valid LSE bracket syntax and/or LLM-simplified JSON.
 *
 * The generated prompt includes:
 * - Protocol overview (LSE syntax summary)
 * - Value type reference
 * - Per-command documentation with role descriptions
 * - Synthetic examples in both formats
 * - Output format specification
 * - Error recovery instructions
 */

import type { CommandSchema, RoleSpec } from '../schema/command-schema';
import type { SemanticJSON, SemanticJSONValue } from '../ir/types';
import { renderExplicit } from '../ir/explicit-renderer';
import { createCommandNode } from '../core/types';
import type {
  PromptGeneratorConfig,
  GeneratedPrompt,
  PromptSection,
  PromptMetadata,
} from './types';

// =============================================================================
// Public API
// =============================================================================

/**
 * Generate an LLM system prompt from domain command schemas.
 *
 * @example
 * ```typescript
 * import { generatePrompt } from '@lokascript/framework';
 * import { allSchemas } from '@lokascript/domain-flow';
 *
 * const prompt = generatePrompt({
 *   domain: 'flow',
 *   description: 'Reactive data flow pipelines',
 *   schemas: allSchemas,
 * });
 *
 * console.log(prompt.text); // Full markdown system prompt
 * ```
 */
export function generatePrompt(config: PromptGeneratorConfig): GeneratedPrompt {
  const outputFormat = config.outputFormat ?? 'both';
  const examplesPerCommand = config.examplesPerCommand ?? 2;

  const sections: PromptSection[] = [
    buildProtocolSection(),
    buildValueTypeSection(),
    buildCommandsSection(config.schemas, outputFormat, examplesPerCommand),
    buildOutputFormatSection(outputFormat),
    buildErrorRecoverySection(),
  ];

  // Apply token budget if specified
  let finalSections = sections;
  if (config.maxTokens && config.maxTokens > 0) {
    finalSections = truncateToTokenBudget(sections, config.maxTokens);
  }

  const text = finalSections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n---\n\n');

  const totalRoles = config.schemas.reduce((sum, s) => sum + s.roles.length, 0);
  const approximateTokens = estimateTokens(text);

  const metadata: PromptMetadata = {
    domain: config.domain,
    commandCount: config.schemas.length,
    roleCount: totalRoles,
    approximateTokens,
  };

  return { text, sections: finalSections, metadata };
}

/**
 * Generate synthetic LSE examples from a single command schema.
 * Used by both the prompt generator and training data synthesizer.
 */
export function generateExamples(
  schema: CommandSchema,
  count: number = 2
): Array<{ explicit: string; json: SemanticJSON }> {
  const combos = generateRoleCombinations(schema);
  const examples: Array<{ explicit: string; json: SemanticJSON }> = [];

  for (let i = 0; i < Math.min(count, combos.length); i++) {
    const combo = combos[i];
    const roles = new Map<string, { type: string; value: string | number | boolean }>();

    for (const role of combo) {
      const sample = sampleValue(role);
      roles.set(role.role, sample);
    }

    // Build SemanticNode for rendering to bracket syntax
    const nodeRoles = new Map<
      string,
      {
        type: string;
        value: string | number | boolean;
        raw?: string;
        dataType?: string;
        selectorKind?: string;
      }
    >();
    for (const [roleName, sample] of roles) {
      nodeRoles.set(roleName, toSemanticValue(sample));
    }

    const node = createCommandNode(schema.action, nodeRoles as never);
    const explicit = renderExplicit(node);

    // Build JSON format
    const jsonRoles: Record<string, SemanticJSONValue> = {};
    for (const [roleName, sample] of roles) {
      jsonRoles[roleName] = sample as SemanticJSONValue;
    }
    const json: SemanticJSON = { action: schema.action, roles: jsonRoles };

    examples.push({ explicit, json });
  }

  return examples;
}

/**
 * Generate a condensed LSE protocol reference (for MCP resources).
 */
export function generateProtocolReference(): string {
  const protocol = buildProtocolSection();
  const valueTypes = buildValueTypeSection();
  return `# LokaScript Explicit Syntax (LSE) Quick Reference\n\n${protocol.content}\n\n${valueTypes.content}`;
}

// =============================================================================
// Section Builders
// =============================================================================

function buildProtocolSection(): PromptSection {
  const content = `LokaScript Explicit Syntax (LSE) is a bracket-based format for imperative commands.

### Syntax

\`\`\`
[command role1:value1 role2:value2 +flag1 ~flag2]
\`\`\`

- **Command**: The first token inside brackets (lowercased)
- **Role pair**: \`name:value\` — a named semantic role with a typed value (no space around colon)
- **Enabled flag**: \`+name\` — boolean attribute present
- **Disabled flag**: \`~name\` — boolean attribute negated
- **Nested body**: \`body:[command ...]\` — a bracket command inside a role value

### Rules

1. Commands are always lowercased
2. Role names preserve their original case
3. No spaces around the colon in role:value pairs
4. Strings with spaces must be quoted: \`patient:"hello world"\`
5. Selectors start with \`#\`, \`.\`, \`[\`, \`@\`, or \`*\`
6. Output must be valid bracket syntax: \`[action role:value ...]\``;

  return {
    id: 'protocol',
    title: 'LSE Protocol',
    content,
    approximateTokens: estimateTokens(content),
  };
}

function buildValueTypeSection(): PromptSection {
  const content = `Values in LSE are classified by their syntactic form (first match wins):

| Type | Syntax | Example |
|------|--------|---------|
| Selector | Starts with \`#\` \`.\` \`[\` \`@\` \`*\` | \`#button\`, \`.active\`, \`[data-id]\` |
| String | Quoted with \`"\` or \`'\` | \`"hello world"\`, \`'json'\` |
| Boolean | Exact: \`true\` / \`false\` | \`visible:true\` |
| Reference | Built-in name | \`me\`, \`you\`, \`it\`, \`result\`, \`event\`, \`target\`, \`body\` |
| Duration | Number + suffix | \`500ms\`, \`2s\`, \`1m\`, \`1h\` |
| Number | Digits with optional decimal | \`5\`, \`3.14\`, \`-1\` |
| Plain | Fallback (any non-whitespace) | \`/api/users\`, \`json\`, \`production\` |

**Important**: Classification is by prefix, not by intent. \`#true\` is a selector (not boolean). \`event\` as a value is a reference (not plain text).`;

  return {
    id: 'value-types',
    title: 'Value Types',
    content,
    approximateTokens: estimateTokens(content),
  };
}

function buildCommandsSection(
  schemas: readonly CommandSchema[],
  outputFormat: 'explicit' | 'json' | 'both',
  examplesPerCommand: number
): PromptSection {
  const parts: string[] = [];

  for (const schema of schemas) {
    parts.push(formatCommandDoc(schema, outputFormat, examplesPerCommand));
  }

  const content = parts.join('\n\n');

  return {
    id: 'commands',
    title: 'Available Commands',
    content,
    approximateTokens: estimateTokens(content),
  };
}

function buildOutputFormatSection(outputFormat: 'explicit' | 'json' | 'both'): PromptSection {
  let content: string;

  if (outputFormat === 'explicit') {
    content = `Output valid LSE bracket syntax. Each command must be wrapped in brackets:

\`\`\`
[command role:value ...]
\`\`\`

Do NOT output JSON. Only use bracket syntax.`;
  } else if (outputFormat === 'json') {
    content = `Output valid JSON in the LLM-simplified format:

\`\`\`json
{
  "action": "command-name",
  "roles": {
    "roleName": { "type": "valueType", "value": "theValue" }
  }
}
\`\`\`

Valid value types: \`selector\`, \`literal\`, \`reference\`, \`expression\`.
Do NOT output bracket syntax. Only use JSON.`;
  } else {
    content = `You may output EITHER format:

**Bracket syntax** (preferred for single commands):
\`\`\`
[command role:value ...]
\`\`\`

**JSON format** (preferred when structured data is needed):
\`\`\`json
{
  "action": "command-name",
  "roles": {
    "roleName": { "type": "valueType", "value": "theValue" }
  }
}
\`\`\`

Both formats are equally valid. Use whichever is more natural for the context.`;
  }

  return {
    id: 'output-format',
    title: 'Output Format',
    content,
    approximateTokens: estimateTokens(content),
  };
}

function buildErrorRecoverySection(): PromptSection {
  const content = `If you're unsure about a command or role:

1. **Unknown command**: Use the closest matching command from the Available Commands section. Do not invent commands.
2. **Unknown role**: Use only the roles listed for each command. Do not add roles not in the schema.
3. **Ambiguous value type**: When in doubt, use \`expression\` type (it's the most permissive).
4. **Missing required role**: Always include all required roles. Check the Required/Optional labels.
5. **Selector vs plain value**: If a value starts with \`#\`, \`.\`, \`[\`, \`@\`, or \`*\`, it's a selector. URLs like \`/api/data\` are plain values.

When generating LSE, prefer explicit role labeling over positional guessing. Every value should have a role name.`;

  return {
    id: 'error-recovery',
    title: 'Error Recovery',
    content,
    approximateTokens: estimateTokens(content),
  };
}

// =============================================================================
// Command Documentation
// =============================================================================

function formatCommandDoc(
  schema: CommandSchema,
  outputFormat: 'explicit' | 'json' | 'both',
  examplesPerCommand: number
): string {
  const lines: string[] = [];

  // Header
  lines.push(`### \`${schema.action}\` — ${schema.description}`);
  lines.push('');

  // Roles
  const required = schema.roles.filter(r => r.required);
  const optional = schema.roles.filter(r => !r.required);

  if (required.length > 0) {
    lines.push('**Required roles:**');
    for (const role of required) {
      lines.push(`- \`${role.role}\`: ${role.description} (type: ${formatExpectedTypes(role)})`);
    }
  }

  if (optional.length > 0) {
    lines.push('**Optional roles:**');
    for (const role of optional) {
      lines.push(`- \`${role.role}\`: ${role.description} (type: ${formatExpectedTypes(role)})`);
    }
  }

  // Examples
  const examples = generateExamples(schema, examplesPerCommand);
  if (examples.length > 0) {
    lines.push('');
    if (outputFormat === 'explicit' || outputFormat === 'both') {
      lines.push('**Bracket syntax:**');
      for (const ex of examples) {
        lines.push(`\`\`\`\n${ex.explicit}\n\`\`\``);
      }
    }
    if (outputFormat === 'json' || outputFormat === 'both') {
      lines.push('**JSON format:**');
      for (const ex of examples) {
        lines.push(`\`\`\`json\n${JSON.stringify(ex.json, null, 2)}\n\`\`\``);
      }
    }
  }

  return lines.join('\n');
}

function formatExpectedTypes(role: RoleSpec): string {
  return role.expectedTypes.join(' | ');
}

// =============================================================================
// Example Generation Helpers
// =============================================================================

/**
 * Generate role combinations for example synthesis.
 * Returns arrays of RoleSpec[] representing different valid input combinations:
 * 1. Required roles only
 * 2. Required + each optional role individually
 * 3. Required + all optional roles (if different from #1 and #2)
 */
function generateRoleCombinations(schema: CommandSchema): RoleSpec[][] {
  const required = schema.roles.filter(r => r.required);
  const optional = schema.roles.filter(r => !r.required);

  const combos: RoleSpec[][] = [];

  // 1. Required only
  if (required.length > 0) {
    combos.push(required);
  }

  // 2. Required + each optional individually
  for (const opt of optional) {
    combos.push([...required, opt]);
  }

  // 3. Required + all optional (if there are 2+ optional roles)
  if (optional.length >= 2) {
    combos.push([...required, ...optional]);
  }

  // Fallback: if schema has no required roles, use all roles
  if (combos.length === 0) {
    combos.push(schema.roles.slice());
  }

  return combos;
}

/**
 * Sample a value for a role based on its expected types and name.
 */
function sampleValue(role: RoleSpec): { type: string; value: string | number | boolean } {
  const primaryType = role.expectedTypes[0] || 'expression';

  // Use role name as a heuristic for realistic values
  switch (primaryType) {
    case 'selector':
      return sampleSelector(role.role);
    case 'literal':
      return sampleLiteral(role.role);
    case 'reference':
      return { type: 'reference', value: 'me' };
    case 'expression':
      return sampleExpression(role.role);
    case 'flag':
      return { type: 'flag', value: true };
    default:
      return { type: 'literal', value: 'example' };
  }
}

function sampleSelector(roleName: string): { type: string; value: string } {
  const selectors: Record<string, string> = {
    patient: '.active',
    destination: '#output',
    source: '#input',
    target: '#target',
  };
  return { type: 'selector', value: selectors[roleName] || `#${roleName}` };
}

function sampleLiteral(roleName: string): { type: string; value: string | number } {
  const literals: Record<string, string | number> = {
    duration: '30s',
    interval: '5s',
    delay: '500ms',
    timeout: '10s',
    quantity: 5,
    limit: 10,
    style: 'json',
    manner: 'rolling',
    format: 'html',
  };
  return { type: 'literal', value: literals[roleName] || roleName };
}

function sampleExpression(roleName: string): { type: string; value: string } {
  const expressions: Record<string, string> = {
    source: '/api/data',
    destination: '#output',
    patient: '.active',
    instrument: 'toUpperCase',
    condition: 'age > 18',
    style: 'json',
    duration: '5s',
    url: '/api/users',
  };
  return { type: 'expression', value: expressions[roleName] || `/api/${roleName}` };
}

/**
 * Convert a sampled value into a SemanticValue for renderExplicit().
 */
function toSemanticValue(sample: { type: string; value: string | number | boolean }): {
  type: string;
  value: string | number | boolean;
  raw?: string;
  dataType?: string;
  selectorKind?: string;
} {
  switch (sample.type) {
    case 'selector':
      return {
        type: 'selector',
        value: String(sample.value),
        selectorKind: detectSelectorKind(String(sample.value)),
      };
    case 'literal':
      return {
        type: 'literal',
        value: sample.value,
        dataType:
          typeof sample.value === 'number'
            ? 'number'
            : typeof sample.value === 'boolean'
              ? 'boolean'
              : 'string',
      };
    case 'reference':
      return { type: 'reference', value: String(sample.value) };
    case 'expression':
      return { type: 'expression', value: String(sample.value), raw: String(sample.value) };
    case 'flag':
      return { type: 'flag', value: sample.value };
    default:
      return { type: 'literal', value: String(sample.value), dataType: 'string' };
  }
}

function detectSelectorKind(selector: string): string {
  if (selector.startsWith('#')) return 'id';
  if (selector.startsWith('.')) return 'class';
  if (selector.startsWith('[')) return 'attribute';
  return 'complex';
}

// =============================================================================
// Token Budget
// =============================================================================

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function truncateToTokenBudget(sections: PromptSection[], maxTokens: number): PromptSection[] {
  const result: PromptSection[] = [];
  let budget = maxTokens;

  for (const section of sections) {
    if (section.approximateTokens <= budget) {
      result.push(section);
      budget -= section.approximateTokens;
    } else {
      // Truncate the section to fit remaining budget (always include at least something)
      const charBudget = Math.max(budget * 4, 40);
      const truncatedContent = section.content.slice(0, charBudget) + '\n\n*(truncated)*';
      result.push({
        ...section,
        content: truncatedContent,
        approximateTokens: estimateTokens(truncatedContent),
      });
      break;
    }
  }

  return result;
}
