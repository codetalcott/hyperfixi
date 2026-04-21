#!/usr/bin/env tsx
/**
 * Idempotent migration: add `embedding BLOB` and `embedding_source_hash TEXT`
 * columns to code_examples, pattern_translations, and llm_examples on an
 * existing database. Useful when the user doesn't want to run full
 * `npm run populate` (which would also drop & recreate).
 *
 * Usage: tsx scripts/migrate-add-embeddings.ts [--db-path <path>]
 */

import { join } from 'path';
import Database from 'better-sqlite3';

const DEFAULT_DB_PATH = join(__dirname, '..', 'data', 'patterns.db');
const args = process.argv.slice(2);
const dbPathIndex = args.indexOf('--db-path');
const dbPath = dbPathIndex >= 0 && args[dbPathIndex + 1] ? args[dbPathIndex + 1] : DEFAULT_DB_PATH;

const TARGETS: Array<{ table: string; columns: Array<{ name: string; sql: string }> }> = [
  {
    table: 'code_examples',
    columns: [
      { name: 'embedding', sql: 'ALTER TABLE code_examples ADD COLUMN embedding BLOB' },
      { name: 'embedding_source_hash', sql: 'ALTER TABLE code_examples ADD COLUMN embedding_source_hash TEXT' },
    ],
  },
  {
    table: 'pattern_translations',
    columns: [
      { name: 'embedding', sql: 'ALTER TABLE pattern_translations ADD COLUMN embedding BLOB' },
      { name: 'embedding_source_hash', sql: 'ALTER TABLE pattern_translations ADD COLUMN embedding_source_hash TEXT' },
    ],
  },
  {
    table: 'llm_examples',
    columns: [
      { name: 'embedding', sql: 'ALTER TABLE llm_examples ADD COLUMN embedding BLOB' },
      { name: 'embedding_source_hash', sql: 'ALTER TABLE llm_examples ADD COLUMN embedding_source_hash TEXT' },
    ],
  },
];

function columnExists(db: InstanceType<typeof Database>, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((r) => r.name === column);
}

function main() {
  console.log(`Database: ${dbPath}`);
  const db = new Database(dbPath);

  let applied = 0;
  let skipped = 0;
  for (const target of TARGETS) {
    for (const col of target.columns) {
      if (columnExists(db, target.table, col.name)) {
        console.log(`  skip: ${target.table}.${col.name} already exists`);
        skipped++;
        continue;
      }
      db.exec(col.sql);
      console.log(`  add:  ${target.table}.${col.name}`);
      applied++;
    }
  }

  console.log(`\nApplied ${applied} column(s), skipped ${skipped}.`);
  db.close();
}

main();
