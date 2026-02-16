import { defineCommand, defineRole } from '@lokascript/framework';
import type { CommandSchema } from '@lokascript/framework';

// =============================================================================
// add — Add a task to a list
//   EN: add "Buy milk" to groceries
//   ES: agregar "Comprar leche" a compras
//   JA: 買い物 に "牛乳を買う" を 追加
// =============================================================================

export const addSchema = defineCommand({
  action: 'add',
  description: 'Add a task to a list',
  category: 'mutation',
  primaryRole: 'item',
  roles: [
    defineRole({
      role: 'item',
      description: 'The task to add',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2, // First after verb: "add <item> ..."
      sovPosition: 1, // Second in SOV: "... <item> を 追加"
      markerOverride: { ja: 'を' },
    }),
    defineRole({
      role: 'list',
      description: 'The list to add the task to',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 1, // Second after verb: "... to <list>"
      sovPosition: 2, // First in SOV: "<list> に ..."
      markerOverride: { en: 'to', es: 'a', ja: 'に' },
    }),
  ],
});

// =============================================================================
// complete — Mark a task as done
//   EN: complete "Buy milk"
//   ES: completar "Comprar leche"
//   JA: "牛乳を買う" を 完了
// =============================================================================

export const completeSchema = defineCommand({
  action: 'complete',
  description: 'Mark a task as done',
  category: 'mutation',
  primaryRole: 'item',
  roles: [
    defineRole({
      role: 'item',
      description: 'The task to complete',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
      markerOverride: { ja: 'を' },
    }),
  ],
});

// =============================================================================
// list — Show tasks in a list
//   EN: list groceries
//   ES: listar compras
//   JA: 買い物 を 一覧
// =============================================================================

export const listSchema = defineCommand({
  action: 'list',
  description: 'Show tasks in a list',
  category: 'query',
  primaryRole: 'list',
  roles: [
    defineRole({
      role: 'list',
      description: 'The list to show',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
      markerOverride: { ja: 'を' },
    }),
  ],
});

export const allSchemas: CommandSchema[] = [addSchema, completeSchema, listSchema];
