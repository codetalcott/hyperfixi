/**
 * The one generic command parser — reads `COMMAND_GRAMMAR`, emits the node
 *
 * Arc 3 step 4. Replaces two loops that disagreed with each other: the tail of
 * `parseCommandCore` (full expressions, a `continuationKeywords` array, no
 * modifiers, and a boundary that ignored `on` and command-word calls) and
 * `parseMultiWordCommand` (`parsePrimary` per argument, keyword slots into
 * `modifiers`). Each row of the grammar says which positional rule it wants;
 * the boundary rule is shared, and it is the corrected one — see the module
 * doc on `command-grammar.ts` for the two defects it closes.
 */

import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ParserContext } from '../parser-types';
import type { Token } from '../../types/core';
import { CommandNodeBuilder } from '../command-node-builder';
import type { CommandGrammar } from '../command-grammar';
import { isCommandBoundary, isKeyword } from '../helpers/parsing-helpers';

/**
 * Is the parser at the end of this command's arguments?
 *
 * A command terminator, a marker word of THIS grammar, or a command word —
 * unless that command word is followed by `(`, in which case it is a function
 * call in expression position (`call fetch("/x")`) and belongs to the
 * argument. `isCommandBoundary` already covers the terminators and the plain
 * command-word case; the `(` exception is the one addition, and `on` is added
 * to the boundary list because the tail loop never stopped there.
 */
function atArgumentBoundary(ctx: ParserContext, grammar: CommandGrammar): boolean {
  if (ctx.isAtEnd()) return true;
  const next = ctx.peek();
  if (ctx.checkIsCommand() && ctx.peekAt(1)?.value === '(') return false;
  if (isCommandBoundary(ctx, ['catch', 'finally', 'on'])) return true;
  return isKeyword(next, [...grammar.markers]);
}

/**
 * Parse the positional arguments, then each marker slot, and build the node.
 *
 * `commandToken` is the command word itself, already consumed. `name` is the
 * command name as the dispatcher wants it recorded — `beep!` after the `!`
 * has been folded in, for instance.
 */
export function parseDeclaredCommand(
  ctx: ParserContext,
  commandToken: Token,
  name: string,
  grammar: CommandGrammar
): ASTNode {
  const args: ASTNode[] = [];
  const modifiers: Record<string, ExpressionNode> = {};

  if (grammar.positional !== 'none') {
    const continuation = grammar.continuation ?? [];
    while (!atArgumentBoundary(ctx, grammar)) {
      const expr = grammar.positional === 'expression' ? ctx.parseExpression() : ctx.parsePrimary();
      if (!expr) break;
      args.push(expr);
      // A comma continues the list under either rule. Under `primary` the list
      // also continues on its own — that is the multi-word parser's loop, one
      // primary after another until a marker or a boundary. Under `expression`
      // it ends here (an expression already took everything it could), unless
      // the next word is a continuation word, which is pushed as an identifier
      // and the list goes on — the old tail loop's rule, kept for plugin rows.
      if (ctx.match(',')) continue;
      if (grammar.positional === 'primary') continue;
      // The argument just parsed may itself BE a continuation word (`answer
      // with "x"` — `with` parses as an identifier first); the old loop went
      // on in that case too, so the value after it was not left behind.
      const name = (expr as { type?: string; name?: string }).name;
      if (expr.type === 'identifier' && name && continuation.includes(name.toLowerCase())) continue;
      const next = ctx.peek();
      if (next && continuation.includes(next.value.toLowerCase())) {
        ctx.advance();
        args.push(ctx.createIdentifier(next.value));
        continue;
      }
      break;
    }
  }

  const commaList = new Set(grammar.commaList ?? []);
  while (!ctx.isAtEnd() && isKeyword(ctx.peek(), [...grammar.markers])) {
    const keyword = ctx.advance().value;
    const key = ctx.resolveKeyword(keyword).toLowerCase();
    let value = ctx.parseExpression();
    if (value && commaList.has(key) && ctx.check(',')) {
      const elements: ASTNode[] = [value];
      while (ctx.match(',')) {
        const next = ctx.parseExpression();
        if (!next) break;
        elements.push(next);
      }
      const first = elements[0] as ASTNode;
      const last = elements[elements.length - 1] as ASTNode;
      value = {
        type: 'arrayLiteral',
        elements,
        start: first.start,
        end: last.end,
        line: first.line,
        column: first.column,
      } as ASTNode;
    }
    if (value) modifiers[key] = value as ExpressionNode;
  }

  const builder = CommandNodeBuilder.from(commandToken)
    .withName(name)
    .withArgs(...args);
  if (Object.keys(modifiers).length > 0) builder.withModifiers(modifiers);
  return builder.endingAt(ctx.getPosition()).build();
}
