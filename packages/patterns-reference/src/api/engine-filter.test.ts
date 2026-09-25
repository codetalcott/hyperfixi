/**
 * Engine filtering, against the REAL schema and one pattern per verdict —
 * including NULL, which the CI database (db:init: 19 seed examples, none on a
 * NULL pattern) could not exercise: a "never serves NULL" test against it would
 * pass whether or not the filter existed.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SCHEMA } from '../../scripts/init-db';
import { closeDatabase, resetConnection } from '../database/connection';
import {
  buildFewShotContext,
  getExamplesByCommand,
  getHighQualityExamples,
  getLLMExamples,
  getMostUsedExamples,
} from './llm';
import { getAllPatterns, searchPatterns } from './patterns';

const VERDICTS: Record<string, string | null> = {
  'runs-both': 'both',
  'runs-hyperfixi': 'lokascript',
  'runs-upstream': 'hyperscript',
  'runs-nowhere': null,
};

describe('engine filtering', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(() => {
    resetConnection();
    dir = mkdtempSync(join(tmpdir(), 'engine-filter-'));
    dbPath = join(dir, 'patterns.db');
    const db = new Database(dbPath);
    db.exec(SCHEMA);
    for (const [id, engine] of Object.entries(VERDICTS)) {
      db.prepare(
        `INSERT INTO code_examples (id, title, raw_code, description, feature, engine)
         VALUES (?, ?, ?, 'd', 'f', ?)`
      ).run(id, id, `on click toggle .${id}`, engine);
      db.prepare(
        `INSERT INTO llm_examples (code_example_id, language, prompt, completion, quality_score)
         VALUES (?, 'en', ?, ?, 0.9)`
      ).run(id, `toggle ${id}`, `on click toggle .${id}`);
    }
    db.close();
  });
  afterEach(() => {
    closeDatabase();
    rmSync(dir, { recursive: true, force: true });
  });

  const ids = (rows: Array<{ patternId: string }>) => rows.map(r => r.patternId).sort();

  describe('LLM examples', () => {
    it('never serves an example no engine runs — keyword and fallback paths alike', async () => {
      const everyVerified = ['runs-both', 'runs-hyperfixi', 'runs-upstream'];
      expect(ids(await getLLMExamples('toggle', 'en', 10, { dbPath }))).toEqual(everyVerified);
      expect(ids(await getLLMExamples('', 'en', 10, { dbPath }))).toEqual(everyVerified);
      expect(ids(await getMostUsedExamples('en', 10, { dbPath }))).toEqual(everyVerified);
      expect(ids(await getHighQualityExamples('en', 0, 10, { dbPath }))).toEqual(everyVerified);
      expect(ids(await getExamplesByCommand('toggle', 'en', 10, { dbPath }))).toEqual(
        everyVerified
      );
      expect(await buildFewShotContext('toggle', 'en', 10, { dbPath })).not.toContain(
        'runs-nowhere'
      );
    });

    it('carries each example’s verified engine', async () => {
      const examples = await getLLMExamples('toggle', 'en', 10, { dbPath });
      for (const ex of examples) expect(ex.engine).toBe(VERDICTS[ex.patternId]);
    });

    it('narrows to what one runtime accepts (a both-verified pattern runs on either)', async () => {
      expect(
        ids(await getLLMExamples('toggle', 'en', 10, { dbPath, engine: 'hyperscript' }))
      ).toEqual(['runs-both', 'runs-upstream']);
      expect(
        ids(await getLLMExamples('toggle', 'en', 10, { dbPath, engine: 'lokascript' }))
      ).toEqual(['runs-both', 'runs-hyperfixi']);
      expect(ids(await getLLMExamples('toggle', 'en', 10, { dbPath, engine: 'both' }))).toEqual([
        'runs-both',
      ]);
    });
  });

  describe('pattern catalog', () => {
    const patternIds = (rows: Array<{ id: string }>) => rows.map(r => r.id).sort();

    it('lists every pattern, NULL included, when no engine is asked for', async () => {
      expect(patternIds(await getAllPatterns({}, { dbPath }))).toEqual(
        Object.keys(VERDICTS).sort()
      );
    });

    it('honours the engine option it declares (it used to be ignored)', async () => {
      expect(patternIds(await getAllPatterns({ engine: 'hyperscript' }, { dbPath }))).toEqual([
        'runs-both',
        'runs-upstream',
      ]);
      expect(
        patternIds(await searchPatterns('toggle', { engine: 'lokascript' }, { dbPath }))
      ).toEqual(['runs-both', 'runs-hyperfixi']);
      expect(patternIds(await searchPatterns('toggle', { engine: null }, { dbPath }))).toEqual([
        'runs-nowhere',
      ]);
    });
  });
});
