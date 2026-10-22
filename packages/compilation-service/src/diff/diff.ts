/**
 * Semantic Diff Engine
 *
 * Compares two BehaviorSpecs at the abstract operation level.
 * Uses LCS (longest common subsequence) for operation-level diffing
 * and post-processes to detect reorderings.
 */

import type { AbstractOperation, BehaviorSpec } from '../operations/types.js';
import type { TriggerDiff, OperationDiff, OperationChangeKind } from './types.js';

// =============================================================================
// Public API
// =============================================================================

export interface DiffResult {
  identical: boolean;
  trigger: TriggerDiff | null;
  operations: OperationDiff[];
  summary: string;
}

/**
 * Compare two BehaviorSpecs and produce a structured diff.
 */
export function diffBehaviors(a: BehaviorSpec, b: BehaviorSpec): DiffResult {
  const triggerDiff = diffTrigger(a, b);
  const opDiffs = diffOperations(a.operations, b.operations);

  const identical = triggerDiff === null && opDiffs.every(d => d.kind === 'unchanged');
  const summary = generateSummary(triggerDiff, opDiffs);

  return { identical, trigger: triggerDiff, operations: opDiffs, summary };
}

// =============================================================================
// Trigger Comparison
// =============================================================================

function diffTrigger(a: BehaviorSpec, b: BehaviorSpec): TriggerDiff | null {
  const changes: string[] = [];

  if (a.trigger.event !== b.trigger.event) {
    changes.push(`event: ${a.trigger.event} → ${b.trigger.event}`);
  }

  // Compare modifiers
  const aModKeys = Object.keys(a.trigger.modifiers ?? {}).sort();
  const bModKeys = Object.keys(b.trigger.modifiers ?? {}).sort();
  const aMods = a.trigger.modifiers ?? {};
  const bMods = b.trigger.modifiers ?? {};

  for (const key of new Set([...aModKeys, ...bModKeys])) {
    const aVal = aMods[key];
    const bVal = bMods[key];
    if (aVal === undefined) {
      changes.push(`added modifier: ${key}`);
    } else if (bVal === undefined) {
      changes.push(`removed modifier: ${key}`);
    } else if (JSON.stringify(aVal) !== JSON.stringify(bVal)) {
      changes.push(`modifier ${key}: ${JSON.stringify(aVal)} → ${JSON.stringify(bVal)}`);
    }
  }

  if (changes.length === 0) return null;

  return {
    a: { event: a.trigger.event, modifiers: a.trigger.modifiers },
    b: { event: b.trigger.event, modifiers: b.trigger.modifiers },
    changes,
  };
}

// =============================================================================
// Operation Comparison (LCS-based)
// =============================================================================

function diffOperations(a: AbstractOperation[], b: AbstractOperation[]): OperationDiff[] {
  const aKeys = a.map(canonicalizeOp);
  const bKeys = b.map(canonicalizeOp);

  // Build LCS table
  const lcs = computeLCS(aKeys, bKeys);

  // Walk the LCS to produce diffs
  const rawDiffs = buildDiffFromLCS(a, b, aKeys, bKeys, lcs);

  // Post-process: detect reorderings among added/removed pairs
  return detectReorderings(rawDiffs);
}

/**
 * Compute LCS length table.
 */
function computeLCS(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

/**
 * Walk the LCS table backwards to produce raw diffs.
 */
function buildDiffFromLCS(
  a: AbstractOperation[],
  b: AbstractOperation[],
  aKeys: string[],
  bKeys: string[],
  dp: number[][]
): OperationDiff[] {
  const diffs: OperationDiff[] = [];
  let i = a.length;
  let j = b.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aKeys[i - 1] === bKeys[j - 1]) {
      // Match — unchanged
      diffs.push({
        kind: 'unchanged',
        index: { a: i - 1, b: j - 1 },
        a: a[i - 1],
        b: b[j - 1],
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      // Added in b
      diffs.push({
        kind: 'added',
        index: { b: j - 1 },
        b: b[j - 1],
      });
      j--;
    } else {
      // Removed from a
      diffs.push({
        kind: 'removed',
        index: { a: i - 1 },
        a: a[i - 1],
      });
      i--;
    }
  }

  return diffs.reverse();
}

/**
 * Post-process raw diffs to detect reorderings and field-level changes.
 *
 * A reordering is when an operation appears in both sides but at different
 * positions (shows as removed+added pair with the same canonical key).
 *
 * A change is when an operation at the same position has the same op type
 * but different fields (shows as removed+added pair with the same op type).
 */
function detectReorderings(diffs: OperationDiff[]): OperationDiff[] {
  const removed: OperationDiff[] = [];
  const added: OperationDiff[] = [];
  const result: OperationDiff[] = [];

  // Separate removed and added
  for (const d of diffs) {
    if (d.kind === 'removed') removed.push(d);
    else if (d.kind === 'added') added.push(d);
    else result.push(d);
  }

  // Match removed/added pairs
  const usedRemoved = new Set<number>();
  const usedAdded = new Set<number>();

  // First pass: exact matches (reorderings)
  for (let ri = 0; ri < removed.length; ri++) {
    if (usedRemoved.has(ri)) continue;
    const rKey = canonicalizeOp(removed[ri].a!);
    for (let ai = 0; ai < added.length; ai++) {
      if (usedAdded.has(ai)) continue;
      const aKey = canonicalizeOp(added[ai].b!);
      if (rKey === aKey) {
        usedRemoved.add(ri);
        usedAdded.add(ai);
        result.push({
          kind: 'reordered',
          index: { a: removed[ri].index.a, b: added[ai].index.b },
          a: removed[ri].a,
          b: added[ai].b,
        });
        break;
      }
    }
  }

  // Second pass: same op type → changed
  for (let ri = 0; ri < removed.length; ri++) {
    if (usedRemoved.has(ri)) continue;
    for (let ai = 0; ai < added.length; ai++) {
      if (usedAdded.has(ai)) continue;
      if (removed[ri].a!.op === added[ai].b!.op) {
        usedRemoved.add(ri);
        usedAdded.add(ai);
        result.push({
          kind: 'changed',
          index: { a: removed[ri].index.a, b: added[ai].index.b },
          a: removed[ri].a,
          b: added[ai].b,
          changes: describeChanges(removed[ri].a!, added[ai].b!),
        });
        break;
      }
    }
  }

  // Remaining unmatched
  for (let ri = 0; ri < removed.length; ri++) {
    if (!usedRemoved.has(ri)) result.push(removed[ri]);
  }
  for (let ai = 0; ai < added.length; ai++) {
    if (!usedAdded.has(ai)) result.push(added[ai]);
  }

  // Sort by position for stable output
  result.sort((x, y) => {
    const xPos = x.index.a ?? x.index.b ?? 0;
    const yPos = y.index.a ?? y.index.b ?? 0;
    return xPos - yPos;
  });

  return result;
}

// =============================================================================
// Canonicalization
// =============================================================================

/**
 * Produce a deterministic string key for an AbstractOperation.
 * Two operations with the same key are semantically identical.
 */
export function canonicalizeOp(op: AbstractOperation): string {
  const parts: string[] = [op.op];

  switch (op.op) {
    case 'toggleClass':
    case 'addClass':
    case 'removeClass':
      parts.push(op.className, canonicalizeTarget(op.target));
      break;
    case 'setContent':
      parts.push(op.content, canonicalizeTarget(op.target), op.position);
      break;
    case 'appendContent':
      parts.push(op.content, canonicalizeTarget(op.target));
      break;
    case 'show':
    case 'hide':
    case 'focus':
    case 'blur':
      parts.push(canonicalizeTarget(op.target));
      break;
    case 'setVariable':
      parts.push(op.name, op.value, op.scope);
      break;
    case 'increment':
    case 'decrement':
      parts.push(canonicalizeTarget(op.target), String(op.amount));
      break;
    case 'navigate':
      parts.push(op.url);
      break;
    case 'historyBack':
    case 'historyForward':
      break;
    case 'fetch':
      parts.push(op.url, op.format, op.target ? canonicalizeTarget(op.target) : '');
      break;
    case 'wait':
      parts.push(String(op.durationMs));
      break;
    case 'triggerEvent':
      parts.push(op.eventName, canonicalizeTarget(op.target), op.detail ?? '');
      break;
    case 'log':
      parts.push(...op.values);
      break;
    case 'conditional':
      parts.push(op.negated ? 'unless' : 'if', op.condition, block(op.then), block(op.else));
      break;
    case 'loop':
      parts.push(op.variant, canonicalizeRoles(op.roles), block(op.body));
      break;
    case 'command':
      parts.push(op.action, canonicalizeRoles(op.roles), op.body ? block(op.body) : '');
      break;
  }
  if (op.extra) parts.push(`extra:${canonicalizeRoles(op.extra)}`);

  return parts.join('|');
}

/** A nested list of operations (a branch, a loop's body) as one key. */
function block(ops: AbstractOperation[]): string {
  return `[${ops.map(canonicalizeOp).join(' ; ')}]`;
}

function canonicalizeRoles(roles: Record<string, string>): string {
  return Object.keys(roles)
    .sort()
    .map(k => `${k}=${roles[k]}`)
    .join(',');
}

function canonicalizeTarget(t: { kind: string; value?: string }): string {
  return t.kind === 'self' ? 'self' : `${t.kind}:${(t as { value?: string }).value ?? ''}`;
}

// =============================================================================
// Change Description
// =============================================================================

function describeChanges(a: AbstractOperation, b: AbstractOperation): string[] {
  const changes: string[] = [];
  const aObj = a as unknown as Record<string, unknown>;
  const bObj = b as unknown as Record<string, unknown>;

  // Compare all fields except 'op'
  const allKeys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
  for (const key of allKeys) {
    if (key === 'op') continue;
    const aVal = JSON.stringify(aObj[key]);
    const bVal = JSON.stringify(bObj[key]);
    if (aVal !== bVal) {
      changes.push(`${key}: ${formatValue(aObj[key])} → ${formatValue(bObj[key])}`);
    }
  }

  return changes;
}

function formatValue(v: unknown): string {
  if (v === undefined) return '(none)';
  // A branch or a loop's body: its operations, by key.
  if (Array.isArray(v) && v.every(x => typeof x === 'object' && x !== null && 'op' in x)) {
    return block(v as AbstractOperation[]);
  }
  if (typeof v === 'object' && v !== null) {
    const obj = v as Record<string, unknown>;
    if ('kind' in obj) return obj.kind === 'self' ? 'self' : `${obj.kind}:${obj.value ?? ''}`;
    return JSON.stringify(v);
  }
  return String(v);
}

// =============================================================================
// Summary Generation
// =============================================================================

function generateSummary(trigger: TriggerDiff | null, opDiffs: OperationDiff[]): string {
  const parts: string[] = [];

  if (!trigger && opDiffs.every(d => d.kind === 'unchanged')) {
    return 'No semantic change';
  }

  if (trigger) {
    parts.push(`Trigger: ${trigger.changes.join(', ')}`);
  }

  const counts: Record<OperationChangeKind, number> = {
    added: 0,
    removed: 0,
    changed: 0,
    reordered: 0,
    unchanged: 0,
  };
  for (const d of opDiffs) counts[d.kind]++;

  const opParts: string[] = [];
  if (counts.added > 0) opParts.push(`${counts.added} added`);
  if (counts.removed > 0) opParts.push(`${counts.removed} removed`);
  if (counts.changed > 0) opParts.push(`${counts.changed} changed`);
  if (counts.reordered > 0) opParts.push(`${counts.reordered} reordered`);

  if (opParts.length > 0) {
    parts.push(`Operations: ${opParts.join(', ')}`);
  }

  return parts.join('. ');
}
