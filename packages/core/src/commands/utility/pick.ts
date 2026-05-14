/**
 * PickCommand - Decorated Implementation
 *
 * Selects from a collection. Supports 5 upstream _hyperscript variants:
 *
 *   - pick first <count> of <expr>            — first N elements
 *   - pick last <count> of <expr>             — last N elements
 *   - pick random [<count>] of <expr>         — single random element (no count)
 *                                              or N-element random sample (with count)
 *   - pick item(s)|character(s) at|from <i> [to|.. <j>|end] [inclusive|exclusive] of <expr>
 *                                             — range slice
 *   - pick match|matches of <regex>[|<flags>] of <expr>
 *                                             — regex single match or all matches
 *
 * Legacy hyperfixi shortcuts (single-random):
 *   - pick from <array>                       — random element from array
 *   - pick <item1>, <item2>, ...              — random from inline items
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import {
  command,
  meta,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';

/**
 * Pick command input. The optional `variant` selects between the upstream
 * variants — when absent (legacy callers passing just `{items}` or `{array}`),
 * `execute()` defaults to single-element random selection.
 *
 * The interface is a single shape (rather than a discriminated union) so
 * legacy callers don't need narrowing to access `.items` / `.array`.
 */
export interface PickCommandInput {
  variant?: 'first' | 'last' | 'random' | 'range' | 'match' | 'matches';
  items?: unknown[];
  array?: unknown[];
  count?: number;
  rangeStart?: number | 'start';
  rangeEnd?: number | 'end';
  rangeMode?: 'default' | 'inclusive' | 'exclusive';
  source?: string;
  regex?: string;
  flags?: string;
}

export interface PickCommandOutput {
  selectedItem: unknown;
  selectedIndex?: number;
  sourceLength: number;
  sourceType: 'items' | 'array' | 'string';
  variant: PickCommandInput['variant'];
}

@meta({
  description: 'Select from a collection (first/last/random/range/regex match)',
  syntax: [
    'pick first <count> of <expr>',
    'pick last <count> of <expr>',
    'pick random [<count>] of <expr>',
    'pick items <i> to <j> of <expr>',
    'pick match of <regex> from <expr>',
    'pick from <array>',
    'pick <item1>, <item2>, ...',
  ],
  examples: [
    'pick first 3 of items',
    'pick last 2 of items',
    'pick random 2 of items',
    'pick items 1 to 3 of items',
    'pick match of "[0-9]+" from text',
    'pick from colors',
    'pick "red", "green", "blue"',
  ],
  sideEffects: ['random-selection'],
})
@command({ name: 'pick', category: 'utility' })
export class PickCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<PickCommandInput> {
    const variantNode = raw.modifiers?.variant as { value?: string } | undefined;
    const variant = variantNode?.value;

    // ---------- New variant-tagged forms (from parsePickCommand) ----------
    if (variant === 'first' || variant === 'last') {
      const array = await evaluator.evaluate(raw.args[0], context);
      const count = await evaluator.evaluate(raw.modifiers.count, context);
      if (!Array.isArray(array)) {
        throw new Error(`pick ${variant}: source must be an array, got ${typeof array}`);
      }
      if (typeof count !== 'number' || !Number.isFinite(count)) {
        throw new Error(`pick ${variant}: count must be a number, got ${typeof count}`);
      }
      return { variant, array, count };
    }

    if (variant === 'random') {
      const array = await evaluator.evaluate(raw.args[0], context);
      if (!Array.isArray(array)) {
        throw new Error('pick random: source must be an array');
      }
      let count: number | undefined;
      if (raw.modifiers.count) {
        const c = await evaluator.evaluate(raw.modifiers.count, context);
        if (typeof c !== 'number' || !Number.isFinite(c)) {
          throw new Error(`pick random: count must be a number, got ${typeof c}`);
        }
        count = c;
      }
      return { variant: 'random', array, count };
    }

    if (variant === 'range') {
      const array = await evaluator.evaluate(raw.args[0], context);
      if (!Array.isArray(array) && typeof array !== 'string') {
        throw new Error('pick items: source must be an array or string');
      }
      const rangeStartNode = raw.modifiers.rangeStart as { value?: unknown } | undefined;
      const rangeStartRaw =
        rangeStartNode?.value === 'start'
          ? 'start'
          : await evaluator.evaluate(raw.modifiers.rangeStart, context);
      const rangeStart = rangeStartRaw === 'start' ? ('start' as const) : Number(rangeStartRaw);

      let rangeEnd: number | 'end' | undefined;
      if (raw.modifiers.rangeEnd) {
        const rangeEndNode = raw.modifiers.rangeEnd as { value?: unknown };
        if (rangeEndNode.value === 'end') {
          rangeEnd = 'end';
        } else {
          const v = await evaluator.evaluate(raw.modifiers.rangeEnd, context);
          rangeEnd = Number(v);
        }
      }

      const modeNode = raw.modifiers.rangeMode as { value?: string } | undefined;
      const rangeMode = (modeNode?.value ?? 'default') as 'default' | 'inclusive' | 'exclusive';

      return {
        variant: 'range',
        array: array as unknown[],
        rangeStart,
        rangeEnd,
        rangeMode,
      };
    }

    if (variant === 'match' || variant === 'matches') {
      const source = await evaluator.evaluate(raw.args[0], context);
      if (typeof source !== 'string') {
        throw new Error(`pick ${variant}: source must be a string, got ${typeof source}`);
      }
      const regexRaw = await evaluator.evaluate(raw.modifiers.regex, context);
      const regex = typeof regexRaw === 'string' ? regexRaw : String(regexRaw);
      const flagsNode = raw.modifiers.flags as { value?: string } | undefined;
      const flags = flagsNode?.value;
      return { variant, source, regex, flags };
    }

    // ---------- Legacy fallback: `pick from <expr>` (random single) ----------
    if (raw.modifiers?.from) {
      const array = await evaluator.evaluate(raw.modifiers.from, context);
      if (!Array.isArray(array)) {
        throw new Error('pick from requires an array');
      }
      if (array.length === 0) {
        throw new Error('Cannot pick from empty array');
      }
      return { variant: 'random', array };
    }

    // ---------- Legacy fallback: `pick a, b, c` (random from inline items) ----------
    if (raw.args.length === 0) {
      throw new Error('pick command requires items to choose from');
    }

    const items = await Promise.all(raw.args.map(arg => evaluator.evaluate(arg, context)));
    return { variant: 'random', items };
  }

  async execute(
    input: PickCommandInput,
    context: TypedExecutionContext
  ): Promise<PickCommandOutput> {
    const variant = input.variant ?? 'random';

    if (variant === 'first') {
      const arr = input.array ?? [];
      const count = input.count ?? 0;
      const result = arr.slice(0, count);
      Object.assign(context, { it: result });
      return {
        selectedItem: result,
        sourceLength: arr.length,
        sourceType: 'array',
        variant: 'first',
      };
    }

    if (variant === 'last') {
      const arr = input.array ?? [];
      const count = input.count ?? 0;
      const result = count > 0 ? arr.slice(-count) : [];
      Object.assign(context, { it: result });
      return {
        selectedItem: result,
        sourceLength: arr.length,
        sourceType: 'array',
        variant: 'last',
      };
    }

    if (variant === 'range') {
      const arr = input.array ?? [];
      let from = input.rangeStart === 'start' ? 0 : (input.rangeStart ?? 0);
      let to =
        input.rangeEnd === undefined
          ? (from as number) + 1
          : input.rangeEnd === 'end'
            ? arr.length
            : input.rangeEnd;

      // Mode adjustments (mirror upstream basic.js:519-524):
      //   default: include start, exclude end (Array.slice semantics)
      //   inclusive: include end too → to++
      //   exclusive: exclude start → from++
      if (input.rangeMode === 'inclusive') (to as number)++;
      else if (input.rangeMode === 'exclusive') (from as number)++;

      const result = arr.slice(from as number, to as number);
      Object.assign(context, { it: result });
      return {
        selectedItem: result,
        sourceLength: arr.length,
        sourceType: 'array',
        variant: 'range',
      };
    }

    if (variant === 'match') {
      const source = input.source ?? '';
      const re = new RegExp(input.regex ?? '', input.flags);
      const result = re.exec(source);
      Object.assign(context, { it: result });
      return {
        selectedItem: result,
        sourceLength: source.length,
        sourceType: 'string',
        variant: 'match',
      };
    }

    if (variant === 'matches') {
      const source = input.source ?? '';
      const flags = input.flags ?? 'g';
      const re = new RegExp(input.regex ?? '', flags.includes('g') ? flags : 'g' + flags);
      const result = Array.from(source.matchAll(re));
      Object.assign(context, { it: result });
      return {
        selectedItem: result,
        sourceLength: source.length,
        sourceType: 'string',
        variant: 'matches',
      };
    }

    // ---------- random (default for legacy callers) ----------
    const source = input.items ?? input.array ?? [];
    if (source.length === 0) {
      throw new Error('Cannot pick from empty collection');
    }
    if (input.count === undefined) {
      // Single-element random selection (legacy + upstream parity).
      const idx = Math.floor(Math.random() * source.length);
      const selected = source[idx];
      Object.assign(context, { it: selected });
      return {
        selectedItem: selected,
        selectedIndex: idx,
        sourceLength: source.length,
        sourceType: input.items ? 'items' : 'array',
        variant: 'random',
      };
    }
    // N-element random sample without replacement.
    const copy = source.slice();
    const result: unknown[] = [];
    for (let i = 0; i < input.count && copy.length > 0; i++) {
      const idx = Math.floor(Math.random() * copy.length);
      result.push(copy.splice(idx, 1)[0]);
    }
    Object.assign(context, { it: result });
    return {
      selectedItem: result,
      sourceLength: source.length,
      sourceType: input.items ? 'items' : 'array',
      variant: 'random',
    };
  }
}

export const createPickCommand = createFactory(PickCommand);
export default PickCommand;
