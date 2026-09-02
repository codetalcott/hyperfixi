/**
 * Reading a compiled body out of a command's raw input (Arc 4b).
 *
 * The runtime compiles a command's `block`/`command` arguments once and hands
 * them in as `raw.bodies`, parallel to `raw.args`. A command that runs a body
 * reads it here; a raw input WITHOUT bodies — a caller that hand-built the
 * input and skipped the runtime — is an error, not a fallback: there is no
 * second way to run a body any more.
 */

import type { Op } from '../../types/program';

interface HasBodies {
  args: readonly unknown[];
  bodies?: ReadonlyArray<Op | undefined>;
  commandName?: string;
}

/** The compiled body for `raw.args[index]`, or throw if none was handed in. */
export function bodyOp(raw: HasBodies, index: number): Op {
  const op = raw.bodies?.[index];
  if (!op) {
    const name = raw.commandName ?? 'command';
    throw new Error(
      `${name}: argument ${index} is a body but was not compiled — run it through the runtime`
    );
  }
  return op;
}

/** Every compiled body from `raw.args[from]` on, in order. */
export function bodyOps(raw: HasBodies, from: number): Op[] {
  const ops: Op[] = [];
  for (let i = from; i < raw.args.length; i++) ops.push(bodyOp(raw, i));
  return ops;
}
