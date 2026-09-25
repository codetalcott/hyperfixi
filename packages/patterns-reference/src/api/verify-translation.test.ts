/**
 * verifyTranslation() against the REAL schema (scripts/init-db.ts), not a copy:
 * its bug was code that named `pattern_tests` columns the schema does not have,
 * which an inline test schema would have reproduced rather than caught.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SCHEMA } from '../../scripts/init-db';
import { closeDatabase, resetConnection } from '../database/connection';
import { getTranslation, verifyTranslation } from './translations';

describe('verifyTranslation', () => {
  let dir: string;
  let dbPath: string;

  const seed = (rows: Array<[language: string, hyperscript: string, claimed: 0 | 1]>) => {
    const db = new Database(dbPath);
    db.exec(SCHEMA);
    db.prepare(
      `INSERT INTO code_examples (id, title, raw_code, description, feature)
       VALUES ('toggle', 'Toggle', 'on click toggle .active', 'd', 'f')`
    ).run();
    const insert = db.prepare(
      `INSERT INTO pattern_translations (code_example_id, language, hyperscript, confidence, verified_parses)
       VALUES ('toggle', ?, ?, 0.9, ?)`
    );
    for (const row of rows) insert.run(...row);
    db.close();
  };

  const stored = (language: string) => {
    const db = new Database(dbPath, { readonly: true });
    const flag = db
      .prepare(
        `SELECT verified_parses FROM pattern_translations WHERE code_example_id = 'toggle' AND language = ?`
      )
      .get(language) as { verified_parses: number };
    const tests = db
      .prepare(`SELECT test_type, success FROM pattern_tests WHERE language = ?`)
      .all(language) as Array<{ test_type: string; success: number }>;
    db.close();
    return { flag: flag.verified_parses, tests };
  };

  beforeEach(() => {
    resetConnection();
    dir = mkdtempSync(join(tmpdir(), 'verify-translation-'));
    dbPath = join(dir, 'patterns.db');
  });
  afterEach(() => {
    closeDatabase();
    rmSync(dir, { recursive: true, force: true });
  });

  it('records a passing parse in the flag AND as a pattern_tests row', async () => {
    seed([['en', 'on click toggle .active', 0]]);
    // Read first, as a caller would — the read API opens the DB read-only.
    const translation = await getTranslation('toggle', 'en', { dbPath });
    const result = await verifyTranslation(translation!, { dbPath });

    expect(result.parseSuccess).toBe(true);
    expect(stored('en')).toEqual({ flag: 1, tests: [{ test_type: 'parse', success: 1 }] });
  });

  it('clears a stored claim the parser does not back', async () => {
    seed([['ja', '}}} ((( ]]]', 1]]);
    const translation = await getTranslation('toggle', 'ja', { dbPath });
    const result = await verifyTranslation(translation!, { dbPath });

    expect(result.parseSuccess).toBe(false);
    expect(result.errorMessage).toMatch(/rejected/);
    expect(stored('ja')).toEqual({ flag: 0, tests: [{ test_type: 'parse', success: 0 }] });
  });
});
