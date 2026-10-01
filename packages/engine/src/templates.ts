/**
 * Templates: `render <template> [with <args>] [here | into <target>]`, the text lines a
 * template is made of, and `escape html <value>`.
 *
 * A template is the text of an element (usually `<script type="text/hyperscript-template">`).
 * It is read line by line: a line that starts with `#` is a command (`#for x in xs`, `#if`,
 * `#else`, `#end`, `#continue`), any other line is text with `${…}` holes. The lines parse
 * into an ordinary command list, so loops and conditionals are the engine's own.
 * Follows upstream `parsetree/commands/template.js` and the `"lines"` mode of its tokenizer.
 */
import type { Cmd, Ctx, Expr, LoopScope } from './ast';
import { expr, nakedNamedArguments } from './expressions';
import { Parser, type Grammar } from './parser';
import { dataOf, host, makeContext, peekData, runList, scopeOf } from './runtime';
import { commandList } from './statements';
import { tokenize, type Token } from './tokenizer';
import { all, isEl, then1, type MaybeP } from './util';

/** The keyword a text line parses under. No identifier can be spelled this way. */
const TEXT = '#text';

/**
 * Tokens for a template. Command lines are tokenized as hyperscript; a text line becomes
 * one token carrying the line. Leading whitespace and blank lines are dropped.
 */
export function templateTokens(source: string): Token[] {
  const tokens: Token[] = [];
  let line = 0;
  let offset = 0;
  for (const whole of source.split(/(?<=\n)/)) {
    line++;
    const text = whole.trimStart();
    const start = offset + whole.length - text.length;
    offset += whole.length;
    // Blank lines and comment lines (`-- …`, `// …`) produce nothing.
    if (!text || /^(--|\/\/)(\s|$|[-/])/.test(text)) continue;
    const column = start - (offset - whole.length);
    if (/^#[a-zA-Z]/.test(text)) {
      for (const token of tokenize(text.slice(1))) {
        token.start += start + 1;
        token.end += start + 1;
        token.line = line;
        token.column += column + 1;
        tokens.push(token);
      }
    } else {
      // A line keeps its newline, written as `\n` whatever the source used.
      const content = text.replace(/\r?\n$/, '\n');
      tokens.push({ type: 'IDENTIFIER', value: TEXT, content, start, end: offset, line, column });
    }
  }
  return tokens;
}

export interface TemplateError {
  line: number;
  message: string;
  /** The `${…}` expression the error is in. */
  expr: string;
}

/** Errors in the `${…}` holes of the template being parsed; a bad hole renders as nothing. */
let errors: TemplateError[] = [];

export function parseTemplate(
  g: Grammar,
  source: string
): { commands: Cmd[]; errors: TemplateError[] } {
  const found: TemplateError[] = (errors = []);
  const p = new Parser(g, templateTokens(source), source);
  const commands = commandList(p);
  if (p.hasMore()) p.err();
  return { commands, errors: found };
}

const escapeHtml = (value: unknown): string =>
  String(value).replace(/[&<>"']/g, c => `&${ENTITIES[c]};`);
const ENTITIES: Record<string, string> = {
  '&': 'amp',
  '<': 'lt',
  '>': 'gt',
  '"': 'quot',
  "'": '#039',
};

/** One piece of a text line: literal text, or a `${…}` hole. */
type Part = string | { value: Expr; condition?: Expr; otherwise?: Expr; escape: boolean };

export interface TemplateTextNode extends Cmd {
  type: 'templateText';
  parts: Part[];
}

/** `${value}`, `${unescaped value}`, `${value if condition [else other]}`. */
function hole(p: Parser, source: string): Part {
  const inner = p.child(tokenize(source), source);
  const escape = !inner.match('unescaped');
  const value = expr(inner);
  if (!inner.match('if')) return { value, escape };
  const condition = expr(inner);
  return { value, condition, otherwise: inner.match('else') ? expr(inner) : undefined, escape };
}

function textLine(p: Parser, start: number): TemplateTextNode {
  const { content = '', line } = p.last;
  const parts: Part[] = [];
  for (let i = 0; i < content.length;) {
    const open = content.indexOf('${', i);
    if (open === -1) {
      parts.push(content.slice(i));
      break;
    }
    if (open > i) parts.push(content.slice(i, open));
    let depth = 1;
    let close = open + 2;
    for (; close < content.length && depth > 0; close++) {
      if (content[close] === '{') depth++;
      else if (content[close] === '}') depth--;
    }
    if (depth > 0) {
      const rest = content.slice(open);
      errors.push({ line, message: 'Unterminated ${} expression', expr: rest });
      break;
    }
    const source = content.slice(open + 2, close - 1);
    try {
      parts.push(hole(p, source));
    } catch (e) {
      errors.push({ line, message: e instanceof Error ? e.message : String(e), expr: source });
    }
    i = close;
  }

  const evaluate = (part: Part, ctx: Ctx): unknown => {
    if (typeof part === 'string') return part;
    if (!part.condition) return part.value.ev(ctx);
    return then1(part.condition.ev(ctx), yes =>
      yes ? part.value.ev(ctx) : part.otherwise?.ev(ctx)
    );
  };
  const text = (part: Part, value: unknown): string =>
    typeof part === 'string'
      ? part
      : value == null
        ? ''
        : part.escape
          ? escapeHtml(value)
          : String(value);

  return {
    type: 'templateText',
    parts,
    start,
    end: p.endPos(),
    run: ctx =>
      all(
        parts.map(part => evaluate(part, ctx)),
        values => {
          ctx.meta.template?.out.push(values.map((value, i) => text(parts[i], value)).join(''));
        }
      ),
  };
}

/** The markers a loop leaves in a template's output, one before each iteration's content. */
const SCOPE_MARKER = /<!--hs-scope:[^>]*-->/g;

/**
 * Run a parsed template against a context, then hand `done` the HTML (markers included)
 * and what each loop iterated over.
 */
export function runTemplate<R>(
  commands: Cmd[],
  ctx: Ctx,
  done: (html: string, loops: Record<string, LoopScope>) => R
): MaybeP<R> {
  const out: string[] = [];
  const loops: Record<string, LoopScope> = {};
  ctx.meta.template = { out, loops };
  return then1(runList(commands, ctx), () => done(out.join(''), loops));
}

/**
 * An element inside rendered output takes the loop variables of the iterations that
 * produced it, so its own script can read them. Each iteration is preceded by a comment
 * marker; the nearest one before the element, at each level up to the root, names it.
 */
function adoptLoopVariables(elt: Element): void {
  const root = elt.closest('[data-live-template], [dom-scope="isolated"]');
  const loops = root && peekData(root)?.loops;
  if (!loops) return;
  for (let node: Element | null = elt; node && node !== root; node = node.parentElement) {
    for (let prev = node.previousSibling; prev; prev = prev.previousSibling) {
      if (!(prev instanceof Comment) || !prev.data.startsWith('hs-scope:')) continue;
      const [, id, index] = prev.data.split(':');
      const loop = loops[id];
      if (loop) {
        const iteration = parseInt(index);
        const scope = scopeOf(elt);
        if (loop.identifier) scope[loop.identifier] = Reflect.get(Object(loop.source), iteration);
        if (loop.indexIdentifier) scope[loop.indexIdentifier] = iteration;
      }
      break;
    }
  }
}

export interface RenderNode extends Cmd {
  type: 'renderCommand';
  template: Expr;
  args?: Expr;
  /** `here`: the result becomes the content of `me`. */
  here: boolean;
  /** `into <target>`: the result becomes the content of the target. */
  target?: Expr;
}

export interface EscapeNode extends Expr {
  type: 'escapeExpression';
  value: Expr;
}

/** Registers `render`, template text lines and `escape html`. */
export function render(g: Grammar): void {
  host.enter = adoptLoopVariables;
  g.commands[TEXT] = (p, _keyword, start) => textLine(p, start);

  g.commands.render = (p, _keyword, start) => {
    const template = expr(p);
    const args = p.match('with') ? nakedNamedArguments(p) : undefined;
    const here = !!p.match('here');
    const target = !here && p.match('into') ? expr(p) : undefined;
    const templateText = p.text(template);
    const node: RenderNode = {
      type: 'renderCommand',
      template,
      args,
      here,
      target,
      start,
      end: p.endPos(),
      run: ctx =>
        all([template.ev(ctx), args?.ev(ctx), target?.ev(ctx)], ([element, given, into]) => {
          if (!isEl(element)) throw new Error(templateText + ' is not an element');
          let parsed: ReturnType<typeof parseTemplate>;
          try {
            parsed = parseTemplate(g, element.textContent ?? '');
          } catch (e) {
            console.error('hyperscript template parse error:', e instanceof Error ? e.message : e);
            ctx.result = '';
            return;
          }
          for (const error of parsed.errors) {
            console.error(
              `hyperscript template error (line ${error.line}): ${error.message}` +
                (error.expr ? ' in ${' + error.expr + '}' : '')
            );
          }
          const inner = makeContext(ctx.me, undefined, ctx.me, null);
          Object.assign(inner.locals, ctx.locals, given);
          return runTemplate(parsed.commands, inner, (html, loops) => {
            ctx.result = html.replace(SCOPE_MARKER, '');
            for (const receiver of [here ? ctx.me : undefined, into]) {
              if (!isEl(receiver)) continue;
              dataOf(receiver).loops = loops;
              receiver.innerHTML = html;
            }
          });
        }),
    };
    return node;
  };

  // `escape html [unescaped] <value>`
  g.leaves.push(p => {
    const start = p.pos();
    if (!p.match('escape')) return;
    const kind = p.reqType('IDENTIFIER').value;
    const unescaped = !!p.match('unescaped');
    const value = expr(p);
    const node: EscapeNode = {
      type: 'escapeExpression',
      value,
      start,
      end: p.endPos(),
      ev: ctx =>
        then1(value.ev(ctx), v => {
          if (unescaped) return v;
          if (v == null) return '';
          if (kind !== 'html') throw new Error('Unknown escape: ' + kind);
          return escapeHtml(v);
        }),
    };
    return node;
  });
}
