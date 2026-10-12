/**
 * The hand-written-input gate (M2, reliability row 6).
 *
 * Every other multilingual gate reads what OUR renderer writes. This one reads
 * what a native speaker writes: about twenty tasks (`hand-written-input.tasks.json`),
 * each an English reference source with a fixture and an event, and one input
 * file per language under `hand-written-inputs/` holding the sources a native
 * speaker wrote from the task's English description and the language's word
 * list, without seeing our renders. Each input runs AS WRITTEN on
 * `@hyperfixi/engine` with the adapter (direct-path-shapes.ts's hosts), against
 * upstream `_hyperscript` running the English reference.
 *
 * Per task and language the verdict is one of:
 *   - `accepted`: the input ran and left the DOM the reference leaves;
 *   - `refused`:  the adapter refused the input (translate threw: the writer is told);
 *   - `silent`:   the input ran, or the engine rejected it, with another result.
 *
 * NEVER seed the inputs with our renders: the gate would then measure nothing.
 * With no inputs it reports "no inputs yet" and still checks the references
 * (upstream and the engine run each English source identically).
 *
 * The writer's instructions: `docs-internal/multilingual/HAND_WRITTEN_INPUT.md`.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  initDirectPathHosts,
  type DirectPathCase,
  type DirectPathHosts,
  type PairResult,
} from './direct-path-shapes';

const here = path.dirname(fileURLToPath(import.meta.url));
export const TASKS_FILE = path.join(here, 'hand-written-input.tasks.json');
export const INPUTS_DIR = path.resolve(here, '../../hand-written-inputs');

export interface HandWrittenTask extends DirectPathCase {
  /** What the writer is asked to make the page do, in plain English. */
  ask: string;
}

interface TaskRow {
  id: string;
  ask: string;
  source: string;
  fixture: string;
  installOn: string;
  event: string;
}

export function loadTasks(): HandWrittenTask[] {
  const rows = JSON.parse(readFileSync(TASKS_FILE, 'utf8')) as TaskRow[];
  return rows.map(t => {
    const behavior = /^behavior\s+(\w+)/.exec(t.source);
    return {
      id: `hand-written#${t.id}`,
      ask: t.ask,
      source: t.source,
      fixture: t.fixture,
      installOn: t.installOn,
      event: t.event,
      languages: [],
      ...(behavior ? { behaviorName: behavior[1] } : {}),
    };
  });
}

export interface HandWrittenInput {
  /** The task's id as the tasks file spells it (`t01`). */
  task: string;
  /** The hyperscript the writer wrote, in their language. */
  source: string;
  /** Who wrote it (a name or initials; one file may hold several writers). */
  writer?: string;
}

/** `hand-written-inputs/<lang>.json`: `[{ "task": "t01", "source": "…", "writer": "…" }]`. */
export function loadInputs(dir = INPUTS_DIR): Record<string, HandWrittenInput[]> {
  const inputs: Record<string, HandWrittenInput[]> = {};
  if (!existsSync(dir)) return inputs;
  for (const file of readdirSync(dir).sort()) {
    const m = /^([a-z]{2})\.json$/.exec(file);
    if (!m) continue;
    const rows = JSON.parse(readFileSync(path.join(dir, file), 'utf8')) as HandWrittenInput[];
    inputs[m[1]!] = rows.filter(r => typeof r.source === 'string' && r.source.trim() !== '');
  }
  return inputs;
}

export type Verdict = 'accepted' | 'refused' | 'silent';

export interface HandWrittenResult {
  task: string;
  lang: string;
  writer: string;
  source: string;
  verdict: Verdict;
  pair: PairResult;
}

export function verdictOf(pair: PairResult): Verdict {
  if (pair.ok) return 'accepted';
  if (pair.english.startsWith('✗')) return 'refused';
  return 'silent';
}

export interface ReferenceCheck {
  task: string;
  want: string;
  eng: string;
  holds: boolean;
}

export interface HandWrittenReport {
  references: ReferenceCheck[];
  results: HandWrittenResult[];
  /** Tasks the inputs name that the tasks file does not. */
  unknownTasks: string[];
}

/**
 * Run every input against its task. `hosts` may be shared with another gate;
 * when omitted, one is opened and closed here.
 */
export async function runHandWritten(
  inputs = loadInputs(),
  hosts?: DirectPathHosts
): Promise<HandWrittenReport> {
  const tasks = loadTasks();
  const own = hosts ?? (await initDirectPathHosts());
  try {
    const references: ReferenceCheck[] = [];
    for (const task of tasks) {
      const r = await own.runCase(task);
      references.push({
        task: task.id,
        want: r.want,
        eng: r.eng,
        holds: !r.want.startsWith('✗') && !/^∅( ‖ ∅)*$/.test(r.want) && r.eng === r.want,
      });
    }
    const results: HandWrittenResult[] = [];
    const unknownTasks: string[] = [];
    for (const [lang, rows] of Object.entries(inputs)) {
      for (const row of rows) {
        const task = tasks.find(t => t.id === `hand-written#${row.task}`);
        if (!task) {
          unknownTasks.push(`${lang}:${row.task}`);
          continue;
        }
        const pair = await own.runWritten(task, lang, row.source);
        results.push({
          task: task.id,
          lang,
          writer: row.writer ?? '',
          source: row.source,
          verdict: verdictOf(pair),
          pair,
        });
      }
    }
    return { references, results, unknownTasks };
  } finally {
    if (!hosts) await own.close();
  }
}

/** The report, per task and language, as text. */
export function formatReport(report: HandWrittenReport): string {
  const lines: string[] = [];
  const bad = report.references.filter(r => !r.holds);
  lines.push(
    `references: ${report.references.length - bad.length}/${report.references.length} run the same on upstream and the engine` +
      (bad.length ? ` (NOT: ${bad.map(r => r.task).join(', ')})` : '')
  );
  if (report.results.length === 0) {
    lines.push('hand-written inputs: no inputs yet (hand-written-inputs/<lang>.json)');
    return lines.join('\n');
  }
  const langs = [...new Set(report.results.map(r => r.lang))].sort();
  const counts: Record<Verdict, number> = { accepted: 0, refused: 0, silent: 0 };
  for (const r of report.results) counts[r.verdict]++;
  lines.push(
    `hand-written inputs: ${report.results.length} from ${langs.length} language(s): ` +
      `${counts.accepted} accepted, ${counts.refused} refused, ${counts.silent} silent`
  );
  for (const lang of langs) {
    const rows = report.results.filter(r => r.lang === lang);
    const c: Record<Verdict, number> = { accepted: 0, refused: 0, silent: 0 };
    for (const r of rows) c[r.verdict]++;
    lines.push(`  ${lang}: ${c.accepted} accepted, ${c.refused} refused, ${c.silent} silent`);
    for (const r of rows.filter(x => x.verdict !== 'accepted')) {
      lines.push(`    ${r.verdict.padEnd(8)} ${r.task.replace('hand-written#', '')} ${JSON.stringify(r.source)}`);
      if (r.verdict === 'silent') lines.push(`             got ${r.pair.got} | want ${r.pair.ref}`);
    }
  }
  if (report.unknownTasks.length) lines.push(`unknown tasks: ${report.unknownTasks.join(', ')}`);
  return lines.join('\n');
}
