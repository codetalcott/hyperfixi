import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ServerBridgeConfig } from '../types.js';

const CONFIG_FILENAMES = ['.serverbridgerc.json', '.serverbridgerc', 'serverbridge.config.json'];

/**
 * Load config from file, merging with CLI overrides.
 */
export async function loadConfig(
  cwd: string,
  overrides: Partial<ServerBridgeConfig> = {}
): Promise<ServerBridgeConfig> {
  let fileConfig: Partial<ServerBridgeConfig> = {};

  for (const filename of CONFIG_FILENAMES) {
    try {
      const content = await readFile(join(cwd, filename), 'utf-8');
      fileConfig = JSON.parse(content);
      break;
    } catch {
      // File doesn't exist, try next
    }
  }

  return {
    framework: overrides.framework ?? fileConfig.framework ?? 'express',
    output: overrides.output ?? fileConfig.output ?? './server/routes',
    typescript: overrides.typescript ?? fileConfig.typescript ?? true,
    include: overrides.include ?? fileConfig.include ?? ['**/*.{html,htm}'],
    exclude: overrides.exclude ?? fileConfig.exclude ?? ['node_modules/**', 'dist/**'],
    basePath: overrides.basePath ?? fileConfig.basePath,
    ignore: overrides.ignore ?? fileConfig.ignore,
  };
}
