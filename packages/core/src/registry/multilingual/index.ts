/**
 * Multilingual Server Plugin System
 *
 * Enables server-side hyperscript commands in any of the 23 supported languages.
 * Leverages the semantic parsing infrastructure for language-agnostic command execution.
 *
 * Example usage in different languages:
 *
 * Japanese (SOV):
 *   リクエスト で ユーザー を 取得
 *     応答 with <json> users </json>
 *
 * Spanish (SVO):
 *   en solicitud obtener usuarios
 *     responder con <json> usuarios </json>
 *
 * Arabic (VSO):
 *   على الطلب احصل على المستخدمين
 *     رد مع <json> المستخدمين </json>
 *
 * Installation:
 *   import { createMultilingualServerPlugin } from '@hyperfixi/core/registry/multilingual';
 *
 *   const plugin = createMultilingualServerPlugin({
 *     languages: ['en', 'ja', 'es', 'ar'],
 *     customKeywords: {
 *       respond: { ja: '応答', es: 'responder', ar: 'رد' }
 *     }
 *   });
 *
 *   registry.use(plugin);
 */

import type { LokaScriptPlugin, ContextProviderFn } from '../index';
import type { CommandWithParseInput } from '../../runtime/command-adapter';
import type { EventSource } from '../event-source-registry';

// ============================================================================
// Types
// ============================================================================

/**
 * Language code type (23 supported languages)
 */
export type LanguageCode =
  | 'en'
  | 'ja'
  | 'ko'
  | 'ar'
  | 'zh'
  | 'es'
  | 'pt'
  | 'fr'
  | 'de'
  | 'id'
  | 'qu'
  | 'sw'
  | 'th'
  | 'tl'
  | 'tr'
  | 'vi'
  | 'bn'
  | 'hi'
  | 'it'
  | 'ms'
  | 'pl'
  | 'ru'
  | 'uk';

/**
 * Multilingual keyword definition
 */
export interface MultilingualKeyword {
  /** Primary keyword in this language */
  primary: string;
  /** Alternative forms (conjugations, informal, etc.) */
  alternatives?: string[];
}

/**
 * Multilingual keyword map for a command
 */
export type MultilingualKeywordMap = Partial<Record<LanguageCode, MultilingualKeyword | string>>;

/**
 * Command with multilingual support
 */
export interface MultilingualCommand extends CommandWithParseInput {
  /** Keywords for this command in different languages */
  keywords?: MultilingualKeywordMap;

  /**
   * Semantic roles this command accepts.
   * Used by the semantic parser to extract arguments in any language.
   */
  semanticRoles?: {
    /** Primary role (required argument) */
    primary?: 'patient' | 'destination' | 'content' | 'source';
    /** Optional roles */
    optional?: Array<'destination' | 'source' | 'condition' | 'style' | 'quantity'>;
  };
}

/**
 * Event source with multilingual patterns
 */
export interface MultilingualEventSource extends EventSource {
  /** Event patterns in different languages */
  patterns?: MultilingualKeywordMap;
}

/**
 * Options for creating a multilingual server plugin
 */
export interface MultilingualServerPluginOptions {
  /** Languages to support (default: all 23) */
  languages?: LanguageCode[];

  /** Custom keyword overrides for server commands */
  customKeywords?: {
    respond?: MultilingualKeywordMap;
    redirect?: MultilingualKeywordMap;
    setHeader?: MultilingualKeywordMap;
    request?: MultilingualKeywordMap;
  };

  /** Additional custom commands with multilingual support */
  commands?: MultilingualCommand[];

  /** Additional event sources with multilingual patterns */
  eventSources?: MultilingualEventSource[];

  /** Context providers */
  contextProviders?: Array<{
    name: string;
    provide: ContextProviderFn;
    keywords?: MultilingualKeywordMap;
  }>;
}

// ============================================================================
// Default Keyword Dictionaries for Server Commands
// ============================================================================

/**
 * Default keywords for 'respond' command across languages
 */
export const respondKeywords: MultilingualKeywordMap = {
  en: { primary: 'respond', alternatives: ['reply', 'return', 'send'] },
  ja: { primary: '応答', alternatives: ['答える', 'リターン', '返す'] },
  ko: { primary: '응답', alternatives: ['답하다', '반환'] },
  ar: { primary: 'رد', alternatives: ['أرسل', 'إرجاع'] },
  zh: { primary: '响应', alternatives: ['回复', '返回', '发送'] },
  es: { primary: 'responder', alternatives: ['enviar', 'devolver'] },
  pt: { primary: 'responder', alternatives: ['enviar', 'retornar'] },
  fr: { primary: 'répondre', alternatives: ['envoyer', 'retourner'] },
  de: { primary: 'antworten', alternatives: ['senden', 'zurückgeben'] },
  tr: { primary: 'yanıtla', alternatives: ['gönder', 'dön'] },
  id: { primary: 'balas', alternatives: ['kirim', 'kembalikan'] },
  ru: { primary: 'ответить', alternatives: ['отправить', 'вернуть'] },
  uk: { primary: 'відповісти', alternatives: ['надіслати', 'повернути'] },
  hi: { primary: 'जवाब', alternatives: ['भेजें', 'लौटाएं'] },
  vi: { primary: 'phản hồi', alternatives: ['gửi', 'trả về'] },
  th: { primary: 'ตอบกลับ', alternatives: ['ส่ง', 'คืน'] },
  it: { primary: 'rispondi', alternatives: ['invia', 'restituisci'] },
  pl: { primary: 'odpowiedz', alternatives: ['wyślij', 'zwróć'] },
};

/**
 * Default keywords for 'redirect' command across languages
 */
export const redirectKeywords: MultilingualKeywordMap = {
  en: { primary: 'redirect', alternatives: ['go', 'navigate'] },
  ja: { primary: 'リダイレクト', alternatives: ['転送', '遷移'] },
  ko: { primary: '리다이렉트', alternatives: ['이동', '전환'] },
  ar: { primary: 'توجيه', alternatives: ['انتقل', 'تحويل'] },
  zh: { primary: '重定向', alternatives: ['跳转', '转到'] },
  es: { primary: 'redirigir', alternatives: ['ir', 'navegar'] },
  pt: { primary: 'redirecionar', alternatives: ['ir', 'navegar'] },
  fr: { primary: 'rediriger', alternatives: ['aller', 'naviguer'] },
  de: { primary: 'umleiten', alternatives: ['gehen', 'navigieren'] },
  tr: { primary: 'yönlendir', alternatives: ['git', 'gezin'] },
  id: { primary: 'alihkan', alternatives: ['pergi', 'navigasi'] },
  ru: { primary: 'перенаправить', alternatives: ['перейти', 'навигация'] },
  uk: { primary: 'перенаправити', alternatives: ['перейти', 'навігація'] },
};

/**
 * Default keywords for 'setHeader' command across languages
 */
export const setHeaderKeywords: MultilingualKeywordMap = {
  en: { primary: 'setHeader', alternatives: ['header', 'setHead'] },
  ja: { primary: 'ヘッダー設定', alternatives: ['ヘッダー', 'ヘッダを設定'] },
  ko: { primary: '헤더설정', alternatives: ['헤더', '헤더를설정'] },
  ar: { primary: 'تعيين_رأس', alternatives: ['رأس', 'عنوان'] },
  zh: { primary: '设置头', alternatives: ['设头', '头部设置'] },
  es: { primary: 'establecerCabecera', alternatives: ['cabecera', 'encabezado'] },
  pt: { primary: 'definirCabeçalho', alternatives: ['cabeçalho'] },
  fr: { primary: 'définirEntête', alternatives: ['entête'] },
  de: { primary: 'setzeKopf', alternatives: ['kopfzeile'] },
};

/**
 * Default keywords for 'request' event source across languages
 */
export const requestKeywords: MultilingualKeywordMap = {
  en: { primary: 'request', alternatives: ['req', 'http'] },
  ja: { primary: 'リクエスト', alternatives: ['要求', 'HTTP'] },
  ko: { primary: '요청', alternatives: ['리퀘스트', 'HTTP'] },
  ar: { primary: 'طلب', alternatives: ['HTTP'] },
  zh: { primary: '请求', alternatives: ['HTTP'] },
  es: { primary: 'solicitud', alternatives: ['petición', 'HTTP'] },
  pt: { primary: 'requisição', alternatives: ['pedido', 'HTTP'] },
  fr: { primary: 'requête', alternatives: ['demande', 'HTTP'] },
  de: { primary: 'Anfrage', alternatives: ['HTTP'] },
  tr: { primary: 'istek', alternatives: ['HTTP'] },
  id: { primary: 'permintaan', alternatives: ['HTTP'] },
  ru: { primary: 'запрос', alternatives: ['HTTP'] },
  vi: { primary: 'yêu cầu', alternatives: ['HTTP'] },
};

// ============================================================================
// Keyword Alias Registry
// ============================================================================

/**
 * Registry for multilingual keyword aliases.
 * Enables looking up the canonical command name from any language keyword.
 */
export class KeywordAliasRegistry {
  private aliases = new Map<string, { command: string; language: LanguageCode }>();
  private byCommand = new Map<string, Map<LanguageCode, string[]>>();

  /**
   * Register a keyword alias for a command
   */
  register(command: string, keyword: string, language: LanguageCode): void {
    const normalized = keyword.toLowerCase();
    this.aliases.set(normalized, { command, language });

    if (!this.byCommand.has(command)) {
      this.byCommand.set(command, new Map());
    }
    const langMap = this.byCommand.get(command)!;
    if (!langMap.has(language)) {
      langMap.set(language, []);
    }
    langMap.get(language)!.push(keyword);
  }

  /**
   * Register keywords from a multilingual keyword map
   */
  registerFromMap(command: string, keywords: MultilingualKeywordMap): void {
    for (const [lang, value] of Object.entries(keywords)) {
      if (!value) continue;

      const kw = typeof value === 'string' ? { primary: value } : value;
      this.register(command, kw.primary, lang as LanguageCode);

      if (kw.alternatives) {
        for (const alt of kw.alternatives) {
          this.register(command, alt, lang as LanguageCode);
        }
      }
    }
  }

  /**
   * Look up the canonical command name from a keyword
   */
  lookup(keyword: string): { command: string; language: LanguageCode } | undefined {
    return this.aliases.get(keyword.toLowerCase());
  }

  /**
   * Get all keywords for a command in a specific language
   */
  getKeywords(command: string, language: LanguageCode): string[] {
    return this.byCommand.get(command)?.get(language) ?? [];
  }

  /**
   * Get all supported languages for a command
   */
  getLanguages(command: string): LanguageCode[] {
    const langMap = this.byCommand.get(command);
    return langMap ? Array.from(langMap.keys()) : [];
  }
}

// ============================================================================
// Multilingual Server Plugin Factory
// ============================================================================

/**
 * Create a multilingual server plugin
 *
 * This factory creates a plugin that:
 * 1. Registers server-side commands (respond, redirect, setHeader)
 * 2. Registers the request event source
 * 3. Sets up multilingual keyword aliases for all supported languages
 * 4. Provides context providers for request/response objects
 *
 * @example
 * const plugin = createMultilingualServerPlugin({
 *   languages: ['en', 'ja', 'es'],
 *   customKeywords: {
 *     respond: { ja: '返答' } // Override default
 *   }
 * });
 *
 * registry.use(plugin);
 */
export function createMultilingualServerPlugin(
  options: MultilingualServerPluginOptions = {}
): LokaScriptPlugin & { keywordRegistry: KeywordAliasRegistry } {
  const languages = options.languages ?? [
    'en',
    'ja',
    'ko',
    'ar',
    'zh',
    'es',
    'pt',
    'fr',
    'de',
    'tr',
    'id',
    'ru',
    'uk',
    'hi',
    'vi',
    'th',
    'it',
    'pl',
  ];

  const keywordRegistry = new KeywordAliasRegistry();

  // Merge default keywords with custom overrides
  const mergedKeywords = {
    respond: { ...respondKeywords, ...options.customKeywords?.respond },
    redirect: { ...redirectKeywords, ...options.customKeywords?.redirect },
    setHeader: { ...setHeaderKeywords, ...options.customKeywords?.setHeader },
    request: { ...requestKeywords, ...options.customKeywords?.request },
  };

  // Filter keywords to only include requested languages
  const filterKeywords = (keywords: MultilingualKeywordMap): MultilingualKeywordMap => {
    const filtered: MultilingualKeywordMap = {};
    for (const lang of languages) {
      if (keywords[lang]) {
        filtered[lang] = keywords[lang];
      }
    }
    return filtered;
  };

  return {
    name: 'hyperfixi-multilingual-server',
    version: '1.0.0',

    keywordRegistry,

    commands: options.commands ?? [],
    eventSources: options.eventSources ?? [],

    contextProviders: [
      {
        name: 'request',
        provide: ctx => ctx.locals.get('request'),
        options: { description: 'Current HTTP request', cache: false },
      },
      {
        name: 'response',
        provide: ctx => ctx.locals.get('response'),
        options: { description: 'HTTP response builder', cache: false },
      },
      ...(options.contextProviders ?? []),
    ],

    setup(registry) {
      // Register keyword aliases for built-in commands
      keywordRegistry.registerFromMap('respond', filterKeywords(mergedKeywords.respond));
      keywordRegistry.registerFromMap('redirect', filterKeywords(mergedKeywords.redirect));
      keywordRegistry.registerFromMap('setHeader', filterKeywords(mergedKeywords.setHeader));
      keywordRegistry.registerFromMap('request', filterKeywords(mergedKeywords.request));

      // Register aliases for custom commands
      for (const cmd of options.commands ?? []) {
        if (cmd.keywords) {
          keywordRegistry.registerFromMap(cmd.name, filterKeywords(cmd.keywords));
        }
      }

      // Register aliases for custom event sources
      for (const src of options.eventSources ?? []) {
        if (src.patterns) {
          keywordRegistry.registerFromMap(src.name, filterKeywords(src.patterns));
        }
      }

      console.log(`[hyperfixi-multilingual-server] Initialized with ${languages.length} languages`);
    },
  };
}

// ============================================================================
// Language Detection Utilities
// ============================================================================

/**
 * Detect the language of a hyperscript command
 *
 * Uses character analysis and keyword matching to determine the source language.
 */
export function detectLanguage(input: string, keywordRegistry: KeywordAliasRegistry): LanguageCode {
  // Check for script-specific characters first
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(input)) return 'ja'; // Hiragana/Katakana
  if (/[\uAC00-\uD7A3]/.test(input)) return 'ko'; // Hangul
  if (/[\u0600-\u06FF]/.test(input)) return 'ar'; // Arabic
  if (/[\u4E00-\u9FFF]/.test(input)) return 'zh'; // CJK
  if (/[\u0E00-\u0E7F]/.test(input)) return 'th'; // Thai
  if (/[\u0900-\u097F]/.test(input)) return 'hi'; // Devanagari
  if (/[\u0400-\u04FF]/.test(input)) return 'ru'; // Cyrillic

  // Try keyword matching for Latin-script languages
  const words = input.toLowerCase().split(/\s+/);
  for (const word of words) {
    const match = keywordRegistry.lookup(word);
    if (match) {
      return match.language;
    }
  }

  // Default to English
  return 'en';
}

/**
 * Get the word order pattern for a language
 */
export function getWordOrder(language: LanguageCode): 'SVO' | 'SOV' | 'VSO' | 'V2' {
  const sovLanguages: LanguageCode[] = ['ja', 'ko', 'tr', 'qu'];
  const vsoLanguages: LanguageCode[] = ['ar'];
  const v2Languages: LanguageCode[] = ['de'];

  if (sovLanguages.includes(language)) return 'SOV';
  if (vsoLanguages.includes(language)) return 'VSO';
  if (v2Languages.includes(language)) return 'V2';
  return 'SVO';
}

/**
 * Get the text direction for a language
 */
export function getTextDirection(language: LanguageCode): 'ltr' | 'rtl' {
  return language === 'ar' ? 'rtl' : 'ltr';
}

// ============================================================================
// Semantic Role Helpers
// ============================================================================

/**
 * Common semantic roles for server commands
 */
export const serverRoles = {
  /** Content to send in response */
  content: 'content' as const,
  /** Target URL for redirects */
  destination: 'destination' as const,
  /** HTTP status code */
  status: 'status' as const,
  /** Header name */
  headerName: 'headerName' as const,
  /** Header value */
  headerValue: 'headerValue' as const,
  /** Request method filter */
  method: 'method' as const,
  /** URL pattern */
  pattern: 'pattern' as const,
};

/**
 * Semantic role markers by language
 *
 * These markers indicate how semantic roles are expressed in each language.
 * Used by the semantic parser to extract arguments from any language.
 */
export const roleMarkers: Record<LanguageCode, Partial<Record<string, string[]>>> = {
  en: {
    destination: ['to', 'into'],
    source: ['from'],
    content: ['with'],
    status: ['status'],
    style: ['as'],
  },
  ja: {
    destination: ['に', 'へ'],
    source: ['から'],
    content: ['で', 'を'],
    style: ['として'],
    patient: ['を'],
  },
  ko: {
    destination: ['에', '로'],
    source: ['에서'],
    content: ['으로', '로'],
    patient: ['를', '을'],
  },
  ar: {
    destination: ['إلى', 'على'],
    source: ['من'],
    content: ['مع', 'بـ'],
  },
  zh: {
    destination: ['到', '向'],
    source: ['从'],
    content: ['用', '以'],
  },
  es: {
    destination: ['a', 'hacia'],
    source: ['de', 'desde'],
    content: ['con'],
    style: ['como'],
  },
  pt: {
    destination: ['para', 'a'],
    source: ['de', 'desde'],
    content: ['com'],
    style: ['como'],
  },
  fr: {
    destination: ['à', 'vers'],
    source: ['de', 'depuis'],
    content: ['avec'],
    style: ['comme'],
  },
  de: {
    destination: ['zu', 'nach'],
    source: ['von', 'aus'],
    content: ['mit'],
    style: ['als'],
  },
  tr: {
    destination: ['-e', '-a', '-ye', '-ya'],
    source: ['-den', '-dan'],
    content: ['ile', '-la', '-le'],
  },
  id: {
    destination: ['ke'],
    source: ['dari'],
    content: ['dengan'],
  },
  ru: {
    destination: ['в', 'на', 'к'],
    source: ['из', 'от'],
    content: ['с', 'со'],
  },
  uk: {
    destination: ['до', 'в', 'на'],
    source: ['з', 'від'],
    content: ['з', 'із'],
  },
  hi: {
    destination: ['को', 'में'],
    source: ['से'],
    content: ['के साथ'],
  },
  vi: {
    destination: ['đến', 'tới'],
    source: ['từ'],
    content: ['với'],
  },
  th: {
    destination: ['ไปที่', 'ถึง'],
    source: ['จาก'],
    content: ['ด้วย'],
  },
  it: {
    destination: ['a', 'verso'],
    source: ['da'],
    content: ['con'],
    style: ['come'],
  },
  pl: {
    destination: ['do', 'w'],
    source: ['z', 'od'],
    content: ['z'],
  },
  tl: {},
  bn: {},
  ms: {},
  sw: {},
  qu: {},
};
