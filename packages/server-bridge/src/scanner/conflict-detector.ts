import type { RouteDescriptor, ConflictWarning, ConflictDetail } from '../types.js';

/**
 * Detect conflicts between multiple declarations of the same route.
 * Must be called on the pre-deduplicated route list (before first-wins dedup).
 */
export function detectConflicts(routes: RouteDescriptor[]): ConflictWarning[] {
  const warnings: ConflictWarning[] = [];

  // Group routes by method:path
  const groups = new Map<string, RouteDescriptor[]>();
  for (const route of routes) {
    const key = `${route.method}:${route.path}`;
    const existing = groups.get(key) ?? [];
    existing.push(route);
    groups.set(key, existing);
  }

  for (const [key, groupRoutes] of groups) {
    if (groupRoutes.length < 2) continue;

    const conflicts: ConflictDetail[] = [];

    // Check responseFormat
    const formats = [...new Set(groupRoutes.map(r => r.responseFormat))];
    if (formats.length > 1) {
      conflicts.push({
        field: 'responseFormat',
        values: formats,
        message: `Conflicting response formats: ${formats.join(' vs ')}`,
      });
    }

    // Check requestBody field names (for POST/PUT/PATCH)
    if (['POST', 'PUT', 'PATCH'].includes(groupRoutes[0].method)) {
      const bodySignatures = groupRoutes.map(r =>
        JSON.stringify((r.requestBody ?? []).map(f => f.name).sort())
      );
      const uniqueSignatures = [...new Set(bodySignatures)];
      if (uniqueSignatures.length > 1) {
        conflicts.push({
          field: 'requestBody',
          values: uniqueSignatures,
          message: 'Request body fields differ across declarations',
        });
      }
    }

    // Check queryParams
    const querySignatures = groupRoutes.map(r =>
      JSON.stringify((r.queryParams ?? []).map(p => p.name).sort())
    );
    const uniqueQuerySigs = [...new Set(querySignatures)];
    if (uniqueQuerySigs.length > 1) {
      conflicts.push({
        field: 'queryParams',
        values: uniqueQuerySigs,
        message: 'Query parameters differ across declarations',
      });
    }

    if (conflicts.length > 0) {
      warnings.push({
        routeKey: key,
        conflicts,
        sources: groupRoutes.map(r => r.source),
      });
    }
  }

  return warnings;
}

/**
 * Format conflict warnings for human-readable CLI output.
 */
export function formatConflicts(warnings: ConflictWarning[]): string {
  const lines: string[] = [];

  for (const warning of warnings) {
    lines.push(`  ${warning.routeKey}:`);
    for (const conflict of warning.conflicts) {
      lines.push(`    - ${conflict.message}`);
    }
    lines.push(`    Sources:`);
    for (const source of warning.sources) {
      lines.push(`      ${source.file}:${source.line ?? '?'} (${source.kind})`);
    }
  }

  return lines.join('\n');
}
