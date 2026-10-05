/**
 * Multilingual end to end, on the engine.
 *
 * The stack a page loads to run hyperscript written in another language: the
 * engine's `hyperfixi-hs.js`, a `@lokascript/semantic` bundle, and the lite
 * `@lokascript/hyperscript-adapter` (test-multilingual-e2e.html). Each test
 * writes an `_` attribute the way an author would, under a `lang`, and clicks
 * it; the adapter hands the engine the English as it reads the script.
 *
 * Until Phase C3 (C-R3) this spec drove core's `hyperfixi-multilingual.js`
 * through `hyperfixi.execute(code, lang)`. That bundle and its API retired; the
 * commands and languages here are the ones it covered.
 */

import { test, expect, type Page } from '@playwright/test';

interface Setup {
  lang?: string;
  classes?: string[];
  hidden?: boolean;
  clicks?: number;
}

interface Outcome {
  classes: string[];
  display: string;
  written: string | null;
  parseErrors: number;
}

/** Add a button with `_` = code, let the engine read it, click it. */
async function run(page: Page, code: string, setup: Setup = {}): Promise<Outcome> {
  return page.evaluate(
    ({ code, setup }) => {
      const el = document.createElement('button');
      if (setup.lang) el.lang = setup.lang;
      for (const c of setup.classes ?? []) el.classList.add(c);
      if (setup.hidden) el.style.display = 'none';
      el.setAttribute('_', code);
      let parseErrors = 0;
      document.body.addEventListener('hyperscript:parse-error', () => parseErrors++);
      document.body.appendChild(el);
      (window as any)._hyperscript.processNode(el);
      for (let i = 0; i < (setup.clicks ?? 1); i++) el.click();
      return {
        classes: [...el.classList],
        display: el.style.display,
        written: el.getAttribute('_'),
        parseErrors,
      };
    },
    { code, setup }
  );
}

test.describe('Multilingual E2E (hyperfixi-hs.js + semantic + lite adapter)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/packages/core/test-multilingual-e2e.html');
  });

  test('the three scripts load @quick', async ({ page }) => {
    const loaded = await page.evaluate(() => ({
      engine: typeof (window as any)._hyperscript?.processNode,
      semantic: typeof (window as any).LokaScriptSemantic?.parse,
      adapter: typeof (window as any).HyperscriptI18n,
    }));
    expect(loaded).toEqual({ engine: 'function', semantic: 'function', adapter: 'object' });
  });

  // ===========================================================================
  // English (the adapter leaves it as written)
  // ===========================================================================

  test.describe('English', () => {
    test('toggle adds a class @quick', async ({ page }) => {
      expect((await run(page, 'on click toggle .active')).classes).toContain('active');
    });

    test('toggle removes it on the second click', async ({ page }) => {
      const { classes } = await run(page, 'on click toggle .active', { clicks: 2 });
      expect(classes).not.toContain('active');
    });

    test('add adds a class @quick', async ({ page }) => {
      expect((await run(page, 'on click add .highlight')).classes).toContain('highlight');
    });

    test('remove removes a class', async ({ page }) => {
      const { classes } = await run(page, 'on click remove .existing', { classes: ['existing'] });
      expect(classes).not.toContain('existing');
    });

    test('hide hides the element', async ({ page }) => {
      expect((await run(page, 'on click hide me')).display).toBe('none');
    });

    test('show shows a hidden element', async ({ page }) => {
      expect((await run(page, 'on click show me', { hidden: true })).display).not.toBe('none');
    });
  });

  // ===========================================================================
  // Japanese (SOV)
  // ===========================================================================

  test.describe('Japanese', () => {
    test('toggle (SOV order) @quick', async ({ page }) => {
      const { classes } = await run(page, 'クリック で .active を トグル', { lang: 'ja' });
      expect(classes).toContain('active');
    });

    test('add', async ({ page }) => {
      const { classes } = await run(page, 'クリック で .highlight を 追加', { lang: 'ja' });
      expect(classes).toContain('highlight');
    });

    test('remove', async ({ page }) => {
      const outcome = await run(page, 'クリック で .existing を 削除', {
        lang: 'ja',
        classes: ['existing'],
      });
      expect(outcome.classes).not.toContain('existing');
    });
  });

  // ===========================================================================
  // Korean (SOV)
  // ===========================================================================

  test.describe('Korean', () => {
    test('toggle (SOV order) @quick', async ({ page }) => {
      const { classes } = await run(page, '클릭 할 때 .active 를 토글', { lang: 'ko' });
      expect(classes).toContain('active');
    });

    test('add', async ({ page }) => {
      const { classes } = await run(page, '클릭 할 때 .highlight 를 추가', { lang: 'ko' });
      expect(classes).toContain('highlight');
    });
  });

  // ===========================================================================
  // Spanish (SVO)
  // ===========================================================================

  test.describe('Spanish', () => {
    test('toggle @quick', async ({ page }) => {
      const { classes } = await run(page, 'al clic alternar .active', { lang: 'es' });
      expect(classes).toContain('active');
    });

    test('add', async ({ page }) => {
      const { classes } = await run(page, 'al clic añadir .highlight', { lang: 'es' });
      expect(classes).toContain('highlight');
    });
  });

  // ===========================================================================
  // Arabic (VSO)
  // ===========================================================================

  test.describe('Arabic', () => {
    test('toggle @quick', async ({ page }) => {
      const { classes } = await run(page, 'عند النقر بدّل .active', { lang: 'ar' });
      expect(classes).toContain('active');
    });
  });

  // ===========================================================================
  // Where the language comes from, and what stays in the DOM
  // ===========================================================================

  test.describe('Language and the DOM', () => {
    test('the page language applies to an element without its own', async ({ page }) => {
      await page.evaluate(() => document.documentElement.setAttribute('lang', 'es'));
      const { classes } = await run(page, 'al clic alternar .active');
      expect(classes).toContain('active');
    });

    test('the attribute keeps what its author wrote @quick', async ({ page }) => {
      const code = 'クリック で .active を トグル';
      const { classes, written } = await run(page, code, { lang: 'ja' });
      expect(classes).toContain('active');
      expect(written).toBe(code);
    });
  });

  // ===========================================================================
  // Translation (the semantic bundle's API)
  // ===========================================================================

  test.describe('Translation', () => {
    test('English to Japanese @quick', async ({ page }) => {
      const result = await page.evaluate(() =>
        (window as any).LokaScriptSemantic.translate('toggle .active', 'en', 'ja')
      );
      expect(result).toMatch(/トグル|切り替え/);
    });

    test('Japanese to English', async ({ page }) => {
      const result = await page.evaluate(() =>
        (window as any).LokaScriptSemantic.translate('.active を トグル', 'ja', 'en')
      );
      expect(result.toLowerCase()).toContain('toggle');
    });
  });

  // ===========================================================================
  // Failure: nothing runs, nothing is rewritten
  // ===========================================================================

  test.describe('Failure', () => {
    test('a language no bundle knows is read as written, and does not run', async ({ page }) => {
      const code = 'クリック で .active を トグル';
      const { classes, written } = await run(page, code, { lang: 'xx' });
      expect(classes).not.toContain('active');
      expect(written).toBe(code);
    });

    test('a script that does not parse reports a parse error', async ({ page }) => {
      const { classes, parseErrors } = await run(page, 'foobar baz');
      expect(classes).toEqual([]);
      expect(parseErrors).toBeGreaterThan(0);
    });
  });
});
