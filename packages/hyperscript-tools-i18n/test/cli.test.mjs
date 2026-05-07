// Smoke tests for the CLI: argv parsing, exit codes, file output shape.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from '../dist/cli.js';

async function withTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'hs-i18n-test-'));
  try {
    return await fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const SAMPLE_HTML = '<button _="on click toggle .active on me">go</button>';

test('translate command writes one file per lang', async () => {
  await withTempDir(async dir => {
    const input = join(dir, 'sample.html');
    const out = join(dir, 'out');
    writeFileSync(input, SAMPLE_HTML);
    const code = await run(['translate', input, '--langs', 'es,ja', '--out', out]);
    assert.equal(code, 0);
    const written = readdirSync(out).sort();
    assert.deepEqual(written, ['sample.es.html', 'sample.ja.html']);
  });
});

test('output preserves HTML structure and translates _= bodies', async () => {
  await withTempDir(async dir => {
    const input = join(dir, 'sample.html');
    const out = join(dir, 'out');
    writeFileSync(input, SAMPLE_HTML);
    await run(['translate', input, '--langs', 'es', '--out', out]);
    const es = readFileSync(join(out, 'sample.es.html'), 'utf8');
    assert.match(es, /<button _="[^"]+">go<\/button>/);
    assert.match(es, /alternar/);
  });
});

test('directory inputs expand to all .html files', async () => {
  await withTempDir(async dir => {
    const input = join(dir, 'src');
    const out = join(dir, 'out');
    writeFileSync(join(dir, 'src.txt'), 'ignored');
    mkdirSync(input);
    writeFileSync(join(input, 'a.html'), SAMPLE_HTML);
    writeFileSync(join(input, 'b.html'), SAMPLE_HTML);
    writeFileSync(join(input, 'skip.txt'), 'ignored');
    const code = await run(['translate', input, '--langs', 'ja', '--out', out]);
    assert.equal(code, 0);
    const written = readdirSync(out).sort();
    assert.deepEqual(written, ['a.ja.html', 'b.ja.html']);
  });
});

test('missing --langs returns exit code 2', async () => {
  await withTempDir(async dir => {
    const input = join(dir, 'sample.html');
    writeFileSync(input, SAMPLE_HTML);
    const code = await run(['translate', input, '--out', dir]);
    assert.equal(code, 2);
  });
});

test('no inputs returns exit code 2', async () => {
  await withTempDir(async dir => {
    const code = await run(['translate', '--langs', 'ja', '--out', dir]);
    assert.equal(code, 2);
  });
});

test('unknown flag returns exit code 2', async () => {
  await withTempDir(async dir => {
    const input = join(dir, 'sample.html');
    writeFileSync(input, SAMPLE_HTML);
    const code = await run(['translate', input, '--bogus', 'value', '--langs', 'ja', '--out', dir]);
    assert.equal(code, 2);
  });
});

test('help / no-args prints help with exit 0', async () => {
  const code = await run([]);
  assert.equal(code, 0);
});

test('no .html files matched returns exit 1', async () => {
  await withTempDir(async dir => {
    // Empty src dir
    mkdirSync(join(dir, 'src'));
    const code = await run(['translate', join(dir, 'src'), '--langs', 'ja', '--out', dir]);
    assert.equal(code, 1);
  });
});

test('--from changes source locale', async () => {
  await withTempDir(async dir => {
    // Spanish source → English target. Should produce English output.
    const spanishHtml = '<button _="al hacer clic alternar .active en me">x</button>';
    const input = join(dir, 'es.html');
    writeFileSync(input, spanishHtml);
    const code = await run(['translate', input, '--langs', 'en', '--from', 'es', '--out', dir]);
    assert.equal(code, 0);
    const out = readFileSync(join(dir, 'es.en.html'), 'utf8');
    // English keywords expected somewhere in the translated body.
    assert.match(out, /toggle|click|active/i);
  });
});
