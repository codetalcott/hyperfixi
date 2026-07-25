/**
 * BDD Natural Language Renderer
 *
 * Renders a SemanticNode back into natural-language BDD syntax
 * for a target language. Inverse of the parser.
 */

import type { SemanticNode } from '@lokascript/framework';
import { extractValue, createDomainRenderer } from '@lokascript/framework';
import { allSchemas } from '../schemas/index.js';
import { allProfiles } from '../profiles/index.js';

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
    tr: 'mevcut dir',
    fr: 'est existe',
  },
  visible: {
    en: 'is visible',
    es: 'es visible',
    ja: 'が 表示',
    ar: 'هو ظاهر',
    ko: '이 표시',
    zh: '是 可见',
    tr: 'görünür dir',
    fr: 'est visible',
  },
  hidden: {
    en: 'is hidden',
    es: 'es oculto',
    ja: 'が 非表示',
    ar: 'هو مخفي',
    ko: '이 숨김',
    zh: '是 隐藏',
    tr: 'gizli dir',
    fr: 'est caché',
  },
  loaded: {
    en: 'is loaded',
    es: 'es cargado',
    ja: 'が 読込',
    ar: 'هو محمل',
    ko: '이 로드됨',
    zh: '是 加载',
    tr: 'yüklü dir',
    fr: 'est chargé',
  },
  disabled: {
    en: 'is disabled',
    es: 'es deshabilitado',
    ja: 'が 無効',
    ar: 'هو معطل',
    ko: '이 비활성',
    zh: '是 禁用',
    tr: 'devre dışı dir',
    fr: 'est désactivé',
  },
  enabled: {
    en: 'is enabled',
    es: 'es habilitado',
    ja: 'が 有効',
    ar: 'هو مفعل',
    ko: '이 활성',
    zh: '是 启用',
    tr: 'etkin dir',
    fr: 'est activé',
  },
  checked: {
    en: 'is checked',
    es: 'es marcado',
    ja: 'が チェック済み',
    ar: 'هو محدد',
    ko: '이 체크됨',
    zh: '是 选中',
    tr: 'işaretli dir',
    fr: 'est coché',
  },
  focused: {
    en: 'is focused',
    es: 'es enfocado',
    ja: 'が フォーカス',
    ar: 'هو مركز',
    ko: '이 포커스',
    zh: '是 聚焦',
    tr: 'odaklanmış dir',
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

/**
 * The role marker each action phrase embeds, per language.
 *
 * `ACTION_WORDS` bundles the verb with the preposition or particle that
 * introduces the target (`click on`, `を クリック`, `üzerinde tıkla`). When a
 * `when` step has no target — which the schema allows — that marker has
 * nothing to introduce, and emitting the phrase whole produced dangling text
 * (`When click on`, `を クリック したら`). This table names the marker so it
 * can be stripped in exactly that case; the phrase is used verbatim, as
 * before, whenever a target IS present.
 *
 * An empty entry means the phrase embeds no marker.
 */
const ACTION_TARGET_MARKER: Record<string, Record<string, string>> = {
  click: { en: 'on', es: 'en', ja: 'を', ar: 'على', ko: '를', zh: '', tr: 'üzerinde', fr: 'sur' },
  type: { en: '', es: '', ja: 'に', ar: '', ko: '에', zh: '', tr: '', fr: '' },
  hover: { en: 'on', es: 'en', ja: 'を', ar: 'على', ko: '를', zh: '', tr: 'üzerinde', fr: 'sur' },
  navigate: { en: 'to', es: 'a', ja: 'に', ar: 'إلى', ko: '로', zh: '到', tr: '', fr: 'vers' },
  submit: { en: '', es: '', ja: 'を', ar: '', ko: '를', zh: '', tr: '', fr: '' },
  'double-click': {
    en: 'on',
    es: 'en',
    ja: 'を',
    ar: 'على',
    ko: '를',
    zh: '',
    tr: 'üzerinde',
    fr: 'sur',
  },
  'right-click': {
    en: 'on',
    es: 'en',
    ja: 'を',
    ar: 'على',
    ko: '를',
    zh: '',
    tr: 'üzerinde',
    fr: 'sur',
  },
  press: { en: '', es: '', ja: '', ar: '', ko: '', zh: '', tr: '', fr: '' },
  check: { en: '', es: '', ja: 'を', ar: '', ko: '를', zh: '', tr: '', fr: '' },
  uncheck: { en: '', es: '', ja: 'を', ar: '', ko: '를', zh: '', tr: '', fr: '' },
  select: { en: '', es: '', ja: 'を', ar: '', ko: '를', zh: '', tr: '', fr: '' },
  wait: { en: 'for', es: '', ja: 'を', ar: '', ko: '를', zh: '', tr: '', fr: '' },
};

// =============================================================================
// Helpers
// =============================================================================

function lookup(table: Record<string, Record<string, string>>, key: string, lang: string): string {
  return table[key.toLowerCase()]?.[lang] ?? key;
}

/**
 * Per-language marker for a role, read from the schemas — the same source the
 * parser reads, so the renderer cannot drift from what it accepts. Empty when
 * the schema declares none for that language.
 */
function schemaMarker(action: string, role: string, lang: string): string {
  const roles = allSchemas.find(s => s.action === action)?.roles;
  return roles?.find(r => r.role === role)?.markerOverride?.[lang] ?? '';
}

/**
 * Drop the target marker the action phrase embeds. SOV languages carry it
 * ahead of the verb, everything else behind it, so try both ends; a phrase
 * that does not actually contain it is returned untouched.
 */
function stripActionTargetMarker(phrase: string, action: string, lang: string): string {
  const marker = ACTION_TARGET_MARKER[action.toLowerCase()]?.[lang];
  if (!marker) return phrase;
  if (phrase.startsWith(marker)) return phrase.slice(marker.length).trim();
  if (phrase.endsWith(marker)) return phrase.slice(0, -marker.length).trim();
  return phrase;
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
  // With no target, the marker the phrase embeds has nothing to introduce.
  const actionPhrase = targetStr
    ? lookup(ACTION_WORDS, actionStr, lang)
    : stripActionTargetMarker(lookup(ACTION_WORDS, actionStr, lang), actionStr, lang);

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
  return `${keyword} ${parts.filter(Boolean).join(' ')}`.trim();
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
    // Both words come from the `then` schema, which already carries them:
    // the target particle (ja に, ko 에, tr de) and the "has" word (en has,
    // es tiene, ar يحتوي, zh 有, tr sahip, fr a — none for ja/ko, whose
    // particle carries the relation). This branch used to hardcode English
    // `has`, so Spanish rendered `Entonces #button has .active`.
    const particle = schemaMarker('then', 'target', lang);
    const hasWord = schemaMarker('then', 'assertion', lang);

    if (isSOV(lang)) {
      // SOV: target <particle> .class [has-word] keyword
      const middle = hasWord ? `${assertionStr} ${hasWord}` : assertionStr;
      return `${targetStr} ${particle} ${middle} ${keyword}`;
    }
    return [keyword, targetStr, hasWord, assertionStr].filter(Boolean).join(' ');
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
 * A scenario renders its statements recursively. A statement that cannot be
 * rendered fails the whole scenario rather than silently dropping a step —
 * a scenario missing a step reads as valid and is worse than no output.
 */
function renderScenario(node: SemanticNode, language: string): string | null {
  const compound = node as SemanticNode & { statements?: SemanticNode[]; name?: string };
  const statements = compound.statements ?? [];

  const lines: string[] = [];
  for (const statement of statements) {
    const line = renderBDD(statement, language);
    if (line === null) return null;
    lines.push(line);
  }

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

/**
 * Hand-written renderers per action, plus the schema-driven fallthrough for any
 * action they do not cover — which is how a command added via `DomainExtension`
 * renders without this package knowing about it.
 */
const renderer = createDomainRenderer({
  schemas: allSchemas,
  profiles: allProfiles,
  overrides: {
    given: renderGiven,
    when: renderWhen,
    then: renderThen,
    scenario: renderScenario,
  },
});

/**
 * Render a BDD SemanticNode to natural-language BDD text in the target language.
 *
 * @returns the rendered text, or `null` when the action has neither a
 *   hand-written renderer nor a schema (or a scenario contains such a statement).
 */
export function renderBDD(node: SemanticNode, language: string): string | null {
  return renderer(node, language);
}
