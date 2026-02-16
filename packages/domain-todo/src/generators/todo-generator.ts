import type { CodeGenerator, SemanticNode } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';

export const todoCodeGenerator: CodeGenerator = {
  generate(node: SemanticNode): string {
    switch (node.action) {
      case 'add':
        return generateAdd(node);
      case 'complete':
        return generateComplete(node);
      case 'list':
        return generateList(node);
      default:
        return JSON.stringify({ error: `unknown command: ${node.action}` });
    }
  },
};

function generateAdd(node: SemanticNode): string {
  const item = extractRoleValue(node, 'item') ?? 'Untitled';
  const list = extractRoleValue(node, 'list');
  const obj: Record<string, string> = { action: 'add', item };
  if (list) obj.list = list;
  return JSON.stringify(obj);
}

function generateComplete(node: SemanticNode): string {
  const item = extractRoleValue(node, 'item') ?? 'Untitled';
  return JSON.stringify({ action: 'complete', item });
}

function generateList(node: SemanticNode): string {
  const list = extractRoleValue(node, 'list');
  const obj: Record<string, string> = { action: 'list' };
  if (list) obj.list = list;
  return JSON.stringify(obj);
}
