// @vitest-environment node
/**
 * Live reload's watch rule on the real chokidar (dev-server.test.ts mocks it). chokidar 4 reads
 * no globs, so a rule written as chokidar 3's globs would watch nothing and pass every mocked test.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { watch, type FSWatcher } from 'chokidar';
import { isIgnoredByLiveReload } from './dev-server';

const WATCHED = ['index.html', 'styles/app.css', 'src/app.ts', 'src/main.js', 'data.json'];
const SKIPPED = [
  'notes.txt',
  '.env',
  '.git/config.json',
  'src/.cache/x.js',
  'node_modules/pkg/index.js',
  'dist/bundle.js',
  'build/out.html',
];

describe('isIgnoredByLiveReload', () => {
  let root: string;
  let watcher: FSWatcher | undefined;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'live-reload-'));
    for (const file of [...WATCHED, ...SKIPPED]) {
      mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      writeFileSync(path.join(root, file), '');
    }
  });

  afterEach(async () => {
    await watcher?.close();
    rmSync(root, { recursive: true, force: true });
  });

  it('watches the page files and nothing under skipped directories', async () => {
    // The server watches '.', so the rule sees paths relative to the root
    watcher = watch(root, {
      ignored: (p, stats) => isIgnoredByLiveReload(path.relative(root, p), stats),
    });
    await new Promise<void>(resolve => watcher!.on('ready', () => resolve()));

    const files = Object.entries(watcher.getWatched())
      .flatMap(([dir, names]) => names.map(name => path.join(dir, name)))
      .filter(p => statSync(p, { throwIfNoEntry: false })?.isFile())
      .map(p => path.relative(root, p).split(path.sep).join('/'))
      .sort();

    expect(files).toEqual([...WATCHED].sort());
  });

  it('judges a file by its type only once chokidar knows it is a file', () => {
    expect(isIgnoredByLiveReload('notes.txt')).toBe(false);
    expect(isIgnoredByLiveReload('src')).toBe(false);
    expect(isIgnoredByLiveReload('.')).toBe(false);
    expect(isIgnoredByLiveReload('node_modules')).toBe(true);
  });
});
