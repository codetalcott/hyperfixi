/**
 * SQL Code Generator
 *
 * Transforms semantic AST nodes into standard SQL output.
 * Always generates English SQL keywords (SELECT, FROM, WHERE, etc.)
 * regardless of the input language.
 */

import type { SemanticNode, CodeGenerator } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';

function generateSelect(node: SemanticNode): string {
  const columnsStr = extractRoleValue(node, 'columns') || '*';
  const sourceStr = extractRoleValue(node, 'source') || 'table';
  const conditionStr = extractRoleValue(node, 'condition');

  let sql = `SELECT ${columnsStr} FROM ${sourceStr}`;
  if (conditionStr) sql += ` WHERE ${conditionStr}`;
  return sql;
}

function generateInsert(node: SemanticNode): string {
  const valuesStr = extractRoleValue(node, 'values') || '()';
  const destStr = extractRoleValue(node, 'destination') || 'table';

  return `INSERT INTO ${destStr} VALUES (${valuesStr})`;
}

function generateUpdate(node: SemanticNode): string {
  const sourceStr = extractRoleValue(node, 'source') || 'table';
  const valuesStr = extractRoleValue(node, 'values');
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
    switch (node.action) {
      case 'select':
        return generateSelect(node);
      case 'insert':
        return generateInsert(node);
      case 'update':
        return generateUpdate(node);
      case 'delete':
        return generateDelete(node);
      default:
        throw new Error(`Unknown SQL command: ${node.action}`);
    }
  },
};
