/**
 * The less common expression kinds, as one optional module: positional
 * (`first`, `last`, `random`), relative (`next`, `previous`), `closest`,
 * collection operators (`where`, `sorted by`, `mapped to`, `split by`,
 * `joined by`), `some`, block literals, type checks and `beep!`.
 *
 * Follows upstream `parsetree/expressions/{positional,existentials,postfix}.js`
 * and the collection half of `expressions.js`.
 */
import type {
  BlockLiteralNode,
  ClosestNode,
  CollectionNode,
  Ctx,
  Expr,
  PositionalNode,
  PostfixNode,
  RelativeNode,
} from './ast';
import { attributeAccessNode, attributeRef, expr, implicitMe, leaf, unary, unaryNode } from './expressions';
import type { Grammar, Parser } from './parser';
import { implicitLoop, isEmpty, replaceInDom, shouldAutoIterate, triggerEvent, typeCheck } from './runtime';
import { all, get, isEl, isIterable, num, then1 } from './util';

const list = (v: unknown): unknown[] => (isIterable(v) ? Array.from(v) : []);

// ----- positional ------------------------------------------------------------

function positional(p: Parser): Expr | undefined {
  const start = p.pos();
  const word = p.matchAny('first', 'last', 'random');
  if (!word) return;
  p.matchAny('in', 'from', 'of');
  const root = unary(p);
  const operator = word.value;
  const node: PositionalNode = {
    type: 'positionalExpression',
    operator,
    root,
    start,
    end: p.endPos(),
    ev: ctx =>
      then1(root.ev(ctx), value => {
        if (!value) return;
        // An element stands for its children; any other collection is read as a list.
        const items = Array.isArray(value) ? value : list(get(value, 'children') ?? value);
        const index = operator === 'first' ? 0 : operator === 'last' ? items.length - 1 : Math.floor(Math.random() * items.length);
        return items[index];
      }),
  };
  return node;
}

/** The match after (or before) `from` in document order, or within a given list. */
function relative(p: Parser): Expr | undefined {
  const start = p.pos();
  const word = p.matchAny('next', 'previous');
  if (!word) return;
  const forward = word.value === 'next';
  const thing = leaf(p) ?? p.err('Expected leaf');
  const from = p.match('from') ? p.withFollow(['in'], () => unary(p)) : implicitMe(p);
  const inElt = p.match('in') ? unary(p) : undefined;
  const withinElt = !inElt && p.match('within') ? unary(p) : undefined;
  const wrapping = !!p.match('with');
  if (wrapping) p.req('wrapping');
  const thingText = p.text(thing);

  const inDocument = (origin: unknown, root: unknown, css: string) => {
    const scope = root instanceof Element || root instanceof Document ? root : document.body;
    const found = Array.from(scope.querySelectorAll(css));
    if (!(origin instanceof Node)) return;
    const wanted = forward ? Node.DOCUMENT_POSITION_PRECEDING : Node.DOCUMENT_POSITION_FOLLOWING;
    const ordered = forward ? found : found.reverse();
    return ordered.find(e => e.compareDocumentPosition(origin) === wanted) ?? (wrapping ? ordered[0] : undefined);
  };
  const inList = (origin: unknown, items: unknown, css: string) => {
    const candidates = list(items).filter(e => e === origin || (isEl(e) && e.matches(css)));
    const ordered = forward ? candidates : candidates.reverse();
    const next = ordered[ordered.indexOf(origin) + 1];
    if (ordered.includes(origin) && next !== undefined) return next;
    const first = ordered[0];
    return wrapping && isEl(first) && first.matches(css) ? first : undefined;
  };

  const node: RelativeNode = {
    type: 'relativePositionalExpression',
    operator: word.value,
    thing,
    from,
    inElt,
    withinElt,
    wrapping,
    start,
    end: p.endPos(),
    ev: ctx =>
      all([thing.ev(ctx), from.ev(ctx), inElt?.ev(ctx), withinElt?.ev(ctx)], ([value, origin, items, within]) => {
        const css = get(value, 'css');
        if (typeof css !== 'string') throw new Error('Expected a CSS value to be returned by ' + thingText);
        return inElt ? items && inList(origin, items, css) : inDocument(origin, within, css);
      }),
  };
  return node;
}

// ----- closest ---------------------------------------------------------------

function closest(p: Parser): Expr | undefined {
  const start = p.pos();
  if (!p.match('closest')) return;
  const parentSearch = !!p.match('parent');
  const attribute = p.cur().type === 'ATTRIBUTE_REF' ? attributeRef(p) : undefined;
  const css = attribute ? `[${attribute.name}]` : (unary(p).css ?? p.err('Expected a CSS expression'));
  const to = p.match('to') ? expr(p) : implicitMe(p);
  const node: ClosestNode = {
    type: 'closestExpr',
    css,
    parentSearch,
    to,
    start,
    end: p.endPos(),
    ev: ctx =>
      then1(to.ev(ctx), origin => {
        if (origin == null) return null;
        const found: (Element | null)[] = [];
        implicitLoop(origin, o => {
          const from = parentSearch ? get(o, 'parentElement') : o;
          found.push(isEl(from) ? from.closest(css) : null);
        });
        return shouldAutoIterate(origin) ? found : found[0];
      }),
    lhs: ctx => node.ev(ctx),
    put: (_ctx, lhs, value) => {
      if (lhs) replaceInDom(lhs, value);
    },
  };
  // `closest @attr` reads the attribute off the element it finds.
  return attribute ? attributeAccessNode(p, node, attribute) : node;
}

// ----- collection operators --------------------------------------------------

const COLLECTION = ['where', 'sorted', 'mapped', 'split', 'joined'];

function collectionOp(p: Parser, root: Expr): Expr | undefined {
  const word = p.matchAny(...COLLECTION);
  if (!word) return;
  const operator = word.value;
  if (operator === 'mapped') p.req('to');
  else if (operator !== 'where') p.req('by');
  // The other operators end this one's operand: `x where a sorted by b`.
  const operand = p.withFollow(COLLECTION, () => expr(p));
  const descending = operator === 'sorted' && !!p.match('descending');

  /** Evaluate the operand once per item, with `it` bound to the item. */
  const each = (ctx: Ctx, items: unknown[]) => {
    const results = items.map(item => {
      ctx.beingTested = item;
      return operand.ev(ctx);
    });
    ctx.beingTested = null;
    return results;
  };

  const apply = (ctx: Ctx, collection: unknown): unknown => {
    if (!collection) return collection;
    if (operator === 'split') return then1(operand.ev(ctx), by => String(collection).split(String(by)));
    const items = list(collection);
    if (operator === 'joined') return then1(operand.ev(ctx), by => items.join(String(by)));
    const results = each(ctx, items);
    if (operator === 'where') return items.filter((_, i) => results[i]);
    if (operator === 'mapped') return results;
    const direction = descending ? -1 : 1;
    return items
      .map((_, i) => i)
      .sort((a, b) => (results[a] == results[b] ? 0 : (num(results[a]) < num(results[b]) ? -1 : 1) * direction))
      .map(i => items[i]);
  };

  const node: CollectionNode = {
    type: 'collectionExpression',
    operator: operator === 'where' || operator === 'sorted' || operator === 'mapped' || operator === 'split' ? operator : 'joined',
    root,
    operand,
    descending,
    start: root.start,
    end: p.endPos(),
    ev: ctx => then1(root.ev(ctx), collection => apply(ctx, collection)),
  };
  return node;
}

// ----- block literal, some, type check, beep ----------------------------------

/** `\ x, y -> expr`: a function whose parameters become locals. */
function blockLiteral(p: Parser): Expr | undefined {
  const start = p.pos();
  if (!p.matchOp('\\')) return;
  const params: string[] = [];
  const first = p.matchType('IDENTIFIER');
  if (first) {
    params.push(first.value);
    while (p.matchOp(',')) params.push(p.reqType('IDENTIFIER').value);
  }
  p.reqOp('-');
  p.reqOp('>');
  const body = expr(p);
  const node: BlockLiteralNode = {
    type: 'blockLiteral',
    params,
    expr: body,
    start,
    end: p.endPos(),
    ev:
      ctx =>
      (...args: unknown[]) => {
        params.forEach((param, i) => (ctx.locals[param] = args[i]));
        return body.ev(ctx);
      },
  };
  return node;
}

function some(p: Parser): Expr | undefined {
  const start = p.pos();
  if (p.match('some')) return unaryNode(p, 'some', start, expr(p), v => !isEmpty(v), false);
}

/** `value : Type` (or `: Type!` to reject null): passes the value through or throws. */
function typeCheckPostfix(p: Parser, root: Expr): Expr | undefined {
  if (!p.matchOp(':')) return;
  const typeName = p.reqType('IDENTIFIER').value;
  const nullOk = !p.matchOp('!');
  const node: PostfixNode = {
    type: 'typeCheckExpression',
    root,
    suffix: typeName,
    start: root.start,
    end: p.endPos(),
    ev: ctx =>
      then1(root.ev(ctx), value => {
        if (typeCheck(value, typeName, nullOk)) return value;
        throw new Error('Typecheck failed!  Expected: ' + typeName);
      }),
  };
  return node;
}

/** `beep! <expr>`: log the value and pass it through. */
function beep(p: Parser): Expr | undefined {
  const start = p.pos();
  if (!p.match('beep!')) return;
  const root = unary(p);
  const source = p.text(root);
  return unaryNode(p, 'beepExpression', start, root, (value, ctx) => {
    if (triggerEvent(ctx.me, 'hyperscript:beep', { element: ctx.me, expression: root, value })) {
      const typeName = value == null ? 'object (null)' : (get(get(value, 'constructor'), 'name') ?? 'unknown');
      const shown = typeof value === 'string' ? `"${value}"` : shouldAutoIterate(value) ? Array.from(value) : value;
      console.log(`///_ BEEP! The expression (${source}) evaluates to:`, shown, 'of type ' + typeName);
    }
    return value;
  }, false);
}

export function expressionsExtra(g: Grammar): void {
  g.leaves.push(closest, some, blockLiteral);
  g.unaries.push(beep, relative, positional);
  g.postfixes.push(typeCheckPostfix);
  g.collections.push(collectionOp);
}
