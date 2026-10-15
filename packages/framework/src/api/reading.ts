/**
 * How a read-back is compared (internal: not exported from the package). `translate` and the
 * registry's translate tool both require a rendering to read back as its source; this is their rule.
 */
import type { SemanticNode } from '../core/types';

/** A node's role values as strings, by role: what a read-back is compared on. */
function roleValues(node: SemanticNode): Map<string, string> {
  const out = new Map<string, string>();
  for (const [role, value] of node.roles) {
    const v = value as { value?: unknown; raw?: unknown };
    out.set(role, String(v?.value ?? v?.raw ?? value));
  }
  return out;
}

/** How `back` differs from `source`; empty when it reads the same. */
export function readingDifference(source: SemanticNode, back: SemanticNode): string {
  if (back.action !== source.action) return `reads as ${back.action}`;
  const want = roleValues(source);
  const got = roleValues(back);
  const parts: string[] = [];
  for (const [role, value] of want) {
    if (!got.has(role)) parts.push(`${role} lost`);
    else if (got.get(role) !== value) parts.push(`${role}: ${value} → ${got.get(role)}`);
  }
  for (const role of got.keys()) if (!want.has(role)) parts.push(`${role} added`);
  return parts.join(', ');
}
