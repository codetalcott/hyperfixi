/**
 * The production scan reads the project Vite builds (`config.root`), as the dev server's
 * pre-scan does. It read `process.cwd()`, so `vite build app` run from a parent directory
 * bundled the siblings' modules, and a root outside the cwd found nothing (7.3.0 live test).
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hyperfixi } from './index';

type Hooks = {
  configResolved(config: unknown): Promise<void>;
  buildStart(): Promise<void>;
  resolveId(id: string): string | null;
  load(id: string): string | null;
};

let dir: string | null = null;
afterEach(() => {
  vi.restoreAllMocks();
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = null;
});

describe('production scan', () => {
  it('scans config.root, not the working directory', async () => {
    dir = mkdtempSync(join(tmpdir(), 'hfx-root-'));
    const app = join(dir, 'app');
    const sibling = join(dir, 'sibling');
    mkdirSync(app);
    mkdirSync(sibling);
    writeFileSync(join(app, 'index.html'), '<button _="on click hide me">a</button>');
    writeFileSync(join(sibling, 'index.html'), '<button _="on click take .on">b</button>');
    // `vite build app` from the parent: the working directory holds both projects.
    vi.spyOn(process, 'cwd').mockReturnValue(dir);

    const plugin = hyperfixi() as unknown as Hooks;
    await plugin.configResolved({ command: 'build', root: app });
    await plugin.buildStart();
    const bundle = plugin.load(plugin.resolveId('hyperfixi')!)!;

    expect(bundle).toMatch(/\bhide\b/);
    expect(bundle).not.toMatch(/\btake\b/);
  });
});
