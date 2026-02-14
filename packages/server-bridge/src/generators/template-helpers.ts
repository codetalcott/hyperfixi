import type { RouteDescriptor } from '../types.js';

/** Marker comment indicating a serverbridge-generated route */
export const ROUTE_MARKER = '// @serverbridge-route:';
/** Marker for start of user-editable code */
export const USER_START = '// @serverbridge-user-start';
/** Marker for end of user-editable code */
export const USER_END = '// @serverbridge-user-end';

/**
 * Generate a route comment header.
 */
export function routeMarker(route: RouteDescriptor): string {
  return `${ROUTE_MARKER} ${route.method} ${route.path}`;
}

/**
 * Generate a TODO comment block for an unimplemented route.
 */
export function todoBlock(route: RouteDescriptor, indent: string = '  '): string {
  const lines: string[] = [];
  lines.push(`${indent}// TODO: Implement ${route.method} ${route.path}`);

  if (route.pathParams.length > 0) {
    lines.push(`${indent}// Path params: ${route.pathParams.join(', ')}`);
  }

  if (route.queryParams && route.queryParams.length > 0) {
    lines.push(`${indent}// Query params: ${route.queryParams.map(p => p.name).join(', ')}`);
  }

  if (route.requestBody && route.requestBody.length > 0) {
    const fields = route.requestBody
      .map(f => `${f.name}: ${f.type}${f.required ? '' : '?'}`)
      .join(', ');
    lines.push(`${indent}// Expected body: { ${fields} }`);
  }

  if (route.notes.length > 0) {
    for (const note of route.notes) {
      lines.push(`${indent}// Note: ${note}`);
    }
  }

  return lines.join('\n');
}

/**
 * Group routes by common path prefix for organizing into files.
 * E.g., /api/users and /api/users/:id group under "api-users".
 */
export function groupRoutesByPrefix(routes: RouteDescriptor[]): Map<string, RouteDescriptor[]> {
  const groups = new Map<string, RouteDescriptor[]>();

  for (const route of routes) {
    // Take first two segments as the group key
    const segments = route.path.replace(/^\//, '').split('/');
    const groupKey =
      segments
        .slice(0, Math.min(2, segments.length))
        .filter(s => !s.startsWith(':'))
        .join('-') || 'root';

    const group = groups.get(groupKey) ?? [];
    group.push(route);
    groups.set(groupKey, group);
  }

  return groups;
}

/**
 * Generate a safe filename from a group key.
 */
export function groupToFilename(groupKey: string, typescript: boolean): string {
  return `${groupKey}.${typescript ? 'ts' : 'js'}`;
}
