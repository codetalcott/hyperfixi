/**
 * Localized error message catalog (Phase 7.3).
 *
 * Top 20 most common parser/runtime errors, translated for Tier 1 languages.
 * Messages use {placeholder} syntax for variable interpolation.
 *
 * Tier 1 (full localization): en, ja, es, zh, ko, ar
 * Tier 2 (error messages only): fr, de, pt, tr, ru — added as needed
 * Tier 3 (English fallback): remaining languages
 */

export interface ErrorMessage {
  en: string;
  [lang: string]: string;
}

export interface ErrorCatalog {
  [code: string]: ErrorMessage;
}

/**
 * The error catalog. Each entry has a code (E001-E020) and translations.
 * {placeholder} is replaced at runtime with context-specific values.
 */
export const ERROR_CATALOG: ErrorCatalog = {
  // ── Parser errors ───────────────────────────────────────────────────────

  E001: {
    en: 'Unexpected end of expression',
    ja: '式が予期せず終了しました',
    es: 'Fin inesperado de la expresion',
    zh: '表达式意外结束',
    ko: '표현식이 예기치 않게 끝났습니다',
    ar: 'نهاية غير متوقعة للتعبير',
  },

  E002: {
    en: "Expected expression after '{operator}' operator",
    ja: "演算子 '{operator}' の後に式が必要です",
    es: "Se esperaba una expresion despues del operador '{operator}'",
    zh: "运算符 '{operator}' 后需要表达式",
    ko: "연산자 '{operator}' 뒤에 표현식이 필요합니다",
    ar: "يتوقع تعبير بعد العامل '{operator}'",
  },

  E003: {
    en: "Unknown command: '{command}'",
    ja: "不明なコマンド: '{command}'",
    es: "Comando desconocido: '{command}'",
    zh: "未知命令: '{command}'",
    ko: "알 수 없는 명령: '{command}'",
    ar: "أمر غير معروف: '{command}'",
  },

  E004: {
    en: 'Cannot parse empty input',
    ja: '空の入力を解析できません',
    es: 'No se puede analizar una entrada vacia',
    zh: '无法解析空输入',
    ko: '빈 입력을 구문 분석할 수 없습니다',
    ar: 'لا يمكن تحليل مدخل فارغ',
  },

  E005: {
    en: "Expected '{expected}' but found '{found}'",
    ja: "'{expected}' が必要ですが '{found}' が見つかりました",
    es: "Se esperaba '{expected}' pero se encontro '{found}'",
    zh: "预期 '{expected}' 但发现 '{found}'",
    ko: "'{expected}'을(를) 기대했지만 '{found}'을(를) 발견했습니다",
    ar: "توقع '{expected}' ولكن وجد '{found}'",
  },

  E006: {
    en: "Missing closing '{token}'",
    ja: "閉じる '{token}' がありません",
    es: "Falta el cierre '{token}'",
    zh: "缺少结束 '{token}'",
    ko: "닫는 '{token}'이(가) 누락되었습니다",
    ar: "'{token}' الإغلاق مفقود",
  },

  E007: {
    en: "Invalid selector: '{selector}'",
    ja: "無効なセレクタ: '{selector}'",
    es: "Selector invalido: '{selector}'",
    zh: "无效的选择器: '{selector}'",
    ko: "잘못된 선택자: '{selector}'",
    ar: "محدد غير صالح: '{selector}'",
  },

  E008: {
    en: "Expected event name after 'on'",
    ja: "'on' の後にイベント名が必要です",
    es: "Se esperaba un nombre de evento despues de 'on'",
    zh: "'on' 后需要事件名称",
    ko: "'on' 뒤에 이벤트 이름이 필요합니다",
    ar: "يتوقع اسم حدث بعد 'on'",
  },

  E009: {
    en: 'Unterminated string literal',
    ja: '文字列リテラルが閉じられていません',
    es: 'Literal de cadena no terminado',
    zh: '未终止的字符串字面量',
    ko: '종결되지 않은 문자열 리터럴',
    ar: 'سلسلة نصية غير منتهية',
  },

  E010: {
    en: 'Invalid operator combination: {operators}',
    ja: '無効な演算子の組み合わせ: {operators}',
    es: 'Combinacion de operadores invalida: {operators}',
    zh: '无效的运算符组合: {operators}',
    ko: '잘못된 연산자 조합: {operators}',
    ar: 'تركيبة عوامل غير صالحة: {operators}',
  },

  // ── Command-specific errors ─────────────────────────────────────────────

  E011: {
    en: "The 'set' command requires a target and value",
    ja: "'set' コマンドにはターゲットと値が必要です",
    es: "El comando 'set' requiere un objetivo y un valor",
    zh: "'set' 命令需要目标和值",
    ko: "'set' 명령에는 대상과 값이 필요합니다",
    ar: "أمر 'set' يتطلب هدفًا وقيمة",
  },

  E012: {
    en: "The 'put' command requires a value and destination",
    ja: "'put' コマンドには値と宛先が必要です",
    es: "El comando 'put' requiere un valor y un destino",
    zh: "'put' 命令需要值和目标",
    ko: "'put' 명령에는 값과 대상이 필요합니다",
    ar: "أمر 'put' يتطلب قيمة ووجهة",
  },

  E013: {
    en: "The 'toggle' command expects a class name or attribute",
    ja: "'toggle' コマンドにはクラス名または属性が必要です",
    es: "El comando 'toggle' espera un nombre de clase o atributo",
    zh: "'toggle' 命令需要类名或属性",
    ko: "'toggle' 명령에는 클래스 이름 또는 속성이 필요합니다",
    ar: "أمر 'toggle' يتوقع اسم فئة أو سمة",
  },

  E014: {
    en: "The 'fetch' command requires a URL",
    ja: "'fetch' コマンドには URL が必要です",
    es: "El comando 'fetch' requiere una URL",
    zh: "'fetch' 命令需要 URL",
    ko: "'fetch' 명령에는 URL이 필요합니다",
    ar: "أمر 'fetch' يتطلب عنوان URL",
  },

  // ── Block/control flow errors ───────────────────────────────────────────

  E015: {
    en: "Missing 'end' for '{block}' block",
    ja: "'{block}' ブロックの 'end' がありません",
    es: "Falta 'end' para el bloque '{block}'",
    zh: "'{block}' 块缺少 'end'",
    ko: "'{block}' 블록의 'end'가 누락되었습니다",
    ar: "'end' مفقود لكتلة '{block}'",
  },

  E016: {
    en: "Expected condition after 'if'",
    ja: "'if' の後に条件が必要です",
    es: "Se esperaba una condicion despues de 'if'",
    zh: "'if' 后需要条件",
    ko: "'if' 뒤에 조건이 필요합니다",
    ar: "يتوقع شرط بعد 'if'",
  },

  E017: {
    en: "Expected 'in' after loop variable in 'for each'",
    ja: "'for each' のループ変数の後に 'in' が必要です",
    es: "Se esperaba 'in' despues de la variable de bucle en 'for each'",
    zh: "'for each' 循环变量后需要 'in'",
    ko: "'for each' 루프 변수 뒤에 'in'이 필요합니다",
    ar: "يتوقع 'in' بعد متغير الحلقة في 'for each'",
  },

  // ── Runtime errors ──────────────────────────────────────────────────────

  E018: {
    en: "Cannot find element: '{selector}'",
    ja: "要素が見つかりません: '{selector}'",
    es: "No se puede encontrar el elemento: '{selector}'",
    zh: "找不到元素: '{selector}'",
    ko: "요소를 찾을 수 없습니다: '{selector}'",
    ar: "لا يمكن العثور على العنصر: '{selector}'",
  },

  E019: {
    en: 'Type error: expected {expected} but got {actual}',
    ja: '型エラー: {expected} が必要ですが {actual} を受け取りました',
    es: 'Error de tipo: se esperaba {expected} pero se obtuvo {actual}',
    zh: '类型错误: 预期 {expected} 但得到 {actual}',
    ko: '유형 오류: {expected}을(를) 기대했지만 {actual}을(를) 받았습니다',
    ar: 'خطأ في النوع: توقع {expected} ولكن حصل على {actual}',
  },

  E020: {
    en: "Arrow functions (=>) are not supported in hyperscript. Use 'js ... end' blocks for JavaScript callbacks.",
    ja: "アロー関数 (=>) は hyperscript ではサポートされていません。JavaScript コールバックには 'js ... end' ブロックを使用してください。",
    es: "Las funciones flecha (=>) no son compatibles con hyperscript. Use bloques 'js ... end' para callbacks de JavaScript.",
    zh: "箭头函数 (=>) 在 hyperscript 中不受支持。请使用 'js ... end' 块进行 JavaScript 回调。",
    ko: "화살표 함수 (=>)는 hyperscript에서 지원되지 않습니다. JavaScript 콜백에는 'js ... end' 블록을 사용하세요.",
    ar: "دوال السهم (=>) غير مدعومة في hyperscript. استخدم كتل 'js ... end' لردود اتصال JavaScript.",
  },
};

/**
 * Get a localized error message.
 *
 * @param code - Error code (e.g., 'E001')
 * @param language - Target language code (falls back to 'en')
 * @param params - Placeholder values to interpolate
 * @returns Localized error string
 */
export function getErrorMessage(
  code: string,
  language: string = 'en',
  params: Record<string, string> = {}
): string {
  const entry = ERROR_CATALOG[code];
  if (!entry) return `Unknown error: ${code}`;

  // Get message in target language, fall back to English
  let message = entry[language] ?? entry.en;

  // Interpolate placeholders
  for (const [key, value] of Object.entries(params)) {
    message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  return message;
}

/**
 * List all available error codes.
 */
export function listErrorCodes(): string[] {
  return Object.keys(ERROR_CATALOG);
}

/**
 * Check if a language has translations for a given error code.
 */
export function hasTranslation(code: string, language: string): boolean {
  return ERROR_CATALOG[code]?.[language] !== undefined;
}
