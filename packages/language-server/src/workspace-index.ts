/**
 * The symbol tables of the workspace's files that are not open in the editor.
 *
 * A behavior is usually defined in one file and installed from others, so
 * Go to Definition, Find References, Rename and completion have to see past
 * the open documents. This walks the workspace folders for hyperscript-bearing
 * files (`.html`, `.htm`, `.hs`, `._hs`), builds each one's symbol table, and
 * keeps it until the file's size or modification time changes.
 *
 * It is refreshed on demand, not by a watcher: a request that needs the
 * workspace calls `tables()`, which re-lists the folders when the last
 * listing is older than `LIST_TTL_MS` and re-reads only the files that
 * changed. A file saved by another program is therefore seen by the next
 * request after that interval, with no client capability involved.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import type { SymbolTable } from './symbol-table.js';

const EXTENSIONS = ['.html', '.htm', '.hs', '._hs'];
/** Directories that hold other people's files or build output. */
const SKIPPED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  'build',
  'out',
  'coverage',
  'vendor',
  'target',
  '__pycache__',
]);
const LIST_TTL_MS = 2000;
/** Past these the index says so and stops, so a huge tree cannot stall a request. */
export const MAX_FILES = 2000;
const MAX_FILE_BYTES = 1024 * 1024;

export interface IndexedFile {
  uri: string;
  table: SymbolTable;
}

export interface WorkspaceIndex {
  /** The tables of every indexed file `isOpen` does not claim. */
  tables(): IndexedFile[];
}

export interface WorkspaceIndexOptions {
  /** Workspace folders, as `file:` URIs. Others are ignored. */
  roots: string[];
  build(uri: string, text: string): SymbolTable;
  /** Open documents are the editor's: their text is not the file's. */
  isOpen(uri: string): boolean;
  log(message: string): void;
  now?: () => number;
}

interface Entry {
  mtimeMs: number;
  size: number;
  table: SymbolTable;
}

export function createWorkspaceIndex(options: WorkspaceIndexOptions): WorkspaceIndex {
  const now = options.now ?? Date.now;
  const roots = options.roots.filter(uri => uri.startsWith('file:')).map(uri => fileURLToPath(uri));
  const entries = new Map<string, Entry>();
  let listedAt = -Infinity;
  let paths: string[] = [];
  let saidTooMany = false;

  function list(): string[] {
    const found: string[] = [];
    const walk = (directory: string): void => {
      if (found.length >= MAX_FILES) return;
      let names: import('fs').Dirent[];
      try {
        names = readdirSync(directory, { withFileTypes: true });
      } catch {
        return;
      }
      for (const item of names) {
        if (found.length >= MAX_FILES) return;
        if (item.name.startsWith('.') && item.name !== '.') continue;
        const path = join(directory, item.name);
        if (item.isDirectory()) {
          if (!SKIPPED_DIRECTORIES.has(item.name)) walk(path);
        } else if (item.isFile() && EXTENSIONS.some(ext => item.name.endsWith(ext))) {
          found.push(path);
        }
      }
    };
    for (const root of roots) walk(root);
    if (found.length >= MAX_FILES && !saidTooMany) {
      saidTooMany = true;
      options.log(
        `workspace index: stopped at ${MAX_FILES} files; names defined in the rest of the workspace will not resolve across files`
      );
    }
    return found;
  }

  function refresh(): void {
    if (now() - listedAt >= LIST_TTL_MS) {
      paths = list();
      listedAt = now();
      const listed = new Set(paths);
      for (const path of entries.keys()) if (!listed.has(path)) entries.delete(path);
    }
    for (const path of paths) {
      const uri = pathToFileURL(path).href;
      if (options.isOpen(uri)) continue;
      let stat: import('fs').Stats;
      try {
        stat = statSync(path);
      } catch {
        entries.delete(path);
        continue;
      }
      const known = entries.get(path);
      if (known && known.mtimeMs === stat.mtimeMs && known.size === stat.size) continue;
      if (stat.size > MAX_FILE_BYTES) {
        entries.delete(path);
        continue;
      }
      try {
        const table = options.build(uri, readFileSync(path, 'utf8'));
        entries.set(path, { mtimeMs: stat.mtimeMs, size: stat.size, table });
      } catch (error) {
        entries.delete(path);
        options.log(`workspace index: ${path} not indexed: ${error}`);
      }
    }
  }

  return {
    tables(): IndexedFile[] {
      if (roots.length === 0) return [];
      refresh();
      const result: IndexedFile[] = [];
      for (const [path, entry] of entries) {
        const uri = pathToFileURL(path).href;
        if (!options.isOpen(uri)) result.push({ uri, table: entry.table });
      }
      return result;
    },
  };
}
