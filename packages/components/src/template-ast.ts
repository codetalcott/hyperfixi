/**
 * Template AST — parse + render with `#if`/`#else`/`#end`/`#for` directives.
 *
 * Mirrors upstream _hyperscript 0.9.91's component template syntax. Directives
 * are line-oriented: each directive must occupy its own line (modulo
 * surrounding whitespace). `${...}` interpolation can appear anywhere in
 * static text; it's evaluated by the same path used outside directives.
 *
 * Supported:
 *   #if <expr>          ... [#else] ... #end
 *   #for <name> in <expr> ... [#else] ... #end       (#else fires on empty)
 *
 * Deferred (v2.1+):
 *   #continue   — skip the current iteration of the enclosing `#for`
 */

export type TemplateNode =
  | { kind: 'text'; content: string }
  | { kind: 'if'; cond: string; then: TemplateNode[]; else: TemplateNode[] }
  | {
      kind: 'for';
      varName: string;
      iterableExpr: string;
      body: TemplateNode[];
      elseEmpty: TemplateNode[];
    };

const IF_RE = /^#if\s+(.+)$/;
const ELSE_RE = /^#else\s*$/;
const END_RE = /^#end\s*$/;
const FOR_RE = /^#for\s+([A-Za-z_$][\w$]*)\s+in\s+(.+)$/;

/**
 * Parse a template body into a sequence of TemplateNodes.
 * Directives are recognized only when they occupy their own line.
 */
export function parseTemplate(source: string): TemplateNode[] {
  const lines = source.split('\n');
  const cursor = { i: 0 };

  function parseBlock(stop: (line: string) => boolean): TemplateNode[] {
    const nodes: TemplateNode[] = [];
    let textBuffer: string[] = [];

    const flushText = (): void => {
      if (textBuffer.length > 0) {
        nodes.push({ kind: 'text', content: textBuffer.join('\n') });
        textBuffer = [];
      }
    };

    while (cursor.i < lines.length) {
      const line = lines[cursor.i];
      const trimmed = line.trim();

      if (stop(trimmed)) {
        flushText();
        return nodes;
      }

      const ifMatch = IF_RE.exec(trimmed);
      const forMatch = FOR_RE.exec(trimmed);

      if (ifMatch) {
        flushText();
        const cond = ifMatch[1].trim();
        cursor.i++;
        const thenBlock = parseBlock(l => ELSE_RE.test(l) || END_RE.test(l));
        let elseBlock: TemplateNode[] = [];
        if (cursor.i < lines.length && ELSE_RE.test(lines[cursor.i].trim())) {
          cursor.i++;
          elseBlock = parseBlock(l => END_RE.test(l));
        }
        if (cursor.i < lines.length && END_RE.test(lines[cursor.i].trim())) cursor.i++;
        nodes.push({ kind: 'if', cond, then: thenBlock, else: elseBlock });
      } else if (forMatch) {
        flushText();
        const varName = forMatch[1];
        const iterableExpr = forMatch[2].trim();
        cursor.i++;
        const bodyBlock = parseBlock(l => ELSE_RE.test(l) || END_RE.test(l));
        let elseEmptyBlock: TemplateNode[] = [];
        if (cursor.i < lines.length && ELSE_RE.test(lines[cursor.i].trim())) {
          cursor.i++;
          elseEmptyBlock = parseBlock(l => END_RE.test(l));
        }
        if (cursor.i < lines.length && END_RE.test(lines[cursor.i].trim())) cursor.i++;
        nodes.push({
          kind: 'for',
          varName,
          iterableExpr,
          body: bodyBlock,
          elseEmpty: elseEmptyBlock,
        });
      } else {
        textBuffer.push(line);
        cursor.i++;
      }
    }
    flushText();
    return nodes;
  }

  return parseBlock(() => false);
}

/**
 * Render a parsed template AST against a scope. `interpText` handles `${...}`
 * interpolation in static blocks; `evalExpr` evaluates the bare expression in
 * `#if <expr>` and `#for <var> in <expr>`. Both are passed in so the renderer
 * stays decoupled from the components plugin's host-element / caret-var
 * specifics — each callsite supplies the appropriate evaluator closure.
 */
export function renderTemplate(
  nodes: TemplateNode[],
  scope: Record<string, unknown>,
  interpText: (text: string, scope: Record<string, unknown>) => string,
  evalExpr: (expr: string, scope: Record<string, unknown>) => unknown
): string {
  return nodes
    .map(node => {
      if (node.kind === 'text') {
        return interpText(node.content, scope);
      }
      if (node.kind === 'if') {
        const value = evalExpr(node.cond, scope);
        const branch = value ? node.then : node.else;
        return renderTemplate(branch, scope, interpText, evalExpr);
      }
      // for
      const iterable = evalExpr(node.iterableExpr, scope) as Iterable<unknown> | null | undefined;
      const items =
        iterable != null &&
        typeof (iterable as { [Symbol.iterator]?: unknown })[Symbol.iterator] === 'function'
          ? Array.from(iterable as Iterable<unknown>)
          : [];
      if (items.length === 0) {
        return renderTemplate(node.elseEmpty, scope, interpText, evalExpr);
      }
      return items
        .map(item =>
          renderTemplate(node.body, { ...scope, [node.varName]: item }, interpText, evalExpr)
        )
        .join('\n');
    })
    .join('\n');
}
