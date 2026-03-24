/**
 * GRAIL YAML configuration loader.
 *
 * Parses grail.yaml into typed condition and affordance definitions.
 * Resolves template variables ({cwd}, {entity}) against a context.
 */

import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

// ---------- Types ----------

export interface GrailConfig {
  version: string;
  domain: { name: string; description?: string };
  conditions: ConditionConfig[];
  affordances: AffordanceConfig[];
}

export interface ConditionConfig {
  name: string;
  description: string;
  eval: {
    type: string;
    cmd: string;
    cwd?: string;
    timeout?: number;
  };
}

export interface AffordanceConfig {
  name: string;
  title?: string;
  preconditions?: string[];
  effects?: string[];
  cost?: number;
  preferred?: boolean;
  confirm?: string;
  action?: {
    type: string;
    cmd: string;
    cwd?: string;
    timeout?: number;
  };
}

// ---------- Template resolution ----------

/**
 * Replace {varName} placeholders in a string with context values.
 */
export function resolveTemplate(template: string, context: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return key in context ? context[key] : match;
  });
}

// ---------- Loader ----------

/**
 * Load and parse a grail.yaml file. Returns the typed config.
 * Throws on missing file, invalid YAML, or missing required fields.
 */
export function loadGrailConfig(yamlPath: string): GrailConfig {
  const raw = readFileSync(yamlPath, 'utf-8');
  const doc = parseYaml(raw);

  if (!doc || typeof doc !== 'object') {
    throw new Error(`grail: invalid YAML at ${yamlPath}`);
  }

  const version = doc.version ?? '1.0';

  const domain = doc.domain ?? { name: 'unknown' };

  const conditions: ConditionConfig[] = (doc.conditions ?? []).map(
    (c: Record<string, unknown>) => ({
      name: c.name as string,
      description: (c.description as string) ?? '',
      eval: c.eval as ConditionConfig['eval'],
    })
  );

  const affordances: AffordanceConfig[] = (doc.affordances ?? []).map(
    (a: Record<string, unknown>) => ({
      name: a.name as string,
      title: (a.title as string) ?? a.name,
      preconditions: (a.preconditions as string[]) ?? [],
      effects: (a.effects as string[]) ?? [],
      cost: (a.cost as number) ?? 1,
      preferred: (a.preferred as boolean) ?? false,
      confirm: (a.confirm as string) ?? '',
      action: a.action as AffordanceConfig['action'],
    })
  );

  return { version, domain, conditions, affordances };
}

/**
 * Find grail.yaml path: GRAIL_YAML env var, or {cwd}/grail.yaml.
 */
export function findGrailYaml(cwd: string): string {
  return process.env.GRAIL_YAML ?? `${cwd}/grail.yaml`;
}
