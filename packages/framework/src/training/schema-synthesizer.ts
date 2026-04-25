/**
 * Schema Synthesizer
 *
 * Generates synthetic (natural_language, LSE) training pairs from
 * CommandSchema[]. Enumerates valid role combinations and produces
 * examples in both bracket syntax and JSON wire format.
 */

import type { CommandSchema, RoleSpec } from '../schema/command-schema';
import type { SemanticJSON, SemanticJSONValue } from '../ir/types';
import { renderExplicit } from '../ir/explicit-renderer';
import { createCommandNode } from '../core/types';
import type { TrainingPair, SynthesisConfig, SynthesisResult, SynthesisMetadata } from './types';

// =============================================================================
// Public API
// =============================================================================

/**
 * Synthesize training pairs from command schemas.
 *
 * Generates multiple examples per command by enumerating role combinations:
 * 1. Required roles only (minimum viable)
 * 2. Required + each optional role individually
 * 3. Required + all optional roles (maximum)
 * 4. Shuffled role order variants (teaches role-label independence)
 */
export function synthesizeFromSchemas(
  schemas: readonly CommandSchema[],
  config: SynthesisConfig
): SynthesisResult {
  const maxPerCommand = config.maxPairsPerCommand ?? 5;
  const minQuality = config.minQuality ?? 0.5;
  const shuffleRoles = config.shuffleRoles ?? true;
  const languages = config.languages ?? ['en'];

  const pairs: TrainingPair[] = [];
  let idCounter = 0;

  for (const schema of schemas) {
    const combos = generateRoleCombinations(schema);

    for (const language of languages) {
      let commandPairCount = 0;

      for (const combo of combos) {
        if (commandPairCount >= maxPerCommand) break;

        const pair = buildTrainingPair(
          schema,
          combo,
          language,
          config.domain,
          `${config.domain}-synth-${idCounter++}`
        );

        if (pair.quality >= minQuality) {
          pairs.push(pair);
          commandPairCount++;
        }

        // Generate shuffled variant
        if (shuffleRoles && combo.length >= 2 && commandPairCount < maxPerCommand) {
          const shuffled = [...combo].reverse();
          const shuffledPair = buildTrainingPair(
            schema,
            shuffled,
            language,
            config.domain,
            `${config.domain}-synth-${idCounter++}`
          );
          if (shuffledPair.quality >= minQuality) {
            pairs.push(shuffledPair);
            commandPairCount++;
          }
        }
      }
    }
  }

  const metadata: SynthesisMetadata = {
    domain: config.domain,
    commandCount: schemas.length,
    pairCount: pairs.length,
    bySource: { synthetic: pairs.length },
    languages,
  };

  return { pairs, metadata };
}

// =============================================================================
// Role Combination Generation
// =============================================================================

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

  // 3. Required + all optional (if 2+ optional)
  if (optional.length >= 2) {
    combos.push([...required, ...optional]);
  }

  // Fallback: if no required roles, use all roles
  if (combos.length === 0) {
    combos.push(schema.roles.slice());
  }

  return combos;
}

// =============================================================================
// Pair Building
// =============================================================================

function buildTrainingPair(
  schema: CommandSchema,
  roles: RoleSpec[],
  language: string,
  domain: string,
  id: string
): TrainingPair {
  const sampledRoles = new Map<string, { type: string; value: string | number | boolean }>();

  for (const role of roles) {
    sampledRoles.set(role.role, sampleValue(role));
  }

  // Build SemanticNode for bracket syntax
  const nodeRoles = new Map<string, unknown>();
  for (const [name, sample] of sampledRoles) {
    nodeRoles.set(name, toSemanticValue(sample));
  }
  const node = createCommandNode(schema.action, nodeRoles as never);
  const explicit = renderExplicit(node);

  // Build JSON format
  const jsonRoles: Record<string, SemanticJSONValue> = {};
  for (const [name, sample] of sampledRoles) {
    jsonRoles[name] = sample as SemanticJSONValue;
  }
  const json: SemanticJSON = { action: schema.action, roles: jsonRoles };

  // Build natural language form
  const natural = buildNaturalForm(schema, sampledRoles, language);

  // Quality: synthetic pairs get a base quality, higher if more roles are filled
  const requiredCount = schema.roles.filter(r => r.required).length;
  const filledRequired = roles.filter(r => r.required).length;
  const quality = requiredCount > 0 ? filledRequired / requiredCount : 0.8;

  return {
    id,
    natural,
    language,
    explicit,
    json,
    domain,
    action: schema.action,
    source: 'synthetic',
    quality,
  };
}

/**
 * Build a natural language form from sampled roles.
 * Uses marker overrides for the given language when available.
 */
function buildNaturalForm(
  schema: CommandSchema,
  roles: Map<string, { type: string; value: string | number | boolean }>,
  language: string
): string {
  const parts: string[] = [schema.action];

  for (const roleSpec of schema.roles) {
    const sample = roles.get(roleSpec.role);
    if (!sample) continue;

    const marker = roleSpec.markerOverride?.[language];
    if (marker) {
      parts.push(marker);
    }
    parts.push(String(sample.value));
  }

  return parts.join(' ');
}

// =============================================================================
// Value Sampling
// =============================================================================

function sampleValue(role: RoleSpec): { type: string; value: string | number | boolean } {
  const primaryType = role.expectedTypes[0] || 'expression';

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
