/**
 * Integration test for includes operator in hyperscript expressions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { hyperscript } from './api/hyperscript-api';
import { createMockHyperscriptContext } from './test-setup';

describe('Includes Integration Test', () => {
  let mockElement: HTMLElement;

  beforeEach(() => {
    // Create a mock DOM element for testing
    mockElement = document.createElement('div');
    mockElement.id = 'test-element';
    document.body.appendChild(mockElement);
  });

  it('should evaluate includes expressions correctly', async () => {
    // Test string includes
    const result1 = hyperscript.execute('"hello world" includes "world"', mockElement);
    expect(await result1).toBe(true);

    const result2 = hyperscript.execute('"hello world" includes "xyz"', mockElement);
    expect(await result2).toBe(false);

    // Test array includes
    const result3 = hyperscript.execute('["a", "b", "c"] includes "b"', mockElement);
    expect(await result3).toBe(true);

    const result4 = hyperscript.execute('["a", "b", "c"] includes "x"', mockElement);
    expect(await result4).toBe(false);
  });

  it('should evaluate include expressions correctly', async () => {
    // Test string include (singular form)
    const result1 = hyperscript.execute('"hello world" include "world"', mockElement);
    expect(await result1).toBe(true);

    const result2 = hyperscript.execute('"hello world" include "xyz"', mockElement);
    expect(await result2).toBe(false);
  });

  it('should evaluate does not include expressions correctly', async () => {
    // Test does not include
    const result1 = hyperscript.execute('"hello world" does not include "xyz"', mockElement);
    expect(await result1).toBe(true);

    const result2 = hyperscript.execute('"hello world" does not include "world"', mockElement);
    expect(await result2).toBe(false);

    // Test array does not include
    const result3 = hyperscript.execute('["a", "b", "c"] does not include "x"', mockElement);
    expect(await result3).toBe(true);

    const result4 = hyperscript.execute('["a", "b", "c"] does not include "b"', mockElement);
    expect(await result4).toBe(false);
  });

  it('should work in complex expressions', async () => {
    // Test includes in conditional expressions
    const result1 = hyperscript.execute(
      '["apple", "banana"] includes "apple" and "hello" includes "ell"',
      mockElement
    );
    expect(await result1).toBe(true);

    const result2 = hyperscript.execute(
      '["apple", "banana"] includes "cherry" or "hello" includes "ell"',
      mockElement
    );
    expect(await result2).toBe(true);

    const result3 = hyperscript.execute(
      '["apple", "banana"] includes "cherry" and "hello" includes "xyz"',
      mockElement
    );
    expect(await result3).toBe(false);
  });
});
