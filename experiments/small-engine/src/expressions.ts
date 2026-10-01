/**
 * The expression grammar: precedence chain, literals, references and accesses.
 *
 * The chain and every rule's parse decisions follow upstream _hyperscript
 * (`core/kernel.js`, `parsetree/expressions/*`): logical → comparison → math →
 * collection → unary → postfix → primary (leaf, then indirect accesses).
 * Less common kinds (positional, `closest`, collection operators, type checks)
 * are separate modules that register themselves in the `Grammar`.
 */
import type {
  ArrayNode,
  AsNode,
  AttributeAccessNode,
  AttributeRefNode,
  BinaryNode,
  CallNode,
  ClassRefNode,
  ComparisonNode,
  Ctx,
  Expr,
  IdRefNode,
  ImplicitMeNode,
  IndexNode,
  InNode,
  LiteralNode,
  NamedArgsNode,
  ObjectNode,
  OfNode,
  ParenNode,
  PossessiveNode,
  PostfixNode,
  PropertyAccessNode,
  QueryRefNode,
  Scope,
  StringNode,
  StyleLiteralNode,
  StyleRefNode,
  SymbolNode,
  UnaryNode,
} from './ast';
import type { Parser } from './parser';
import {
  ElementCollection,
  convert,
  doesExist,
  getRootNode,
  implicitLoop,
  isEmpty,
  nullCheck,
  replaceInDom,
  resolveAttribute,
  resolveComputedStyle,
  resolveProperty,
  resolveStyle,
  resolveSymbol,
  setAttribute,
  setProperty,
  setStyle,
  setSymbol,
  typeCheck,
} from './runtime';
import { tokenize, type Token } from './tokenizer';
import { all, fn, get, isEl, num, obj, then1 } from './util';

// ---------------------------------------------------------------------------
// Precedence chain
// ---------------------------------------------------------------------------

export function expr(p: Parser): Expr {
  p.match('the');
  return logical(p);
}

function logical(p: Parser): Expr {
  let left = comparison(p);
  let first: string | undefined;
  const next = () => p.match('and') ?? p.match('or');
  for (let t = next(); t; t = next()) {
    first ??= t.value;
    if (first !== t.value)
      p.err('You must parenthesize logical operations with different operators');
    left = logicalNode(t.value, left, comparison(p));
  }
  return left;
}

function logicalNode(operator: string, left: Expr, right: Expr): BinaryNode {
  const or = operator === 'or';
  return {
    type: 'logicalOperator',
    operator,
    left,
    right,
    start: left.start,
    end: right.end,
    // Short-circuits, and stays synchronous unless an operand is a promise.
    ev: ctx => then1(left.ev(ctx), l => (!!l === or ? l : right.ev(ctx))),
  };
}

const MATH: Record<string, (a: unknown, b: unknown) => unknown> = {
  '+': (a, b) => (Array.isArray(a) ? a.concat(b) : num(a) + num(b)),
  '-': (a, b) => num(a) - num(b),
  '*': (a, b) => num(a) * num(b),
  '/': (a, b) => num(a) / num(b),
  mod: (a, b) => num(a) % num(b),
};

function math(p: Parser): Expr {
  let left = collection(p);
  let first: string | undefined;
  const next = () => p.matchAnyOp('+', '-', '*', '/') ?? p.match('mod');
  for (let t = next(); t; t = next()) {
    first ??= t.value;
    if (first !== t.value) p.err('You must parenthesize math operations with different operators');
    const l = left;
    const r = collection(p);
    const op = MATH[t.value];
    const node: BinaryNode = {
      type: 'mathOperator',
      operator: t.value,
      left: l,
      right: r,
      start: l.start,
      end: r.end,
      ev: ctx => all([l.ev(ctx), r.ev(ctx)], ([a, b]) => op(a, b)),
    };
    left = node;
  }
  return left;
}

/** `where`, `sorted by`, … bind looser than `.prop` and `in`, tighter than math. */
function collection(p: Parser): Expr {
  let root = unary(p);
  for (let changed = true; changed;) {
    changed = false;
    for (const rule of p.g.collections) {
      const next = rule(p, root);
      if (next) {
        root = next;
        changed = true;
        break;
      }
    }
  }
  return root;
}

export function unary(p: Parser): Expr {
  p.match('the');
  const start = p.pos();
  if (p.match('not')) return unaryNode(p, 'logicalNot', start, unary(p), v => !v);
  if (p.match('no')) return unaryNode(p, 'noExpression', start, collection(p), isEmpty);
  for (const rule of p.g.unaries) {
    const node = rule(p);
    if (node) return indirect(p, node);
  }
  return postfix(p);
}

export function unaryNode(
  p: Parser,
  type: UnaryNode['type'],
  start: number,
  root: Expr,
  f: (v: unknown, ctx: Ctx) => unknown,
  chain = type !== 'negativeNumber'
): Expr {
  const node: UnaryNode = {
    type,
    root,
    start,
    end: p.endPos(),
    ev: ctx => then1(root.ev(ctx), v => f(v, ctx)),
  };
  // `not`, `no`, … are prefix forms: an access after them applies to the result.
  return chain ? indirect(p, node) : node;
}

/** CSS units; `in` is left out because it is a hyperscript keyword. */
const UNITS = 'em ex cap ch ic rem lh rlh vw vh vi vb vmin vmax cm mm Q pc pt px'.split(' ');

function postfix(p: Parser): Expr {
  const root = negative(p);
  const unit = p.matchAny(...UNITS) ?? p.matchOp('%');
  if (unit) return postfixNode(p, 'stringPostfixExpression', root, unit.value);
  const factor = p.matchAny('s', 'seconds') ? 1000 : p.matchAny('ms', 'milliseconds') ? 1 : 0;
  if (factor) return postfixNode(p, 'timeExpression', root, factor);
  for (const rule of p.g.postfixes) {
    const node = rule(p, root);
    if (node) return node;
  }
  return root;
}

function postfixNode(
  p: Parser,
  type: PostfixNode['type'],
  root: Expr,
  suffix: number | string
): PostfixNode {
  const apply = (v: unknown) => (typeof suffix === 'number' ? num(v) * suffix : `${v}${suffix}`);
  const node: PostfixNode = {
    type,
    root,
    suffix,
    start: root.start,
    end: p.endPos(),
    ev: ctx => then1(root.ev(ctx), apply),
  };
  if (root.stat) node.stat = () => apply(evalStatic(root));
  return node;
}

function negative(p: Parser): Expr {
  const start = p.pos();
  if (p.matchOp('-')) return unaryNode(p, 'negativeNumber', start, negative(p), v => -num(v));
  return primary(p);
}

export function primary(p: Parser): Expr {
  const node = leaf(p);
  if (node) return indirect(p, node);
  return p.err('Unexpected value: ' + p.cur().value);
}

/** A target that can be written to: `set <this> to …`. */
export function assignable(p: Parser): Expr {
  p.match('the');
  const node = primary(p);
  const inner = unwrap(node);
  if (!inner.put) {
    p.err(`A target expression must be writable.  The expression type '${inner.type}' is not.`);
  }
  return inner;
}

/** Strip parentheses: `(x)` writes to `x`. */
export function unwrap(node: Expr): Expr {
  let inner = node;
  while (inner.type === 'parenthesized' && 'expr' in inner && isExpr(inner.expr))
    inner = inner.expr;
  return inner;
}

const isExpr = (v: unknown): v is Expr => fn(get(v, 'ev'));

/** The value of an expression that needs no context: a literal, `200ms`, an event name. */
export function evalStatic(node: Expr): unknown {
  if (node.stat) return node.stat();
  throw new Error('This expression cannot be evaluated statically: ' + node.type);
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

function comparisonOperator(
  p: Parser
): { operator: string; right: boolean; isType: boolean } | undefined {
  const symbol = p.matchAnyOp('<', '>', '<=', '>=', '==', '===', '!=', '!==');
  if (symbol) return { operator: symbol.value, right: true, isType: false };
  const is = (operator: string, right = true, isType = false) => ({ operator, right, isType });
  const equalTo = () => p.match('equal') && p.match('to');
  const orEqual = (strict: string, loose: string) => {
    p.req('than');
    if (!p.match('or')) return is(strict);
    p.req('equal');
    p.req('to');
    return is(loose);
  };
  if (p.match('is') || p.match('am')) {
    const not = !!p.match('not');
    const prefix = not ? 'not ' : '';
    if (p.match('in')) return is(prefix + 'in');
    if (p.match('a') || p.match('an')) return is(prefix + 'a', false, true);
    if (p.match('empty')) return is(prefix + 'empty', false);
    if (p.match('between')) return is(prefix + 'between');
    if (!not && p.match('less')) return orEqual('<', '<=');
    if (!not && p.match('greater')) return orEqual('>', '>=');
    if (p.match('really')) {
      equalTo();
      return is(not ? '!==' : '===');
    }
    if (p.match('equal')) {
      p.match('to');
      return is(not ? '!=' : '==');
    }
    return is(not ? 'is not' : 'is');
  }
  if (p.match('equals')) return is('==');
  if (p.match('really')) {
    p.req('equals');
    return is('===');
  }
  if (p.matchAny('exist', 'exists')) return is('exist', false);
  const not = !!p.matchAny('do', 'does');
  if (not) p.req('not');
  const prefix = not ? 'not ' : '';
  // After `does not` only the bare verb is accepted, as upstream.
  const verb = (bare: string, third: string) =>
    p.match(bare) ?? (not && bare !== 'match' && bare !== 'contain' ? undefined : p.match(third));
  if (verb('match', 'matches')) return is(prefix + 'match');
  if (verb('contain', 'contains')) return is(prefix + 'contain');
  if (not && p.match('exist')) return is('not exist', false);
  if (verb('include', 'includes')) return is(prefix + 'include');
  if (p.match(not ? 'start' : 'starts')) {
    p.req('with');
    return is(prefix + 'start with');
  }
  if (p.match(not ? 'end' : 'ends')) {
    p.req('with');
    return is(prefix + 'end with');
  }
  if (verb('precede', 'precedes')) return is(prefix + 'precede');
  if (verb('follow', 'follows')) return is(prefix + 'follow');
  if (not) p.expected('matches', 'contains', 'starts with', 'ends with', 'precede', 'follow');
}

function comparison(p: Parser): Expr {
  const left = math(p);
  const op = comparisonOperator(p);
  if (!op) return left;
  const { operator } = op;
  let typeName: string | undefined;
  let nullOk = true;
  let right: Expr | undefined;
  let css: string | undefined;
  if (op.isType) {
    typeName = p.reqType('IDENTIFIER').value;
    nullOk = !p.matchOp('!');
  } else if (op.right) {
    right = math(p);
    // `matches .foo` tests against the selector text, not the elements it finds.
    if (operator.endsWith('match')) css = right.css;
  }
  let right2: Expr | undefined;
  if (operator.endsWith('between')) {
    p.req('and');
    right2 = math(p);
  }
  let ignoringCase = false;
  if (p.match('ignoring')) {
    p.req('case');
    ignoringCase = true;
  }
  const lower = (v: unknown) => (ignoringCase && typeof v === 'string' ? v.toLowerCase() : v);
  // `x is checked`: an unbound bare word on the right reads as a property of the left.
  const flag =
    right?.type === 'symbol' &&
    'scope' in right &&
    right.scope === 'local' &&
    right.name !== 'undefined' &&
    right.name !== 'null'
      ? right.name
      : undefined;
  const node: ComparisonNode = {
    type: 'comparisonOperator',
    operator,
    left,
    right,
    right2,
    typeName,
    ignoringCase,
    start: left.start,
    end: p.endPos(),
    ev: ctx =>
      all([left.ev(ctx), css ?? right?.ev(ctx), right2?.ev(ctx)], ([l, r, r2]) => {
        if (typeName) {
          const ok = typeCheck(l, typeName, nullOk);
          return operator === 'a' ? ok : !ok;
        }
        if (flag && r === undefined && (operator === 'is' || operator === 'is not')) {
          const set = !!resolveProperty(l, flag);
          return operator === 'is' ? set : !set;
        }
        return compare(operator, lower(l), lower(r), r2);
      }),
  };
  return node;
}

function contains(container: unknown, value: unknown): boolean {
  const method = get(container, 'contains') ?? get(container, 'includes');
  if (!fn(method)) throw new Error('The value does not have a contains or includes method on it');
  return !!Reflect.apply(method, container, [value]);
}

function matches(target: unknown, pattern: unknown): boolean {
  const method = get(target, 'match') ?? get(target, 'matches');
  if (!fn(method)) throw new Error('The value does not have a match or matches method on it');
  return !!Reflect.apply(method, target, [pattern]);
}

const position = (a: unknown, b: unknown, bit: number): boolean =>
  a instanceof Node && b instanceof Node && (a.compareDocumentPosition(b) & bit) !== 0;

function compare(operator: string, l: unknown, r: unknown, r2: unknown): boolean {
  if (operator === 'not between') return num(l) < num(r) || num(l) > num(r2);
  if (operator.startsWith('not ')) return !compare(operator.slice(4), l, r, r2);
  switch (operator) {
    case 'is':
    case '==':
      return l == r;
    case 'is not':
    case '!=':
      return l != r;
    case '===':
      return l === r;
    case '!==':
      return l !== r;
    case '<':
      return num(l) < num(r);
    case '>':
      return num(l) > num(r);
    case '<=':
      return num(l) <= num(r);
    case '>=':
      return num(l) >= num(r);
    case 'match':
      return l != null && matches(l, r);
    case 'in':
      return r != null && contains(r, l);
    case 'contain':
    case 'include':
      return l != null && contains(l, r);
    case 'start with':
      return l != null && String(l).startsWith(String(r));
    case 'end with':
      return l != null && String(l).endsWith(String(r));
    case 'between':
      return num(l) >= num(r) && num(l) <= num(r2);
    case 'precede':
      return position(l, r, Node.DOCUMENT_POSITION_FOLLOWING);
    case 'follow':
      return position(l, r, Node.DOCUMENT_POSITION_PRECEDING);
    case 'empty':
      return isEmpty(l);
    case 'exist':
      return doesExist(l);
  }
  throw new Error('Unknown comparison : ' + operator);
}

// ---------------------------------------------------------------------------
// Leaves
// ---------------------------------------------------------------------------

export function leaf(p: Parser): Expr | undefined {
  const t = p.cur();
  switch (t.type) {
    case 'NUMBER':
      p.consume();
      return literal('number', parseFloat(t.value), t);
    case 'STRING':
      return string(p);
    case 'ID_REF':
      return idRef(p);
    case 'CLASS_REF':
      return classRef(p);
    case 'ATTRIBUTE_REF':
      return attributeRef(p);
    case 'STYLE_REF':
      return styleRef(p);
  }
  if (t.op) {
    if (t.value === '(') return paren(p);
    if (t.value === '[') return arrayLiteral(p);
    if (t.value === '{') return objectLiteral(p);
    if (t.value === '<') return queryRef(p);
  }
  const bool = p.match('true') ?? p.match('false');
  if (bool) return literal('boolean', bool.value === 'true', bool);
  const nil = p.match('null');
  if (nil) return literal('null', null, nil);
  for (const rule of p.g.leaves) {
    const node = rule(p);
    if (node) return node;
  }
  return symbol(p);
}

function literal(type: LiteralNode['type'], value: LiteralNode['value'], t: Token): LiteralNode {
  return { type, value, start: t.start, end: t.end, ev: () => value, stat: () => value };
}

function paren(p: Parser): ParenNode {
  const start = p.pos();
  p.consume();
  const inner = p.withoutFollows(() => expr(p));
  p.reqOp(')');
  return { type: 'parenthesized', expr: inner, start, end: p.endPos(), ev: ctx => inner.ev(ctx) };
}

/** Evaluate interleaved text and expressions into one string. */
const interpolate = (parts: (string | Expr)[], ctx: Ctx) =>
  all(
    parts.map(part => (typeof part === 'string' ? part : part.ev(ctx))),
    values => values.map(v => (v === undefined ? '' : `${v}`)).join('')
  );

/** The inside of a backtick string or a templated query: text, `$name`, `${expr}`. */
export function templateParts(p: Parser, raw: string): (string | Expr)[] {
  const inner = p.child(tokenize(raw, true), raw);
  const parts: (string | Expr)[] = [];
  let text = '';
  do {
    text += inner.lastWs();
    const t = inner.cur();
    if (t.value === '$') {
      inner.consume();
      const brace = inner.matchOp('{');
      parts.push(text, expr(inner));
      text = '';
      if (brace) inner.reqOp('}');
    } else if (t.value === '\\') {
      inner.consume();
      inner.consume();
    } else if (inner.hasMore()) {
      text += inner.consume().value;
    }
  } while (inner.hasMore());
  parts.push(text + inner.lastWs());
  return parts;
}

function string(p: Parser): StringNode {
  const t = p.consume();
  const value = t.value;
  const node: StringNode = { type: 'string', value, start: t.start, end: t.end, ev: () => value };
  if (t.template) {
    const parts = (node.parts = templateParts(p, value));
    node.ev = ctx => interpolate(parts, ctx);
  } else node.stat = () => value;
  return node;
}

function arrayLiteral(p: Parser): ArrayNode {
  const start = p.pos();
  p.consume();
  const values: Expr[] = [];
  if (!p.matchOp(']')) {
    do values.push(expr(p));
    while (p.matchOp(','));
    p.reqOp(']');
  }
  return {
    type: 'arrayLiteral',
    values,
    start,
    end: p.endPos(),
    ev: ctx =>
      all(
        values.map(v => v.ev(ctx)),
        vals => vals
      ),
  };
}

export function objectLiteral(p: Parser): ObjectNode {
  const start = p.pos();
  p.consume();
  const keys: (string | Expr)[] = [];
  const values: Expr[] = [];
  const atClose = () => p.cur().op && p.cur().value === '}';
  if (!p.matchOp('}')) {
    do {
      const quoted = p.matchType('STRING');
      if (quoted) keys.push(quoted.value);
      else if (p.matchOp('[')) {
        keys.push(expr(p));
        p.reqOp(']');
      } else {
        // An unquoted key may contain dashes: `{data-id: 1}`.
        let key = '';
        for (
          let t = p.matchType('IDENTIFIER') ?? p.matchOp('-');
          t;
          t = p.matchType('IDENTIFIER') ?? p.matchOp('-')
        ) {
          key += t.value;
        }
        keys.push(key);
      }
      p.reqOp(':');
      values.push(expr(p));
    } while (p.matchOp(',') && !atClose());
    p.reqOp('}');
  }
  return {
    type: 'objectLiteral',
    keys,
    values,
    start,
    end: p.endPos(),
    ev: ctx =>
      all(
        [...keys.map(k => (typeof k === 'string' ? k : k.ev(ctx))), ...values.map(v => v.ev(ctx))],
        vals => Object.fromEntries(keys.map((_, i) => [String(vals[i]), vals[keys.length + i]]))
      ),
  };
}

/** `(name: value, …)` after an event name: the event's detail. */
export function namedArgumentList(p: Parser): NamedArgsNode | undefined {
  const start = p.pos();
  if (!p.matchOp('(')) return;
  const names: string[] = [];
  const values: Expr[] = [];
  if (p.cur().type === 'IDENTIFIER') {
    do {
      names.push(p.reqType('IDENTIFIER').value);
      p.reqOp(':');
      values.push(expr(p));
    } while (p.matchOp(','));
  }
  p.reqOp(')');
  return {
    type: 'namedArgumentList',
    names,
    values,
    start,
    end: p.endPos(),
    ev: ctx =>
      all(
        values.map(v => v.ev(ctx)),
        vals =>
          Object.fromEntries<unknown>([
            ['_namedArgList_', true],
            ...names.map((n, i) => [n, vals[i]] as const),
          ])
      ),
  };
}

function symbol(p: Parser): SymbolNode | undefined {
  const start = p.pos();
  let declared: Scope | undefined;
  if (p.match('global')) declared = 'global';
  else if (p.match('element')) {
    declared = 'element';
    if (p.matchOp("'")) p.req('s');
  } else if (p.match('dom')) declared = 'inherited';
  else if (p.match('local')) declared = 'local';

  const colon = p.matchOp(':');
  const caret = !colon && p.matchOp('^');
  const id = p.matchType('IDENTIFIER');
  if (!id?.value) return;
  const name = (colon ? ':' : caret ? '^' : '') + id.value;
  const prefixes: Record<string, Scope> = { $: 'global', ':': 'element', '^': 'inherited' };
  const scope = declared ?? prefixes[name[0]] ?? 'local';
  let on: Expr | undefined;
  if (scope === 'inherited' && p.match('on')) {
    on = p.withFollow(['to', 'into', 'before', 'after', 'then'], () => expr(p));
  }
  return {
    type: 'symbol',
    name,
    scope,
    start,
    end: p.endPos(),
    ev: ctx => resolveSymbol(name, ctx, scope, on?.ev(ctx)),
    lhs: () => undefined,
    put: (ctx, _lhs, value) => setSymbol(name, ctx, scope, value, on?.ev(ctx)),
  };
}

/** `#{expr}` and `.{expr}` hold an expression; this parses the part after the brace. */
const templated = (p: Parser, t: Token) => {
  const raw = t.value.substring(2);
  return expr(p.child(tokenize(raw), raw));
};

function idRef(p: Parser): IdRefNode {
  const t = p.consume();
  const find = (ctx: Ctx, id: unknown) => getRootNode(ctx.me).getElementById(String(id));
  const node: IdRefNode = {
    type: 'idRef',
    start: t.start,
    end: t.end,
    ev: () => null,
    lhs: () => undefined,
    put: (ctx, _lhs, value) => then1(node.ev(ctx), target => target && replaceInDom(target, value)),
  };
  if (t.template) {
    const inner = (node.expr = templated(p, t));
    node.ev = ctx => then1(inner.ev(ctx), id => find(ctx, id));
  } else {
    const id = (node.value = t.value.substring(1));
    node.css = t.value;
    node.ev = ctx => find(ctx, id);
  }
  return node;
}

export function classRef(p: Parser): ClassRefNode | undefined {
  const t = p.matchType('CLASS_REF');
  if (!t) return;
  const node: ClassRefNode = {
    type: 'classRef',
    start: t.start,
    end: t.end,
    ev: () => null,
    lhs: () => undefined,
    put: (ctx, _lhs, value) =>
      then1(node.ev(ctx), c =>
        replaceInDom(Array.from(c instanceof ElementCollection ? c : []), value)
      ),
  };
  if (t.template) {
    const inner = (node.expr = templated(p, t));
    node.ev = ctx => then1(inner.ev(ctx), name => new ElementCollection('.' + name, ctx.me, true));
  } else {
    const css = (node.css = t.value);
    node.className = css.slice(1);
    node.ev = ctx => new ElementCollection(css, ctx.me, true);
  }
  return node;
}

/** A query whose text has interpolated elements: each is matched through a temporary attribute. */
class TemplatedQuery extends ElementCollection {
  constructor(
    relativeTo: unknown,
    private readonly parts: unknown[]
  ) {
    super('', relativeTo);
  }

  override get css(): string {
    let i = 0;
    return this.parts
      .map(part => (isEl(part) ? `[data-hs-query-id='${i++}']` : `${part ?? ''}`))
      .join('');
  }

  override select(): NodeListOf<Element> {
    const elements = this.parts.filter(isEl);
    elements.forEach((e, i) => e.setAttribute('data-hs-query-id', String(i)));
    const found = super.select();
    elements.forEach(e => e.removeAttribute('data-hs-query-id'));
    return found;
  }
}

function queryRef(p: Parser): QueryRefNode {
  const start = p.pos();
  p.consume();
  const css = p
    .consumeUntil('/')
    .map(t => (t.type === 'STRING' ? `"${t.value}"` : t.value))
    .join('');
  p.reqOp('/');
  p.reqOp('>');
  const node: QueryRefNode = {
    type: 'queryRef',
    css,
    start,
    end: p.endPos(),
    ev: ctx => new ElementCollection(css, ctx.me),
    lhs: () => undefined,
    put: (ctx, _lhs, value) =>
      then1(node.ev(ctx), c =>
        replaceInDom(Array.from(c instanceof ElementCollection ? c : []), value)
      ),
  };
  // `$=` is the attribute ends-with operator, not an interpolation.
  if (/\$[^=]/.test(css)) {
    const parts = (node.parts = templateParts(p, css));
    node.ev = ctx =>
      all(
        parts.map(part => (typeof part === 'string' ? part : part.ev(ctx))),
        values => new TemplatedQuery(ctx.me, values)
      );
  }
  return node;
}

export function attributeRef(p: Parser): AttributeRefNode | undefined {
  const t = p.matchType('ATTRIBUTE_REF');
  if (!t) return;
  const inner = t.value.startsWith('[') ? t.value.slice(2, -1) : t.value.slice(1);
  const [name, quoted] = inner.split('=');
  const value = quoted && /^["']/.test(quoted) ? quoted.slice(1, -1) : quoted;
  return {
    type: 'attributeRef',
    name,
    value,
    css: `[${inner}]`,
    start: t.start,
    end: t.end,
    ev: ctx => resolveAttribute(ctx.you || ctx.me, name),
    lhs: () => undefined,
    put: (ctx, _lhs, v) => setAttribute(ctx.you || ctx.me, name, v),
  };
}

export function styleRef(p: Parser): StyleRefNode | undefined {
  const t = p.matchType('STYLE_REF');
  if (!t) return;
  const computed = t.value.startsWith('*computed-');
  const name = t.value.slice(computed ? 10 : 1);
  return {
    type: computed ? 'computedStyleRef' : 'styleRef',
    name,
    start: t.start,
    end: t.end,
    ev: ctx => (computed ? resolveComputedStyle : resolveStyle)(ctx.you || ctx.me, name),
    lhs: () => undefined,
    put: (ctx, _lhs, v) => setStyle(ctx.you || ctx.me, name, v),
  };
}

/** `{ color: red; width: ${w}px }` — CSS text for `add` / `remove`. */
export function styleLiteral(p: Parser): StyleLiteralNode | undefined {
  const start = p.pos();
  if (!p.matchOp('{')) return;
  const parts = [''];
  const exprs: Expr[] = [];
  while (p.hasMore()) {
    if (p.matchOp('\\')) p.consume();
    else if (p.matchOp('}')) break;
    else if (p.match('$')) {
      const brace = p.matchOp('{');
      exprs.push(expr(p));
      if (brace) p.reqOp('}');
      parts.push('');
    } else parts[parts.length - 1] += p.text(p.consume());
    parts[parts.length - 1] += p.lastWs();
  }
  return {
    type: 'styleLiteral',
    parts,
    exprs,
    start,
    end: p.endPos(),
    ev: ctx =>
      all(
        exprs.map(e => e.ev(ctx)),
        vals => parts.map((part, i) => part + (i in vals ? `${vals[i]}` : '')).join('')
      ),
  };
}

/** The target when a command names none: `you` inside `tell`, otherwise `me`. */
export function implicitMe(p: Parser): ImplicitMeNode {
  const at = p.endPos();
  return { type: 'implicitMeTarget', start: at, end: at, ev: ctx => ctx.you || ctx.me };
}

/** `a.b.c` or `a:b:c` as plain text: event names and conversion names. */
export function dotOrColonPath(p: Parser): string | undefined {
  const root = p.matchType('IDENTIFIER');
  if (!root) return;
  const path = [root.value];
  const separator = p.matchOp('.') ?? p.matchOp(':');
  if (separator) {
    do path.push(p.reqType('IDENTIFIER', 'NUMBER').value);
    while (p.matchOp(separator.value));
  }
  return path.join(separator?.value ?? '');
}

export function eventName(p: Parser, message = 'Expected event name'): string {
  return p.matchType('STRING')?.value ?? dotOrColonPath(p) ?? p.err(message);
}

// ---------------------------------------------------------------------------
// Indirect accesses: what may follow a value
// ---------------------------------------------------------------------------

export function indirect(p: Parser, root: Expr): Expr {
  return (
    propertyAccess(p, root) ??
    ofExpression(p, root) ??
    possessive(p, root) ??
    inExpression(p, root) ??
    asExpression(p, root) ??
    functionCall(p, root) ??
    attributeAccess(p, root) ??
    arrayIndex(p, root) ??
    extraIndirect(p, root) ??
    root
  );
}

function extraIndirect(p: Parser, root: Expr): Expr | undefined {
  for (const rule of p.g.indirects) {
    const node = rule(p, root);
    if (node) return node;
  }
}

function propertyAccess(p: Parser, root: Expr): Expr | undefined {
  if (!p.matchOp('.')) return;
  const prop = p.reqType('IDENTIFIER').value;
  const rootText = p.text(root);
  // `root` is read from the node at run time: an `of` after this access re-roots it.
  const node: PropertyAccessNode = {
    type: 'propertyAccess',
    root,
    prop,
    start: root.start,
    end: p.endPos(),
    ev: ctx => then1(node.root.ev(ctx), r => resolveProperty(r, prop)),
    lhs: ctx => node.root.ev(ctx),
    put: (_ctx, lhs, value) => {
      nullCheck(lhs, rootText);
      setProperty(lhs, prop, value);
    },
    del: (_ctx, lhs) => {
      nullCheck(lhs, rootText);
      implicitLoop(lhs, o => obj(o) && delete o[prop]);
    },
  };
  return indirect(p, node);
}

/** `<name> of <owner>`: the reversed access. The left side's innermost value becomes a read of the owner. */
function ofExpression(p: Parser, root: Expr): Expr | undefined {
  if (!p.match('of')) return;
  const owner = unary(p);
  let child: Expr | undefined;
  let innermost = root;
  while (innermost.root) {
    child = innermost;
    innermost = innermost.root;
  }
  const kinds: Record<string, OfNode['kind']> = {
    symbol: 'property',
    attributeRef: 'attribute',
    styleRef: 'style',
    computedStyleRef: 'computed',
  };
  const kind = kinds[innermost.type];
  const name = innermost.name;
  if (!kind || name === undefined)
    return p.err('Cannot take a property of a non-symbol: ' + innermost.type);
  const ownerText = p.text(owner);
  const read = {
    property: resolveProperty,
    attribute: resolveAttribute,
    style: resolveStyle,
    computed: resolveComputedStyle,
  }[kind];
  const node: OfNode = {
    type: 'ofExpression',
    root: owner,
    name,
    kind,
    start: root.start,
    end: p.endPos(),
    ev: ctx => then1(node.root.ev(ctx), r => read(r, name)),
    lhs: ctx => node.root.ev(ctx),
    put: (_ctx, lhs, value) => {
      nullCheck(lhs, ownerText);
      if (kind === 'attribute') setAttribute(lhs, name, value);
      else if (kind === 'property') setProperty(lhs, name, value);
      else setStyle(lhs, name, value);
    },
    del: (_ctx, lhs) => {
      nullCheck(lhs, ownerText);
      implicitLoop(lhs, o => {
        if (kind === 'attribute') isEl(o) && o.removeAttribute(name);
        else if (kind === 'property') obj(o) && delete o[name];
        else if (o instanceof HTMLElement) o.style.removeProperty(name);
      });
    },
  };
  if (child) {
    child.root = node;
    return indirect(p, root);
  }
  return indirect(p, node);
}

function possessive(p: Parser, root: Expr): Expr | undefined {
  const apostrophe = p.matchOp("'");
  const pronoun =
    root.type === 'symbol' &&
    ['my', 'its', 'your'].includes(root.name ?? '') &&
    ['IDENTIFIER', 'ATTRIBUTE_REF', 'STYLE_REF'].includes(p.cur().type);
  if (!apostrophe && !pronoun) return;
  if (apostrophe) p.req('s');
  const attribute = attributeRef(p) ?? styleRef(p);
  const prop = attribute ? undefined : p.reqType('IDENTIFIER').value;
  const rootText = p.text(root);
  const read = (r: unknown) => {
    if (prop !== undefined) return resolveProperty(r, prop);
    if (attribute?.type === 'attributeRef') return resolveAttribute(r, attribute.name);
    if (attribute?.type === 'computedStyleRef') return resolveComputedStyle(r, attribute.name);
    return attribute && resolveStyle(r, attribute.name);
  };
  const node: PossessiveNode = {
    type: 'possessive',
    root,
    prop,
    attribute,
    start: root.start,
    end: p.endPos(),
    ev: ctx => then1(node.root.ev(ctx), read),
    lhs: ctx => node.root.ev(ctx),
    put: (_ctx, lhs, value) => {
      nullCheck(lhs, rootText);
      if (prop !== undefined) setProperty(lhs, prop, value);
      else if (attribute?.type === 'attributeRef') setAttribute(lhs, attribute.name, value);
      else if (attribute) setStyle(lhs, attribute.name, value);
    },
  };
  return indirect(p, node);
}

/** `<x> in <container>`: a selector is queried inside it; elements are kept if they are inside it. */
function inExpression(p: Parser, root: Expr): Expr | undefined {
  if (!p.match('in')) return;
  const target = unary(p);
  const find = (r: unknown, within: unknown): unknown => {
    if (r == null) return [];
    const found: unknown[] = [];
    const css = get(r, 'css');
    if (typeof css === 'string') {
      implicitLoop(within, t => isEl(t) && found.push(...t.querySelectorAll(css)));
    } else if (isEl(r)) {
      let inside = false;
      implicitLoop(within, t => {
        if (t instanceof Node && t.contains(r)) inside = true;
      });
      if (inside) return r;
    } else {
      implicitLoop(r, a => implicitLoop(within, b => a === b && found.push(a)));
    }
    return found;
  };
  const node: InNode = {
    type: 'inExpression',
    root,
    target,
    start: root.start,
    end: p.endPos(),
    ev: ctx => all([node.root.ev(ctx), target.ev(ctx)], ([r, t]) => find(r, t)),
    lhs: ctx => node.ev(ctx),
    put: (_ctx, lhs, value) => replaceInDom(lhs, value),
  };
  return indirect(p, node);
}

function asExpression(p: Parser, root: Expr): Expr | undefined {
  if (!p.match('as')) return;
  if (!p.match('a')) p.match('an');
  const make = (inner: Expr): AsNode => {
    const conversion = dotOrColonPath(p) ?? p.err('Expected dotOrColonPath');
    const node: AsNode = {
      type: 'asExpression',
      root: inner,
      conversion,
      start: inner.start,
      end: p.endPos(),
      ev: ctx => then1(node.root.ev(ctx), v => convert(v, conversion)),
    };
    return node;
  };
  let node = make(root);
  while (p.matchOp('|')) node = make(node);
  return indirect(p, node);
}

function functionCall(p: Parser, root: Expr): Expr | undefined {
  if (!p.matchOp('(')) return;
  const args: Expr[] = [];
  if (!p.matchOp(')')) {
    do args.push(expr(p));
    while (p.matchOp(','));
    p.reqOp(')');
  }
  const rootText = p.text(root);
  const ownerText = root.root ? p.text(root.root) : '';
  const node: CallNode = {
    type: 'functionCall',
    root,
    args,
    start: root.start,
    end: p.endPos(),
    ev: ctx => {
      // `a.b(…)` calls `b` with `a` as its receiver; anything else is a plain call.
      const callee = node.root;
      const method = callee.prop;
      const owner = method === undefined ? undefined : callee.root;
      return all(
        [(owner ?? callee).ev(ctx), ...args.map(a => a.ev(ctx))],
        ([target, ...values]) => {
          if (!owner || method === undefined) return call(target, undefined, values, ctx, rootText);
          nullCheck(target, ownerText);
          return call(get(target, method), target, values, ctx, rootText);
        }
      );
    },
  };
  return indirect(p, node);
}

/** Call a function value; a hyperscript-defined function also receives the calling context. */
export function call(
  f: unknown,
  receiver: unknown,
  args: unknown[],
  ctx: Ctx,
  source: string
): unknown {
  if (!fn(f)) {
    nullCheck(f, source);
    throw new Error(`'${source}' is not a function`);
  }
  if (get(f, 'hyperfunc')) args.push(ctx);
  return Reflect.apply(f, receiver, args);
}

function attributeAccess(p: Parser, root: Expr): Expr | undefined {
  const attribute = attributeRef(p);
  return attribute && attributeAccessNode(p, root, attribute);
}

/** `<root>@attr`: an attribute of the root's value. */
export function attributeAccessNode(
  p: Parser,
  root: Expr,
  attribute: AttributeRefNode
): AttributeAccessNode {
  const rootText = p.text(root);
  const node: AttributeAccessNode = {
    type: 'attributeRefAccess',
    root,
    attribute,
    start: root.start,
    end: p.endPos(),
    ev: ctx => then1(node.root.ev(ctx), r => resolveAttribute(r, attribute.name)),
    lhs: ctx => node.root.ev(ctx),
    put: (_ctx, lhs, value) => {
      nullCheck(lhs, rootText);
      setAttribute(lhs, attribute.name, value);
    },
  };
  return node;
}

/** `a[i]`, and the inclusive slices `a[i..j]`, `a[..j]`, `a[i..]`. */
function arrayIndex(p: Parser, root: Expr): Expr | undefined {
  if (!p.matchOp('[')) return;
  const andBefore = !!p.matchOp('..');
  const first = expr(p);
  let andAfter = false;
  let second: Expr | undefined;
  if (!andBefore && p.matchOp('..')) {
    andAfter = true;
    if (!(p.cur().op && p.cur().value === ']')) second = expr(p);
  }
  p.reqOp(']');
  const rootText = p.text(root);
  const fromEnd = (list: unknown, i: unknown) =>
    num(i) < 0 ? num(get(list, 'length')) + num(i) : num(i);
  const slice = (list: unknown, from: number, to?: number) => {
    const method = get(list, 'slice');
    return fn(method) ? Reflect.apply(method, list, [from, to]) : undefined;
  };
  const node: IndexNode = {
    type: 'arrayIndex',
    root,
    first,
    second,
    andBefore,
    andAfter,
    start: root.start,
    end: p.endPos(),
    ev: ctx =>
      all([node.root.ev(ctx), first.ev(ctx), second?.ev(ctx)], ([list, i, j]) => {
        if (list == null) return null;
        if (andBefore) return slice(list, 0, fromEnd(list, i) + 1);
        if (andAfter)
          return j == null ? slice(list, num(i)) : slice(list, num(i), fromEnd(list, j) + 1);
        return get(list, String(i));
      }),
    lhs: ctx => all([node.root.ev(ctx), first.ev(ctx)], pair => pair),
    put: (_ctx, lhs, value) => {
      const [list, i] = Array.isArray(lhs) ? lhs : [];
      nullCheck(list, rootText);
      if (obj(list)) list[String(i)] = value;
    },
    del: (_ctx, lhs) => {
      if (andBefore || andAfter) throw new Error('Cannot remove a slice - use a single index');
      const [list, i] = Array.isArray(lhs) ? lhs : [];
      nullCheck(list, rootText);
      if (Array.isArray(list)) list.splice(fromEnd(list, i), 1);
      else if (obj(list)) delete list[String(i)];
    },
  };
  return indirect(p, node);
}
