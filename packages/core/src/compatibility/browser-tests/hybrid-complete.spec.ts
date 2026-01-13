/**
 * Comprehensive tests for HyperFixi Hybrid Complete Bundle
 * @comprehensive
 */
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bundlePath = path.join(__dirname, '../../../dist/hyperfixi-hybrid-complete.js');
const bundleCode = fs.existsSync(bundlePath) ? fs.readFileSync(bundlePath, 'utf-8') : '';

test.describe('HyperFixi Hybrid Complete Bundle', () => {
  test.beforeEach(async ({ page }) => {
    await page.setContent(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .active { background: green; color: white; }
          .hidden { display: none; }
          .highlight { background: yellow; }
        </style>
      </head>
      <body>
        <div id="test-container"></div>
      </body>
      </html>
    `,
      { waitUntil: 'domcontentloaded' }
    );

    await page.addScriptTag({ content: bundleCode });
    await page.waitForFunction(() => (window as any).hyperfixi !== undefined, { timeout: 5000 });
  });

  test.describe('API Surface', () => {
    test('exposes correct version', async ({ page }) => {
      const version = await page.evaluate(() => (window as any).hyperfixi.version);
      expect(version).toBe('1.0.0-hybrid-complete');
    });

    test('exposes expected commands list', async ({ page }) => {
      const commands = await page.evaluate(() => (window as any).hyperfixi.commands);
      expect(commands).toContain('toggle');
      expect(commands).toContain('add');
      expect(commands).toContain('remove');
      expect(commands).toContain('put');
      expect(commands).toContain('set');
      expect(commands).toContain('increment');
      expect(commands).toContain('return');
      expect(commands.length).toBeGreaterThanOrEqual(21);
    });

    test('exposes block commands', async ({ page }) => {
      const blocks = await page.evaluate(() => (window as any).hyperfixi.blocks);
      expect(blocks).toContain('if');
      expect(blocks).toContain('repeat');
      expect(blocks).toContain('for');
      expect(blocks).toContain('while');
      expect(blocks).toContain('fetch');
    });

    test('has parse and execute functions @smoke', async ({ page }) => {
      const hasApi = await page.evaluate(() => {
        const h = (window as any).hyperfixi;
        return typeof h.parse === 'function' && typeof h.execute === 'function';
      });
      expect(hasApi).toBe(true);
    });
  });

  test.describe('Simple Commands', () => {
    test('toggle adds/removes class @smoke', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML = '<button id="btn" _="on click toggle .active">Toggle</button>';
        (window as any).hyperfixi.init();
      });

      const btn = page.locator('#btn');
      await btn.click();
      await expect(btn).toHaveClass('active');
      await btn.click();
      await expect(btn).not.toHaveClass('active');
    });

    test('add/remove class to target', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML = `
          <button id="add-btn" _="on click add .active to #target">Add</button>
          <button id="remove-btn" _="on click remove .active from #target">Remove</button>
          <div id="target">Target</div>
        `;
        (window as any).hyperfixi.init();
      });

      await page.click('#add-btn');
      await expect(page.locator('#target')).toHaveClass('active');
      await page.click('#remove-btn');
      await expect(page.locator('#target')).not.toHaveClass('active');
    });

    test('put content into element @smoke', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML = `
          <button id="btn" _="on click put 'Hello World' into #target">Put</button>
          <div id="target">-</div>
        `;
        (window as any).hyperfixi.init();
      });

      await page.click('#btn');
      await expect(page.locator('#target')).toHaveText('Hello World');
    });

    test('increment/decrement works', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML = `
          <button id="inc" _="on click set :count to 0 then increment :count then put :count into #result">Inc</button>
          <div id="result">-</div>
        `;
        (window as any).hyperfixi.init();
      });

      await page.click('#inc');
      await expect(page.locator('#result')).toHaveText('1');
    });

    test('wait delays execution', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML =
          '<button id="btn" _="on click add .active then wait 100ms then remove .active">Wait</button>';
        (window as any).hyperfixi.init();
      });

      await page.click('#btn');
      await expect(page.locator('#btn')).toHaveClass('active');
      await page.waitForTimeout(150);
      await expect(page.locator('#btn')).not.toHaveClass('active');
    });
  });

  test.describe('Expression Parser', () => {
    test('arithmetic with operator precedence @smoke', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML = `
          <button id="btn" _="on click set :a to 10 then set :b to 5 then set :result to :a + :b * 2 then put :result into #out">Test</button>
          <div id="out">-</div>
        `;
        (window as any).hyperfixi.init();
      });

      await page.click('#btn');
      await expect(page.locator('#out')).toHaveText('20');
    });

    test('comparison operators', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML = `
          <button id="btn" _="on click
            set :x to 5 then
            if :x > 3
              put 'greater' into #result
            else
              put 'not greater' into #result
            end">Test</button>
          <div id="result">-</div>
        `;
        (window as any).hyperfixi.init();
      });

      await page.click('#btn');
      await expect(page.locator('#result')).toHaveText('greater');
    });

    test('boolean logic (and/or)', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML = `
          <button id="btn" _="on click
            set :a to 5 then
            if :a > 3 and :a < 10
              put 'in range' into #result
            end">Test</button>
          <div id="result">-</div>
        `;
        (window as any).hyperfixi.init();
      });

      await page.click('#btn');
      await expect(page.locator('#result')).toHaveText('in range');
    });

    test('property access via possessive', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML = `
          <input id="inp" type="text" value="Hello">
          <button id="btn" _="on click put #inp's value into #result">Get</button>
          <div id="result">-</div>
        `;
        (window as any).hyperfixi.init();
      });

      await page.click('#btn');
      await expect(page.locator('#result')).toHaveText('Hello');
    });

    test('function calls on strings', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML = `
          <button id="btn" _="on click
            set :text to 'hello' then
            put :text.toUpperCase() into #result">Test</button>
          <div id="result">-</div>
        `;
        (window as any).hyperfixi.init();
      });

      await page.click('#btn');
      await expect(page.locator('#result')).toHaveText('HELLO');
    });

    test('array literals', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML = `
          <button id="btn" _="on click
            set :arr to ['a', 'b', 'c'] then
            put :arr.length into #result">Test</button>
          <div id="result">-</div>
        `;
        (window as any).hyperfixi.init();
      });

      await page.click('#btn');
      await expect(page.locator('#result')).toHaveText('3');
    });
  });

  test.describe('Block Commands', () => {
    test('repeat N times @smoke', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML = `
          <button id="btn" _="on click
            set :count to 0 then
            repeat 5 times
              increment :count
            end then
            put :count into #result">Test</button>
          <div id="result">-</div>
        `;
        (window as any).hyperfixi.init();
      });

      await page.click('#btn');
      await expect(page.locator('#result')).toHaveText('5');
    });

    test('for each loop', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML = `
          <button id="btn" _="on click
            set :items to ['A', 'B', 'C'] then
            set :output to '' then
            for each item in :items
              set :output to :output + item
            end then
            put :output into #result">Test</button>
          <div id="result">-</div>
        `;
        (window as any).hyperfixi.init();
      });

      await page.click('#btn');
      await expect(page.locator('#result')).toHaveText('ABC');
    });

    test('if/else conditional @smoke', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML = `
          <button id="btn" class="active" _="on click
            if me has .active
              put 'has active' into #result
            else
              put 'no active' into #result
            end">Test</button>
          <div id="result">-</div>
        `;
        (window as any).hyperfixi.init();
      });

      await page.click('#btn');
      await expect(page.locator('#result')).toHaveText('has active');
    });

    test('unless block', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML = `
          <button id="btn" _="on click
            set :x to 3 then
            unless :x > 5
              put 'small' into #result
            end">Test</button>
          <div id="result">-</div>
        `;
        (window as any).hyperfixi.init();
      });

      await page.click('#btn');
      await expect(page.locator('#result')).toHaveText('small');
    });

    test('while loop', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML = `
          <button id="btn" _="on click
            set :i to 0 then
            set :sum to 0 then
            while :i < 5
              set :sum to :sum + :i then
              increment :i
            end then
            put :sum into #result">Test</button>
          <div id="result">-</div>
        `;
        (window as any).hyperfixi.init();
      });

      await page.click('#btn');
      await expect(page.locator('#result')).toHaveText('10');
    });
  });

  test.describe('Event Modifiers', () => {
    test('.once only fires once', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML = `
          <button id="btn" _="on click.once set $count to ($count + 1) then put $count into #result">Click</button>
          <div id="result">0</div>
        `;
        (window as any).$count = 0;
        (window as any).hyperfixi.init();
      });

      await page.click('#btn');
      await page.click('#btn');
      await page.click('#btn');

      const result = await page.locator('#result').textContent();
      expect(result).toBe('1');
    });

    test('.debounce delays execution', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML = `
          <input id="inp" type="text" _="on input.debounce(100) put my.value into #result">
          <div id="result">-</div>
        `;
        (window as any).hyperfixi.init();
      });

      await page.fill('#inp', 'abc');
      await page.waitForTimeout(50);
      await expect(page.locator('#result')).toHaveText('-');
      await page.waitForTimeout(100);
      await expect(page.locator('#result')).toHaveText('abc');
    });
  });

  test.describe('Positional Expressions', () => {
    test('first/last of selector', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML = `
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
            <li>Item 3</li>
          </ul>
          <button id="first-btn" _="on click put the first li's textContent into #result">First</button>
          <button id="last-btn" _="on click put the last li's textContent into #result">Last</button>
          <div id="result">-</div>
        `;
        (window as any).hyperfixi.init();
      });

      await page.click('#first-btn');
      await expect(page.locator('#result')).toHaveText('Item 1');

      await page.click('#last-btn');
      await expect(page.locator('#result')).toHaveText('Item 3');
    });
  });

  test.describe('Init Event', () => {
    test('init runs on load', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML = `<div id="target" _="init put 'Initialized' into me">Loading...</div>`;
        (window as any).hyperfixi.init();
      });
      await page.waitForTimeout(50);

      await expect(page.locator('#target')).toHaveText('Initialized');
    });
  });

  test.describe('Every (Interval) Event', () => {
    test('every runs periodically', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML = `
          <div id="counter">0</div>
          <div _="every 50ms set #counter.textContent to (Number(#counter.textContent) + 1)"></div>
        `;
        (window as any).hyperfixi.init();
      });

      await page.waitForTimeout(200);

      const count = await page.locator('#counter').textContent();
      expect(parseInt(count || '0')).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('i18n Aliases', () => {
    test('built-in command aliases work', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML =
          '<button id="btn" _="on click flip .active">Toggle via alias</button>';
        (window as any).hyperfixi.init();
      });

      await page.click('#btn');
      await expect(page.locator('#btn')).toHaveClass('active');
    });

    test('addAliases function works', async ({ page }) => {
      await page.evaluate(() => {
        const h = (window as any).hyperfixi;
        h.addAliases({ alternar: 'toggle' });
        document.body.innerHTML = '<button id="btn" _="on click alternar .active">Test</button>';
        h.init();
      });

      await page.click('#btn');
      await expect(page.locator('#btn')).toHaveClass('active');
    });
  });

  test.describe('Return Statement', () => {
    test('return exits early', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML = `
          <button id="btn" class="active" _="on click
            if me has .active
              put 'returned early' into #result then
              return
            end then
            put 'after return' into #result">Test</button>
          <div id="result">-</div>
        `;
        (window as any).hyperfixi.init();
      });

      await page.click('#btn');
      await expect(page.locator('#result')).toHaveText('returned early');
    });
  });

  test.describe('Edge Cases', () => {
    test('handles nested blocks', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML = `
          <button id="btn" _="on click
            set :sum to 0 then
            repeat 3 times
              repeat 2 times
                increment :sum
              end
            end then
            put :sum into #result">Test</button>
          <div id="result">-</div>
        `;
        (window as any).hyperfixi.init();
      });

      await page.click('#btn');
      await expect(page.locator('#result')).toHaveText('6');
    });

    test('handles chained commands with then', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML =
          '<button id="btn" _="on click add .a then add .b then add .c">Chain</button>';
        (window as any).hyperfixi.init();
      });

      await page.click('#btn');
      const btn = page.locator('#btn');
      await expect(btn).toHaveClass(/a/);
      await expect(btn).toHaveClass(/b/);
      await expect(btn).toHaveClass(/c/);
    });

    test('handles empty blocks gracefully', async ({ page }) => {
      await page.evaluate(() => {
        document.body.innerHTML = `
          <button id="btn" _="on click
            if false
            end then
            put 'done' into #result">Test</button>
          <div id="result">-</div>
        `;
        (window as any).hyperfixi.init();
      });

      await page.click('#btn');
      await expect(page.locator('#result')).toHaveText('done');
    });
  });
});
