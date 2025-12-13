/**
 * Enhanced Time Expression Tests
 * Comprehensive testing of time operations with TypeScript integration
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  TimeParsingExpression,
  DurationFormattingExpression,
  TimeArithmeticExpression,
  enhancedTimeExpressions,
  parseTime,
  formatDuration,
  performTimeArithmetic,
} from './index';
import type { TypedExecutionContext } from '../../types/command-types';

// Mock context for testing
function createMockContext(): TypedExecutionContext {
  return {
    me: document.createElement('div'),
    you: document.createElement('button'),
    it: null,
    locals: new Map(),
    globals: new Map(),
    result: null,
    meta: {
      startTime: Date.now(),
      commandStack: [],
      debugMode: false,
    },
  };
}

describe('Enhanced Time Parsing Expression', () => {
  let expression: TimeParsingExpression;
  let context: TypedExecutionContext;

  beforeEach(() => {
    expression = new TimeParsingExpression();
    context = createMockContext();
  });

  describe('Basic Time Parsing', () => {
    test('parses seconds correctly', async () => {
      const result = await expression.evaluate(context, '2s');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(2000);
        expect(result.type).toBe('number');
      }
    });

    test('parses milliseconds correctly', async () => {
      const result = await expression.evaluate(context, '500ms');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(500);
      }
    });

    test('parses minutes correctly', async () => {
      const result = await expression.evaluate(context, '1 minute');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(60000);
      }
    });

    test('parses hours correctly', async () => {
      const result = await expression.evaluate(context, '2h');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(7200000);
      }
    });

    test('parses days correctly', async () => {
      const result = await expression.evaluate(context, '1 day');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(86400000);
      }
    });

    test('parses weeks correctly', async () => {
      const result = await expression.evaluate(context, '1w');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(604800000);
      }
    });
  });

  describe('Decimal and Negative Values', () => {
    test('handles decimal values', async () => {
      const result = await expression.evaluate(context, '2.5s');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(2500);
      }
    });

    test('handles negative values', async () => {
      const result = await expression.evaluate(context, '-1s');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(-1000);
      }
    });
  });

  describe('Pure Numbers', () => {
    test('handles pure numbers with default unit (ms)', async () => {
      const result = await expression.evaluate(context, '1000');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(1000);
      }
    });

    test('handles pure numbers with custom default unit', async () => {
      const result = await expression.evaluate(context, '5', 's');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(5000);
      }
    });
  });

  describe('Error Handling', () => {
    test('handles empty string', async () => {
      const result = await expression.evaluate(context, '');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error!.code).toBe('EMPTY_TIME_STRING');
      }
    });

    test('handles invalid format', async () => {
      const result = await expression.evaluate(context, 'invalid time');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error!.code).toBe('INVALID_TIME_FORMAT');
      }
    });

    test('handles invalid numeric value', async () => {
      const result = await expression.evaluate(context, 'abc s');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error!.code).toBe('INVALID_TIME_FORMAT');
      }
    });
  });

  describe('Various Time Formats', () => {
    test('handles plural units', async () => {
      const results = await Promise.all([
        expression.evaluate(context, '2 minutes'),
        expression.evaluate(context, '3 hours'),
        expression.evaluate(context, '4 days'),
        expression.evaluate(context, '2 weeks'),
      ]);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      if (results.every(r => r.success)) {
        expect((results[0] as any).value).toBe(120000); // 2 minutes
        expect((results[1] as any).value).toBe(10800000); // 3 hours
        expect((results[2] as any).value).toBe(345600000); // 4 days
        expect((results[3] as any).value).toBe(1209600000); // 2 weeks
      }
    });

    test('handles abbreviated units', async () => {
      const results = await Promise.all([
        expression.evaluate(context, '1m'),
        expression.evaluate(context, '1h'),
        expression.evaluate(context, '1d'),
      ]);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});

describe('Enhanced Duration Formatting Expression', () => {
  let expression: DurationFormattingExpression;
  let context: TypedExecutionContext;

  beforeEach(() => {
    expression = new DurationFormattingExpression();
    context = createMockContext();
  });

  describe('Default Format', () => {
    test('formats seconds', async () => {
      const result = await expression.evaluate(context, 2000);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('2s');
        expect(result.type).toBe('string');
      }
    });

    test('formats minutes and seconds', async () => {
      const result = await expression.evaluate(context, 90000); // 1m 30s

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('1m 30s');
      }
    });

    test('formats complex duration', async () => {
      const result = await expression.evaluate(context, 3661000); // 1h 1m 1s

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('1h 1m 1s');
      }
    });

    test('formats zero duration', async () => {
      const result = await expression.evaluate(context, 0);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('0s');
      }
    });
  });

  describe('Long Format', () => {
    test('formats with long unit names', async () => {
      const result = await expression.evaluate(context, 90000, 'long'); // 1 minute 30 seconds

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('1 minute, 30 seconds');
      }
    });

    test('handles singular units', async () => {
      const result = await expression.evaluate(context, 61000, 'long'); // 1 minute 1 second

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('1 minute, 1 second');
      }
    });

    test('formats zero in long format', async () => {
      const result = await expression.evaluate(context, 0, 'long');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('0 seconds');
      }
    });
  });

  describe('Short Format', () => {
    test('limits to first 2 units', async () => {
      const result = await expression.evaluate(context, 3661000, 'short'); // Should show 1h 1m only

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('1h 1m');
      }
    });
  });

  describe('Precise Format', () => {
    test('includes milliseconds', async () => {
      const result = await expression.evaluate(context, 2500, 'precise'); // 2.5s

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('2.5s');
      }
    });

    test('handles standalone milliseconds', async () => {
      const result = await expression.evaluate(context, 500, 'precise');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe('500ms');
      }
    });
  });

  describe('Max Units Limitation', () => {
    test('respects maxUnits parameter', async () => {
      const result = await expression.evaluate(context, 90061000, 'default', 2); // 1d 1h 1m 1s -> 1d 1h

      expect(result.success).toBe(true);
      if (result.success) {
        // Should only show first 2 units
        expect(result.value!).toBe('1d 1h');
      }
    });
  });

  describe('Error Handling', () => {
    test('handles negative durations', async () => {
      const result = await expression.evaluate(context, -1000);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error!.code).toBe('NEGATIVE_DURATION');
      }
    });
  });
});

describe('Enhanced Time Arithmetic Expression', () => {
  let expression: TimeArithmeticExpression;
  let context: TypedExecutionContext;

  beforeEach(() => {
    expression = new TimeArithmeticExpression();
    context = createMockContext();
  });

  describe('Addition', () => {
    test('adds two time strings', async () => {
      const result = await expression.evaluate(context, 'add', '2s', '500ms');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(2500);
        expect(result.type).toBe('number');
      }
    });

    test('adds time string and number', async () => {
      const result = await expression.evaluate(context, 'add', '1s', 500);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(1500);
      }
    });

    test('adds two numbers', async () => {
      const result = await expression.evaluate(context, 'add', 1000, 500);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(1500);
      }
    });
  });

  describe('Subtraction', () => {
    test('subtracts two time strings', async () => {
      const result = await expression.evaluate(context, 'subtract', '2s', '500ms');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(1500);
      }
    });

    test('handles negative results', async () => {
      const result = await expression.evaluate(context, 'subtract', '500ms', '2s');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(-1500);
      }
    });
  });

  describe('Multiplication', () => {
    test('multiplies time by number', async () => {
      const result = await expression.evaluate(context, 'multiply', '1s', 2);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(2000);
      }
    });

    test('multiplies with decimals', async () => {
      const result = await expression.evaluate(context, 'multiply', '2s', 1.5);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(3000);
      }
    });
  });

  describe('Division', () => {
    test('divides time by number', async () => {
      const result = await expression.evaluate(context, 'divide', '2s', 2);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(1000);
      }
    });

    test('handles division by zero', async () => {
      const result = await expression.evaluate(context, 'divide', '2s', 0);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error!.code).toBe('DIVISION_BY_ZERO');
      }
    });

    test('rounds floating point results', async () => {
      const result = await expression.evaluate(context, 'divide', '1s', 3);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(333); // Rounded from 333.333...
      }
    });
  });

  describe('Operation Aliases', () => {
    test('handles + symbol', async () => {
      const result = await expression.evaluate(context, '+', '1s', '500ms');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(1500);
      }
    });

    test('handles - symbol', async () => {
      const result = await expression.evaluate(context, '-', '2s', '500ms');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(1500);
      }
    });

    test('handles * symbol', async () => {
      const result = await expression.evaluate(context, '*', '1s', 2);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(2000);
      }
    });

    test('handles / symbol', async () => {
      const result = await expression.evaluate(context, '/', '2s', 2);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value!).toBe(1000);
      }
    });
  });

  describe('Error Handling', () => {
    test('handles unsupported operation', async () => {
      const result = await expression.evaluate(context, 'invalid', '1s', '500ms');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error!.code).toBe('UNSUPPORTED_OPERATION');
      }
    });

    test('propagates time parsing errors', async () => {
      const result = await expression.evaluate(context, 'add', 'invalid time', '500ms');

      expect(result.success).toBe(false);
      // Should get the parsing error from the time parsing expression
    });
  });
});

describe('Expression Registry', () => {
  test('exports all enhanced time expressions', () => {
    expect(enhancedTimeExpressions['time-parse']).toBeInstanceOf(TimeParsingExpression);
    expect(enhancedTimeExpressions['duration-format']).toBeInstanceOf(
      DurationFormattingExpression
    );
    expect(enhancedTimeExpressions['time-arithmetic']).toBeInstanceOf(
      TimeArithmeticExpression
    );
  });
});

describe('Utility Functions', () => {
  let context: TypedExecutionContext;

  beforeEach(() => {
    context = createMockContext();
  });

  test('parseTime utility works', async () => {
    const result = await parseTime('2s', context);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value!).toBe(2000);
    }
  });

  test('formatDuration utility works', async () => {
    const result = await formatDuration(2000, context);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value!).toBe('2s');
    }
  });

  test('performTimeArithmetic utility works', async () => {
    const result = await performTimeArithmetic('add', '2s', '500ms', context);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value!).toBe(2500);
    }
  });
});

describe('Performance Characteristics', () => {
  let context: TypedExecutionContext;

  beforeEach(() => {
    context = createMockContext();
  });

  test('handles many time parsing operations efficiently', async () => {
    const parseExpr = new TimeParsingExpression();
    const timeStrings = Array(1000)
      .fill(0)
      .map((_, i) => `${i}s`);

    const startTime = performance.now();
    const promises = timeStrings.map(timeStr => parseExpr.evaluate(context, timeStr));
    const results = await Promise.all(promises);
    const endTime = performance.now();

    // All should succeed
    results.forEach(result => {
      expect(result.success).toBe(true);
    });

    // Should be very fast
    expect(endTime - startTime).toBeLessThan(100); // Less than 100ms for 1000 operations
  });

  test('handles many formatting operations efficiently', async () => {
    const formatExpr = new DurationFormattingExpression();
    const durations = Array(1000)
      .fill(0)
      .map((_, i) => i * 1000);

    const startTime = performance.now();
    const promises = durations.map(duration => formatExpr.evaluate(context, duration));
    const results = await Promise.all(promises);
    const endTime = performance.now();

    // All should succeed
    results.forEach(result => {
      expect(result.success).toBe(true);
    });

    // Should be very fast
    expect(endTime - startTime).toBeLessThan(100); // Less than 100ms for 1000 operations
  });

  test('handles complex arithmetic operations efficiently', async () => {
    const arithmeticExpr = new TimeArithmeticExpression();
    const operations = ['add', 'subtract', 'multiply', 'divide'];

    const startTime = performance.now();
    const promises = [];

    for (let i = 0; i < 250; i++) {
      const operation = operations[i % operations.length];
      const divisor = operation === 'divide' ? Math.max(1, i) : i; // Avoid division by zero
      promises.push(arithmeticExpr.evaluate(context, operation, `${i}s`, divisor));
    }

    const results = await Promise.all(promises);
    const endTime = performance.now();

    // All should succeed
    results.forEach(result => {
      expect(result.success).toBe(true);
    });

    // Should be very fast
    expect(endTime - startTime).toBeLessThan(200); // Less than 200ms for 1000 operations
  });
});
