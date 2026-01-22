import { test, expect } from '@playwright/test';

/**
 * Comprehensive Command Compatibility Tests
 *
 * These tests cover the major commands from the official _hyperscript test suite.
 * Each test creates DOM elements and verifies command execution.
 *
 * FIXED Issues:
 * - set the X of Y with ID selectors (idSelector now supported)
 * - if/else parsing on same line (improved else/end keyword detection) - commit ff6985ca
 * - return with binary expressions (x + y) (added 'return' to skipSemanticParsing) - commit ff6985ca
 * - 'no' operator semantics matching official _hyperscript - commit ff6985ca
 * - toggle between .classA and .classB syntax - now supported
 */

test.describe('Command Compatibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/packages/core/compatibility-test.html');
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      if (typeof window.lokascript === 'undefined') {
        throw new Error('HyperFixi not loaded');
      }
      // Clear work area before each test
      (window as any).clearWorkArea();
    });
  });

  // ==================== ADD Command ====================
  test.describe('ADD Command @add', () => {
    test('add class to element @quick', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const div = document.createElement('div');
        div.id = 'target';
        document.getElementById('work-area')!.appendChild(div);
        await (window as any).evalHyperScript('add .foo to #target');
        return div.classList.contains('foo');
      });
      expect(result).toBe(true);
    });

    test('add multiple classes', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const div = document.createElement('div');
        div.id = 'target';
        document.getElementById('work-area')!.appendChild(div);
        await (window as any).evalHyperScript('add .foo to #target');
        await (window as any).evalHyperScript('add .bar to #target');
        return div.classList.contains('foo') && div.classList.contains('bar');
      });
      expect(result).toBe(true);
    });

    test('add class to me', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const div = document.createElement('div');
        div.id = 'target';
        document.getElementById('work-area')!.appendChild(div);
        const ctx = (window as any).hyperfixi.createContext(div);
        await (window as any).hyperfixi.evalHyperScript('add .active to me', ctx);
        return div.classList.contains('active');
      });
      expect(result).toBe(true);
    });
  });

  // ==================== REMOVE Command ====================
  test.describe('REMOVE Command @remove', () => {
    test('remove class from element @quick', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const div = document.createElement('div');
        div.id = 'target';
        div.classList.add('foo');
        document.getElementById('work-area')!.appendChild(div);
        await (window as any).evalHyperScript('remove .foo from #target');
        return !div.classList.contains('foo');
      });
      expect(result).toBe(true);
    });

    test('remove element from DOM', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const div = document.createElement('div');
        div.id = 'target';
        document.getElementById('work-area')!.appendChild(div);
        await (window as any).evalHyperScript('remove #target');
        return document.getElementById('target') === null;
      });
      expect(result).toBe(true);
    });
  });

  // ==================== TOGGLE Command ====================
  test.describe('TOGGLE Command @toggle', () => {
    test('toggle adds class when missing @quick @smoke', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const div = document.createElement('div');
        div.id = 'target';
        document.getElementById('work-area')!.appendChild(div);
        await (window as any).evalHyperScript('toggle .active on #target');
        return div.classList.contains('active');
      });
      expect(result).toBe(true);
    });

    test('toggle removes class when present', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const div = document.createElement('div');
        div.id = 'target';
        div.classList.add('active');
        document.getElementById('work-area')!.appendChild(div);
        await (window as any).evalHyperScript('toggle .active on #target');
        return !div.classList.contains('active');
      });
      expect(result).toBe(true);
    });

    test('toggle between two classes', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const div = document.createElement('div');
        div.id = 'target';
        div.classList.add('off');
        document.getElementById('work-area')!.appendChild(div);
        await (window as any).evalHyperScript('toggle between .on and .off on #target');
        return div.classList.contains('on') && !div.classList.contains('off');
      });
      expect(result).toBe(true);
    });
  });

  // ==================== SET Command ====================
  test.describe('SET Command @set', () => {
    test('set variable @quick', async ({ page }) => {
      const result = await page.evaluate(async () => {
        return await (window as any).evalHyperScript('set x to 42 then return x');
      });
      expect(result).toBe(42);
    });

    test('set element textContent via put', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const div = document.createElement('div');
        div.id = 'target';
        document.getElementById('work-area')!.appendChild(div);
        // Use put instead of set for element properties
        await (window as any).evalHyperScript('put "hello" into #target');
        return div.textContent;
      });
      expect(result).toBe('hello');
    });

    test('set the X of Y syntax', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const div = document.createElement('div');
        div.id = 'target';
        document.getElementById('work-area')!.appendChild(div);
        await (window as any).evalHyperScript('set the textContent of #target to "hello"');
        return div.textContent;
      });
      expect(result).toBe('hello');
    });
  });

  // ==================== PUT Command ====================
  test.describe('PUT Command @put', () => {
    test('put into element @quick @smoke', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const div = document.createElement('div');
        div.id = 'target';
        document.getElementById('work-area')!.appendChild(div);
        await (window as any).evalHyperScript('put "hello" into #target');
        return div.textContent;
      });
      expect(result).toBe('hello');
    });

    test('put into innerHTML', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const div = document.createElement('div');
        div.id = 'target';
        document.getElementById('work-area')!.appendChild(div);
        await (window as any).evalHyperScript('put "<span>test</span>" into #target.innerHTML');
        return div.innerHTML;
      });
      expect(result).toBe('<span>test</span>');
    });

    test('put before element', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const container = document.getElementById('work-area')!;
        container.innerHTML = '<div id="target">original</div>';
        await (window as any).evalHyperScript('put "before " before #target');
        return container.textContent;
      });
      expect(result).toContain('before');
    });

    test('put after element', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const container = document.getElementById('work-area')!;
        container.innerHTML = '<div id="target">original</div>';
        await (window as any).evalHyperScript('put " after" after #target');
        return container.textContent;
      });
      expect(result).toContain('after');
    });
  });

  // ==================== LOG Command ====================
  test.describe('LOG Command @log', () => {
    test('log executes without error', async ({ page }) => {
      const result = await page.evaluate(async () => {
        try {
          await (window as any).evalHyperScript('log "test message"');
          return true;
        } catch (e) {
          return false;
        }
      });
      expect(result).toBe(true);
    });
  });

  // ==================== SHOW/HIDE Commands ====================
  test.describe('SHOW/HIDE Commands @show @hide', () => {
    test('hide element @quick', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const div = document.createElement('div');
        div.id = 'target';
        document.getElementById('work-area')!.appendChild(div);
        await (window as any).evalHyperScript('hide #target');
        return div.style.display === 'none' || div.style.visibility === 'hidden';
      });
      expect(result).toBe(true);
    });

    test('show element', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const div = document.createElement('div');
        div.id = 'target';
        div.style.display = 'none';
        document.getElementById('work-area')!.appendChild(div);
        await (window as any).evalHyperScript('show #target');
        return div.style.display !== 'none';
      });
      expect(result).toBe(true);
    });
  });

  // ==================== INCREMENT/DECREMENT Commands ====================
  test.describe('INCREMENT/DECREMENT Commands @increment @decrement', () => {
    test('increment variable @quick', async ({ page }) => {
      const result = await page.evaluate(async () => {
        return await (window as any).evalHyperScript('set x to 5 then increment x then return x');
      });
      expect(result).toBe(6);
    });

    test('decrement variable', async ({ page }) => {
      const result = await page.evaluate(async () => {
        return await (window as any).evalHyperScript('set x to 5 then decrement x then return x');
      });
      expect(result).toBe(4);
    });

    test('increment multiple times', async ({ page }) => {
      const result = await page.evaluate(async () => {
        return await (window as any).evalHyperScript(
          'set x to 5 then increment x then increment x then return x'
        );
      });
      expect(result).toBe(7);
    });

    test('decrement multiple times', async ({ page }) => {
      const result = await page.evaluate(async () => {
        return await (window as any).evalHyperScript(
          'set x to 10 then decrement x then decrement x then decrement x then return x'
        );
      });
      expect(result).toBe(7);
    });
  });

  // ==================== WAIT Command ====================
  test.describe('WAIT Command @wait', () => {
    test('wait executes without error', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const start = Date.now();
        await (window as any).evalHyperScript('wait 100ms');
        const elapsed = Date.now() - start;
        return elapsed >= 90; // Allow some timing variance
      });
      expect(result).toBe(true);
    });
  });

  // ==================== IF/THEN/ELSE ====================
  test.describe('IF/THEN/ELSE @if @control-flow', () => {
    test('if condition with variable set @quick', async ({ page }) => {
      const result = await page.evaluate(async () => {
        return await (window as any).evalHyperScript(
          'set x to 5 then if x > 3 set result to "big" else set result to "small" end then return result'
        );
      });
      expect(result).toBe('big');
    });

    test('if false condition', async ({ page }) => {
      const result = await page.evaluate(async () => {
        return await (window as any).evalHyperScript(
          'set x to 1 then if x > 3 set result to "big" else set result to "small" end then return result'
        );
      });
      expect(result).toBe('small');
    });

    test('if without else', async ({ page }) => {
      const result = await page.evaluate(async () => {
        return await (window as any).evalHyperScript(
          'set x to 5 then set result to "default" then if x > 3 set result to "big" end then return result'
        );
      });
      expect(result).toBe('big');
    });
  });

  // ==================== REPEAT Command ====================
  test.describe('REPEAT Command @repeat @control-flow', () => {
    test('repeat N times @quick', async ({ page }) => {
      const result = await page.evaluate(async () => {
        return await (window as any).evalHyperScript(
          'set count to 0 then repeat 5 times increment count end then return count'
        );
      });
      expect(result).toBe(5);
    });
  });

  // ==================== CALL Command ====================
  test.describe('CALL/Function Invocation @call @expression', () => {
    test('call global function and use result', async ({ page }) => {
      const result = await page.evaluate(async () => {
        (window as any).testFunc = () => 42;
        // Call function and extract result
        return await (window as any).evalHyperScript('set result to testFunc() then return result');
      });
      expect(result).toBe(42);
    });

    test('call method on string', async ({ page }) => {
      const result = await page.evaluate(async () => {
        return await (window as any).evalHyperScript('"hello".toUpperCase()');
      });
      expect(result).toBe('HELLO');
    });

    test('call method on array', async ({ page }) => {
      const result = await page.evaluate(async () => {
        return await (window as any).evalHyperScript('[1, 2, 3].length');
      });
      expect(result).toBe(3);
    });
  });

  // ==================== RETURN with compound commands ====================
  test.describe('RETURN in compound commands', () => {
    test('return after set', async ({ page }) => {
      const result = await page.evaluate(async () => {
        return await (window as any).evalHyperScript('set x to 42 then return x');
      });
      expect(result).toBe(42);
    });

    test('return computed value', async ({ page }) => {
      const result = await page.evaluate(async () => {
        return await (window as any).evalHyperScript(
          'set x to 2 then set y to 3 then return x + y'
        );
      });
      expect(result).toBe(5);
    });
  });
});
