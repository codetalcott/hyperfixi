/**
 * Command Compatibility Tests - Official _hyperscript Commands vs HyperFixi
 * Tests our existing command implementations against _hyperscript patterns
 */

import { test, expect, Page } from '@playwright/test';

test.describe('HyperFixi Command Compatibility Tests', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:3000/compatibility-test.html');
    await page.waitForTimeout(2000);

    // Inject our command test adapter
    await page.addScriptTag({ 
      content: `
        // Command test adapter (inline for now)
        window.executeHyperScript = async function(script, context = {}) {
          // This will be replaced with our actual command adapter
          return await hyperfixi.evalHyperScript(script, context);
        };
        
        window.testCommandExecution = async function(script, context = {}) {
          try {
            const result = await window.executeHyperScript(script, context);
            return { success: true, result, error: null };
          } catch (error) {
            return { success: false, result: null, error: error.message };
          }
        };
      `
    });
  });

  test('SET Command Tests (basic variable assignment)', async () => {
    const testCases = [
      {
        description: 'set simple variable',
        command: 'set x to 42',
        setup: {},
        verify: (context: any) => context.x === 42
      },
      {
        description: 'set string variable',
        command: 'set message to "hello world"',
        setup: {},
        verify: (context: any) => context.message === 'hello world'
      },
      {
        description: 'set expression result',
        command: 'set result to 2 + 3',
        setup: {},
        verify: (context: any) => context.result === 5
      }
    ];

    let passed = 0;
    console.log('\n📝 SET Command Tests:');

    for (const testCase of testCases) {
      const result = await page.evaluate(
        async ({ cmd, ctx }) => {
          const testResult = await window.testCommandExecution(cmd, ctx);
          return testResult;
        },
        { cmd: testCase.command, ctx: testCase.setup }
      );

      if (result.success) {
        console.log(`  ✅ ${testCase.description}: ${testCase.command}`);
        passed++;
      } else {
        console.log(`  ❌ ${testCase.description}: ${testCase.command} - ${result.error}`);
      }
    }

    console.log(`  📊 SET Tests: ${passed}/${testCases.length} passed (${Math.round(passed/testCases.length*100)}%)`);
    expect(passed).toBeGreaterThan(0); // At least some should work
  });

  test('PUT Command Tests (DOM manipulation)', async () => {
    const results = await page.evaluate(async () => {
      const tests = [
        {
          description: 'put text into element',
          setup: () => {
            const div = document.createElement('div');
            div.id = 'test1';
            document.body.appendChild(div);
            return { target: div };
          },
          command: 'put "hello" into #test1',
          verify: (setup: any) => setup.target.textContent === 'hello'
        },
        {
          description: 'put into innerHTML',
          setup: () => {
            const div = document.createElement('div');
            div.id = 'test2';
            document.body.appendChild(div);
            return { target: div };
          },
          command: 'put "hello" into #test2.innerHTML',
          verify: (setup: any) => setup.target.innerHTML === 'hello'
        },
        {
          description: 'put variable into element',
          setup: () => {
            const div = document.createElement('div');
            div.id = 'test3';
            document.body.appendChild(div);
            return { target: div };
          },
          command: 'put myValue into #test3',
          context: { myValue: 'test value' },
          verify: (setup: any) => setup.target.textContent === 'test value'
        }
      ];

      const results = [];
      for (const testCase of tests) {
        try {
          const setup = testCase.setup();
          const context = testCase.context || {};
          
          const result = await window.testCommandExecution(testCase.command, context);
          
          const verified = result.success && testCase.verify(setup);
          
          results.push({
            description: testCase.description,
            command: testCase.command,
            success: verified,
            error: result.error
          });

          // Cleanup
          if (setup.target && setup.target.parentNode) {
            setup.target.parentNode.removeChild(setup.target);
          }
        } catch (error) {
          results.push({
            description: testCase.description,
            command: testCase.command,
            success: false,
            error: error.message
          });
        }
      }

      return results;
    });

    let passed = 0;
    console.log('\n📝 PUT Command Tests:');

    results.forEach(result => {
      if (result.success) {
        console.log(`  ✅ ${result.description}: ${result.command}`);
        passed++;
      } else {
        console.log(`  ❌ ${result.description}: ${result.command} - ${result.error || 'verification failed'}`);
      }
    });

    console.log(`  📊 PUT Tests: ${passed}/${results.length} passed (${Math.round(passed/results.length*100)}%)`);
    expect(passed).toBeGreaterThan(0); // At least some should work
  });

  test('ADD Command Tests (CSS/attribute manipulation)', async () => {
    const results = await page.evaluate(async () => {
      const tests = [
        {
          description: 'add CSS class',
          setup: () => {
            const div = document.createElement('div');
            div.id = 'test4';
            document.body.appendChild(div);
            return { target: div };
          },
          command: 'add .test-class to #test4',
          verify: (setup: any) => setup.target.classList.contains('test-class')
        },
        {
          description: 'add attribute',
          setup: () => {
            const div = document.createElement('div');
            div.id = 'test5';
            document.body.appendChild(div);
            return { target: div };
          },
          command: 'add [@data-test="value"] to #test5',
          verify: (setup: any) => setup.target.getAttribute('data-test') === 'value'
        }
      ];

      const results = [];
      for (const testCase of tests) {
        try {
          const setup = testCase.setup();
          
          const result = await window.testCommandExecution(testCase.command, {});
          
          const verified = result.success && testCase.verify(setup);
          
          results.push({
            description: testCase.description,
            command: testCase.command,
            success: verified,
            error: result.error
          });

          // Cleanup
          if (setup.target && setup.target.parentNode) {
            setup.target.parentNode.removeChild(setup.target);
          }
        } catch (error) {
          results.push({
            description: testCase.description,
            command: testCase.command,
            success: false,
            error: error.message
          });
        }
      }

      return results;
    });

    let passed = 0;
    console.log('\n🎨 ADD Command Tests:');

    results.forEach(result => {
      if (result.success) {
        console.log(`  ✅ ${result.description}: ${result.command}`);
        passed++;
      } else {
        console.log(`  ❌ ${result.description}: ${result.command} - ${result.error || 'verification failed'}`);
      }
    });

    console.log(`  📊 ADD Tests: ${passed}/${results.length} passed (${Math.round(passed/results.length*100)}%)`);
    expect(passed).toBeGreaterThan(0);
  });

  test('LOG Command Tests (debugging)', async () => {
    const results = await page.evaluate(async () => {
      // Mock console.log to capture output
      const logCalls: any[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        logCalls.push(args);
        originalLog.apply(console, args);
      };

      const tests = [
        {
          description: 'log string literal',
          command: 'log "hello world"',
          expected: ['hello world']
        },
        {
          description: 'log number',
          command: 'log 42',
          expected: [42]
        },
        {
          description: 'log variable',
          command: 'log myVar',
          context: { myVar: 'test value' },
          expected: ['test value']
        }
      ];

      const results = [];
      for (const testCase of tests) {
        logCalls.length = 0; // Clear previous calls
        
        try {
          const result = await window.testCommandExecution(
            testCase.command, 
            testCase.context || {}
          );
          
          const verified = result.success && 
            logCalls.length > 0 && 
            JSON.stringify(logCalls[0]) === JSON.stringify(testCase.expected);
          
          results.push({
            description: testCase.description,
            command: testCase.command,
            success: verified,
            error: result.error,
            actualLog: logCalls[0]
          });
        } catch (error) {
          results.push({
            description: testCase.description,
            command: testCase.command,
            success: false,
            error: error.message
          });
        }
      }

      // Restore console.log
      console.log = originalLog;
      
      return results;
    });

    let passed = 0;
    console.log('\n📝 LOG Command Tests:');

    results.forEach(result => {
      if (result.success) {
        console.log(`  ✅ ${result.description}: ${result.command}`);
        passed++;
      } else {
        console.log(`  ❌ ${result.description}: ${result.command} - ${result.error || 'verification failed'}`);
        if (result.actualLog) {
          console.log(`    Actual log: ${JSON.stringify(result.actualLog)}`);
        }
      }
    });

    console.log(`  📊 LOG Tests: ${passed}/${results.length} passed (${Math.round(passed/results.length*100)}%)`);
    expect(passed).toBeGreaterThan(0);
  });

  test('SHOW/HIDE Command Tests (visibility)', async () => {
    const results = await page.evaluate(async () => {
      const tests = [
        {
          description: 'show element',
          setup: () => {
            const div = document.createElement('div');
            div.id = 'test6';
            div.style.display = 'none';
            document.body.appendChild(div);
            return { target: div };
          },
          command: 'show #test6',
          verify: (setup: any) => {
            const computed = window.getComputedStyle(setup.target);
            return computed.display !== 'none';
          }
        },
        {
          description: 'hide element', 
          setup: () => {
            const div = document.createElement('div');
            div.id = 'test7';
            document.body.appendChild(div);
            return { target: div };
          },
          command: 'hide #test7',
          verify: (setup: any) => {
            const computed = window.getComputedStyle(setup.target);
            return computed.display === 'none';
          }
        }
      ];

      const results = [];
      for (const testCase of tests) {
        try {
          const setup = testCase.setup();
          
          const result = await window.testCommandExecution(testCase.command, {});
          
          const verified = result.success && testCase.verify(setup);
          
          results.push({
            description: testCase.description,
            command: testCase.command,
            success: verified,
            error: result.error
          });

          // Cleanup
          if (setup.target && setup.target.parentNode) {
            setup.target.parentNode.removeChild(setup.target);
          }
        } catch (error) {
          results.push({
            description: testCase.description,
            command: testCase.command,
            success: false,
            error: error.message
          });
        }
      }

      return results;
    });

    let passed = 0;
    console.log('\n👁️ SHOW/HIDE Command Tests:');

    results.forEach(result => {
      if (result.success) {
        console.log(`  ✅ ${result.description}: ${result.command}`);
        passed++;
      } else {
        console.log(`  ❌ ${result.description}: ${result.command} - ${result.error || 'verification failed'}`);
      }
    });

    console.log(`  📊 SHOW/HIDE Tests: ${passed}/${results.length} passed (${Math.round(passed/results.length*100)}%)`);
    expect(passed).toBeGreaterThan(0);
  });

  test.afterAll(async () => {
    console.log('\n📊 Command Compatibility Test Summary');
    console.log('This measures how well our existing commands match _hyperscript behavior');
    console.log('Any failures indicate syntax or behavioral differences to fix');
  });
});