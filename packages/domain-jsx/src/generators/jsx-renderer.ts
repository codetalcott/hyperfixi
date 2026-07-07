/**
 * JSX Natural Language Renderer
 *
 * Renders a SemanticNode back into natural-language JSX DSL syntax
 * for a target language. Inverse of the parser.
 */

import type { SemanticNode } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';

// =============================================================================
// Keyword Tables
// =============================================================================

const COMMAND_KEYWORDS: Record<string, Record<string, string>> = {
  element: {
    en: 'element',
    es: 'elemento',
    ja: '要素',
    ar: 'عنصر',
    ko: '요소',
    zh: '元素',
    tr: 'oge',
    fr: 'element',
    de: 'element',
    pt: 'elemento',
    ru: 'элемент',
  },
  component: {
    en: 'component',
    es: 'componente',
    ja: 'コンポーネント',
    ar: 'مكوّن',
    ko: '컴포넌트',
    zh: '组件',
    tr: 'bilesen',
    fr: 'composant',
    de: 'komponente',
    pt: 'componente',
    ru: 'компонент',
  },
  render: {
    en: 'render',
    es: 'renderizar',
    ja: '描画',
    ar: 'ارسم',
    ko: '렌더링',
    zh: '渲染',
    tr: 'isle',
    fr: 'afficher',
    de: 'rendern',
    pt: 'renderizar',
    ru: 'отрисовать',
  },
  state: {
    en: 'state',
    es: 'estado',
    ja: '状態',
    ar: 'حالة',
    ko: '상태',
    zh: '状态',
    tr: 'durum',
    fr: 'etat',
    de: 'zustand',
    pt: 'estado',
    ru: 'состояние',
  },
  effect: {
    en: 'effect',
    es: 'efecto',
    ja: 'エフェクト',
    ar: 'تأثير',
    ko: '효과',
    zh: '效果',
    tr: 'etki',
    fr: 'effet',
    de: 'effekt',
    pt: 'efeito',
    ru: 'эффект',
  },
  fragment: {
    en: 'fragment',
    es: 'fragmento',
    ja: 'フラグメント',
    ar: 'جزء',
    ko: '프래그먼트',
    zh: '片段',
    tr: 'parca',
    fr: 'fragment',
    de: 'fragment',
    pt: 'fragmento',
    ru: 'фрагмент',
  },
};

const MARKERS: Record<string, Record<string, string>> = {
  with: {
    en: 'with',
    es: 'con',
    ja: 'で',
    ar: 'مع',
    ko: '로',
    zh: '用',
    tr: 'ile',
    fr: 'avec',
    de: 'mit',
    pt: 'com',
    ru: 'с',
  },
  into: {
    en: 'into',
    es: 'en',
    ja: 'に',
    ar: 'في',
    ko: '에',
    zh: '到',
    tr: 'e',
    fr: 'dans',
    de: 'in',
    pt: 'em',
    ru: 'в',
  },
  initial: {
    en: 'initial',
    es: 'inicial',
    ja: '初期値',
    ar: 'ابتدائي',
    ko: '초기값',
    zh: '初始',
    tr: 'baslangic',
    fr: 'initial',
    de: 'initial',
    pt: 'inicial',
    ru: 'начально',
  },
  on: {
    en: 'on',
    es: 'en',
    ja: 'で',
    ar: 'عند',
    ko: '에서',
    zh: '在',
    tr: 'de',
    fr: 'sur',
    de: 'bei',
    pt: 'em',
    ru: 'при',
  },
  containing: {
    en: 'containing',
    es: 'conteniendo',
    ja: '内容',
    ar: 'يحتوي',
    ko: '포함',
    zh: '包含',
    tr: 'iceren',
    fr: 'contenant',
    de: 'enthaltend',
    pt: 'contendo',
    ru: 'содержащий',
  },
  returning: {
    en: 'returning',
    es: 'retornando',
    ja: '返す',
    ar: 'يُرجع',
    ko: '반환',
    zh: '返回',
    tr: 'donduren',
    fr: 'retournant',
    de: 'liefernd',
    pt: 'retornando',
    ru: 'возвращающий',
  },
  props: {
    en: 'with',
    es: 'con',
    ja: 'プロパティ',
    ar: 'مع',
    ko: '속성',
    zh: '属性',
    tr: 'ozellik',
    fr: 'proprietes',
    de: 'mit',
    pt: 'com',
    ru: 'с',
  },
};

// =============================================================================
// Word Order Helpers
// =============================================================================

const SOV_LANGUAGES = new Set(['ja', 'ko', 'tr']);
const VSO_LANGUAGES = new Set(['ar']);

function isSOV(lang: string): boolean {
  return SOV_LANGUAGES.has(lang);
}

function kw(command: string, lang: string): string {
  return COMMAND_KEYWORDS[command]?.[lang] ?? command;
}

function mk(marker: string, lang: string): string {
  return MARKERS[marker]?.[lang] ?? marker;
}

// =============================================================================
// Per-Command Renderers
// =============================================================================

function renderElement(node: SemanticNode, lang: string): string {
  const tag = extractRoleValue(node, 'tag') || 'div';
  const props = extractRoleValue(node, 'props');
  const children = extractRoleValue(node, 'children');
  const keyword = kw('element', lang);

  const parts: string[] = [];

  if (isSOV(lang)) {
    // SOV: tag [props marker] [children marker] keyword
    parts.push(tag);
    if (props) {
      parts.push(props);
      parts.push(mk('with', lang));
    }
    if (children) {
      parts.push(children);
      parts.push(mk('containing', lang));
    }
    parts.push(keyword);
  } else {
    // SVO / VSO: keyword tag [marker props] [marker children]
    parts.push(keyword);
    parts.push(tag);
    if (props) {
      parts.push(mk('with', lang));
      parts.push(props);
    }
    if (children) {
      parts.push(mk('containing', lang));
      parts.push(children);
    }
  }

  return parts.join(' ');
}

function renderComponent(node: SemanticNode, lang: string): string {
  const name = extractRoleValue(node, 'name') || 'Component';
  const props = extractRoleValue(node, 'props');
  const children = extractRoleValue(node, 'children');
  const keyword = kw('component', lang);

  const parts: string[] = [];

  if (isSOV(lang)) {
    parts.push(name);
    if (props) {
      parts.push(props);
      parts.push(mk('props', lang));
    }
    if (children) {
      parts.push(children);
      parts.push(mk('returning', lang));
    }
    parts.push(keyword);
  } else {
    parts.push(keyword);
    parts.push(name);
    if (props) {
      parts.push(mk('props', lang));
      parts.push(props);
    }
    if (children) {
      parts.push(mk('returning', lang));
      parts.push(children);
    }
  }

  return parts.join(' ');
}

function renderRender(node: SemanticNode, lang: string): string {
  const source = extractRoleValue(node, 'source') || 'App';
  const dest = extractRoleValue(node, 'destination') || 'root';
  const keyword = kw('render', lang);

  if (isSOV(lang)) {
    // SOV: dest marker source keyword
    return `${dest} ${mk('into', lang)} ${source} ${keyword}`;
  }
  // SVO / VSO: keyword source marker dest
  return `${keyword} ${source} ${mk('into', lang)} ${dest}`;
}

function renderState(node: SemanticNode, lang: string): string {
  const name = extractRoleValue(node, 'name') || 'value';
  const initial = extractRoleValue(node, 'initial');
  const keyword = kw('state', lang);

  if (isSOV(lang)) {
    // SOV: name [initial marker] keyword
    const parts = [name];
    if (initial) {
      parts.push(initial);
      parts.push(mk('initial', lang));
    }
    parts.push(keyword);
    return parts.join(' ');
  }
  // SVO / VSO: keyword name [marker initial]
  const parts = [keyword, name];
  if (initial) {
    parts.push(mk('initial', lang));
    parts.push(initial);
  }
  return parts.join(' ');
}

function renderEffect(node: SemanticNode, lang: string): string {
  const callback = extractRoleValue(node, 'callback') || 'handler';
  const deps = extractRoleValue(node, 'deps');
  const keyword = kw('effect', lang);

  if (isSOV(lang)) {
    // SOV: [deps marker] callback keyword
    const parts: string[] = [];
    if (deps) {
      parts.push(deps);
      parts.push(mk('on', lang));
    }
    parts.push(callback);
    parts.push(keyword);
    return parts.join(' ');
  }
  // SVO / VSO: keyword callback [marker deps]
  const parts = [keyword, callback];
  if (deps) {
    parts.push(mk('on', lang));
    parts.push(deps);
  }
  return parts.join(' ');
}

function renderFragment(node: SemanticNode, lang: string): string {
  const children = extractRoleValue(node, 'children') || '';
  const keyword = kw('fragment', lang);

  if (isSOV(lang)) {
    return children ? `${children} ${keyword}` : keyword;
  }
  return children ? `${keyword} ${children}` : keyword;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Render a JSX SemanticNode to natural-language JSX DSL text in the target language.
 */
export function renderJSX(node: SemanticNode, language: string): string {
  switch (node.action) {
    case 'element':
      return renderElement(node, language);
    case 'component':
      return renderComponent(node, language);
    case 'render':
      return renderRender(node, language);
    case 'state':
      return renderState(node, language);
    case 'effect':
      return renderEffect(node, language);
    case 'fragment':
      return renderFragment(node, language);
    default:
      return `// Unknown: ${node.action}`;
  }
}
