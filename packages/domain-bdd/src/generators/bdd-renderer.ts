/**
 * BDD Natural Language Renderer
 *
 * Renders a SemanticNode back into natural-language BDD syntax
 * for a target language. Inverse of the parser.
 */

import type { SemanticNode } from '@lokascript/framework';
import { extractValue } from '@lokascript/framework';

// =============================================================================
// Keyword Tables
// =============================================================================

const STEP_KEYWORDS: Record<string, Record<string, string>> = {
  given: {
    en: 'Given',
    es: 'Dado',
    ja: '前提',
    ar: 'بافتراض',
    ko: '전제',
    zh: '假设',
    tr: 'Varsayalım',
    fr: 'Soit',
  },
  when: {
    en: 'When',
    es: 'Cuando',
    ja: 'したら',
    ar: 'عند',
    ko: '만약',
    zh: '当',
    tr: 'Olduğunda',
    fr: 'Quand',
  },
  then: {
    en: 'Then',
    es: 'Entonces',
    ja: 'ならば',
    ar: 'فإن',
    ko: '그러면',
    zh: '那么',
    tr: 'Sonra',
    fr: 'Alors',
  },
};

const STATE_WORDS: Record<string, Record<string, string>> = {
  exists: {
    en: 'is exists',
    es: 'es existe',
    ja: 'が 存在',
    ar: 'هو موجود',
    ko: '이 존재',
    zh: '是 存在',
    tr: 'dir mevcut',
    fr: 'est existe',
  },
  visible: {
    en: 'is visible',
    es: 'es visible',
    ja: 'が 表示',
    ar: 'هو ظاهر',
    ko: '이 표시',
    zh: '是 可见',
    tr: 'dir görünür',
    fr: 'est visible',
  },
  hidden: {
    en: 'is hidden',
    es: 'es oculto',
    ja: 'が 非表示',
    ar: 'هو مخفي',
    ko: '이 숨김',
    zh: '是 隐藏',
    tr: 'dir gizli',
    fr: 'est caché',
  },
  loaded: {
    en: 'is loaded',
    es: 'es cargado',
    ja: 'が 読込',
    ar: 'هو محمل',
    ko: '이 로드됨',
    zh: '是 加载',
    tr: 'dir yüklü',
    fr: 'est chargé',
  },
  disabled: {
    en: 'is disabled',
    es: 'es deshabilitado',
    ja: 'が 無効',
    ar: 'هو معطل',
    ko: '이 비활성',
    zh: '是 禁用',
    tr: 'dir devre dışı',
    fr: 'est désactivé',
  },
  enabled: {
    en: 'is enabled',
    es: 'es habilitado',
    ja: 'が 有効',
    ar: 'هو مفعل',
    ko: '이 활성',
    zh: '是 启用',
    tr: 'dir etkin',
    fr: 'est activé',
  },
  checked: {
    en: 'is checked',
    es: 'es marcado',
    ja: 'が チェック済み',
    ar: 'هو محدد',
    ko: '이 체크됨',
    zh: '是 选中',
    tr: 'dir işaretli',
    fr: 'est coché',
  },
  focused: {
    en: 'is focused',
    es: 'es enfocado',
    ja: 'が フォーカス',
    ar: 'هو مركز',
    ko: '이 포커스',
    zh: '是 聚焦',
    tr: 'dir odaklanmış',
    fr: 'est focalisé',
  },
};

const ACTION_WORDS: Record<string, Record<string, string>> = {
  click: {
    en: 'click on',
    es: 'clic en',
    ja: 'を クリック',
    ar: 'نقر على',
    ko: '를 클릭',
    zh: '点击',
    tr: 'üzerinde tıkla',
    fr: 'clic sur',
  },
  type: {
    en: 'type',
    es: 'escribir',
    ja: 'に 入力',
    ar: 'كتابة',
    ko: '에 입력',
    zh: '输入',
    tr: 'yaz',
    fr: 'saisir',
  },
  hover: {
    en: 'hover on',
    es: 'sobrevolar en',
    ja: 'を ホバー',
    ar: 'تحويم على',
    ko: '를 호버',
    zh: '悬停',
    tr: 'üzerinde hover',
    fr: 'survol sur',
  },
  navigate: {
    en: 'navigate to',
    es: 'navegar a',
    ja: 'に 移動',
    ar: 'انتقال إلى',
    ko: '로 이동',
    zh: '导航到',
    tr: 'git',
    fr: 'naviguer vers',
  },
  submit: {
    en: 'submit',
    es: 'enviar',
    ja: 'を 送信',
    ar: 'إرسال',
    ko: '를 제출',
    zh: '提交',
    tr: 'gönder',
    fr: 'soumettre',
  },
  'double-click': {
    en: 'double-click on',
    es: 'doble-clic en',
    ja: 'を ダブルクリック',
    ar: 'نقر-مزدوج على',
    ko: '를 더블클릭',
    zh: '双击',
    tr: 'üzerinde çift-tıkla',
    fr: 'double-clic sur',
  },
  'right-click': {
    en: 'right-click on',
    es: 'clic-derecho en',
    ja: 'を 右クリック',
    ar: 'نقر-يمين على',
    ko: '를 우클릭',
    zh: '右击',
    tr: 'üzerinde sağ-tıkla',
    fr: 'clic-droit sur',
  },
  press: {
    en: 'press',
    es: 'presionar',
    ja: 'キー',
    ar: 'ضغط',
    ko: '키',
    zh: '按',
    tr: 'bas',
    fr: 'appuyer',
  },
  check: {
    en: 'check',
    es: 'marcar',
    ja: 'を チェック',
    ar: 'تحديد',
    ko: '를 체크',
    zh: '勾选',
    tr: 'işaretle',
    fr: 'cocher',
  },
  uncheck: {
    en: 'uncheck',
    es: 'desmarcar',
    ja: 'を チェック解除',
    ar: 'إلغاء-تحديد',
    ko: '를 체크해제',
    zh: '取消勾选',
    tr: 'işareti-kaldır',
    fr: 'décocher',
  },
  select: {
    en: 'select',
    es: 'seleccionar',
    ja: 'を 選択',
    ar: 'اختيار',
    ko: '를 선택',
    zh: '选择',
    tr: 'seç',
    fr: 'sélectionner',
  },
  wait: {
    en: 'wait for',
    es: 'esperar',
    ja: 'を 待機',
    ar: 'انتظار',
    ko: '를 대기',
    zh: '等待',
    tr: 'bekle',
    fr: 'attendre',
  },
};

const ASSERTION_WORDS: Record<string, Record<string, string>> = {
  visible: {
    en: 'has visible',
    es: 'tiene visible',
    ja: 'に visible',
    ar: 'يحتوي ظاهر',
    ko: '에 표시',
    zh: '有 可见',
    tr: 'sahip görünür',
    fr: 'a visible',
  },
  hidden: {
    en: 'has hidden',
    es: 'tiene oculto',
    ja: 'に 非表示',
    ar: 'يحتوي مخفي',
    ko: '에 숨김',
    zh: '有 隐藏',
    tr: 'sahip gizli',
    fr: 'a caché',
  },
  text: {
    en: 'has text',
    es: 'tiene texto',
    ja: 'に テキスト',
    ar: 'يحتوي نص',
    ko: '에 텍스트',
    zh: '有 文本',
    tr: 'sahip metin',
    fr: 'a texte',
  },
  count: {
    en: 'has count',
    es: 'tiene cantidad',
    ja: 'に 数',
    ar: 'يحتوي عدد',
    ko: '에 수',
    zh: '有 数量',
    tr: 'sahip sayı',
    fr: 'a nombre',
  },
  value: {
    en: 'has value',
    es: 'tiene valor',
    ja: 'に 値',
    ar: 'يحتوي قيمة',
    ko: '에 값',
    zh: '有 值',
    tr: 'sahip değer',
    fr: 'a valeur',
  },
  contains: {
    en: 'contains',
    es: 'contiene',
    ja: 'を 含む',
    ar: 'يحتوي-على',
    ko: '를 포함',
    zh: '包含',
    tr: 'içerir',
    fr: 'contient',
  },
  disabled: {
    en: 'has disabled',
    es: 'tiene deshabilitado',
    ja: 'に 無効',
    ar: 'يحتوي معطل',
    ko: '에 비활성',
    zh: '有 禁用',
    tr: 'sahip devre dışı',
    fr: 'a désactivé',
  },
  checked: {
    en: 'has checked',
    es: 'tiene marcado',
    ja: 'に チェック済み',
    ar: 'يحتوي محدد',
    ko: '에 체크됨',
    zh: '有 选中',
    tr: 'sahip işaretli',
    fr: 'a coché',
  },
  focused: {
    en: 'has focused',
    es: 'tiene enfocado',
    ja: 'に フォーカス',
    ar: 'يحتوي مركز',
    ko: '에 포커스',
    zh: '有 聚焦',
    tr: 'sahip odaklanmış',
    fr: 'a focalisé',
  },
};

// =============================================================================
// Helpers
// =============================================================================

function lookup(table: Record<string, Record<string, string>>, key: string, lang: string): string {
  return table[key.toLowerCase()]?.[lang] ?? key;
}

// =============================================================================
// Word Order Helpers
// =============================================================================

const SOV_LANGUAGES = new Set(['ja', 'ko', 'tr']);
const VSO_LANGUAGES = new Set(['ar']);

function isSOV(lang: string): boolean {
  return SOV_LANGUAGES.has(lang);
}

function isVSO(lang: string): boolean {
  return VSO_LANGUAGES.has(lang);
}

// =============================================================================
// Renderers
// =============================================================================

function renderGiven(node: SemanticNode, lang: string): string {
  const keyword = STEP_KEYWORDS.given[lang] ?? 'Given';
  const target = node.roles.get('target');
  const state = node.roles.get('state');
  const targetStr = target ? extractValue(target) : '';
  const stateStr = state ? extractValue(state) : 'visible';
  const statePhrase = lookup(STATE_WORDS, stateStr, lang);

  if (isSOV(lang)) {
    // SOV: target state keyword
    return `${targetStr} ${statePhrase} ${keyword}`;
  }
  if (isVSO(lang)) {
    // VSO: keyword target state
    return `${keyword} ${targetStr} ${statePhrase}`;
  }
  // SVO: keyword target state
  return `${keyword} ${targetStr} ${statePhrase}`;
}

function renderWhen(node: SemanticNode, lang: string): string {
  const keyword = STEP_KEYWORDS.when[lang] ?? 'When';
  const actionType = node.roles.get('action_type');
  const target = node.roles.get('target');
  const value = node.roles.get('value');
  const actionStr = actionType ? extractValue(actionType) : 'click';
  const targetStr = target ? extractValue(target) : '';
  const valueStr = value ? extractValue(value) : '';
  const actionPhrase = lookup(ACTION_WORDS, actionStr, lang);

  const parts = [actionPhrase, targetStr];
  if (valueStr) parts.push(valueStr);

  if (isSOV(lang)) {
    // SOV: target action keyword
    return `${targetStr} ${actionPhrase} ${keyword}`.trim();
  }
  if (isVSO(lang)) {
    // VSO: keyword action target
    return `${keyword} ${actionPhrase} ${targetStr}`.trim();
  }
  // SVO: keyword action target [value]
  return `${keyword} ${parts.join(' ')}`.trim();
}

function renderThen(node: SemanticNode, lang: string): string {
  const keyword = STEP_KEYWORDS.then[lang] ?? 'Then';
  const target = node.roles.get('target');
  const assertion = node.roles.get('assertion');
  const expectedValue = node.roles.get('expected_value');
  const targetStr = target ? extractValue(target) : '';
  const assertionStr = assertion ? extractValue(assertion) : '';
  const expectedStr = expectedValue ? extractValue(expectedValue) : '';

  // CSS class assertion
  if (assertionStr.startsWith('.')) {
    const assertPhrase = `has ${assertionStr}`;
    if (isSOV(lang)) return `${targetStr} に ${assertionStr} ${keyword}`;
    return `${keyword} ${targetStr} ${assertPhrase}`;
  }

  const assertPhrase = lookup(ASSERTION_WORDS, assertionStr, lang);
  const valuePart = expectedStr ? ` ${expectedStr}` : '';

  if (isSOV(lang)) {
    return `${targetStr} ${assertPhrase}${valuePart} ${keyword}`;
  }
  // SVO/VSO: keyword target assertion [value]
  return `${keyword} ${targetStr} ${assertPhrase}${valuePart}`.trim();
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Render a BDD SemanticNode to natural-language BDD text in the target language.
 */
export function renderBDD(node: SemanticNode, language: string): string {
  switch (node.action) {
    case 'given':
      return renderGiven(node, language);
    case 'when':
      return renderWhen(node, language);
    case 'then':
      return renderThen(node, language);
    case 'scenario': {
      const compound = node as SemanticNode & { statements?: SemanticNode[]; name?: string };
      const statements = compound.statements ?? [];
      const lines = statements.map(s => renderBDD(s, language));
      if (compound.name) {
        const scenarioKw: Record<string, string> = {
          en: 'Scenario:',
          es: 'Escenario:',
          ja: 'シナリオ:',
          ar: 'سيناريو:',
          ko: '시나리오:',
          zh: '场景:',
          tr: 'Senaryo:',
          fr: 'Scénario:',
        };
        const header = `${scenarioKw[language] ?? 'Scenario:'} ${compound.name}`;
        return [header, ...lines.map(l => `  ${l}`)].join('\n');
      }
      return lines.join('\n');
    }
    default:
      return `// Unknown: ${node.action}`;
  }
}
