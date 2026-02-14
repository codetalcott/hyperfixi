import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generate } from '../generate.js';

describe('generate()', () => {
  const dirs: string[] = [];

  async function makeTempDir(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'sb-gen-'));
    dirs.push(dir);
    return dir;
  }

  afterEach(async () => {
    for (const dir of dirs) {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
    dirs.length = 0;
  });

  it('returns routes and generated files from HTML with fetch', async () => {
    const dir = await makeTempDir();
    await writeFile(
      join(dir, 'index.html'),
      `<button _="on click fetch /api/users as json">Load</button>`
    );

    const result = await generate({ dir });
    expect(result.routes.length).toBeGreaterThanOrEqual(1);
    expect(result.routes[0].path).toBe('/api/users');
    expect(result.generated.files.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty results for empty directory', async () => {
    const dir = await makeTempDir();
    const result = await generate({ dir });
    expect(result.routes).toEqual([]);
    expect(result.generated.files).toHaveLength(0);
  });

  it('selects the correct generator framework', async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, 'page.html'), `<div hx-get="/api/data">Load</div>`);

    const frameworks = ['express', 'hono', 'openapi', 'django', 'fastapi'] as const;
    for (const framework of frameworks) {
      const result = await generate({ dir, framework });
      expect(result.routes).toHaveLength(1);
      expect(result.generated.files.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('respects include/exclude patterns', async () => {
    const dir = await makeTempDir();
    await mkdir(join(dir, 'src'), { recursive: true });
    await mkdir(join(dir, 'vendor'), { recursive: true });

    await writeFile(join(dir, 'src', 'app.html'), `<div hx-get="/api/users">Load</div>`);
    await writeFile(join(dir, 'vendor', 'lib.html'), `<div hx-get="/api/external">Load</div>`);

    const result = await generate({
      dir,
      include: ['src/**/*.html'],
      exclude: ['vendor/**'],
    });

    expect(result.routes).toHaveLength(1);
    expect(result.routes[0].path).toBe('/api/users');
  });

  it('respects ignore patterns for URLs', async () => {
    const dir = await makeTempDir();
    await writeFile(
      join(dir, 'page.html'),
      `<div hx-get="/api/users">Load</div>
       <div hx-get="/external/api/data">Load</div>`
    );

    const result = await generate({
      dir,
      ignore: ['/external/**'],
    });

    expect(result.routes).toHaveLength(1);
    expect(result.routes[0].path).toBe('/api/users');
  });
});
