/**
 * Voice Natural Language Renderer
 *
 * Renders a SemanticNode back into natural-language voice command syntax
 * for a target language. Inverse of the parser.
 *
 * Markers are derived from schemas (single source of truth) rather than
 * maintained as a parallel data structure.
 */

import type { SemanticNode, CommandSchema } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';
import { allSchemas } from '../schemas/index';

// =============================================================================
// Keyword Tables
// =============================================================================

const COMMAND_KEYWORDS: Record<string, Record<string, string>> = {
  navigate: {
    en: 'navigate',
    es: 'navegar',
    ja: '移動',
    ar: 'انتقل',
    ko: '이동',
    zh: '导航',
    tr: 'git',
    fr: 'naviguer',
  },
  click: {
    en: 'click',
    es: 'clic',
    ja: 'クリック',
    ar: 'انقر',
    ko: '클릭',
    zh: '点击',
    tr: 'tıkla',
    fr: 'cliquer',
  },
  type: {
    en: 'type',
    es: 'escribir',
    ja: '入力',
    ar: 'اكتب',
    ko: '입력',
    zh: '输入',
    tr: 'yaz',
    fr: 'taper',
  },
  scroll: {
    en: 'scroll',
    es: 'desplazar',
    ja: 'スクロール',
    ar: 'تمرير',
    ko: '스크롤',
    zh: '滚动',
    tr: 'kaydır',
    fr: 'défiler',
  },
  read: {
    en: 'read',
    es: 'leer',
    ja: '読む',
    ar: 'اقرأ',
    ko: '읽기',
    zh: '朗读',
    tr: 'oku',
    fr: 'lire',
  },
  zoom: {
    en: 'zoom',
    es: 'zoom',
    ja: 'ズーム',
    ar: 'تكبير',
    ko: '확대',
    zh: '缩放',
    tr: 'yakınlaş',
    fr: 'zoomer',
  },
  select: {
    en: 'select',
    es: 'seleccionar',
    ja: '選択',
    ar: 'اختر',
    ko: '선택',
    zh: '选择',
    tr: 'seç',
    fr: 'sélectionner',
  },
  back: {
    en: 'back',
    es: 'atrás',
    ja: '戻る',
    ar: 'رجوع',
    ko: '뒤로',
    zh: '返回',
    tr: 'geri',
    fr: 'retour',
  },
  forward: {
    en: 'forward',
    es: 'adelante',
    ja: '進む',
    ar: 'تقدم',
    ko: '앞으로',
    zh: '前进',
    tr: 'ileri',
    fr: 'avancer',
  },
  focus: {
    en: 'focus',
    es: 'enfocar',
    ja: 'フォーカス',
    ar: 'ركز',
    ko: '포커스',
    zh: '聚焦',
    tr: 'odakla',
    fr: 'focaliser',
  },
  close: {
    en: 'close',
    es: 'cerrar',
    ja: '閉じる',
    ar: 'أغلق',
    ko: '닫기',
    zh: '关闭',
    tr: 'kapat',
    fr: 'fermer',
  },
  open: {
    en: 'open',
    es: 'abrir',
    ja: '開く',
    ar: 'افتح',
    ko: '열기',
    zh: '打开',
    tr: 'aç',
    fr: 'ouvrir',
  },
  search: {
    en: 'search',
    es: 'buscar',
    ja: '検索',
    ar: 'ابحث',
    ko: '검색',
    zh: '搜索',
    tr: 'ara',
    fr: 'chercher',
  },
  help: {
    en: 'help',
    es: 'ayuda',
    ja: 'ヘルプ',
    ar: 'مساعدة',
    ko: '도움말',
    zh: '帮助',
    tr: 'yardım',
    fr: 'aide',
  },
};

// =============================================================================
// Schema-Derived Marker Lookup (single source of truth)
// =============================================================================

type MarkerLookup = Record<string, Record<string, Record<string, string>>>;

function buildMarkerLookup(schemas: CommandSchema[]): MarkerLookup {
  const lookup: MarkerLookup = {};
  for (const schema of schemas) {
    const actionMarkers: Record<string, Record<string, string>> = {};
    for (const role of schema.roles) {
      if (role.markerOverride) {
        actionMarkers[role.role] = role.markerOverride as Record<string, string>;
      }
    }
    lookup[schema.action] = actionMarkers;
  }
  return lookup;
}

const SCHEMA_MARKERS = buildMarkerLookup(allSchemas);

/** Get marker for a specific action + role + language from schemas. */
function getMarker(action: string, role: string, lang: string): string {
  return SCHEMA_MARKERS[action]?.[role]?.[lang] ?? '';
}

// =============================================================================
// Word Order Helpers
// =============================================================================

const SOV_LANGUAGES = new Set(['ja', 'ko', 'tr']);

function kw(command: string, lang: string): string {
  return COMMAND_KEYWORDS[command]?.[lang] ?? command;
}

// =============================================================================
// Per-Command Renderers
// =============================================================================

function renderSingleRole(node: SemanticNode, lang: string, roleName: string): string {
  const value = extractRoleValue(node, roleName) || '';
  const keyword = kw(node.action, lang);

  if (!value) return keyword;

  if (SOV_LANGUAGES.has(lang)) {
    const parts = [value];
    const marker = getMarker(node.action, roleName, lang);
    if (marker) parts.push(marker);
    parts.push(keyword);
    return parts.join(' ');
  }

  // SVO / VSO: keyword [marker] value
  const marker = getMarker(node.action, roleName, lang);
  if (marker) return `${keyword} ${marker} ${value}`;
  return `${keyword} ${value}`;
}

function renderNavigate(node: SemanticNode, lang: string): string {
  const dest = extractRoleValue(node, 'destination') || '';
  const keyword = kw('navigate', lang);

  if (!dest) return keyword;

  const marker = getMarker('navigate', 'destination', lang);

  if (SOV_LANGUAGES.has(lang)) {
    return marker ? `${dest} ${marker} ${keyword}` : `${dest} ${keyword}`;
  }

  return marker ? `${keyword} ${marker} ${dest}` : `${keyword} ${dest}`;
}

function renderClick(node: SemanticNode, lang: string): string {
  return renderSingleRole(node, lang, 'patient');
}

function renderType(node: SemanticNode, lang: string): string {
  const text = extractRoleValue(node, 'patient') || '';
  const dest = extractRoleValue(node, 'destination');
  const keyword = kw('type', lang);

  if (!text) return keyword;

  if (SOV_LANGUAGES.has(lang)) {
    const parts: string[] = [];
    if (dest) {
      parts.push(dest);
      const destMarker = getMarker('type', 'destination', lang);
      if (destMarker) parts.push(destMarker);
    }
    parts.push(text);
    const patientMarker = getMarker('type', 'patient', lang);
    if (patientMarker) parts.push(patientMarker);
    parts.push(keyword);
    return parts.join(' ');
  }

  // SVO: keyword text [into dest]
  const parts = [keyword, text];
  if (dest) {
    const destMarker = getMarker('type', 'destination', lang);
    if (destMarker) parts.push(destMarker);
    parts.push(dest);
  }
  return parts.filter(Boolean).join(' ');
}

function renderScroll(node: SemanticNode, lang: string): string {
  const manner = extractRoleValue(node, 'manner') || '';
  const keyword = kw('scroll', lang);

  if (!manner) return keyword;

  if (SOV_LANGUAGES.has(lang)) {
    return `${manner} ${keyword}`;
  }

  return `${keyword} ${manner}`;
}

function renderRead(node: SemanticNode, lang: string): string {
  return renderSingleRole(node, lang, 'patient');
}

function renderZoom(node: SemanticNode, lang: string): string {
  const manner = extractRoleValue(node, 'manner') || '';
  const keyword = kw('zoom', lang);

  if (!manner) return keyword;

  if (SOV_LANGUAGES.has(lang)) {
    return `${manner} ${keyword}`;
  }

  return `${keyword} ${manner}`;
}

function renderSelect(node: SemanticNode, lang: string): string {
  return renderSingleRole(node, lang, 'patient');
}

function renderBack(node: SemanticNode, lang: string): string {
  const quantity = extractRoleValue(node, 'quantity');
  const keyword = kw('back', lang);
  if (quantity) return `${keyword} ${quantity}`;
  return keyword;
}

function renderForward(node: SemanticNode, lang: string): string {
  const quantity = extractRoleValue(node, 'quantity');
  const keyword = kw('forward', lang);
  if (quantity) return `${keyword} ${quantity}`;
  return keyword;
}

function renderFocus(node: SemanticNode, lang: string): string {
  const patient = extractRoleValue(node, 'patient') || '';
  const keyword = kw('focus', lang);

  if (!patient) return keyword;

  if (SOV_LANGUAGES.has(lang)) {
    const marker = getMarker('focus', 'patient', lang);
    return marker ? `${patient} ${marker} ${keyword}` : `${patient} ${keyword}`;
  }

  return `${keyword} ${patient}`;
}

function renderClose(node: SemanticNode, lang: string): string {
  return renderSingleRole(node, lang, 'patient');
}

function renderOpen(node: SemanticNode, lang: string): string {
  return renderSingleRole(node, lang, 'patient');
}

function renderSearch(node: SemanticNode, lang: string): string {
  const query = extractRoleValue(node, 'patient') || '';
  const dest = extractRoleValue(node, 'destination');
  const keyword = kw('search', lang);

  if (!query) return keyword;

  if (SOV_LANGUAGES.has(lang)) {
    const parts: string[] = [];
    if (dest) {
      parts.push(dest);
      const destMarker = getMarker('search', 'destination', lang);
      if (destMarker) parts.push(destMarker);
    }
    parts.push(query);
    const patientMarker = getMarker('search', 'patient', lang);
    if (patientMarker) parts.push(patientMarker);
    parts.push(keyword);
    return parts.filter(Boolean).join(' ');
  }

  // SVO: keyword query [in dest]
  const parts = [keyword, query];
  if (dest) {
    const destMarker = getMarker('search', 'destination', lang);
    if (destMarker) parts.push(destMarker, dest);
  }
  return parts.join(' ');
}

function renderHelp(node: SemanticNode, lang: string): string {
  const topic = extractRoleValue(node, 'patient');
  const keyword = kw('help', lang);
  if (topic) return `${keyword} ${topic}`;
  return keyword;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Render a voice SemanticNode to natural-language voice command text in the target language.
 */
export function renderVoice(node: SemanticNode, language: string): string {
  switch (node.action) {
    case 'navigate':
      return renderNavigate(node, language);
    case 'click':
      return renderClick(node, language);
    case 'type':
      return renderType(node, language);
    case 'scroll':
      return renderScroll(node, language);
    case 'read':
      return renderRead(node, language);
    case 'zoom':
      return renderZoom(node, language);
    case 'select':
      return renderSelect(node, language);
    case 'back':
      return renderBack(node, language);
    case 'forward':
      return renderForward(node, language);
    case 'focus':
      return renderFocus(node, language);
    case 'close':
      return renderClose(node, language);
    case 'open':
      return renderOpen(node, language);
    case 'search':
      return renderSearch(node, language);
    case 'help':
      return renderHelp(node, language);
    default:
      return `-- Unknown: ${node.action}`;
  }
}
