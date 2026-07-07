import { defineCommand, defineRole } from '@lokascript/framework';
import type { CommandSchema } from '@lokascript/framework';

// =============================================================================
// add — Add a task to a list
//   EN: add "Buy milk" to groceries
//   ES: agregar "Comprar leche" a compras
//   JA: 買い物 に ミルク を 追加
//   AR: أضف حليب إلى مشتريات
//   KO: 장보기 에 우유 를 추가
//   ZH: 添加 牛奶 到 杂货
//   TR: alışveriş e süt ekle
//   FR: ajouter lait à courses
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
      markerOverride: { ja: 'を', ko: '를' },
    }),
    defineRole({
      role: 'list',
      description: 'The list to add the task to',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 1, // Second after verb: "... to <list>"
      sovPosition: 2, // First in SOV: "<list> に ..."
      markerOverride: {
        en: 'to',
        es: 'a',
        ja: 'に',
        ar: 'إلى',
        ko: '에',
        zh: '到',
        tr: 'e',
        fr: 'à',
        // Bridge-era languages (arc Phase 2 expansion), all SVO.
        de: 'zu',
        pt: 'a',
        ru: 'в',
      },
    }),
  ],
});

// =============================================================================
// complete — Mark a task as done
//   EN: complete milk
//   ES: completar leche
//   JA: ミルク を 完了
//   AR: أكمل حليب
//   KO: 우유 를 완료
//   ZH: 完成 牛奶
//   TR: süt tamamla
//   FR: terminer lait
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
      markerOverride: { ja: 'を', ko: '를' },
    }),
  ],
});

// =============================================================================
// list — Show tasks in a list
//   EN: list groceries
//   ES: listar compras
//   JA: 買い物 を 一覧
//   AR: اعرض مشتريات
//   KO: 장보기 를 목록
//   ZH: 列出 杂货
//   TR: alışveriş listele
//   FR: lister courses
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
      markerOverride: { ja: 'を', ko: '를' },
    }),
  ],
});

export const allSchemas: CommandSchema[] = [addSchema, completeSchema, listSchema];
