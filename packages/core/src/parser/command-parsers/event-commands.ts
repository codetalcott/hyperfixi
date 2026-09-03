/**
 * Event Command Parsers
 *
 * Pure function implementations of event-related command parsers.
 * These functions use ParserContext for dependency injection, enabling
 * clean separation from the Parser class.
 *
 * @module parser/command-parsers/event-commands
 */

import type { ParserContext, IdentifierNode } from '../parser-types';
import type { ASTNode, CommandNode, ExpressionNode } from '../../types/core';
import { CommandNodeBuilder } from '../command-node-builder';
import { KEYWORDS } from '../parser-constants';
import {
  isCommandBoundary,
  parseMaybeNamedArgument,
  parseOneArgument,
} from '../helpers/parsing-helpers';
import { toLegacyExpression } from '../../ast/legacy';
import type { SlotMap } from '../../ast/command-slots';

/**
 * Parse trigger/send command
 *
 * Syntax:
 *   trigger <event> on <target>
 *   send <event> to <target>
 *
 * This command fires an event on a target element. It collects all arguments
 * until a command boundary, then restructures them around the 'on' or 'to' keyword.
 *
 * Examples:
 *   - trigger click on <button/>
 *   - trigger customEvent on #myElement
 *   - send hello to #target-form
 *   - send customEvent to <form/>
 *   - send filterByCategory(category: someValue) to me
 *   - trigger update(count: 42, label: "test") on #target
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param identifierNode - The 'trigger' or 'send' identifier node
 * @returns CommandNode representing the trigger/send command
 */
export function parseTriggerCommand(
  ctx: ParserContext,
  identifierNode: IdentifierNode
): CommandNode | null {
  // Special handling for event names with colons (e.g., "draggable:start")
  // The tokenizer splits these into: identifier, ':', identifier
  // We need to combine them into a single event name
  const allArgs: ASTNode[] = [];

  // First, parse the event name (may include colons)
  let eventName = '';
  const eventStart = ctx.peek().start || 0;
  const eventLine = ctx.peek().line || 1;
  const eventColumn = ctx.peek().column || 1;

  // Check if first token is an identifier (event name)
  if (ctx.checkIdentifierLike()) {
    eventName = ctx.advance().value;

    // Check for colon-separated parts (e.g., "draggable:start")
    while (ctx.check(':') && !ctx.isAtEnd()) {
      ctx.advance(); // consume ':'
      eventName += ':';
      // Next part should be an identifier or keyword
      if (ctx.checkIdentifierLike()) {
        eventName += ctx.advance().value;
      }
    }

    // Check for event detail parameters: eventName(key: value, ...)
    if (ctx.check('(')) {
      ctx.advance(); // consume '('

      const detailArgs: ASTNode[] = [];

      while (!ctx.isAtEnd() && !ctx.check(')')) {
        const { name, value } = parseMaybeNamedArgument(ctx);

        if (name !== undefined) {
          // Named param: wrap as objectLiteral so evaluator produces {name: value}
          detailArgs.push({
            type: 'objectLiteral',
            properties: [
              {
                key: { type: 'identifier', name } as ASTNode,
                value: value,
              },
            ],
            start: value.start,
            end: value.end,
            line: value.line,
            column: value.column,
          } as ASTNode);
        } else {
          detailArgs.push(value);
        }

        if (ctx.check(',')) {
          ctx.advance();
        } else if (!ctx.check(')')) {
          break;
        }
      }

      // Consume closing parenthesis
      if (ctx.check(')')) {
        ctx.advance();
      }

      // Create a functionCall node instead of a plain string
      allArgs.push({
        type: 'functionCall',
        name: eventName,
        args: detailArgs,
        start: eventStart,
        end: ctx.getPosition().end,
        line: eventLine,
        column: eventColumn,
      } as ASTNode);
    } else {
      // No parameters - create a string literal node for the event name
      allArgs.push({
        type: 'string',
        value: eventName,
        start: eventStart,
        end: ctx.getPosition().end,
        line: eventLine,
        column: eventColumn,
      } as ASTNode);
    }
  }

  // The tail is two slots. `on`/`to <target>` is the target slot (`on`, the
  // key the semantic path already emits for both spellings); `with <words>` is
  // the option-word list (`bubbles`, `nocancelable`, …), an arrayLiteral so a
  // single slot can carry several. Marker words never reach `args` — the
  // command reads slots, not positions (Arc 3 step 3). Anything else before
  // the boundary is malformed trailing input; it is still collected into
  // `args`, because the doc-comment contract above promises the parent parser
  // never sees it, and `parsePrimary()` — not `parseExpression()` — is used
  // there deliberately: parsePrimary interprets `on` as an event-handler
  // start, and an expression parse would swallow the target marker.
  const finalArgs: ASTNode[] = [...allArgs];
  const modifiers: SlotMap<'trigger' | 'send'> = {};
  while (!isCommandBoundary(ctx)) {
    if (ctx.check(KEYWORDS.ON) || ctx.check(KEYWORDS.TO)) {
      ctx.advance();
      const target = parseOneArgument(ctx, [KEYWORDS.WITH]);
      if (target) modifiers['on'] = target as ExpressionNode;
      continue;
    }
    if (ctx.check(KEYWORDS.WITH)) {
      ctx.advance();
      const words: ASTNode[] = [];
      while (!isCommandBoundary(ctx, [KEYWORDS.ON, KEYWORDS.TO])) {
        const before = ctx.savePosition();
        const word = ctx.parsePrimary();
        if (word) words.push(word);
        if (ctx.savePosition() === before) ctx.advance();
      }
      const first = words[0];
      const last = words[words.length - 1];
      modifiers['with'] = toLegacyExpression({
        type: 'arrayLiteral',
        elements: words as never,
        ...(first?.start !== undefined ? { start: first.start } : {}),
        ...(last?.end !== undefined ? { end: last.end } : {}),
        ...(first?.line !== undefined ? { line: first.line } : {}),
        ...(first?.column !== undefined ? { column: first.column } : {}),
      });
      continue;
    }
    const before = ctx.savePosition();
    const expr = ctx.parsePrimary();
    if (expr) finalArgs.push(expr);
    // parsePrimary() can return WITHOUT consuming a token when it cannot start
    // an expression there — e.g. the `&` in an HTML-escaped `&lt;form /&gt;`,
    // which is what a `<form/>` selector becomes when a doc example is copied
    // through markdown. With no progress check this loop spun forever appending
    // nodes until the process died of heap exhaustion. A hang is strictly worse
    // than a bad parse: it takes the page (or the build) with it, and no
    // `success:false` ever gets returned to say why.
    if (ctx.savePosition() === before) {
      ctx.advance();
    }
  }
  // Use CommandNodeBuilder for consistent node construction
  const builder = CommandNodeBuilder.fromIdentifier<'trigger' | 'send'>(identifierNode).withArgs(
    ...finalArgs
  );
  if (Object.keys(modifiers).length > 0) builder.withModifiers(modifiers);
  return builder.endingAt(ctx.getPosition()).build();
}
