/**
 * SQL Code Generator
 *
 * Transforms semantic AST nodes into standard SQL output.
 * Always generates English SQL keywords (SELECT, FROM, WHERE, etc.)
 * regardless of the input language.
 */

import type { SemanticNode, CodeGenerator } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';
import { NATURAL_LOWERINGS } from './natural-lowering';

function generateSelect(node: SemanticNode): string {
  const columnsStr = extractRoleValue(node, 'columns') || '*';
  const sourceStr = extractRoleValue(node, 'source') || 'table';
  const conditionStr = extractRoleValue(node, 'condition');
  const limitStr = extractRoleValue(node, 'limit');

  let sql = `SELECT ${columnsStr} FROM ${sourceStr}`;
  if (conditionStr) sql += ` WHERE ${conditionStr}`;
  if (limitStr) sql += ` LIMIT ${limitStr}`;
  return sql;
}

function generateInsert(node: SemanticNode): string {
  const valuesStr = extractRoleValue(node, 'values') || '()';
  const destStr = extractRoleValue(node, 'destination') || 'table';

  return `INSERT INTO ${destStr} VALUES (${valuesStr})`;
}

function generateUpdate(node: SemanticNode): string {
  const sourceStr = extractRoleValue(node, 'source') || 'table';
  const valuesStr = extractRoleValue(node, 'values') || 'column = value';
  const conditionStr = extractRoleValue(node, 'condition');

  let sql = `UPDATE ${sourceStr} SET ${valuesStr}`;
  if (conditionStr) sql += ` WHERE ${conditionStr}`;
  return sql;
}

function generateDelete(node: SemanticNode): string {
  const sourceStr = extractRoleValue(node, 'source') || 'table';
  const conditionStr = extractRoleValue(node, 'condition');

  let sql = `DELETE FROM ${sourceStr}`;
  if (conditionStr) sql += ` WHERE ${conditionStr}`;
  return sql;
}

/**
 * SQL code generator implementation.
 */
export const sqlCodeGenerator: CodeGenerator = {
  generate(node: SemanticNode): string {
    const lower = NATURAL_LOWERINGS[node.action];
    const effective = lower ? lower(node) : node;
    switch (effective.action) {
      case 'select':
        return generateSelect(effective);
      case 'insert':
        return generateInsert(effective);
      case 'update':
        return generateUpdate(effective);
      case 'delete':
        return generateDelete(effective);
      default:
        throw new Error(`Unknown SQL command: ${effective.action}`);
    }
  },
};
