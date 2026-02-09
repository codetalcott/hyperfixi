/**
 * execute command — invoke a Siren action by name.
 *
 * Syntax:
 *   execute siren action <name>
 *   execute siren action <name> with <data>
 *   execute <name> with <data>   (shorthand)
 *
 * Looks up the action on the current entity, builds a request from
 * action.method + action.href, reconciles field defaults with user data,
 * sends the request, and updates the Siren client state.
 */

import { getCurrentEntity, getCurrentUrl, fetchSiren } from '../siren-client';
import { resolveUrl, reconcileFields } from '../util';

/** AST node shape — minimal interface to avoid tight coupling to core internals */
interface ASTNodeLike {
  type?: string;
  name?: string;
  value?: unknown;
}

export interface ExecuteActionInput {
  name: string;
  data: Record<string, unknown> | undefined;
}

export const executeActionCommand = {
  name: 'execute',

  async parseInput(
    raw: { args: ASTNodeLike[]; modifiers: Record<string, unknown> },
    evaluator: { evaluate(node: unknown, ctx: unknown): Promise<unknown> },
    context: unknown
  ): Promise<ExecuteActionInput> {
    const args = [...raw.args];

    // Find 'with' separator in args
    const withIdx = args.findIndex(
      a =>
        (a as { type?: string; name?: string }).type === 'identifier' &&
        (a as { type?: string; name?: string }).name === 'with'
    );

    let data: Record<string, unknown> | undefined;
    if (withIdx >= 0 && withIdx + 1 < args.length) {
      const dataNode = args[withIdx + 1];
      const evaluated = await evaluator.evaluate(dataNode, context);
      data =
        typeof evaluated === 'object' && evaluated !== null
          ? (evaluated as Record<string, unknown>)
          : undefined;
      // Remove 'with' and data from args
      args.splice(withIdx, 2);
    }

    // Filter out optional keyword identifiers: 'siren', 'action'
    const meaningful = args.filter(a => {
      const n = a as { type?: string; name?: string };
      if (n.type === 'identifier' && (n.name === 'siren' || n.name === 'action')) return false;
      return true;
    });

    if (!meaningful.length) {
      throw new Error(
        "execute: requires an action name (e.g., execute siren action 'create-order')"
      );
    }

    const name = await evaluator.evaluate(meaningful[0], context);
    return { name: String(name), data };
  },

  async execute(input: ExecuteActionInput, context: Record<string, unknown>): Promise<unknown> {
    const entity = getCurrentEntity();
    if (!entity) throw new Error('execute: no current Siren entity');

    const action = entity.actions?.find(a => a.name === input.name);
    if (!action) {
      throw new Error(`execute: Siren action '${input.name}' not found on current entity`);
    }

    const baseUrl = getCurrentUrl();
    if (!baseUrl) throw new Error('execute: no current URL for relative resolution');

    const method = (action.method ?? 'GET').toUpperCase();
    const url = resolveUrl(action.href, baseUrl);

    const requestInit: RequestInit = { method };

    if (method !== 'GET' && method !== 'HEAD') {
      const body = reconcileFields(input.data, action.fields);
      requestInit.headers = { 'Content-Type': action.type ?? 'application/json' };
      requestInit.body = JSON.stringify(body);
    }

    const result = await fetchSiren(url, requestInit);

    // Set 'it' to the fetched entity for chaining
    Object.assign(context, { it: result });
    return result;
  },
};
