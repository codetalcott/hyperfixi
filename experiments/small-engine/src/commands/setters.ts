/**
 * `set`, `increment`, `decrement`, `put`. Follows upstream `parsetree/commands/setters.js`.
 *
 * Every write goes through the target expression's own `lhs` / `put` pair, so a
 * command never inspects what kind of expression it was given.
 */
import type { Cmd, Ctx, Expr, ObjectNode } from '../ast';
import { assignable, expr, objectLiteral, unwrap } from '../expressions';
import type { Grammar, Parser } from '../parser';
import { host, implicitLoop, nullCheck, toFragment } from '../runtime';
import { all, isEl, then1 } from '../util';

export interface SetNode extends Cmd {
  type: 'setCommand';
  target: Expr;
  value?: Expr;
  /** `set { … } on <target>`: copy the object's properties onto the target. */
  object?: ObjectNode;
}

export function set(g: Grammar): void {
  g.commands.set = (p, _keyword, start) => parseSet(p, start);
}

export function parseSet(p: Parser, start: number): SetNode {
  {
    if (p.cur().op && p.cur().value === '{') {
      const object = objectLiteral(p);
      p.req('on');
      const target = expr(p);
      const node: SetNode = {
        type: 'setCommand',
        target,
        object,
        start,
        end: p.endPos(),
        run: ctx =>
          all(
            [object.ev(ctx), target.ev(ctx)],
            ([props, onto]) => void Object.assign(Object(onto), props)
          ),
      };
      return node;
    }
    const target = p.withFollow(['to'], () => assignable(p));
    p.req('to');
    const value = expr(p);
    const node: SetNode = {
      type: 'setCommand',
      target,
      value,
      start,
      end: p.endPos(),
      // `set` writes its target and nothing else: `it` is left alone.
      run: ctx => all([target.lhs?.(ctx), value.ev(ctx)], ([lhs, v]) => target.put?.(ctx, lhs, v)),
    };
    return node;
  }
}

export interface DefaultNode extends Cmd {
  type: 'defaultCommand';
  target: Expr;
  value: Expr;
}

/** `default <target> to <value>`: assign only when the target is null, undefined or empty. */
export function defaultCommand(g: Grammar): void {
  g.commands.default = (p, _keyword, start) => {
    const target = p.withFollow(['to'], () => assignable(p));
    p.req('to');
    const value = expr(p);
    const node: DefaultNode = {
      type: 'defaultCommand',
      target,
      value,
      start,
      end: p.endPos(),
      run: ctx =>
        then1(target.ev(ctx), current => {
          if (current != null && current !== '') return;
          return all([target.lhs?.(ctx), value.ev(ctx)], ([lhs, v]) => target.put?.(ctx, lhs, v));
        }),
    };
    return node;
  };
}

export interface StepNode extends Cmd {
  type: 'incrementCommand' | 'decrementCommand';
  target: Expr;
  amount?: Expr;
}

/** `increment` and `decrement`: the same rule with the sign flipped. */
export function increment(g: Grammar): void {
  for (const keyword of ['increment', 'decrement'] as const) {
    const sign = keyword === 'increment' ? 1 : -1;
    g.commands[keyword] = (p, _keyword, start) => {
      const target = p.withFollow(sign < 0 ? ['by'] : [], () => assignable(p));
      const amount = p.match('by') ? expr(p) : undefined;
      const node: StepNode = {
        type: `${keyword}Command`,
        target,
        amount,
        start,
        end: p.endPos(),
        run: ctx =>
          all([target.ev(ctx), amount?.ev(ctx), target.lhs?.(ctx)], ([current, by, lhs]) => {
            const value =
              (current ? parseFloat(String(current)) : 0) +
              sign * (amount ? parseFloat(String(by)) : 1);
            ctx.result = value;
            target.put?.(ctx, lhs, value);
          }),
      };
      return node;
    };
  }
}

export interface PutNode extends Cmd {
  type: 'putCommand';
  value: Expr;
  operation: 'into' | 'before' | 'after' | 'start' | 'end';
  target: Expr;
}

/** Replace an element's children with the value, then initialise what was inserted. */
function setContent(elt: Element | Document, value: unknown): void {
  elt.replaceChildren(toFragment(value));
  host.process(elt);
}

/** Expression kinds that `put … into` writes through their own `put`. */
const WRITES = [
  'arrayIndex',
  'propertyAccess',
  'possessive',
  'ofExpression',
  'attributeRef',
  'styleRef',
  'attributeRefAccess',
];

const OPERATIONS: Record<string, PutNode['operation']> = {
  into: 'into',
  before: 'before',
  after: 'after',
  start: 'start',
  end: 'end',
};

/** The DOM method each insertion uses. */
const INSERT = { before: 'before', after: 'after', start: 'prepend', end: 'append' } as const;

export function put(g: Grammar): void {
  g.commands.put = (p, _keyword, start) => {
    const value = expr(p);
    let word = p.matchAny('into', 'before', 'after');
    if (!word && p.match('at')) {
      p.match('the');
      word = p.matchAny('start', 'end');
      p.req('of');
    }
    const operation =
      OPERATIONS[(word ?? p.expected('into', 'before', 'at start of', 'at end of', 'after')).value];
    const target = unwrap(expr(p));
    const targetText = p.text(target);

    const into = (ctx: Ctx, v: unknown) => {
      if (target.type === 'symbol') {
        // A variable holding an element receives the value as its content; any other variable is assigned.
        return then1(target.ev(ctx), current => {
          if (isEl(current) || current instanceof Document) setContent(current, v);
          else target.put?.(ctx, undefined, v);
        });
      }
      if (WRITES.includes(target.type)) {
        return then1(target.lhs?.(ctx), lhs => target.put?.(ctx, lhs, v));
      }
      return then1(target.ev(ctx), root => {
        nullCheck(root, targetText);
        implicitLoop(root, elt => {
          if (isEl(elt) || elt instanceof Document) setContent(elt, v);
        });
      });
    };

    const insert = (ctx: Ctx, v: unknown, method: 'before' | 'after' | 'prepend' | 'append') =>
      then1(target.ev(ctx), root => {
        nullCheck(root, targetText);
        if (Array.isArray(root)) {
          if (method === 'prepend') root.unshift(v);
          else root.push(v);
          return;
        }
        implicitLoop(root, elt => {
          if (!isEl(elt)) return;
          elt[method](v instanceof Node ? v : toFragment(v));
          host.process(elt.parentElement ?? elt);
        });
      });

    const node: PutNode = {
      type: 'putCommand',
      value,
      operation,
      target,
      start,
      end: p.endPos(),
      run: ctx =>
        then1(value.ev(ctx), v =>
          operation === 'into' ? into(ctx, v) : insert(ctx, v, INSERT[operation])
        ),
    };
    return node;
  };
}
