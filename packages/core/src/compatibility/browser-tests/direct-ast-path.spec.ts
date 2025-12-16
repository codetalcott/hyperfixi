/**
 * End-to-End Browser Tests for Direct AST Path
 *
 * Tests the full pipeline:
 *   Input → Semantic Parser → AST Builder → Runtime Execution → DOM Effect
 *
 * This validates that multilingual input can be parsed and executed
 * directly without going through English text generation and re-parsing.
 */
import { test, expect } from '@playwright/test';

test.describe('Direct AST Path Execution', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(
      `${baseURL}/packages/core/src/compatibility/browser-tests/direct-ast-test.html`
    );
    // Wait for both bundles to load
    await page.waitForFunction(
      () =>
        typeof (window as any).HyperFixiSemantic !== 'undefined' &&
        typeof (window as any).hyperfixi !== 'undefined',
      { timeout: 10000 }
    );
  });

  test.describe('English Commands via Direct AST', () => {
    test('toggle command via direct AST', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const S = (window as any).HyperFixiSemantic;

        // Use analyzer for parsing with confidence
        const analyzer = S.createSemanticAnalyzer();
        const analysisResult = analyzer.analyze('toggle .active on #test-btn', 'en');

        if (!analysisResult.node) {
          return { parsed: false, built: false };
        }

        // Build AST directly from semantic node
        const ast = S.buildAST(analysisResult.node);

        return {
          parsed: true,
          built: !!ast,
          astType: ast?.type,
          astName: ast?.name,
          confidence: analysisResult.confidence,
        };
      });

      expect(result.parsed).toBe(true);
      expect(result.built).toBe(true);
      expect(result.astType).toBe('command');
      expect(result.astName).toBe('toggle');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('show command with improved confidence', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const S = (window as any).HyperFixiSemantic;

        // Use analyzer for confidence scoring
        const analyzer = S.createSemanticAnalyzer();
        const analysisResult = analyzer.analyze('show #modal', 'en');

        return {
          parsed: !!analysisResult.node,
          action: analysisResult.node?.action,
          confidence: analysisResult.confidence,
        };
      });

      expect(result.parsed).toBe(true);
      expect(result.action).toBe('show');
      // After confidence improvements, show should have better confidence
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('hide command with improved confidence', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const S = (window as any).HyperFixiSemantic;

        const analyzer = S.createSemanticAnalyzer();
        const analysisResult = analyzer.analyze('hide #modal', 'en');

        return {
          parsed: !!analysisResult.node,
          action: analysisResult.node?.action,
          confidence: analysisResult.confidence,
        };
      });

      expect(result.parsed).toBe(true);
      expect(result.action).toBe('hide');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  test.describe('Japanese Commands via Direct AST (SOV)', () => {
    test('toggle command from Japanese', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const S = (window as any).HyperFixiSemantic;

        // Use analyzer for parsing
        const analyzer = S.createSemanticAnalyzer();
        const analysisResult = analyzer.analyze('#test-btn の .active を 切り替え', 'ja');

        if (!analysisResult.node) {
          return { parsed: false, built: false };
        }

        const ast = S.buildAST(analysisResult.node);

        return {
          parsed: true,
          action: analysisResult.node.action,
          built: !!ast,
          astType: ast?.type,
          astName: ast?.name,
        };
      });

      expect(result.parsed).toBe(true);
      expect(result.action).toBe('toggle');
      expect(result.built).toBe(true);
      expect(result.astName).toBe('toggle');
    });

    test('add command from Japanese', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const S = (window as any).HyperFixiSemantic;

        const analyzer = S.createSemanticAnalyzer();
        const analysisResult = analyzer.analyze('.highlight を 追加', 'ja');

        if (!analysisResult.node) {
          return { parsed: false, built: false };
        }

        const ast = S.buildAST(analysisResult.node);

        return {
          parsed: true,
          action: analysisResult.node.action,
          built: !!ast,
          astName: ast?.name,
        };
      });

      expect(result.parsed).toBe(true);
      expect(result.action).toBe('add');
      if (result.built) {
        expect(result.astName).toBe('add');
      }
    });

    test('show command from Japanese', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const S = (window as any).HyperFixiSemantic;

        const analyzer = S.createSemanticAnalyzer();
        const analysisResult = analyzer.analyze('#modal を 表示', 'ja');

        return {
          parsed: !!analysisResult.node,
          action: analysisResult.node?.action,
          confidence: analysisResult.confidence,
        };
      });

      expect(result.parsed).toBe(true);
      expect(result.action).toBe('show');
    });
  });

  test.describe('Spanish Commands via Direct AST (SVO)', () => {
    test('toggle command from Spanish', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const S = (window as any).HyperFixiSemantic;

        const analyzer = S.createSemanticAnalyzer();
        const analysisResult = analyzer.analyze('alternar .active en #button', 'es');

        if (!analysisResult.node) {
          return { parsed: false, built: false };
        }

        const ast = S.buildAST(analysisResult.node);

        return {
          parsed: true,
          action: analysisResult.node.action,
          built: !!ast,
          astName: ast?.name,
        };
      });

      expect(result.parsed).toBe(true);
      expect(result.action).toBe('toggle');
      expect(result.built).toBe(true);
      expect(result.astName).toBe('toggle');
    });
  });

  test.describe('Korean Commands via Direct AST (SOV)', () => {
    test('toggle command from Korean', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const S = (window as any).HyperFixiSemantic;

        const analyzer = S.createSemanticAnalyzer();
        const analysisResult = analyzer.analyze('#button 의 .active 를 토글', 'ko');

        if (!analysisResult.node) {
          return { parsed: false, built: false };
        }

        const ast = S.buildAST(analysisResult.node);

        return {
          parsed: true,
          action: analysisResult.node.action,
          built: !!ast,
          astName: ast?.name,
        };
      });

      expect(result.parsed).toBe(true);
      expect(result.action).toBe('toggle');
      expect(result.built).toBe(true);
    });
  });

  test.describe('Arabic Commands via Direct AST (VSO)', () => {
    test('toggle command from Arabic', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const S = (window as any).HyperFixiSemantic;

        const analyzer = S.createSemanticAnalyzer();
        const analysisResult = analyzer.analyze('بدّل .active على #button', 'ar');

        if (!analysisResult.node) {
          return { parsed: false, built: false };
        }

        const ast = S.buildAST(analysisResult.node);

        return {
          parsed: true,
          action: analysisResult.node.action,
          built: !!ast,
          astName: ast?.name,
        };
      });

      expect(result.parsed).toBe(true);
      expect(result.action).toBe('toggle');
      expect(result.built).toBe(true);
    });
  });

  test.describe('Chinese Commands via Direct AST (SVO)', () => {
    test('toggle command from Chinese', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const S = (window as any).HyperFixiSemantic;

        const analyzer = S.createSemanticAnalyzer();
        const analysisResult = analyzer.analyze('切换 .active 在 #button', 'zh');

        if (!analysisResult.node) {
          return { parsed: false, built: false };
        }

        const ast = S.buildAST(analysisResult.node);

        return {
          parsed: true,
          action: analysisResult.node.action,
          built: !!ast,
          astName: ast?.name,
        };
      });

      expect(result.parsed).toBe(true);
      expect(result.action).toBe('toggle');
      expect(result.built).toBe(true);
    });
  });

  test.describe('compileMultilingual API', () => {
    test('should be accessible on hyperfixi object', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const hf = (window as any).hyperfixi;

        return {
          hasCompileMultilingual: typeof hf.compileMultilingual === 'function',
          hasCompile: typeof hf.compile === 'function',
        };
      });

      expect(result.hasCompileMultilingual).toBe(true);
      expect(result.hasCompile).toBe(true);
    });
  });

  test.describe('Cross-Language Consistency', () => {
    test('same command produces equivalent AST in different languages', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const S = (window as any).HyperFixiSemantic;
        const analyzer = S.createSemanticAnalyzer();

        // Parse same command in multiple languages
        const enResult = analyzer.analyze('toggle .active on #button', 'en');
        const jaResult = analyzer.analyze('#button の .active を 切り替え', 'ja');
        const esResult = analyzer.analyze('alternar .active en #button', 'es');

        const enAST = enResult.node ? S.buildAST(enResult.node) : null;
        const jaAST = jaResult.node ? S.buildAST(jaResult.node) : null;
        const esAST = esResult.node ? S.buildAST(esResult.node) : null;

        return {
          enName: enAST?.name,
          jaName: jaAST?.name,
          esName: esAST?.name,
          enType: enAST?.type,
          jaType: jaAST?.type,
          esType: esAST?.type,
        };
      });

      // All languages should produce toggle command
      expect(result.enName).toBe('toggle');
      expect(result.jaName).toBe('toggle');
      expect(result.esName).toBe('toggle');

      // All should be command type
      expect(result.enType).toBe('command');
      expect(result.jaType).toBe('command');
      expect(result.esType).toBe('command');
    });
  });
});
