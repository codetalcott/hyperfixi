/**
 * Test Suite for Hybrid Parser Core
 *
 * Tests the recursive descent parser with operator precedence.
 * The HybridParser is self-contained: instantiate with code, call parse().
 */

import { describe, it, expect } from 'vitest';
import { HybridParser } from './parser-core';

describe('HybridParser', () => {
  // Helper to parse and return the AST
  function parse(code: string) {
    return new HybridParser(code).parse();
  }

  describe('event handlers', () => {
    it('should parse basic event handler', () => {
      const ast = parse('on click toggle .active');
      expect(ast.type).toBe('event');
      expect(ast.event).toBe('click');
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0].name).toBe('toggle');
    });

    it('should parse event handler with .once modifier', () => {
      const ast = parse('on click .once toggle .active');
      expect(ast.type).toBe('event');
      expect(ast.modifiers.once).toBe(true);
    });

    it('should parse event handler with .prevent modifier', () => {
      const ast = parse('on click .prevent toggle .active');
      expect(ast.modifiers.prevent).toBe(true);
    });

    it('should parse event handler with .stop modifier', () => {
      const ast = parse('on click .stop toggle .active');
      expect(ast.modifiers.stop).toBe(true);
    });

    it('should parse event handler with .debounce(N)', () => {
      const ast = parse('on input .debounce(300) set :val to me');
      expect(ast.modifiers.debounce).toBe(300);
    });

    it('should parse event handler with .throttle(N)', () => {
      const ast = parse('on scroll .throttle(100) log me');
      expect(ast.modifiers.throttle).toBe(100);
    });

    it('should parse event handler with from clause', () => {
      const ast = parse('on click from #button toggle .active');
      expect(ast.type).toBe('event');
      expect(ast.filter).toBeDefined();
      expect(ast.filter.type).toBe('selector');
    });

    it('should parse init handler', () => {
      const ast = parse('init add .loaded to me');
      expect(ast.type).toBe('event');
      expect(ast.event).toBe('init');
    });

    it('should normalize event aliases', () => {
      const ast = parse('on clicked toggle .active');
      expect(ast.event).toBe('click');
    });
  });

  describe('every handler', () => {
    it('should parse every handler with interval', () => {
      const ast = parse('every 2s log me');
      expect(ast.type).toBe('event');
      expect(ast.event).toBe('interval:2s');
    });
  });

  describe('command sequence', () => {
    it('should parse single command', () => {
      const ast = parse('toggle .active');
      expect(ast.type).toBe('sequence');
      expect(ast.commands).toHaveLength(1);
    });

    it('should parse commands chained with then', () => {
      const ast = parse('on click add .loading then wait 1s then remove .loading');
      expect(ast.body).toHaveLength(3);
    });

    it('should parse commands chained with and', () => {
      const ast = parse('on click add .one and add .two');
      expect(ast.body).toHaveLength(2);
    });
  });

  describe('toggle command', () => {
    it('should parse toggle with class', () => {
      const ast = parse('toggle .active');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('toggle');
      expect(cmd.args[0].type).toBe('selector');
    });

    it('should parse toggle with target', () => {
      const ast = parse('toggle .active on #btn');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('toggle');
      expect(cmd.target).toBeDefined();
      expect(cmd.target.value).toBe('#btn');
    });

    it('should resolve command aliases (flip -> toggle)', () => {
      const ast = parse('flip .active');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('toggle');
    });
  });

  describe('add command', () => {
    it('should parse add with class', () => {
      const ast = parse('add .active');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('add');
    });

    it('should parse add with target', () => {
      const ast = parse('add .active to #btn');
      const cmd = ast.commands[0];
      expect(cmd.target).toBeDefined();
    });
  });

  describe('remove command', () => {
    it('should parse remove class (selector argument)', () => {
      const ast = parse('remove .active');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('removeClass');
    });

    it('should parse remove class from target', () => {
      const ast = parse('remove .active from #el');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('removeClass');
      expect(cmd.target).toBeDefined();
    });

    it('should parse remove element (non-selector argument)', () => {
      const ast = parse('remove me');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('remove');
    });
  });

  describe('put command', () => {
    it('should parse put into', () => {
      const ast = parse('put "hello" into #el');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('put');
      expect(cmd.modifier).toBe('into');
    });

    it('should parse put before', () => {
      const ast = parse('put "hello" before #el');
      const cmd = ast.commands[0];
      expect(cmd.modifier).toBe('before');
    });

    it('should parse put after', () => {
      const ast = parse('put "hello" after #el');
      const cmd = ast.commands[0];
      expect(cmd.modifier).toBe('after');
    });

    it('should parse put at start of', () => {
      const ast = parse('put "hello" at start of #el');
      const cmd = ast.commands[0];
      expect(cmd.modifier).toBe('at start of');
    });
  });

  describe('set command', () => {
    it('should parse set with to', () => {
      const ast = parse('set :count to 0');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('set');
      expect(cmd.args).toHaveLength(2);
    });

    it('should parse set without to', () => {
      const ast = parse('set :count');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('set');
      expect(cmd.args).toHaveLength(1);
    });
  });

  describe('log command', () => {
    it('should parse log with single arg', () => {
      const ast = parse('log me');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('log');
      expect(cmd.args).toHaveLength(1);
    });

    it('should parse log with multiple comma-separated args', () => {
      const ast = parse('log "hello", :count');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('log');
      expect(cmd.args).toHaveLength(2);
    });
  });

  describe('send/trigger command', () => {
    it('should parse send event', () => {
      const ast = parse('send myEvent');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('send');
    });

    it('should parse send event to target', () => {
      const ast = parse('send myEvent to #btn');
      const cmd = ast.commands[0];
      expect(cmd.target).toBeDefined();
    });

    it('should parse trigger as send', () => {
      const ast = parse('trigger myEvent');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('send');
    });
  });

  describe('wait command', () => {
    it('should parse wait with time', () => {
      const ast = parse('wait 1s');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('wait');
    });

    it('should parse wait for event', () => {
      const ast = parse('wait for transitionend');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('waitFor');
    });

    it('should parse wait for event from target', () => {
      const ast = parse('wait for transitionend from #el');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('waitFor');
      expect(cmd.target).toBeDefined();
    });
  });

  describe('show/hide commands', () => {
    it('should parse show', () => {
      const ast = parse('show #panel');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('show');
    });

    it('should parse hide', () => {
      const ast = parse('hide #panel');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('hide');
    });

    it('should parse show with when condition', () => {
      const ast = parse('show #panel when :isOpen');
      const cmd = ast.commands[0];
      expect(cmd.modifiers).toBeDefined();
      expect(cmd.modifiers.when).toBeDefined();
    });
  });

  describe('take command', () => {
    it('should parse take with class', () => {
      const ast = parse('take .active');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('take');
    });

    it('should parse take from target', () => {
      const ast = parse('take .active from .siblings');
      const cmd = ast.commands[0];
      expect(cmd.target).toBeDefined();
    });
  });

  describe('increment/decrement commands', () => {
    it('should parse increment', () => {
      const ast = parse('increment :count');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('increment');
      expect(cmd.args).toHaveLength(2);
      expect(cmd.args[1].value).toBe(1); // default amount
    });

    it('should parse decrement', () => {
      const ast = parse('decrement :count');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('decrement');
    });

    it('should parse increment by amount', () => {
      const ast = parse('increment :count by 5');
      const cmd = ast.commands[0];
      expect(cmd.args[1].value).toBe(5);
    });
  });

  describe('focus/blur commands', () => {
    it('should parse focus', () => {
      const ast = parse('focus #input');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('focus');
    });

    it('should parse blur', () => {
      const ast = parse('blur #input');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('blur');
    });

    it('should parse focus without target', () => {
      const ast = parse('focus');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('focus');
      expect(cmd.target).toBeUndefined();
    });
  });

  describe('go command', () => {
    it('should parse go to url', () => {
      const ast = parse('go to "/page"');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('go');
    });
  });

  describe('return command', () => {
    it('should parse return with value', () => {
      const ast = parse('return :result');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('return');
      expect(cmd.args).toHaveLength(1);
    });

    it('should parse return without value', () => {
      const ast = parse('return');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('return');
      expect(cmd.args).toHaveLength(0);
    });
  });

  describe('transition command', () => {
    it('should parse transition with property and value', () => {
      const ast = parse('transition opacity to 1');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('transition');
    });

    it('should parse transition with over duration', () => {
      const ast = parse('transition opacity to 1 over 300ms');
      const cmd = ast.commands[0];
      expect(cmd.args).toHaveLength(3);
    });

    it('should parse transition with my keyword', () => {
      const ast = parse('transition my opacity to 0');
      const cmd = ast.commands[0];
      expect(cmd.target).toBeDefined();
    });
  });

  describe('control flow: if/unless', () => {
    it('should parse if block', () => {
      const ast = parse('on click if :count > 0 log :count end');
      const ifBlock = ast.body[0];
      expect(ifBlock.type).toBe('if');
      expect(ifBlock.condition).toBeDefined();
      expect(ifBlock.body).toHaveLength(1);
    });

    it('should parse if/else block', () => {
      const ast = parse('on click if :count > 0 log :count else log "zero" end');
      const ifBlock = ast.body[0];
      expect(ifBlock.elseBody).toBeDefined();
      expect(ifBlock.elseBody).toHaveLength(1);
    });

    it('should parse unless block', () => {
      const ast = parse('on click unless :disabled log "clicked" end');
      const block = ast.body[0];
      expect(block.type).toBe('if');
      expect(block.condition.type).toBe('unary');
      expect(block.condition.operator).toBe('not');
    });
  });

  describe('control flow: repeat', () => {
    it('should parse repeat N times', () => {
      const ast = parse('on click repeat 3 times log "hi" end');
      const block = ast.body[0];
      expect(block.type).toBe('repeat');
      expect(block.condition).toBeDefined();
    });

    it('should parse repeat without count', () => {
      const ast = parse('on click repeat forever log "hi" end');
      const block = ast.body[0];
      expect(block.type).toBe('repeat');
    });
  });

  describe('control flow: for', () => {
    it('should parse for each in', () => {
      const ast = parse('on click for each item in .items log item end');
      const block = ast.body[0];
      expect(block.type).toBe('for');
      expect(block.condition.variable).toBe('item');
    });

    it('should parse for without each', () => {
      const ast = parse('on click for item in .items log item end');
      const block = ast.body[0];
      expect(block.type).toBe('for');
    });
  });

  describe('control flow: while', () => {
    it('should parse while block', () => {
      const ast = parse('on click while :running log "tick" end');
      const block = ast.body[0];
      expect(block.type).toBe('while');
      expect(block.condition).toBeDefined();
    });
  });

  describe('control flow: fetch', () => {
    it('should parse fetch block', () => {
      const ast = parse('on click fetch "/api/data" as json then log it end');
      const block = ast.body[0];
      expect(block.type).toBe('fetch');
      expect(block.condition.url).toBeDefined();
      expect(block.condition.responseType).toBeDefined();
    });

    it('should parse fetch without as', () => {
      const ast = parse('on click fetch "/api/data" then log it end');
      const block = ast.body[0];
      expect(block.type).toBe('fetch');
    });
  });

  describe('expressions: binary operators', () => {
    it('should parse or expressions', () => {
      const ast = parse('set :r to :a or :b');
      const cmd = ast.commands[0];
      const value = cmd.args[1];
      expect(value.type).toBe('binary');
      expect(value.operator).toBe('or');
    });

    it('should parse and expressions', () => {
      const ast = parse('set :r to :a and :b');
      const cmd = ast.commands[0];
      const value = cmd.args[1];
      expect(value.type).toBe('binary');
      expect(value.operator).toBe('and');
    });

    it('should parse equality', () => {
      const ast = parse('set :r to :a == :b');
      const value = ast.commands[0].args[1];
      expect(value.type).toBe('binary');
      expect(value.operator).toBe('==');
    });

    it('should parse is not', () => {
      const ast = parse('set :r to :a is not :b');
      const value = ast.commands[0].args[1];
      expect(value.operator).toBe('is not');
    });

    it('should parse comparison', () => {
      const ast = parse('set :r to :a < :b');
      const value = ast.commands[0].args[1];
      expect(value.type).toBe('binary');
    });

    it('should parse arithmetic', () => {
      const ast = parse('set :r to :a + :b');
      const value = ast.commands[0].args[1];
      expect(value.type).toBe('binary');
      expect(value.operator).toBe('+');
    });

    it('should parse multiplication', () => {
      const ast = parse('set :r to :a * :b');
      const value = ast.commands[0].args[1];
      expect(value.operator).toBe('*');
    });
  });

  describe('expressions: unary', () => {
    it('should parse not', () => {
      const ast = parse('set :r to not :a');
      const value = ast.commands[0].args[1];
      expect(value.type).toBe('unary');
      expect(value.operator).toBe('not');
    });

    it('should parse negative number', () => {
      const ast = parse('set :r to -5');
      const value = ast.commands[0].args[1];
      expect(value.type).toBe('literal');
      expect(value.value).toBe(-5);
    });
  });

  describe('expressions: postfix', () => {
    it("should parse possessive 's", () => {
      const ast = parse("set :r to #el's textContent");
      const value = ast.commands[0].args[1];
      expect(value.type).toBe('possessive');
    });

    it('should parse member access with dot', () => {
      const ast = parse('set :r to result.name');
      const value = ast.commands[0].args[1];
      expect(value.type).toBe('member');
    });

    it('should parse function call', () => {
      const ast = parse('set :r to str.toUpperCase()');
      const value = ast.commands[0].args[1];
      // str -> member -> call
      expect(value.type).toBe('call');
    });

    it('should parse array index', () => {
      const ast = parse('set :r to items[0]');
      const value = ast.commands[0].args[1];
      expect(value.type).toBe('member');
      expect(value.computed).toBe(true);
    });
  });

  describe('expressions: primary', () => {
    it('should parse number literals', () => {
      const ast = parse('set :r to 42');
      expect(ast.commands[0].args[1].value).toBe(42);
    });

    it('should parse string literals', () => {
      const ast = parse('set :r to "hello"');
      expect(ast.commands[0].args[1].value).toBe('hello');
    });

    it('should parse boolean true', () => {
      const ast = parse('set :r to true');
      expect(ast.commands[0].args[1].value).toBe(true);
    });

    it('should parse boolean false', () => {
      const ast = parse('set :r to false');
      expect(ast.commands[0].args[1].value).toBe(false);
    });

    it('should parse null', () => {
      const ast = parse('set :r to null');
      expect(ast.commands[0].args[1].value).toBe(null);
    });

    it('should parse undefined', () => {
      const ast = parse('set :r to undefined');
      expect(ast.commands[0].args[1].value).toBe(undefined);
    });

    it('should parse local variables', () => {
      const ast = parse('set :r to :count');
      const value = ast.commands[0].args[1];
      expect(value.type).toBe('variable');
      expect(value.scope).toBe('local');
    });

    it('should parse global variables', () => {
      const ast = parse('set :r to $total');
      const value = ast.commands[0].args[1];
      expect(value.type).toBe('variable');
      expect(value.scope).toBe('global');
    });

    it('should parse CSS selectors', () => {
      const ast = parse('toggle .active');
      expect(ast.commands[0].args[0].type).toBe('selector');
    });

    it('should parse me/it/you references', () => {
      expect(parse('log me').commands[0].args[0].value).toBe('me');
      expect(parse('log it').commands[0].args[0].value).toBe('it');
      expect(parse('log you').commands[0].args[0].value).toBe('you');
    });

    it('should parse my property access', () => {
      const ast = parse('set :r to my value');
      const value = ast.commands[0].args[1];
      expect(value.type).toBe('possessive');
      expect(value.object.value).toBe('me');
      expect(value.property).toBe('value');
    });

    it('should parse its property access', () => {
      const ast = parse('set :r to its value');
      const value = ast.commands[0].args[1];
      expect(value.type).toBe('possessive');
      expect(value.object.value).toBe('it');
    });

    it('should parse positional: first', () => {
      const ast = parse('set :r to first .item');
      const value = ast.commands[0].args[1];
      expect(value.type).toBe('positional');
      expect(value.position).toBe('first');
    });

    it('should parse positional: the last', () => {
      const ast = parse('set :r to the last .item');
      const value = ast.commands[0].args[1];
      expect(value.type).toBe('positional');
      expect(value.position).toBe('last');
    });

    it('should parse parenthesized expressions', () => {
      const ast = parse('set :r to (1 + 2)');
      const value = ast.commands[0].args[1];
      expect(value.type).toBe('binary');
    });

    it('should parse object literals', () => {
      const ast = parse('set :r to {name: "test"}');
      const value = ast.commands[0].args[1];
      expect(value.type).toBe('object');
      expect(value.properties).toHaveLength(1);
    });

    it('should parse array literals', () => {
      const ast = parse('set :r to [1, 2, 3]');
      const value = ast.commands[0].args[1];
      expect(value.type).toBe('array');
      expect(value.elements).toHaveLength(3);
    });

    it('should parse number with ms unit', () => {
      const ast = parse('wait 300ms');
      const arg = ast.commands[0].args[0];
      expect(arg.value).toBe(300);
      expect(arg.unit).toBe('ms');
    });

    it('should parse number with s unit (converts to ms)', () => {
      const ast = parse('wait 2s');
      const arg = ast.commands[0].args[0];
      expect(arg.value).toBe(2000);
      expect(arg.unit).toBe('ms');
    });
  });

  describe('command dispatch', () => {
    it('should skip unknown tokens without crashing', () => {
      // Parser should advance past unknown tokens and return null
      const ast = parse('on click @ then toggle .active');
      expect(ast.type).toBe('event');
    });
  });

  describe('get command', () => {
    it('should parse get', () => {
      const ast = parse('get #el');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('get');
    });
  });

  describe('call command', () => {
    it('should parse call', () => {
      const ast = parse('call myFunc()');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('call');
    });
  });

  describe('append command', () => {
    it('should parse append with target', () => {
      const ast = parse('append "text" to #list');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('append');
      expect(cmd.target).toBeDefined();
    });
  });

  describe('prepend command', () => {
    it('should parse prepend with target', () => {
      const ast = parse('prepend "text" to #list');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('prepend');
      expect(cmd.target).toBeDefined();
    });

    it('should parse prepend without target', () => {
      const ast = parse('prepend "text"');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('prepend');
      expect(cmd.target).toBeUndefined();
    });
  });

  describe('halt command', () => {
    it('should parse bare halt', () => {
      const ast = parse('halt');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('halt');
      expect(cmd.args).toHaveLength(0);
    });

    it('should parse halt the event', () => {
      const ast = parse('halt the event');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('halt');
      expect(cmd.args).toHaveLength(0);
    });

    it('should parse halt the default', () => {
      const ast = parse('halt the default');
      const cmd = ast.commands[0];
      expect(cmd.name).toBe('halt');
    });

    it('should parse halt in event handler sequence', () => {
      const ast = parse('on submit halt the event then log "submitted"');
      expect(ast.body).toHaveLength(2);
      expect(ast.body[0].name).toBe('halt');
      expect(ast.body[1].name).toBe('log');
    });
  });

  describe('fetch with via clause', () => {
    it('should parse fetch with via POST', () => {
      const ast = parse('on click fetch "/api/data" via POST as html then log it end');
      const block = ast.body[0];
      expect(block.type).toBe('fetch');
      expect(block.condition.method).toBeDefined();
    });

    it('should parse fetch with via and with clauses', () => {
      const ast = parse('on click fetch "/api" via POST with values of me as html then log it end');
      const block = ast.body[0];
      expect(block.type).toBe('fetch');
      expect(block.condition.method).toBeDefined();
      expect(block.condition.options).toBeDefined();
    });

    it('should parse fetch with all clauses in any order', () => {
      const ast = parse('on click fetch "/api" as json via PUT then log it end');
      const block = ast.body[0];
      expect(block.type).toBe('fetch');
      expect(block.condition.method).toBeDefined();
    });
  });

  describe('values of expression', () => {
    it('should parse values of me', () => {
      const ast = parse('set :data to values of me');
      const value = ast.commands[0].args[1];
      expect(value.type).toBe('valuesOf');
      expect(value.target.value).toBe('me');
    });

    it('should parse values of selector', () => {
      const ast = parse('set :data to values of #my-form');
      const value = ast.commands[0].args[1];
      expect(value.type).toBe('valuesOf');
      expect(value.target.value).toBe('#my-form');
    });

    it('should parse my values as possessive', () => {
      const ast = parse('set :data to my values');
      const value = ast.commands[0].args[1];
      expect(value.type).toBe('possessive');
      expect(value.object.value).toBe('me');
      expect(value.property).toBe('values');
    });

    it('should parse its values as possessive', () => {
      const ast = parse('set :data to its values');
      const value = ast.commands[0].args[1];
      expect(value.type).toBe('possessive');
      expect(value.object.value).toBe('it');
      expect(value.property).toBe('values');
    });

    it("should parse #form's values as possessive", () => {
      const ast = parse("set :data to #form's values");
      const value = ast.commands[0].args[1];
      expect(value.type).toBe('possessive');
      expect(value.object.value).toBe('#form');
      expect(value.property).toBe('values');
    });
  });

  /**
   * `catch`/`finally` are full-parser-only. This parser used to swallow them in
   * parseCommand's skip fallback, one token at a time, which put the CATCH BODY
   * on the success path:
   *
   *   on click put 'a' into #r catch e put 'b' into #r end
   *     -> body: [put 'a' into #r, put 'b' into #r]   // both run on success
   *
   * so a failure message overwrote a successful render. It now throws, which the
   * bundle entry points already catch and console.error with the offending code.
   */
  describe('catch/finally rejection', () => {
    const attempt = (code: string) => (): unknown => parse(code);

    it('rejects a catch block on an event handler', () => {
      expect(
        attempt(`on click
          put 'a' into #r
        catch e
          put 'b' into #r
        end`)
      ).toThrow(/'catch' needs the full parser/);
    });

    it('rejects finally with no catch', () => {
      expect(
        attempt(`on click
          log 'a'
        finally
          log 'b'
        end`)
      ).toThrow(/'finally' needs the full parser/);
    });

    it('rejects catch nested inside an if body', () => {
      // Every block routes through parseCommandSequence -> parseCommand, so the
      // one guard covers if/repeat/for/while/fetch as well as the top level.
      expect(attempt("on click if true log 'a' catch e log e end end")).toThrow(
        /'catch' needs the full parser/
      );
    });

    it('no longer appends the catch body to the success path', () => {
      // Pre-fix this returned a body of length 2, both puts on the success path.
      expect(attempt("on click put 'a' into #r catch e put 'b' into #r end")).toThrow();
    });

    it('names the remedy, not just the problem', () => {
      expect(attempt("on click log 'a' catch e log e end")).toThrow(/hyperfixi\.js/);
    });

    it('leaves a .catch class selector alone', () => {
      // `.catch` lexes as a selector token, so it never reaches the guard.
      expect(attempt('on click toggle .catch')).not.toThrow();
      expect(parse('on click toggle .catch').body[0].name).toBe('toggle');
    });

    it('leaves catch as a variable name alone', () => {
      // `set` consumes its own operands before the fallback is reached.
      expect(attempt('set catch to 1')).not.toThrow();
    });
  });
});
