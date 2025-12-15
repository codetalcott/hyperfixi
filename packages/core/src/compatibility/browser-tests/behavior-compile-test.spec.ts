import { test, expect } from '@playwright/test';

test('test each behavior compilation', async ({ page }) => {
  await page.goto('http://localhost:3000/packages/core/compatibility-test.html');

  // Wait for hyperfixi to load
  await page.waitForFunction(() => (window as any).hyperfixi?.compile);

  const results = await page.evaluate(() => {
    const hf = (window as any).hyperfixi;

    const behaviors = {
      Draggable: `
behavior Draggable(dragHandle)
  init
    if no dragHandle set dragHandle to me
  end
  on pointerdown(clientX, clientY) from dragHandle
    halt the event
    trigger draggable:start
    measure x
    set startX to it
    measure y
    set startY to it
    set xoff to clientX - startX
    set yoff to clientY - startY
    repeat until event pointerup from document
      wait for pointermove(clientX, clientY) or
               pointerup(clientX, clientY) from document
      add { left: \${clientX - xoff}px; top: \${clientY - yoff}px; }
      trigger draggable:move
    end
    trigger draggable:end
  end
end
`.trim(),

      Sortable: `
behavior Sortable(handle, dragClass)
  init
    if no dragClass set dragClass to "sorting"
  end
  on pointerdown(target, clientY) from me
    set item to closest <li/> in target
    if no item exit
    if handle
      set handleEl to target.closest(handle)
      if no handleEl exit
    end
    halt the event
    add dragClass to item
    trigger sortable:start on me
    repeat until event pointerup from document
      wait for pointermove(clientY) from document
      trigger sortable:move on me
    end
    remove dragClass from item
    trigger sortable:end on me
  end
end
`.trim(),

      Resizable: `
behavior Resizable(handle, minWidth, minHeight, maxWidth, maxHeight)
  init
    if no minWidth set minWidth to 50
    if no minHeight set minHeight to 50
    if no maxWidth set maxWidth to 9999
    if no maxHeight set maxHeight to 9999
  end
  on pointerdown(clientX, clientY) from handle
    halt the event
    trigger resizable:start
    measure width
    set startWidth to it
    measure height
    set startHeight to it
    set startX to clientX
    set startY to clientY
    repeat until event pointerup from document
      wait for pointermove(clientX, clientY) or
               pointerup from document
      set newWidth to startWidth + (clientX - startX)
      set newHeight to startHeight + (clientY - startY)
      if newWidth < minWidth set newWidth to minWidth
      if newWidth > maxWidth set newWidth to maxWidth
      if newHeight < minHeight set newHeight to minHeight
      if newHeight > maxHeight set newHeight to maxHeight
      add { width: \${newWidth}px; height: \${newHeight}px; }
      trigger resizable:resize
    end
    trigger resizable:end
  end
end
`.trim()
    };

    const results: Record<string, { success: boolean; error?: string }> = {};

    for (const [name, source] of Object.entries(behaviors)) {
      try {
        const result = hf.compile(source, { disableSemanticParsing: true });
        results[name] = {
          success: result.success,
          error: result.success ? undefined : result.errors?.[0]?.message || JSON.stringify(result.errors)
        };
      } catch (e: any) {
        results[name] = {
          success: false,
          error: e.message || String(e)
        };
      }
    }

    return results;
  });

  console.log('Compilation results:');
  for (const [name, result] of Object.entries(results)) {
    console.log(`${name}: ${result.success ? 'OK' : 'FAILED - ' + result.error}`);
  }

  // Check all results
  const failed = Object.entries(results).filter(([, r]) => !r.success);
  if (failed.length > 0) {
    console.log('\nFailed behaviors:', failed.map(([n]) => n).join(', '));
  }

  expect(failed.length).toBe(0);
});
