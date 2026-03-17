/**
 * Behavior Loader Tests
 *
 * Verifies that behavior patterns from the database can be loaded
 * via the loadBehaviors() API with a mock runtime.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { resolve } from 'path';
import { loadBehaviors } from './behavior-loader';
import type { BehaviorRuntime } from './behavior-loader';
import { getBehaviorPatterns } from './patterns';
import { closeDatabase } from '../database/connection';

const TEST_DB_PATH = resolve(__dirname, '../../data/patterns.db');
const connOptions = { dbPath: TEST_DB_PATH, readonly: true };

/**
 * Create a mock runtime that tracks compile/execute calls.
 * Simulates successful compilation with a behavior-shaped AST.
 */
function createMockRuntime() {
  const compiled: string[] = [];
  const executed: string[] = [];

  const runtime: BehaviorRuntime = {
    compileSync(code: string) {
      compiled.push(code);
      // Extract behavior name from source
      const match = code.match(/behavior\s+(\w+)/);
      const name = match?.[1] ?? 'Unknown';
      return {
        ok: true,
        ast: {
          type: 'behavior',
          name,
          parameters: [],
          eventHandlers: [],
          initBlock: null,
        },
      };
    },
    async execute(ast: unknown) {
      executed.push((ast as any).name);
    },
    createContext() {
      return { locals: new Map(), globals: new Map() };
    },
  };

  return { runtime, compiled, executed };
}

describe('loadBehaviors', () => {
  afterAll(() => {
    closeDatabase();
  });

  it('loads all 11 behavior patterns from the database', async () => {
    const { runtime, compiled, executed } = createMockRuntime();
    const result = await loadBehaviors(runtime, { connectionOptions: connOptions });

    expect(result.errors).toEqual([]);
    expect(result.loaded).toHaveLength(11);
    expect(compiled).toHaveLength(11);
    expect(executed).toHaveLength(11);

    // Verify all expected behaviors are loaded
    const expectedIds = [
      'behavior-toggleable',
      'behavior-removable',
      'behavior-autodismiss',
      'behavior-clipboard',
      'behavior-draggable',
      'behavior-clickoutside',
      'behavior-scrollreveal',
      'behavior-tabs',
      'behavior-focustrap',
      'behavior-sortable',
      'behavior-resizable',
    ];
    expect(result.loaded.sort()).toEqual(expectedIds.sort());
  });

  it('filters by name when names option is provided', async () => {
    const { runtime } = createMockRuntime();
    const result = await loadBehaviors(runtime, {
      names: ['Toggleable', 'Clipboard'],
      connectionOptions: connOptions,
    });

    expect(result.errors).toEqual([]);
    expect(result.loaded).toHaveLength(2);
    expect(result.loaded).toContain('behavior-toggleable');
    expect(result.loaded).toContain('behavior-clipboard');
  });

  it('reports compile errors without crashing', async () => {
    const failingRuntime: BehaviorRuntime = {
      compileSync() {
        return { ok: false, errors: [{ message: 'parse error' }] };
      },
      async execute() {},
    };

    const result = await loadBehaviors(failingRuntime, { connectionOptions: connOptions });

    expect(result.loaded).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('compile failed');
  });

  it('reports execute errors without crashing', async () => {
    const throwingRuntime: BehaviorRuntime = {
      compileSync(code: string) {
        return { ok: true, ast: { type: 'behavior', name: 'X' } };
      },
      async execute() {
        throw new Error('execution failed');
      },
    };

    const result = await loadBehaviors(throwingRuntime, { connectionOptions: connOptions });

    expect(result.loaded).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('execute failed');
  });

  it('behavior patterns contain valid hyperscript source', async () => {
    const patterns = await getBehaviorPatterns(connOptions);

    expect(patterns.length).toBe(11);
    for (const pattern of patterns) {
      // Every behavior source should start with "behavior" keyword
      expect(pattern.rawCode).toMatch(/^behavior\s+\w+\(/);
      // And end with "end"
      expect(pattern.rawCode.trimEnd()).toMatch(/\bend$/);
      // Feature should be 'behavior'
      expect(pattern.category).toBe('behavior');
    }
  });
});
