/**
 * ExecutionContext implementation for hyperscript runtime
 * Handles variable scoping, context switching, and execution state
 */

import type { ExecutionContext } from '../types/core';

/**
 * Shared global variables Map across all execution contexts
 * This ensures global variables persist between event handler invocations
 */
const sharedGlobals = new Map<string, any>();

/**
 * Creates a new execution context with shared globals
 * @param element - The element to use as 'me' in the context
 * @param globals - Optional globals Map (defaults to shared globals)
 */
export function createContext(
  element?: HTMLElement | null,
  globals?: Map<string, any>
): ExecutionContext {
  return {
    me: element || null,
    it: null,
    you: null,
    result: null,
    locals: new Map<string, any>(),
    globals: globals || sharedGlobals, // Use shared globals by default
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
 * Get access to the shared globals Map (for Runtime integration)
 */
export function getSharedGlobals(): Map<string, any> {
  return sharedGlobals;
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
 * Ensures we have a valid execution context.
 * If user provides a partial context (like { me: el }), merges it with a proper context.
 *
 * This is essential for browser bundle APIs where users may pass partial contexts.
 * The runtime requires context.locals and context.globals to be Maps.
 *
 * @param userContext - Optional partial or complete context from the user
 * @returns A valid ExecutionContext with all required properties
 */
export function ensureContext(userContext?: Partial<ExecutionContext> | any): ExecutionContext {
  // If no context, create fresh one
  if (!userContext) {
    return createContext();
  }

  // If already has locals/globals Maps AND flags, use it directly (already valid)
  // Must check flags to ensure context is truly complete
  if (
    userContext.locals instanceof Map &&
    userContext.globals instanceof Map &&
    userContext.flags
  ) {
    return userContext as ExecutionContext;
  }

  // Create proper context with user's element, then merge other user values
  // Use Element (not HTMLElement) for SVG, MathML, and cross-frame element support
  const ctx = createContext(
    userContext.me instanceof Element ? (userContext.me as HTMLElement) : null
  );

  // Merge user-provided values
  if (userContext.it !== undefined) Object.assign(ctx, { it: userContext.it });
  if (userContext.you !== undefined) ctx.you = userContext.you;
  if (userContext.result !== undefined) Object.assign(ctx, { result: userContext.result });
  if (userContext.event !== undefined) Object.assign(ctx, { event: userContext.event });

  return ctx;
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
export function restoreContext(context: ExecutionContext, snapshot: Record<string, any>): void {
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

  if (snapshot.flags && context.flags) {
    Object.assign(context.flags, snapshot.flags);
  }
}

/**
 * Clones a context (useful for parallel execution)
 */
export function cloneContext(context: ExecutionContext): ExecutionContext {
  const cloned = createContext(context.me instanceof HTMLElement ? context.me : null);

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

  // Copy flags if both exist
  if (cloned.flags && context.flags) {
    Object.assign(cloned.flags, context.flags);
  }

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
