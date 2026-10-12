/**
 * The hand-written-input gate: see hand-written-input.ts.
 *
 * @vitest-environment node
 * Required, not a preference: the hosts bind the jsdom window's DOM
 * constructors (see shipped-examples-execution.test.ts).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  formatReport,
  loadInputs,
  loadTasks,
  runHandWritten,
  type HandWrittenReport,
} from './hand-written-input';

describe('hand-written inputs', () => {
  let report: HandWrittenReport;

  beforeAll(async () => {
    report = await runHandWritten();
    console.log(formatReport(report));
  }, 300_000);

  it('has about twenty tasks, each with a reference, a fixture and an event', () => {
    const tasks = loadTasks();
    expect(tasks.length).toBeGreaterThanOrEqual(18);
    expect(tasks.length).toBeLessThanOrEqual(25);
    for (const t of tasks) {
      expect(t.ask.length).toBeGreaterThan(10);
      expect(t.fixture).toContain('<');
      expect(t.event).toBeTruthy();
    }
    expect(new Set(tasks.map(t => t.id)).size).toBe(tasks.length);
  });

  it('every reference runs the same on upstream and the engine, and does something', () => {
    const bad = report.references.filter(r => !r.holds);
    expect(bad.map(r => `${r.task}: upstream ${r.want} | engine ${r.eng}`)).toEqual([]);
  });

  it('every input names a task', () => {
    expect(report.unknownTasks).toEqual([]);
  });

  it('every input file is valid JSON of {task, source, writer} rows', () => {
    for (const rows of Object.values(loadInputs())) {
      for (const r of rows) {
        expect(typeof r.task).toBe('string');
        expect(typeof r.source).toBe('string');
      }
    }
  });

  // No input is seeded here (a render of ours would measure nothing). Once
  // native speakers' files exist, this is where a verdict is held: a `silent`
  // input is a reader bug (the writer was told nothing), to fix or to list.
  it('no hand-written input is silent', () => {
    const silent = report.results.filter(r => r.verdict === 'silent');
    expect(silent.map(r => `${r.lang} ${r.task} ${r.source}`)).toEqual([]);
  });
});
