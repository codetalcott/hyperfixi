/**
 * Tests for for...in loop syntax
 */
import { describe, it, expect } from 'vitest';
import { parse } from './parser';

describe('For...in Loop Syntax', () => {
  it('should parse basic for...in loop', () => {
    const code = `on click
  for item in items
    log item
  end
end`;
    const result = parse(code);
    expect(result.errors?.length || 0).toBe(0);
    expect(result.success).toBe(true);
  });

  it('should parse for each...in loop', () => {
    const code = `on click
  for each entry in history
    log entry
  end
end`;
    const result = parse(code);
    expect(result.errors?.length || 0).toBe(0);
  });

  it('should parse for...in with local variable collection', () => {
    const code = `on click
  for entry in :history
    log entry
  end
end`;
    const result = parse(code);
    expect(result.errors?.length || 0).toBe(0);
  });

  it('should parse for...in with CSS selector collection', () => {
    const code = `on click
  for box in .state-box
    remove .active from box
  end
end`;
    const result = parse(code);
    expect(result.errors?.length || 0).toBe(0);
  });

  it('should parse for...in with index variable', () => {
    const code = `on click
  for item in items index i
    log i
    log item
  end
end`;
    const result = parse(code);
    expect(result.errors?.length || 0).toBe(0);
  });
});
