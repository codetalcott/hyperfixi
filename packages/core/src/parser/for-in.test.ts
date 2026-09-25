/**
 * Tests for for...in loop syntax
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { parse } from './parser';
import { hyperscript } from '../api/hyperscript-api';

describe('For...in Loop Syntax', () => {
  it('should parse basic for...in loop', () => {
    const code = `on click
  for item in items
    log item
  end
end`;
    const result = parse(code);
    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
  });

  it('should parse for each...in loop', () => {
    const code = `on click
  for each entry in history
    log entry
  end
end`;
    const result = parse(code);
    expect(result.error).toBeUndefined();
  });

  it('should parse for...in with local variable collection', () => {
    const code = `on click
  for entry in :history
    log entry
  end
end`;
    const result = parse(code);
    expect(result.error).toBeUndefined();
  });

  it('should parse for...in with CSS selector collection', () => {
    const code = `on click
  for box in .state-box
    remove .active from box
  end
end`;
    const result = parse(code);
    expect(result.error).toBeUndefined();
  });

  it('should parse for...in with index variable', () => {
    const code = `on click
  for item in items index i
    log i
    log item
  end
end`;
    const result = parse(code);
    expect(result.error).toBeUndefined();
  });
});

describe('For...in loops run', () => {
  // Every test above asserts only that the source PARSES — and every bare
  // `for` parsed clean while it threw "repeat command requires a loop type"
  // at run time: the parser emitted the pre-slot node shape RepeatCommand no
  // longer reads. `repeat for` was fine, which is why nothing noticed.
  beforeEach(() => {
    document.body.innerHTML =
      '<button id="btn"></button><ul id="l"><li class="c"></li><li class="c"></li><li class="c"></li></ul><div id="out"></div>';
  });
  const run = async (src: string) => {
    const btn = document.getElementById('btn')!;
    await hyperscript.eval(src, btn);
    btn.click();
    await new Promise(resolve => setTimeout(resolve, 20));
    return document.getElementById('out')!.textContent;
  };

  it.each([
    ['on click for x in [1, 2, 3] put x at end of #out end', '123'],
    ['on click for item in <.c/> index i put i at end of #out end', '012'],
    ['on click for each x in [1, 2] put x at end of #out end', '12'],
    // The same loop spelled `repeat for` — the two must agree.
    ['on click repeat for x in [1, 2, 3] put x at end of #out end', '123'],
  ])('%s', async (src, expected) => {
    expect(await run(src)).toBe(expected);
  });

  it('parses to the node `repeat for` builds', () => {
    const shape = (src: string) =>
      JSON.stringify((parse(src).node as { commands: unknown[] }).commands, (k, v) =>
        ['start', 'end', 'line', 'column'].includes(k) ? undefined : v
      );
    expect(shape('on click for x in [1, 2] index i log x end')).toBe(
      shape('on click repeat for x in [1, 2] index i log x end')
    );
  });
});
