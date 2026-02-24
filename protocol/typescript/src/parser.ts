import {
  type SemanticNode,
  type SemanticValue,
  selectorValue,
  literalValue,
  referenceValue,
  expressionValue,
  flagValue,
} from './types';
import { DEFAULT_REFERENCES, isValidReference } from './references';

const DURATION_RE = /^(-?\d+(?:\.\d+)?)(ms|s|m|h)$/;
const NUMBER_RE = /^-?\d+(?:\.\d+)?$/;

/** Returned when explicit syntax is malformed. */
export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

/** Options for parseExplicit. */
export interface ParseOptions {
  /** Overrides the default reference names. */
  referenceSet?: ReadonlySet<string>;
  /** Limits the maximum input length in bytes. 0 = no limit. */
  maxInputLength?: number;
}

/** Checks if the input is explicit bracket syntax. */
export function isExplicitSyntax(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith('[') && trimmed.endsWith(']');
}

/** Parses explicit bracket syntax into a SemanticNode. */
export function parseExplicit(text: string, opts?: ParseOptions): SemanticNode {
  if (opts?.maxInputLength && opts.maxInputLength > 0 && text.length > opts.maxInputLength) {
    throw new ParseError(
      `Input length ${text.length} exceeds maximum allowed length ${opts.maxInputLength}`,
    );
  }

  const refs = opts?.referenceSet ?? DEFAULT_REFERENCES;
  const trimmed = text.trim();

  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    throw new ParseError(
      'Explicit syntax must be wrapped in brackets: [command role:value ...]',
    );
  }

  const content = trimmed.slice(1, -1).trim();
  if (!content) {
    throw new ParseError('Empty explicit statement');
  }

  const tokens = tokenize(content);
  if (tokens.length === 0) {
    throw new ParseError('No command specified in explicit statement');
  }

  const command = tokens[0].toLowerCase();
  const roles: Record<string, SemanticValue> = {};

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];

    // Boolean flag: +name or ~name
    if (token.startsWith('+') || token.startsWith('~')) {
      const enabled = token.startsWith('+');
      const flagName = token.slice(1);
      if (!flagName) {
        throw new ParseError(`Empty flag name: ${JSON.stringify(token)}`);
      }
      roles[flagName] = flagValue(flagName, enabled);
      continue;
    }

    // Role:value pair
    const colonIdx = token.indexOf(':');
    if (colonIdx === -1) {
      throw new ParseError(
        `Invalid role format: ${JSON.stringify(token)}. Expected role:value or +flag`,
      );
    }

    const roleName = token.slice(0, colonIdx);
    const valueStr = token.slice(colonIdx + 1);

    // Nested bracket syntax for body role
    if (roleName === 'body' && valueStr.startsWith('[')) {
      roles[roleName] = expressionValue(valueStr);
      continue;
    }

    roles[roleName] = parseValue(valueStr, refs);
  }

  // Build event-handler node for "on" command
  if (command === 'on') {
    if (!('event' in roles)) {
      throw new ParseError('Event handler requires event role: [on event:click ...]');
    }

    const body: SemanticNode[] = [];
    const bodyValue = roles['body'];
    if (bodyValue?.type === 'expression' && bodyValue.raw) {
      body.push(parseExplicit(bodyValue.raw, opts));
    }

    // body is structural, not a semantic role
    delete roles['body'];

    return { kind: 'event-handler', action: 'on', roles, body };
  }

  return { kind: 'command', action: command, roles };
}

/**
 * Tokenizes explicit syntax content.
 * Splits on spaces at bracket-depth 0 and outside quoted strings.
 */
export function tokenize(content: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  let bracketDepth = 0;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    if (inString) {
      current += ch;
      if (ch === stringChar) {
        // Count preceding backslashes — even count means the quote closes the string
        let backslashes = 0;
        for (let j = i - 1; j >= 0 && content[j] === '\\'; j--) backslashes++;
        if (backslashes % 2 === 0) inString = false;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      current += ch;
      continue;
    }

    if (ch === '[') {
      bracketDepth++;
      current += ch;
      continue;
    }

    if (ch === ']') {
      bracketDepth--;
      current += ch;
      continue;
    }

    if (ch === ' ' && bracketDepth === 0) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += ch;
  }

  if (current) tokens.push(current);
  return tokens;
}

/**
 * Classifies a value string into a SemanticValue.
 * Detection priority (first match wins):
 *   1. selector  — starts with # . [ @ *
 *   2. string    — starts with " or '
 *   3. boolean   — exact match: true / false (case-sensitive)
 *   4. reference — matches a known reference name (case-insensitive)
 *   5. duration  — number followed by ms/s/m/h
 *   6. number    — integer or decimal
 *   7. plain     — fallback string
 */
export function parseValue(
  valueStr: string,
  refs: ReadonlySet<string> = DEFAULT_REFERENCES,
): SemanticValue {
  if (!valueStr) return literalValue('', 'string');

  const first = valueStr[0];

  // 1. CSS selector
  if (first === '#' || first === '.' || first === '[' || first === '@' || first === '*') {
    return selectorValue(valueStr);
  }

  // 2. String literal
  if (first === '"' || first === "'") {
    return literalValue(valueStr.slice(1, -1), 'string');
  }

  // 3. Boolean (case-sensitive)
  if (valueStr === 'true') return literalValue(true, 'boolean');
  if (valueStr === 'false') return literalValue(false, 'boolean');

  // 4. Reference (case-insensitive)
  if (isValidReference(valueStr, refs)) {
    return referenceValue(valueStr.toLowerCase());
  }

  // 5. Duration
  if (DURATION_RE.test(valueStr)) {
    return literalValue(valueStr, 'duration');
  }

  // 6. Number
  const numMatch = NUMBER_RE.exec(valueStr);
  if (numMatch) {
    const f = parseFloat(numMatch[0]);
    if (!isNaN(f)) {
      // Use integer when value is whole and has no decimal point
      if (Number.isInteger(f) && !valueStr.includes('.')) {
        return literalValue(f | 0, 'number');
      }
      return literalValue(f, 'number');
    }
  }

  // 7. Plain string fallback
  return literalValue(valueStr, 'string');
}
