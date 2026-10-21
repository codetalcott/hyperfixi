// Tests for what upstream does not have, in the form of upstream's own tests and on the same
// fixtures: the syntax in src/additions.ts, and the two additions in src/htmx-compat.ts (fixi,
// and a hand-off to htmx that does not recurse). `npm run test:own` runs them; every one must
// pass.
import { test, expect } from '../fixtures.js';

test.describe('new <Constructor>(...)', () => {
  test('constructs with arguments, and the result takes a method call', async ({ html, find }) => {
    await html("<div _='on click put new Date(2020, 0, 15).getFullYear() into me'></div>");
    await find('div').dispatchEvent('click');
    await expect(find('div')).toHaveText('2020');
  });

  test('works in parentheses inside a larger expression', async ({ html, find }) => {
    await html(
      `<div _="on click put 'in ' + (new Date(2020, 0, 15)).getFullYear() + '!' into me"></div>`
    );
    await find('div').dispatchEvent('click');
    await expect(find('div')).toHaveText('in 2020!');
  });

  test('assigns: `set x to new ...` no longer reads `new` as a variable', async ({
    html,
    find,
  }) => {
    await html(
      "<div _='on click set d to new Date(1999, 5, 1) then put d.getFullYear() into me'></div>"
    );
    await find('div').dispatchEvent('click');
    await expect(find('div')).toHaveText('1999');
  });

  test('takes a dotted constructor', async ({ html, find }) => {
    await html(
      `<div _="on click put new Intl.NumberFormat('en-US').format(1234.5) into me"></div>`
    );
    await find('div').dispatchEvent('click');
    await expect(find('div')).toHaveText('1,234.5');
  });

  test('evaluates its arguments, and waits for one that is a promise', async ({ html, find }) => {
    await html(
      "<div _='on click put new Date(promiseValueBackIn(2001, 10), 0, 1).getFullYear() into me'></div>"
    );
    await find('div').dispatchEvent('click');
    await expect(find('div')).toHaveText('2001');
  });

  test('takes an element as an argument', async ({ html, find }) => {
    await html(
      `<form _="on click set data to new FormData(me) then put data.get('q') into #out">` +
        `<input name="q" value="tea"></form><div id="out"></div>`
    );
    await find('form').dispatchEvent('click');
    await expect(find('#out')).toHaveText('tea');
  });

  test('`new` is still an ordinary variable name', async ({ html, find }) => {
    await html("<div _='on click set new to 5 then put new into me'></div>");
    await find('div').dispatchEvent('click');
    await expect(find('div')).toHaveText('5');
  });

  test('says so when the name is not a constructor', async ({ error }) => {
    expect(await error('new nothingHere()')).toBe("'nothingHere' is not a constructor");
  });
});

test.describe('toggle <element>', () => {
  const state = (find, selector) =>
    find(selector).evaluate(e => ({ open: e.open, modal: e.matches(':modal') }));

  test('opens a closed dialog without making it modal, and closes an open one', async ({
    html,
    find,
  }) => {
    await html("<dialog id='d'>hi</dialog><button _='on click toggle #d'></button>");
    await find('button').dispatchEvent('click');
    expect(await state(find, '#d')).toEqual({ open: true, modal: false });
    await find('button').dispatchEvent('click');
    expect(await state(find, '#d')).toEqual({ open: false, modal: false });
  });

  for (const form of ['toggle #d modal', 'toggle #d as modal']) {
    test(`\`${form}\` opens the dialog as a modal`, async ({ html, find, evaluate }) => {
      await html(`<dialog id='d'>hi</dialog><button _='on click ${form}'></button>`);
      await find('button').dispatchEvent('click');
      expect(await state(find, '#d')).toEqual({ open: true, modal: true });
      // A modal dialog makes the rest of the page inert, so the second click is dispatched.
      await find('button').dispatchEvent('click');
      expect(await state(find, '#d')).toEqual({ open: false, modal: false });
      await evaluate(() => document.querySelector('dialog')?.close());
    });
  }

  test('opens and closes a details element', async ({ html, find }) => {
    await html(
      "<details id='x'><summary>s</summary>body</details><button _='on click toggle #x'></button>"
    );
    await find('button').dispatchEvent('click');
    await expect(find('#x')).toHaveAttribute('open', '');
    await find('button').dispatchEvent('click');
    await expect(find('#x')).not.toHaveAttribute('open');
  });

  test('a summary stands for its details', async ({ html, find }) => {
    await html(
      "<details id='x'><summary id='s'>s</summary>body</details><button _='on click toggle #s'></button>"
    );
    await find('button').dispatchEvent('click');
    await expect(find('#x')).toHaveAttribute('open', '');
  });

  test('toggles every element of a query', async ({ html, find }) => {
    await html(
      '<details open>a</details><details>b</details><button _="on click toggle <details/>"></button>'
    );
    await find('button').dispatchEvent('click');
    await expect(find('details').first()).not.toHaveAttribute('open');
    await expect(find('details').last()).toHaveAttribute('open', '');
  });

  test('takes an expression with a prefix: `toggle the first <details/>`', async ({
    html,
    find,
  }) => {
    await html(
      '<details>a</details><details>b</details><button _="on click toggle the first <details/>"></button>'
    );
    await find('button').dispatchEvent('click');
    await expect(find('details').first()).toHaveAttribute('open', '');
    await expect(find('details').last()).not.toHaveAttribute('open');
  });

  test('shows and hides a popover', async ({ html, find }) => {
    await html("<div popover id='p'>pop</div><button _='on click toggle #p'></button>");
    const shown = () => find('#p').evaluate(e => e.matches(':popover-open'));
    await find('button').dispatchEvent('click');
    expect(await shown()).toBe(true);
    await find('button').dispatchEvent('click');
    expect(await shown()).toBe(false);
  });

  test('focuses a select, and blurs it when it has the focus', async ({ html, find }) => {
    await html(
      "<select id='s'><option>a</option></select><button _='on click toggle #s'></button>"
    );
    const focused = () => find('#s').evaluate(e => document.activeElement === e);
    await find('button').dispatchEvent('click');
    expect(await focused()).toBe(true);
    await find('button').dispatchEvent('click');
    expect(await focused()).toBe(false);
  });

  test('carries on to the next command', async ({ html, find }) => {
    await html(
      "<details id='x'>a</details><button _='on click toggle #x then put \"done\" into me'></button>"
    );
    await find('button').dispatchEvent('click');
    await expect(find('button')).toHaveText('done');
    await expect(find('#x')).toHaveAttribute('open', '');
  });

  test("upstream's `toggle <variable> between` is unchanged", async ({ html, find }) => {
    await html(
      '<div _=\'on click toggle $mode between "a" and "b" then put $mode into me\'></div>'
    );
    await find('div').dispatchEvent('click');
    await expect(find('div')).toHaveText('a');
    await find('div').dispatchEvent('click');
    await expect(find('div')).toHaveText('b');
  });

  test('reports an element it cannot toggle', async ({ html, find }) => {
    await html(
      "<p id='plain'></p>" +
        "<button _='on click toggle #plain on exception(error) put error.message into me'></button>"
    );
    await find('button').dispatchEvent('click');
    await expect(find('button')).toHaveText(
      'toggle needs a dialog, details, select or popover element'
    );
  });

  test('reports a target that is not there', async ({ error }) => {
    expect(await error('toggle #missing')).toBe("'#missing' is null");
  });
});

test.describe('fixi: content it swaps in runs', () => {
  // Upstream has no fixi integration; the engine processes the content on `fx:swapped`.
  const fixi = new URL('./vendor/fixi-0.9.4.js', import.meta.url).pathname;

  test('into a target', async ({ withScripts, html, find, mock }) => {
    await withScripts(fixi);
    await mock(
      'GET',
      '/frag',
      `<button id="in" _="on click increment :n then put :n into me">x</button>`
    );
    await html(`<button id="load" fx-action="/frag" fx-target="#t" fx-swap="innerHTML">load</button>
                <div id="t"></div>`);
    await find('#load').click();
    await expect(find('#in[data-hyperscript-powered]')).toHaveCount(1);
    await find('#in').click();
    await expect(find('#in')).toHaveText('1');
  });

  test("in place of the element that asked (fixi's default swap)", async ({
    withScripts,
    html,
    find,
    mock,
  }) => {
    await withScripts(fixi);
    await mock('GET', '/frag', `<button id="in" _="on click put 'swapped' into me">x</button>`);
    await html(`<button id="load" fx-action="/frag">load</button>`);
    await find('#load').click();
    await expect(find('#in[data-hyperscript-powered]')).toHaveCount(1);
    await find('#in').click();
    await expect(find('#in')).toHaveText('swapped');
  });

  test('into <html> (an innerHTML swap of the whole document, which has no parent)', async ({
    withScripts,
    page,
    html,
    mock,
  }) => {
    await withScripts(fixi);
    await mock(
      'GET',
      '/doc',
      `<head></head><body><button id="in" _="on click put 'whole' into me">x</button></body>`
    );
    await html(
      `<button id="load" fx-action="/doc" fx-target="html" fx-swap="innerHTML">load</button>`
    );
    await page.locator('#load').click();
    await expect(page.locator('#in[data-hyperscript-powered]')).toHaveCount(1);
    await page.locator('#in').click();
    await expect(page.locator('#in')).toHaveText('whole');
  });
});

test.describe('htmx: a page with its own hooks between htmx and the engine', () => {
  // The workarounds while the engine had no htmx integration: `htmx.onLoad(el =>
  // _hyperscript.process(el))` for content htmx swaps in, `_hyperscript.addAfterProcessHook(el =>
  // htmx.process(el))` for htmx content a script puts in. On upstream each recurses until the
  // stack runs out. The engine's hand-off to htmx marks what htmx then processes as htmx's, and a
  // root already being processed is not processed again (src/engine.ts, `processing`).
  const htmx = new URL('./vendor/htmx-4.0.0.min.js', import.meta.url).pathname;

  test('htmx.onLoad: no recursion, and the swapped content runs once', async ({
    withScripts,
    page,
    html,
    find,
    mock,
    evaluate,
  }) => {
    const errors = [];
    const onError = e => errors.push(e.message);
    page.on('pageerror', onError);
    try {
      await withScripts(htmx);
      await evaluate(() => htmx.onLoad(el => _hyperscript.process(el)));
      await mock(
        'GET',
        '/frag',
        `<button id="in" _="on click increment :n then put :n into me">x</button>`
      );
      await html(`<button id="load" hx-get="/frag" hx-target="#t">load</button><div id="t"></div>`);
      await find('#load').click();
      await expect(find('#in[data-hyperscript-powered]')).toHaveCount(1);
      await find('#in').click();
      await expect(find('#in')).toHaveText('1');
    } finally {
      page.off('pageerror', onError);
    }
    expect(errors).toEqual([]);
  });

  test('both hooks: no recursion, and both directions work', async ({
    withScripts,
    page,
    html,
    find,
    mock,
    evaluate,
  }) => {
    const errors = [];
    const onError = e => errors.push(e.message);
    page.on('pageerror', onError);
    try {
      await withScripts(htmx);
      await evaluate(() => {
        htmx.onLoad(el => _hyperscript.process(el));
        _hyperscript.addAfterProcessHook(el => htmx.process(el));
      });
      await mock('GET', '/frag', `<button id="in" _="on click put 'swapped' into me">x</button>`);
      await mock('GET', '/data', '<span>loaded</span>');
      await html(
        `<button id="load" hx-get="/frag" hx-target="#t">load</button><div id="t"></div>
         <button id="add" _="on click put '<button id=req hx-get=/data hx-target=#u>go</button>' into #slot">add</button>
         <div id="slot"></div><div id="u"></div>`
      );
      await find('#load').click();
      await expect(find('#in[data-hyperscript-powered]')).toHaveCount(1);
      await find('#in').click();
      await expect(find('#in')).toHaveText('swapped');
      await find('#add').click();
      await find('#req').click();
      await expect(find('#u span')).toHaveText('loaded');
    } finally {
      page.off('pageerror', onError);
    }
    expect(errors).toEqual([]);
  });
});
