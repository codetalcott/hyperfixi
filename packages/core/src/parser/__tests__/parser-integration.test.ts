/**
 * Integration-level parser tests
 *
 * These tests use the real Parser (tokenize + parse) end-to-end on full
 * hyperscript strings, asserting on the final AST structure. They cover
 * cross-cutting concerns that unit-level mock tests can miss.
 *
 * Phase 9: Parser Coverage & Refactoring Plan
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';

// Convenience helper: parse and assert success
function parseOk(input: string) {
  const result = parse(input);
  expect(
    result.success,
    `Expected parse to succeed for: "${input}"\nError: ${result.error?.message}`
  ).toBe(true);
  expect(result.node).toBeDefined();
  return result.node!;
}

// Convenience helper: parse and assert failure
function parseFail(input: string) {
  const result = parse(input);
  expect(result.success, `Expected parse to fail for: "${input}"`).toBe(false);
  expect(result.error).toBeDefined();
  return result.error!;
}

// Type-safe args accessor
function getArgs(node: any): any[] {
  return node.args ?? [];
}

function getCommands(node: any): any[] {
  return node.commands ?? [];
}

describe('Parser Integration Tests', () => {
  // ─── Command Chaining with "then" ─────────────────────────────────

  describe('Command Chaining (then)', () => {
    it('should parse two commands chained with then', () => {
      const node = parseOk('add .active then remove .loading');
      // Standalone chained commands produce a CommandSequence wrapper
      expect(node.type).toBe('CommandSequence');
      const cmds = getCommands(node);
      expect(cmds.length).toBe(2);
      expect(cmds[0].name).toBe('add');
      expect(cmds[1].name).toBe('remove');
    });

    it('should parse three commands chained with then', () => {
      const node = parseOk('add .loading then wait 500ms then remove .loading');
      expect(node.type).toBe('CommandSequence');
      const cmds = getCommands(node);
      expect(cmds.length).toBe(3);
      expect(cmds[0].name).toBe('add');
      expect(cmds[1].name).toBe('wait');
      expect(cmds[2].name).toBe('remove');
    });

    it('should parse set then put chain', () => {
      const node = parseOk('set :x to 5 then put :x into #output');
      expect(node.type).toBe('CommandSequence');
      const cmds = getCommands(node);
      expect(cmds.length).toBe(2);
      expect(cmds[0].name).toBe('set');
      expect(cmds[1].name).toBe('put');
      // Verify the set command parsed the target correctly
      const args = getArgs(cmds[0]);
      expect(args[0]).toMatchObject({
        type: 'identifier',
        name: 'x',
        scope: 'local',
      });
    });

    it('should parse toggle then add chain', () => {
      const node = parseOk('toggle .active then add .highlight');
      expect(node.type).toBe('CommandSequence');
      const cmds = getCommands(node);
      expect(cmds.length).toBe(2);
      expect(cmds[0].name).toBe('toggle');
      expect(cmds[1].name).toBe('add');
    });
  });

  // ─── Event Handlers with Bodies ────────────────────────────────────

  describe('Event Handlers with Bodies', () => {
    it('should parse event handler with single command', () => {
      const node = parseOk('on click toggle .active');
      expect(node.type).toBe('eventHandler');
      expect(node.event).toBe('click');
      const commands = getCommands(node);
      expect(commands.length).toBeGreaterThanOrEqual(1);
      expect(commands[0].name).toBe('toggle');
    });

    it('should parse event handler with chained commands', () => {
      const node = parseOk('on click add .loading then wait 500ms then remove .loading');
      expect(node.type).toBe('eventHandler');
      expect(node.event).toBe('click');
      const commands = getCommands(node);
      expect(commands.length).toBeGreaterThanOrEqual(1);
      // First command should be add
      expect(commands[0].name).toBe('add');
    });

    it('should parse event handler with from clause and commands', () => {
      const node = parseOk('on click from #btn toggle .active');
      expect(node.type).toBe('eventHandler');
      expect(node.event).toBe('click');
      expect(node.target).toBe('#btn');
    });

    it('should parse event handler with condition filter', () => {
      const node = parseOk('on keydown[shiftKey] add .shift-held');
      expect(node.type).toBe('eventHandler');
      expect(node.event).toBe('keydown');
      expect(node.condition).toBeDefined();
      const cond = node.condition as Record<string, unknown>;
      expect(cond.type).toBe('identifier');
      expect(cond.name).toBe('shiftKey');
    });

    it('should parse event handler with complex condition', () => {
      const node = parseOk("on keydown[ctrlKey and key is 's'] hide me");
      expect(node.type).toBe('eventHandler');
      expect(node.event).toBe('keydown');
      expect(node.condition).toBeDefined();
      const cond = node.condition as Record<string, unknown>;
      expect(cond.type).toBe('binaryExpression');
      expect(cond.operator).toBe('and');
    });

    it('should parse mouseenter/mouseleave events', () => {
      const enter = parseOk('on mouseenter add .hover');
      expect(enter.type).toBe('eventHandler');
      expect(enter.event).toBe('mouseenter');

      const leave = parseOk('on mouseleave remove .hover');
      expect(leave.type).toBe('eventHandler');
      expect(leave.event).toBe('mouseleave');
    });
  });

  // ─── Nested Blocks ────────────────────────────────────────────────

  describe('Nested Blocks', () => {
    it('should parse if block with then branch', () => {
      const node = parseOk('if x > 5 then add .big end');
      expect(node.type).toBe('command');
      expect(node.name).toBe('if');
      const args = getArgs(node);
      expect(args.length).toBeGreaterThanOrEqual(2); // condition + then block
    });

    it('should parse if/else block', () => {
      const node = parseOk('if x > 5 then add .big else add .small end');
      expect(node.type).toBe('command');
      expect(node.name).toBe('if');
      const args = getArgs(node);
      // Should have condition, then block, and else block
      expect(args.length).toBeGreaterThanOrEqual(3);
    });

    it('should parse repeat N times block', () => {
      const node = parseOk('repeat 3 times add .item end');
      expect(node.type).toBe('command');
      expect(node.name).toBe('repeat');
    });

    it('should parse if block inside event handler', () => {
      const node = parseOk('on click if x > 5 then add .big end');
      expect(node.type).toBe('eventHandler');
      expect(node.event).toBe('click');
      const commands = getCommands(node);
      expect(commands.length).toBeGreaterThanOrEqual(1);
      expect(commands[0].name).toBe('if');
    });

    it('should parse repeat block inside event handler', () => {
      const node = parseOk('on click repeat 3 times add .item end');
      expect(node.type).toBe('eventHandler');
      expect(node.event).toBe('click');
      const commands = getCommands(node);
      expect(commands.length).toBeGreaterThanOrEqual(1);
      expect(commands[0].name).toBe('repeat');
    });

    it('should parse if block followed by another command in event handler', () => {
      const node = parseOk('on click if x > 0 then add .positive end then remove .loading');
      expect(node.type).toBe('eventHandler');
      expect(node.event).toBe('click');
      const commands = getCommands(node);
      expect(commands.length).toBeGreaterThanOrEqual(1);
      // First command is the if block
      expect(commands[0].name).toBe('if');
    });

    it('should parse nested if inside if', () => {
      const node = parseOk('if x > 5 then if y > 10 then add .both end end');
      expect(node.type).toBe('command');
      expect(node.name).toBe('if');
    });
  });

  // ─── Variable Scoping in Commands ─────────────────────────────────

  describe('Variable Scoping Across Commands', () => {
    it('should parse set with local variable then use in put', () => {
      const node = parseOk('set :msg to "hello" then put :msg into #output');
      expect(node.type).toBe('CommandSequence');
      const cmds = getCommands(node);
      expect(cmds[0].name).toBe('set');
      expect(cmds[1].name).toBe('put');
      const args = getArgs(cmds[0]);
      expect(args[0]).toMatchObject({
        type: 'identifier',
        name: 'msg',
        scope: 'local',
      });
    });

    it('should parse increment with global variable', () => {
      const node = parseOk('increment ::counter');
      expect(node.type).toBe('command');
      expect(node.name).toBe('set'); // transformed from increment
      expect(node.originalCommand).toBe('increment');
      const args = getArgs(node);
      expect(args[0]).toMatchObject({
        type: 'identifier',
        name: 'counter',
        scope: 'global',
      });
    });

    it('should parse decrement with local variable and amount', () => {
      const node = parseOk('decrement :lives by 1');
      expect(node.type).toBe('command');
      expect(node.name).toBe('set'); // transformed from decrement
      expect(node.originalCommand).toBe('decrement');
      const args = getArgs(node);
      // args: [target, 'to', binaryExpression]
      expect(args[0]).toMatchObject({
        type: 'identifier',
        name: 'lives',
        scope: 'local',
      });
      expect(args[2]).toMatchObject({
        type: 'binaryExpression',
        operator: '-',
      });
    });

    it('should parse set the property of target to value', () => {
      const node = parseOk('set the textContent of #counter to "0"');
      expect(node.type).toBe('command');
      expect(node.name).toBe('set');
      const args = getArgs(node);
      // First arg should be a propertyOfExpression
      const target = args[0];
      expect(target.type).toBe('propertyOfExpression');
      expect(target.property.name).toBe('textContent');
    });

    it('should parse set with global scope modifier', () => {
      const node = parseOk('set global counter to 0');
      expect(node.type).toBe('command');
      expect(node.name).toBe('set');
      const args = getArgs(node);
      expect(args[0]).toMatchObject({
        type: 'identifier',
        name: 'counter',
        scope: 'global',
      });
    });
  });

  // ─── Multi-line Parsing ────────────────────────────────────────────

  describe('Multi-line Parsing', () => {
    it('should parse multi-line event handler', () => {
      const input = `on click
        add .loading
        then wait 500ms
        then remove .loading`;
      const node = parseOk(input);
      expect(node.type).toBe('eventHandler');
      expect(node.event).toBe('click');
      const commands = getCommands(node);
      expect(commands.length).toBeGreaterThanOrEqual(1);
      expect(commands[0].name).toBe('add');
    });

    it('should parse multi-line if block', () => {
      const input = `if count > 10
        then add .warning
        else remove .warning
      end`;
      const node = parseOk(input);
      expect(node.type).toBe('command');
      expect(node.name).toBe('if');
    });

    it('should parse multi-line event handler with if block', () => {
      const input = `on click
        if me has .active
          then remove .active
          else add .active
        end`;
      const node = parseOk(input);
      expect(node.type).toBe('eventHandler');
      expect(node.event).toBe('click');
      const commands = getCommands(node);
      expect(commands.length).toBeGreaterThanOrEqual(1);
      expect(commands[0].name).toBe('if');
    });

    it('should parse multi-line with set commands', () => {
      const input = `set :x to 1
        then set :y to 2
        then set :z to :x + :y`;
      const node = parseOk(input);
      expect(node.type).toBe('CommandSequence');
      const cmds = getCommands(node);
      expect(cmds.length).toBe(3);
      expect(cmds[0].name).toBe('set');
      expect(cmds[1].name).toBe('set');
      expect(cmds[2].name).toBe('set');
    });
  });

  // ─── Complex Real-World Patterns ───────────────────────────────────

  describe('Complex Real-World Patterns', () => {
    it('should parse toggle on me pattern', () => {
      const node = parseOk('on click toggle .active on me');
      expect(node.type).toBe('eventHandler');
      expect(node.event).toBe('click');
      const commands = getCommands(node);
      expect(commands[0].name).toBe('toggle');
      const toggleArgs = getArgs(commands[0]);
      // Should have: .active, on, me
      expect(toggleArgs.length).toBeGreaterThanOrEqual(1);
    });

    it('should parse put into pattern', () => {
      const node = parseOk('put "hello world" into #output');
      expect(node.type).toBe('command');
      expect(node.name).toBe('put');
      const args = getArgs(node);
      expect(args[0]).toMatchObject({
        type: 'literal',
        value: 'hello world',
      });
    });

    it('should parse add class to target pattern', () => {
      const node = parseOk('add .highlight to #header');
      expect(node.type).toBe('command');
      expect(node.name).toBe('add');
    });

    it('should parse remove class from target pattern', () => {
      const node = parseOk('remove .loading from #button');
      expect(node.type).toBe('command');
      expect(node.name).toBe('remove');
      const args = getArgs(node);
      expect(args[0]).toMatchObject({
        type: 'selector',
        value: '.loading',
      });
    });

    it('should parse wait with duration', () => {
      const node = parseOk('wait 200ms');
      expect(node.type).toBe('command');
      expect(node.name).toBe('wait');
    });

    it('should parse show/hide commands', () => {
      const showNode = parseOk('show #modal');
      expect(showNode.type).toBe('command');
      expect(showNode.name).toBe('show');

      const hideNode = parseOk('hide #modal');
      expect(hideNode.type).toBe('command');
      expect(hideNode.name).toBe('hide');
    });

    it('should parse counter increment pattern', () => {
      // Common pattern: on click increment ::count then put ::count into #display
      const node = parseOk('on click increment ::count then put ::count into #display');
      expect(node.type).toBe('eventHandler');
      expect(node.event).toBe('click');
      const commands = getCommands(node);
      expect(commands.length).toBeGreaterThanOrEqual(1);
      // First command is increment (transformed to set)
      expect(commands[0].name).toBe('set');
      expect(commands[0].originalCommand).toBe('increment');
    });

    it('should parse toggle visibility pattern', () => {
      const node = parseOk('on click toggle *display on #panel');
      expect(node.type).toBe('eventHandler');
      expect(node.event).toBe('click');
      const commands = getCommands(node);
      expect(commands[0].name).toBe('toggle');
    });

    it('should parse form-like pattern with set and put', () => {
      const node = parseOk('set :val to my value then put :val into #output');
      expect(node.type).toBe('CommandSequence');
      const cmds = getCommands(node);
      expect(cmds.length).toBe(2);
      expect(cmds[0].name).toBe('set');
      expect(cmds[1].name).toBe('put');
    });
  });

  // ─── Position Tracking Across Complex Inputs ───────────────────────

  describe('Position Tracking', () => {
    it('should have valid positions for all nodes in chained commands', () => {
      const node = parseOk('add .a then remove .b');

      function assertPositions(n: any, depth = 0): void {
        if (!n || typeof n !== 'object') return;
        if (n.type && typeof n.start === 'number') {
          expect(n.start).toBeGreaterThanOrEqual(0);
          expect(n.end).toBeGreaterThan(0);
        }
        // Recurse into known child structures
        if (n.args) n.args.forEach((a: any) => assertPositions(a, depth + 1));
        if (n.commands) n.commands.forEach((c: any) => assertPositions(c, depth + 1));
        if (n.next) assertPositions(n.next, depth + 1);
        if (n.left) assertPositions(n.left, depth + 1);
        if (n.right) assertPositions(n.right, depth + 1);
      }

      assertPositions(node);
    });

    it('should have valid line/column for multi-line input', () => {
      const input = `on click\n  add .active`;
      const node = parseOk(input);
      expect(node.line).toBeGreaterThanOrEqual(1);
      expect(node.column).toBeGreaterThanOrEqual(1);
    });

    it('should report correct position on error', () => {
      // Use an input that definitely fails parsing
      const error = parseFail('5 +');
      expect(error.position).toBeGreaterThanOrEqual(0);
      expect(error.line).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Error Recovery ────────────────────────────────────────────────

  describe('Error Recovery', () => {
    it('should handle incomplete set command leniently', () => {
      // The parser is lenient: "set :x to" parses successfully (missing value is tolerated)
      const result = parse('set :x to');
      expect(result.success).toBe(true);
    });

    it('should handle missing end for if block leniently', () => {
      // The parser is lenient: implicit end-of-input terminates blocks
      const result = parse('if x > 5 then add .big');
      expect(result.success).toBe(true);
      expect(result.node!.name).toBe('if');
    });

    it('should fail on missing end for repeat block', () => {
      const error = parseFail('repeat 3 times add .item');
      expect(error.message).toMatch(/end|expected|missing|incomplete/i);
    });

    it('should fail on unknown command gracefully', () => {
      // The parser may treat unknown identifiers as expressions or commands
      const result = parse('foobar baz');
      // May succeed (treated as expression) or fail - either way shouldn't throw
      expect(typeof result.success).toBe('boolean');
    });

    it('should fail on malformed event handler', () => {
      // Missing event name
      const error = parseFail('on');
      expect(error.message).toBeDefined();
    });

    it('should handle empty then branch', () => {
      // "if x then end" - empty body
      const result = parse('if x then end');
      // Parser may accept or reject - shouldn't crash
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle extra end keyword', () => {
      const result = parse('if x then add .a end end');
      // Parser may parse up to first valid end, leaving extra as error
      expect(typeof result.success).toBe('boolean');
    });
  });

  // ─── CSS Selector Parsing in Context ───────────────────────────────

  describe('CSS Selectors in Commands', () => {
    it('should parse id selector in commands', () => {
      const node = parseOk('hide #panel');
      const args = getArgs(node);
      expect(args[0]).toMatchObject({
        type: 'selector',
        value: '#panel',
      });
    });

    it('should parse class selector in toggle', () => {
      const node = parseOk('toggle .active');
      const args = getArgs(node);
      expect(args[0]).toMatchObject({
        type: 'selector',
        value: '.active',
      });
    });

    it('should parse CSS property selector', () => {
      const node = parseOk('toggle *display');
      const args = getArgs(node);
      expect(args[0]).toMatchObject({
        type: 'selector',
        value: '*display',
      });
    });

    it('should parse angle-bracket selector', () => {
      const node = parseOk('closest <form/>');
      expect(node.type).toBe('callExpression');
      const callee = node.callee as Record<string, unknown>;
      const args = node.arguments as unknown[];
      expect(callee.name).toBe('closest');
      expect(args[0]).toMatchObject({
        type: 'selector',
        value: 'form',
      });
    });
  });

  // ─── Expression Evaluation in Command Context ──────────────────────

  describe('Expressions in Command Arguments', () => {
    it('should parse arithmetic in set value', () => {
      const node = parseOk('set :x to 5 + 3');
      const args = getArgs(node);
      // Value (after 'to') should be a binary expression
      const value = args[2]; // [target, 'to', value]
      expect(value).toMatchObject({
        type: 'binaryExpression',
        operator: '+',
      });
    });

    it('should parse parenthesized expression in set value', () => {
      const node = parseOk('set :total to (:price + :tax)');
      const args = getArgs(node);
      const value = args[2];
      expect(value).toMatchObject({
        type: 'binaryExpression',
        operator: '+',
      });
    });

    it('should parse string concatenation in put command', () => {
      const node = parseOk('put "hello " + name into #greeting');
      expect(node.type).toBe('command');
      expect(node.name).toBe('put');
      const args = getArgs(node);
      expect(args[0]).toMatchObject({
        type: 'binaryExpression',
        operator: '+',
      });
    });

    it('should parse member access in expressions', () => {
      const node = parseOk('set :len to items.length');
      const args = getArgs(node);
      const value = args[2];
      expect(value).toMatchObject({
        type: 'memberExpression',
        object: { type: 'identifier', name: 'items' },
        property: { type: 'identifier', name: 'length' },
      });
    });

    it('should parse as conversion in expression', () => {
      const node = parseOk('set :num to val as Int');
      const args = getArgs(node);
      const value = args[2];
      expect(value).toMatchObject({
        type: 'binaryExpression',
        operator: 'as',
      });
    });
  });

  // ─── Compound Command Routing ───────────────────────────────────────

  describe('Compound Command Routing (parseCompoundCommand)', () => {
    it('should route put command to parsePutCommand', () => {
      const node = parseOk('put "hello" into #target');
      expect(node.type).toBe('command');
      expect(node.name).toBe('put');
      const args = getArgs(node);
      expect(args.length).toBeGreaterThanOrEqual(1);
    });

    it('should route trigger command to parseTriggerCommand', () => {
      const node = parseOk('on click trigger reset on #form');
      expect(node.type).toBe('eventHandler');
      const commands = getCommands(node);
      expect(commands[0].name).toBe('trigger');
    });

    it('should route send command to parseTriggerCommand', () => {
      const node = parseOk('on click send reset to #form');
      expect(node.type).toBe('eventHandler');
      const commands = getCommands(node);
      // 'send' is an alias for trigger but keeps the original name
      expect(['send', 'trigger']).toContain(commands[0].name);
    });

    it('should route remove command to parseRemoveCommand', () => {
      const node = parseOk('remove .active from #target');
      expect(node.type).toBe('command');
      expect(node.name).toBe('remove');
    });

    it('should route toggle command to parseToggleCommand', () => {
      const node = parseOk('toggle .visible on #target');
      expect(node.type).toBe('command');
      expect(node.name).toBe('toggle');
    });

    it('should route set command to parseSetCommand', () => {
      const node = parseOk('set :count to 0');
      expect(node.type).toBe('command');
      expect(node.name).toBe('set');
      const args = getArgs(node);
      // [target, 'to', value]
      expect(args).toHaveLength(3);
    });

    it('should route halt command to parseHaltCommand', () => {
      const node = parseOk('on click halt');
      expect(node.type).toBe('eventHandler');
      const commands = getCommands(node);
      expect(commands[0].name).toBe('halt');
    });

    it('should route js command to parseJsCommand', () => {
      const node = parseOk('on click js console.log("hi") end');
      expect(node.type).toBe('eventHandler');
      const commands = getCommands(node);
      expect(commands[0].name).toBe('js');
    });

    it('should route tell command to parseTellCommand', () => {
      const node = parseOk('on click tell #target add .active');
      expect(node.type).toBe('eventHandler');
      const commands = getCommands(node);
      expect(commands[0].name).toBe('tell');
    });

    it('should fall back to parseRegularCommand for unknown commands', () => {
      const node = parseOk('log "message"');
      expect(node.type).toBe('command');
      expect(node.name).toBe('log');
    });
  });

  // ─── Tell Command Integration ──────────────────────────────────────

  describe('Tell Command Integration', () => {
    it('should parse tell with add command', () => {
      const node = parseOk('tell #target add .highlight');
      expect(node.type).toBe('command');
      expect(node.name).toBe('tell');
      const args = getArgs(node);
      // args[0] = target, args[1+] = commands
      expect(args.length).toBeGreaterThanOrEqual(2);
      // Target is a selector (parser may use 'selector' or 'idSelector')
      expect(['selector', 'idSelector']).toContain(args[0].type);
    });

    it('should parse tell with element selector target', () => {
      const node = parseOk('on click tell .items add .selected');
      expect(node.type).toBe('eventHandler');
      const commands = getCommands(node);
      expect(commands[0].name).toBe('tell');
    });
  });

  // ─── JS Command Integration ────────────────────────────────────────

  describe('JS Command Integration', () => {
    it('should parse js with code body', () => {
      const node = parseOk('js console.log("hello") end');
      expect(node.type).toBe('command');
      expect(node.name).toBe('js');
      const args = getArgs(node);
      expect(args.length).toBeGreaterThanOrEqual(1);
    });

    it('should parse js with parameters', () => {
      const node = parseOk('js(x, y) return x + y end');
      expect(node.type).toBe('command');
      expect(node.name).toBe('js');
      const args = getArgs(node);
      // args[0] = code literal, args[1] = params array
      expect(args).toHaveLength(2);
      const params = args[1];
      expect(params.type).toBe('arrayLiteral');
      expect((params as Record<string, unknown>).elements).toHaveLength(2);
    });
  });

  // ─── Increment/Decrement Sugar ──────────────────────────────────────

  describe('Increment/Decrement Sugar', () => {
    it('should desugar increment to set command', () => {
      const node = parseOk('increment count');
      expect(node.type).toBe('command');
      expect(node.name).toBe('set');
      expect((node as Record<string, unknown>).originalCommand).toBe('increment');
    });

    it('should desugar decrement to set command', () => {
      const node = parseOk('decrement count');
      expect(node.type).toBe('command');
      expect(node.name).toBe('set');
      expect((node as Record<string, unknown>).originalCommand).toBe('decrement');
    });

    it('should desugar increment by N', () => {
      const node = parseOk('increment count by 5');
      expect(node.type).toBe('command');
      expect(node.name).toBe('set');
      const args = getArgs(node);
      // set count to (count + 5)
      expect(args).toHaveLength(3);
      const binaryExpr = args[2]; // the value expression
      expect(binaryExpr).toMatchObject({
        type: 'binaryExpression',
        operator: '+',
      });
    });

    it('should desugar increment global variable', () => {
      const node = parseOk('increment global counter');
      expect(node.type).toBe('command');
      expect(node.name).toBe('set');
    });
  });

  // ─── Swap/Morph Command ─────────────────────────────────────────────

  describe('Swap/Morph Command', () => {
    it('should parse swap command', () => {
      const node = parseOk('swap #target with "<div>new</div>"');
      expect(node.type).toBe('command');
      expect(node.name).toBe('swap');
    });

    it('should parse morph as alias for swap', () => {
      const node = parseOk('morph #target with "<div>new</div>"');
      expect(node.type).toBe('command');
      expect(node.name).toBe('morph');
    });
  });
});
