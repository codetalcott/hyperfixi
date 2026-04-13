/**
 * Natural-Language Lowering
 *
 * Rewrites "natural" SemanticNodes (e.g. `get`) into their SQL-shaped
 * equivalents (`select`) before codegen. Keeps the existing sqlCodeGenerator
 * untouched — each natural action maps to one SQL action with role renaming.
 */

import type { SemanticNode, SemanticValue } from '@lokascript/framework';

type Lowering = (node: SemanticNode) => SemanticNode;

function lowerGetToSelect(node: SemanticNode): SemanticNode {
  const source = node.roles.get('source');
  const condition = node.roles.get('condition');
  const limit = node.roles.get('limit');

  const roles = new Map<string, SemanticValue>();
  // `get` has no explicit fields role in the spike — default to `*`.
  roles.set('columns', { type: 'literal', value: '*' });
  if (source) roles.set('source', source);
  if (condition) roles.set('condition', condition);
  if (limit) roles.set('limit', limit);

  return {
    ...node,
    action: 'select',
    roles,
  };
}

export const NATURAL_LOWERINGS: Record<string, Lowering> = {
  get: lowerGetToSelect,
};
