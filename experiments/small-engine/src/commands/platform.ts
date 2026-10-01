/**
 * `fetch`, `go`, `scroll`. Follows upstream `parsetree/commands/basic.js`.
 */
import type { Cmd, Ctx, Expr } from '../ast';
import {
  dotOrColonPath,
  expr,
  nakedNamedArguments,
  objectLiteral,
  stringLike,
  unary,
  urlOrExpression,
} from '../expressions';
import type { Grammar, Parser } from '../parser';
import { config, conversions, convert, implicitLoop, toFragment, triggerEvent } from '../runtime';
import { all, get, isEl, num, obj, then1 } from '../util';

// ---------------------------------------------------------------------------
// fetch
// ---------------------------------------------------------------------------

export interface FetchNode extends Cmd {
  type: 'fetchCommand';
  url: Expr;
  options?: Expr;
  /** How the response becomes the result: text (default), json, html, the response itself, or a named conversion. */
  as: string;
  dontThrow: boolean;
}

const RESPONSE_TYPES: Record<string, string> = {
  json: 'json',
  JSON: 'json',
  Object: 'json',
  response: 'response',
  Response: 'response',
  html: 'html',
  HTML: 'html',
  text: 'text',
  Text: 'text',
  String: 'text',
};

/** `fetch <url> [as <type>] [with <options>] [as <type>] [do not throw]`. */
export function fetchCommand(g: Grammar): void {
  g.commands.fetch = (p, _keyword, start) => {
    const url = urlOrExpression(p);
    const conversion = () => {
      if (!p.match('as')) return;
      if (!p.match('a')) p.match('an');
      const name = dotOrColonPath(p) ?? p.err('Expected dotOrColonPath');
      return RESPONSE_TYPES[name] ?? ':' + name;
    };
    let as = conversion();
    let options: Expr | undefined;
    if (p.match('with') && p.cur().value !== '{') options = nakedNamedArguments(p);
    else if (p.cur().op && p.cur().value === '{') options = objectLiteral(p);
    as ??= conversion() ?? 'text';

    let dontThrow = false;
    if (p.match('do')) {
      p.req('not');
      p.req('throw');
      dontThrow = true;
    } else if (
      p.cur().value === 'don' &&
      p.tok(1, true).value === "'" &&
      p.tok(2, true).value === 't'
    ) {
      // `don't`, which the tokenizer reads as three tokens.
      p.consume();
      p.consume();
      p.consume();
      p.req('throw');
      dontThrow = true;
    }
    const kind = as;

    const node: FetchNode = {
      type: 'fetchCommand',
      url,
      options,
      as: kind,
      dontThrow,
      start,
      end: p.endPos(),
      run: ctx =>
        all([url.ev(ctx), options?.ev(ctx)], ([address, given]) => {
          const me = ctx.me;
          const detail: Record<string, unknown> = obj(given) ? given : {};
          detail.headers ||= {};
          const controller = new AbortController();
          const abort = () => controller.abort();
          if (me instanceof EventTarget) me.addEventListener('fetch:abort', abort, { once: true });
          detail.signal = controller.signal;
          triggerEvent(me, 'hyperscript:beforeFetch', detail, me);
          triggerEvent(me, 'fetch:beforeRequest', detail, me);
          let finished = false;
          if (detail.timeout) setTimeout(() => finished || abort(), num(detail.timeout));

          const complete = (result: unknown) => {
            ctx.result = result;
            triggerEvent(me, 'fetch:afterRequest', { result });
            finished = true;
          };
          const pending: unknown = Reflect.apply(fetch, globalThis, [address, detail]);
          return Promise.resolve(pending)
            .then(received => {
              // A listener may replace the response.
              const holder = { response: received };
              triggerEvent(me, 'fetch:afterResponse', holder);
              const response = holder.response;
              if (!(response instanceof Response))
                throw new Error('fetch did not return a Response');
              if (
                !dontThrow &&
                kind !== 'response' &&
                config.fetchThrowsOn.some(re => re.test(String(response.status)))
              ) {
                throw Object.assign(
                  new Error(`fetch failed: ${response.status} ${response.statusText} (${address})`),
                  {
                    response,
                    status: response.status,
                  }
                );
              }
              if (kind === 'response') return complete(response);
              if (kind === 'json') return response.json().then(complete);
              const name = kind.startsWith(':') ? kind.slice(1) : undefined;
              const custom = name ? conversions[name] : undefined;
              // A conversion marked `_rawResponse` reads the response itself (a stream, say).
              if (custom && get(custom, '_rawResponse')) return complete(custom(response));
              return response
                .text()
                .then(text =>
                  complete(kind === 'html' ? toFragment(text) : name ? convert(text, name) : text)
                );
            })
            .catch(reason => {
              triggerEvent(me, 'fetch:error', { reason });
              throw reason;
            })
            .finally(
              () => me instanceof EventTarget && me.removeEventListener('fetch:abort', abort)
            );
        }),
    };
    return node;
  };
}

// ---------------------------------------------------------------------------
// Scrolling, shared by `scroll to …` and `go to the top of …`
// ---------------------------------------------------------------------------

interface ScrollSpec {
  target: Expr;
  offset?: Expr;
  /** +1 or -1 when an offset follows the target. */
  sign: number;
  options: ScrollIntoViewOptions;
  container?: Expr;
}

const BLOCK: Record<string, ScrollLogicalPosition> = {
  top: 'start',
  middle: 'center',
  bottom: 'end',
};
const INLINE: Record<string, ScrollLogicalPosition> = {
  left: 'start',
  center: 'center',
  right: 'end',
};

const smoothness = (p: Parser): ScrollBehavior | undefined => {
  const word = p.matchAny('smoothly', 'instantly');
  return word ? (word.value === 'smoothly' ? 'smooth' : 'instant') : undefined;
};

/** `[the] [top|middle|bottom] [left|center|right] [of] <target> [+|- <n> [px]] [in <container>] [smoothly|instantly]`. */
function scrollSpec(p: Parser): ScrollSpec {
  p.match('the');
  const vertical = p.matchAny('top', 'middle', 'bottom');
  const horizontal = p.matchAny('left', 'center', 'right');
  if (vertical || horizontal) p.req('of');
  const target = unary(p);
  const plusOrMinus = p.matchAnyOp('+', '-');
  const offset = plusOrMinus ? p.withFollow(['px'], () => expr(p)) : undefined;
  p.match('px');
  const container = p.match('in') ? unary(p) : undefined;
  const options: ScrollIntoViewOptions = {
    block: vertical ? BLOCK[vertical.value] : 'start',
    inline: horizontal ? INLINE[horizontal.value] : 'nearest',
  };
  const behavior = smoothness(p);
  if (behavior) options.behavior = behavior;
  return {
    target,
    offset,
    sign: plusOrMinus?.value === '-' ? -1 : plusOrMinus ? 1 : 0,
    options,
    container,
  };
}

function scrollTo(spec: ScrollSpec, ctx: Ctx) {
  return all(
    [spec.target.ev(ctx), spec.offset?.ev(ctx), spec.container?.ev(ctx)],
    ([to, offset, container]) => {
      const shift = spec.sign * num(offset ?? 0);
      implicitLoop(to, item => {
        const target = item === window ? document.body : item;
        if (!(target instanceof HTMLElement)) return;
        if (container instanceof HTMLElement) {
          container.scrollTo({
            top: target.offsetTop - container.offsetTop + shift,
            left: target.offsetLeft - container.offsetLeft,
            behavior: spec.options.behavior ?? 'auto',
          });
        } else
          (spec.sign ? standIn(target, shift, spec.options) : target).scrollIntoView(spec.options);
      });
    }
  );
}

/** An invisible element placed at an offset from `target`, to scroll to instead of it. */
function standIn(target: HTMLElement, shift: number, options: ScrollIntoViewOptions): HTMLElement {
  const rect = target.getBoundingClientRect();
  const edge = (position?: ScrollLogicalPosition) =>
    position === 'start' || position === 'end' ? shift : 0;
  const shim = document.createElement('div');
  Object.assign(shim.style, {
    position: 'absolute',
    top: rect.top + window.scrollY + edge(options.block) + 'px',
    left: rect.left + window.scrollX + edge(options.inline) + 'px',
    height: rect.height + 'px',
    width: rect.width + 'px',
    zIndex: String(Number.MIN_SAFE_INTEGER),
    opacity: '0',
  });
  document.body.appendChild(shim);
  setTimeout(() => shim.remove(), 100);
  return shim;
}

export interface ScrollNode extends Cmd {
  type: 'scrollCommand';
  /** `scroll to …`. */
  to?: ScrollSpec;
  /** `scroll [<target>] [up|down|left|right] by <n> [px]`. */
  target?: Expr;
  direction?: string;
  by?: Expr;
  behavior?: ScrollBehavior;
}

export function scroll(g: Grammar): void {
  g.commands.scroll = (p, _keyword, start) => {
    const node: ScrollNode = { type: 'scrollCommand', start, end: start, run: () => {} };
    if (p.match('to')) {
      const to = (node.to = scrollSpec(p));
      node.run = ctx => scrollTo(to, ctx);
    } else {
      const directions = ['up', 'down', 'left', 'right'];
      let direction = p.matchAny(...directions);
      let target: Expr | undefined;
      if (!direction && p.cur().value !== 'by') {
        target = node.target = unary(p);
        direction = p.matchAny(...directions);
      }
      p.req('by');
      const by = (node.by = p.withFollow(['px'], () => expr(p)));
      p.match('px');
      const behavior = (node.behavior = smoothness(p));
      const way = (node.direction = direction?.value ?? 'down');
      node.run = ctx =>
        all([target?.ev(ctx), by.ev(ctx)], ([scroller, amount]) => {
          const n = num(amount) * (way === 'up' || way === 'left' ? -1 : 1);
          const horizontal = way === 'left' || way === 'right';
          const options: ScrollToOptions = { top: horizontal ? 0 : n, left: horizontal ? n : 0 };
          if (behavior) options.behavior = behavior;
          (isEl(scroller) ? scroller : document.documentElement).scrollBy(options);
        });
    }
    node.end = p.endPos();
    return node;
  };
}

// ---------------------------------------------------------------------------
// go
// ---------------------------------------------------------------------------

export interface GoNode extends Cmd {
  type: 'goCommand';
  back: boolean;
  target?: Expr;
  scroll?: ScrollSpec;
  newWindow: boolean;
}

/** `go back`, `go to url <url> [in new window]`, `go to <url or element>`, `go to the top of <element>`. */
export function go(g: Grammar): void {
  g.commands.go = (p, _keyword, start) => {
    const node: GoNode = {
      type: 'goCommand',
      back: false,
      newWindow: false,
      start,
      end: start,
      run: () => {},
    };
    const newWindow = () => {
      if (!p.match('in')) return false;
      p.req('new');
      p.req('window');
      return true;
    };
    const navigate = (to: unknown) => {
      if (to == null) return;
      if (isEl(to)) return to.scrollIntoView({ block: 'start', inline: 'nearest' });
      const address = String(to);
      if (address.startsWith('#')) window.location.hash = address;
      else if (node.newWindow) window.open(address);
      else window.location.href = address;
    };
    if (p.match('back')) {
      node.back = true;
      node.run = () => window.history.back();
    } else {
      p.match('to');
      if (p.match('url')) {
        const address = stringLike(p);
        node.newWindow = newWindow();
        node.run = () => navigate(address);
      } else if (
        ['the', 'top', 'middle', 'bottom', 'left', 'center', 'right'].includes(p.cur().value)
      ) {
        const spec = (node.scroll = scrollSpec(p));
        node.run = ctx => scrollTo(spec, ctx);
      } else {
        const target = (node.target = urlOrExpression(p));
        node.newWindow = newWindow();
        node.run = ctx => then1(target.ev(ctx), navigate);
      }
    }
    node.end = p.endPos();
    return node;
  };
}
