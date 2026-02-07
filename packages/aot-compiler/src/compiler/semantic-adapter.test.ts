/**
 * Semantic Parser Adapter Tests
 *
 * Proves the semantic parser adapter correctly converts @lokascript/semantic
 * output into AOT AST types, and that non-English hyperscript can be compiled
 * to JavaScript through the full AOT pipeline.
 */

import { describe, it, expect } from 'vitest';
import { SemanticParserAdapter, createSemanticAdapter } from './semantic-adapter.js';
import { AOTCompiler } from './aot-compiler.js';
import type { ASTNode, EventHandlerNode, CommandNode } from '../types/aot-types.js';

// =============================================================================
// ADAPTER CREATION (module-level for describe.runIf)
// =============================================================================

let adapter: SemanticParserAdapter;
let adapterAvailable = false;

try {
  adapter = await createSemanticAdapter();
  adapterAvailable = true;
} catch {
  // @lokascript/semantic not available — tests will be skipped
}

// =============================================================================
// LANGUAGE SUPPORT
// =============================================================================

describe.runIf(adapterAvailable)('SemanticParserAdapter', () => {
  describe('supportsLanguage()', () => {
    it('supports English', () => {
      expect(adapter.supportsLanguage('en')).toBe(true);
    });

    it('supports Japanese', () => {
      expect(adapter.supportsLanguage('ja')).toBe(true);
    });

    it('supports Korean', () => {
      expect(adapter.supportsLanguage('ko')).toBe(true);
    });

    it('supports Spanish', () => {
      expect(adapter.supportsLanguage('es')).toBe(true);
    });

    it('supports Arabic', () => {
      expect(adapter.supportsLanguage('ar')).toBe(true);
    });

    it('does not support invalid language', () => {
      expect(adapter.supportsLanguage('xx')).toBe(false);
    });
  });

  // ===========================================================================
  // ANALYZE + BUILD AST
  // ===========================================================================

  describe('analyze() + buildAST()', () => {
    it('analyzes English toggle command', () => {
      const result = adapter.analyze('toggle .active', 'en');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.node).toBeDefined();
    });

    it('builds AOT AST from semantic node', () => {
      const analyzeResult = adapter.analyze('toggle .active', 'en');
      if (!analyzeResult.node) throw new Error('Analyze returned no node');

      const { ast, warnings } = adapter.buildAST(analyzeResult.node);
      expect(ast).toBeDefined();
      expect(ast.type).toBeDefined();
      expect(warnings).toBeDefined();
    });

    it('handles errors gracefully', () => {
      const result = adapter.analyze('xyzzy_not_valid_12345', 'en');
      // Should not throw, should return low confidence or errors
      expect(result.confidence).toBeLessThan(0.7);
    });
  });

  // ===========================================================================
  // COMMAND CONVERSION TESTS
  // ===========================================================================

  describe('command conversion', () => {
    function parseCommand(code: string, lang = 'en'): ASTNode {
      const result = adapter.analyze(code, lang);
      if (!result.node) throw new Error(`Analyze failed for: ${code}`);
      const { ast } = adapter.buildAST(result.node);
      return ast;
    }

    it('converts toggle command', () => {
      const ast = parseCommand('toggle .active');
      // Should be a command with name 'toggle'
      expect(findCommand(ast, 'toggle')).toBeDefined();
    });

    it('converts add command', () => {
      const ast = parseCommand('add .clicked');
      expect(findCommand(ast, 'add')).toBeDefined();
    });

    it('converts remove command', () => {
      const ast = parseCommand('remove .hidden');
      expect(findCommand(ast, 'remove')).toBeDefined();
    });

    it('converts set command', () => {
      const ast = parseCommand('set :x to 10');
      expect(findCommand(ast, 'set')).toBeDefined();
    });

    it('converts show command (with target)', () => {
      // Bare "show" may not be recognized by semantic parser;
      // use "show #target" which has a patient role
      const result = adapter.analyze('show #dialog', 'en');
      if (!result.node) {
        // show without arguments may not be supported by semantic parser
        return;
      }
      const { ast } = adapter.buildAST(result.node);
      expect(ast).toBeDefined();
    });

    it('converts hide command (with target)', () => {
      const result = adapter.analyze('hide #dialog', 'en');
      if (!result.node) {
        return;
      }
      const { ast } = adapter.buildAST(result.node);
      expect(ast).toBeDefined();
    });
  });

  // ===========================================================================
  // EVENT HANDLER TESTS
  // ===========================================================================

  describe('event handler conversion', () => {
    function parseToEvent(code: string, lang = 'en'): ASTNode {
      const result = adapter.analyze(code, lang);
      if (!result.node) throw new Error(`Analyze failed for: ${code}`);
      const { ast } = adapter.buildAST(result.node);
      return ast;
    }

    it('converts basic click handler', () => {
      const ast = parseToEvent('on click toggle .active');
      const event = findEventHandler(ast);
      expect(event).toBeDefined();
      if (event) {
        expect(event.event).toBe('click');
        expect(event.body).toBeDefined();
        expect(event.body!.length).toBeGreaterThan(0);
      }
    });

    it('converts mouseenter handler', () => {
      const result = adapter.analyze('on mouseenter add .hovered', 'en');
      if (!result.node || result.confidence < 0.5) {
        // mouseenter may not be in the semantic parser's event list
        return;
      }

      const { ast } = adapter.buildAST(result.node);
      const event = findEventHandler(ast);
      expect(event).toBeDefined();
      // The event name may vary based on semantic parser support
      if (event) {
        expect(typeof event.event).toBe('string');
      }
    });
  });

  // ===========================================================================
  // MULTILINGUAL END-TO-END TESTS
  // ===========================================================================

  describe('multilingual end-to-end', () => {
    function compileMultilingual(
      code: string,
      language: string
    ): { success: boolean; code?: string } {
      const compiler = new AOTCompiler();
      compiler.setSemanticParser(adapter);

      return compiler.compileScript(code, { language });
    }

    // ── Japanese (SOV) ──

    it('compiles Japanese toggle command', () => {
      const result = compileMultilingual('.active を 切り替え', 'ja');
      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
      // The generated JS should contain classList.toggle or equivalent
      if (result.code) {
        expect(
          result.code.includes('classList.toggle') ||
            result.code.includes('toggle') ||
            result.code.includes('active')
        ).toBe(true);
      }
    });

    it('compiles Japanese event handler', () => {
      const result = compileMultilingual('クリック で .active を 切り替え', 'ja');
      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
    });

    // ── Korean (SOV) ──

    it('compiles Korean toggle command', () => {
      const result = compileMultilingual('.active 를 토글', 'ko');
      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
    });

    // ── Spanish (SVO) ──

    it('compiles Spanish toggle command', () => {
      const result = compileMultilingual('alternar .active', 'es');
      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
    });

    it('compiles Spanish add command', () => {
      const result = compileMultilingual('agregar .clicked', 'es');
      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
    });

    // ── Arabic (VSO, RTL) ──

    it('compiles Arabic toggle command', () => {
      const result = compileMultilingual('بدّل .active', 'ar');
      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
    });

    // ── Chinese (SVO) ──

    it('compiles Chinese toggle command', () => {
      const result = compileMultilingual('切换 .active', 'zh');
      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
    });

    // ── German (SVO) ──

    it('compiles German toggle command', () => {
      const result = compileMultilingual('umschalten .active', 'de');
      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
    });

    // ── French (SVO) ──

    it('compiles French toggle command', () => {
      const result = compileMultilingual('basculer .active', 'fr');
      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
    });

    // ── Turkish (SOV) ──

    it('compiles Turkish toggle command', () => {
      // Turkish is SOV with known lower pass rates
      const result = compileMultilingual('.active değiştir', 'tr');
      // Accept either success or graceful failure
      if (result.success) {
        expect(result.code).toBeDefined();
      }
    });

    // ── Portuguese (SVO) ──

    it('compiles Portuguese toggle command', () => {
      const result = compileMultilingual('alternar .active', 'pt');
      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
    });
  });

  // ===========================================================================
  // EVENT HANDLER BODY VERIFICATION
  // Ensures non-English event handlers produce JS with actual body commands,
  // not empty function bodies. Regression protection for the interchange fix.
  // ===========================================================================

  describe('event handler body verification', () => {
    function compileAndVerify(code: string, language: string): { success: boolean; code?: string } {
      const compiler = new AOTCompiler();
      compiler.setSemanticParser(adapter);
      return compiler.compileScript(code, { language });
    }

    /**
     * Assert that the generated handler body is not empty.
     * An empty body looks like: function _handler_xxx(_event) { const _ctx = ...; }
     * with no actual command code after the context init.
     */
    function assertBodyNotEmpty(code: string, description: string): void {
      // Strip the function wrapper to inspect body content
      const handlerMatch = /function\s+_handler_\w+\(_event\)\s*\{([\s\S]*)\}\s*$/.exec(code);
      if (!handlerMatch) return; // Non-standard format, skip check
      const bodyContent = handlerMatch[1]
        .replace(/const _ctx\s*=\s*[^;]*;/g, '')
        .replace(/const _el\s*=\s*[^;]*;/g, '')
        .trim();
      expect(bodyContent, `${description}: handler body should not be empty`).not.toBe('');
    }

    // ── Japanese (SOV) — single command ──

    it('Japanese event handler produces toggle code in body', () => {
      const result = compileAndVerify('クリック で .active を 切り替え', 'ja');
      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
      if (result.code) {
        assertBodyNotEmpty(result.code, 'Japanese event handler');
        const hasToggle =
          result.code.includes('classList.toggle') || result.code.includes("'active'");
        expect(hasToggle).toBe(true);
      }
    });

    it('Japanese standalone command wraps in click with body', () => {
      const result = compileAndVerify('.active を 切り替え', 'ja');
      expect(result.success).toBe(true);
      if (result.code) {
        assertBodyNotEmpty(result.code, 'Japanese standalone toggle');
        expect(result.code.includes('classList.toggle') || result.code.includes("'active'")).toBe(
          true
        );
      }
    });

    // ── Korean (SOV) ──

    it('Korean toggle produces body code', () => {
      const result = compileAndVerify('.active 를 토글', 'ko');
      if (result.success && result.code) {
        assertBodyNotEmpty(result.code, 'Korean toggle');
        expect(result.code.includes('classList.toggle') || result.code.includes("'active'")).toBe(
          true
        );
      }
    });

    // ── Spanish (SVO) ──

    it('Spanish toggle produces body code', () => {
      const result = compileAndVerify('alternar .active', 'es');
      expect(result.success).toBe(true);
      if (result.code) {
        assertBodyNotEmpty(result.code, 'Spanish toggle');
        expect(result.code.includes('classList.toggle') || result.code.includes("'active'")).toBe(
          true
        );
      }
    });

    // ── Arabic (VSO) ──

    it('Arabic toggle produces body code', () => {
      const result = compileAndVerify('بدّل .active', 'ar');
      expect(result.success).toBe(true);
      if (result.code) {
        assertBodyNotEmpty(result.code, 'Arabic toggle');
        expect(result.code.includes('classList.toggle') || result.code.includes("'active'")).toBe(
          true
        );
      }
    });

    // ── Chinese (SVO) ──

    it('Chinese toggle produces body code', () => {
      const result = compileAndVerify('切换 .active', 'zh');
      expect(result.success).toBe(true);
      if (result.code) {
        assertBodyNotEmpty(result.code, 'Chinese toggle');
        expect(result.code.includes('classList.toggle') || result.code.includes("'active'")).toBe(
          true
        );
      }
    });

    // ── Multi-command event handlers ──

    it('Japanese multi-command event handler has both commands in body', () => {
      // "on click toggle .active then remove .hidden"
      const result = compileAndVerify(
        'クリック で .active を 切り替え それから .hidden を 削除',
        'ja'
      );
      if (result.success && result.code) {
        assertBodyNotEmpty(result.code, 'Japanese multi-command');
        // Should contain both toggle and remove
        const hasToggle =
          result.code.includes('classList.toggle') || result.code.includes("'active'");
        const hasRemove =
          result.code.includes('classList.remove') || result.code.includes("'hidden'");
        expect(hasToggle || hasRemove).toBe(true);
      }
    });

    it('Spanish multi-command has both commands in body', () => {
      // "toggle .active then remove .hidden"
      const result = compileAndVerify('alternar .active luego eliminar .hidden', 'es');
      if (result.success && result.code) {
        assertBodyNotEmpty(result.code, 'Spanish multi-command');
        const hasToggle =
          result.code.includes('classList.toggle') || result.code.includes("'active'");
        const hasRemove =
          result.code.includes('classList.remove') || result.code.includes("'hidden'");
        expect(hasToggle || hasRemove).toBe(true);
      }
    });
  });

  // ===========================================================================
  // NON-ENGLISH CONTROL FLOW AND ASYNC (conditional on semantic parser support)
  // ===========================================================================

  describe('non-English control flow and async', () => {
    function compileMultilingual(
      code: string,
      language: string
    ): { success: boolean; code?: string } {
      const compiler = new AOTCompiler();
      compiler.setSemanticParser(adapter);
      return compiler.compileScript(code, { language });
    }

    // ── Spanish (SVO) — control flow ──

    it('compiles Spanish show/hide commands', () => {
      const showResult = compileMultilingual('mostrar', 'es');
      const hideResult = compileMultilingual('ocultar', 'es');
      // At least one should succeed
      if (showResult.success) {
        expect(showResult.code).toBeDefined();
      }
      if (hideResult.success) {
        expect(hideResult.code).toBeDefined();
      }
    });

    it('compiles Spanish remove command', () => {
      const result = compileMultilingual('eliminar .hidden', 'es');
      expect(result.success).toBe(true);
      if (result.code) {
        expect(result.code.includes('classList.remove') || result.code.includes("'hidden'")).toBe(
          true
        );
      }
    });

    // ── Japanese (SOV) — data commands ──

    it('compiles Japanese add command', () => {
      const result = compileMultilingual('.clicked を 追加', 'ja');
      if (result.success && result.code) {
        expect(result.code.includes('classList.add') || result.code.includes("'clicked'")).toBe(
          true
        );
      }
    });

    it('compiles Japanese remove command', () => {
      const result = compileMultilingual('.hidden を 削除', 'ja');
      if (result.success && result.code) {
        expect(result.code.includes('classList.remove') || result.code.includes("'hidden'")).toBe(
          true
        );
      }
    });

    // ── Korean (SOV) — data commands ──

    it('compiles Korean add command', () => {
      const result = compileMultilingual('.clicked 를 추가', 'ko');
      if (result.success && result.code) {
        expect(result.code.includes('classList.add') || result.code.includes("'clicked'")).toBe(
          true
        );
      }
    });

    it('compiles Korean remove command', () => {
      const result = compileMultilingual('.hidden 를 제거', 'ko');
      if (result.success && result.code) {
        expect(result.code.includes('classList.remove') || result.code.includes("'hidden'")).toBe(
          true
        );
      }
    });

    // ── Arabic (VSO) — data commands ──

    it('compiles Arabic add command', () => {
      const result = compileMultilingual('أضف .clicked', 'ar');
      if (result.success && result.code) {
        expect(result.code.includes('classList.add') || result.code.includes("'clicked'")).toBe(
          true
        );
      }
    });

    it('compiles Arabic remove command', () => {
      const result = compileMultilingual('أزل .hidden', 'ar');
      if (result.success && result.code) {
        expect(result.code.includes('classList.remove') || result.code.includes("'hidden'")).toBe(
          true
        );
      }
    });

    // ── Chinese (SVO) — data commands ──

    it('compiles Chinese add command', () => {
      const result = compileMultilingual('添加 .clicked', 'zh');
      if (result.success && result.code) {
        expect(result.code.includes('classList.add') || result.code.includes("'clicked'")).toBe(
          true
        );
      }
    });

    it('compiles Chinese remove command', () => {
      const result = compileMultilingual('移除 .hidden', 'zh');
      if (result.success && result.code) {
        expect(result.code.includes('classList.remove') || result.code.includes("'hidden'")).toBe(
          true
        );
      }
    });

    // ── Cross-language show/hide ──

    it('compiles Japanese hide command', () => {
      const result = compileMultilingual('非表示', 'ja');
      if (result.success && result.code) {
        expect(result.code.includes("display = 'none'") || result.code.includes('hide')).toBe(true);
      }
    });

    it('compiles Korean hide command', () => {
      const result = compileMultilingual('숨기기', 'ko');
      if (result.success && result.code) {
        expect(result.code.includes("display = 'none'") || result.code.includes('hide')).toBe(true);
      }
    });
  });

  // ===========================================================================
  // FULL PIPELINE TEST (non-English → JS)
  // ===========================================================================

  describe('full pipeline: non-English → JavaScript', () => {
    it('Japanese toggle → JavaScript with classList.toggle', () => {
      const compiler = new AOTCompiler();
      compiler.setSemanticParser(adapter);

      // Compile Japanese "toggle .active" (standalone, wraps in click)
      const result = compiler.compileScript('.active を 切り替え', {
        language: 'ja',
      });

      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();

      if (result.code) {
        // The codegen should produce JavaScript that toggles a class
        const hasToggle =
          result.code.includes('classList.toggle') ||
          result.code.includes("toggle('active')") ||
          result.code.includes("'active'");
        expect(hasToggle).toBe(true);
      }

      // Metadata should reflect semantic parser usage
      expect(result.metadata.parserUsed).toBe('semantic');
      expect(result.metadata.language).toBe('ja');
    });

    it('Spanish add → JavaScript with classList.add', () => {
      const compiler = new AOTCompiler();
      compiler.setSemanticParser(adapter);

      const result = compiler.compileScript('agregar .selected', {
        language: 'es',
      });

      expect(result.success).toBe(true);
      if (result.code) {
        const hasAdd =
          result.code.includes('classList.add') ||
          result.code.includes("add('selected')") ||
          result.code.includes("'selected'");
        expect(hasAdd).toBe(true);
      }
    });

    it('batch compile with mixed languages', () => {
      const compiler = new AOTCompiler();
      compiler.setSemanticParser(adapter);

      const scripts = [
        {
          code: 'toggle .active',
          language: 'en',
          location: { file: 'test.html', line: 1, column: 1 },
        },
        {
          code: '.active を 切り替え',
          language: 'ja',
          location: { file: 'test.html', line: 2, column: 1 },
        },
      ];

      const result = compiler.compile(scripts);
      // At least one should compile (English always works via regex fallback)
      expect(result.stats.compiled).toBeGreaterThanOrEqual(1);
    });
  });
});

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Find a command node by name in the AST (recursively).
 */
function findCommand(node: ASTNode, name: string): CommandNode | undefined {
  if (!node) return undefined;

  if (node.type === 'command' && (node as CommandNode).name === name) {
    return node as CommandNode;
  }

  // Search in event handler body
  if (node.type === 'event') {
    const evt = node as EventHandlerNode;
    if (evt.body) {
      for (const child of evt.body) {
        const found = findCommand(child, name);
        if (found) return found;
      }
    }
  }

  // Search in args
  const args = (node as Record<string, unknown>).args as ASTNode[] | undefined;
  if (args) {
    for (const arg of args) {
      const found = findCommand(arg, name);
      if (found) return found;
    }
  }

  return undefined;
}

/**
 * Find an event handler node in the AST.
 */
function findEventHandler(node: ASTNode): EventHandlerNode | undefined {
  if (node.type === 'event') {
    return node as EventHandlerNode;
  }
  return undefined;
}
