# TODO: swap-executor.test.ts

## Status

Tests written but experiencing timeout issues during execution.

## Issue

Mock configuration for morph-adapter and view-transitions appears to be causing tests to hang. The tests don't fail - they just timeout after 30+ seconds.

## Work Done

- 72 tests written covering all swap strategies
- Tests for: innerHTML, outerHTML, morph, morphOuter, beforeBegin, afterBegin, beforeEnd, afterEnd, delete, none
- Strategy detection tests
- Content extraction tests
- View Transitions integration tests
- Edge cases

## Root Cause (suspected)

The vi.mock() setup for morph-adapter may be creating circular dependencies or the mock isn't properly intercepting calls, causing real morph logic to execute and hang.

## Next Steps

1. Try hoisting mocks to top of file
2. Use vi.doMock() instead of vi.mock()
3. Mock at module level rather than function level
4. Consider testing without mocks and using real morph-adapter (if it's lightweight enough)
5. Check if morph-adapter has its own dependencies causing the hang

## Expected Coverage Impact

Once working, these tests should add ~0.1-0.15% coverage for the swap-executor module (~330 lines).

## Test File Location

The partial test file was removed. See git history (this session) for the full test implementation.
