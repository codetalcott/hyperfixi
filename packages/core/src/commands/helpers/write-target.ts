/**
 * Writable-target resolution — the shared rung ladder
 *
 * `set`, `append` and `prepend` all open by answering the same question: given a
 * raw target AST node, what kind of writable slot is it? Each carried its own
 * copy of the ladder, and the ORDER of its rungs is semantics rather than style
 * — the per-rung notes below say why. This module is the one place that order is
 * defined.
 *
 * IMPORTANT: every rung inspects the RAW AST node, before evaluation. Evaluating
 * a write target yields its *current value*, and a write keyed on that value
 * silently targets the wrong thing — the defect class #792 fixed for
 * append/prepend, where `@attr`, `#el's value` and `my innerHTML` created junk
 * locals named after the current value and never touched the DOM.
 *
 * Callers opt into the rungs they have; a rung that is not requested is skipped,
 * never reordered. `set` requests the plugin node-writers and the `*prop` style
 * split; `append`/`prepend` request selector-source and bare-reference capture
 * instead. `null` means "none of the requested rungs matched" — the caller falls
 * through to its own evaluated-value tail, which is where the commands genuinely
 * diverge and which deliberately stays out of here.
 */

import type { ExecutionContext } from '../../types/core';
import type { ASTNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { resolveAnyPropertyTarget, type PropertyTarget } from './property-target';
import { resolveAttributeWriteTarget } from './attribute-target';
import { getRegisteredNodeWriter, type NodeWriterFn } from '../../parser/extensions';

/**
 * A recognized writable slot.
 *
 * Subsumes the target halves of both `SetCommandInput` and
 * `InsertionCommandInput`; each command maps the rung it gets onto its own input
 * union and keeps its own execute-side switch.
 */
export type WriteTarget =
  | { kind: 'node-write'; node: ASTNode; writer: NodeWriterFn }
  | { kind: 'selector'; selector: string }
  | { kind: 'attribute'; elements: HTMLElement[]; name: string }
  | { kind: 'style'; element: HTMLElement; property: string }
  | { kind: 'property'; target: PropertyTarget }
  | { kind: 'variable'; name: string; scope?: 'element' | 'global' };

export interface WriteTargetOptions {
  /**
   * Elements a standalone `@attr` applies to. `set` passes its `on`-modifier
   * resolver (which can match many elements, e.g. `on .tab`); append/prepend
   * pass `me`, having no `on` modifier.
   */
  scopeElements: () => Promise<HTMLElement[]>;
  /** Rung 1 — consult the plugin node-writer registry (e.g. reactivity's `^count`). */
  nodeWriters?: boolean;
  /** Rung 2 — keep a selector node's SOURCE text so a multi-match resolves at execute time. */
  selectorSource?: boolean;
  /** Rung 4 — split a `*prop` property target into a distinct style write. */
  styleSplit?: boolean;
  /** Rung 5 — keep a bare reference's NAME so execute can read-modify-write the binding. */
  bareReference?: boolean;
}

/**
 * Walk the rung ladder and return the first writable slot that matches.
 *
 * @param node - The raw target AST node (NOT evaluated)
 * @param evaluator - Used only for the object side of `of` / member / property shapes
 * @param context - Execution context
 * @param options - Which optional rungs to request, plus the `@attr` fallback scope
 * @returns The matched write target, or null to fall through to the caller's tail
 */
export async function resolveWriteTarget(
  node: ASTNode | Record<string, unknown> | undefined,
  evaluator: ExpressionEvaluator,
  context: ExecutionContext,
  options: WriteTargetOptions
): Promise<WriteTarget | null> {
  if (!node) return null;

  const n = node as Record<string, unknown>;
  const nodeType = n.type as string | undefined;

  // (1) Plugin-defined write targets — e.g. `set ^count to 0` routes through the
  //     reactivity plugin's caretVar writer. First, so a plugin can claim a node
  //     type before any built-in rung interprets it.
  if (options.nodeWriters && nodeType) {
    const writer = getRegisteredNodeWriter(nodeType);
    if (writer) return { kind: 'node-write', node: node as ASTNode, writer };
  }

  // (2) Selector nodes keep their SOURCE text — resolving at execute time lets a
  //     multi-match selector write into every element instead of just the first.
  if (options.selectorSource && nodeType === 'selector' && typeof n.value === 'string') {
    return { kind: 'selector', selector: n.value };
  }

  // (3) Attribute write targets: `@attr`, `[@attr]`, `@attr of X`, `X[@attr]`.
  //     MUST precede the property/member rungs — an attributeAccess that reached
  //     the computed-member path would key the write on the attribute's *current
  //     value* rather than writing the attribute.
  const attribute = await resolveAttributeWriteTarget(
    node,
    evaluator,
    context,
    options.scopeElements
  );
  if (attribute) {
    return { kind: 'attribute', elements: attribute.elements, name: attribute.name };
  }

  // (4) Property targets: `#el's value`, `my innerHTML`, `the X of Y`, `*opacity`.
  const property = await resolveAnyPropertyTarget(node as ASTNode, evaluator, context);
  if (property) {
    // `set` splits `*prop` out into a style write; append/prepend do not, because
    // read/writePropertyTarget already route the `*` prefix to inline style.
    if (options.styleSplit && property.property.startsWith('*')) {
      return { kind: 'style', element: property.element, property: property.property.substring(1) };
    }
    return { kind: 'property', target: property };
  }

  // (5) Bare references keep their NAME so execute can read+write the binding;
  //     evaluating would yield the current value and lose the slot. The parser's
  //     scope tag routes `:name` to element scope and `$name`/`global` to globals.
  if (
    options.bareReference &&
    (nodeType === 'identifier' || nodeType === 'variable' || nodeType === 'symbol') &&
    typeof n.name === 'string'
  ) {
    const rawScope = n.scope as string | undefined;
    const scope = rawScope === 'element' || rawScope === 'global' ? rawScope : undefined;
    return { kind: 'variable', name: n.name, scope };
  }

  return null;
}
