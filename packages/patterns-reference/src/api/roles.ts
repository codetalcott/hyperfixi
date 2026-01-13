/**
 * Pattern Roles API
 *
 * Provides functions to query semantic roles extracted from patterns.
 */

import { getDatabase } from '../database/connection';
import type { PatternRole, SemanticRole, RoleType, ConnectionOptions, Pattern } from '../types';

// =============================================================================
// Database Row Types
// =============================================================================

interface PatternRoleRow {
  id: number;
  code_example_id: string;
  command_index: number;
  role: string;
  role_value: string | null;
  role_type: string | null;
  required: number;
}

interface CodeExampleRow {
  id: string;
  title: string;
  raw_code: string;
  description: string | null;
  feature: string | null;
  created_at: string;
}

// =============================================================================
// Role Queries
// =============================================================================

/**
 * Get all semantic roles for a pattern.
 */
export async function getPatternRoles(
  patternId: string,
  options?: ConnectionOptions
): Promise<PatternRole[]> {
  const db = getDatabase({ ...options, readonly: true });
  const rows = db
    .prepare(
      `
    SELECT id, code_example_id, command_index, role, role_value, role_type, required
    FROM pattern_roles
    WHERE code_example_id = ?
    ORDER BY command_index, role
  `
    )
    .all(patternId) as PatternRoleRow[];

  return rows.map(mapRowToPatternRole);
}

/**
 * Get all patterns that contain a specific semantic role.
 */
export async function getPatternsByRole(
  role: SemanticRole,
  options?: ConnectionOptions
): Promise<Pattern[]> {
  const db = getDatabase({ ...options, readonly: true });
  const rows = db
    .prepare(
      `
    SELECT DISTINCT ce.id, ce.title, ce.raw_code, ce.description, ce.feature, ce.created_at
    FROM code_examples ce
    INNER JOIN pattern_roles pr ON ce.id = pr.code_example_id
    WHERE pr.role = ?
    ORDER BY ce.title
  `
    )
    .all(role) as CodeExampleRow[];

  return rows.map(mapRowToPattern);
}

/**
 * Get patterns that contain all specified roles.
 */
export async function getPatternsByRoles(
  roles: SemanticRole[],
  matchMode: 'all' | 'any' = 'any',
  options?: ConnectionOptions
): Promise<Pattern[]> {
  if (roles.length === 0) return [];

  const db = getDatabase({ ...options, readonly: true });

  if (matchMode === 'any') {
    // Match patterns with ANY of the specified roles
    const placeholders = roles.map(() => '?').join(', ');
    const rows = db
      .prepare(
        `
      SELECT DISTINCT ce.id, ce.title, ce.raw_code, ce.description, ce.feature, ce.created_at
      FROM code_examples ce
      INNER JOIN pattern_roles pr ON ce.id = pr.code_example_id
      WHERE pr.role IN (${placeholders})
      ORDER BY ce.title
    `
      )
      .all(...roles) as CodeExampleRow[];

    return rows.map(mapRowToPattern);
  } else {
    // Match patterns with ALL of the specified roles
    const placeholders = roles.map(() => '?').join(', ');
    const rows = db
      .prepare(
        `
      SELECT ce.id, ce.title, ce.raw_code, ce.description, ce.feature, ce.created_at
      FROM code_examples ce
      WHERE (
        SELECT COUNT(DISTINCT pr.role)
        FROM pattern_roles pr
        WHERE pr.code_example_id = ce.id AND pr.role IN (${placeholders})
      ) = ?
      ORDER BY ce.title
    `
      )
      .all(...roles, roles.length) as CodeExampleRow[];

    return rows.map(mapRowToPattern);
  }
}

/**
 * Get patterns by role value (e.g., all patterns that target ".active").
 */
export async function getPatternsByRoleValue(
  role: SemanticRole,
  value: string,
  options?: ConnectionOptions
): Promise<Pattern[]> {
  const db = getDatabase({ ...options, readonly: true });
  const rows = db
    .prepare(
      `
    SELECT DISTINCT ce.id, ce.title, ce.raw_code, ce.description, ce.feature, ce.created_at
    FROM code_examples ce
    INNER JOIN pattern_roles pr ON ce.id = pr.code_example_id
    WHERE pr.role = ? AND pr.role_value LIKE ?
    ORDER BY ce.title
  `
    )
    .all(role, `%${value}%`) as CodeExampleRow[];

  return rows.map(mapRowToPattern);
}

// =============================================================================
// Role Statistics
// =============================================================================

/**
 * Get statistics about role usage across all patterns.
 */
export async function getRoleStats(options?: ConnectionOptions): Promise<{
  totalRoles: number;
  byRole: Record<SemanticRole, number>;
  byRoleType: Record<RoleType, number>;
  topRoleValues: Array<{ role: SemanticRole; value: string; count: number }>;
  patternsWithRoles: number;
  patternsWithoutRoles: number;
}> {
  const db = getDatabase({ ...options, readonly: true });

  // Total roles
  const totalRow = db.prepare('SELECT COUNT(*) as count FROM pattern_roles').get() as {
    count: number;
  };

  // Count by role
  const roleRows = db
    .prepare(
      `
    SELECT role, COUNT(*) as count
    FROM pattern_roles
    GROUP BY role
    ORDER BY count DESC
  `
    )
    .all() as { role: string; count: number }[];

  const byRole: Record<string, number> = {};
  for (const row of roleRows) {
    byRole[row.role] = row.count;
  }

  // Count by role type
  const typeRows = db
    .prepare(
      `
    SELECT role_type, COUNT(*) as count
    FROM pattern_roles
    WHERE role_type IS NOT NULL
    GROUP BY role_type
  `
    )
    .all() as { role_type: string; count: number }[];

  const byRoleType: Record<string, number> = {};
  for (const row of typeRows) {
    byRoleType[row.role_type] = row.count;
  }

  // Top role values
  const valueRows = db
    .prepare(
      `
    SELECT role, role_value, COUNT(*) as count
    FROM pattern_roles
    WHERE role_value IS NOT NULL
    GROUP BY role, role_value
    ORDER BY count DESC
    LIMIT 20
  `
    )
    .all() as { role: string; role_value: string; count: number }[];

  const topRoleValues = valueRows.map(row => ({
    role: row.role as SemanticRole,
    value: row.role_value,
    count: row.count,
  }));

  // Patterns with/without roles
  const withRolesRow = db
    .prepare(
      `
    SELECT COUNT(DISTINCT code_example_id) as count
    FROM pattern_roles
  `
    )
    .get() as { count: number };

  const totalPatternsRow = db.prepare('SELECT COUNT(*) as count FROM code_examples').get() as {
    count: number;
  };

  return {
    totalRoles: totalRow.count,
    byRole: byRole as Record<SemanticRole, number>,
    byRoleType: byRoleType as Record<RoleType, number>,
    topRoleValues,
    patternsWithRoles: withRolesRow.count,
    patternsWithoutRoles: totalPatternsRow.count - withRolesRow.count,
  };
}

/**
 * Get role distribution for a specific command.
 */
export async function getRolesByCommand(
  command: string,
  options?: ConnectionOptions
): Promise<Record<SemanticRole, number>> {
  const db = getDatabase({ ...options, readonly: true });

  const rows = db
    .prepare(
      `
    SELECT pr.role, COUNT(*) as count
    FROM pattern_roles pr
    INNER JOIN code_examples ce ON pr.code_example_id = ce.id
    WHERE ce.raw_code LIKE ?
    GROUP BY pr.role
  `
    )
    .all(`%${command}%`) as { role: string; count: number }[];

  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.role] = row.count;
  }
  return result as Record<SemanticRole, number>;
}

// =============================================================================
// Role Write Operations
// =============================================================================

/**
 * Insert a pattern role into the database.
 */
export async function insertPatternRole(
  role: Omit<PatternRole, 'id'>,
  options?: ConnectionOptions
): Promise<number> {
  const db = getDatabase(options);
  const result = db
    .prepare(
      `
    INSERT INTO pattern_roles (code_example_id, command_index, role, role_value, role_type, required)
    VALUES (?, ?, ?, ?, ?, ?)
  `
    )
    .run(
      role.codeExampleId,
      role.commandIndex,
      role.role,
      role.roleValue,
      role.roleType,
      role.required ? 1 : 0
    );

  return result.lastInsertRowid as number;
}

/**
 * Delete all roles for a pattern.
 */
export async function deletePatternRoles(
  patternId: string,
  options?: ConnectionOptions
): Promise<number> {
  const db = getDatabase(options);
  const result = db.prepare('DELETE FROM pattern_roles WHERE code_example_id = ?').run(patternId);
  return result.changes;
}

/**
 * Delete all roles from the database.
 */
export async function clearAllRoles(options?: ConnectionOptions): Promise<number> {
  const db = getDatabase(options);
  const result = db.prepare('DELETE FROM pattern_roles').run();
  return result.changes;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Map database row to PatternRole type.
 */
function mapRowToPatternRole(row: PatternRoleRow): PatternRole {
  return {
    id: row.id,
    codeExampleId: row.code_example_id,
    commandIndex: row.command_index,
    role: row.role as SemanticRole,
    roleValue: row.role_value,
    roleType: row.role_type as RoleType | null,
    required: Boolean(row.required),
  };
}

/**
 * Map database row to Pattern type.
 */
function mapRowToPattern(row: CodeExampleRow): Pattern {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    rawCode: row.raw_code,
    category: row.feature,
    primaryCommand: extractPrimaryCommand(row.raw_code),
    tags: extractTags(row.raw_code),
    difficulty: inferDifficulty(row.raw_code),
    createdAt: new Date(row.created_at),
  };
}

function extractPrimaryCommand(code: string): string | null {
  const match = code.match(/^(on|toggle|put|set|add|remove|show|hide|wait|log|send|fetch|call)\b/i);
  return match ? match[1].toLowerCase() : null;
}

function extractTags(code: string): string[] {
  const tags: string[] = [];
  if (code.includes('.')) tags.push('class');
  if (code.includes('#')) tags.push('id');
  if (code.includes('on ')) tags.push('event');
  if (code.includes('fetch')) tags.push('async');
  if (code.includes('wait')) tags.push('timing');
  return tags;
}

function inferDifficulty(code: string): 'beginner' | 'intermediate' | 'advanced' {
  const lines = code.split('\n').filter(l => l.trim()).length;
  if (lines === 1 && !code.includes('then')) return 'beginner';
  if (lines <= 3) return 'intermediate';
  return 'advanced';
}
