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
    const result1 = hyperscript.run('"hello world" includes "world"', {
      me: mockElement,
    } as unknown as import('./types/core').ExecutionContext);
    expect(await result1).toBe(true);

    const result2 = hyperscript.run('"hello world" includes "xyz"', {
      me: mockElement,
    } as unknown as import('./types/core').ExecutionContext);
    expect(await result2).toBe(false);

    // Test array includes
    const result3 = hyperscript.run('["a", "b", "c"] includes "b"', {
      me: mockElement,
    } as unknown as import('./types/core').ExecutionContext);
    expect(await result3).toBe(true);

    const result4 = hyperscript.run('["a", "b", "c"] includes "x"', {
      me: mockElement,
    } as unknown as import('./types/core').ExecutionContext);
    expect(await result4).toBe(false);
  });

  it('should evaluate include expressions correctly', async () => {
    // Test string include (singular form)
    const result1 = hyperscript.run('"hello world" include "world"', {
      me: mockElement,
    } as unknown as import('./types/core').ExecutionContext);
    expect(await result1).toBe(true);

    const result2 = hyperscript.run('"hello world" include "xyz"', {
      me: mockElement,
    } as unknown as import('./types/core').ExecutionContext);
    expect(await result2).toBe(false);
  });

  it('should evaluate does not include expressions correctly', async () => {
    // Test does not include
    const result1 = hyperscript.run('"hello world" does not include "xyz"', {
      me: mockElement,
    } as unknown as import('./types/core').ExecutionContext);
    expect(await result1).toBe(true);

    const result2 = hyperscript.run('"hello world" does not include "world"', {
      me: mockElement,
    } as unknown as import('./types/core').ExecutionContext);
    expect(await result2).toBe(false);

    // Test array does not include
    const result3 = hyperscript.run('["a", "b", "c"] does not include "x"', {
      me: mockElement,
    } as unknown as import('./types/core').ExecutionContext);
    expect(await result3).toBe(true);

    const result4 = hyperscript.run('["a", "b", "c"] does not include "b"', {
      me: mockElement,
    } as unknown as import('./types/core').ExecutionContext);
    expect(await result4).toBe(false);
  });

  it('should work in complex expressions', async () => {
    // Test includes in conditional expressions
    const result1 = hyperscript.run(
      '["apple", "banana"] includes "apple" and "hello" includes "ell"',
      { me: mockElement } as unknown as import('./types/core').ExecutionContext
    );
    expect(await result1).toBe(true);

    const result2 = hyperscript.run(
      '["apple", "banana"] includes "cherry" or "hello" includes "ell"',
      { me: mockElement } as unknown as import('./types/core').ExecutionContext
    );
    expect(await result2).toBe(true);

    const result3 = hyperscript.run(
      '["apple", "banana"] includes "cherry" and "hello" includes "xyz"',
      { me: mockElement } as unknown as import('./types/core').ExecutionContext
    );
    expect(await result3).toBe(false);
  });
});
