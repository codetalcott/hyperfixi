/**
 * Tests for Testing Framework Core Functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  describe as describeTest,
  it as itTest,
  test,
  describe_skip,
  it_skip,
  describe_only,
  it_only,
  beforeAll,
  afterAll,
  beforeEach as beforeEachTest,
  afterEach as afterEachTest,
  clearTests,
  runTests,
  fixture,
  createMock,
  createSpy,
  waitFor,
  createPageObject,
  createHyperFixiTestContext,
  quickStartTesting,
  VERSION,
  DEFAULT_CONFIG,
} from './index';

describe('Testing Framework Core', () => {
  beforeEach(() => {
    clearTests();
  });

  describe('describe function', () => {
    it('should register a test suite', async () => {
      describeTest('Test Suite', () => {
        itTest('test case', () => {});
      });

      const results = await runTests({ environment: 'node' });
      expect(results).toHaveLength(1);
      expect(results[0].suite).toBe('Test Suite');
    });

    it('should support nested suites', async () => {
      describeTest('Outer', () => {
        describeTest('Inner', () => {
          itTest('test', () => {});
        });
      });

      const results = await runTests({ environment: 'node' });
      expect(results).toHaveLength(1);
      expect(results[0].suite).toBe('Inner');
    });
  });

  describe('it function', () => {
    it('should throw when used outside describe', () => {
      expect(() => itTest('orphan test', () => {})).toThrow();
    });

    it('should register test with name', async () => {
      describeTest('Suite', () => {
        itTest('my test', () => {});
      });

      const results = await runTests({ environment: 'node' });
      expect(results[0].test).toBe('my test');
    });
  });

  describe('test function (alias for it)', () => {
    it('should be an alias for it', () => {
      expect(test).toBe(itTest);
    });
  });

  describe('describe_skip', () => {
    it('should skip all tests in suite', async () => {
      describe_skip('Skipped Suite', () => {
        itTest('test 1', () => {});
        itTest('test 2', () => {});
      });

      const results = await runTests({ environment: 'node' });
      expect(results.every(r => r.status === 'skipped')).toBe(true);
    });
  });

  describe('it_skip', () => {
    it('should skip individual test', async () => {
      describeTest('Suite', () => {
        it_skip('skipped test', () => {});
        itTest('normal test', () => {});
      });

      const results = await runTests({ environment: 'node' });
      expect(results[0].status).toBe('skipped');
      expect(results[1].status).toBe('passed');
    });
  });

  describe('lifecycle hooks', () => {
    it('should throw beforeAll outside describe', () => {
      expect(() => beforeAll(() => {})).toThrow();
    });

    it('should throw afterAll outside describe', () => {
      expect(() => afterAll(() => {})).toThrow();
    });

    it('should throw beforeEach outside describe', () => {
      expect(() => beforeEachTest(() => {})).toThrow();
    });

    it('should throw afterEach outside describe', () => {
      expect(() => afterEachTest(() => {})).toThrow();
    });
  });

  describe('clearTests', () => {
    it('should clear all registered tests', async () => {
      describeTest('Suite 1', () => {
        itTest('test', () => {});
      });

      clearTests();

      describeTest('Suite 2', () => {
        itTest('test', () => {});
      });

      const results = await runTests({ environment: 'node' });
      expect(results).toHaveLength(1);
      expect(results[0].suite).toBe('Suite 2');
    });
  });
});

describe('createMock', () => {
  it('should create a mock function', () => {
    const mock = createMock();
    expect(typeof mock).toBe('function');
  });

  it('should track calls', () => {
    const mock = createMock();
    mock(1, 2);
    mock('a', 'b');

    expect(mock.calls).toHaveLength(2);
    expect(mock.calls[0]).toEqual([1, 2]);
    expect(mock.calls[1]).toEqual(['a', 'b']);
  });

  it('should track results', () => {
    const mock = createMock(() => 42);
    const result = mock();

    expect(result).toBe(42);
    expect(mock.results).toHaveLength(1);
    expect(mock.results[0]).toEqual({ type: 'return', value: 42 });
  });

  it('should track thrown errors', () => {
    const error = new Error('test');
    const mock = createMock(() => {
      throw error;
    });

    expect(() => mock()).toThrow(error);
    expect(mock.results[0]).toEqual({ type: 'throw', value: error });
  });

  it('should support mockReturnValue', () => {
    const mock = createMock();
    mock.mockReturnValue(123);

    expect(mock()).toBe(123);
    expect(mock()).toBe(123);
  });

  it('should support mockReturnValueOnce', () => {
    const mock = createMock().mockReturnValue('default');
    mock.mockReturnValueOnce('once');

    expect(mock()).toBe('once');
    expect(mock()).toBe('default');
  });

  it('should support mockResolvedValue', async () => {
    const mock = createMock();
    mock.mockResolvedValue('resolved');

    await expect(mock()).resolves.toBe('resolved');
  });

  it('should support mockRejectedValue', async () => {
    const mock = createMock();
    const error = new Error('rejected');
    mock.mockRejectedValue(error);

    await expect(mock()).rejects.toThrow(error);
  });

  it('should support mockImplementation', () => {
    const mock = createMock();
    mock.mockImplementation((x: number) => x * 2);

    expect(mock(5)).toBe(10);
    expect(mock(3)).toBe(6);
  });

  it('should support mockClear', () => {
    const mock = createMock();
    mock(1);
    mock(2);

    mock.mockClear();

    expect(mock.calls).toHaveLength(0);
    expect(mock.results).toHaveLength(0);
  });

  it('should support mockReset', () => {
    const mock = createMock(() => 42);
    mock.mockReturnValue(100);
    mock();

    mock.mockReset();

    expect(mock.calls).toHaveLength(0);
    expect(mock()).toBeUndefined();
  });

  it('should support mockRestore', () => {
    const originalFn = (x: number) => x * 2;
    const mock = createMock(originalFn);
    mock.mockReturnValue(100);
    mock();

    mock.mockRestore();

    expect(mock.calls).toHaveLength(0);
    expect(mock(5)).toBe(10);
  });
});

describe('createSpy', () => {
  it('should spy on object methods', () => {
    const obj = {
      greet(name: string) {
        return `Hello, ${name}!`;
      },
    };

    const spy = createSpy(obj, 'greet');

    expect(obj.greet('World')).toBe('Hello, World!');
    expect(spy.calls).toHaveLength(1);
    expect(spy.calls[0]).toEqual(['World']);
  });

  it('should store original function', () => {
    const original = function greet() {
      return 'hello';
    };
    const obj = { greet: original };

    const spy = createSpy(obj, 'greet');
    expect(spy.original).toBe(original);
  });

  it('should restore original on mockRestore', () => {
    const original = function greet() {
      return 'hello';
    };
    const obj = { greet: original };

    const spy = createSpy(obj, 'greet');
    spy.mockReturnValue('mocked');

    expect(obj.greet()).toBe('mocked');

    spy.mockRestore();
    expect(obj.greet).toBe(original);
  });
});

describe('waitFor', () => {
  it('should resolve when condition is true', async () => {
    let counter = 0;
    const condition = () => {
      counter++;
      return counter >= 3;
    };

    await waitFor(condition, { interval: 10, timeout: 1000 });
    expect(counter).toBe(3);
  });

  it('should throw on timeout', async () => {
    const condition = () => false;

    await expect(waitFor(condition, { timeout: 50, interval: 10 })).rejects.toThrow(
      /not met within/
    );
  });

  it('should handle async conditions', async () => {
    let counter = 0;
    const condition = async () => {
      counter++;
      return counter >= 2;
    };

    await waitFor(condition, { interval: 10, timeout: 1000 });
    expect(counter).toBe(2);
  });

  it('should use default timeout and interval', async () => {
    let called = false;
    const condition = () => {
      called = true;
      return true;
    };

    await waitFor(condition);
    expect(called).toBe(true);
  });
});

describe('fixture', () => {
  it('should create fixture with setup', async () => {
    const myFixture = fixture('db', () => ({ connected: true }));

    expect(myFixture.name).toBe('db');
    const instance = await myFixture.create();
    expect(instance).toEqual({ connected: true });
  });

  it('should support async setup', async () => {
    const myFixture = fixture('async', async () => {
      await new Promise(r => setTimeout(r, 10));
      return { loaded: true };
    });

    const instance = await myFixture.create();
    expect(instance.loaded).toBe(true);
  });

  it('should call teardown on destroy', async () => {
    const teardownCalled = { value: false };
    const myFixture = fixture(
      'teardown-test',
      () => ({ id: 1 }),
      () => {
        teardownCalled.value = true;
      }
    );

    const instance = await myFixture.create();
    await myFixture.destroy(instance);

    expect(teardownCalled.value).toBe(true);
  });
});

describe('createPageObject', () => {
  it('should create page object with selectors', () => {
    const loginPage = createPageObject({
      name: 'LoginPage',
      url: '/login',
      selectors: {
        username: '#username',
        password: '#password',
        submitBtn: 'button[type="submit"]',
      },
      actions: {},
      assertions: {},
    });

    expect(loginPage.name).toBe('LoginPage');
    expect(loginPage.element('username')).toBe('#username');
    expect(loginPage.element('password')).toBe('#password');
  });

  it('should throw for unknown selector', () => {
    const page = createPageObject({
      name: 'Page',
      selectors: { known: '#known' },
      actions: {},
      assertions: {},
    });

    expect(() => page.element('unknown')).toThrow(/not found/);
  });
});

describe('createHyperFixiTestContext', () => {
  it('should create context with compile and test methods', () => {
    const mockHyperFixi = {
      compile: async (script: string) => `compiled: ${script}`,
    };

    const context = createHyperFixiTestContext(mockHyperFixi);

    expect(context.compileAndTest).toBeDefined();
    expect(context.testCompilation).toBeDefined();
    expect(context.testExecution).toBeDefined();
  });

  it('should test compilation', async () => {
    const mockHyperFixi = {
      compile: async (script: string) => `compiled: ${script}`,
    };

    const context = createHyperFixiTestContext(mockHyperFixi);
    const result = await context.testCompilation('on click log "hello"');

    expect(result.success).toBe(true);
    expect(result.result).toBe('compiled: on click log "hello"');
  });

  it('should handle compilation errors', async () => {
    const mockHyperFixi = {
      compile: async () => {
        throw new Error('Syntax error');
      },
    };

    const context = createHyperFixiTestContext(mockHyperFixi);
    const result = await context.testCompilation('invalid script');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('quickStartTesting', () => {
  afterEach(() => {
    clearTests();
  });

  it('should return testing utilities', async () => {
    const testing = await quickStartTesting();

    expect(testing.config).toBeDefined();
    expect(testing.run).toBeDefined();
    expect(testing.clear).toBeDefined();
  });

  it('should use provided environment', async () => {
    const testing = await quickStartTesting({ environment: 'node' });
    expect(testing.config.environment).toBe('node');
  });

  it('should use provided browser', async () => {
    const testing = await quickStartTesting({ browser: 'firefox' });
    expect(testing.config.browser).toBe('firefox');
  });

  it('should default to headless mode', async () => {
    const testing = await quickStartTesting();
    expect(testing.config.headless).toBe(true);
  });

  it('should allow disabling headless', async () => {
    const testing = await quickStartTesting({ headless: false });
    expect(testing.config.headless).toBe(false);
  });
});

describe('Constants', () => {
  it('should export VERSION', () => {
    expect(VERSION).toBe('0.1.0');
  });

  it('should export DEFAULT_CONFIG', () => {
    expect(DEFAULT_CONFIG).toBeDefined();
    expect(DEFAULT_CONFIG.environment).toBe('jsdom');
    expect(DEFAULT_CONFIG.timeout).toBe(5000);
    expect(DEFAULT_CONFIG.retries).toBe(0);
    expect(DEFAULT_CONFIG.parallel).toBe(false);
    expect(DEFAULT_CONFIG.headless).toBe(true);
  });
});
