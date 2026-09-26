/**
 * LLM Examples API, against the REAL schema and a handful of examples whose
 * answers are known, so every assertion here can fail.
 *
 * These tests used to read data/patterns.db (in CI, `db:init`'s few hand-written
 * examples; locally, `populate`'s hundreds) and mostly checked shapes: a length
 * `>= 0`, a forEach over a list that could be empty, `typeof context ===
 * 'string'`, and a usage ordering over counts that were all 0.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { SCHEMA } from '../../scripts/init-db';
import { closeDatabase, getDatabase, resetConnection } from '../database/connection';
import { findRelevantExamples } from '../adapters/llm-adapter';
import {
  buildFewShotContext,
  getExamplesByCommand,
  getHighQualityExamples,
  getLLMExamples,
  getLLMStats,
  getMostUsedExamples,
} from './llm';

// The sync adapter reads the DEFAULT database, so the default must be the
// fixture before connection.ts reads the environment (this runs before imports).
const { dbPath, previousDefault } = await vi.hoisted(async () => {
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const previousDefault = process.env.LSP_DB_PATH;
  const dbPath = join(mkdtempSync(join(tmpdir(), 'llm-api-')), 'patterns.db');
  process.env.LSP_DB_PATH = dbPath;
  return { dbPath, previousDefault };
});

const CODE: Record<string, string> = {
  'p-toggle': 'on click toggle .active',
  'p-add': 'on click add .highlight to me',
  'p-log': 'on click log "hi"',
};

// In insertion (id) order.
const EXAMPLES = [
  {
    pattern: 'p-toggle',
    language: 'en',
    prompt: 'Toggle a class on click',
    quality: 0.95,
    usage: 0,
  },
  {
    pattern: 'p-add',
    language: 'en',
    prompt: 'Add a highlight to the element',
    quality: 0.9,
    usage: 1,
  },
  { pattern: 'p-toggle', language: 'en', prompt: 'Toggle Class', quality: 0.85, usage: 0 },
  { pattern: 'p-log', language: 'en', prompt: 'Log a greeting', quality: 0.7, usage: 5 },
  { pattern: 'p-toggle', language: 'ja', prompt: 'クラスを切り替える', quality: 0.95, usage: 0 },
];

const connOptions = { dbPath };
const prompts = (rows: Array<{ prompt: string }>) => rows.map(r => r.prompt);

beforeEach(() => {
  resetConnection();
  rmSync(dbPath, { force: true });
  const db = new Database(dbPath);
  db.exec(SCHEMA);
  for (const [id, code] of Object.entries(CODE)) {
    db.prepare(
      `INSERT INTO code_examples (id, title, raw_code, description, feature, engine)
       VALUES (?, ?, ?, 'd', 'f', 'both')`
    ).run(id, id, code);
  }
  for (const ex of EXAMPLES) {
    const completion = ex.language === 'en' ? CODE[ex.pattern] : 'クリック で .active を 切り替え';
    db.prepare(
      `INSERT INTO llm_examples (code_example_id, language, prompt, completion, quality_score, usage_count)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(ex.pattern, ex.language, ex.prompt, completion, ex.quality, ex.usage);
  }
  db.close();
});

afterAll(() => {
  closeDatabase();
  rmSync(dirname(dbPath), { recursive: true, force: true });
  if (previousDefault === undefined) delete process.env.LSP_DB_PATH;
  else process.env.LSP_DB_PATH = previousDefault;
});

describe('getLLMExamples', () => {
  it('matches a keyword in the prompt or the code, best first', async () => {
    expect(prompts(await getLLMExamples('toggle class', 'en', 5, connOptions))).toEqual([
      'Toggle a class on click',
      'Toggle Class',
    ]);
  });

  it('falls back to the best examples when the prompt has no keyword', async () => {
    // `make` and `it` are stop words.
    expect(prompts(await getLLMExamples('make it', 'en', 2, connOptions))).toEqual([
      'Toggle a class on click',
      'Add a highlight to the element',
    ]);
  });

  it('serves only the language asked for', async () => {
    expect(prompts(await getLLMExamples('make it', 'ja', 5, connOptions))).toEqual([
      'クラスを切り替える',
    ]);
    expect(prompts(await getLLMExamples('make it', 'en', 5, connOptions))).not.toContain(
      'クラスを切り替える'
    );
  });

  it('returns at most `limit`', async () => {
    // `click` is in every English completion.
    expect(await getLLMExamples('click', 'en', 3, connOptions)).toHaveLength(3);
    expect(await getLLMExamples('click', 'en', 1, connOptions)).toHaveLength(1);
  });

  it('maps every field', async () => {
    const [example] = await getLLMExamples('toggle class', 'en', 1, connOptions);
    expect(example).toMatchObject({
      patternId: 'p-toggle',
      language: 'en',
      prompt: 'Toggle a class on click',
      completion: 'on click toggle .active',
      qualityScore: 0.95,
      usageCount: 0,
      engine: 'both',
    });
    expect(typeof example!.id).toBe('number');
    expect(Number.isNaN(example!.createdAt.getTime())).toBe(false);
  });
});

describe('getExamplesByCommand', () => {
  it('returns the examples whose code uses the command', async () => {
    const found = await getExamplesByCommand('add', 'en', 5, connOptions);
    expect(found.map(e => e.completion)).toEqual(['on click add .highlight to me']);
    expect(await getExamplesByCommand('fetch', 'en', 5, connOptions)).toEqual([]);
  });
});

describe('getHighQualityExamples', () => {
  it('keeps the examples at or above the floor, best first', async () => {
    expect(prompts(await getHighQualityExamples('en', 0.9, 10, connOptions))).toEqual([
      'Toggle a class on click',
      'Add a highlight to the element',
    ]);
  });

  it('defaults to a floor of 0.8', async () => {
    expect(prompts(await getHighQualityExamples('en', undefined, undefined, connOptions))).toEqual([
      'Toggle a class on click',
      'Add a highlight to the element',
      'Toggle Class',
    ]);
  });
});

describe('getMostUsedExamples (deprecated)', () => {
  it('orders by the stored usage count, whatever the quality', async () => {
    expect(prompts(await getMostUsedExamples('en', 2, connOptions))).toEqual([
      'Log a greeting',
      'Add a highlight to the element',
    ]);
  });
});

describe('buildFewShotContext', () => {
  it('lays out each example as a task and its code, then the request', async () => {
    expect(await buildFewShotContext('toggle class', 'en', 2, connOptions)).toBe(
      'Here are some example hyperscript patterns:\n\n' +
        'Task: Toggle a class on click\nCode: on click toggle .active\n\n' +
        'Task: Toggle Class\nCode: on click toggle .active\n\n' +
        'Now generate hyperscript for: toggle class\n'
    );
  });

  it('includes as many examples as asked for', async () => {
    const context = await buildFewShotContext('click', 'en', 3, connOptions);
    expect(context.match(/^Task: /gm)).toHaveLength(3);
  });

  it('is empty when no example matches', async () => {
    expect(await buildFewShotContext('zzqq', 'en', 3, connOptions)).toBe('');
  });
});

describe('getLLMStats', () => {
  it('counts examples, languages, quality and usage', async () => {
    expect(await getLLMStats(connOptions)).toEqual({
      total: 5,
      byLanguage: { en: 4, ja: 1 },
      avgQuality: expect.closeTo(0.87, 5),
      totalUsage: 6,
    });
  });
});

describe('reads never write', () => {
  // They used to bump `usage_count` on every example they returned. Through the
  // read-only handle a read opens, that failed silently; through a writable
  // handle opened earlier in the process, it succeeded.
  it('not even through a writable handle', async () => {
    getDatabase(connOptions); // writable, and cached: every read below reuses it
    await getLLMExamples('toggle class', 'en', 5, connOptions);
    await getLLMExamples('make it', 'en', 5, connOptions);
    expect(prompts(findRelevantExamples('toggle class', 'en', 5))).toEqual([
      'Toggle a class on click',
      'Toggle Class',
    ]);
    findRelevantExamples('make it', 'en', 5);
    closeDatabase();

    const db = new Database(dbPath, { readonly: true });
    const usage = db.prepare('SELECT usage_count FROM llm_examples ORDER BY id').all();
    db.close();
    expect(usage).toEqual(EXAMPLES.map(ex => ({ usage_count: ex.usage })));
  });
});
