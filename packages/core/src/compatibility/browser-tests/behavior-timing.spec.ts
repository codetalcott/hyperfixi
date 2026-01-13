import { test, expect } from '@playwright/test';

test('check behaviors timing and installation', async ({ page }) => {
  const logs: string[] = [];

  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  await page.goto('http://localhost:3000/examples/behaviors/demo.html');

  // Wait a bit for everything to initialize
  await page.waitForTimeout(1000);

  // Check debug log
  const debugLog = await page.evaluate(() => {
    return (window as any).__hyperfixi_debug || [];
  });
  console.log('Debug log:', debugLog);

  // Check if behaviors are registered
  const behaviorCheck = await page.evaluate(() => {
    const hs = (window as any)._hyperscript;
    return {
      hasBehaviors: !!hs?.behaviors,
      hasDraggable: hs?.behaviors?.has('Draggable'),
      hasToggleable: hs?.behaviors?.has('Toggleable'),
      hasRemovable: hs?.behaviors?.has('Removable'),
      hasSortable: hs?.behaviors?.has('Sortable'),
      hasResizable: hs?.behaviors?.has('Resizable'),
      behaviorsReadyExists: typeof (window as any).__hyperfixi_behaviors_ready !== 'undefined',
    };
  });
  console.log('Behavior check:', behaviorCheck);

  // Check if elements have behaviors installed
  const elementCheck = await page.evaluate(() => {
    const draggable = document.querySelector('.draggable-box');
    const toggleable = document.querySelector('.toggle-button');
    return {
      draggableHasBehaviors: !!(draggable as any)?.__hyperscript?._behaviors?.length,
      toggleableHasBehaviors: !!(toggleable as any)?.__hyperscript?._behaviors?.length,
      draggable_hyperscript: (draggable as any)?.__hyperscript,
      toggleable_hyperscript: (toggleable as any)?.__hyperscript,
    };
  });
  console.log('Element check:', elementCheck);

  // Try manually installing on an element and test if it works
  const manualInstall = await page.evaluate(async () => {
    const hf = (window as any).hyperfixi;
    const testBtn = document.createElement('button');
    testBtn.className = 'test-toggle';
    testBtn.textContent = 'Test';
    document.body.appendChild(testBtn);

    const result = hf.compile('install Toggleable');
    if (!result.success) return { error: result.errors };

    const ctx = hf.createContext();
    ctx.me = testBtn;
    await hf.execute(result.ast, ctx);

    // Check class before click
    const beforeClick = testBtn.classList.contains('active');

    // Simulate click
    testBtn.click();

    // Wait a tick
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check class after click
    const afterClick = testBtn.classList.contains('active');

    return {
      installed: !!(testBtn as any).__hyperscript?._behaviors?.length,
      beforeClick,
      afterClick,
      toggled: !beforeClick && afterClick,
    };
  });
  console.log('Manual install:', manualInstall);

  // Test actual page button - toggle on and off
  const toggleButton = page.locator('.toggle-button');
  const beforeClick = await toggleButton.evaluate(el => el.classList.contains('active'));
  await toggleButton.click();
  await page.waitForTimeout(100);
  const afterFirstClick = await toggleButton.evaluate(el => el.classList.contains('active'));
  await toggleButton.click();
  await page.waitForTimeout(100);
  const afterSecondClick = await toggleButton.evaluate(el => el.classList.contains('active'));
  console.log('Page button test:', {
    beforeClick,
    afterFirstClick,
    afterSecondClick,
    toggledOn: !beforeClick && afterFirstClick,
    toggledOff: afterFirstClick && !afterSecondClick,
  });

  // Log console messages
  console.log('\nConsole logs:', logs);

  expect(behaviorCheck.hasDraggable).toBe(true);
  expect(behaviorCheck.hasToggleable).toBe(true);
  expect(afterFirstClick).toBe(true);
  expect(afterSecondClick).toBe(false);
});
