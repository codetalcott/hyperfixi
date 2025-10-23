/**
 * ExecutionContext implementation for hyperscript runtime
 * Handles variable scoping, context switching, and execution state
 */

import type { ExecutionContext } from '../types/core';

/**
 * Creates a new execution context
 */
export function createContext(element?: HTMLElement | null): ExecutionContext {
  return {
    me: element || null,
    it: null,
    you: null,
    result: null,
    locals: new Map<string, any>(),
    globals: new Map<string, any>(),
    flags: {
      halted: false,
      breaking: false,
      continuing: false,
      returning: false,
      async: false,
    },
  };
}

/**
 * Creates a child context that inherits from a parent context
 */
export function createChildContext(
  parent: ExecutionContext,
  element?: HTMLElement | null
): ExecutionContext {
  return {
    me: element || null,
    it: null,
    you: null,
    result: null,
    locals: new Map<string, any>(),
    globals: parent.globals, // Shared global scope
    parent,
    flags: {
      halted: false,
      breaking: false,
      continuing: false,
      returning: false,
      async: false,
    },
  };
}

/**
 * Sets a value in the context
 */
export function setContextValue(
  context: ExecutionContext,
  name: string,
  value: any,
  isGlobal = false
): void {
  // Handle special context variables
  switch (name) {
    case 'me':
      Object.assign(context, { me: value });
      return;
    case 'it':
      Object.assign(context, { it: value });
      return;
    case 'you':
      context.you = value;
      return;
    case 'result':
      Object.assign(context, { result: value });
      return;
  }

  // Set in appropriate scope
  if (isGlobal) {
    context.globals.set(name, value);
  } else {
    context.locals.set(name, value);
  }
}

/**
 * Gets a value from the context, following the scope chain
 */
export function getContextValue(context: ExecutionContext, name: string): any {
  // Handle special context variables
  switch (name) {
    case 'me':
      return context.me;
    case 'it':
      return context.it;
    case 'you':
      return context.you;
    case 'result':
      return context.result;
  }

  // Check local scope first
  if (context.locals.has(name)) {
    return context.locals.get(name);
  }

  // Check global scope
  if (context.globals.has(name)) {
    return context.globals.get(name);
  }

  // Walk up the scope chain
  if (context.parent) {
    return getContextValue(context.parent, name);
  }

  // Variable not found
  return undefined;
}

/**
 * Checks if a variable exists in the context
 */
export function hasContextValue(context: ExecutionContext, name: string): boolean {
  // Special context variables always exist (though may be null)
  if (['me', 'it', 'you', 'result'].includes(name)) {
    return true;
  }

  // Check local scope
  if (context.locals.has(name)) {
    return true;
  }

  // Check global scope
  if (context.globals.has(name)) {
    return true;
  }

  // Walk up the scope chain
  if (context.parent) {
    return hasContextValue(context.parent, name);
  }

  return false;
}

/**
 * Deletes a variable from the context
 */
export function deleteContextValue(context: ExecutionContext, name: string): boolean {
  // Cannot delete special context variables
  if (['me', 'it', 'you', 'result'].includes(name)) {
    return false;
  }

  // Try to delete from local scope first
  if (context.locals.has(name)) {
    context.locals.delete(name);
    return true;
  }

  // Try to delete from global scope
  if (context.globals.has(name)) {
    context.globals.delete(name);
    return true;
  }

  return false;
}

/**
 * Creates a snapshot of the current context state
 */
export function snapshotContext(context: ExecutionContext): Record<string, any> {
  const snapshot: Record<string, any> = {
    me: context.me,
    it: context.it,
    you: context.you,
    result: context.result,
    locals: Object.fromEntries(context.locals),
    globals: Object.fromEntries(context.globals),
    flags: { ...context.flags },
  };

  return snapshot;
}

/**
 * Restores context state from a snapshot
 */
export function restoreContext(
  context: ExecutionContext,
  snapshot: Record<string, any>
): void {
  if (snapshot.me !== undefined) Object.assign(context, { me: snapshot.me });
  if (snapshot.it !== undefined) Object.assign(context, { it: snapshot.it });
  if (snapshot.you !== undefined) context.you = snapshot.you;
  if (snapshot.result !== undefined) Object.assign(context, { result: snapshot.result });

  if (snapshot.locals) {
    context.locals.clear();
    Object.entries(snapshot.locals).forEach(([key, value]) => {
      context.locals.set(key, value);
    });
  }

  if (snapshot.globals) {
    context.globals.clear();
    Object.entries(snapshot.globals).forEach(([key, value]) => {
      context.globals.set(key, value);
    });
  }

  if (snapshot.flags) {
    Object.assign(context.flags, snapshot.flags);
  }
}

/**
 * Clones a context (useful for parallel execution)
 */
export function cloneContext(context: ExecutionContext): ExecutionContext {
  const cloned = createContext(context.me);

  Object.assign(cloned, { it: context.it });
  cloned.you = context.you;
  Object.assign(cloned, { result: context.result });

  // Deep copy locals
  context.locals.forEach((value, key) => {
    cloned.locals.set(key, value);
  });

  // Share globals reference (globals should be shared)
  Object.assign(cloned, { globals: context.globals });
  Object.assign(cloned, { parent: context.parent });
  
  // Copy flags
  Object.assign(cloned.flags, context.flags);
  
  return cloned;
}

/**
 * Merges values from one context into another
 */
export function mergeContexts(target: ExecutionContext, source: ExecutionContext): void {
  // Merge locals (source overwrites target)
  source.locals.forEach((value, key) => {
    target.locals.set(key, value);
  });
  
  // Update special variables if they exist in source
  if (source.it !== null) Object.assign(target, { it: source.it });
  if (source.you !== null) target.you = source.you;
  if (source.result !== null) Object.assign(target, { result: source.result });
}

/**
 * Utility to get all variable names in context (for debugging)
 */
export function getContextVariableNames(context: ExecutionContext): string[] {
  const names = new Set<string>();
  
  // Add special variables
  names.add('me');
  names.add('it');
  names.add('you');
  names.add('result');
  
  // Add local variables
  context.locals.forEach((_, key) => names.add(key));
  
  // Add global variables
  context.globals.forEach((_, key) => names.add(key));
  
  // Add parent variables (recursive)
  if (context.parent) {
    getContextVariableNames(context.parent).forEach(name => names.add(name));
  }
  
  return Array.from(names).sort();
}