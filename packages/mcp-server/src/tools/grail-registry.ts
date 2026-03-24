/**
 * GRAIL Condition/Affordance Registry.
 *
 * Server-side registry that loads from grail.yaml and evaluates
 * conditions via shell commands. Matches grail-domains registry API.
 */

import { exec } from 'node:child_process';
import type { GrailConfig, ConditionConfig, AffordanceConfig } from './grail-yaml-loader.js';
import { resolveTemplate } from './grail-yaml-loader.js';

// ---------- Types ----------

export interface ConditionResult {
  passing: boolean;
  output: string;
  duration_ms: number;
  error?: string;
}

export interface RunResult {
  success: boolean;
  exitCode: number;
  output: string;
  duration_ms: number;
  cmd: string;
}

export interface CheckResult {
  met: boolean;
  unmet: string[];
}

export interface ConditionMapEntry {
  description: string;
  producedBy: string[];
  requiredBy: string[];
}

// ---------- Shell execution ----------

const MAX_OUTPUT = 500;

function truncate(s: string): string {
  return s.length > MAX_OUTPUT ? s.slice(0, MAX_OUTPUT) + '…' : s;
}

function execShell(
  cmd: string,
  cwd: string,
  timeout: number
): Promise<{ exitCode: number; output: string; duration_ms: number }> {
  return new Promise(resolve => {
    const start = Date.now();
    exec(cmd, { cwd, timeout: timeout * 1000 }, (error, stdout, stderr) => {
      const duration_ms = Date.now() - start;
      const output = truncate((stdout ?? '') + (stderr ?? '')).trim();
      const exitCode = error ? (error.code ?? 1) : 0;
      resolve({ exitCode, output, duration_ms });
    });
  });
}

// ---------- Registry ----------

export class GrailRegistry {
  readonly conditions: Map<string, ConditionConfig> = new Map();
  readonly affordances: Map<string, AffordanceConfig> = new Map();
  private _cwd: string;

  constructor(config: GrailConfig, cwd: string) {
    this._cwd = cwd;
    for (const c of config.conditions) {
      this.conditions.set(c.name, c);
    }
    for (const a of config.affordances) {
      this.affordances.set(a.name, a);
    }
  }

  private _context(): Record<string, string> {
    return { cwd: this._cwd };
  }

  // ---------- Condition evaluation ----------

  async evaluate(name: string): Promise<ConditionResult> {
    const cond = this.conditions.get(name);
    if (!cond) {
      return {
        passing: false,
        output: `Unknown condition: ${name}`,
        duration_ms: 0,
        error: 'unknown',
      };
    }

    const ctx = this._context();
    const cmd = resolveTemplate(cond.eval.cmd, ctx);
    const evalCwd = cond.eval.cwd ? resolveTemplate(cond.eval.cwd, ctx) : this._cwd;
    const timeout = cond.eval.timeout ?? 30;

    try {
      const { exitCode, output, duration_ms } = await execShell(cmd, evalCwd, timeout);
      return { passing: exitCode === 0, output, duration_ms };
    } catch (err) {
      return {
        passing: false,
        output: '',
        duration_ms: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async evaluateAll(): Promise<Record<string, ConditionResult>> {
    const names = [...this.conditions.keys()];

    // Parallel evaluation, capped at 8 concurrent (spec §4.5)
    const results: Record<string, ConditionResult> = {};
    const chunks: string[][] = [];
    for (let i = 0; i < names.length; i += 8) {
      chunks.push(names.slice(i, i + 8));
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(async name => ({ name, result: await this.evaluate(name) }))
      );
      for (const { name, result } of chunkResults) {
        results[name] = result;
      }
    }

    return results;
  }

  // ---------- Affordance checks ----------

  checkPreconditions(affordanceName: string, truth: Record<string, boolean>): CheckResult {
    const aff = this.affordances.get(affordanceName);
    if (!aff) return { met: false, unmet: [`unknown affordance: ${affordanceName}`] };

    const unmet = (aff.preconditions ?? []).filter(p => !truth[p]);
    return { met: unmet.length === 0, unmet };
  }

  // ---------- Affordance execution ----------

  async run(affordanceName: string): Promise<RunResult> {
    const aff = this.affordances.get(affordanceName);
    if (!aff) {
      return {
        success: false,
        exitCode: -1,
        output: `Unknown affordance: ${affordanceName}`,
        duration_ms: 0,
        cmd: '',
      };
    }

    if (!aff.action) {
      return {
        success: false,
        exitCode: -1,
        output: `Affordance ${affordanceName} has no action defined`,
        duration_ms: 0,
        cmd: '',
      };
    }

    const ctx = this._context();
    const cmd = resolveTemplate(aff.action.cmd, ctx);
    const actionCwd = aff.action.cwd ? resolveTemplate(aff.action.cwd, ctx) : this._cwd;
    const timeout = aff.action.timeout ?? 120;

    const { exitCode, output, duration_ms } = await execShell(cmd, actionCwd, timeout);
    return { success: exitCode === 0, exitCode, output, duration_ms, cmd };
  }

  // ---------- Introspection ----------

  conditionMap(): Record<string, ConditionMapEntry> {
    const result: Record<string, ConditionMapEntry> = {};

    for (const [name, cond] of this.conditions) {
      const producedBy: string[] = [];
      const requiredBy: string[] = [];

      for (const [affName, aff] of this.affordances) {
        if (
          (aff.effects ?? []).some(
            e => e === name || (e.includes('{') && this._templateMatches(e, name))
          )
        ) {
          producedBy.push(affName);
        }
        if ((aff.preconditions ?? []).includes(name)) {
          requiredBy.push(affName);
        }
      }

      result[name] = { description: cond.description, producedBy, requiredBy };
    }

    return result;
  }

  enablesGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};

    for (const [affName, aff] of this.affordances) {
      const enables: string[] = [];
      for (const effect of aff.effects ?? []) {
        for (const [otherName, other] of this.affordances) {
          if (otherName === affName) continue;
          if ((other.preconditions ?? []).includes(effect) && !enables.includes(otherName)) {
            enables.push(otherName);
          }
        }
      }
      if (enables.length > 0) {
        graph[affName] = enables;
      }
    }

    return graph;
  }

  private _templateMatches(template: string, condition: string): boolean {
    const braceIdx = template.indexOf('{');
    if (braceIdx === -1) return template === condition;
    const prefix = template.slice(0, braceIdx);
    return condition.startsWith(prefix);
  }
}
