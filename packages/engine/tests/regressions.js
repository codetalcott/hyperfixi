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
