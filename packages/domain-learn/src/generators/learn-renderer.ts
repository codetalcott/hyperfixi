/**
 * Learn Renderer — SemanticNode → DSL text in any language
 *
 * Inverse of the parser: converts a parsed SemanticNode back to
 * natural-language DSL text. Used for cross-language translation
 * exercises and round-trip verification.
 */

import type { SemanticNode } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';

/** Verb keyword translations: action → language → native keyword */
const COMMAND_KEYWORDS: Record<string, Record<string, string>> = {
  add: {
    en: 'add',
    ja: '追加して',
    es: 'agrega',
    ar: 'أضف',
    zh: '添加',
    ko: '추가해',
    fr: 'ajoute',
    tr: 'ekle',
    de: 'füge hinzu',
    pt: 'adicione',
  },
  remove: {
    en: 'remove',
    ja: '削除して',
    es: 'elimina',
    ar: 'أزل',
    zh: '移除',
    ko: '제거해',
    fr: 'supprime',
    tr: 'kaldır',
    de: 'entferne',
    pt: 'remova',
  },
  toggle: {
    en: 'toggle',
    ja: '切り替えて',
    es: 'alterna',
    ar: 'بدّل',
    zh: '切换',
    ko: '전환해',
    fr: 'bascule',
    tr: 'değiştir',
    de: 'schalte um',
    pt: 'alterne',
  },
  put: {
    en: 'put',
    ja: '置いて',
    es: 'pon',
    ar: 'ضع',
    zh: '放置',
    ko: '넣어',
    fr: 'mets',
    tr: 'koy',
    de: 'setze',
    pt: 'coloque',
  },
  set: {
    en: 'set',
    ja: '設定して',
    es: 'establece',
    ar: 'عيّن',
    zh: '设置',
    ko: '설정해',
    fr: 'définis',
    tr: 'ayarla',
    de: 'stelle ein',
    pt: 'defina',
  },
  show: {
    en: 'show',
    ja: '表示して',
    es: 'muestra',
    ar: 'أظهر',
    zh: '显示',
    ko: '표시해',
    fr: 'affiche',
    tr: 'göster',
    de: 'zeige',
    pt: 'mostre',
  },
  hide: {
    en: 'hide',
    ja: '隠して',
    es: 'oculta',
    ar: 'أخفِ',
    zh: '隐藏',
    ko: '숨겨',
    fr: 'masque',
    tr: 'gizle',
    de: 'verberge',
    pt: 'esconda',
  },
  get: {
    en: 'get',
    ja: '取得して',
    es: 'obtén',
    ar: 'احصل',
    zh: '获取',
    ko: '가져와',
    fr: 'obtiens',
    tr: 'al',
    de: 'rufe ab',
    pt: 'obtenha',
  },
  wait: {
    en: 'wait',
    ja: '待って',
    es: 'espera',
    ar: 'انتظر',
    zh: '等待',
    ko: '기다려',
    fr: 'attends',
    tr: 'bekle',
    de: 'warte',
    pt: 'espere',
  },
  fetch: {
    en: 'fetch',
    ja: '取得して',
    es: 'busca',
    ar: 'اجلب',
    zh: '获取',
    ko: '가져와',
    fr: 'récupère',
    tr: 'getir',
    de: 'rufe ab',
    pt: 'busque',
  },
  send: {
    en: 'send',
    ja: '送って',
    es: 'envía',
    ar: 'أرسل',
    zh: '发送',
    ko: '보내',
    fr: 'envoie',
    tr: 'gönder',
    de: 'sende',
    pt: 'envie',
  },
  go: {
    en: 'go',
    ja: '行って',
    es: 've',
    ar: 'اذهب',
    zh: '前往',
    ko: '이동해',
    fr: 'va',
    tr: 'git',
    de: 'gehe',
    pt: 'vá',
  },
  increment: {
    en: 'increment',
    ja: '増加して',
    es: 'incrementa',
    ar: 'زد',
    zh: '增加',
    ko: '증가시켜',
    fr: 'incrémente',
    tr: 'artır',
    de: 'erhöhe',
    pt: 'incremente',
  },
  decrement: {
    en: 'decrement',
    ja: '減少して',
    es: 'decrementa',
    ar: 'أنقص',
    zh: '减少',
    ko: '감소시켜',
    fr: 'décrémente',
    tr: 'azalt',
    de: 'verringere',
    pt: 'decremente',
  },
  take: {
    en: 'take',
    ja: '取って',
    es: 'toma',
    ar: 'خذ',
    zh: '取走',
    ko: '가져가',
    fr: 'prends',
    tr: 'al',
    de: 'nimm',
    pt: 'pegue',
  },
};

/** Role marker translations for DSL text rendering */
const MARKERS: Record<string, Record<string, string>> = {
  to: {
    en: 'to',
    ja: 'に',
    es: 'a',
    ar: 'إلى',
    zh: '到',
    ko: '에',
    fr: 'à',
    tr: 'a',
    de: 'zu',
    pt: 'a',
  },
  from: {
    en: 'from',
    ja: 'から',
    es: 'de',
    ar: 'من',
    zh: '从',
    ko: '에서',
    fr: 'de',
    tr: 'dan',
    de: 'von',
    pt: 'de',
  },
  into: {
    en: 'into',
    ja: 'に',
    es: 'en',
    ar: 'في',
    zh: '到',
    ko: '에',
    fr: 'dans',
    tr: 'a',
    de: 'in',
    pt: 'em',
  },
  on: {
    en: 'on',
    ja: 'で',
    es: 'en',
    ar: 'على',
    zh: '在',
    ko: '에',
    fr: 'sur',
    tr: 'da',
    de: 'auf',
    pt: 'em',
  },
};

const SOV_LANGUAGES = new Set(['ja', 'ko', 'tr']);

/**
 * Render a SemanticNode as DSL text in the target language.
 * Produces the commanding form (imperative) of the command.
 */
export function renderLearn(node: SemanticNode, language: string): string {
  const keyword = COMMAND_KEYWORDS[node.action]?.[language] ?? node.action;
  const patient = extractRoleValue(node, 'patient') || '';
  const destination = extractRoleValue(node, 'destination') || '';
  const source = extractRoleValue(node, 'source') || '';

  const parts: string[] = [];

  if (SOV_LANGUAGES.has(language)) {
    // SOV: target markers patient markers verb
    if (destination) {
      const marker = MARKERS.to[language] || '';
      parts.push(marker ? `${destination}${marker}` : destination);
    }
    if (source) {
      const marker = MARKERS.from[language] || '';
      parts.push(marker ? `${source}${marker}` : source);
    }
    if (patient) parts.push(patient);
    parts.push(keyword);
  } else {
    // SVO/VSO: verb patient marker target
    parts.push(keyword);
    if (patient) parts.push(patient);
    if (destination) {
      const marker = MARKERS.to[language] || '';
      if (marker) parts.push(marker);
      parts.push(destination);
    }
    if (source) {
      const marker = MARKERS.from[language] || '';
      if (marker) parts.push(marker);
      parts.push(source);
    }
  }

  return parts.filter(Boolean).join(' ');
}
