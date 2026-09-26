/**
 * SearchOptions: every option filters, and the page is taken after the filters.
 *
 * `category`, `difficulty` and `language` were declared on SearchOptions and
 * silently ignored, so each came back with every pattern. These run against the
 * REAL schema with rows built so that ignoring an option, or paging before
 * filtering, changes the answer. (The CI database cannot: `db:init` stores
 * English translations only, all unmeasured.)
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SCHEMA } from '../../scripts/init-db';
import { closeDatabase, resetConnection } from '../database/connection';
import { getAllPatterns, searchPatterns } from './patterns';

const WIRING = '<div sse-connect="/events" sse-swap="tick"></div>';

interface Row {
  id: string;
  feature: string;
  code: string;
  /** The ja translation, and whether it parses (`verified_parses`). */
  ja?: { text: string; parses: 0 | 1 };
}

// Titles sort in id order: one, three, two, wiring.
const ROWS: Row[] = [
  // beginner
  {
    id: 'one',
    feature: 'alpha',
    code: 'on click toggle .one',
    ja: { text: 'クリック で .one を 切り替え', parses: 1 },
  },
  // intermediate (one line, with `then`)
  {
    id: 'two',
    feature: 'alpha',
    code: 'on click add .two then remove .two',
    ja: { text: 'クリック で 壊れた', parses: 0 },
  },
  // advanced (four lines), with no ja row
  { id: 'three', feature: 'beta', code: 'on click\n  add .x\n  wait 1s\n  remove .x' },
  // beginner; markup with no hyperscript, stored as itself
  { id: 'wiring', feature: 'beta', code: WIRING, ja: { text: WIRING, parses: 0 } },
];

describe('SearchOptions', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(() => {
    resetConnection();
    dir = mkdtempSync(join(tmpdir(), 'search-options-'));
    dbPath = join(dir, 'patterns.db');
    const db = new Database(dbPath);
    db.exec(SCHEMA);
    for (const { id, feature, code, ja } of ROWS) {
      db.prepare(
        `INSERT INTO code_examples (id, title, raw_code, description, feature, engine)
         VALUES (?, ?, ?, 'd', ?, 'both')`
      ).run(id, `Title ${id}`, code, feature);
      if (ja) {
        db.prepare(
          `INSERT INTO pattern_translations (code_example_id, language, hyperscript, verified_parses)
           VALUES (?, 'ja', ?, ?)`
        ).run(id, ja.text, ja.parses);
      }
    }
    db.close();
  });
  afterEach(() => {
    closeDatabase();
    rmSync(dir, { recursive: true, force: true });
  });

  const ids = (rows: Array<{ id: string }>) => rows.map(r => r.id);

  it('category', async () => {
    expect(ids(await getAllPatterns({ category: 'alpha' }, { dbPath }))).toEqual(['one', 'two']);
    expect(ids(await searchPatterns('click', { category: 'beta' }, { dbPath }))).toEqual(['three']);
  });

  it('difficulty, as each pattern reports it', async () => {
    for (const difficulty of ['beginner', 'intermediate', 'advanced'] as const) {
      const found = await getAllPatterns({ difficulty }, { dbPath });
      expect(found.length, difficulty).toBeGreaterThan(0);
      for (const pattern of found) expect(pattern.difficulty).toBe(difficulty);
    }
    expect(ids(await getAllPatterns({ difficulty: 'advanced' }, { dbPath }))).toEqual(['three']);
  });

  it('pages AFTER filtering, so a page holds only matching patterns', async () => {
    // Beginner, by title: one, wiring. Paging the unfiltered rows first would
    // land on `three` and filter it away, returning nothing.
    expect(
      ids(await getAllPatterns({ difficulty: 'beginner', limit: 1, offset: 1 }, { dbPath }))
    ).toEqual(['wiring']);
  });

  it('language: a translation that parses there, or nothing to translate', async () => {
    // `two`'s ja row does not parse; `three` has none; `wiring` carries no
    // hyperscript, so it is the same markup in every language.
    expect(ids(await getAllPatterns({ language: 'ja' }, { dbPath }))).toEqual(['one', 'wiring']);
  });

  it("language: the query also matches that language's translation", async () => {
    expect(ids(await searchPatterns('切り替え', { language: 'ja' }, { dbPath }))).toEqual(['one']);
    // Without a language, translations are not searched.
    expect(ids(await searchPatterns('切り替え', {}, { dbPath }))).toEqual([]);
  });

  it('combines with the others', async () => {
    expect(
      ids(await searchPatterns('click', { language: 'ja', category: 'alpha' }, { dbPath }))
    ).toEqual(['one']);
  });
});
