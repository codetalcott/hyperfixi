/**
 * Top-level Set Feature Implementation
 * Defines element-scoped variables at the top level
 * Syntax: set <variable> to <value>
 */

import { FeatureImplementation, ExecutionContext } from '../types/core';

export class SetFeature implements FeatureImplementation {
  name = 'set';
  syntax = 'set <variable> to <value>';
  description = 'Define element-scoped variables at the top level';

  async execute(context: ExecutionContext, ...args: any[]): Promise<any> {
    if (args.length < 3) {
      throw new Error('Set feature requires at least 3 arguments');
    }

    const [variable, keyword, value] = args;
    
    if (keyword !== 'to') {
      throw new Error('Set feature requires "to" keyword');
    }

    // Initialize locals map if not present
    if (!context.locals) {
      context.locals = new Map();
    }

    // Store the variable in the element's local scope
    context.locals.set(variable, value);

    return value;
  }

  validate(args: any[]): string | null {
    if (args.length < 3) {
      return 'Set feature requires at least 3 arguments';
    }

    if (args[1] !== 'to') {
      return 'Set feature requires "to" keyword';
    }

    return null;
  }
}

export default SetFeature;