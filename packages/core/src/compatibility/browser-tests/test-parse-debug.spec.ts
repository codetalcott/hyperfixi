import { test, expect } from '@playwright/test';

test('behavior parse test', async ({ page }) => {
  await page.goto('http://localhost:3000/packages/core/compatibility-test.html');

  await page.waitForFunction(() => (window as any).lokascript?.compileSync);

  const result = await page.evaluate(() => {
    const lokascript = (window as any).lokascript;

    // Test various behavior forms to narrow down the issue
    const testCases: Record<string, string> = {
      simple: `behavior Test
  on click
    toggle .active
  end
end`,
      withParams: `behavior Test(a, b, c)
  on click
    toggle .active
  end
end`,
      withConfirm: `behavior Test(confirm)
  on click
    toggle .active
  end
end`,
      withFrom: `behavior Test
  on click from me
    toggle .active
  end
end`,
      withFromParam: `behavior Test(target)
  on click from target
    toggle .active
  end
end`,
      withInit: `behavior Test(param)
  init
    if param is undefined
      set param to me
    end
  end
  on click
    toggle .active
  end
end`,
      withNestedIf: `behavior Test(confirm)
  on click
    if confirm
      halt
    end
  end
end`,
      withTriggerCommand: `behavior Test
  on click
    trigger myevent
  end
end`,
      withTriggerParam: `behavior Test(trigger)
  on click from trigger
    toggle .active
  end
end`,
      withInitAndFrom: `behavior Test(trigger)
  init
    if trigger is undefined
      set trigger to me
    end
  end
  on click from trigger
    toggle .active
  end
end`,
      withTriggerParamAndCommand: `behavior Test(trigger)
  on click from trigger
    trigger myevent
  end
end`,
      removable: `behavior Removable(triggerEl, confirm, effect)
  init
    if triggerEl is undefined
      set triggerEl to me
    end
  end
  on click from triggerEl
    if confirm
      if not window.confirm("Are you sure?")
        halt
      end
    end
    trigger removable:before
    if effect is "fade"
      transition opacity to 0 over 300ms
    end
    trigger removable:removed
    remove me
  end
end`,
    };

    const results: Record<string, any> = {};

    for (const [name, source] of Object.entries(testCases)) {
      try {
        const r = lokascript.compileSync(source, { traditional: true });
        results[name] = { ok: r.ok, errors: r.errors };
        // If failed, try with different approaches for debugging
        if (!r.ok && name === 'withTriggerParam') {
          // Try parsing without traditional
          const r2 = lokascript.compileSync(source);
          results[name + '_semantic'] = { ok: r2.ok, errors: r2.errors };
          // Also log the parser metadata
          results[name + '_meta'] = r.meta || 'no meta';
        }
      } catch (e: any) {
        results[name] = { error: e.message };
      }
    }

    return results;
  });

  console.log('Test results:', JSON.stringify(result, null, 2));

  // Check each case
  const failed = Object.entries(result).filter(([, r]) => !r.ok);
  if (failed.length > 0) {
    console.log('Failed cases:', failed.map(([name]) => name).join(', '));
  }

  expect(failed.length).toBe(0);
});
