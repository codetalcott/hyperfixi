// Places where this engine differed from upstream and upstream's own tests did not show it.
// Each test passes on upstream. `npm run test:own` runs them; every one must pass.
import { test, expect } from '../fixtures.js';

test.describe('start view transition', () => {
  // The browser calls the transition's update a frame after it starts. A body with no wait in
  // it has finished by then; the handler used to hang there, and the next click did nothing.
  test('a body that finishes at once completes, and the handler runs again', async ({
    html,
    find,
  }) => {
    await html(
      `<div _="on click start view transition increment my @data-n end then put my @data-n into me"
            data-n="0"></div>`
    );
    await find('div').dispatchEvent('click');
    await expect(find('div')).toHaveText('1');
    await find('div').dispatchEvent('click');
    await expect(find('div')).toHaveText('2');
  });
});

test.describe('an attribute after `my`, `its`, `your`', () => {
  // Upstream's build tries "attribute of" before the possessive, and an attribute access takes
  // nothing after it. This engine tried the possessive first and so accepted three forms
  // upstream rejects: a page written against it would fail on upstream.
  for (const tail of ['as Int', '.length', '[0]'])
    test(`\`my @data-n ${tail}\` is an error, as it is on upstream`, async ({ error }) => {
      expect(await error(`put my @data-n ${tail} into me`)).toMatch(/Expected one of/);
    });

  test('parenthesized, the conversion reads the attribute', async ({ html, find }) => {
    await html(`<div data-n="41" _="on click put (my @data-n) as Int + 1 into me"></div>`);
    await find('div').dispatchEvent('click');
    await expect(find('div')).toHaveText('42');
  });
});

test.describe('`beep!` as a command', () => {
  // Upstream has `beep!` twice: an expression (`get beep! 10`, which its suite tests) and a
  // command, `beep! a, b`, which logs each value. This engine had only the expression.
  const beeps = page => {
    const logs = [];
    page.on('console', async msg => {
      if (msg.type() === 'log') logs.push(await Promise.all(msg.args().map(a => a.jsonValue())));
    });
    return logs;
  };

  test('logs each value it is given', async ({ page, html, find }) => {
    const logs = beeps(page);
    await html(`<div _='on click beep! 10, "foo"'></div>`);
    await find('div').dispatchEvent('click');
    await expect.poll(() => logs.length).toBe(2);
    expect(logs[0]).toEqual(['///_ BEEP! The expression (10) evaluates to:', 10, 'of type Number']);
    expect(logs[1]).toEqual([
      '///_ BEEP! The expression ("foo") evaluates to:',
      '"foo"',
      'of type String',
    ]);
  });

  test('the handler goes on after it', async ({ html, find }) => {
    await html(`<div _='on click beep! me then put "done" into me'></div>`);
    await find('div').dispatchEvent('click');
    await expect(find('div')).toHaveText('done');
  });
});
