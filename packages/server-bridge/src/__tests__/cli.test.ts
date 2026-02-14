import { describe, it, expect, vi } from 'vitest';
import { loadConfig } from '../cli/config.js';

// Test the config loading logic (scan/generate commands are tested via integration)
describe('loadConfig', () => {
  it('returns defaults when no config file exists', async () => {
    const config = await loadConfig('/nonexistent');
    expect(config.framework).toBe('express');
    expect(config.output).toBe('./server/routes');
    expect(config.typescript).toBe(true);
    expect(config.include).toEqual(['**/*.{html,htm}']);
  });

  it('applies CLI overrides', async () => {
    const config = await loadConfig('/nonexistent', {
      framework: 'hono',
      output: './custom/routes',
      typescript: false,
    });
    expect(config.framework).toBe('hono');
    expect(config.output).toBe('./custom/routes');
    expect(config.typescript).toBe(false);
  });

  it('preserves default include/exclude when not overridden', async () => {
    const config = await loadConfig('/nonexistent', { framework: 'hono' });
    expect(config.include).toEqual(['**/*.{html,htm}']);
    expect(config.exclude).toEqual(['node_modules/**', 'dist/**']);
  });
});
