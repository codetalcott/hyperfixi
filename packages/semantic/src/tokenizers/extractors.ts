/**
 * Extraction Utilities
 *
 * Pure functions for extracting CSS selectors, string literals, URLs, and numbers
 * from input strings. These are language-independent and used by all tokenizers.
 */

import {
  isSelectorStart,
  isWhitespace,
  isAsciiIdentifierChar,
  isAsciiLetter,
  isQuote,
  isDigit,
} from './token-utils';

// =============================================================================
// CSS Selector Tokenization
// =============================================================================

/**
 * Extract a CSS selector from the input string starting at pos.
 * CSS selectors are universal across languages.
 *
 * Supported formats:
 * - #id
 * - .class
 * - [attribute]
 * - [attribute=value]
 * - @attribute (shorthand)
 * - *property (CSS property shorthand)
 * - Complex selectors with combinators (limited)
 *
 * Method call handling:
 * - #dialog.showModal() → stops after #dialog (method call, not compound selector)
 * - #box.active → compound selector (no parens)
 */
export function extractCssSelector(input: string, startPos: number): string | null {
  if (startPos >= input.length) return null;

  const char = input[startPos];
  if (!isSelectorStart(char)) return null;

  let pos = startPos;
  let selector = '';

  // Handle different selector types
  if (char === '#' || char === '.') {
    // ID or class selector: #id, .class
    selector += input[pos++];
    while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
      selector += input[pos++];
    }
    // Must have at least one character after prefix
    if (selector.length <= 1) return null;

    // Check for method call pattern: #id.method() or .class.method()
    // If we see .identifier followed by (, don't consume it - it's a method call
    if (pos < input.length && input[pos] === '.' && char === '#') {
      // Look ahead to see if this is a method call
      const methodStart = pos + 1;
      let methodEnd = methodStart;
      while (methodEnd < input.length && isAsciiIdentifierChar(input[methodEnd])) {
        methodEnd++;
      }
      // If followed by (, it's a method call - stop here
      if (methodEnd < input.length && input[methodEnd] === '(') {
        return selector;
      }
    }
  } else if (char === '[') {
    // Attribute selector: [attr] or [attr=value] or [attr="value"]
    // Need to track quote state to avoid counting brackets inside quotes
    let depth = 1;
    let inQuote = false;
    let quoteChar: string | null = null;
    let escaped = false;

    selector += input[pos++]; // [

    while (pos < input.length && depth > 0) {
      const c = input[pos];
      selector += c;

      if (escaped) {
        // Skip escaped character
        escaped = false;
      } else if (c === '\\') {
        // Next character is escaped
        escaped = true;
      } else if (inQuote) {
        // Inside a quoted string
        if (c === quoteChar) {
          inQuote = false;
          quoteChar = null;
        }
      } else {
        // Not inside a quoted string
        if (c === '"' || c === "'" || c === '`') {
          inQuote = true;
          quoteChar = c;
        } else if (c === '[') {
          depth++;
        } else if (c === ']') {
          depth--;
        }
      }
      pos++;
    }
    if (depth !== 0) return null;
  } else if (char === '@') {
    // Attribute shorthand: @disabled
    selector += input[pos++];
    while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
      selector += input[pos++];
    }
    if (selector.length <= 1) return null;
  } else if (char === '*') {
    // CSS property shorthand: *display
    selector += input[pos++];
    while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
      selector += input[pos++];
    }
    if (selector.length <= 1) return null;
  } else if (char === '<') {
    // HTML literal selector with optional modifiers and attributes:
    // - <div>
    // - <div.class>
    // - <div#id>
    // - <div.class#id>
    // - <button[disabled]/>
    // - <div.card/>
    // - <div.class#id[attr="value"]/>
    selector += input[pos++]; // <

    // Must be followed by an identifier (tag name)
    if (pos >= input.length || !isAsciiLetter(input[pos])) return null;

    // Extract tag name
    while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
      selector += input[pos++];
    }

    // Process modifiers and attributes
    // Can have multiple .class, one #id, and multiple [attr] in any order
    while (pos < input.length) {
      const modChar = input[pos];

      if (modChar === '.') {
        // Class modifier
        selector += input[pos++]; // .
        if (pos >= input.length || !isAsciiIdentifierChar(input[pos])) {
          return null; // Invalid - class name required after .
        }
        while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
          selector += input[pos++];
        }
      } else if (modChar === '#') {
        // ID modifier
        selector += input[pos++]; // #
        if (pos >= input.length || !isAsciiIdentifierChar(input[pos])) {
          return null; // Invalid - ID required after #
        }
        while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
          selector += input[pos++];
        }
      } else if (modChar === '[') {
        // Attribute modifier: [disabled] or [type="button"]
        // Need to track quote state to avoid counting brackets inside quotes
        let depth = 1;
        let inQuote = false;
        let quoteChar: string | null = null;
        let escaped = false;

        selector += input[pos++]; // [

        while (pos < input.length && depth > 0) {
          const c = input[pos];
          selector += c;

          if (escaped) {
            escaped = false;
          } else if (c === '\\') {
            escaped = true;
          } else if (inQuote) {
            if (c === quoteChar) {
              inQuote = false;
              quoteChar = null;
            }
          } else {
            if (c === '"' || c === "'" || c === '`') {
              inQuote = true;
              quoteChar = c;
            } else if (c === '[') {
              depth++;
            } else if (c === ']') {
              depth--;
            }
          }
          pos++;
        }
        if (depth !== 0) return null; // Unclosed bracket
      } else {
        // No more modifiers
        break;
      }
    }

    // Skip whitespace before optional self-closing /
    while (pos < input.length && isWhitespace(input[pos])) {
      selector += input[pos++];
    }

    // Optional self-closing /
    if (pos < input.length && input[pos] === '/') {
      selector += input[pos++];
      // Skip whitespace after /
      while (pos < input.length && isWhitespace(input[pos])) {
        selector += input[pos++];
      }
    }

    // Must end with >
    if (pos >= input.length || input[pos] !== '>') return null;
    selector += input[pos++]; // >
  }

  return selector || null;
}

// =============================================================================
// String Literal Tokenization
// =============================================================================

/**
 * Check if a single quote at pos is a possessive marker ('s).
 * Returns true if this looks like possessive, not a string start.
 *
 * Examples:
 * - #element's *opacity → possessive (returns true)
 * - 'hello' → string (returns false)
 * - it's value → possessive (returns true)
 */
export function isPossessiveMarker(input: string, pos: number): boolean {
  if (pos >= input.length || input[pos] !== "'") return false;

  // Check if followed by 's' or 'S'
  if (pos + 1 >= input.length) return false;
  const nextChar = input[pos + 1].toLowerCase();
  if (nextChar !== 's') return false;

  // After 's, should be end, whitespace, or special char (not alphanumeric)
  if (pos + 2 >= input.length) return true; // end of input
  const afterS = input[pos + 2];
  return isWhitespace(afterS) || afterS === '*' || !isAsciiIdentifierChar(afterS);
}

/**
 * Extract a string literal from the input starting at pos.
 * Handles both ASCII quotes and Unicode quotes.
 *
 * Note: Single quotes that look like possessive markers ('s) are skipped.
 */
export function extractStringLiteral(input: string, startPos: number): string | null {
  if (startPos >= input.length) return null;

  const openQuote = input[startPos];
  if (!isQuote(openQuote)) return null;

  // Check for possessive marker - don't treat as string
  if (openQuote === "'" && isPossessiveMarker(input, startPos)) {
    return null;
  }

  // Map opening quotes to closing quotes
  const closeQuoteMap: Record<string, string> = {
    '"': '"',
    "'": "'",
    '`': '`',
    '「': '」',
  };

  const closeQuote = closeQuoteMap[openQuote];
  if (!closeQuote) return null;

  let pos = startPos + 1;
  let literal = openQuote;
  let escaped = false;

  while (pos < input.length) {
    const char = input[pos];
    literal += char;

    if (escaped) {
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === closeQuote) {
      // Found closing quote
      return literal;
    }
    pos++;
  }

  // Unclosed string - return what we have
  return literal;
}

// =============================================================================
// URL Tokenization
// =============================================================================

/**
 * Check if the input at position starts a URL.
 * Detects: /path, ./path, ../path, //domain.com, http://, https://
 */
export function isUrlStart(input: string, pos: number): boolean {
  if (pos >= input.length) return false;

  const char = input[pos];
  const next = input[pos + 1] || '';
  const third = input[pos + 2] || '';

  // Absolute path: /something (but not just /)
  // Must be followed by alphanumeric or path char, not another / (that's protocol-relative)
  if (char === '/' && next !== '/' && /[a-zA-Z0-9._-]/.test(next)) {
    return true;
  }

  // Protocol-relative: //domain.com
  if (char === '/' && next === '/' && /[a-zA-Z]/.test(third)) {
    return true;
  }

  // Relative path: ./ or ../
  if (char === '.' && (next === '/' || (next === '.' && third === '/'))) {
    return true;
  }

  // Full URL: http:// or https://
  const slice = input.slice(pos, pos + 8).toLowerCase();
  if (slice.startsWith('http://') || slice.startsWith('https://')) {
    return true;
  }

  return false;
}

/**
 * Extract a URL from the input starting at pos.
 * Handles paths, query strings, and fragments.
 *
 * Fragment (#) handling:
 * - /page#section → includes fragment as part of URL
 * - #id alone → not a URL (CSS selector)
 */
export function extractUrl(input: string, startPos: number): string | null {
  if (!isUrlStart(input, startPos)) return null;

  let pos = startPos;
  let url = '';

  // Core URL characters (RFC 3986 unreserved + sub-delims + path/query chars)
  // Includes: letters, digits, and - . _ ~ : / ? # [ ] @ ! $ & ' ( ) * + , ; = %
  const urlChars = /[a-zA-Z0-9/:._\-?&=%@+~!$'()*,;[\]]/;

  while (pos < input.length) {
    const char = input[pos];

    // Special handling for #
    if (char === '#') {
      // Only include # if we have path content before it (it's a fragment)
      // If # appears at URL start or after certain chars, stop (might be CSS selector)
      if (url.length > 0 && /[a-zA-Z0-9/.]$/.test(url)) {
        // Include fragment
        url += char;
        pos++;
        // Consume fragment identifier (letters, digits, underscore, hyphen)
        while (pos < input.length && /[a-zA-Z0-9_-]/.test(input[pos])) {
          url += input[pos++];
        }
      }
      // Stop either way - fragment consumed or # is separate token
      break;
    }

    if (urlChars.test(char)) {
      url += char;
      pos++;
    } else {
      break;
    }
  }

  // Minimum length validation
  if (url.length < 2) return null;

  return url;
}

// =============================================================================
// Number Tokenization
// =============================================================================

/**
 * Extract a number from the input starting at pos.
 * Handles integers and decimals.
 */
export function extractNumber(input: string, startPos: number): string | null {
  if (startPos >= input.length) return null;

  const char = input[startPos];
  if (!isDigit(char) && char !== '-' && char !== '+') return null;

  let pos = startPos;
  let number = '';

  // Optional sign
  if (input[pos] === '-' || input[pos] === '+') {
    number += input[pos++];
  }

  // Must have at least one digit
  if (pos >= input.length || !isDigit(input[pos])) {
    return null;
  }

  // Integer part
  while (pos < input.length && isDigit(input[pos])) {
    number += input[pos++];
  }

  // Optional decimal part
  if (pos < input.length && input[pos] === '.') {
    number += input[pos++];
    while (pos < input.length && isDigit(input[pos])) {
      number += input[pos++];
    }
  }

  // Optional duration suffix (s, ms, m, h)
  if (pos < input.length) {
    const suffix = input.slice(pos, pos + 2);
    if (suffix === 'ms') {
      number += 'ms';
    } else if (input[pos] === 's' || input[pos] === 'm' || input[pos] === 'h') {
      number += input[pos];
    }
  }

  return number;
}
