import { test } from '@playwright/test';

test('diagnostic: check behavior installation', async ({ page }) => {
  // Capture all console output
  const logs: string[] = [];
  page.on('console', msg => logs.push('[' + msg.type() + '] ' + msg.text()));

  await page.goto('/examples/behaviors/demo.html');
  // Wait for hyperscript:ready event
  await page.waitForFunction(() => (window as any)._hyperscript?.behaviors !== undefined, {
    timeout: 10000,
  });
  await page.waitForTimeout(500);

  const result = await page.evaluate(async () => {
    const hf = (window as any)._hyperscript;
    const results: string[] = [];

    if (!hf) {
      results.push('ERROR: _hyperscript not found');
      return results;
    }

    results.push('_hyperscript exists: ' + !!hf);
    results.push('_hyperscript.runtime exists: ' + !!hf.runtime);
    results.push('_hyperscript.behaviors exists: ' + !!hf.behaviors);

    if (hf.behaviors) {
      results.push('behaviors.has is function: ' + (typeof hf.behaviors.has === 'function'));
      results.push(
        'behaviors.install is function: ' + (typeof hf.behaviors.install === 'function')
      );
      results.push('Has Draggable: ' + hf.behaviors.has('Draggable'));
      results.push('Has Removable: ' + hf.behaviors.has('Removable'));
      results.push('Has Toggleable: ' + hf.behaviors.has('Toggleable'));

      // Check behavior definitions
      if (hf.behaviors.get) {
        const draggable = hf.behaviors.get('Draggable');
        if (draggable) {
          results.push('Draggable behavior name: ' + draggable.name);
          results.push('Draggable params: ' + JSON.stringify(draggable.parameters));
          results.push('Draggable has initBlock: ' + !!draggable.initBlock);
          results.push('Draggable has eventHandlers: ' + !!draggable.eventHandlers);
          results.push('Draggable eventHandlers count: ' + (draggable.eventHandlers?.length || 0));
          if (draggable.eventHandlers && draggable.eventHandlers.length > 0) {
            const handler = draggable.eventHandlers[0];
            results.push('First handler event: ' + handler.event);
            results.push('First handler target: ' + handler.target);
            results.push('First handler commands count: ' + (handler.commands?.length || 0));
          }
        }

        // Check Toggleable too - simpler behavior
        const toggleable = hf.behaviors.get('Toggleable');
        if (toggleable) {
          results.push('Toggleable has eventHandlers: ' + !!toggleable.eventHandlers);
          results.push(
            'Toggleable eventHandlers count: ' + (toggleable.eventHandlers?.length || 0)
          );
          if (toggleable.eventHandlers && toggleable.eventHandlers.length > 0) {
            const handler = toggleable.eventHandlers[0];
            results.push('Toggleable first handler event: ' + handler.event);
            results.push(
              'Toggleable first handler commands count: ' + (handler.commands?.length || 0)
            );
          }
        }
      }
    }

    // Check if any element has been processed
    const draggableBox = document.querySelector('.draggable-box') as HTMLElement;
    if (draggableBox) {
      results.push('Draggable box found: ' + !!draggableBox);
      results.push('Has _hyperscript attr: ' + draggableBox.getAttribute('_'));
      results.push('Has __hyperscript property: ' + !!(draggableBox as any).__hyperscript);

      // Try to manually compile
      const hfAttr = draggableBox.getAttribute('_');
      if (hfAttr && hf.compile) {
        try {
          const compiled = hf.compile(hfAttr);
          results.push('Compiled successfully: ' + compiled.success);
          if (compiled.errors && compiled.errors.length > 0) {
            results.push('Errors: ' + JSON.stringify(compiled.errors));
          }
          if (compiled.ast) {
            results.push('AST type: ' + compiled.ast.type);
            results.push('AST name: ' + compiled.ast.name);
            results.push(
              'AST args length: ' + (compiled.ast.args ? compiled.ast.args.length : 'N/A')
            );
          }
        } catch (e) {
          results.push('Compile error: ' + e);
        }
      }
    }

    // Check removable item
    const removableItem = document.querySelector('.removable-item') as HTMLElement;
    if (removableItem) {
      const hfAttr = removableItem.getAttribute('_');
      if (hfAttr && hf.compile) {
        try {
          const compiled = hf.compile(hfAttr);
          results.push('Removable compiled successfully: ' + compiled.success);
          if (compiled.errors && compiled.errors.length > 0) {
            results.push('Removable errors: ' + JSON.stringify(compiled.errors));
          }
        } catch (e) {
          results.push('Removable compile error: ' + e);
        }
      }
    }

    // Check script tag processing
    const scriptTag = document.querySelector('script[type="text/hyperscript"]');
    if (scriptTag) {
      results.push('Script tag found: ' + !!scriptTag);
      results.push('Script content length: ' + (scriptTag.textContent?.length || 0));
    }

    // Check hyperfixi object
    const hyperfixi = (window as any).hyperfixi;
    if (hyperfixi) {
      results.push('hyperfixi exists: true');
      results.push('hyperfixi methods: ' + Object.keys(hyperfixi).join(', '));
    }

    // Check _hyperscript methods
    results.push('_hyperscript methods: ' + Object.keys(hf).join(', '));

    // Try hyperfixi.processElement
    if (hyperfixi && hyperfixi.processElement && draggableBox) {
      try {
        results.push('Attempting hyperfixi.processElement...');
        hyperfixi.processElement(draggableBox);
        results.push(
          'After hyperfixi.processElement - Has __hyperscript: ' +
            !!(draggableBox as any).__hyperscript
        );
      } catch (e) {
        results.push('hyperfixi.processElement error: ' + e);
      }
    }

    // Try hyperfixi.process to process element
    if (hyperfixi && hyperfixi.process && draggableBox) {
      try {
        results.push('Attempting hyperfixi.process...');
        const processResult = hyperfixi.process(draggableBox);
        results.push('hyperfixi.process returned: ' + typeof processResult);
        if (processResult) {
          results.push('hyperfixi.process result keys: ' + Object.keys(processResult).join(', '));
          results.push('hyperfixi.process success: ' + processResult.success);
          if (processResult.errors) {
            results.push('hyperfixi.process errors: ' + JSON.stringify(processResult.errors));
          }
          if (processResult.ast) {
            results.push('hyperfixi.process AST type: ' + processResult.ast.type);
            results.push('hyperfixi.process AST name: ' + processResult.ast.name);
          }
        }
        results.push(
          'After hyperfixi.process - Has __hyperscript: ' + !!(draggableBox as any).__hyperscript
        );
      } catch (e) {
        results.push('hyperfixi.process error: ' + e);
      }
    }

    // Try to run execute directly with compile
    if (
      hyperfixi &&
      hyperfixi.compile &&
      hyperfixi.execute &&
      hyperfixi.createContext &&
      draggableBox
    ) {
      try {
        results.push('Manual compile/execute test...');
        const code = 'install Draggable';
        const compiled = hyperfixi.compile(code);
        results.push('Compiled success: ' + compiled.success);
        if (compiled.ast) {
          results.push('Compiled AST type: ' + compiled.ast.type);
          results.push('Compiled AST name: ' + compiled.ast.name);
          results.push('Compiled AST args: ' + (compiled.ast.args ? compiled.ast.args.length : 0));
          if (compiled.ast.args && compiled.ast.args[0]) {
            results.push('First arg type: ' + compiled.ast.args[0].type);
            results.push('First arg name: ' + compiled.ast.args[0].name);
          }
        }
        if (compiled.errors && compiled.errors.length > 0) {
          results.push('Compiled errors: ' + JSON.stringify(compiled.errors));
        }

        // Try to execute
        const ctx = hyperfixi.createContext(draggableBox);
        results.push('Context created, me is: ' + (ctx.me === draggableBox));

        // Execute should install the behavior
        const execResult = await hyperfixi.execute(compiled.ast, ctx);
        results.push('Execute result: ' + JSON.stringify(execResult));
        results.push('After execute - Has __hyperscript: ' + !!(draggableBox as any).__hyperscript);
      } catch (e: any) {
        results.push('Manual compile/execute error: ' + e.message);
        results.push('Stack: ' + (e.stack || '').substring(0, 200));
      }
    }

    // Test Toggleable which is simpler
    const toggleItem = document.querySelector('.toggle-button') as HTMLElement;
    if (
      hyperfixi &&
      hyperfixi.compile &&
      hyperfixi.execute &&
      hyperfixi.createContext &&
      toggleItem
    ) {
      try {
        results.push('--- Testing Toggleable on toggle-button ---');
        const code = 'install Toggleable';
        const compiled = hyperfixi.compile(code);
        results.push('Toggle compiled success: ' + compiled.success);

        const ctx = hyperfixi.createContext(toggleItem);
        results.push('Context has _behaviors: ' + ctx.locals.has('_behaviors'));

        // Execute to install behavior
        await hyperfixi.execute(compiled.ast, ctx);
        results.push('Toggle install complete');

        // After execute, check _behaviors again
        results.push('After execute - Context has _behaviors: ' + ctx.locals.has('_behaviors'));

        // Check if element has click handler
        results.push(
          'Toggle has active class before click: ' + toggleItem.classList.contains('active')
        );

        // Count event listeners using getEventListeners if available (Chrome DevTools only)
        results.push('Toggle element tag: ' + toggleItem.tagName);
        results.push('Toggle element className: ' + toggleItem.className);

        // Trigger click
        toggleItem.click();

        // Small delay to let event handler run
        await new Promise(r => setTimeout(r, 100));

        results.push(
          'Toggle has active class after click: ' + toggleItem.classList.contains('active')
        );

        // Try direct install via behaviors API
        results.push('--- Trying direct behaviors.install ---');
        const behaviorAPI = hf.behaviors;

        // Enable debug
        const hfGlobal = (window as any).hyperfixi;
        if (hfGlobal && hfGlobal.debug) {
          hfGlobal.debug.runtime = true;
          results.push('Debug enabled');
        }

        // Create a fresh element to test on
        const testButton = document.createElement('button');
        testButton.className = 'test-toggle-btn';
        testButton.textContent = 'Test Toggle';
        document.body.appendChild(testButton);

        try {
          results.push('Calling behaviors.install on fresh button...');
          await behaviorAPI.install('Toggleable', testButton, {});
          results.push('Direct install on fresh button completed');

          results.push(
            'Fresh button has active before click: ' + testButton.classList.contains('active')
          );
          testButton.click();
          await new Promise(r => setTimeout(r, 100));
          results.push(
            'Fresh button has active after click: ' + testButton.classList.contains('active')
          );
        } catch (e: any) {
          results.push('Direct install error: ' + e.message);
          results.push('Direct install stack: ' + (e.stack || '').substring(0, 300));
        }
      } catch (e: any) {
        results.push('Toggle test error: ' + e.message);
      }
    }

    // Try _hyperscript.processElement
    if (hf.processElement && draggableBox) {
      try {
        results.push('Attempting hf.processElement...');
        hf.processElement(draggableBox);
        results.push(
          'After hf.processElement - Has __hyperscript: ' + !!(draggableBox as any).__hyperscript
        );
      } catch (e) {
        results.push('hf.processElement error: ' + e);
      }
    }

    // Try to execute install command directly
    if (hf.execute && hf.compile && hf.createContext) {
      try {
        results.push('Attempting manual execute...');
        const compiled = hf.compile('install Draggable');
        results.push('Manual compile success: ' + compiled.success);
        if (compiled.ast) {
          results.push('AST: ' + JSON.stringify(compiled.ast).substring(0, 300));
        }
        if (compiled.errors && compiled.errors.length > 0) {
          results.push('Manual compile errors: ' + JSON.stringify(compiled.errors));
        }
      } catch (e) {
        results.push('Manual execute error: ' + e);
      }
    }

    return results;
  });

  console.log('=== DIAGNOSTIC RESULTS ===');
  result.forEach((r: string) => console.log(r));
  console.log('=== CONSOLE LOGS ===');
  logs.forEach((l: string) => console.log(l));
});
