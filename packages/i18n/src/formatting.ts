// packages/i18n/src/formatting.ts

/**
 * Locale-aware formatting utilities for i18n
 */

export interface NumberFormatOptions {
  style?: 'decimal' | 'currency' | 'percent';
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  useGrouping?: boolean;
}

export interface DateFormatOptions {
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
  year?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  day?: 'numeric' | '2-digit';
  hour?: 'numeric' | '2-digit';
  minute?: 'numeric' | '2-digit';
  second?: 'numeric' | '2-digit';
  timeZone?: string;
}

export interface RelativeTimeFormatOptions {
  style?: 'long' | 'short' | 'narrow';
  numeric?: 'always' | 'auto';
}

/**
 * Format numbers according to locale
 */
export class NumberFormatter {
  private locale: string;
  private defaultOptions: NumberFormatOptions;

  constructor(locale: string, defaultOptions: NumberFormatOptions = {}) {
    this.locale = locale;
    this.defaultOptions = defaultOptions;
  }

  format(value: number, options: NumberFormatOptions = {}): string {
    const mergedOptions = { ...this.defaultOptions, ...options };

    try {
      const result = new Intl.NumberFormat(this.locale, mergedOptions).format(value);
      // Validate result - if style is currency but no currency symbol, use fallback
      if (mergedOptions.style === 'currency' && !/[$€£¥₹₩₽฿₪₴₱₫₵₦]/.test(result)) {
        return this.fallbackFormat(value, mergedOptions);
      }
      // Validate result - if style is percent but no % symbol, use fallback
      if (mergedOptions.style === 'percent' && !result.includes('%')) {
        return this.fallbackFormat(value, mergedOptions);
      }
      // Validate result - if input has decimals but output lost them (broken Intl like jsdom)
      // Check by seeing if the result represents a rounded integer when it shouldn't
      const hasFractionalPart = value % 1 !== 0;
      if (hasFractionalPart && mergedOptions.style !== 'percent') {
        // Extract numeric value from result (remove thousand separators, keep decimal)
        // If the result only contains digits and thousand separators (no decimal), it's broken
        const digitsOnly = result.replace(/[^\d.-]/g, '');
        const parsedValue = parseFloat(digitsOnly);
        // If parsed value is an integer but input had decimals, Intl rounded incorrectly
        if (!isNaN(parsedValue) && parsedValue % 1 === 0) {
          return this.fallbackFormat(value, mergedOptions);
        }
      }
      return result;
    } catch (error) {
      // Fallback for unsupported locales
      return this.fallbackFormat(value, mergedOptions);
    }
  }

  formatCurrency(
    value: number,
    currency: string,
    options: Omit<NumberFormatOptions, 'style' | 'currency'> = {}
  ): string {
    return this.format(value, {
      ...options,
      style: 'currency',
      currency,
    });
  }

  formatPercent(value: number, options: Omit<NumberFormatOptions, 'style'> = {}): string {
    // Note: Intl.NumberFormat with style: 'percent' multiplies by 100
    // So 0.25 becomes "25%"
    return this.format(value, {
      ...options,
      style: 'percent',
    });
  }

  private fallbackFormat(value: number, options: NumberFormatOptions): string {
    const { style, currency, useGrouping = true } = options;
    // Default fraction digits based on style
    const defaultMin = style === 'currency' ? 2 : 0;
    const defaultMax = style === 'currency' ? 2 : 3;
    const minimumFractionDigits = options.minimumFractionDigits ?? defaultMin;
    const maximumFractionDigits = options.maximumFractionDigits ?? defaultMax;

    let formatted = value.toFixed(
      Math.min(maximumFractionDigits, Math.max(minimumFractionDigits, 0))
    );

    // Remove trailing zeros after decimal point if not required
    if (minimumFractionDigits === 0 && formatted.includes('.')) {
      formatted = formatted.replace(/\.?0+$/, '');
    }

    // Add thousand separators if grouping is enabled
    if (useGrouping !== false) {
      const parts = formatted.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      formatted = parts.join('.');
    }

    if (style === 'currency' && currency) {
      // Map currency codes to symbols
      const currencySymbols: Record<string, string> = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        JPY: '¥',
        CNY: '¥',
        KRW: '₩',
        RUB: '₽',
        INR: '₹',
        THB: '฿',
        ILS: '₪',
        UAH: '₴',
        PHP: '₱',
        VND: '₫',
        GHS: '₵',
        NGN: '₦',
      };
      const symbol = currencySymbols[currency] || currency;
      return `${symbol}${formatted}`;
    }

    if (style === 'percent') {
      // Multiply by 100 for percent display (matching Intl behavior)
      const percentValue = (value * 100).toFixed(
        Math.min(maximumFractionDigits, Math.max(minimumFractionDigits, 0))
      );
      const cleanPercent =
        minimumFractionDigits === 0 && percentValue.includes('.')
          ? percentValue.replace(/\.?0+$/, '')
          : percentValue;
      return `${cleanPercent}%`;
    }

    return formatted;
  }
}

/**
 * Format dates according to locale
 */
export class DateFormatter {
  private locale: string;
  private defaultOptions: DateFormatOptions;

  constructor(locale: string, defaultOptions: DateFormatOptions = {}) {
    this.locale = locale;
    this.defaultOptions = defaultOptions;
  }

  format(date: Date | string | number, options: DateFormatOptions = {}): string {
    const dateObj = new Date(date);
    const mergedOptions = { ...this.defaultOptions, ...options };

    try {
      const result = new Intl.DateTimeFormat(this.locale, mergedOptions).format(dateObj);
      // Validate: if timeStyle was requested but no time in result, use fallback
      if (mergedOptions.timeStyle && !/\d{1,2}:\d{2}/.test(result)) {
        return this.fallbackFormat(dateObj, mergedOptions);
      }
      return result;
    } catch (error) {
      return this.fallbackFormat(dateObj, mergedOptions);
    }
  }

  formatRelative(date: Date | string | number, options: RelativeTimeFormatOptions = {}): string {
    const dateObj = new Date(date);
    const now = new Date();
    const diffMs = dateObj.getTime() - now.getTime();

    try {
      const rtf = new Intl.RelativeTimeFormat(this.locale, options);

      const diffSeconds = Math.round(diffMs / 1000);
      const diffMinutes = Math.round(diffMs / (1000 * 60));
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (Math.abs(diffSeconds) < 60) {
        return rtf.format(diffSeconds, 'second');
      } else if (Math.abs(diffMinutes) < 60) {
        return rtf.format(diffMinutes, 'minute');
      } else if (Math.abs(diffHours) < 24) {
        return rtf.format(diffHours, 'hour');
      } else if (Math.abs(diffDays) < 30) {
        return rtf.format(diffDays, 'day');
      } else {
        return this.format(dateObj);
      }
    } catch (error) {
      return this.fallbackRelativeFormat(dateObj, now);
    }
  }

  private fallbackFormat(date: Date, options: DateFormatOptions): string {
    // Basic fallback formatting
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    const dateStr = `${month}/${day}/${year}`;
    const timeStr = `${hour}:${minute}`;

    // Include time if timeStyle is set
    if (options.timeStyle) {
      return options.dateStyle ? `${dateStr} ${timeStr}` : timeStr;
    }

    if (options.dateStyle || (!options.dateStyle && !options.timeStyle)) {
      return dateStr;
    }

    return date.toString();
  }

  private fallbackRelativeFormat(date: Date, now: Date): string {
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'tomorrow';
    if (diffDays === -1) return 'yesterday';
    if (diffDays > 0) return `in ${diffDays} days`;
    return `${Math.abs(diffDays)} days ago`;
  }
}

/**
 * Locale-aware formatting manager
 */
export class LocaleFormatter {
  private locale: string;
  private numberFormatter: NumberFormatter;
  private dateFormatter: DateFormatter;

  constructor(locale: string) {
    this.locale = locale;
    this.numberFormatter = new NumberFormatter(locale);
    this.dateFormatter = new DateFormatter(locale);
  }

  // Number formatting
  formatNumber(value: number, options?: NumberFormatOptions): string {
    return this.numberFormatter.format(value, options);
  }

  formatCurrency(
    value: number,
    currency: string,
    options?: Omit<NumberFormatOptions, 'style' | 'currency'>
  ): string {
    return this.numberFormatter.formatCurrency(value, currency, options);
  }

  formatPercent(value: number, options?: Omit<NumberFormatOptions, 'style'>): string {
    return this.numberFormatter.formatPercent(value, options);
  }

  // Date formatting
  formatDate(date: Date | string | number, options?: DateFormatOptions): string {
    return this.dateFormatter.format(date, options);
  }

  formatRelativeTime(date: Date | string | number, options?: RelativeTimeFormatOptions): string {
    return this.dateFormatter.formatRelative(date, options);
  }

  // Specialized hyperscript formatting
  formatHyperscriptValue(value: any, type?: string): string {
    if (typeof value === 'number') {
      if (type === 'currency') {
        return this.formatCurrency(value, 'USD');
      }
      if (type === 'percent') {
        return this.formatPercent(value);
      }
      return this.formatNumber(value);
    }

    if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
      if (type === 'relative') {
        return this.formatRelativeTime(value);
      }
      return this.formatDate(value);
    }

    return String(value);
  }

  // List formatting
  formatList(
    items: string[],
    options: {
      style?: 'long' | 'short' | 'narrow';
      type?: 'conjunction' | 'disjunction' | 'unit';
    } = {}
  ): string {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];

    try {
      // ListFormat may not be available in all environments
      const ListFormatCtor = (Intl as any).ListFormat;
      if (ListFormatCtor) {
        const listFormat = new ListFormatCtor(this.locale, options);
        return listFormat.format(items);
      }
      throw new Error('ListFormat not available');
    } catch (_error) {
      // Fallback for unsupported locales
      const { type = 'conjunction' } = options;
      const connector = type === 'disjunction' ? 'or' : 'and';

      if (items.length === 2) {
        return `${items[0]} ${connector} ${items[1]}`;
      }

      return `${items.slice(0, -1).join(', ')}, ${connector} ${items[items.length - 1]}`;
    }
  }

  // Unit formatting
  formatUnit(
    value: number,
    unit: string,
    options: { style?: 'long' | 'short' | 'narrow' } = {}
  ): string {
    try {
      // Map common hyperscript units to Intl units
      const unitMap: Record<string, string> = {
        second: 'second',
        seconds: 'second',
        minute: 'minute',
        minutes: 'minute',
        hour: 'hour',
        hours: 'hour',
        day: 'day',
        days: 'day',
        pixel: 'pixel',
        pixels: 'pixel',
        px: 'pixel',
        percent: 'percent',
        '%': 'percent',
      };

      const intlUnit = unitMap[unit.toLowerCase()] || unit;

      if (Intl.NumberFormat.prototype.constructor.name === 'NumberFormat') {
        // Check if environment supports unit formatting
        const testFormatter = new Intl.NumberFormat(this.locale, {
          style: 'unit',
          unit: intlUnit,
          unitDisplay: options.style || 'long',
        } as any);

        return testFormatter.format(value);
      }
    } catch (error) {
      // Fallback formatting
    }

    return `${value} ${unit}`;
  }

  // Change locale
  setLocale(locale: string): void {
    this.locale = locale;
    this.numberFormatter = new NumberFormatter(locale);
    this.dateFormatter = new DateFormatter(locale);
  }

  getLocale(): string {
    return this.locale;
  }
}

/**
 * Global formatting utilities
 */
export const formatters = new Map<string, LocaleFormatter>();

export function getFormatter(locale: string): LocaleFormatter {
  if (!formatters.has(locale)) {
    formatters.set(locale, new LocaleFormatter(locale));
  }
  return formatters.get(locale)!;
}

export function formatForLocale(locale: string, value: any, type?: string): string {
  return getFormatter(locale).formatHyperscriptValue(value, type);
}
