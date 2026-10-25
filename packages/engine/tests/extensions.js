// Tests for what upstream has no tests for in this engine's extension tier: a page's own module
// (`_hyperscript.register`, parsing with `_hyperscript.kit`), a module registered after the
// document was read, and an extension file (`dist/ext/<name>.js`) loaded by a script tag.
// Upstream's own tests for each extension it has (`ext/<name>.js`) are in the gate.
import { dirname, join } from 'node:path';
import { test, expect } from '../fixtures.js';

const tailwind = join(dirname(process.env.HS_BUNDLE), 'ext', 'tailwind.js');

/** `shout <expr>`: put the value in the element, upper-cased. A module a page writes itself. */
const defineShout = () => {
  window.shout = g => {
    g.commands.shout = (p, _keyword, start) => {
      const value = _hyperscript.kit.expr(p);
      return {
        type: 'shoutCommand',
        start,
        end: p.endPos(),
        run: ctx => void (ctx.me.textContent = String(value.ev(ctx)).toUpperCase()),
      };
    };
  };
};

/** Load the extension file by a script tag the page adds, after the document was read. */
const loadScript = (page, path, times = 1) =>
  page
    .route(/\/__ext\.js/, r => r.fulfill({ contentType: 'text/javascript', path }))
    .then(() =>
      page.evaluate(async n => {
        for (let i = 0; i < n; i++)
          await new Promise((resolve, reject) => {
            const script = Object.assign(document.createElement('script'), {
              src: `/__ext.js?${i}`,
            });
            script.onload = resolve;
            script.onerror = reject;
            document.head.append(script);
          });
      }, times)
    );

test.describe('extensions', () => {
  test('a page adds a command with register, parsing its operand with the kit', async ({
    evaluate,
    html,
    find,
  }) => {
    await evaluate(defineShout);
    await evaluate(() => _hyperscript.register(shout));
    await html(`<div _="on click shout 'hey'"></div>`);
    await find('div').dispatchEvent('click');
    await expect(find('div')).toHaveText('HEY');
  });

  test('a module registered late reads again the scripts that failed to parse, and only those', async ({
    evaluate,
    html,
    find,
  }) => {
    await evaluate(() => {
      window.inits = [];
      document.addEventListener('hyperscript:after:init', e => inits.push(e.target.id));
    });
    await html(`<div id="bad" _="on click shout 'hey'"></div><p id="ok" _="on click log 1"></p>`);
    expect(await evaluate(() => inits)).toEqual(['ok']);
    await evaluate(defineShout);
    await evaluate(() => _hyperscript.register(shout));
    expect(await evaluate(() => inits)).toEqual(['ok', 'bad']);
    await find('#bad').dispatchEvent('click');
    await expect(find('#bad')).toHaveText('HEY');
  });

  test('a module registered twice is added once, and reads nothing again', async ({
    evaluate,
    html,
  }) => {
    await html(`<div _="on click nothingHere"></div>`);
    const counts = await evaluate(() => {
      let added = 0;
      let reads = 0;
      document.addEventListener('hyperscript:before:init', () => reads++);
      const module = () => void added++;
      _hyperscript.register(module);
      const afterFirst = reads;
      _hyperscript.register(module, module);
      return { added, again: reads - afterFirst };
    });
    expect(counts).toEqual({ added: 1, again: 0 });
  });

  test('an extension file after the engine registers its module before the document is read', async ({
    withScripts,
    evaluate,
    html,
    find,
  }) => {
    await withScripts(tailwind);
    expect(await evaluate(() => [..._hyperscript.extensions])).toEqual(['tailwind']);
    await html(`<div _="on click hide with twDisplay"></div>`);
    await find('div').dispatchEvent('click');
    await expect(find('div')).toHaveClass(/hidden/);
  });

  test('an extension file loaded late still applies to a script that failed to parse', async ({
    page,
    html,
    find,
  }) => {
    await html(`<div _="on click hide with twDisplay"></div>`);
    await loadScript(page, tailwind);
    await find('div').dispatchEvent('click');
    await expect(find('div')).toHaveClass(/hidden/);
  });

  test('an extension file loaded twice registers its module once', async ({ page, evaluate }) => {
    await evaluate(() => {
      window.registers = 0;
      const register = _hyperscript.register;
      _hyperscript.register = (...modules) => (registers++, register(...modules));
    });
    await loadScript(page, tailwind, 2);
    expect(await evaluate(() => registers)).toBe(1);
  });

  test('an extension file with no engine before it says so, and registers nothing', async ({
    page,
    evaluate,
  }) => {
    const warnings = [];
    page.on('console', m => m.type() === 'warning' && warnings.push(m.text()));
    await evaluate(() => {
      window.engine = window._hyperscript;
      delete window._hyperscript;
    });
    await loadScript(page, tailwind);
    await evaluate(() => (window._hyperscript = window.engine));
    expect(warnings).toEqual([
      '[hyperfixi] ext/tailwind.js needs @hyperfixi/engine (hyperfixi-hs.js), loaded before it',
    ]);
    expect(await evaluate(() => _hyperscript.extensions.size)).toBe(0);
  });
});
