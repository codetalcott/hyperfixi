/**
 * `js … end`: inline JavaScript, as a command and as a top-level feature.
 * Follows upstream `parsetree/commands/execution.js` and `features/js.js`.
 *
 * This is the one module that compiles source with `Function`. A bundle for a
 * page with a strict Content-Security-Policy leaves it out.
 */
import type { Cmd, Feature } from '../ast';
import type { Grammar, Parser } from '../parser';
import { resolveSymbol } from '../runtime';
import { then1 } from '../util';

/** The raw text up to `end`, and the names of the functions it declares. */
function jsBody(p: Parser): { source: string; functions: string[] } {
  const from = p.pos();
  let last = p.cur();
  const functions: string[] = [];
  let name = '';
  let declaring = false;
  while (p.hasMore()) {
    last = p.consume();
    const next = p.tok(0, true);
    if (next.type === 'IDENTIFIER' && next.value === 'end') break;
    if (declaring) {
      if (last.type === 'IDENTIFIER' || last.type === 'NUMBER') name += last.value;
      else {
        if (name) functions.push(name);
        name = '';
        declaring = false;
      }
    } else if (last.type === 'IDENTIFIER' && last.value === 'function') declaring = true;
  }
  return { source: p.src.substring(from, last.end + 1), functions };
}

export interface JsNode extends Cmd {
  type: 'jsCommand';
  source: string;
  /** Hyperscript variables passed in as parameters: `js(x, y) … end`. */
  inputs: string[];
}

export interface JsFeature extends Feature {
  type: 'jsFeature';
  source: string;
  /** Function declarations the block exposes as globals. */
  functions: string[];
}

export function js(g: Grammar): void {
  g.commands.js = (p, _keyword, start) => {
    const inputs: string[] = [];
    if (p.matchOp('(') && !p.matchOp(')')) {
      do inputs.push(p.reqType('IDENTIFIER').value);
      while (p.matchOp(','));
      p.reqOp(')');
    }
    const { source } = jsBody(p);
    p.match('end');
    const compiled = new Function(...inputs, source);
    const node: JsNode = {
      type: 'jsCommand',
      source,
      inputs,
      start,
      end: p.endPos(),
      run: ctx =>
        then1(
          Reflect.apply(
            compiled,
            globalThis,
            inputs.map(input => resolveSymbol(input, ctx))
          ),
          result => {
            ctx.result = result;
          }
        ),
    };
    return node;
  };

  g.features.js = (p, start) => {
    const { source, functions } = jsBody(p);
    const compiled = new Function(
      `${source}\nreturn { ${functions.map(name => `${name}:${name}`).join(',')} } `
    );
    const feature: JsFeature = {
      type: 'jsFeature',
      source,
      functions,
      start,
      end: p.endPos(),
      install: () => void Object.assign(globalThis, compiled()),
    };
    return feature;
  };
}
