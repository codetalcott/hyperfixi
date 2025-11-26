/**
 * Tests for top-level init blocks and comment handling
 */
import { describe, it, expect } from 'vitest';
import { parse } from './parser';

describe('Top-level Init Blocks', () => {
  it('should parse basic init block', () => {
    const code = `init
  set x to 1
end`;
    const result = parse(code);
    expect(result.errors?.length || 0).toBe(0);
    expect(result.success).toBe(true);
  });

  it('should parse init block with comments', () => {
    const code = `init
  -- This is a comment
  set :state to 'idle'
  -- Another comment
  set :count to 0
end`;
    const result = parse(code);
    expect(result.errors?.length || 0).toBe(0);
    expect(result.success).toBe(true);
  });

  it('should parse init block followed by event handlers', () => {
    const code = `init
  -- Initialize state machine
  set :state to 'cart'
  set :orderTotal to 0
end

on checkout
  if :state is 'cart'
    set :state to 'checkout'
  end
end`;
    const result = parse(code);
    expect(result.errors?.length || 0).toBe(0);
    expect(result.success).toBe(true);
  });

  it('should parse multiple event handlers after init', () => {
    // Note: using 'countUp' and 'countDown' instead of 'increment'/'decrement'
    // because those are tokenized as COMMAND tokens, not IDENTIFIER/EVENT tokens
    const code = `init
  set :count to 0
end

on countUp
  set :count to :count + 1
end

on countDown
  set :count to :count - 1
end`;
    const result = parse(code);
    expect(result.errors?.length || 0).toBe(0);
    expect(result.success).toBe(true);
  });

  it('should parse init with for...in loops', () => {
    const code = `init
  set :history to []
end

on updateHistory
  set html to ''
  for entry in :history
    set html to html + entry
  end
end`;
    const result = parse(code);
    expect(result.errors?.length || 0).toBe(0);
    expect(result.success).toBe(true);
  });
});
