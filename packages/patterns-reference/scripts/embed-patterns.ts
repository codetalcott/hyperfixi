#!/usr/bin/env tsx
/**
 * Generate embeddings for code_examples, pattern_translations, and llm_examples.
 *
 * Usage: tsx scripts/embed-patterns.ts [--db-path <path>] [--model <id>] [--force]
 *
 * Notes:
 * - Uses the "passage: " prefix required by multilingual arctic-embed / e5 family.
 *   The matching runtime query side (in _hyper_min/packages/patterns-api/lib/semantic.js)
 *   uses the "query: " prefix. Keep both in sync.
 * - Output vectors are mean-pooled + L2-normalized (cosine === dot product).
 * - Embeddings are stored as little-endian Float32 BLOBs.
 * - embedding_source_hash = sha256 of the raw (pre-prefix) source text. We skip
 *   rows whose source hash already matches unless --force is given.
 */

import { createHash } from 'crypto';
import { join } from 'path';
import Database from 'better-sqlite3';

const DEFAULT_DB_PATH = join(__dirname, '..', 'data', 'patterns.db');
const DEFAULT_MODEL = 'Snowflake/snowflake-arctic-embed-m-v2.0';
const FALLBACK_MODEL = 'Xenova/multilingual-e5-small';

const args = process.argv.slice(2);
const force = args.includes('--force');
const dbPathIndex = args.indexOf('--db-path');
const dbPath = dbPathIndex >= 0 && args[dbPathIndex + 1] ? args[dbPathIndex + 1] : DEFAULT_DB_PATH;
const modelIndex = args.indexOf('--model');
const requestedModel = modelIndex >= 0 && args[modelIndex + 1] ? args[modelIndex + 1] : DEFAULT_MODEL;

type Row = { rowid: number | string; text: string; currentHash: string | null };

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function f32ToBuffer(vec: Float32Array): Buffer {
  return Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
}

async function loadPipeline(modelId: string) {
  const { pipeline } = await import('@huggingface/transformers');
  try {
    console.log(`Loading model: ${modelId}`);
    return await pipeline('feature-extraction', modelId, { dtype: 'q8' });
  } catch (err) {
    if (modelId !== FALLBACK_MODEL) {
      console.warn(`Failed to load ${modelId}: ${(err as Error).message}`);
      console.warn(`Falling back to ${FALLBACK_MODEL}`);
      return await pipeline('feature-extraction', FALLBACK_MODEL, { dtype: 'q8' });
    }
    throw err;
  }
}

async function embedOne(
  extractor: Awaited<ReturnType<typeof loadPipeline>>,
  text: string,
): Promise<Float32Array> {
  const output = await extractor('passage: ' + text, { pooling: 'mean', normalize: true });
  // output.data is a Float32Array of length [1 * dim]
  return new Float32Array(output.data);
}

async function embedTable(
  db: InstanceType<typeof Database>,
  extractor: Awaited<ReturnType<typeof loadPipeline>>,
  tableName: string,
  pkColumn: string,
  selectSql: string,
): Promise<{ embedded: number; skipped: number }> {
  const rows = db.prepare(selectSql).all() as Row[];
  const update = db.prepare(
    `UPDATE ${tableName} SET embedding = ?, embedding_source_hash = ? WHERE ${pkColumn} = ?`,
  );

  let embedded = 0;
  let skipped = 0;

  console.log(`\n${tableName}: ${rows.length} rows`);
  for (const [i, row] of rows.entries()) {
    const hash = sha256(row.text);
    if (!force && row.currentHash === hash) {
      skipped++;
      continue;
    }
    const vec = await embedOne(extractor, row.text);
    update.run(f32ToBuffer(vec), hash, row.rowid);
    embedded++;
    if ((i + 1) % 25 === 0 || i === rows.length - 1) {
      process.stdout.write(`  ${i + 1}/${rows.length}\r`);
    }
  }
  console.log(`  embedded=${embedded}, skipped=${skipped}`);
  return { embedded, skipped };
}

async function main() {
  console.log(`Database: ${dbPath}`);
  const db = new Database(dbPath);
  const extractor = await loadPipeline(requestedModel);

  const codeResult = await embedTable(
    db,
    extractor,
    'code_examples',
    'id',
    `SELECT id AS rowid,
            COALESCE(title,'') || '\n' || COALESCE(description,'') || '\n' || COALESCE(raw_code,'') AS text,
            embedding_source_hash AS currentHash
     FROM code_examples`,
  );

  const translationResult = await embedTable(
    db,
    extractor,
    'pattern_translations',
    'id',
    `SELECT pt.id AS rowid,
            COALESCE(ce.title,'') || '\n' || COALESCE(ce.description,'') || '\n' || pt.language || '\n' || pt.hyperscript AS text,
            pt.embedding_source_hash AS currentHash
     FROM pattern_translations pt
     JOIN code_examples ce ON ce.id = pt.code_example_id`,
  );

  const llmResult = await embedTable(
    db,
    extractor,
    'llm_examples',
    'id',
    `SELECT id AS rowid,
            language || '\n' || prompt || '\n' || completion AS text,
            embedding_source_hash AS currentHash
     FROM llm_examples`,
  );

  console.log('\nSummary:');
  console.log(`  code_examples:        embedded=${codeResult.embedded}, skipped=${codeResult.skipped}`);
  console.log(`  pattern_translations: embedded=${translationResult.embedded}, skipped=${translationResult.skipped}`);
  console.log(`  llm_examples:         embedded=${llmResult.embedded}, skipped=${llmResult.skipped}`);

  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
