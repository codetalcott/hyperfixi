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
