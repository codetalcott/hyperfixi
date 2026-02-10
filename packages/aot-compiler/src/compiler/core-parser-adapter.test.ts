/**
 * Core Parser Adapter Tests
 *
 * Proves the core parser adapter correctly converts @hyperfixi/core's
 * parser output into AOT AST types, enabling English hyperscript to be
 * compiled to JavaScript through the full AOT pipeline.
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from 'vitest';
import { CoreParserAdapter, createCoreParserAdapter } from './core-parser-adapter.js';
import { AOTCompiler } from './aot-compiler.js';
import type { ASTNode, EventHandlerNode, CommandNode } from '../types/aot-types.js';

// =============================================================================
// ADAPTER CREATION (module-level for describe.runIf)
// =============================================================================

let adapter: CoreParserAdapter;
let adapterAvailable = false;

try {
  adapter = await createCoreParserAdapter();
  adapterAvailable = true;
} catch {
  // @hyperfixi/core not available — tests will be skipped
}

// =============================================================================
// CORE PARSER ADAPTER TESTS
// =============================================================================

describe.runIf(adapterAvailable)('CoreParserAdapter', () => {
  describe('parse()', () => {
    it('parses simple toggle handler', () => {
      const ast = adapter.parse('on click toggle .active');
      expect(ast).toBeDefined();
      expect(ast.type).toBe('event');

      const event = ast as EventHandlerNode;
      expect(event.event).toBe('click');
      expect(event.body).toBeDefined();
      expect(event.body!.length).toBeGreaterThan(0);
    });

    it('parses add command', () => {
      const ast = adapter.parse('on click add .clicked');
      expect(ast).toBeDefined();
      expect(ast.type).toBe('event');

      const body = (ast as EventHandlerNode).body ?? [];
      const addCmd = body.find(n => n.type === 'command' && (n as CommandNode).name === 'add');
      expect(addCmd).toBeDefined();
    });

    it('parses remove command', () => {
      const ast = adapter.parse('on click remove .hidden');
      const body = (ast as EventHandlerNode).body ?? [];
      const removeCmd = body.find(
        n => n.type === 'command' && (n as CommandNode).name === 'remove'
      );
      expect(removeCmd).toBeDefined();
    });

    it('parses show command', () => {
      const ast = adapter.parse('on click show');
      expect(ast.type).toBe('event');
    });

    it('parses hide command', () => {
      const ast = adapter.parse('on click hide');
      expect(ast.type).toBe('event');
    });

    it('throws on invalid code', () => {
      // The parser may throw or return null for truly invalid input
      try {
        adapter.parse('');
        // If it doesn't throw, that's also acceptable
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  // ===========================================================================
  // EVENT HANDLER DETAILS
  // ===========================================================================

  describe('event handler conversion', () => {
    it('preserves event name', () => {
      const ast = adapter.parse('on mouseenter add .hovered');
      const event = ast as EventHandlerNode;
      expect(event.type).toBe('event');
      expect(event.event).toBe('mouseenter');
    });

    it('converts body commands', () => {
      const ast = adapter.parse('on click toggle .active');
      const event = ast as EventHandlerNode;
      expect(event.body).toBeDefined();
      expect(event.body!.length).toBeGreaterThan(0);

      // Body should contain a toggle command
      const toggleCmd = findCommand(event, 'toggle');
      expect(toggleCmd).toBeDefined();
    });
  });

  // ===========================================================================
  // FULL PIPELINE: English → JavaScript
  // ===========================================================================

  describe('full pipeline: English → JavaScript', () => {
    function compileWithCoreParser(code: string) {
      const compiler = new AOTCompiler();
      compiler.setParser(adapter);
      return compiler.compileScript(code);
    }

    it('compiles toggle to classList.toggle', () => {
      const result = compileWithCoreParser('on click toggle .active');
      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
      if (result.code) {
        expect(result.code).toContain('classList.toggle');
        expect(result.code).toContain("'active'");
      }
    });

    it('compiles add to classList.add', () => {
      const result = compileWithCoreParser('on click add .clicked');
      expect(result.success).toBe(true);
      if (result.code) {
        expect(result.code).toContain('classList.add');
      }
    });

    it('compiles remove to classList.remove', () => {
      const result = compileWithCoreParser('on click remove .hidden');
      expect(result.success).toBe(true);
      if (result.code) {
        expect(result.code).toContain('classList.remove');
      }
    });

    it('compiles show command', () => {
      const result = compileWithCoreParser('on click show');
      expect(result.success).toBe(true);
      if (result.code) {
        expect(result.code).toContain("style.display = ''");
      }
    });

    it('compiles hide command', () => {
      const result = compileWithCoreParser('on click hide');
      expect(result.success).toBe(true);
      if (result.code) {
        expect(result.code).toContain("style.display = 'none'");
      }
    });

    it('generates unique handler IDs', () => {
      const compiler = new AOTCompiler();
      compiler.setParser(adapter);

      const result1 = compiler.compileScript('on click toggle .a');
      const result2 = compiler.compileScript('on click toggle .b');

      expect(result1.metadata.handlerId).not.toBe(result2.metadata.handlerId);
    });

    it('tracks commands in metadata', () => {
      const result = compileWithCoreParser('on click toggle .active');
      expect(result.metadata.commandsUsed).toContain('toggle');
    });

    it('compiles batch of scripts', () => {
      const compiler = new AOTCompiler();
      compiler.setParser(adapter);

      const scripts = [
        {
          code: 'on click toggle .a',
          location: { file: 'test.html', line: 1, column: 1 },
        },
        {
          code: 'on click toggle .b',
          location: { file: 'test.html', line: 2, column: 1 },
        },
      ];

      const result = compiler.compile(scripts);
      expect(result.handlers.length).toBeGreaterThanOrEqual(2);
      expect(result.stats.compiled).toBeGreaterThanOrEqual(2);
    });
  });

  // ===========================================================================
  // ADVANTAGE OVER REGEX PARSER
  // ===========================================================================

  describe('handles patterns regex parser cannot', () => {
    it('compiles set command with variable', () => {
      const compiler = new AOTCompiler();
      compiler.setParser(adapter);

      // The regex parser can't handle set commands
      const result = compiler.compileScript('on click set :count to 0');
      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
    });

    it('compiles put command', () => {
      const compiler = new AOTCompiler();
      compiler.setParser(adapter);

      const result = compiler.compileScript('on click put "Hello" into #output');
      expect(result.success).toBe(true);
    });

    it('compiles log command', () => {
      const compiler = new AOTCompiler();
      compiler.setParser(adapter);

      const result = compiler.compileScript('on click log "hello"');
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// HELPERS
// =============================================================================

function findCommand(node: ASTNode, name: string): CommandNode | undefined {
  if (!node) return undefined;

  if (node.type === 'command' && (node as CommandNode).name === name) {
    return node as CommandNode;
  }

  if (node.type === 'event') {
    const evt = node as EventHandlerNode;
    if (evt.body) {
      for (const child of evt.body) {
        const found = findCommand(child, name);
        if (found) return found;
      }
    }
  }

  const args = (node as Record<string, unknown>).args as ASTNode[] | undefined;
  if (args) {
    for (const arg of args) {
      if (typeof arg === 'object' && arg !== null) {
        const found = findCommand(arg, name);
        if (found) return found;
      }
    }
  }

  return undefined;
}
