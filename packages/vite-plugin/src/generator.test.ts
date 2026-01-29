/**
 * Generator Tests
 *
 * Tests for tree-shaking bundle generation including:
 * - Parser selection (lite vs hybrid)
 * - No external imports (tree-shaking works)
 * - Bundle size thresholds
 * - Handling of unsupported commands
 * - Valid JavaScript output
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { gzipSync } from 'zlib';
import { Generator } from './generator';
import { canUseLiteParser, LITE_PARSER_COMMANDS } from '@lokascript/core/bundle-generator';
import { FULL_RUNTIME_ONLY_COMMANDS, isAvailableCommand } from '@lokascript/core/bundle-generator';

// Helper to create aggregated usage
function createUsage(commands: string[], blocks: string[] = [], positional = false) {
  return {
    commands: new Set(commands),
    blocks: new Set(blocks),
    positional,
    detectedLanguages: new Set<string>(),
    htmx: {
      hasHtmxAttributes: false,
      hasFixiAttributes: false,
      httpMethods: new Set<string>(),
      swapStrategies: new Set<string>(),
      onHandlers: [] as string[],
      triggerModifiers: new Set<string>(),
      urlManagement: new Set<string>(),
      usesConfirm: false,
    },
    fileUsage: new Map(),
  };
}

// Helper to measure gzip size
function getGzipSize(code: string): number {
  return gzipSync(code).length;
}

describe('Generator', () => {
  let generator: Generator;

  beforeAll(() => {
    generator = new Generator({ debug: false });
  });

  describe('Parser Selection', () => {
    it('should use lite parser for simple commands', () => {
      const usage = createUsage(['toggle', 'add', 'remove']);
      const code = generator.generate(usage, {});

      expect(code).toContain('Parser: lite');
      expect(code).toContain('function parseLite');
      expect(code).not.toContain('class HybridParser');
    });

    it('should use hybrid parser when blocks are detected', () => {
      const usage = createUsage(['toggle', 'set'], ['if']);
      const code = generator.generate(usage, {});

      expect(code).toContain('Parser: hybrid');
      expect(code).toContain('class HybridParser');
      expect(code).not.toContain('function parseLite');
    });

    it('should use hybrid parser when positional expressions are detected', () => {
      const usage = createUsage(['toggle'], [], true);
      const code = generator.generate(usage, {});

      expect(code).toContain('Parser: hybrid');
      expect(code).toContain('class HybridParser');
    });

    it('should use hybrid parser for complex commands like fetch', () => {
      // fetch requires expression parsing for URL
      const usage = createUsage(['toggle', 'set'], ['fetch']);
      const code = generator.generate(usage, {});

      expect(code).toContain('Parser: hybrid');
    });

    it('should use hybrid parser for transition command', () => {
      // transition has complex argument parsing
      const usage = createUsage(['transition']);
      const code = generator.generate(usage, {});

      // transition isn't in LITE_PARSER_COMMANDS, so should use hybrid
      expect(code).toContain('Parser: hybrid');
    });
  });

  describe('No External Imports (Tree-Shaking)', () => {
    it('should NOT import from @lokascript/core/parser', () => {
      const usage = createUsage(['toggle', 'add']);
      const code = generator.generate(usage, {});

      expect(code).not.toContain("from '@lokascript/core/parser");
      expect(code).not.toContain('from "@lokascript/core/parser');
      expect(code).not.toContain('import { HybridParser');
    });

    it('should NOT import from external modules for lite bundle', () => {
      const usage = createUsage(['toggle']);
      const code = generator.generate(usage, {});

      // Should only have the embedded parser, no imports
      expect(code).not.toMatch(/^import .+ from ['"][^.]/m);
    });

    it('should embed parser code directly in bundle', () => {
      const liteUsage = createUsage(['toggle', 'add']);
      const liteCode = generator.generate(liteUsage, {});
      expect(liteCode).toContain('// Embedded lite parser');
      expect(liteCode).toContain('function parseLite');

      const hybridUsage = createUsage(['toggle'], ['if']);
      const hybridCode = generator.generate(hybridUsage, {});
      expect(hybridCode).toContain('// Embedded hybrid parser');
      expect(hybridCode).toContain('class HybridParser');
    });
  });

  describe('Bundle Size Thresholds', () => {
    it('lite bundle with 3 commands should be under 5 KB gzipped', () => {
      const usage = createUsage(['toggle', 'add', 'remove']);
      const code = generator.generate(usage, {});
      const size = getGzipSize(code);

      expect(size).toBeLessThan(5 * 1024); // 5 KB
      // Should be around 3-4 KB
      expect(size).toBeGreaterThan(2 * 1024); // At least 2 KB (sanity check)
    });

    it('hybrid bundle with blocks should be under 15 KB gzipped', () => {
      // Note: 'fetch' is a block, not a command
      const usage = createUsage(['toggle', 'add', 'set'], ['if', 'repeat', 'fetch']);
      const code = generator.generate(usage, {});
      const size = getGzipSize(code);

      expect(size).toBeLessThan(15 * 1024); // 15 KB
      // Should be around 8-12 KB
      expect(size).toBeGreaterThan(5 * 1024); // At least 5 KB (sanity check)
    });

    it('lite bundle should be smaller than hybrid bundle', () => {
      const liteUsage = createUsage(['toggle', 'add', 'remove']);
      const liteCode = generator.generate(liteUsage, {});
      const liteSize = getGzipSize(liteCode);

      const hybridUsage = createUsage(['toggle', 'add', 'remove'], ['if']);
      const hybridCode = generator.generate(hybridUsage, {});
      const hybridSize = getGzipSize(hybridCode);

      expect(liteSize).toBeLessThan(hybridSize);
      // Lite should be significantly smaller (at least 2x)
      expect(liteSize * 2).toBeLessThan(hybridSize);
    });
  });

  describe('Valid JavaScript Output', () => {
    it('lite bundle should be valid JavaScript', () => {
      const usage = createUsage(['toggle', 'add', 'remove']);
      const code = generator.generate(usage, {});

      // Remove ES module syntax for eval
      const testCode = code
        .replace(/export default api;/, '')
        .replace(/export \{ api, processElements \};/, '');

      // Create mock environment
      const mockEnv = `
        const document = { querySelectorAll: () => [], body: {}, readyState: 'complete' };
        const window = {};
        const console = { log: () => {}, warn: () => {}, error: () => {} };
      `;

      expect(() => new Function(mockEnv + testCode)).not.toThrow();
    });

    it('hybrid bundle should be valid JavaScript', () => {
      const usage = createUsage(['toggle', 'set'], ['if', 'repeat']);
      const code = generator.generate(usage, {});

      const testCode = code
        .replace(/export default api;/, '')
        .replace(/export \{ api, processElements \};/, '');

      const mockEnv = `
        const document = { querySelectorAll: () => [], body: {}, readyState: 'complete' };
        const window = {};
        const console = { log: () => {}, warn: () => {}, error: () => {} };
      `;

      expect(() => new Function(mockEnv + testCode)).not.toThrow();
    });
  });

  describe('Full Runtime Fallback', () => {
    it('should fall back to full runtime when full-runtime-only commands detected', () => {
      // 'async' and 'js' are full-runtime-only commands
      const usage = createUsage(['toggle', 'async', 'js']);
      const code = generator.generate(usage, {});

      // Should generate full runtime fallback bundle
      expect(code).toContain('@lokascript/core/browser');
      expect(code).toContain('Dev Fallback Bundle');
      // Should NOT contain tree-shaken code
      expect(code).not.toContain("case 'toggle'");
    });

    it('should fall back to full runtime for swap command (not yet supported)', () => {
      const usage = createUsage(['toggle', 'swap', 'add']);
      const code = generator.generate(usage, {});

      // Should generate full runtime fallback bundle for swap
      expect(code).toContain('@lokascript/core/browser');
      expect(code).toContain('Dev Fallback Bundle');
    });

    it('should generate tree-shaken bundle with morph and morphlex import', () => {
      const usage = createUsage(['toggle', 'morph', 'add']);
      const code = generator.generate(usage, {});

      // morph is now supported in tree-shaken bundles with morphlex
      expect(code).not.toContain('Dev Fallback Bundle');
      expect(code).toContain(
        "import { morph as morphlexMorph, morphInner as morphlexMorphInner } from 'morphlex'"
      );
      expect(code).toContain("case 'toggle'");
      expect(code).toContain("case 'morph'");
      expect(code).toContain('Morphing: morphlex');
    });

    it('should identify full-runtime-only commands', () => {
      // These commands require full runtime
      const fullRuntimeCommands = ['async', 'make', 'swap'];

      for (const cmd of fullRuntimeCommands) {
        expect(FULL_RUNTIME_ONLY_COMMANDS).toContain(cmd);
        expect(isAvailableCommand(cmd)).toBe(false);
      }

      // These are now available in tree-shaken bundles
      expect(FULL_RUNTIME_ONLY_COMMANDS).not.toContain('morph');
      expect(FULL_RUNTIME_ONLY_COMMANDS).not.toContain('js');
      expect(FULL_RUNTIME_ONLY_COMMANDS).not.toContain('copy');
      expect(FULL_RUNTIME_ONLY_COMMANDS).not.toContain('beep');
      expect(FULL_RUNTIME_ONLY_COMMANDS).not.toContain('halt');
      expect(FULL_RUNTIME_ONLY_COMMANDS).not.toContain('exit');
      expect(FULL_RUNTIME_ONLY_COMMANDS).not.toContain('throw');
      expect(FULL_RUNTIME_ONLY_COMMANDS).not.toContain('push');
      expect(FULL_RUNTIME_ONLY_COMMANDS).not.toContain('replace');
      expect(isAvailableCommand('morph')).toBe(true);
      expect(isAvailableCommand('js')).toBe(true);
      expect(isAvailableCommand('copy')).toBe(true);
    });

    it('should use requiresFullRuntime method correctly', () => {
      // Commands that require full runtime
      expect(generator.requiresFullRuntime(['toggle', 'async'])).toBe(true);
      expect(generator.requiresFullRuntime(['swap'])).toBe(true);
      expect(generator.requiresFullRuntime(['bind', 'persist'])).toBe(true);

      // Commands that don't require full runtime (including morph now)
      expect(generator.requiresFullRuntime(['toggle', 'add', 'remove'])).toBe(false);
      expect(generator.requiresFullRuntime(['set', 'log', 'wait'])).toBe(false);
      expect(generator.requiresFullRuntime(['morph'])).toBe(false);
    });

    it('should generate tree-shaken bundle when all commands are available', () => {
      const usage = createUsage(['toggle', 'add', 'remove', 'set']);
      const code = generator.generate(usage, {});

      // Should generate tree-shaken bundle, not fallback
      expect(code).not.toContain('@lokascript/core/browser');
      expect(code).toContain("case 'toggle'");
      expect(code).toContain("case 'add'");
    });
  });

  describe('canUseLiteParser Helper', () => {
    it('should return true for simple commands only', () => {
      expect(canUseLiteParser(['toggle', 'add', 'remove'], [], false)).toBe(true);
      expect(canUseLiteParser(['set', 'log', 'wait'], [], false)).toBe(true);
    });

    it('should return false when blocks are present', () => {
      expect(canUseLiteParser(['toggle'], ['if'], false)).toBe(false);
      expect(canUseLiteParser(['toggle'], ['repeat'], false)).toBe(false);
    });

    it('should return false when positional is true', () => {
      expect(canUseLiteParser(['toggle'], [], true)).toBe(false);
    });

    it('should return false for commands not in LITE_PARSER_COMMANDS', () => {
      // transition is not in LITE_PARSER_COMMANDS
      expect(canUseLiteParser(['transition'], [], false)).toBe(false);
      // increment is not in LITE_PARSER_COMMANDS
      expect(canUseLiteParser(['increment'], [], false)).toBe(false);
    });

    it('should list correct commands in LITE_PARSER_COMMANDS', () => {
      const expected = [
        'toggle',
        'add',
        'remove',
        'put',
        'set',
        'log',
        'send',
        'wait',
        'show',
        'hide',
      ];
      expect([...LITE_PARSER_COMMANDS].sort()).toEqual(expected.sort());
    });
  });

  describe('Generated API Object', () => {
    it('should include correct parserName in api', () => {
      const liteUsage = createUsage(['toggle']);
      const liteCode = generator.generate(liteUsage, {});
      expect(liteCode).toContain("parserName: 'lite'");

      const hybridUsage = createUsage(['toggle'], ['if']);
      const hybridCode = generator.generate(hybridUsage, {});
      expect(hybridCode).toContain("parserName: 'hybrid'");
    });

    it('should include commands array in api', () => {
      const usage = createUsage(['toggle', 'add', 'remove']);
      const code = generator.generate(usage, {});
      expect(code).toContain('commands: ["toggle","add","remove"]');
    });

    it('should include blocks array when blocks are used', () => {
      const usage = createUsage(['toggle'], ['if', 'repeat']);
      const code = generator.generate(usage, {});
      expect(code).toContain('blocks: ["if","repeat"]');
    });
  });

  describe('Empty Bundle', () => {
    it('should generate empty bundle when no commands detected', () => {
      const usage = createUsage([]);
      const code = generator.generate(usage, {});

      expect(code).toContain('LokaScript Empty Bundle');
      expect(code).toContain("parserName: 'none'");
    });
  });

  describe('Extra Commands Option', () => {
    it('should include extra commands from options', () => {
      const usage = createUsage(['toggle']);
      const code = generator.generate(usage, { extraCommands: ['set', 'log'] });

      expect(code).toContain("case 'toggle'");
      expect(code).toContain("case 'set'");
      expect(code).toContain("case 'log'");
    });

    it('should include extra blocks from options', () => {
      const usage = createUsage(['toggle']);
      const code = generator.generate(usage, { extraBlocks: ['if'] });

      expect(code).toContain('Parser: hybrid'); // blocks require hybrid
      expect(code).toContain("case 'if'");
    });
  });
});

describe('Vite Integration Edge Cases', () => {
  let generator: Generator;

  beforeAll(() => {
    generator = new Generator({ debug: false });
  });

  describe('When Full Runtime is Required', () => {
    it('should automatically fall back to full runtime when advanced commands detected', () => {
      // When user uses commands that need full runtime,
      // the generator should automatically fall back to full bundle
      const usage = createUsage(['toggle', 'async', 'bind', 'persist']);
      const code = generator.generate(usage, {});

      // Should generate full runtime fallback
      expect(code).toContain('@lokascript/core/browser');
      expect(code).toContain('Dev Fallback Bundle');
      // Should NOT contain tree-shaken code
      expect(code).not.toContain("case 'toggle'");
    });

    it('should provide generateDevFallback method for explicit fallback', () => {
      // The generator has a generateDevFallback method for explicit fallback
      const devFallbackCode = generator.generateDevFallback('full');

      expect(devFallbackCode).toContain('@lokascript/core/browser');
      expect(devFallbackCode).toContain('Dev Fallback Bundle');
    });

    it('should provide hybrid-complete fallback option', () => {
      const hybridFallbackCode = generator.generateDevFallback('hybrid-complete');

      expect(hybridFallbackCode).toContain('@lokascript/core/browser/hybrid-complete');
      expect(hybridFallbackCode).toContain('Dev Fallback Bundle');
    });
  });

  describe('HTMX Integration', () => {
    it('should add htmx event listener when htmx option is true', () => {
      const usage = createUsage(['toggle']);
      const code = generator.generate(usage, { htmx: true });

      expect(code).toContain('htmx:afterSettle');
    });

    it('should not add htmx event listener when htmx option is false', () => {
      const usage = createUsage(['toggle']);
      const code = generator.generate(usage, { htmx: false });

      expect(code).not.toContain('htmx:afterSettle');
    });
  });

  describe('Global Name Option', () => {
    it('should use custom global name', () => {
      const usage = createUsage(['toggle']);
      const code = generator.generate(usage, { globalName: 'myApp' });

      expect(code).toContain('window.myApp = api');
    });

    it('should default to hyperfixi global name', () => {
      const usage = createUsage(['toggle']);
      const code = generator.generate(usage, {});

      expect(code).toContain('window.hyperfixi = api');
    });
  });
});
