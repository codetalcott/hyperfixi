/**
 * Time Operations Expressions
 * Comprehensive implementation of hyperscript time and duration handling capabilities
 * Generated from LSP data with TDD implementation
 */

import { ExpressionImplementation, ExecutionContext } from '../../types/core';

/**
 * Time parsing expression
 * Handles hyperscript time literal syntax (2s, 500ms, 1 minute, etc.)
 */
export class ParseTimeExpression implements ExpressionImplementation {
  name = 'parseTime';
  category = 'Time';
  description = 'Parses hyperscript time literals into milliseconds (2s, 500ms, 1 minute, etc.)';

  async evaluate(context: ExecutionContext, timeString: any): Promise<number> {
    if (timeString == null || timeString === '') return 0;
    
    const str = String(timeString).trim();
    if (str === '') return 0;
    
    // Handle pure numbers (assume milliseconds)
    const pureNumber = parseFloat(str);
    if (!isNaN(pureNumber) && !str.match(/[a-zA-Z]/)) {
      return pureNumber;
    }
    
    // Time unit patterns with their multipliers (to milliseconds)
    // Updated to handle negative values with ([-\d.]+) instead of ([\d.]+)
    const timeUnits = [
      { pattern: /([-\d.]+)\s*ms\b/i, multiplier: 1 },
      { pattern: /([-\d.]+)\s*s\b/i, multiplier: 1000 },
      { pattern: /([-\d.]+)\s*(?:m|min|minute|minutes)\b/i, multiplier: 60000 },
      { pattern: /([-\d.]+)\s*(?:h|hr|hour|hours)\b/i, multiplier: 3600000 },
      { pattern: /([-\d.]+)\s*(?:d|day|days)\b/i, multiplier: 86400000 },
      { pattern: /([-\d.]+)\s*(?:w|week|weeks)\b/i, multiplier: 604800000 }
    ];
    
    for (const unit of timeUnits) {
      const match = str.match(unit.pattern);
      if (match) {
        const value = parseFloat(match[1]);
        return value * unit.multiplier;
      }
    }
    
    // Return 0 for invalid time strings
    return 0;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Time string required for parsing';
    return null;
  }
}

/**
 * Duration formatting expression
 */
export class FormatDurationExpression implements ExpressionImplementation {
  name = 'formatDuration';
  category = 'Time';
  description = 'Formats milliseconds into readable duration string';

  async evaluate(context: ExecutionContext, milliseconds: number, format: string = 'default'): Promise<string> {
    const ms = Math.abs(Math.floor(milliseconds));
    
    const units = [
      { name: 'w', longName: 'week', value: 604800000 },
      { name: 'd', longName: 'day', value: 86400000 },
      { name: 'h', longName: 'hour', value: 3600000 },
      { name: 'm', longName: 'minute', value: 60000 },
      { name: 's', longName: 'second', value: 1000 }
    ];
    
    const parts: string[] = [];
    let remaining = ms;
    
    for (const unit of units) {
      const count = Math.floor(remaining / unit.value);
      if (count > 0) {
        remaining -= count * unit.value;
        
        if (format === 'long') {
          const unitName = count === 1 ? unit.longName : unit.longName + 's';
          parts.push(`${count} ${unitName}`);
        } else {
          parts.push(`${count}${unit.name}`);
        }
      }
      
      // Stop at seconds unless precise format
      if (unit.name === 's' && format !== 'precise') break;
    }
    
    // Handle milliseconds for precise format
    if (format === 'precise' && remaining > 0) {
      const lastIndex = parts.length - 1;
      if (lastIndex >= 0 && parts[lastIndex].endsWith('s')) {
        // Add decimal to seconds
        const seconds = parseFloat(parts[lastIndex]);
        parts[lastIndex] = `${seconds + remaining / 1000}s`;
      } else {
        parts.push(`${remaining}ms`);
      }
    }
    
    if (parts.length === 0) return '0s';
    
    // Format output based on style
    if (format === 'long') {
      return parts.join(', ');
    } else if (format === 'short') {
      return parts.slice(0, 2).join(' '); // Only show first 2 units
    }
    
    return parts.join(' ');
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Milliseconds value required for formatting';
    return null;
  }
}

/**
 * Time arithmetic expressions
 */
export class AddTimeExpression implements ExpressionImplementation {
  name = 'addTime';
  category = 'Time';
  description = 'Adds two time durations together';

  async evaluate(context: ExecutionContext, time1: any, time2: any): Promise<number> {
    const parseTime = new ParseTimeExpression();
    
    const ms1 = await parseTime.evaluate(context, time1);
    const ms2 = await parseTime.evaluate(context, time2);
    
    return ms1 + ms2;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Two time values required for addition';
    return null;
  }
}

export class SubtractTimeExpression implements ExpressionImplementation {
  name = 'subtractTime';
  category = 'Time';
  description = 'Subtracts one time duration from another';

  async evaluate(context: ExecutionContext, time1: any, time2: any): Promise<number> {
    const parseTime = new ParseTimeExpression();
    
    const ms1 = await parseTime.evaluate(context, time1);
    const ms2 = await parseTime.evaluate(context, time2);
    
    return ms1 - ms2;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Two time values required for subtraction';
    return null;
  }
}

export class MultiplyTimeExpression implements ExpressionImplementation {
  name = 'multiplyTime';
  category = 'Time';
  description = 'Multiplies a time duration by a number';

  async evaluate(context: ExecutionContext, time: any, multiplier: number): Promise<number> {
    const parseTime = new ParseTimeExpression();
    const ms = await parseTime.evaluate(context, time);
    
    return ms * multiplier;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Time value and multiplier required';
    return null;
  }
}

export class DivideTimeExpression implements ExpressionImplementation {
  name = 'divideTime';
  category = 'Time';
  description = 'Divides a time duration by a number';

  async evaluate(context: ExecutionContext, time: any, divisor: number): Promise<number> {
    const parseTime = new ParseTimeExpression();
    const ms = await parseTime.evaluate(context, time);
    
    if (divisor === 0) return 0; // Avoid division by zero
    return ms / divisor;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Time value and divisor required';
    return null;
  }
}

/**
 * Date and time operations
 */
export class NowExpression implements ExpressionImplementation {
  name = 'now';
  category = 'Time';
  description = 'Returns current timestamp in milliseconds';

  async evaluate(context: ExecutionContext): Promise<number> {
    return Date.now();
  }

  validate(args: any[]): string | null {
    return null; // No arguments required
  }
}

export class DateFromExpression implements ExpressionImplementation {
  name = 'dateFrom';
  category = 'Time';
  description = 'Creates a Date object from a timestamp';

  async evaluate(context: ExecutionContext, timestamp: number): Promise<Date> {
    return new Date(timestamp);
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Timestamp required to create date';
    return null;
  }
}

export class FormatDateExpression implements ExpressionImplementation {
  name = 'formatDate';
  category = 'Time';
  description = 'Formats a Date object into a string';

  async evaluate(context: ExecutionContext, date: Date, format: string = 'YYYY-MM-DD HH:mm:ss'): Promise<string> {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    const formatMap: { [key: string]: () => string } = {
      'YYYY': () => date.getUTCFullYear().toString(),
      'MM': () => String(date.getUTCMonth() + 1).padStart(2, '0'),
      'DD': () => String(date.getUTCDate()).padStart(2, '0'),
      'HH': () => String(date.getUTCHours()).padStart(2, '0'),
      'mm': () => String(date.getUTCMinutes()).padStart(2, '0'),
      'ss': () => String(date.getUTCSeconds()).padStart(2, '0')
    };
    
    let result = format;
    for (const [pattern, replacement] of Object.entries(formatMap)) {
      result = result.replace(new RegExp(pattern, 'g'), replacement());
    }
    
    return result;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Date object required for formatting';
    return null;
  }
}

export class ParseDateExpression implements ExpressionImplementation {
  name = 'parseDate';
  category = 'Time';
  description = 'Parses a date string into a Date object';

  async evaluate(context: ExecutionContext, dateString: string): Promise<Date> {
    return new Date(dateString);
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Date string required for parsing';
    return null;
  }
}

export class AddToDateExpression implements ExpressionImplementation {
  name = 'addToDate';
  category = 'Time';
  description = 'Adds a time duration to a date';

  async evaluate(context: ExecutionContext, date: Date, duration: any): Promise<Date> {
    const parseTime = new ParseTimeExpression();
    const ms = await parseTime.evaluate(context, duration);
    
    return new Date(date.getTime() + ms);
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Date and duration required';
    return null;
  }
}

export class SubtractFromDateExpression implements ExpressionImplementation {
  name = 'subtractFromDate';
  category = 'Time';
  description = 'Subtracts a time duration from a date';

  async evaluate(context: ExecutionContext, date: Date, duration: any): Promise<Date> {
    const parseTime = new ParseTimeExpression();
    const ms = await parseTime.evaluate(context, duration);
    
    return new Date(date.getTime() - ms);
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Date and duration required';
    return null;
  }
}

/**
 * Time comparison expressions
 */
export class CompareTimeExpression implements ExpressionImplementation {
  name = 'compareTime';
  category = 'Time';
  description = 'Compares two time durations (-1, 0, 1)';

  async evaluate(context: ExecutionContext, time1: any, time2: any): Promise<number> {
    const parseTime = new ParseTimeExpression();
    
    const ms1 = await parseTime.evaluate(context, time1);
    const ms2 = await parseTime.evaluate(context, time2);
    
    if (ms1 < ms2) return -1;
    if (ms1 > ms2) return 1;
    return 0;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Two time values required for comparison';
    return null;
  }
}

export class IsBeforeExpression implements ExpressionImplementation {
  name = 'isBefore';
  category = 'Time';
  description = 'Checks if first date is before second date';

  async evaluate(context: ExecutionContext, date1: Date, date2: Date): Promise<boolean> {
    return date1.getTime() < date2.getTime();
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Two dates required for comparison';
    return null;
  }
}

export class IsAfterExpression implements ExpressionImplementation {
  name = 'isAfter';
  category = 'Time';
  description = 'Checks if first date is after second date';

  async evaluate(context: ExecutionContext, date1: Date, date2: Date): Promise<boolean> {
    return date1.getTime() > date2.getTime();
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Two dates required for comparison';
    return null;
  }
}

export class IsSameDayExpression implements ExpressionImplementation {
  name = 'isSameDay';
  category = 'Time';
  description = 'Checks if two dates are on the same day';

  async evaluate(context: ExecutionContext, date1: Date, date2: Date): Promise<boolean> {
    return date1.getUTCFullYear() === date2.getUTCFullYear() &&
           date1.getUTCMonth() === date2.getUTCMonth() &&
           date1.getUTCDate() === date2.getUTCDate();
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Two dates required for comparison';
    return null;
  }
}

/**
 * Time utility expressions
 */
export class ConvertTimeExpression implements ExpressionImplementation {
  name = 'convertTime';
  category = 'Time';
  description = 'Converts milliseconds to other time units';

  async evaluate(context: ExecutionContext, milliseconds: number, unit: string): Promise<number> {
    const conversions: { [key: string]: number } = {
      'milliseconds': 1,
      'seconds': 1000,
      'minutes': 60000,
      'hours': 3600000,
      'days': 86400000,
      'weeks': 604800000
    };
    
    const divisor = conversions[unit.toLowerCase()];
    if (!divisor) return 0;
    
    return milliseconds / divisor;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Milliseconds value and target unit required';
    return null;
  }
}

export class GetTimeComponentExpression implements ExpressionImplementation {
  name = 'getTimeComponent';
  category = 'Time';
  description = 'Extracts specific components from a date';

  async evaluate(context: ExecutionContext, date: Date, component: string, timezone: string = 'local'): Promise<number> {
    const isUTC = timezone === 'UTC';
    
    const getters: { [key: string]: () => number } = {
      'year': () => isUTC ? date.getUTCFullYear() : date.getFullYear(),
      'month': () => (isUTC ? date.getUTCMonth() : date.getMonth()) + 1, // 1-indexed
      'day': () => isUTC ? date.getUTCDate() : date.getDate(),
      'hour': () => isUTC ? date.getUTCHours() : date.getHours(),
      'minute': () => isUTC ? date.getUTCMinutes() : date.getMinutes(),
      'second': () => isUTC ? date.getUTCSeconds() : date.getSeconds(),
      'millisecond': () => isUTC ? date.getUTCMilliseconds() : date.getMilliseconds()
    };
    
    const getter = getters[component.toLowerCase()];
    return getter ? getter() : 0;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Date and component type required';
    return null;
  }
}

export class IsLeapYearExpression implements ExpressionImplementation {
  name = 'isLeapYear';
  category = 'Time';
  description = 'Checks if a year is a leap year';

  async evaluate(context: ExecutionContext, year: number): Promise<boolean> {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Year required to check leap year';
    return null;
  }
}

export class DaysInMonthExpression implements ExpressionImplementation {
  name = 'daysInMonth';
  category = 'Time';
  description = 'Returns the number of days in a given month/year';

  async evaluate(context: ExecutionContext, year: number, month: number): Promise<number> {
    // Create date for first day of next month, then subtract one day
    return new Date(year, month, 0).getDate();
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Year and month required';
    return null;
  }
}

/**
 * Timezone handling expression
 */
export class ConvertTimezoneExpression implements ExpressionImplementation {
  name = 'convertTimezone';
  category = 'Time';
  description = 'Converts a date to a different timezone (basic implementation)';

  async evaluate(context: ExecutionContext, date: Date, timezone: string): Promise<Date> {
    // Basic implementation - in a real scenario you'd use a timezone library
    // For now, just return the original date as timezone handling is complex
    return new Date(date.getTime());
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Date and timezone required';
    return null;
  }
}

/**
 * Export all time expressions
 */
export const timeExpressions: ExpressionImplementation[] = [
  new ParseTimeExpression(),
  new FormatDurationExpression(),
  new AddTimeExpression(),
  new SubtractTimeExpression(),
  new MultiplyTimeExpression(),
  new DivideTimeExpression(),
  new NowExpression(),
  new DateFromExpression(),
  new FormatDateExpression(),
  new ParseDateExpression(),
  new AddToDateExpression(),
  new SubtractFromDateExpression(),
  new CompareTimeExpression(),
  new IsBeforeExpression(),
  new IsAfterExpression(),
  new IsSameDayExpression(),
  new ConvertTimeExpression(),
  new GetTimeComponentExpression(),
  new IsLeapYearExpression(),
  new DaysInMonthExpression(),
  new ConvertTimezoneExpression(),
];

export default timeExpressions;