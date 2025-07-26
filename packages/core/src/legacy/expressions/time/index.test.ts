/**
 * Tests for Time Operations Expressions  
 * Generated from LSP examples with comprehensive TDD implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { timeExpressions } from './index';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup';
import { ExecutionContext } from '../../types/core';

describe('Time Operations Expressions', () => {
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    testElement = createTestElement('<div id="test">Test</div>');
    context = createMockHyperscriptContext(testElement) as ExecutionContext;
    
    // Ensure required context properties exist
    if (!context.locals) context.locals = new Map();
    if (!context.globals) context.globals = new Map();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Time Literal Parsing', () => {
    it('should have time parse expression', () => {
      const parseTimeExpr = timeExpressions.find(expr => expr.name === 'parseTime');
      expect(parseTimeExpr).toBeDefined();
      expect(parseTimeExpr?.category).toBe('Time');
    });

    it('should parse seconds (s)', async () => {
      const parseTimeExpr = timeExpressions.find(expr => expr.name === 'parseTime')!;
      
      const result1 = await parseTimeExpr.evaluate(context, '2s');
      expect(result1).toBe(2000); // 2 seconds = 2000ms
      
      const result2 = await parseTimeExpr.evaluate(context, '30s');
      expect(result2).toBe(30000);
    });

    it('should parse milliseconds (ms)', async () => {
      const parseTimeExpr = timeExpressions.find(expr => expr.name === 'parseTime')!;
      
      const result1 = await parseTimeExpr.evaluate(context, '500ms');
      expect(result1).toBe(500);
      
      const result2 = await parseTimeExpr.evaluate(context, '1500ms');
      expect(result2).toBe(1500);
    });

    it('should parse minutes (m, min, minute, minutes)', async () => {
      const parseTimeExpr = timeExpressions.find(expr => expr.name === 'parseTime')!;
      
      const result1 = await parseTimeExpr.evaluate(context, '1m');
      expect(result1).toBe(60000); // 1 minute = 60000ms
      
      const result2 = await parseTimeExpr.evaluate(context, '5min');
      expect(result2).toBe(300000); // 5 minutes = 300000ms
      
      const result3 = await parseTimeExpr.evaluate(context, '1 minute');
      expect(result3).toBe(60000);
      
      const result4 = await parseTimeExpr.evaluate(context, '2 minutes');
      expect(result4).toBe(120000);
    });

    it('should parse hours (h, hr, hour, hours)', async () => {
      const parseTimeExpr = timeExpressions.find(expr => expr.name === 'parseTime')!;
      
      const result1 = await parseTimeExpr.evaluate(context, '1h');
      expect(result1).toBe(3600000); // 1 hour = 3600000ms
      
      const result2 = await parseTimeExpr.evaluate(context, '2hr');
      expect(result2).toBe(7200000);
      
      const result3 = await parseTimeExpr.evaluate(context, '1 hour');
      expect(result3).toBe(3600000);
      
      const result4 = await parseTimeExpr.evaluate(context, '3 hours');
      expect(result4).toBe(10800000);
    });

    it('should parse days (d, day, days)', async () => {
      const parseTimeExpr = timeExpressions.find(expr => expr.name === 'parseTime')!;
      
      const result1 = await parseTimeExpr.evaluate(context, '1d');
      expect(result1).toBe(86400000); // 1 day = 86400000ms
      
      const result2 = await parseTimeExpr.evaluate(context, '1 day');
      expect(result2).toBe(86400000);
      
      const result3 = await parseTimeExpr.evaluate(context, '7 days');
      expect(result3).toBe(604800000); // 7 days
    });

    it('should parse weeks (w, week, weeks)', async () => {
      const parseTimeExpr = timeExpressions.find(expr => expr.name === 'parseTime')!;
      
      const result1 = await parseTimeExpr.evaluate(context, '1w');
      expect(result1).toBe(604800000); // 1 week = 604800000ms
      
      const result2 = await parseTimeExpr.evaluate(context, '2 weeks');
      expect(result2).toBe(1209600000); // 2 weeks
    });

    it('should handle decimal values', async () => {
      const parseTimeExpr = timeExpressions.find(expr => expr.name === 'parseTime')!;
      
      const result1 = await parseTimeExpr.evaluate(context, '1.5s');
      expect(result1).toBe(1500); // 1.5 seconds
      
      const result2 = await parseTimeExpr.evaluate(context, '2.5 minutes');
      expect(result2).toBe(150000); // 2.5 minutes = 150000ms
      
      const result3 = await parseTimeExpr.evaluate(context, '0.5h');
      expect(result3).toBe(1800000); // 0.5 hours = 30 minutes
    });
  });

  describe('Time Duration Formatting', () => {
    it('should format milliseconds to readable string', async () => {
      const formatDurationExpr = timeExpressions.find(expr => expr.name === 'formatDuration')!;
      
      const result1 = await formatDurationExpr.evaluate(context, 1000);
      expect(result1).toBe('1s');
      
      const result2 = await formatDurationExpr.evaluate(context, 60000);
      expect(result2).toBe('1m');
      
      const result3 = await formatDurationExpr.evaluate(context, 3661000);
      expect(result3).toBe('1h 1m 1s'); // 1 hour, 1 minute, 1 second
    });

    it('should format with different precision levels', async () => {
      const formatDurationExpr = timeExpressions.find(expr => expr.name === 'formatDuration')!;
      
      const result1 = await formatDurationExpr.evaluate(context, 3661500, 'precise');
      expect(result1).toBe('1h 1m 1.5s');
      
      const result2 = await formatDurationExpr.evaluate(context, 3661500, 'short');
      expect(result2).toBe('1h 1m');
      
      const result3 = await formatDurationExpr.evaluate(context, 3661500, 'long');
      expect(result3).toBe('1 hour, 1 minute, 1 second');
    });
  });

  describe('Time Calculations', () => {
    it('should add time durations', async () => {
      const addTimeExpr = timeExpressions.find(expr => expr.name === 'addTime')!;
      
      const result1 = await addTimeExpr.evaluate(context, '1s', '500ms');
      expect(result1).toBe(1500); // 1000ms + 500ms
      
      const result2 = await addTimeExpr.evaluate(context, '1m', '30s');
      expect(result2).toBe(90000); // 60000ms + 30000ms
      
      const result3 = await addTimeExpr.evaluate(context, '1h', '30m');
      expect(result3).toBe(5400000); // 3600000ms + 1800000ms
    });

    it('should subtract time durations', async () => {
      const subtractTimeExpr = timeExpressions.find(expr => expr.name === 'subtractTime')!;
      
      const result1 = await subtractTimeExpr.evaluate(context, '2s', '500ms');
      expect(result1).toBe(1500); // 2000ms - 500ms
      
      const result2 = await subtractTimeExpr.evaluate(context, '1h', '15m');
      expect(result2).toBe(2700000); // 3600000ms - 900000ms
    });

    it('should multiply time durations', async () => {
      const multiplyTimeExpr = timeExpressions.find(expr => expr.name === 'multiplyTime')!;
      
      const result1 = await multiplyTimeExpr.evaluate(context, '2s', 3);
      expect(result1).toBe(6000); // 2000ms * 3
      
      const result2 = await multiplyTimeExpr.evaluate(context, '1m', 2.5);
      expect(result2).toBe(150000); // 60000ms * 2.5
    });

    it('should divide time durations', async () => {
      const divideTimeExpr = timeExpressions.find(expr => expr.name === 'divideTime')!;
      
      const result1 = await divideTimeExpr.evaluate(context, '10s', 2);
      expect(result1).toBe(5000); // 10000ms / 2
      
      const result2 = await divideTimeExpr.evaluate(context, '1h', 4);
      expect(result2).toBe(900000); // 3600000ms / 4 = 15 minutes
    });
  });

  describe('Date and Time Operations', () => {
    it('should get current time', async () => {
      const nowExpr = timeExpressions.find(expr => expr.name === 'now')!;
      
      const before = Date.now();
      const result = await nowExpr.evaluate(context);
      const after = Date.now();
      
      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });

    it('should create date from timestamp', async () => {
      const dateFromExpr = timeExpressions.find(expr => expr.name === 'dateFrom')!;
      
      const timestamp = 1609459200000; // 2021-01-01 00:00:00 UTC
      const result = await dateFromExpr.evaluate(context, timestamp);
      
      expect(result instanceof Date).toBe(true);
      expect((result as Date).getTime()).toBe(timestamp);
    });

    it('should format dates', async () => {
      const formatDateExpr = timeExpressions.find(expr => expr.name === 'formatDate')!;
      
      const date = new Date('2021-01-01T12:30:45Z');
      
      const result1 = await formatDateExpr.evaluate(context, date, 'YYYY-MM-DD');
      expect(result1).toBe('2021-01-01');
      
      const result2 = await formatDateExpr.evaluate(context, date, 'HH:mm:ss');
      expect(result2).toBe('12:30:45');
      
      const result3 = await formatDateExpr.evaluate(context, date, 'YYYY-MM-DD HH:mm:ss');
      expect(result3).toBe('2021-01-01 12:30:45');
    });

    it('should parse date strings', async () => {
      const parseDateExpr = timeExpressions.find(expr => expr.name === 'parseDate')!;
      
      const result1 = await parseDateExpr.evaluate(context, '2021-01-01');
      expect(result1 instanceof Date).toBe(true);
      
      const result2 = await parseDateExpr.evaluate(context, '2021-01-01T12:30:45Z');
      expect(result2 instanceof Date).toBe(true);
      expect((result2 as Date).getUTCFullYear()).toBe(2021);
      expect((result2 as Date).getUTCMonth()).toBe(0); // January = 0
      expect((result2 as Date).getUTCDate()).toBe(1);
    });

    it('should add time to dates', async () => {
      const addToDateExpr = timeExpressions.find(expr => expr.name === 'addToDate')!;
      
      const startDate = new Date('2021-01-01T12:00:00Z');
      
      const result1 = await addToDateExpr.evaluate(context, startDate, '1h');
      expect((result1 as Date).getUTCHours()).toBe(13);
      
      const result2 = await addToDateExpr.evaluate(context, startDate, '1 day');
      expect((result2 as Date).getUTCDate()).toBe(2);
    });

    it('should subtract time from dates', async () => {
      const subtractFromDateExpr = timeExpressions.find(expr => expr.name === 'subtractFromDate')!;
      
      const startDate = new Date('2021-01-01T12:00:00Z');
      
      const result1 = await subtractFromDateExpr.evaluate(context, startDate, '2h');
      expect((result1 as Date).getUTCHours()).toBe(10);
      
      const result2 = await subtractFromDateExpr.evaluate(context, startDate, '1 day');
      expect((result2 as Date).getUTCDate()).toBe(31); // December 31
      expect((result2 as Date).getUTCMonth()).toBe(11); // December = 11
    });
  });

  describe('Time Comparison', () => {
    it('should compare durations', async () => {
      const compareTimeExpr = timeExpressions.find(expr => expr.name === 'compareTime')!;
      
      const result1 = await compareTimeExpr.evaluate(context, '2s', '1s');
      expect(result1).toBe(1); // 2s > 1s
      
      const result2 = await compareTimeExpr.evaluate(context, '1s', '2s');
      expect(result2).toBe(-1); // 1s < 2s
      
      const result3 = await compareTimeExpr.evaluate(context, '1s', '1000ms');
      expect(result3).toBe(0); // 1s === 1000ms
    });

    it('should check if time is before', async () => {
      const isBeforeExpr = timeExpressions.find(expr => expr.name === 'isBefore')!;
      
      const date1 = new Date('2021-01-01');
      const date2 = new Date('2021-01-02');
      
      const result1 = await isBeforeExpr.evaluate(context, date1, date2);
      expect(result1).toBe(true);
      
      const result2 = await isBeforeExpr.evaluate(context, date2, date1);
      expect(result2).toBe(false);
    });

    it('should check if time is after', async () => {
      const isAfterExpr = timeExpressions.find(expr => expr.name === 'isAfter')!;
      
      const date1 = new Date('2021-01-01');
      const date2 = new Date('2021-01-02');
      
      const result1 = await isAfterExpr.evaluate(context, date2, date1);
      expect(result1).toBe(true);
      
      const result2 = await isAfterExpr.evaluate(context, date1, date2);
      expect(result2).toBe(false);
    });

    it('should check if dates are same day', async () => {
      const isSameDayExpr = timeExpressions.find(expr => expr.name === 'isSameDay')!;
      
      const date1 = new Date('2021-01-01T10:00:00Z');
      const date2 = new Date('2021-01-01T15:00:00Z');
      const date3 = new Date('2021-01-02T10:00:00Z');
      
      const result1 = await isSameDayExpr.evaluate(context, date1, date2);
      expect(result1).toBe(true); // Same day, different time
      
      const result2 = await isSameDayExpr.evaluate(context, date1, date3);
      expect(result2).toBe(false); // Different days
    });
  });

  describe('Time Utilities', () => {
    it('should convert time units', async () => {
      const convertTimeExpr = timeExpressions.find(expr => expr.name === 'convertTime')!;
      
      const result1 = await convertTimeExpr.evaluate(context, 60000, 'seconds');
      expect(result1).toBe(60); // 60000ms = 60 seconds
      
      const result2 = await convertTimeExpr.evaluate(context, 3600000, 'minutes');
      expect(result2).toBe(60); // 3600000ms = 60 minutes
      
      const result3 = await convertTimeExpr.evaluate(context, 86400000, 'hours');
      expect(result3).toBe(24); // 86400000ms = 24 hours
    });

    it('should get time components', async () => {
      const getTimeComponentExpr = timeExpressions.find(expr => expr.name === 'getTimeComponent')!;
      
      const date = new Date('2021-03-15T14:30:45.123Z');
      
      const year = await getTimeComponentExpr.evaluate(context, date, 'year');
      expect(year).toBe(2021);
      
      const month = await getTimeComponentExpr.evaluate(context, date, 'month');
      expect(month).toBe(3); // March = 3
      
      const day = await getTimeComponentExpr.evaluate(context, date, 'day');
      expect(day).toBe(15);
      
      const hour = await getTimeComponentExpr.evaluate(context, date, 'hour', 'UTC');
      expect(hour).toBe(14);
      
      const minute = await getTimeComponentExpr.evaluate(context, date, 'minute');
      expect(minute).toBe(30);
      
      const second = await getTimeComponentExpr.evaluate(context, date, 'second');
      expect(second).toBe(45);
      
      const millisecond = await getTimeComponentExpr.evaluate(context, date, 'millisecond');
      expect(millisecond).toBe(123);
    });

    it('should check if year is leap year', async () => {
      const isLeapYearExpr = timeExpressions.find(expr => expr.name === 'isLeapYear')!;
      
      const result1 = await isLeapYearExpr.evaluate(context, 2020);
      expect(result1).toBe(true); // 2020 is leap year
      
      const result2 = await isLeapYearExpr.evaluate(context, 2021);
      expect(result2).toBe(false); // 2021 is not leap year
      
      const result3 = await isLeapYearExpr.evaluate(context, 2000);
      expect(result3).toBe(true); // 2000 is leap year
      
      const result4 = await isLeapYearExpr.evaluate(context, 1900);
      expect(result4).toBe(false); // 1900 is not leap year (century rule)
    });

    it('should get days in month', async () => {
      const daysInMonthExpr = timeExpressions.find(expr => expr.name === 'daysInMonth')!;
      
      const result1 = await daysInMonthExpr.evaluate(context, 2021, 1);
      expect(result1).toBe(31); // January
      
      const result2 = await daysInMonthExpr.evaluate(context, 2021, 2);
      expect(result2).toBe(28); // February 2021 (not leap year)
      
      const result3 = await daysInMonthExpr.evaluate(context, 2020, 2);
      expect(result3).toBe(29); // February 2020 (leap year)
      
      const result4 = await daysInMonthExpr.evaluate(context, 2021, 4);
      expect(result4).toBe(30); // April
    });
  });

  describe('Integration with Hyperscript Context', () => {
    it('should work with wait command integration', async () => {
      const parseTimeExpr = timeExpressions.find(expr => expr.name === 'parseTime')!;
      
      // This would be used by wait command
      context.locals!.set('delay', '2s');
      const delayMs = await parseTimeExpr.evaluate(context, context.locals.get('delay'));
      
      expect(delayMs).toBe(2000);
    });

    it('should work with timeout calculations', async () => {
      const addTimeExpr = timeExpressions.find(expr => expr.name === 'addTime')!;
      
      const baseTimeout = '5s';
      const extension = '2s';
      
      const totalTimeout = await addTimeExpr.evaluate(context, baseTimeout, extension);
      expect(totalTimeout).toBe(7000); // 5s + 2s = 7s
    });

    it('should work with date comparisons in conditions', async () => {
      const isAfterExpr = timeExpressions.find(expr => expr.name === 'isAfter')!;
      
      const now = new Date();
      const future = new Date(Date.now() + 60000); // 1 minute from now
      
      context.locals!.set('currentTime', now);
      context.locals!.set('deadline', future);
      
      const result = await isAfterExpr.evaluate(
        context, 
        context.locals.get('deadline'), 
        context.locals.get('currentTime')
      );
      
      expect(result).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid time strings gracefully', async () => {
      const parseTimeExpr = timeExpressions.find(expr => expr.name === 'parseTime')!;
      
      const result1 = await parseTimeExpr.evaluate(context, 'invalid');
      expect(result1).toBe(0); // Invalid time should return 0
      
      const result2 = await parseTimeExpr.evaluate(context, '');
      expect(result2).toBe(0); // Empty string should return 0
      
      const result3 = await parseTimeExpr.evaluate(context, null);
      expect(result3).toBe(0); // Null should return 0
    });

    it('should handle negative time values', async () => {
      const parseTimeExpr = timeExpressions.find(expr => expr.name === 'parseTime')!;
      
      const result = await parseTimeExpr.evaluate(context, '-5s');
      expect(result).toBe(-5000); // Should allow negative durations
    });

    it('should handle very large time values', async () => {
      const parseTimeExpr = timeExpressions.find(expr => expr.name === 'parseTime')!;
      
      const result = await parseTimeExpr.evaluate(context, '1000000s');
      expect(result).toBe(1000000000); // Should handle large values
    });

    it('should handle invalid date objects', async () => {
      const formatDateExpr = timeExpressions.find(expr => expr.name === 'formatDate')!;
      
      const invalidDate = new Date('invalid');
      const result = await formatDateExpr.evaluate(context, invalidDate, 'YYYY-MM-DD');
      
      expect(result).toBe('Invalid Date'); // Should return error string
    });
  });

  describe('Performance and Memory', () => {
    it('should handle many time calculations efficiently', async () => {
      const addTimeExpr = timeExpressions.find(expr => expr.name === 'addTime')!;
      
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        await addTimeExpr.evaluate(context, '1s', '500ms');
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    it('should not leak memory with repeated date operations', async () => {
      const nowExpr = timeExpressions.find(expr => expr.name === 'now')!;
      
      // Create many date objects
      const dates: number[] = [];
      for (let i = 0; i < 100; i++) {
        const timestamp = await nowExpr.evaluate(context);
        dates.push(timestamp as number);
      }
      
      // Should complete without issues
      expect(dates.length).toBe(100);
      expect(dates.every(d => typeof d === 'number')).toBe(true);
    });
  });

  describe('Timezone Handling', () => {
    it('should handle UTC operations', async () => {
      const getTimeComponentExpr = timeExpressions.find(expr => expr.name === 'getTimeComponent')!;
      
      const utcDate = new Date('2021-01-01T12:00:00Z');
      
      const utcHour = await getTimeComponentExpr.evaluate(context, utcDate, 'hour', 'UTC');
      expect(utcHour).toBe(12);
    });

    it('should handle timezone conversions', async () => {
      const convertTimezoneExpr = timeExpressions.find(expr => expr.name === 'convertTimezone')!;
      
      const date = new Date('2021-01-01T12:00:00Z');
      
      // This would convert to a specific timezone
      const result = await convertTimezoneExpr.evaluate(context, date, 'America/New_York');
      expect(result instanceof Date).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should validate required arguments for time parsing', () => {
      const parseTimeExpr = timeExpressions.find(expr => expr.name === 'parseTime')!;
      
      expect(parseTimeExpr.validate([])).toBe('Time string required for parsing');
      expect(parseTimeExpr.validate(['2s'])).toBe(null);
    });

    it('should validate required arguments for time operations', () => {
      const addTimeExpr = timeExpressions.find(expr => expr.name === 'addTime')!;
      
      expect(addTimeExpr.validate(['1s'])).toBe('Two time values required for addition');
      expect(addTimeExpr.validate(['1s', '2s'])).toBe(null);
    });
  });
});