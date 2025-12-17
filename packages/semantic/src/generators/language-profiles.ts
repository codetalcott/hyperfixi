/**
 * Language Profiles
 *
 * Defines grammatical properties for each supported language.
 * Used by the pattern generator to create language-specific patterns.
 */

import type { SemanticRole } from '../types';

// =============================================================================
// Language Profile Types
// =============================================================================

/**
 * Word order in a language (for declarative statements).
 */
export type WordOrder = 'SVO' | 'SOV' | 'VSO' | 'VOS' | 'OSV' | 'OVS';

/**
 * How grammatical relationships are marked.
 */
export type MarkingStrategy = 'preposition' | 'postposition' | 'particle' | 'case-suffix';

/**
 * A grammatical marker (preposition, particle, etc.) for a semantic role.
 */
export interface RoleMarker {
  /** Primary marker for this role */
  readonly primary: string;
  /** Alternative markers that also work */
  readonly alternatives?: string[];
  /** Position relative to the role value */
  readonly position: 'before' | 'after';
}

/**
 * Verb form configuration for a language.
 */
export interface VerbConfig {
  /** Position of verb in the sentence */
  readonly position: 'start' | 'end' | 'second';
  /** Common verb suffixes/conjugations to recognize */
  readonly suffixes?: string[];
  /** Whether the language commonly drops subjects */
  readonly subjectDrop?: boolean;
}

/**
 * Configuration for possessive expression construction.
 * Defines how "X's property" is expressed in a language.
 */
export interface PossessiveConfig {
  /** Possessive marker (e.g., "'s" in English, "の" in Japanese) */
  readonly marker: string;
  /** Position of marker: 'after-object' (X's Y), 'between' (X の Y), 'before-property' */
  readonly markerPosition: 'after-object' | 'between' | 'before-property';
  /** Special possessive forms (e.g., 'me' → 'my' in English) */
  readonly specialForms?: Record<string, string>;
  /** Whether to use possessive adjectives instead of marker (e.g., Spanish mi/tu/su) */
  readonly usePossessiveAdjectives?: boolean;
}

/**
 * Complete language profile for pattern generation.
 */
export interface LanguageProfile {
  /** ISO 639-1 language code */
  readonly code: string;
  /** Human-readable language name */
  readonly name: string;
  /** Native name */
  readonly nativeName: string;
  /** Text direction */
  readonly direction: 'ltr' | 'rtl';
  /** Primary word order */
  readonly wordOrder: WordOrder;
  /** How this language marks grammatical roles */
  readonly markingStrategy: MarkingStrategy;
  /** Markers for each semantic role */
  readonly roleMarkers: Partial<Record<SemanticRole, RoleMarker>>;
  /** Verb configuration */
  readonly verb: VerbConfig;
  /** Command keyword translations */
  readonly keywords: Record<string, KeywordTranslation>;
  /** Whether the language uses spaces between words */
  readonly usesSpaces: boolean;
  /** Special tokenization notes */
  readonly tokenization?: TokenizationConfig;
  /** Reference translations (me, it, you, etc.) */
  readonly references?: Record<string, string>;
  /** Possessive expression configuration */
  readonly possessive?: PossessiveConfig;
}

/**
 * Translation of a command keyword.
 */
export interface KeywordTranslation {
  /** Primary translation */
  readonly primary: string;
  /** Alternative forms (conjugations, synonyms) */
  readonly alternatives?: string[];
  /** Normalized form for matching */
  readonly normalized?: string;
}

/**
 * Special tokenization configuration.
 */
export interface TokenizationConfig {
  /** Particles to recognize (for particle languages) */
  readonly particles?: string[];
  /** Prefixes to recognize (for prefixing languages) */
  readonly prefixes?: string[];
  /** Word boundary detection strategy */
  readonly boundaryStrategy?: 'space' | 'particle' | 'character';
}

// =============================================================================
// Language Profile Definitions
// =============================================================================

/**
 * English language profile.
 * SVO word order, prepositions, space-separated.
 */
export const englishProfile: LanguageProfile = {
  code: 'en',
  name: 'English',
  nativeName: 'English',
  direction: 'ltr',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  verb: {
    position: 'start',
    subjectDrop: false,
  },
  references: {
    me: 'me',
    it: 'it',
    you: 'you',
    result: 'result',
    event: 'event',
    target: 'target',
    body: 'body',
  },
  possessive: {
    marker: "'s",
    markerPosition: 'after-object',
    specialForms: {
      me: 'my',
      it: 'its',
      you: 'your',
    },
  },
  roleMarkers: {
    destination: { primary: 'on', alternatives: ['to', 'from'], position: 'before' },
    source: { primary: 'from', position: 'before' },
    patient: { primary: '', position: 'before' }, // No marker, just position
    style: { primary: 'with', alternatives: ['by', 'using'], position: 'before' },
    responseType: { primary: 'as', position: 'before' }, // For fetch response format (json, text, html)
    method: { primary: 'via', alternatives: ['using'], position: 'before' }, // For HTTP method (GET, POST)
  },
  keywords: {
    // Class/Attribute operations
    toggle: { primary: 'toggle' },
    add: { primary: 'add' },
    remove: { primary: 'remove' },
    // Content operations
    put: { primary: 'put' },
    append: { primary: 'append' },
    prepend: { primary: 'prepend' },
    take: { primary: 'take' },
    make: { primary: 'make' },
    clone: { primary: 'clone' },
    swap: { primary: 'swap' },
    morph: { primary: 'morph' },
    // Variable operations
    set: { primary: 'set' },
    get: { primary: 'get' },
    increment: { primary: 'increment' },
    decrement: { primary: 'decrement' },
    log: { primary: 'log' },
    // Visibility
    show: { primary: 'show' },
    hide: { primary: 'hide' },
    transition: { primary: 'transition' },
    // Events
    on: { primary: 'on' },
    trigger: { primary: 'trigger' },
    send: { primary: 'send' },
    // DOM focus
    focus: { primary: 'focus' },
    blur: { primary: 'blur' },
    // Navigation
    go: { primary: 'go' },
    // Async
    wait: { primary: 'wait' },
    fetch: { primary: 'fetch' },
    settle: { primary: 'settle' },
    // Control flow
    if: { primary: 'if' },
    else: { primary: 'else' },
    repeat: { primary: 'repeat' },
    for: { primary: 'for' },
    while: { primary: 'while' },
    continue: { primary: 'continue' },
    halt: { primary: 'halt' },
    throw: { primary: 'throw' },
    call: { primary: 'call' },
    return: { primary: 'return' },
    then: { primary: 'then' },
    and: { primary: 'and' },
    end: { primary: 'end' },
    // Advanced
    js: { primary: 'js' },
    async: { primary: 'async' },
    tell: { primary: 'tell' },
    default: { primary: 'default' },
    init: { primary: 'init' },
    behavior: { primary: 'behavior' },
    install: { primary: 'install' },
    measure: { primary: 'measure' },
    // Modifiers
    into: { primary: 'into' },
    before: { primary: 'before' },
    after: { primary: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: 'until' },
    event: { primary: 'event' },
    from: { primary: 'from' },
  },
};

/**
 * Japanese language profile.
 * SOV word order, particles, no spaces.
 */
export const japaneseProfile: LanguageProfile = {
  code: 'ja',
  name: 'Japanese',
  nativeName: '日本語',
  direction: 'ltr',
  wordOrder: 'SOV',
  markingStrategy: 'particle',
  usesSpaces: false,
  verb: {
    position: 'end',
    suffixes: ['る', 'て', 'た', 'ます', 'ない'],
    subjectDrop: true,
  },
  references: {
    me: '自分',      // "self" - in hyperscript context, refers to current element
    it: 'それ',      // "it"
    you: 'あなた',   // "you"
    result: '結果',
    event: 'イベント',
    target: 'ターゲット',
    body: 'ボディ',
  },
  possessive: {
    marker: 'の',
    markerPosition: 'between',
    // In Japanese: 自分の value (jibun no value) = "my value"
  },
  roleMarkers: {
    patient: { primary: 'を', position: 'after' },
    destination: { primary: 'に', alternatives: ['へ', 'で'], position: 'after' },
    source: { primary: 'から', position: 'after' },
    style: { primary: 'で', position: 'after' },
    event: { primary: 'を', position: 'after' }, // Event as object marker
    // Possession marker for "X's Y" patterns
    // Note: の is used between target and patient: #button の .active
  },
  keywords: {
    // Class/Attribute operations
    toggle: { primary: '切り替え', alternatives: ['切り替える', 'トグル', 'トグルする'], normalized: 'toggle' },
    add: { primary: '追加', alternatives: ['追加する', '加える'], normalized: 'add' },
    remove: { primary: '削除', alternatives: ['削除する', '取り除く'], normalized: 'remove' },
    // Content operations
    put: { primary: '置く', alternatives: ['入れる', 'セット'], normalized: 'put' },
    append: { primary: '末尾追加', alternatives: ['末尾に追加', 'アペンド'], normalized: 'append' },
    prepend: { primary: '先頭追加', alternatives: ['先頭に追加', 'プリペンド'], normalized: 'prepend' },
    take: { primary: '取る', alternatives: ['取得'], normalized: 'take' },
    make: { primary: '作る', alternatives: ['作成'], normalized: 'make' },
    clone: { primary: '複製', alternatives: ['クローン'], normalized: 'clone' },
    swap: { primary: '交換', alternatives: ['スワップ', '入れ替え'], normalized: 'swap' },
    morph: { primary: '変形', alternatives: ['モーフ', '変換'], normalized: 'morph' },
    // Variable operations
    set: { primary: '設定', alternatives: ['設定する', 'セット'], normalized: 'set' },
    get: { primary: '取得', alternatives: ['取得する', 'ゲット'], normalized: 'get' },
    increment: { primary: '増加', alternatives: ['増やす', 'インクリメント'], normalized: 'increment' },
    decrement: { primary: '減少', alternatives: ['減らす', 'デクリメント'], normalized: 'decrement' },
    log: { primary: '記録', alternatives: ['ログ', '出力'], normalized: 'log' },
    // Visibility
    show: { primary: '表示', alternatives: ['表示する', '見せる'], normalized: 'show' },
    hide: { primary: '隠す', alternatives: ['非表示', '非表示にする'], normalized: 'hide' },
    transition: { primary: '遷移', alternatives: ['トランジション', 'アニメーション'], normalized: 'transition' },
    // Events
    on: { primary: 'で', alternatives: ['時', 'とき'], normalized: 'on' },
    trigger: { primary: '引き金', alternatives: ['発火', 'トリガー'], normalized: 'trigger' },
    send: { primary: '送る', alternatives: ['送信'], normalized: 'send' },
    // DOM focus
    focus: { primary: 'フォーカス', alternatives: ['集中'], normalized: 'focus' },
    blur: { primary: 'ぼかし', alternatives: ['フォーカス解除'], normalized: 'blur' },
    // Navigation
    go: { primary: '移動', alternatives: ['行く', 'ナビゲート'], normalized: 'go' },
    // Async
    wait: { primary: '待つ', alternatives: ['待機'], normalized: 'wait' },
    fetch: { primary: '取得', alternatives: ['フェッチ'], normalized: 'fetch' },
    settle: { primary: '安定', alternatives: ['落ち着く'], normalized: 'settle' },
    // Control flow
    if: { primary: 'もし', alternatives: ['条件'], normalized: 'if' },
    else: { primary: 'そうでなければ', alternatives: ['それ以外'], normalized: 'else' },
    repeat: { primary: '繰り返し', alternatives: ['繰り返す', 'リピート'], normalized: 'repeat' },
    for: { primary: 'ために', alternatives: ['各'], normalized: 'for' },
    while: { primary: 'の間', alternatives: ['間'], normalized: 'while' },
    continue: { primary: '続ける', alternatives: ['継続'], normalized: 'continue' },
    halt: { primary: '停止', alternatives: ['止める', 'ハルト'], normalized: 'halt' },
    throw: { primary: '投げる', alternatives: ['スロー'], normalized: 'throw' },
    call: { primary: '呼び出し', alternatives: ['コール', '呼ぶ'], normalized: 'call' },
    return: { primary: '戻る', alternatives: ['返す', 'リターン'], normalized: 'return' },
    then: { primary: 'それから', alternatives: ['次に', 'そして'], normalized: 'then' },
    and: { primary: 'そして', alternatives: ['と', 'また'], normalized: 'and' },
    end: { primary: '終わり', alternatives: ['終了', 'おわり'], normalized: 'end' },
    // Advanced
    js: { primary: 'JS実行', alternatives: ['js'], normalized: 'js' },
    async: { primary: '非同期', alternatives: ['アシンク'], normalized: 'async' },
    tell: { primary: '伝える', alternatives: ['テル'], normalized: 'tell' },
    default: { primary: '既定', alternatives: ['デフォルト'], normalized: 'default' },
    init: { primary: '初期化', alternatives: ['イニット'], normalized: 'init' },
    behavior: { primary: '振る舞い', alternatives: ['ビヘイビア'], normalized: 'behavior' },
    install: { primary: 'インストール', alternatives: ['導入'], normalized: 'install' },
    measure: { primary: '測定', alternatives: ['計測', 'メジャー'], normalized: 'measure' },
    // Modifiers
    into: { primary: 'へ', alternatives: ['に'], normalized: 'into' },
    before: { primary: '前に', alternatives: ['前'], normalized: 'before' },
    after: { primary: '後に', alternatives: ['後'], normalized: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: 'まで', alternatives: ['迄'], normalized: 'until' },
    event: { primary: 'イベント', alternatives: ['事象'], normalized: 'event' },
    from: { primary: 'から', normalized: 'from' },
  },
  tokenization: {
    particles: ['を', 'に', 'で', 'から', 'の', 'が', 'は', 'も', 'へ', 'と'],
    boundaryStrategy: 'particle',
  },
};

/**
 * Arabic language profile.
 * VSO word order, prepositions, RTL, space-separated.
 */
export const arabicProfile: LanguageProfile = {
  code: 'ar',
  name: 'Arabic',
  nativeName: 'العربية',
  direction: 'rtl',
  wordOrder: 'VSO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  verb: {
    position: 'start',
    subjectDrop: true,
  },
  references: {
    me: 'أنا',       // "I/me" - first person
    it: 'هو',        // "it" (masculine)
    you: 'أنت',      // "you"
    result: 'النتيجة',
    event: 'الحدث',
    target: 'الهدف',
    body: 'الجسم',
  },
  possessive: {
    marker: '',      // No explicit marker - uses possessive pronouns
    markerPosition: 'after-object',
    usePossessiveAdjectives: true,
    specialForms: {
      // Arabic: "value لي" (value for-me) - possessive pronoun follows property
      me: 'لي',      // "for me" / "mine"
      it: 'له',      // "for it" / "its"
      you: 'لك',     // "for you" / "yours"
    },
  },
  roleMarkers: {
    destination: { primary: 'على', alternatives: ['في', 'إلى', 'ب'], position: 'before' },
    source: { primary: 'من', position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'بـ', alternatives: ['باستخدام'], position: 'before' },
  },
  keywords: {
    // Class/Attribute operations
    toggle: { primary: 'بدل', alternatives: ['بدّل', 'غيّر', 'غير'], normalized: 'toggle' },
    add: { primary: 'أضف', alternatives: ['اضف', 'زِد'], normalized: 'add' },
    remove: { primary: 'احذف', alternatives: ['أزل', 'امسح'], normalized: 'remove' },
    // Content operations
    put: { primary: 'ضع', alternatives: ['اجعل'], normalized: 'put' },
    append: { primary: 'ألحق', normalized: 'append' },
    prepend: { primary: 'سبق', normalized: 'prepend' },
    take: { primary: 'خذ', normalized: 'take' },
    make: { primary: 'اصنع', alternatives: ['أنشئ'], normalized: 'make' },
    clone: { primary: 'استنسخ', alternatives: ['انسخ'], normalized: 'clone' },
    swap: { primary: 'بدّل', alternatives: ['استبدل'], normalized: 'swap' },
    morph: { primary: 'حوّل', alternatives: ['غيّر'], normalized: 'morph' },
    // Variable operations
    set: { primary: 'اضبط', alternatives: ['عيّن', 'حدد'], normalized: 'set' },
    get: { primary: 'احصل', alternatives: ['خذ'], normalized: 'get' },
    increment: { primary: 'زِد', alternatives: ['ارفع'], normalized: 'increment' },
    decrement: { primary: 'أنقص', alternatives: ['قلل'], normalized: 'decrement' },
    log: { primary: 'سجل', normalized: 'log' },
    // Visibility
    show: { primary: 'اظهر', alternatives: ['أظهر', 'اعرض'], normalized: 'show' },
    hide: { primary: 'اخف', alternatives: ['أخفِ', 'اخفي'], normalized: 'hide' },
    transition: { primary: 'انتقال', alternatives: ['انتقل'], normalized: 'transition' },
    // Events
    on: { primary: 'على', alternatives: ['عند', 'لدى', 'حين'], normalized: 'on' },
    trigger: { primary: 'تشغيل', alternatives: ['أطلق', 'فعّل'], normalized: 'trigger' },
    send: { primary: 'أرسل', normalized: 'send' },
    // DOM focus
    focus: { primary: 'تركيز', alternatives: ['ركز'], normalized: 'focus' },
    blur: { primary: 'ضبابية', alternatives: ['شوش'], normalized: 'blur' },
    // Navigation
    go: { primary: 'اذهب', alternatives: ['انتقل'], normalized: 'go' },
    // Async
    wait: { primary: 'انتظر', normalized: 'wait' },
    fetch: { primary: 'احضر', alternatives: ['جلب'], normalized: 'fetch' },
    settle: { primary: 'استقر', normalized: 'settle' },
    // Control flow
    if: { primary: 'إذا', normalized: 'if' },
    else: { primary: 'وإلا', alternatives: ['خلاف ذلك'], normalized: 'else' },
    repeat: { primary: 'كرر', normalized: 'repeat' },
    for: { primary: 'لكل', normalized: 'for' },
    while: { primary: 'بينما', normalized: 'while' },
    continue: { primary: 'واصل', normalized: 'continue' },
    halt: { primary: 'أوقف', alternatives: ['توقف'], normalized: 'halt' },
    throw: { primary: 'ارم', alternatives: ['ارمِ'], normalized: 'throw' },
    call: { primary: 'استدع', alternatives: ['نادِ'], normalized: 'call' },
    return: { primary: 'ارجع', alternatives: ['عُد'], normalized: 'return' },
    then: { primary: 'ثم', alternatives: ['بعدها', 'ثمّ'], normalized: 'then' },
    and: { primary: 'و', alternatives: ['وأيضاً'], normalized: 'and' },
    end: { primary: 'نهاية', alternatives: ['انتهى', 'آخر'], normalized: 'end' },
    // Advanced
    js: { primary: 'جافاسكربت', alternatives: ['js'], normalized: 'js' },
    async: { primary: 'متزامن', normalized: 'async' },
    tell: { primary: 'أخبر', normalized: 'tell' },
    default: { primary: 'افتراضي', normalized: 'default' },
    init: { primary: 'تهيئة', alternatives: ['بدء'], normalized: 'init' },
    behavior: { primary: 'سلوك', normalized: 'behavior' },
    install: { primary: 'تثبيت', alternatives: ['ثبّت'], normalized: 'install' },
    measure: { primary: 'قياس', alternatives: ['قِس'], normalized: 'measure' },
    // Modifiers
    into: { primary: 'في', alternatives: ['إلى'], normalized: 'into' },
    before: { primary: 'قبل', normalized: 'before' },
    after: { primary: 'بعد', normalized: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: 'حتى', normalized: 'until' },
    event: { primary: 'حدث', normalized: 'event' },
    from: { primary: 'من', normalized: 'from' },
  },
  tokenization: {
    prefixes: ['ال', 'و', 'ف', 'ب', 'ك', 'ل'],
  },
};

/**
 * Spanish language profile.
 * SVO word order, prepositions, space-separated.
 */
export const spanishProfile: LanguageProfile = {
  code: 'es',
  name: 'Spanish',
  nativeName: 'Español',
  direction: 'ltr',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  verb: {
    position: 'start',
    subjectDrop: true,
  },
  references: {
    me: 'yo',        // "I/me"
    it: 'ello',      // "it"
    you: 'tú',       // "you"
    result: 'resultado',
    event: 'evento',
    target: 'objetivo',
    body: 'cuerpo',
  },
  possessive: {
    marker: 'de',    // Spanish uses "de" for general possession
    markerPosition: 'before-property',
    usePossessiveAdjectives: true,
    specialForms: {
      me: 'mi',      // "my" (possessive adjective)
      it: 'su',      // "its"
      you: 'tu',     // "your"
    },
  },
  roleMarkers: {
    destination: { primary: 'en', alternatives: ['sobre', 'a'], position: 'before' },
    source: { primary: 'de', alternatives: ['desde'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'con', position: 'before' },
  },
  keywords: {
    // Class/Attribute operations
    toggle: { primary: 'alternar', alternatives: ['cambiar', 'conmutar'], normalized: 'toggle' },
    add: { primary: 'agregar', alternatives: ['añadir'], normalized: 'add' },
    remove: { primary: 'quitar', alternatives: ['eliminar', 'remover', 'sacar'], normalized: 'remove' },
    // Content operations
    put: { primary: 'poner', alternatives: ['colocar'], normalized: 'put' },
    append: { primary: 'añadir', normalized: 'append' },
    prepend: { primary: 'anteponer', normalized: 'prepend' },
    take: { primary: 'tomar', normalized: 'take' },
    make: { primary: 'hacer', alternatives: ['crear'], normalized: 'make' },
    clone: { primary: 'clonar', alternatives: ['copiar'], normalized: 'clone' },
    swap: { primary: 'intercambiar', alternatives: ['cambiar'], normalized: 'swap' },
    morph: { primary: 'transformar', alternatives: ['convertir'], normalized: 'morph' },
    // Variable operations
    set: { primary: 'establecer', alternatives: ['fijar', 'definir'], normalized: 'set' },
    get: { primary: 'obtener', alternatives: ['conseguir'], normalized: 'get' },
    increment: { primary: 'incrementar', alternatives: ['aumentar'], normalized: 'increment' },
    decrement: { primary: 'decrementar', alternatives: ['disminuir'], normalized: 'decrement' },
    log: { primary: 'registrar', alternatives: ['imprimir'], normalized: 'log' },
    // Visibility
    show: { primary: 'mostrar', alternatives: ['enseñar'], normalized: 'show' },
    hide: { primary: 'ocultar', alternatives: ['esconder'], normalized: 'hide' },
    transition: { primary: 'transición', alternatives: ['animar'], normalized: 'transition' },
    // Events
    on: { primary: 'en', alternatives: ['cuando', 'al'], normalized: 'on' },
    trigger: { primary: 'disparar', alternatives: ['activar'], normalized: 'trigger' },
    send: { primary: 'enviar', normalized: 'send' },
    // DOM focus
    focus: { primary: 'enfocar', normalized: 'focus' },
    blur: { primary: 'desenfocar', normalized: 'blur' },
    // Navigation
    go: { primary: 'ir', alternatives: ['navegar'], normalized: 'go' },
    // Async
    wait: { primary: 'esperar', normalized: 'wait' },
    fetch: { primary: 'buscar', alternatives: ['obtener'], normalized: 'fetch' },
    settle: { primary: 'estabilizar', normalized: 'settle' },
    // Control flow
    if: { primary: 'si', normalized: 'if' },
    else: { primary: 'sino', alternatives: ['de lo contrario'], normalized: 'else' },
    repeat: { primary: 'repetir', normalized: 'repeat' },
    for: { primary: 'para', normalized: 'for' },
    while: { primary: 'mientras', normalized: 'while' },
    continue: { primary: 'continuar', normalized: 'continue' },
    halt: { primary: 'detener', alternatives: ['parar'], normalized: 'halt' },
    throw: { primary: 'lanzar', alternatives: ['arrojar'], normalized: 'throw' },
    call: { primary: 'llamar', normalized: 'call' },
    return: { primary: 'retornar', alternatives: ['devolver'], normalized: 'return' },
    then: { primary: 'entonces', alternatives: ['luego', 'después'], normalized: 'then' },
    and: { primary: 'y', alternatives: ['además', 'también'], normalized: 'and' },
    end: { primary: 'fin', alternatives: ['final', 'terminar'], normalized: 'end' },
    // Advanced
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'asíncrono', normalized: 'async' },
    tell: { primary: 'decir', normalized: 'tell' },
    default: { primary: 'predeterminar', alternatives: ['por defecto'], normalized: 'default' },
    init: { primary: 'iniciar', alternatives: ['inicializar'], normalized: 'init' },
    behavior: { primary: 'comportamiento', normalized: 'behavior' },
    install: { primary: 'instalar', normalized: 'install' },
    measure: { primary: 'medir', normalized: 'measure' },
    // Modifiers
    into: { primary: 'en', alternatives: ['dentro de'], normalized: 'into' },
    before: { primary: 'antes', normalized: 'before' },
    after: { primary: 'después', normalized: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: 'hasta', normalized: 'until' },
    event: { primary: 'evento', normalized: 'event' },
    from: { primary: 'de', alternatives: ['desde'], normalized: 'from' },
  },
};

/**
 * Korean language profile.
 * SOV word order, particles, space-separated (between words).
 */
export const koreanProfile: LanguageProfile = {
  code: 'ko',
  name: 'Korean',
  nativeName: '한국어',
  direction: 'ltr',
  wordOrder: 'SOV',
  markingStrategy: 'particle',
  usesSpaces: true, // Korean uses spaces between words, but particles attach
  verb: {
    position: 'end',
    suffixes: ['다', '요', '니다', '세요'],
    subjectDrop: true,
  },
  references: {
    me: '나',        // "I/me" (informal)
    it: '그것',      // "it"
    you: '너',       // "you" (informal)
    result: '결과',
    event: '이벤트',
    target: '대상',
    body: '본문',
  },
  possessive: {
    marker: '의',    // Possessive particle
    markerPosition: 'between',
    specialForms: {
      me: '내',      // Contracted form of 나의 (my)
      it: '그것의',  // "its"
      you: '네',     // Contracted form of 너의 (your)
    },
  },
  roleMarkers: {
    patient: { primary: '을', alternatives: ['를'], position: 'after' },
    destination: { primary: '에', alternatives: ['으로', '로', '에서'], position: 'after' },
    source: { primary: '에서', alternatives: ['부터'], position: 'after' },
    style: { primary: '로', alternatives: ['으로'], position: 'after' },
    event: { primary: '을', alternatives: ['를'], position: 'after' }, // Event as object marker
  },
  keywords: {
    // Class/Attribute operations
    toggle: { primary: '토글', alternatives: ['전환'], normalized: 'toggle' },
    add: { primary: '추가', normalized: 'add' },
    remove: { primary: '제거', alternatives: ['삭제'], normalized: 'remove' },
    // Content operations
    put: { primary: '넣다', alternatives: ['넣기', '놓기'], normalized: 'put' },
    append: { primary: '추가', normalized: 'append' },
    take: { primary: '가져오다', normalized: 'take' },
    make: { primary: '만들다', normalized: 'make' },
    clone: { primary: '복사', normalized: 'clone' },
    swap: { primary: '교환', alternatives: ['바꾸다'], normalized: 'swap' },
    morph: { primary: '변형', alternatives: ['변환'], normalized: 'morph' },
    // Variable operations
    set: { primary: '설정', normalized: 'set' },
    get: { primary: '얻다', alternatives: ['가져오기'], normalized: 'get' },
    increment: { primary: '증가', normalized: 'increment' },
    decrement: { primary: '감소', normalized: 'decrement' },
    log: { primary: '로그', normalized: 'log' },
    // Visibility
    show: { primary: '보이다', alternatives: ['표시'], normalized: 'show' },
    hide: { primary: '숨기다', normalized: 'hide' },
    transition: { primary: '전환', normalized: 'transition' },
    // Events
    on: { primary: '에', alternatives: ['시', '때', '할 때'], normalized: 'on' },
    trigger: { primary: '트리거', normalized: 'trigger' },
    send: { primary: '보내다', normalized: 'send' },
    // DOM focus
    focus: { primary: '포커스', normalized: 'focus' },
    blur: { primary: '블러', normalized: 'blur' },
    // Navigation
    go: { primary: '이동', normalized: 'go' },
    // Async
    wait: { primary: '대기', normalized: 'wait' },
    fetch: { primary: '가져오기', normalized: 'fetch' },
    settle: { primary: '안정', normalized: 'settle' },
    // Control flow
    if: { primary: '만약', normalized: 'if' },
    else: { primary: '아니면', normalized: 'else' },
    repeat: { primary: '반복', normalized: 'repeat' },
    for: { primary: '동안', normalized: 'for' },
    while: { primary: '동안', normalized: 'while' },
    continue: { primary: '계속', normalized: 'continue' },
    halt: { primary: '정지', normalized: 'halt' },
    throw: { primary: '던지다', normalized: 'throw' },
    call: { primary: '호출', normalized: 'call' },
    return: { primary: '반환', normalized: 'return' },
    then: { primary: '그다음', alternatives: ['그리고', '그런후'], normalized: 'then' },
    and: { primary: '그리고', alternatives: ['또한', '및'], normalized: 'and' },
    end: { primary: '끝', alternatives: ['종료', '마침'], normalized: 'end' },
    // Advanced
    js: { primary: 'JS실행', alternatives: ['js'], normalized: 'js' },
    async: { primary: '비동기', normalized: 'async' },
    tell: { primary: '말하다', normalized: 'tell' },
    default: { primary: '기본값', normalized: 'default' },
    init: { primary: '초기화', normalized: 'init' },
    behavior: { primary: '동작', normalized: 'behavior' },
    install: { primary: '설치', normalized: 'install' },
    measure: { primary: '측정', normalized: 'measure' },
    // Modifiers
    into: { primary: '으로', normalized: 'into' },
    before: { primary: '전에', normalized: 'before' },
    after: { primary: '후에', normalized: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: '까지', normalized: 'until' },
    event: { primary: '이벤트', normalized: 'event' },
    from: { primary: '에서', normalized: 'from' },
  },
  tokenization: {
    particles: ['을', '를', '이', '가', '은', '는', '에', '에서', '으로', '로', '와', '과', '도'],
    boundaryStrategy: 'space',
  },
};

/**
 * Chinese (Simplified) language profile.
 * SVO word order, no markers (relies on word order), no spaces.
 */
export const chineseProfile: LanguageProfile = {
  code: 'zh',
  name: 'Chinese',
  nativeName: '中文',
  direction: 'ltr',
  wordOrder: 'SVO',
  markingStrategy: 'preposition', // Uses prepositions but often implicit
  usesSpaces: false,
  verb: {
    position: 'second',
    subjectDrop: true,
  },
  references: {
    me: '我',        // "I/me"
    it: '它',        // "it"
    you: '你',       // "you"
    result: '结果',
    event: '事件',
    target: '目标',
    body: '主体',
  },
  possessive: {
    marker: '的',    // Possessive particle (de)
    markerPosition: 'between',
    // Chinese: 我的 value (wǒ de value) = "my value"
  },
  roleMarkers: {
    destination: { primary: '在', alternatives: ['到', '于'], position: 'before' },
    source: { primary: '从', alternatives: ['由'], position: 'before' },
    patient: { primary: '把', position: 'before' }, // BA construction
    style: { primary: '用', alternatives: ['以'], position: 'before' },
  },
  keywords: {
    // Class/Attribute operations
    toggle: { primary: '切换', normalized: 'toggle' },
    add: { primary: '添加', alternatives: ['加'], normalized: 'add' },
    remove: { primary: '移除', alternatives: ['删除', '去掉'], normalized: 'remove' },
    // Content operations
    put: { primary: '放置', alternatives: ['放', '放入'], normalized: 'put' },
    append: { primary: '追加', alternatives: ['附加'], normalized: 'append' },
    prepend: { primary: '前置', alternatives: ['预置'], normalized: 'prepend' },
    take: { primary: '获取', normalized: 'take' },
    make: { primary: '制作', normalized: 'make' },
    clone: { primary: '复制', normalized: 'clone' },
    swap: { primary: '交换', normalized: 'swap' },
    morph: { primary: '变形', alternatives: ['转换'], normalized: 'morph' },
    // Variable operations
    set: { primary: '设置', alternatives: ['设定'], normalized: 'set' },
    get: { primary: '获得', alternatives: ['获取', '取得'], normalized: 'get' },
    increment: { primary: '增加', normalized: 'increment' },
    decrement: { primary: '减少', normalized: 'decrement' },
    log: { primary: '日志', normalized: 'log' },
    // Visibility
    show: { primary: '显示', alternatives: ['展示'], normalized: 'show' },
    hide: { primary: '隐藏', normalized: 'hide' },
    transition: { primary: '过渡', normalized: 'transition' },
    // Events
    on: { primary: '当', alternatives: ['在...时'], normalized: 'on' },
    trigger: { primary: '触发', normalized: 'trigger' },
    send: { primary: '发送', normalized: 'send' },
    // DOM focus
    focus: { primary: '聚焦', normalized: 'focus' },
    blur: { primary: '失焦', normalized: 'blur' },
    // Navigation
    go: { primary: '前往', normalized: 'go' },
    // Async
    wait: { primary: '等待', normalized: 'wait' },
    fetch: { primary: '获取', normalized: 'fetch' },
    settle: { primary: '稳定', normalized: 'settle' },
    // Control flow
    if: { primary: '如果', normalized: 'if' },
    else: { primary: '否则', normalized: 'else' },
    repeat: { primary: '重复', normalized: 'repeat' },
    for: { primary: '为', normalized: 'for' },
    while: { primary: '当', normalized: 'while' },
    continue: { primary: '继续', normalized: 'continue' },
    halt: { primary: '停止', normalized: 'halt' },
    throw: { primary: '抛出', normalized: 'throw' },
    call: { primary: '调用', normalized: 'call' },
    return: { primary: '返回', normalized: 'return' },
    then: { primary: '然后', alternatives: ['接着', '之后'], normalized: 'then' },
    and: { primary: '并且', alternatives: ['和', '而且'], normalized: 'and' },
    end: { primary: '结束', alternatives: ['终止', '完'], normalized: 'end' },
    // Advanced
    js: { primary: 'JS执行', alternatives: ['js'], normalized: 'js' },
    async: { primary: '异步', normalized: 'async' },
    tell: { primary: '告诉', normalized: 'tell' },
    default: { primary: '默认', normalized: 'default' },
    init: { primary: '初始化', normalized: 'init' },
    behavior: { primary: '行为', normalized: 'behavior' },
    install: { primary: '安装', normalized: 'install' },
    measure: { primary: '测量', normalized: 'measure' },
    // Modifiers
    into: { primary: '进入', normalized: 'into' },
    before: { primary: '之前', normalized: 'before' },
    after: { primary: '之后', normalized: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: '直到', normalized: 'until' },
    event: { primary: '事件', normalized: 'event' },
    from: { primary: '从', normalized: 'from' },
  },
  tokenization: {
    boundaryStrategy: 'character',
  },
};

/**
 * Turkish language profile.
 * SOV word order, case suffixes (agglutinative), space-separated.
 */
export const turkishProfile: LanguageProfile = {
  code: 'tr',
  name: 'Turkish',
  nativeName: 'Türkçe',
  direction: 'ltr',
  wordOrder: 'SOV',
  markingStrategy: 'case-suffix',
  usesSpaces: true,
  verb: {
    position: 'end',
    suffixes: ['mek', 'mak', 'yor', 'di', 'miş'],
    subjectDrop: true,
  },
  references: {
    me: 'ben',       // "I/me"
    it: 'o',         // "it"
    you: 'sen',      // "you"
    result: 'sonuç',
    event: 'olay',
    target: 'hedef',
    body: 'gövde',
  },
  possessive: {
    marker: '',      // Turkish uses genitive suffix -in/-ın + possessive suffix
    markerPosition: 'after-object',
    usePossessiveAdjectives: true,
    specialForms: {
      me: 'benim',   // "my" (genitive of "ben")
      it: 'onun',    // "its"
      you: 'senin',  // "your"
    },
  },
  roleMarkers: {
    patient: { primary: 'i', alternatives: ['ı', 'u', 'ü'], position: 'after' }, // Accusative
    destination: { primary: 'e', alternatives: ['a', 'de', 'da', 'te', 'ta'], position: 'after' }, // Dative/Locative
    source: { primary: 'den', alternatives: ['dan', 'ten', 'tan'], position: 'after' }, // Ablative
    style: { primary: 'le', alternatives: ['la', 'yle', 'yla'], position: 'after' }, // Instrumental
    event: { primary: 'i', alternatives: ['ı', 'u', 'ü'], position: 'after' }, // Event as accusative
  },
  keywords: {
    // Class/Attribute operations
    toggle: { primary: 'değiştir', alternatives: ['aç/kapat'], normalized: 'toggle' },
    add: { primary: 'ekle', normalized: 'add' },
    remove: { primary: 'kaldır', alternatives: ['sil'], normalized: 'remove' },
    // Content operations
    put: { primary: 'koy', normalized: 'put' },
    append: { primary: 'ekle', normalized: 'append' },
    take: { primary: 'al', normalized: 'take' },
    make: { primary: 'yap', normalized: 'make' },
    clone: { primary: 'kopyala', normalized: 'clone' },
    swap: { primary: 'değiştir', alternatives: ['takas'], normalized: 'swap' },
    morph: { primary: 'dönüştür', alternatives: ['şekil değiştir'], normalized: 'morph' },
    // Variable operations
    set: { primary: 'ayarla', normalized: 'set' },
    get: { primary: 'al', normalized: 'get' },
    increment: { primary: 'artır', normalized: 'increment' },
    decrement: { primary: 'azalt', normalized: 'decrement' },
    log: { primary: 'kaydet', normalized: 'log' },
    // Visibility
    show: { primary: 'göster', normalized: 'show' },
    hide: { primary: 'gizle', normalized: 'hide' },
    transition: { primary: 'geçiş', normalized: 'transition' },
    // Events
    on: { primary: 'üzerinde', alternatives: ['olduğunda', 'zaman'], normalized: 'on' },
    trigger: { primary: 'tetikle', normalized: 'trigger' },
    send: { primary: 'gönder', normalized: 'send' },
    // DOM focus
    focus: { primary: 'odak', normalized: 'focus' },
    blur: { primary: 'bulanık', normalized: 'blur' },
    // Navigation
    go: { primary: 'git', normalized: 'go' },
    // Async
    wait: { primary: 'bekle', normalized: 'wait' },
    fetch: { primary: 'getir', normalized: 'fetch' },
    settle: { primary: 'sabitlen', normalized: 'settle' },
    // Control flow
    if: { primary: 'eğer', normalized: 'if' },
    else: { primary: 'yoksa', normalized: 'else' },
    repeat: { primary: 'tekrarla', normalized: 'repeat' },
    for: { primary: 'için', normalized: 'for' },
    while: { primary: 'iken', normalized: 'while' },
    continue: { primary: 'devam', normalized: 'continue' },
    halt: { primary: 'durdur', normalized: 'halt' },
    throw: { primary: 'fırlat', normalized: 'throw' },
    call: { primary: 'çağır', normalized: 'call' },
    return: { primary: 'dön', normalized: 'return' },
    then: { primary: 'sonra', alternatives: ['ardından', 'daha sonra'], normalized: 'then' },
    and: { primary: 've', alternatives: ['ayrıca', 'hem de'], normalized: 'and' },
    end: { primary: 'son', alternatives: ['bitiş', 'bitti'], normalized: 'end' },
    // Advanced
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'asenkron', normalized: 'async' },
    tell: { primary: 'söyle', normalized: 'tell' },
    default: { primary: 'varsayılan', normalized: 'default' },
    init: { primary: 'başlat', normalized: 'init' },
    behavior: { primary: 'davranış', normalized: 'behavior' },
    install: { primary: 'yükle', normalized: 'install' },
    measure: { primary: 'ölç', normalized: 'measure' },
    // Modifiers
    into: { primary: 'içine', normalized: 'into' },
    before: { primary: 'önce', normalized: 'before' },
    after: { primary: 'sonra', normalized: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: 'kadar', normalized: 'until' },
    event: { primary: 'olay', normalized: 'event' },
    from: { primary: '-den', alternatives: ['-dan'], normalized: 'from' },
  },
};

/**
 * Portuguese language profile.
 * SVO word order, prepositions, space-separated.
 */
export const portugueseProfile: LanguageProfile = {
  code: 'pt',
  name: 'Portuguese',
  nativeName: 'Português',
  direction: 'ltr',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  verb: {
    position: 'start',
    subjectDrop: true,
  },
  references: {
    me: 'eu',        // "I/me"
    it: 'ele',       // "it"
    you: 'você',     // "you"
    result: 'resultado',
    event: 'evento',
    target: 'alvo',
    body: 'corpo',
  },
  possessive: {
    marker: 'de',    // Uses "de" for general possession
    markerPosition: 'before-property',
    usePossessiveAdjectives: true,
    specialForms: {
      me: 'meu',     // "my"
      it: 'seu',     // "its"
      you: 'teu',    // "your" (or "seu" in formal)
    },
  },
  roleMarkers: {
    destination: { primary: 'em', alternatives: ['para', 'a'], position: 'before' },
    source: { primary: 'de', alternatives: ['desde'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'com', position: 'before' },
  },
  keywords: {
    toggle: { primary: 'alternar', alternatives: ['trocar'], normalized: 'toggle' },
    add: { primary: 'adicionar', alternatives: ['acrescentar'], normalized: 'add' },
    remove: { primary: 'remover', alternatives: ['eliminar', 'apagar'], normalized: 'remove' },
    put: { primary: 'colocar', alternatives: ['pôr', 'por'], normalized: 'put' },
    append: { primary: 'anexar', normalized: 'append' },
    prepend: { primary: 'preceder', normalized: 'prepend' },
    take: { primary: 'pegar', normalized: 'take' },
    make: { primary: 'fazer', alternatives: ['criar'], normalized: 'make' },
    clone: { primary: 'clonar', alternatives: ['copiar'], normalized: 'clone' },
    swap: { primary: 'trocar', alternatives: ['substituir'], normalized: 'swap' },
    morph: { primary: 'transformar', alternatives: ['converter'], normalized: 'morph' },
    set: { primary: 'definir', alternatives: ['configurar'], normalized: 'set' },
    get: { primary: 'obter', normalized: 'get' },
    increment: { primary: 'incrementar', alternatives: ['aumentar'], normalized: 'increment' },
    decrement: { primary: 'decrementar', alternatives: ['diminuir'], normalized: 'decrement' },
    log: { primary: 'registrar', alternatives: ['imprimir'], normalized: 'log' },
    show: { primary: 'mostrar', alternatives: ['exibir'], normalized: 'show' },
    hide: { primary: 'ocultar', alternatives: ['esconder'], normalized: 'hide' },
    transition: { primary: 'transição', alternatives: ['animar'], normalized: 'transition' },
    on: { primary: 'em', alternatives: ['quando', 'ao'], normalized: 'on' },
    trigger: { primary: 'disparar', alternatives: ['ativar'], normalized: 'trigger' },
    send: { primary: 'enviar', normalized: 'send' },
    focus: { primary: 'focar', normalized: 'focus' },
    blur: { primary: 'desfocar', normalized: 'blur' },
    go: { primary: 'ir', alternatives: ['navegar'], normalized: 'go' },
    wait: { primary: 'esperar', alternatives: ['aguardar'], normalized: 'wait' },
    fetch: { primary: 'buscar', normalized: 'fetch' },
    settle: { primary: 'estabilizar', normalized: 'settle' },
    if: { primary: 'se', normalized: 'if' },
    else: { primary: 'senão', normalized: 'else' },
    repeat: { primary: 'repetir', normalized: 'repeat' },
    for: { primary: 'para', normalized: 'for' },
    while: { primary: 'enquanto', normalized: 'while' },
    continue: { primary: 'continuar', normalized: 'continue' },
    halt: { primary: 'parar', normalized: 'halt' },
    throw: { primary: 'lançar', normalized: 'throw' },
    call: { primary: 'chamar', normalized: 'call' },
    return: { primary: 'retornar', alternatives: ['devolver'], normalized: 'return' },
    then: { primary: 'então', alternatives: ['depois', 'logo'], normalized: 'then' },
    and: { primary: 'e', alternatives: ['também', 'além disso'], normalized: 'and' },
    end: { primary: 'fim', alternatives: ['final', 'término'], normalized: 'end' },
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'assíncrono', normalized: 'async' },
    tell: { primary: 'dizer', normalized: 'tell' },
    default: { primary: 'padrão', normalized: 'default' },
    init: { primary: 'iniciar', alternatives: ['inicializar'], normalized: 'init' },
    behavior: { primary: 'comportamento', normalized: 'behavior' },
    install: { primary: 'instalar', normalized: 'install' },
    measure: { primary: 'medir', normalized: 'measure' },
    into: { primary: 'em', alternatives: ['dentro de'], normalized: 'into' },
    before: { primary: 'antes', normalized: 'before' },
    after: { primary: 'depois', normalized: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: 'até', normalized: 'until' },
    event: { primary: 'evento', normalized: 'event' },
    from: { primary: 'de', alternatives: ['desde'], normalized: 'from' },
  },
};

/**
 * French language profile.
 * SVO word order, prepositions, space-separated.
 */
export const frenchProfile: LanguageProfile = {
  code: 'fr',
  name: 'French',
  nativeName: 'Français',
  direction: 'ltr',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  verb: {
    position: 'start',
    subjectDrop: false,
  },
  references: {
    me: 'moi',       // "I/me"
    it: 'il',        // "it"
    you: 'toi',      // "you"
    result: 'résultat',
    event: 'événement',
    target: 'cible',
    body: 'corps',
  },
  possessive: {
    marker: 'de',    // Uses "de" for general possession
    markerPosition: 'before-property',
    usePossessiveAdjectives: true,
    specialForms: {
      me: 'ma',      // "my" (feminine; "mon" for masculine)
      it: 'sa',      // "its" (feminine; "son" for masculine)
      you: 'ta',     // "your" (feminine; "ton" for masculine)
    },
  },
  roleMarkers: {
    destination: { primary: 'sur', alternatives: ['à', 'dans'], position: 'before' },
    source: { primary: 'de', alternatives: ['depuis'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'avec', position: 'before' },
  },
  keywords: {
    toggle: { primary: 'basculer', alternatives: ['permuter', 'alterner'], normalized: 'toggle' },
    add: { primary: 'ajouter', normalized: 'add' },
    remove: { primary: 'supprimer', alternatives: ['enlever', 'retirer'], normalized: 'remove' },
    put: { primary: 'mettre', alternatives: ['placer'], normalized: 'put' },
    append: { primary: 'annexer', normalized: 'append' },
    prepend: { primary: 'préfixer', normalized: 'prepend' },
    take: { primary: 'prendre', normalized: 'take' },
    make: { primary: 'faire', alternatives: ['créer'], normalized: 'make' },
    clone: { primary: 'cloner', alternatives: ['copier'], normalized: 'clone' },
    swap: { primary: 'échanger', alternatives: ['permuter'], normalized: 'swap' },
    morph: { primary: 'transformer', alternatives: ['métamorphoser'], normalized: 'morph' },
    set: { primary: 'définir', alternatives: ['établir'], normalized: 'set' },
    get: { primary: 'obtenir', normalized: 'get' },
    increment: { primary: 'incrémenter', alternatives: ['augmenter'], normalized: 'increment' },
    decrement: { primary: 'décrémenter', alternatives: ['diminuer'], normalized: 'decrement' },
    log: { primary: 'enregistrer', alternatives: ['afficher'], normalized: 'log' },
    show: { primary: 'montrer', alternatives: ['afficher'], normalized: 'show' },
    hide: { primary: 'cacher', alternatives: ['masquer'], normalized: 'hide' },
    transition: { primary: 'transition', alternatives: ['animer'], normalized: 'transition' },
    on: { primary: 'sur', alternatives: ['quand', 'lors'], normalized: 'on' },
    trigger: { primary: 'déclencher', normalized: 'trigger' },
    send: { primary: 'envoyer', normalized: 'send' },
    focus: { primary: 'focaliser', alternatives: ['concentrer'], normalized: 'focus' },
    blur: { primary: 'défocaliser', normalized: 'blur' },
    go: { primary: 'aller', alternatives: ['naviguer'], normalized: 'go' },
    wait: { primary: 'attendre', normalized: 'wait' },
    fetch: { primary: 'chercher', alternatives: ['récupérer'], normalized: 'fetch' },
    settle: { primary: 'stabiliser', normalized: 'settle' },
    if: { primary: 'si', normalized: 'if' },
    else: { primary: 'sinon', normalized: 'else' },
    repeat: { primary: 'répéter', normalized: 'repeat' },
    for: { primary: 'pour', normalized: 'for' },
    while: { primary: 'pendant', normalized: 'while' },
    continue: { primary: 'continuer', normalized: 'continue' },
    halt: { primary: 'arrêter', alternatives: ['stopper'], normalized: 'halt' },
    throw: { primary: 'lancer', normalized: 'throw' },
    call: { primary: 'appeler', normalized: 'call' },
    return: { primary: 'retourner', alternatives: ['renvoyer'], normalized: 'return' },
    then: { primary: 'puis', alternatives: ['ensuite', 'alors'], normalized: 'then' },
    and: { primary: 'et', alternatives: ['aussi', 'également'], normalized: 'and' },
    end: { primary: 'fin', alternatives: ['terminer', 'finir'], normalized: 'end' },
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'asynchrone', normalized: 'async' },
    tell: { primary: 'dire', normalized: 'tell' },
    default: { primary: 'défaut', normalized: 'default' },
    init: { primary: 'initialiser', normalized: 'init' },
    behavior: { primary: 'comportement', normalized: 'behavior' },
    install: { primary: 'installer', normalized: 'install' },
    measure: { primary: 'mesurer', normalized: 'measure' },
    into: { primary: 'dans', normalized: 'into' },
    before: { primary: 'avant', normalized: 'before' },
    after: { primary: 'après', normalized: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: 'jusqu\'à', alternatives: ['jusque'], normalized: 'until' },
    event: { primary: 'événement', normalized: 'event' },
    from: { primary: 'de', alternatives: ['depuis'], normalized: 'from' },
  },
};

/**
 * German language profile.
 * SVO word order (V2 in main clauses), prepositions, space-separated.
 */
export const germanProfile: LanguageProfile = {
  code: 'de',
  name: 'German',
  nativeName: 'Deutsch',
  direction: 'ltr',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  verb: {
    position: 'start',
    subjectDrop: false,
  },
  references: {
    me: 'ich',       // "I"
    it: 'es',        // "it"
    you: 'du',       // "you"
    result: 'Ergebnis',
    event: 'Ereignis',
    target: 'Ziel',
    body: 'Körper',
  },
  possessive: {
    marker: '',      // German uses possessive pronouns directly
    markerPosition: 'before-property',
    usePossessiveAdjectives: true,
    specialForms: {
      me: 'mein',    // "my"
      it: 'sein',    // "its"
      you: 'dein',   // "your"
    },
  },
  roleMarkers: {
    destination: { primary: 'auf', alternatives: ['zu', 'in'], position: 'before' },
    source: { primary: 'von', alternatives: ['aus'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'mit', position: 'before' },
  },
  keywords: {
    toggle: { primary: 'umschalten', alternatives: ['wechseln'], normalized: 'toggle' },
    add: { primary: 'hinzufügen', normalized: 'add' },
    remove: { primary: 'entfernen', alternatives: ['löschen'], normalized: 'remove' },
    put: { primary: 'setzen', alternatives: ['stellen', 'platzieren'], normalized: 'put' },
    append: { primary: 'anhängen', normalized: 'append' },
    prepend: { primary: 'voranstellen', normalized: 'prepend' },
    take: { primary: 'nehmen', normalized: 'take' },
    make: { primary: 'machen', alternatives: ['erstellen', 'erzeugen'], normalized: 'make' },
    clone: { primary: 'klonen', alternatives: ['kopieren'], normalized: 'clone' },
    swap: { primary: 'austauschen', alternatives: ['tauschen', 'wechseln'], normalized: 'swap' },
    morph: { primary: 'verwandeln', alternatives: ['transformieren'], normalized: 'morph' },
    set: { primary: 'festlegen', alternatives: ['definieren'], normalized: 'set' },
    get: { primary: 'holen', alternatives: ['bekommen'], normalized: 'get' },
    increment: { primary: 'erhöhen', normalized: 'increment' },
    decrement: { primary: 'verringern', alternatives: ['vermindern'], normalized: 'decrement' },
    log: { primary: 'protokollieren', alternatives: ['ausgeben'], normalized: 'log' },
    show: { primary: 'zeigen', alternatives: ['anzeigen'], normalized: 'show' },
    hide: { primary: 'verbergen', alternatives: ['verstecken'], normalized: 'hide' },
    transition: { primary: 'übergang', alternatives: ['animieren'], normalized: 'transition' },
    on: { primary: 'bei', alternatives: ['wenn', 'auf'], normalized: 'on' },
    trigger: { primary: 'auslösen', normalized: 'trigger' },
    send: { primary: 'senden', alternatives: ['schicken'], normalized: 'send' },
    focus: { primary: 'fokussieren', normalized: 'focus' },
    blur: { primary: 'defokussieren', alternatives: ['entfokussieren'], normalized: 'blur' },
    go: { primary: 'gehen', alternatives: ['navigieren'], normalized: 'go' },
    wait: { primary: 'warten', normalized: 'wait' },
    fetch: { primary: 'abrufen', alternatives: ['laden'], normalized: 'fetch' },
    settle: { primary: 'stabilisieren', normalized: 'settle' },
    if: { primary: 'wenn', alternatives: ['falls'], normalized: 'if' },
    else: { primary: 'sonst', alternatives: ['ansonsten'], normalized: 'else' },
    repeat: { primary: 'wiederholen', normalized: 'repeat' },
    for: { primary: 'für', normalized: 'for' },
    while: { primary: 'solange', alternatives: ['während'], normalized: 'while' },
    continue: { primary: 'fortfahren', alternatives: ['weiter'], normalized: 'continue' },
    halt: { primary: 'anhalten', alternatives: ['stoppen'], normalized: 'halt' },
    throw: { primary: 'werfen', normalized: 'throw' },
    call: { primary: 'aufrufen', normalized: 'call' },
    return: { primary: 'zurückgeben', normalized: 'return' },
    then: { primary: 'dann', alternatives: ['danach', 'anschließend'], normalized: 'then' },
    and: { primary: 'und', alternatives: ['sowie', 'auch'], normalized: 'and' },
    end: { primary: 'ende', alternatives: ['beenden', 'fertig'], normalized: 'end' },
    js: { primary: 'js', alternatives: ['javascript'], normalized: 'js' },
    async: { primary: 'asynchron', normalized: 'async' },
    tell: { primary: 'sagen', normalized: 'tell' },
    default: { primary: 'standard', normalized: 'default' },
    init: { primary: 'initialisieren', normalized: 'init' },
    behavior: { primary: 'verhalten', normalized: 'behavior' },
    install: { primary: 'installieren', normalized: 'install' },
    measure: { primary: 'messen', normalized: 'measure' },
    into: { primary: 'hinein', normalized: 'into' },
    before: { primary: 'vor', normalized: 'before' },
    after: { primary: 'nach', normalized: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: 'bis', normalized: 'until' },
    event: { primary: 'Ereignis', alternatives: ['Event'], normalized: 'event' },
    from: { primary: 'von', alternatives: ['aus'], normalized: 'from' },
  },
};

/**
 * Indonesian language profile.
 * SVO word order, prepositions, space-separated, agglutinative.
 */
export const indonesianProfile: LanguageProfile = {
  code: 'id',
  name: 'Indonesian',
  nativeName: 'Bahasa Indonesia',
  direction: 'ltr',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  verb: {
    position: 'start',
    subjectDrop: true,
  },
  references: {
    me: 'saya',      // "I/me"
    it: 'itu',       // "it"
    you: 'anda',     // "you"
    result: 'hasil',
    event: 'peristiwa',
    target: 'target',
    body: 'tubuh',
  },
  possessive: {
    marker: '',      // Indonesian: "X saya" (X of mine), possessor follows noun
    markerPosition: 'after-object',
    usePossessiveAdjectives: true,
    specialForms: {
      me: 'saya',    // Possessor follows: "value saya" = "my value"
      it: 'nya',     // Suffix: "valueny" = "its value"
      you: 'anda',   // "value anda" = "your value"
    },
  },
  roleMarkers: {
    destination: { primary: 'pada', alternatives: ['ke', 'di'], position: 'before' },
    source: { primary: 'dari', position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'dengan', position: 'before' },
  },
  keywords: {
    toggle: { primary: 'alihkan', alternatives: ['ganti', 'tukar'], normalized: 'toggle' },
    add: { primary: 'tambah', alternatives: ['tambahkan'], normalized: 'add' },
    remove: { primary: 'hapus', alternatives: ['buang', 'hilangkan'], normalized: 'remove' },
    put: { primary: 'taruh', alternatives: ['letakkan', 'masukkan'], normalized: 'put' },
    append: { primary: 'sisipkan', normalized: 'append' },
    prepend: { primary: 'awali', normalized: 'prepend' },
    take: { primary: 'ambil', normalized: 'take' },
    make: { primary: 'buat', alternatives: ['bikin', 'ciptakan'], normalized: 'make' },
    clone: { primary: 'klon', alternatives: ['salin', 'tiru'], normalized: 'clone' },
    swap: { primary: 'tukar', alternatives: ['ganti'], normalized: 'swap' },
    morph: { primary: 'ubah', alternatives: ['transformasi'], normalized: 'morph' },
    set: { primary: 'atur', alternatives: ['tetapkan'], normalized: 'set' },
    get: { primary: 'dapatkan', alternatives: ['peroleh'], normalized: 'get' },
    increment: { primary: 'tingkatkan', alternatives: ['naikkan'], normalized: 'increment' },
    decrement: { primary: 'turunkan', alternatives: ['kurangi'], normalized: 'decrement' },
    log: { primary: 'catat', alternatives: ['rekam', 'cetak'], normalized: 'log' },
    show: { primary: 'tampilkan', alternatives: ['perlihatkan'], normalized: 'show' },
    hide: { primary: 'sembunyikan', alternatives: ['tutup'], normalized: 'hide' },
    transition: { primary: 'transisi', alternatives: ['animasikan'], normalized: 'transition' },
    on: { primary: 'pada', alternatives: ['saat', 'ketika'], normalized: 'on' },
    trigger: { primary: 'picu', alternatives: ['jalankan'], normalized: 'trigger' },
    send: { primary: 'kirim', alternatives: ['kirimkan'], normalized: 'send' },
    focus: { primary: 'fokus', alternatives: ['fokuskan'], normalized: 'focus' },
    blur: { primary: 'blur', normalized: 'blur' },
    go: { primary: 'pergi', alternatives: ['pindah', 'navigasi'], normalized: 'go' },
    wait: { primary: 'tunggu', normalized: 'wait' },
    fetch: { primary: 'ambil', alternatives: ['muat'], normalized: 'fetch' },
    settle: { primary: 'stabilkan', normalized: 'settle' },
    if: { primary: 'jika', alternatives: ['kalau', 'bila'], normalized: 'if' },
    else: { primary: 'selainnya', normalized: 'else' },
    repeat: { primary: 'ulangi', normalized: 'repeat' },
    for: { primary: 'untuk', normalized: 'for' },
    while: { primary: 'selama', normalized: 'while' },
    continue: { primary: 'lanjutkan', alternatives: ['terus'], normalized: 'continue' },
    halt: { primary: 'hentikan', alternatives: ['berhenti'], normalized: 'halt' },
    throw: { primary: 'lempar', normalized: 'throw' },
    call: { primary: 'panggil', normalized: 'call' },
    return: { primary: 'kembalikan', alternatives: ['kembali'], normalized: 'return' },
    then: { primary: 'lalu', alternatives: ['kemudian', 'setelah itu'], normalized: 'then' },
    and: { primary: 'dan', alternatives: ['juga', 'serta'], normalized: 'and' },
    end: { primary: 'selesai', alternatives: ['akhir', 'tamat'], normalized: 'end' },
    js: { primary: 'js', alternatives: ['javascript'], normalized: 'js' },
    async: { primary: 'asinkron', normalized: 'async' },
    tell: { primary: 'katakan', alternatives: ['beritahu'], normalized: 'tell' },
    default: { primary: 'bawaan', normalized: 'default' },
    init: { primary: 'inisialisasi', alternatives: ['mulai'], normalized: 'init' },
    behavior: { primary: 'perilaku', normalized: 'behavior' },
    install: { primary: 'pasang', alternatives: ['instal'], normalized: 'install' },
    measure: { primary: 'ukur', normalized: 'measure' },
    into: { primary: 'ke dalam', normalized: 'into' },
    before: { primary: 'sebelum', normalized: 'before' },
    after: { primary: 'sesudah', alternatives: ['setelah'], normalized: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: 'sampai', normalized: 'until' },
    event: { primary: 'peristiwa', alternatives: ['event'], normalized: 'event' },
    from: { primary: 'dari', normalized: 'from' },
  },
};

/**
 * Quechua language profile.
 * SOV word order, postpositions (suffixes), polysynthetic.
 */
export const quechuaProfile: LanguageProfile = {
  code: 'qu',
  name: 'Quechua',
  nativeName: 'Runasimi',
  direction: 'ltr',
  wordOrder: 'SOV',
  markingStrategy: 'postposition',
  usesSpaces: true,
  verb: {
    position: 'end',
    subjectDrop: true,
  },
  references: {
    me: 'ñuqa',      // "I/me"
    it: 'pay',       // "it/he/she" (same pronoun)
    you: 'qam',      // "you"
    result: 'rurasqa',
    event: 'ruwakuq',
    target: 'ñawpaqman',
    body: 'ukhu',
  },
  possessive: {
    marker: '-pa',   // Genitive suffix
    markerPosition: 'after-object',
    // Quechua: ñuqapa value = "my value"
  },
  roleMarkers: {
    patient: { primary: '-ta', position: 'after' },
    destination: { primary: '-man', position: 'after' },
    source: { primary: '-manta', position: 'after' },
    style: { primary: '-wan', position: 'after' },
    event: { primary: '-ta', position: 'after' }, // Event as accusative
  },
  keywords: {
    toggle: { primary: "t'ikray", alternatives: ['tikray', 'kutichiy'], normalized: 'toggle' },
    add: { primary: 'yapay', alternatives: ['yapaykuy'], normalized: 'add' },
    remove: { primary: 'qichuy', alternatives: ['hurquy', 'anchuchiy'], normalized: 'remove' },
    put: { primary: 'churay', alternatives: ['tiyachiy'], normalized: 'put' },
    append: { primary: 'qatichiy', normalized: 'append' },
    prepend: { primary: 'ñawpachiy', normalized: 'prepend' },
    take: { primary: 'hapiy', normalized: 'take' },
    make: { primary: 'ruray', alternatives: ['kamay'], normalized: 'make' },
    clone: { primary: 'kikinchay', alternatives: ['qillqay'], normalized: 'clone' },
    swap: { primary: 't\'inkuy', alternatives: ['rantikunakuy'], normalized: 'swap' },
    morph: { primary: 'tikray', alternatives: ['kutichiy'], normalized: 'morph' },
    set: { primary: 'churay', alternatives: ['kamaykuy'], normalized: 'set' },
    get: { primary: 'taripay', normalized: 'get' },
    increment: { primary: 'yapachiy', normalized: 'increment' },
    decrement: { primary: 'pisiyachiy', normalized: 'decrement' },
    log: { primary: 'qillqakuy', alternatives: ['willakuy'], normalized: 'log' },
    show: { primary: 'rikuchiy', alternatives: ['qawachiy'], normalized: 'show' },
    hide: { primary: 'pakay', alternatives: ['pakakuy'], normalized: 'hide' },
    transition: { primary: 'tikray', alternatives: ['kuyuchiy'], normalized: 'transition' },
    on: { primary: 'chaypim', alternatives: ['kaypi'], normalized: 'on' },
    trigger: { primary: 'qallarichiy', normalized: 'trigger' },
    send: { primary: 'kachay', alternatives: ['apachiy'], normalized: 'send' },
    focus: { primary: 'qhawachiy', normalized: 'focus' },
    blur: { primary: 'mana qhawachiy', normalized: 'blur' },
    go: { primary: 'riy', alternatives: ['puriy'], normalized: 'go' },
    wait: { primary: 'suyay', normalized: 'wait' },
    fetch: { primary: 'apamuy', alternatives: ['taripakaramuy'], normalized: 'fetch' },
    settle: { primary: 'tiyakuy', normalized: 'settle' },
    if: { primary: 'sichus', normalized: 'if' },
    else: { primary: 'manachus', alternatives: ['hukniraq'], normalized: 'else' },
    repeat: { primary: 'kutipay', alternatives: ['muyu'], normalized: 'repeat' },
    for: { primary: 'sapankaq', normalized: 'for' },
    while: { primary: 'kaykamaqa', normalized: 'while' },
    continue: { primary: 'qatipay', normalized: 'continue' },
    halt: { primary: 'sayay', alternatives: ['tukuy'], normalized: 'halt' },
    throw: { primary: 'chanqay', normalized: 'throw' },
    call: { primary: 'waqyay', normalized: 'call' },
    return: { primary: 'kutichiy', alternatives: ['kutimuy'], normalized: 'return' },
    then: { primary: 'chaymantataq', alternatives: ['hinaspa', 'chaymanta'], normalized: 'then' },
    and: { primary: 'hinallataq', alternatives: ['ima', 'chaymantawan'], normalized: 'and' },
    end: { primary: 'tukukuy', alternatives: ['tukuy', 'puchukay'], normalized: 'end' },
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'mana waqtalla', normalized: 'async' },
    tell: { primary: 'niy', alternatives: ['willakuy'], normalized: 'tell' },
    default: { primary: 'qallariy', normalized: 'default' },
    init: { primary: 'qallarichiy', normalized: 'init' },
    behavior: { primary: 'ruwana', normalized: 'behavior' },
    install: { primary: 'churay', normalized: 'install' },
    measure: { primary: 'tupuy', normalized: 'measure' },
    into: { primary: 'ukuman', normalized: 'into' },
    before: { primary: 'ñawpaq', normalized: 'before' },
    after: { primary: 'qhipa', normalized: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: '-kama', alternatives: ['kama'], normalized: 'until' },
    event: { primary: 'ruwakuq', alternatives: ['imayna'], normalized: 'event' },
    from: { primary: '-manta', normalized: 'from' },
  },
};

/**
 * Swahili language profile.
 * SVO word order, prepositions, space-separated, agglutinative.
 */
export const swahiliProfile: LanguageProfile = {
  code: 'sw',
  name: 'Swahili',
  nativeName: 'Kiswahili',
  direction: 'ltr',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  verb: {
    position: 'start',
    subjectDrop: true,
  },
  references: {
    me: 'mimi',      // "I/me"
    it: 'hiyo',      // "it"
    you: 'wewe',     // "you"
    result: 'matokeo',
    event: 'tukio',
    target: 'lengo',
    body: 'mwili',
  },
  possessive: {
    marker: '',      // Swahili uses possessive pronouns
    markerPosition: 'after-object',
    usePossessiveAdjectives: true,
    specialForms: {
      me: 'yangu',   // "my" (class-dependent: wangu/yangu/langu...)
      it: 'yake',    // "its"
      you: 'yako',   // "your"
    },
  },
  roleMarkers: {
    destination: { primary: 'kwenye', alternatives: ['kwa'], position: 'before' },
    source: { primary: 'kutoka', position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'na', position: 'before' },
  },
  keywords: {
    toggle: { primary: 'badilisha', alternatives: ['geuza'], normalized: 'toggle' },
    add: { primary: 'ongeza', alternatives: ['weka'], normalized: 'add' },
    remove: { primary: 'ondoa', alternatives: ['futa', 'toa'], normalized: 'remove' },
    put: { primary: 'weka', alternatives: ['tia'], normalized: 'put' },
    append: { primary: 'ambatanisha', normalized: 'append' },
    prepend: { primary: 'tanguliza', normalized: 'prepend' },
    take: { primary: 'chukua', normalized: 'take' },
    make: { primary: 'tengeneza', alternatives: ['unda'], normalized: 'make' },
    clone: { primary: 'nakili', alternatives: ['rudufu'], normalized: 'clone' },
    swap: { primary: 'badilisha', alternatives: ['badalisha'], normalized: 'swap' },
    morph: { primary: 'geuza', alternatives: ['badilisha umbo'], normalized: 'morph' },
    set: { primary: 'weka', alternatives: ['seti'], normalized: 'set' },
    get: { primary: 'pata', alternatives: ['pokea'], normalized: 'get' },
    increment: { primary: 'ongeza', normalized: 'increment' },
    decrement: { primary: 'punguza', normalized: 'decrement' },
    log: { primary: 'andika', alternatives: ['rekodi'], normalized: 'log' },
    show: { primary: 'onyesha', normalized: 'show' },
    hide: { primary: 'ficha', alternatives: ['mficho'], normalized: 'hide' },
    transition: { primary: 'hamisha', alternatives: ['animisha'], normalized: 'transition' },
    on: { primary: 'wakati', alternatives: ['kwenye', 'unapo'], normalized: 'on' },
    trigger: { primary: 'chochea', alternatives: ['anzisha'], normalized: 'trigger' },
    send: { primary: 'tuma', alternatives: ['peleka'], normalized: 'send' },
    focus: { primary: 'lenga', alternatives: ['angazia'], normalized: 'focus' },
    blur: { primary: 'blur', normalized: 'blur' },
    go: { primary: 'nenda', alternatives: ['enda', 'elekea'], normalized: 'go' },
    wait: { primary: 'subiri', alternatives: ['ngoja'], normalized: 'wait' },
    fetch: { primary: 'leta', alternatives: ['pakia'], normalized: 'fetch' },
    settle: { primary: 'tulia', alternatives: ['imarika'], normalized: 'settle' },
    if: { primary: 'kama', alternatives: ['ikiwa'], normalized: 'if' },
    else: { primary: 'vinginevyo', alternatives: ['sivyo'], normalized: 'else' },
    repeat: { primary: 'rudia', normalized: 'repeat' },
    for: { primary: 'kwa', normalized: 'for' },
    while: { primary: 'wakati', normalized: 'while' },
    continue: { primary: 'endelea', normalized: 'continue' },
    halt: { primary: 'simama', alternatives: ['acha'], normalized: 'halt' },
    throw: { primary: 'tupa', normalized: 'throw' },
    call: { primary: 'ita', normalized: 'call' },
    return: { primary: 'rudisha', alternatives: ['rejea'], normalized: 'return' },
    then: { primary: 'kisha', alternatives: ['halafu', 'baadaye'], normalized: 'then' },
    and: { primary: 'na', alternatives: ['pia', 'vilevile'], normalized: 'and' },
    end: { primary: 'mwisho', alternatives: ['maliza', 'tamati'], normalized: 'end' },
    js: { primary: 'js', alternatives: ['javascript'], normalized: 'js' },
    async: { primary: 'isiyo sawia', normalized: 'async' },
    tell: { primary: 'sema', alternatives: ['ambia'], normalized: 'tell' },
    default: { primary: 'chaguo-msingi', normalized: 'default' },
    init: { primary: 'anzisha', alternatives: ['anza'], normalized: 'init' },
    behavior: { primary: 'tabia', normalized: 'behavior' },
    install: { primary: 'weka', alternatives: ['sakinisha'], normalized: 'install' },
    measure: { primary: 'pima', normalized: 'measure' },
    into: { primary: 'ndani', normalized: 'into' },
    before: { primary: 'kabla', normalized: 'before' },
    after: { primary: 'baada', normalized: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: 'hadi', normalized: 'until' },
    event: { primary: 'tukio', normalized: 'event' },
    from: { primary: 'kutoka', normalized: 'from' },
  },
};

// =============================================================================
// Profile Registry
// =============================================================================

/**
 * All available language profiles.
 */
export const languageProfiles: Record<string, LanguageProfile> = {
  en: englishProfile,
  ja: japaneseProfile,
  ar: arabicProfile,
  es: spanishProfile,
  ko: koreanProfile,
  zh: chineseProfile,
  tr: turkishProfile,
  pt: portugueseProfile,
  fr: frenchProfile,
  de: germanProfile,
  id: indonesianProfile,
  qu: quechuaProfile,
  sw: swahiliProfile,
};

/**
 * Get a language profile by code.
 */
export function getProfile(code: string): LanguageProfile | undefined {
  return languageProfiles[code];
}

/**
 * Get all supported language codes.
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(languageProfiles);
}

/**
 * Check if a language is supported.
 */
export function isLanguageSupported(code: string): boolean {
  return code in languageProfiles;
}
