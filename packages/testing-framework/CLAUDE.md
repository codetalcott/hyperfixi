# Testing Framework - CLAUDE.md

This package provides a comprehensive testing framework for HyperFixi applications with multi-environment support.

## Package Overview

- **Test Runner**: Core test execution with parallel support
- **Assertions**: Rich assertion library with DOM and HyperScript matchers
- **E2E Testing**: Playwright and Puppeteer integration
- **Visual Testing**: Visual regression testing
- **Performance Testing**: Performance metrics collection
- **Accessibility Testing**: A11y violation detection

## Key Commands

```bash
# Run tests
npm test --prefix packages/testing-framework

# Type check
npm run typecheck --prefix packages/testing-framework

# Build
npm run build --prefix packages/testing-framework
```

## Main Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Main exports, describe/it/test functions |
| `src/runner.ts` | Test runner implementation |
| `src/assertions.ts` | Assertion library |
| `src/types.ts` | Type definitions |

## Basic Usage

```typescript
import {
  describe,
  it,
  test,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  runTests,
} from '@hyperfixi/testing-framework';

describe('My Test Suite', () => {
  beforeEach(() => {
    // Setup before each test
  });

  it('should do something', async (ctx) => {
    // Test code
    expect(true).toBe(true);
  });

  test('another test', () => {
    // `test` is an alias for `it`
  });
});

// Run tests
const results = await runTests();
```

## Test Configuration

```typescript
const config: Partial<TestConfig> = {
  environment: 'jsdom',      // 'jsdom' | 'browser' | 'node'
  browser: 'chromium',       // 'chromium' | 'firefox' | 'webkit'
  timeout: 5000,             // Test timeout in ms
  retries: 0,                // Retry count for failed tests
  parallel: false,           // Run tests in parallel
  maxWorkers: 1,             // Max parallel workers
  headless: true,            // Run browser headlessly
  viewport: { width: 1280, height: 720 },
  coverage: {
    enabled: false,
    threshold: 80,
    include: ['src/**/*'],
    exclude: ['**/*.test.*'],
  },
};
```

## Mocking

```typescript
import { createMock, createSpy } from '@hyperfixi/testing-framework';

// Create a mock function
const mockFn = createMock();
mockFn.mockReturnValue(42);

// Create a spy
const spy = createSpy(myObject, 'methodName');
// ... call method
expect(spy.calls.length).toBe(1);
spy.mockRestore(); // Restore original
```

## Fixtures

```typescript
import { fixture } from '@hyperfixi/testing-framework';

const dbFixture = fixture(
  'database',
  async () => {
    return await createTestDatabase();
  },
  async (db) => {
    await db.close();
  }
);

// Use in tests
const db = await dbFixture.create();
// ... run tests
await dbFixture.destroy(db);
```

## HyperFixi Integration

```typescript
import { createHyperFixiTestContext } from '@hyperfixi/testing-framework';

const ctx = createHyperFixiTestContext(hyperfixi);

// Test compilation
const { success, result } = await ctx.testCompilation('on click toggle .active');

// Test execution
const { executed, compiled } = await ctx.testExecution(
  'on click toggle .active',
  buttonElement,
  'click'
);
```

## Quick Start

```typescript
import { quickStartTesting } from '@hyperfixi/testing-framework';

const { run, clear } = await quickStartTesting({
  environment: 'jsdom',
  browser: 'chromium',
  headless: true,
  testFiles: ['./tests/**/*.test.ts'],
});

const results = await run();
```

## Exports

### Functions
- `describe` / `describe_skip` / `describe_only` - Test suites
- `it` / `test` / `it_skip` / `it_only` - Test cases
- `beforeAll` / `afterAll` / `beforeEach` / `afterEach` - Hooks
- `runTests` / `clearTests` - Test execution
- `fixture` / `createMock` / `createSpy` - Utilities
- `waitFor` - Async waiting
- `createPageObject` - E2E page objects
- `createHyperFixiTestContext` - HyperFixi integration
- `quickStartTesting` - Quick setup

### Types
- `TestSuite`, `TestCase`, `TestContext`, `TestConfig`
- `TestResult`, `TestStatus`, `TestError`
- `ExpectAPI`, `AssertAPI`, `MockFunction`, `SpyFunction`

## Testing Notes

- Uses `vitest` for internal testing
- Tests in `src/index.test.ts` and `src/assertions.test.ts`
- `runner.ts` currently lacks dedicated tests
- Environment defaults to `jsdom`
