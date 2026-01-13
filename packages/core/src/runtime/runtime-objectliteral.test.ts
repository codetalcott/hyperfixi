/**
 * Tests for object literal runtime evaluation
 * Validates that object literals are properly evaluated to JavaScript objects
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Runtime } from './runtime';
import { createTypedExecutionContext } from '../test-utilities';

describe('Runtime Object Literal Evaluation', () => {
  let runtime: Runtime;

  beforeEach(() => {
    runtime = new Runtime();
  });

  it('should evaluate empty object literals', async () => {
    const context = createTypedExecutionContext();

    const node = {
      type: 'objectLiteral',
      properties: [],
    };

    const result = await runtime.execute(node, context);

    expect(result).toEqual({});
  });

  it('should evaluate simple object literals', async () => {
    const context = createTypedExecutionContext();

    const node = {
      type: 'objectLiteral',
      properties: [
        {
          key: { type: 'identifier', name: 'color' },
          value: { type: 'literal', value: 'red' },
        },
      ],
    };

    const result = await runtime.execute(node, context);

    expect(result).toEqual({
      color: 'red',
    });
  });

  it('should evaluate object literals with multiple properties', async () => {
    const context = createTypedExecutionContext();

    const node = {
      type: 'objectLiteral',
      properties: [
        {
          key: { type: 'identifier', name: 'color' },
          value: { type: 'literal', value: 'red' },
        },
        {
          key: { type: 'identifier', name: 'fontSize' },
          value: { type: 'literal', value: '14px' },
        },
        {
          key: { type: 'identifier', name: 'margin' },
          value: { type: 'literal', value: 0 },
        },
      ],
    };

    const result = await runtime.execute(node, context);

    expect(result).toEqual({
      color: 'red',
      fontSize: '14px',
      margin: 0,
    });
  });

  it('should evaluate object literals with quoted keys', async () => {
    const context = createTypedExecutionContext();

    const node = {
      type: 'objectLiteral',
      properties: [
        {
          key: { type: 'literal', value: 'background-color' },
          value: { type: 'literal', value: 'blue' },
        },
      ],
    };

    const result = await runtime.execute(node, context);

    expect(result).toEqual({
      'background-color': 'blue',
    });
  });

  it('should evaluate object literals with variable values', async () => {
    const context = createTypedExecutionContext();
    (context as { variables: Map<string, unknown> }).variables = new Map<string, unknown>([
      ['myColor', 'green'],
      ['mySize', 16],
    ]);

    const node = {
      type: 'objectLiteral',
      properties: [
        {
          key: { type: 'identifier', name: 'color' },
          value: { type: 'identifier', name: 'myColor' },
        },
        {
          key: { type: 'identifier', name: 'size' },
          value: { type: 'identifier', name: 'mySize' },
        },
      ],
    };

    const result = await runtime.execute(node, context);

    expect(result).toEqual({
      color: 'green',
      size: 16,
    });
  });

  it('should evaluate object literals with nested expressions', async () => {
    const context = createTypedExecutionContext();
    (context as { variables: Map<string, unknown> }).variables = new Map<string, unknown>([
      ['baseSize', 10],
    ]);

    const node = {
      type: 'objectLiteral',
      properties: [
        {
          key: { type: 'identifier', name: 'fontSize' },
          value: {
            type: 'binaryExpression',
            operator: '+',
            left: { type: 'identifier', name: 'baseSize' },
            right: { type: 'literal', value: 4 },
          },
        },
      ],
    };

    const result = await runtime.execute(node, context);

    expect(result).toEqual({
      fontSize: 14,
    });
  });

  it('should handle object literals with dynamic keys', async () => {
    const context = createTypedExecutionContext();
    (context as { variables: Map<string, unknown> }).variables = new Map<string, unknown>([
      ['keyName', 'dynamicProperty'],
      ['value', 'dynamicValue'],
    ]);

    const node = {
      type: 'objectLiteral',
      properties: [
        {
          key: { type: 'identifier', name: 'keyName' },
          value: { type: 'identifier', name: 'value' },
        },
      ],
    };

    const result = await runtime.execute(node, context);

    // When key is an identifier, it uses the identifier name as literal key
    expect(result).toEqual({
      keyName: 'dynamicValue',
    });
  });

  it.skip('should handle errors in property evaluation gracefully', async () => {
    const context = createTypedExecutionContext();

    const node = {
      type: 'objectLiteral',
      properties: [
        {
          key: { type: 'identifier', name: 'validProperty' },
          value: { type: 'literal', value: 'valid' },
        },
        {
          key: { type: 'identifier', name: 'invalidProperty' },
          value: { type: 'identifier', name: 'nonexistentVariable' },
        },
      ],
    };

    const result = await runtime.execute(node, context);

    // Should still create object - missing variables evaluate to their name string
    expect(result).toEqual({
      validProperty: 'valid',
      invalidProperty: 'nonexistentVariable',
    });
  });
});
