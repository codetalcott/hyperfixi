/**
 * `pick`: take part of a list or string, or match a regular expression.
 * Follows upstream `parsetree/commands/basic.js`.
 */
import type { Cmd, Expr } from '../ast';
import { expr } from '../expressions';
import type { Grammar } from '../parser';
import { all, fn, get, isIterable, num } from '../util';

export interface PickNode extends Cmd {
  type: 'pickCommand';
  variant: 'first' | 'last' | 'random' | 'range' | 'match' | 'matches';
  root: Expr;
  /** How many, for first / last / random. */
  count?: Expr;
  /** Range bounds; `start` and `end` are the list's own ends. */
  from?: Expr;
  to?: Expr;
  toEnd?: boolean;
  /** `inclusive` includes the end index; `exclusive` skips the start index. */
  bounds?: 'inclusive' | 'exclusive';
  re?: Expr;
  flags?: string;
}

const slice = (source: unknown, from?: number, to?: number): unknown => {
  const method = get(source, 'slice');
  return fn(method) ? Reflect.apply(method, source, [from, to]) : undefined;
};

/** Every match of a pattern, found lazily. */
const allMatches = (pattern: unknown, flags: string, text: string): Iterable<RegExpExecArray> => ({
  *[Symbol.iterator]() {
    const re = new RegExp(pattern instanceof RegExp ? pattern : String(pattern), flags);
    for (let match = re.exec(text); match; match = re.exec(text)) {
      if (match[0].length === 0) re.lastIndex++;
      yield match;
    }
  },
});

export function pick(g: Grammar): void {
  g.commands.pick = (p, _keyword, start) => {
    p.match('the');
    const word =
      p.matchAny('first', 'last', 'random', 'match', 'matches') ??
      p.matchAny('item', 'items', 'character', 'characters');
    if (!word) return;
    const variant =
      word.value === 'first' ||
      word.value === 'last' ||
      word.value === 'random' ||
      word.value === 'match' ||
      word.value === 'matches'
        ? word.value
        : 'range';
    const fields: Omit<PickNode, keyof Cmd | 'variant' | 'root'> = {};

    // `pick match of <pattern> from <source>`: this `of` is decoration.
    if (variant === 'match' || variant === 'matches') p.match('of');
    // What comes before the source ends at `of` / `from`, which introduce it.
    p.withFollow(['of', 'from'], () => {
      if (variant === 'first' || variant === 'last') fields.count = expr(p);
      else if (variant === 'random') {
        if (p.cur().type === 'NUMBER') fields.count = expr(p);
      } else if (variant === 'range') {
        if (!p.match('at')) p.match('from');
        if (!p.match('start')) fields.from = expr(p);
        if (p.match('to') || p.matchOp('..')) {
          if (p.match('end')) fields.toEnd = true;
          else fields.to = expr(p);
        }
        if (p.match('inclusive')) fields.bounds = 'inclusive';
        else if (p.match('exclusive')) fields.bounds = 'exclusive';
      } else {
        fields.re = expr(p);
        const flags = p.matchOp('|') ? p.reqType('IDENTIFIER').value : undefined;
        // `matches` always searches globally.
        fields.flags =
          variant === 'match'
            ? (flags ?? '')
            : flags === undefined
              ? 'gu'
              : 'g' + flags.replace('g', '');
      }
    });
    if (!p.matchAny('of', 'from')) p.expected('of', 'from');
    const root = expr(p);
    const { count, from, to, toEnd, bounds, re, flags = '' } = fields;

    const node: PickNode = {
      type: 'pickCommand',
      variant,
      root,
      ...fields,
      start,
      end: p.endPos(),
      run: ctx =>
        all(
          [root.ev(ctx), count?.ev(ctx), from?.ev(ctx), to?.ev(ctx), re?.ev(ctx)],
          ([source, n, low, high, pattern]) => {
            if (source == null) ctx.result = source;
            else if (variant === 'first') ctx.result = slice(source, 0, num(n));
            else if (variant === 'last') ctx.result = slice(source, -num(n));
            else if (variant === 'random') {
              const pool = isIterable(source) ? Array.from(source) : [];
              const take = () => pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
              ctx.result =
                n == null ? take() : Array.from({ length: Math.min(num(n), pool.length) }, take);
            } else if (variant === 'range') {
              const first = num(low ?? 0) + (bounds === 'exclusive' ? 1 : 0);
              const last = toEnd
                ? num(get(source, 'length'))
                : high == null
                  ? undefined
                  : num(high);
              const end = last === undefined ? first + 1 : last + (bounds === 'inclusive' ? 1 : 0);
              ctx.result = slice(source, first, end);
            } else if (variant === 'match')
              ctx.result = new RegExp(
                pattern instanceof RegExp ? pattern : String(pattern),
                flags
              ).exec(String(source));
            else ctx.result = allMatches(pattern, flags, String(source));
          }
        ),
    };
    return node;
  };
}
