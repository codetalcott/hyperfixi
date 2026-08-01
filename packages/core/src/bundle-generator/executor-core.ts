/**
 * Executor core emission — the ONE copy of "turn a command list into switch cases".
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A MODULE AND NOT TWO CALL SITES
 * ---------------------------------------------------------------------------
 *
 * Arc E exists because the same executor was hand-copied into five places and
 * the copies silently disagreed (`docs-internal/archive/HANDOFF-command-arch-bundles.md`
 * § "The premise, corrected"). Step 4 removes one of those copies by GENERATING
 * hybrid-complete's switch bodies from `templates.ts` — the same source
 * `generateBundleCode()` already emits from.
 *
 * That only removes a copy if both consumers share one emitter. If the script
 * that writes the committed bundle had its own `.map(k => impls[k]).join('\n')`,
 * the arc would have replaced a duplicated executor with a duplicated emitter —
 * the alias-dedupe below is exactly the kind of rule that would drift.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS DELIBERATELY *NOT* HERE
 * ---------------------------------------------------------------------------
 *
 * Only the `case` bodies. The surrounding `switch`, its `default:` arm, the
 * helper closures (`getTarget`/`getClassName`) and every other runtime region
 * stay handwritten in each bundle, because measurement (step 4) found the two
 * runtimes differ in EVERY such region — `evaluate`, `evaluateBinary`,
 * `evaluatePositional`, `executeSequence`, `executeAST` and the `Context` shape
 * all diverge, and step 2 reconciled only the command/block case bodies.
 * Generating the whole file would have been an unreviewed behavior change
 * across the entire runtime wearing a refactor's commit message.
 *
 * Keeping the region this narrow is also what keeps this module parameterless:
 * the two `default:` arms warn with different text and the two bundles scope
 * their helpers differently, and none of that has to be modelled here.
 */

import { getCommandImplementations, getBlockImplementations, type CodeFormat } from './templates';
import { resolveCommandKey } from './template-capabilities';

/**
 * `case` bodies for `commands`, in the order given, ready to splice into an
 * `executeCommand` switch.
 *
 * Advertised aliases resolve to their implementing template key and the result
 * is deduped: each template already carries the case labels for its own aliases,
 * so requesting both `push` and `push-url` must emit the template ONCE — two
 * copies would be duplicate `case` labels, and the second would silently never
 * run. Unknown names are dropped here; `generateBundle()` is what reports them
 * as `unknown-command` errors.
 */
export function emitCommandCases(commands: string[], format: CodeFormat = 'ts'): string {
  const impls = getCommandImplementations(format);
  return [...new Set(commands.map(resolveCommandKey))]
    .filter(key => impls[key])
    .map(key => impls[key])
    .join('\n');
}

/** `case` bodies for `blocks`, ready to splice into an `executeBlock` switch. */
export function emitBlockCases(blocks: string[], format: CodeFormat = 'ts'): string {
  const impls = getBlockImplementations(format);
  return blocks
    .filter(key => impls[key])
    .map(key => impls[key])
    .join('\n');
}
