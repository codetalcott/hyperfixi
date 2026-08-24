#!/usr/bin/env tsx
/**
 * Agent-loop benchmark CLI.
 *
 *   verify-references            every reference parses and has a usable signature
 *   list [--json]                the task prompts, for a generator to answer
 *   feedback --task <id> --code <src>   what the loop hands back for one candidate
 *   score --run <file>           score a run file; prints per-condition rates + delta
 *
 * The generator is an AGENT, not this script: the loop being measured is the one
 * a real integration runs, so simulating it in-process would measure a
 * simulation. `list` emits the prompts, the agent answers them, `score` grades
 * the answers. See README.md for the protocol.
 *
 * `feedback` deliberately returns ONLY what the MCP loop returns — diagnostics
 * and the parsed IR. It never reveals the reference or whether the candidate
 * behaves correctly. An agent iterating with `feedback` therefore has exactly
 * the information the real loop gives it; leaking the behavior verdict would
 * turn the loop condition into an oracle and the headline delta into fiction.
 */

import { readFileSync } from 'node:fs';
import { TASKS, taskById } from './tasks.js';
import { VARIANTS } from './variants.js';
import {
  bandOf,
  executeCandidate,
  scoreCandidate,
  scoreCondition,
  validateCandidate,
  type Band,
  type ConditionScore,
} from './harness.js';

interface RunFile {
  generator?: Record<string, unknown>;
  conditions: Record<string, Record<string, string>>;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const pct = (n: number): string => `${(n * 100).toFixed(0)}%`;

// =============================================================================
// verify-references
// =============================================================================

async function verifyReferences(): Promise<number> {
  let bad = 0;
  const seen = new Map<string, string>();
  for (const task of TASKS) {
    const validation = await validateCandidate(task.reference);
    const { effects, error } = await executeCandidate(task, task.reference);
    const problems: string[] = [];
    if (!validation.ok) problems.push('reference does not parse');
    if (effects.length === 0) problems.push('reference produces NO effect signature');
    if (error) problems.push(`error: ${error}`);
    // Two tasks with identical signatures would let a candidate score right on
    // the wrong task; not fatal (fixtures legitimately overlap) but worth saying.
    const key = JSON.stringify(effects);
    const twin = seen.get(key);
    if (effects.length > 0 && twin) problems.push(`signature identical to ${twin}`);
    if (effects.length > 0) seen.set(key, task.id);

    if (problems.length > 0) {
      bad++;
      console.log(`✗ ${task.id}: ${problems.join('; ')}`);
      console.log(`    ${task.reference}`);
    } else {
      console.log(`✓ ${task.id}  ${effects.length} effect(s)`);
    }
  }
  console.log(
    bad === 0
      ? `\nAll ${TASKS.length} references usable.`
      : `\n${bad}/${TASKS.length} references UNUSABLE — fix before scoring.`
  );
  return bad === 0 ? 0 : 1;
}

// =============================================================================
// list / feedback
// =============================================================================

function list(): number {
  if (process.argv.includes('--json')) {
    console.log(
      JSON.stringify(
        TASKS.map(t => ({ id: t.id, prompt: t.prompt })),
        null,
        2
      )
    );
    return 0;
  }
  for (const t of TASKS) console.log(`${t.id}\n  ${t.prompt}\n`);
  return 0;
}

async function feedback(): Promise<number> {
  const id = arg('task');
  const code = arg('code');
  if (!id || code === undefined) {
    console.error('usage: feedback --task <id> --code "<hyperscript>"');
    return 2;
  }
  if (!taskById(id)) {
    console.error(`unknown task: ${id}`);
    return 2;
  }
  const v = await validateCandidate(code);
  console.log(
    JSON.stringify(
      { ok: v.ok, confidence: v.confidence, parsed: v.summary, diagnostics: v.diagnostics },
      null,
      2
    )
  );
  if (!v.ok) {
    console.log(
      '\nNext step: apply the diagnostics above and re-run. get_code_fixes maps ' +
        'error codes to concrete fixes; get_command_docs lists per-command roles.'
    );
  }
  return 0;
}

// =============================================================================
// score
// =============================================================================

function reportCondition(c: ConditionScore): void {
  console.log(`\n── ${c.condition} ──`);
  for (const s of c.scores) {
    const mark = s.behaviorMatch ? '✓' : s.parsed ? '~' : '✗';
    console.log(`${mark} ${s.taskId.padEnd(22)} ${s.code}`);
    if (!s.behaviorMatch) {
      if (!s.parsed) {
        const first = s.validation.diagnostics.find(d => d.severity === 'error');
        console.log(`    did not parse: ${first?.message ?? 'unknown'}`);
      } else {
        console.log(`    PARSED BUT WRONG — ${s.validation.summary ?? '?'}`);
        console.log(`      got      ${JSON.stringify(s.execution.effects)}`);
        console.log(`      expected ${JSON.stringify(s.referenceEffects)}`);
        if (s.execution.error) console.log(`      error: ${s.execution.error}`);
      }
    }
  }
  for (const m of c.missing) console.log(`✗ ${m.padEnd(22)} (no candidate submitted)`);
  console.log(
    `\n  parse rate     ${pct(c.parseRate)}` +
      `\n  behavior rate  ${pct(c.behaviorRate)}` +
      `\n  parsed-but-wrong ${c.silentlyWrongCount}`
  );
}

async function score(): Promise<number> {
  const file = arg('run');
  if (!file) {
    console.error('usage: score --run <file.json>');
    return 2;
  }
  const run = JSON.parse(readFileSync(file, 'utf8')) as RunFile;
  if (run.generator) console.log(`generator: ${JSON.stringify(run.generator)}`);

  const results: ConditionScore[] = [];
  for (const [condition, candidates] of Object.entries(run.conditions)) {
    const c = await scoreCondition(condition, candidates, TASKS);
    results.push(c);
    reportCondition(c);
  }

  if (results.length >= 2) {
    const [first, last] = [results[0]!, results[results.length - 1]!];
    console.log(`\n══ ${first.condition} → ${last.condition} ══`);
    console.log(`  parse rate     ${pct(first.parseRate)} → ${pct(last.parseRate)}`);
    console.log(`  behavior rate  ${pct(first.behaviorRate)} → ${pct(last.behaviorRate)}`);
    console.log(
      `  parsed-but-wrong ${first.silentlyWrongCount} → ${last.silentlyWrongCount}   (over ${TASKS.length} tasks)`
    );
  }
  return 0;
}

// =============================================================================
// probe-variants
// =============================================================================

/**
 * Score the plausible-phrasing catalogue. Needs no generator: each row is a
 * fixed string, so the result is a reproducible property of the parser.
 *
 * The headline is the SILENT band — phrasings that parse clean, carry no
 * warning, and misbehave. Those are invisible to the validate/repair loop by
 * construction, so they bound how much the loop can ever deliver. Arc 3b work
 * moves rows out of it into `warned-wrong` (wrong but visible), which the loop
 * handles.
 */
async function probeVariants(): Promise<number> {
  const rows: Array<{
    v: (typeof VARIANTS)[number];
    parsed: boolean;
    behaved: boolean;
    band: Band;
    detail: string;
  }> = [];

  for (const v of VARIANTS) {
    const task = taskById(v.taskId);
    if (!task) {
      console.error(`unknown task in variants: ${v.taskId}`);
      return 2;
    }
    const s = await scoreCandidate(task, v.code);
    const band = bandOf(s);
    const detail =
      band === 'correct'
        ? 'ok'
        : band === 'rejected'
          ? 'rejected'
          : band === 'warned-wrong'
            ? `WARNED (${s.validation.diagnostics.find(d => d.severity !== 'info')?.code ?? '?'}) — wrong, but the loop can see it`
            : band === 'silent-noop'
              ? 'SILENT NO-OP'
              : `WRONG EFFECT ${JSON.stringify(s.execution.effects)}`;
    rows.push({ v, parsed: s.parsed, behaved: s.behaviorMatch, band, detail });
  }

  const n = rows.length;

  if (process.argv.includes('--json')) {
    // Baseline shape: sorted by code so the file is diff-stable, and carrying
    // only the deterministic verdict (never timings) so regeneration on another
    // machine produces a byte-identical file. Bands come from harness.bandOf —
    // the same function the ratchet test recomputes with.
    console.log(
      JSON.stringify(
        {
          note:
            'Deterministic parse-vs-behavior verdicts for plausible phrasings. ' +
            'Regenerate with: tsx src/agent-bench/cli.ts probe-variants --json',
          totals: {
            phrasings: n,
            parse: rows.filter(r => r.parsed).length,
            behaveCorrectly: rows.filter(r => r.behaved).length,
            warnedWrong: rows.filter(r => r.band === 'warned-wrong').length,
            silentBand: rows.filter(r => r.band.startsWith('silent')).length,
            silentNoop: rows.filter(r => r.band === 'silent-noop').length,
          },
          phrasings: rows
            .map(r => ({ taskId: r.v.taskId, code: r.v.code, band: r.band }))
            .sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0)),
        },
        null,
        2
      )
    );
    return 0;
  }

  for (const r of rows) {
    const mark = r.behaved
      ? '✓'
      : r.band === 'warned-wrong'
        ? '⚠'
        : r.band === 'rejected'
          ? '✗'
          : '☠';
    console.log(`${mark} ${r.v.taskId.padEnd(20)} ${r.v.code}`);
    if (!r.behaved) console.log(`    ${r.detail}  — ${r.v.rationale}`);
  }

  const parsed = rows.filter(r => r.parsed).length;
  const behaved = rows.filter(r => r.behaved).length;
  const warned = rows.filter(r => r.band === 'warned-wrong').length;
  const silent = rows.filter(r => r.band.startsWith('silent')).length;
  const noop = rows.filter(r => r.band === 'silent-noop').length;
  console.log(
    `\n  ${n} plausible phrasings` +
      `\n  parse            ${parsed}/${n} (${pct(parsed / n)})` +
      `\n  behave correctly ${behaved}/${n} (${pct(behaved / n)})` +
      `\n  ⚠ wrong but WARNED (loop can react): ${warned}/${n}` +
      `\n  ☠ wrong and SILENT: ${silent}/${n} (${pct(silent / n)}) — of which ${noop} do NOTHING at all` +
      `\n\n  The ☠ band is what the validate/repair loop cannot see: no diagnostic,` +
      `\n  no error, nothing for an agent to react to.`
  );
  return 0;
}

// =============================================================================

const commands: Record<string, () => Promise<number> | number> = {
  'verify-references': verifyReferences,
  'probe-variants': probeVariants,
  list,
  feedback,
  score,
};

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? '';
  const run = commands[cmd];
  if (!run) {
    console.error(`usage: cli.ts <${Object.keys(commands).join('|')}> [options]`);
    process.exit(2);
  }
  // Explicit exit: esbuild's daemon keeps the event loop alive (see CLAUDE.md),
  // so a natural return would hang the process after the report is printed.
  process.exit(await run());
}

void main();
