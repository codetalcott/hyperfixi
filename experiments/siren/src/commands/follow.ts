/**
 * follow command — navigate to a Siren link by rel.
 *
 * Syntax:
 *   follow siren link <rel>
 *   follow <rel>              (shorthand)
 *
 * Looks up the link on the current entity, resolves its href, fetches
 * the result, and updates the Siren client state.
 */

import { getCurrentEntity, getCurrentUrl, fetchSiren } from '../siren-client';
import { resolveUrl } from '../util';

/** AST node shape — minimal interface to avoid tight coupling to core internals */
interface ASTNodeLike {
  type?: string;
  name?: string;
  value?: unknown;
}

export interface FollowCommandInput {
  rel: string;
}

export const followCommand = {
  name: 'follow',

  async parseInput(
    raw: { args: ASTNodeLike[]; modifiers: Record<string, unknown> },
    evaluator: { evaluate(node: unknown, ctx: unknown): Promise<unknown> },
    context: unknown
  ): Promise<FollowCommandInput> {
    // Filter out optional keyword identifiers: 'siren', 'link'
    const meaningful = raw.args.filter(a => {
      const n = a as { type?: string; name?: string };
      if (n.type === 'identifier' && (n.name === 'siren' || n.name === 'link')) return false;
      return true;
    });

    if (!meaningful.length) {
      throw new Error("follow: requires a link rel (e.g., follow siren link 'orders')");
    }

    const rel = await evaluator.evaluate(meaningful[0], context);
    return { rel: String(rel) };
  },

  async execute(input: FollowCommandInput, context: Record<string, unknown>): Promise<unknown> {
    const entity = getCurrentEntity();
    if (!entity) throw new Error('follow: no current Siren entity');

    const link = entity.links?.find(l => l.rel.includes(input.rel));
    if (!link) throw new Error(`follow: Siren link '${input.rel}' not found on current entity`);

    const baseUrl = getCurrentUrl();
    if (!baseUrl) throw new Error('follow: no current URL for relative resolution');

    const url = resolveUrl(link.href, baseUrl);
    const result = await fetchSiren(url);

    // Set 'it' to the fetched entity for chaining
    Object.assign(context, { it: result });
    return result;
  },
};
