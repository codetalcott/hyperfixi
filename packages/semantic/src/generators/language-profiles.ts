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
  roleMarkers: {
    destination: { primary: 'on', alternatives: ['to', 'from'], position: 'before' },
    source: { primary: 'from', position: 'before' },
    patient: { primary: '', position: 'before' }, // No marker, just position
    style: { primary: 'with', alternatives: ['by', 'using'], position: 'before' },
    method: { primary: 'as', position: 'before' },
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
    trigger: { primary: 'trigger', alternatives: ['send'] },
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
    // Advanced
    js: { primary: 'js' },
    async: { primary: 'async' },
    tell: { primary: 'tell' },
    default: { primary: 'default' },
    init: { primary: 'init' },
    behavior: { primary: 'behavior' },
    // Modifiers
    into: { primary: 'into' },
    before: { primary: 'before' },
    after: { primary: 'after' },
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
  roleMarkers: {
    patient: { primary: 'を', position: 'after' },
    destination: { primary: 'に', alternatives: ['へ', 'で'], position: 'after' },
    source: { primary: 'から', position: 'after' },
    style: { primary: 'で', position: 'after' },
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
    // Advanced
    js: { primary: 'JS実行', alternatives: ['js'], normalized: 'js' },
    async: { primary: '非同期', alternatives: ['アシンク'], normalized: 'async' },
    tell: { primary: '伝える', alternatives: ['テル'], normalized: 'tell' },
    default: { primary: '既定', alternatives: ['デフォルト'], normalized: 'default' },
    init: { primary: '初期化', alternatives: ['イニット'], normalized: 'init' },
    behavior: { primary: '振る舞い', alternatives: ['ビヘイビア'], normalized: 'behavior' },
    // Modifiers
    into: { primary: 'へ', alternatives: ['に'], normalized: 'into' },
    before: { primary: '前に', alternatives: ['前'], normalized: 'before' },
    after: { primary: '後に', alternatives: ['後'], normalized: 'after' },
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
    // Advanced
    js: { primary: 'جافاسكربت', alternatives: ['js'], normalized: 'js' },
    async: { primary: 'متزامن', normalized: 'async' },
    tell: { primary: 'أخبر', normalized: 'tell' },
    default: { primary: 'افتراضي', normalized: 'default' },
    init: { primary: 'تهيئة', alternatives: ['بدء'], normalized: 'init' },
    behavior: { primary: 'سلوك', normalized: 'behavior' },
    // Modifiers
    into: { primary: 'في', alternatives: ['إلى'], normalized: 'into' },
    before: { primary: 'قبل', normalized: 'before' },
    after: { primary: 'بعد', normalized: 'after' },
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
    remove: { primary: 'quitar', alternatives: ['eliminar', 'remover'], normalized: 'remove' },
    // Content operations
    put: { primary: 'poner', alternatives: ['colocar'], normalized: 'put' },
    append: { primary: 'añadir', normalized: 'append' },
    prepend: { primary: 'anteponer', normalized: 'prepend' },
    take: { primary: 'tomar', normalized: 'take' },
    make: { primary: 'hacer', alternatives: ['crear'], normalized: 'make' },
    clone: { primary: 'clonar', alternatives: ['copiar'], normalized: 'clone' },
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
    // Advanced
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'asíncrono', normalized: 'async' },
    tell: { primary: 'decir', normalized: 'tell' },
    default: { primary: 'predeterminar', alternatives: ['por defecto'], normalized: 'default' },
    init: { primary: 'iniciar', alternatives: ['inicializar'], normalized: 'init' },
    behavior: { primary: 'comportamiento', normalized: 'behavior' },
    // Modifiers
    into: { primary: 'en', alternatives: ['dentro de'], normalized: 'into' },
    before: { primary: 'antes', normalized: 'before' },
    after: { primary: 'después', normalized: 'after' },
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
  roleMarkers: {
    patient: { primary: '을', alternatives: ['를'], position: 'after' },
    destination: { primary: '에', alternatives: ['으로', '로', '에서'], position: 'after' },
    source: { primary: '에서', alternatives: ['부터'], position: 'after' },
    style: { primary: '로', alternatives: ['으로'], position: 'after' },
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
    // Advanced
    js: { primary: 'JS실행', alternatives: ['js'], normalized: 'js' },
    async: { primary: '비동기', normalized: 'async' },
    tell: { primary: '말하다', normalized: 'tell' },
    default: { primary: '기본값', normalized: 'default' },
    init: { primary: '초기화', normalized: 'init' },
    behavior: { primary: '동작', normalized: 'behavior' },
    // Modifiers
    into: { primary: '으로', normalized: 'into' },
    before: { primary: '전에', normalized: 'before' },
    after: { primary: '후에', normalized: 'after' },
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
    append: { primary: '追加', normalized: 'append' },
    take: { primary: '获取', normalized: 'take' },
    make: { primary: '制作', normalized: 'make' },
    clone: { primary: '复制', normalized: 'clone' },
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
    // Advanced
    js: { primary: 'JS执行', alternatives: ['js'], normalized: 'js' },
    async: { primary: '异步', normalized: 'async' },
    tell: { primary: '告诉', normalized: 'tell' },
    default: { primary: '默认', normalized: 'default' },
    init: { primary: '初始化', normalized: 'init' },
    behavior: { primary: '行为', normalized: 'behavior' },
    // Modifiers
    into: { primary: '进入', normalized: 'into' },
    before: { primary: '之前', normalized: 'before' },
    after: { primary: '之后', normalized: 'after' },
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
  roleMarkers: {
    patient: { primary: 'i', alternatives: ['ı', 'u', 'ü'], position: 'after' }, // Accusative
    destination: { primary: 'e', alternatives: ['a', 'de', 'da', 'te', 'ta'], position: 'after' }, // Dative/Locative
    source: { primary: 'den', alternatives: ['dan', 'ten', 'tan'], position: 'after' }, // Ablative
    style: { primary: 'le', alternatives: ['la', 'yle', 'yla'], position: 'after' }, // Instrumental
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
    // Advanced
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'asenkron', normalized: 'async' },
    tell: { primary: 'söyle', normalized: 'tell' },
    default: { primary: 'varsayılan', normalized: 'default' },
    init: { primary: 'başlat', normalized: 'init' },
    behavior: { primary: 'davranış', normalized: 'behavior' },
    // Modifiers
    into: { primary: 'içine', normalized: 'into' },
    before: { primary: 'önce', normalized: 'before' },
    after: { primary: 'sonra', normalized: 'after' },
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
