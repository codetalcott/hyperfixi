import { test, expect } from '@playwright/test';

/**
 * examples/behaviors/demo.html on hyperfixi-hs.js + the behaviors bundle: the bundle defines
 * every behavior as a global on the engine before the document is processed, so each
 * `install` in the page finds its behavior; and an element scripted after load is
 * initialised with `hyperfixi.processNode` (upstream's name), which the page's toast helper uses.
 */
test('check behaviors timing and installation @comprehensive', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('http://127.0.0.1:3000/examples/behaviors/demo.html');
  await page.waitForFunction(() => typeof (window as any).Toggleable === 'function', {
    timeout: 10000,
  });
  await page.waitForTimeout(300);

  // Every standard behavior is defined on the engine.
  const defined = await page.evaluate(() =>
    Object.fromEntries(
      ['Draggable', 'Toggleable', 'Removable', 'Sortable', 'Resizable', 'AutoDismiss', 'Tabs'].map(
        n => [n, typeof (window as any)[n] === 'function']
      )
    )
  );
  expect(defined).toEqual({
    Draggable: true,
    Toggleable: true,
    Removable: true,
    Sortable: true,
    Resizable: true,
    AutoDismiss: true,
    Tabs: true,
  });

  // An element scripted after load: processNode installs the behavior and it works.
  const manualInstall = await page.evaluate(async () => {
    const testBtn = document.createElement('button');
    testBtn.className = 'test-toggle';
    testBtn.textContent = 'Test';
    testBtn.setAttribute('_', 'install Toggleable');
    document.body.appendChild(testBtn);
    (window as any).hyperfixi.processNode(testBtn);
    await new Promise(resolve => setTimeout(resolve, 50));
    const beforeClick = testBtn.classList.contains('active');
    testBtn.click();
    await new Promise(resolve => setTimeout(resolve, 50));
    const afterClick = testBtn.classList.contains('active');
    return { beforeClick, afterClick };
  });
  expect(manualInstall).toEqual({ beforeClick: false, afterClick: true });

  // The page's own button toggles on and off.
  const toggleButton = page.locator('.toggle-button').first();
  await toggleButton.click();
  await expect(toggleButton).toHaveClass(/active/);
  await toggleButton.click();
  await expect(toggleButton).not.toHaveClass(/active/);

  expect(errors.filter(e => !e.includes('favicon'))).toEqual([]);
});
