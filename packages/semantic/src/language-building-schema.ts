/**
 * Language Building Schema
 *
 * This file defines the schema for adding languages and commands to the semantic parser.
 * It serves as both documentation and validation for ensuring all required pieces are in place.
 *
 * ## Adding a New Language
 *
 * Required steps:
 * 1. Create language profile in generators/language-profiles.ts
 * 2. Create tokenizer in tokenizers/{language}.ts
 * 3. Register tokenizer in tokenizers/index.ts
 * 4. Create morphological normalizer in tokenizers/morphology/{language}-normalizer.ts (for agglutinative/inflected languages)
 * 5. Add event handler patterns in patterns/event-handler.ts (if different from generated)
 * 6. Add tests in test/official-examples.test.ts
 * 7. Add morphology tests in test/morphology.test.ts (if normalizer created)
 *
 * ## Adding a New Command
 *
 * Required steps:
 * 1. Define command schema in generators/command-schemas.ts
 * 2. Wire schema in patterns/index.ts (generatePatternsForCommand)
 * 3. Add keywords to ALL language profiles in generators/language-profiles.ts
 * 4. Add keywords to ALL tokenizers' keyword maps
 * 5. Add tests for all languages in test/official-examples.test.ts
 *
 * ## Morphological Infrastructure
 *
 * Languages with verb conjugations or inflections need morphological normalizers:
 * - Japanese: て-form, た-form, ます-form, ている, etc.
 * - Korean: 다 ending, 요/니다 forms, 았/었 past tense
 * - Spanish: Conjugations (-ar, -er, -ir), reflexive verbs (mostrarse)
 * - Arabic: Prefix/suffix stripping (ال, ي, ت, ن, أ, ون, ين)
 * - Turkish: Vowel harmony, tense suffixes (-iyor, -di, -miş)
 *
 * The normalizer extracts the stem and provides a confidence score.
 * Pattern matching uses stemmed forms when exact/normalized matches fail.
 *
 * ## Common Pitfalls
 *
 * - Keywords in language profiles but NOT in tokenizer keyword maps
 *   → Tokens classified as 'identifier' instead of 'keyword'
 *   → Pattern matching fails
 *
 * - Particle conflicts (e.g., Japanese 'に' used for both events and destinations)
 *   → Event handler patterns match command patterns
 *   → Solution: Use distinct particles or adjust pattern priorities
 *
 * - Missing keyword alternatives
 *   → Native speakers may use different words for same concept
 *   → Include common alternatives in both profile and tokenizer
 *
 * - Missing morphological normalizer for agglutinative languages
 *   → Conjugated verb forms won't be recognized
 *   → Solution: Create normalizer and integrate with tokenizer
 */

// =============================================================================
// Language Checklist Schema
// =============================================================================

export interface LanguageChecklist {
  /** ISO 639-1 language code */
  code: string;

  /** Human-readable language name */
  name: string;

  /** Word order (SVO, SOV, VSO) */
  wordOrder: 'SVO' | 'SOV' | 'VSO';

  /** Writing direction */
  direction: 'ltr' | 'rtl';

  /** Required files */
  files: {
    /** Language profile exists in generators/language-profiles.ts */
    languageProfile: boolean;

    /** Tokenizer exists in tokenizers/{code}.ts */
    tokenizer: boolean;

    /** Tokenizer registered in tokenizers/index.ts */
    tokenizerRegistered: boolean;

    /** Morphological normalizer in tokenizers/morphology/{code}-normalizer.ts */
    morphologicalNormalizer: boolean;

    /** Event handler patterns in patterns/event-handler.ts (optional for generated) */
    eventHandlerPatterns: boolean;

    /** Tests in test/official-examples.test.ts */
    tests: boolean;

    /** Morphology tests in test/morphology.test.ts */
    morphologyTests: boolean;
  };

  /** Morphological infrastructure details */
  morphology: {
    /** Whether this language needs morphological normalization */
    needed: boolean;

    /** Why it's needed (or not needed) */
    reason: string;

    /** Types of inflections handled */
    inflectionTypes: string[];

    /** Whether the normalizer is integrated with the tokenizer */
    integratedWithTokenizer: boolean;

    /** Confidence threshold for stemmed matches */
    confidenceThreshold: number;
  };

  /** Keywords defined in language profile */
  profileKeywords: string[];

  /** Keywords defined in tokenizer keyword map */
  tokenizerKeywords: string[];

  /** Keywords missing from tokenizer (profile has, tokenizer doesn't) */
  missingFromTokenizer: string[];

  /** Particles/markers that may cause conflicts */
  potentialConflicts: ParticleConflict[];
}

export interface ParticleConflict {
  /** The particle/marker */
  particle: string;

  /** What it's used for (e.g., 'destination', 'event', 'object') */
  usedFor: string[];

  /** Whether this causes actual pattern conflicts */
  isResolved: boolean;

  /** How it was resolved */
  resolution?: string;
}

// =============================================================================
// Command Checklist Schema
// =============================================================================

export interface CommandChecklist {
  /** Command action name */
  action: string;

  /** Whether schema exists in generators/command-schemas.ts */
  schemaExists: boolean;

  /** Whether wired in patterns/index.ts (false for hand-crafted patterns) */
  wiredInPatterns: boolean;

  /** Whether this command uses hand-crafted patterns instead of generated */
  usesHandCraftedPatterns: boolean;

  /** Languages with profile keywords defined */
  profileKeywordsIn: string[];

  /** Languages with tokenizer keywords defined */
  tokenizerKeywordsIn: string[];

  /** Languages missing tokenizer keywords */
  missingTokenizerKeywordsIn: string[];

  /** Tests exist for each language */
  testsFor: string[];
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validates that a language has all required pieces in place.
 */
export function validateLanguage(checklist: LanguageChecklist): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required files
  if (!checklist.files.languageProfile) {
    errors.push(`Missing language profile for ${checklist.code}`);
  }
  if (!checklist.files.tokenizer) {
    errors.push(`Missing tokenizer for ${checklist.code}`);
  }
  if (!checklist.files.tokenizerRegistered) {
    errors.push(`Tokenizer not registered for ${checklist.code}`);
  }
  if (!checklist.files.tests) {
    warnings.push(`No tests found for ${checklist.code}`);
  }

  // Check keyword sync
  if (checklist.missingFromTokenizer.length > 0) {
    errors.push(
      `Keywords in profile but not tokenizer for ${checklist.code}: ` +
        checklist.missingFromTokenizer.join(', ')
    );
  }

  // Check particle conflicts
  const unresolvedConflicts = checklist.potentialConflicts.filter(c => !c.isResolved);
  if (unresolvedConflicts.length > 0) {
    for (const conflict of unresolvedConflicts) {
      warnings.push(
        `Unresolved particle conflict in ${checklist.code}: ` +
          `'${conflict.particle}' used for ${conflict.usedFor.join(' and ')}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates that a command has all required pieces in place.
 */
export function validateCommand(checklist: CommandChecklist): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!checklist.schemaExists) {
    errors.push(`Missing schema for command: ${checklist.action}`);
  }

  // Hand-crafted patterns don't need to be wired
  if (!checklist.wiredInPatterns && !checklist.usesHandCraftedPatterns) {
    errors.push(`Command not wired in patterns/index.ts: ${checklist.action}`);
  }

  if (checklist.missingTokenizerKeywordsIn.length > 0) {
    warnings.push(
      `Command ${checklist.action} missing tokenizer keywords in: ` +
        checklist.missingTokenizerKeywordsIn.join(', ')
    );
  }

  // All languages should have tests
  const allLanguages = ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'];
  const missingTests = allLanguages.filter(lang => !checklist.testsFor.includes(lang));
  if (missingTests.length > 0) {
    warnings.push(
      `Command ${checklist.action} missing tests for: ${missingTests.join(', ')}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// =============================================================================
// Current State Documentation
// =============================================================================

/**
 * Documents the current state of language support.
 * Update this when adding new languages or commands.
 */
export const SUPPORTED_LANGUAGES: LanguageChecklist[] = [
  {
    code: 'en',
    name: 'English',
    wordOrder: 'SVO',
    direction: 'ltr',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: false,
      eventHandlerPatterns: true,
      tests: true,
      morphologyTests: false,
    },
    morphology: {
      needed: false,
      reason: 'English has minimal inflection; keywords match base forms',
      inflectionTypes: [],
      integratedWithTokenizer: false,
      confidenceThreshold: 1.0,
    },
    profileKeywords: [
      'toggle', 'add', 'remove', 'put', 'set', 'show', 'hide',
      'append', 'prepend', 'increment', 'decrement', 'wait',
      'fetch', 'go', 'trigger', 'send', 'log', 'make', 'clone',
      'take', 'get', 'focus', 'blur', 'transition', 'settle',
      'if', 'else', 'repeat', 'for', 'while', 'continue', 'halt', 'throw',
      'call', 'return', 'js', 'async', 'tell', 'default', 'init', 'behavior',
      'into', 'before', 'after', 'on',
    ],
    tokenizerKeywords: [
      // Commands - Class/Attribute operations
      'toggle', 'add', 'remove',
      // Commands - Content operations
      'put', 'append', 'prepend', 'take', 'make', 'clone',
      // Commands - Variable operations
      'set', 'get', 'increment', 'decrement', 'log',
      // Commands - Visibility
      'show', 'hide', 'transition',
      // Commands - Events
      'on', 'trigger', 'send',
      // Commands - DOM focus
      'focus', 'blur',
      // Commands - Navigation
      'go',
      // Commands - Async
      'wait', 'fetch', 'settle',
      // Commands - Control flow
      'if', 'else', 'repeat', 'for', 'while', 'continue', 'halt', 'throw', 'call', 'return',
      // Commands - Advanced
      'js', 'async', 'tell', 'default', 'init', 'behavior',
      // Modifiers
      'into', 'before', 'after',
    ],
    missingFromTokenizer: [],
    potentialConflicts: [],
  },
  {
    code: 'ja',
    name: 'Japanese',
    wordOrder: 'SOV',
    direction: 'ltr',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: true,
      eventHandlerPatterns: true,
      tests: true,
      morphologyTests: true,
    },
    morphology: {
      needed: true,
      reason: 'Japanese is agglutinative with rich verb conjugation',
      inflectionTypes: [
        'て-form (切り替えて)',
        'た-form/past (切り替えた)',
        'ます-form/polite (切り替えます)',
        'ている/progressive (切り替えている)',
        'ない/negative (切り替えない)',
        'する verbs (トグルする → トグル)',
      ],
      integratedWithTokenizer: true,
      confidenceThreshold: 0.7,
    },
    profileKeywords: [
      '切り替え', '追加', '削除', '置く', '設定', '表示', '隠す',
      '末尾追加', '先頭追加', '増加', '減少', '待つ', '取得',
      '移動', '引き金', '送信', '記録', '作る', '複製', '取る',
      'フォーカス', 'ぼかし', '遷移', '安定', 'もし', 'そうでなければ',
      '繰り返し', 'ために', 'の間', '続ける', '停止', '投げる',
      '呼び出し', '戻る', 'JS実行', '非同期', '伝える', '既定',
      '初期化', '振る舞い', 'へ', '前に', '後に', 'で',
    ],
    tokenizerKeywords: [
      // Commands - Class/Attribute operations
      '切り替え', '切り替える', 'トグル', 'トグルする',
      '追加', '追加する', '加える', '削除', '削除する', '取り除く',
      // Commands - Content operations
      '置く', '入れる', '末尾追加', 'アペンド', '先頭追加', 'プリペンド',
      '取る', '作る', '作成', '複製', 'クローン',
      // Commands - Variable operations
      'セット', 'セットする', '設定', '設定する',
      '取得', '取得する', 'ゲット',
      '増加', '増加する', '増やす', 'インクリメント',
      '減少', '減少する', '減らす', 'デクリメント',
      '記録', 'ログ', '出力',
      // Commands - Visibility
      '表示', '表示する', '見せる', '隠す', '非表示', '非表示にする',
      '遷移', 'トランジション', 'アニメーション',
      // Commands - Events
      'で', '時', 'とき', 'トリガー', '発火', '引き金', '送る', '送信', '送信する',
      // Commands - DOM focus
      'フォーカス', '集中', 'ぼかし', 'フォーカス解除',
      // Commands - Navigation
      '移動', '行く', 'ナビゲート',
      // Commands - Async
      '待つ', '待機', 'フェッチ', '安定', '落ち着く',
      // Commands - Control flow
      'もし', '条件', 'そうでなければ', 'それ以外',
      '繰り返し', '繰り返す', 'リピート', 'ために', '各', 'の間', '間',
      '続ける', '継続', '停止', '止める', 'ハルト', '投げる', 'スロー',
      '呼び出し', 'コール', '呼ぶ', '呼び出す', '戻る', '返す', 'リターン',
      // Commands - Advanced
      'JS実行', 'js', '非同期', 'アシンク', '伝える', 'テル',
      '既定', 'デフォルト', '初期化', 'イニット', '振る舞い', 'ビヘイビア',
      // Modifiers
      'へ', '前に', '後に', '後',
    ],
    missingFromTokenizer: [], // Now synced
    potentialConflicts: [
      {
        particle: 'に',
        usedFor: ['destination', 'time'],
        isResolved: true,
        resolution: 'Removed に from event handler alternatives; use で for events',
      },
    ],
  },
  {
    code: 'ko',
    name: 'Korean',
    wordOrder: 'SOV',
    direction: 'ltr',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: true,
      eventHandlerPatterns: false, // Uses generated patterns
      tests: true,
      morphologyTests: true,
    },
    morphology: {
      needed: true,
      reason: 'Korean is agglutinative with verb conjugation and honorific forms',
      inflectionTypes: [
        '다 ending/dictionary (바꾸다 → 바꾸)',
        '요 ending/polite (바꿔요 → 바꾸)',
        '니다 ending/formal (바꿉니다 → 바꾸)',
        '세요 ending/honorific (바꾸세요 → 바꾸)',
        '았/었 past tense (바꿨어 → 바꾸)',
        'Vowel harmony for particles',
      ],
      integratedWithTokenizer: true,
      confidenceThreshold: 0.7,
    },
    profileKeywords: [
      '토글', '추가', '제거', '놓다', '설정', '보이다', '숨기다',
      '추가', '앞에추가', '증가', '감소', '기다리다', '가져오다',
      '가다', '트리거', '보내다', '로그', '만들다', '복사', '가져오기',
      '포커스', '블러', '전환', '안정', '던지다', '비동기', '말하다',
      '기본값', '초기화', '동작', '으로', '전에', '후에',
    ],
    tokenizerKeywords: [
      // Commands - Class/Attribute operations
      '토글', '토글하다', '바꾸다', '전환', '스위치',
      '추가', '추가하다', '더하다', '제거', '제거하다', '삭제', '없애다',
      // Commands - Content operations
      '놓다', '넣다', '두다', '뒤에추가', '앞에추가',
      '가져가다', '취하다', '만들다', '생성', '복사', '클론',
      // Commands - Variable operations
      '세트', '설정', '설정하다', '정하다',
      '가져오다', '얻다', '취득',
      '증가', '증가하다', '늘리다', '감소', '감소하다', '줄이다',
      '로그', '기록',
      // Commands - Visibility
      '보이다', '표시', '보여주다', '숨기다', '숨김', '감추다',
      '전환', '애니메이션',
      // Commands - Events
      '에', '시', '때', '트리거', '발동', '발사', '보내다', '전송',
      // Commands - DOM focus
      '포커스', '집중', '블러', '흐리게',
      // Commands - Navigation
      '가다', '이동', '네비게이트',
      // Commands - Async
      '기다리다', '대기', '페치', '가져오기', '안정', '정착',
      // Commands - Control flow
      '만약', '조건', '아니면', '그렇지않으면',
      '반복', '되풀이', '각각', '동안', '하는동안',
      '계속', '계속하다', '정지', '중지', '멈추다', '던지다', '던지기',
      '호출', '부르다', '반환', '돌려주다',
      // Commands - Advanced
      'js', 'JS실행', '비동기', '어싱크',
      '말하다', '알리다', '기본값', '디폴트',
      '초기화', '시작', '동작', '행동',
      // Modifiers
      '으로', '로', '전에', '이전', '후에', '이후',
    ],
    missingFromTokenizer: [], // Now synced
    potentialConflicts: [],
  },
  {
    code: 'ar',
    name: 'Arabic',
    wordOrder: 'VSO',
    direction: 'rtl',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: true,
      eventHandlerPatterns: true,
      tests: true,
      morphologyTests: true,
    },
    morphology: {
      needed: true,
      reason: 'Arabic has complex root-pattern morphology with prefixes/suffixes',
      inflectionTypes: [
        'Definite article ال (البدل → بدل)',
        'Conjunction prefixes و/ف (والبدل → بدل)',
        'Preposition prefixes ب/ل (ببدل → بدل)',
        'Present tense markers ي/ت/ن/أ (يبدل → بدل)',
        'Plural suffixes ون/ين (مستخدمون → مستخدم)',
        'Diacritics normalization (بدّل = بدل)',
      ],
      integratedWithTokenizer: true,
      confidenceThreshold: 0.7,
    },
    profileKeywords: [
      'بدل', 'أضف', 'أزل', 'ضع', 'اضبط', 'أظهر', 'أخف',
      'ألحق', 'سبق', 'زد', 'أنقص', 'انتظر', 'جلب',
      'اذهب', 'تشغيل', 'أرسل', 'سجل', 'خذ', 'اصنع', 'استنسخ',
      'تركيز', 'ضبابية', 'انتقال', 'استقر', 'استدع', 'ارجع',
      'جافاسكربت', 'متزامن', 'أخبر', 'افتراضي', 'تهيئة', 'سلوك',
      'في', 'قبل', 'بعد',
    ],
    tokenizerKeywords: [
      // Commands - Class/Attribute operations
      'بدّل', 'بدل', 'غيّر', 'غير',
      'أضف', 'اضف', 'زِد', 'أزل', 'ازل', 'احذف', 'امسح',
      // Commands - Content operations
      'ضع', 'اضع', 'يضع', 'اجعل', 'ألحق', 'سبق',
      'خذ', 'اصنع', 'أنشئ', 'استنسخ', 'انسخ',
      // Commands - Variable operations
      'اضبط', 'عيّن', 'عين', 'حدد',
      'احصل', 'زِد', 'زد', 'ارفع', 'أنقص', 'انقص', 'قلل',
      'سجّل', 'سجل',
      // Commands - Visibility
      'أظهر', 'اظهر', 'اعرض', 'أخفِ', 'اخفِ', 'اخف', 'اخفي',
      'انتقال', 'انتقل',
      // Commands - Events
      'على', 'عند', 'لدى', 'حين',
      'تشغيل', 'شغّل', 'شغل', 'أطلق', 'فعّل',
      'أرسل', 'ارسل',
      // Commands - DOM focus
      'تركيز', 'ركز', 'ضبابية', 'شوش',
      // Commands - Navigation
      'اذهب',
      // Commands - Async
      'انتظر', 'احضر', 'جلب', 'استقر',
      // Commands - Control flow
      'إذا', 'اذا', 'لو', 'وإلا', 'والا',
      'كرر', 'لكل', 'بينما', 'واصل',
      'أوقف', 'توقف', 'ارم', 'ارمِ',
      'استدع', 'اتصل', 'نادِ', 'ارجع', 'عُد',
      // Commands - Advanced
      'جافاسكربت', 'js', 'متزامن',
      'أخبر', 'افتراضي', 'تهيئة', 'بدء', 'سلوك',
      // Modifiers
      'في', 'إلى', 'قبل', 'بعد',
    ],
    missingFromTokenizer: [], // Now synced
    potentialConflicts: [],
  },
  {
    code: 'es',
    name: 'Spanish',
    wordOrder: 'SVO',
    direction: 'ltr',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: true,
      eventHandlerPatterns: true,
      tests: true,
      morphologyTests: true,
    },
    morphology: {
      needed: true,
      reason: 'Spanish has verb conjugations and reflexive verb forms',
      inflectionTypes: [
        '-ar conjugations (alternando, alternado → alternar)',
        '-er conjugations (escondiendo → esconder)',
        '-ir conjugations (similar pattern)',
        'Reflexive verbs (mostrarse → mostrar)',
        'Reflexive pronouns (se muestra → mostrar)',
        'Imperative reflexive (muéstrate → mostrar)',
      ],
      integratedWithTokenizer: true,
      confidenceThreshold: 0.7,
    },
    profileKeywords: [
      'alternar', 'añadir', 'quitar', 'poner', 'establecer',
      'mostrar', 'ocultar', 'añadir', 'anteponer',
      'incrementar', 'decrementar', 'esperar', 'obtener',
      'ir', 'disparar', 'enviar', 'registrar', 'tomar', 'hacer', 'clonar',
      'enfocar', 'desenfocar', 'transición', 'estabilizar', 'llamar', 'devolver',
      'js', 'asíncrono', 'decir', 'predeterminar', 'iniciar', 'comportamiento',
      'dentro de', 'antes', 'después',
    ],
    tokenizerKeywords: [
      // Commands - Class/Attribute operations
      'alternar', 'cambiar', 'toggle', 'conmutar',
      'añadir', 'agregar', 'quitar', 'eliminar', 'borrar', 'remover',
      // Commands - Content operations
      'poner', 'pon', 'colocar', 'anteponer',
      'tomar', 'hacer', 'crear', 'clonar', 'copiar',
      // Commands - Variable operations
      'establecer', 'fijar', 'obtener',
      'incrementar', 'aumentar', 'decrementar', 'disminuir',
      'registrar', 'imprimir',
      // Commands - Visibility
      'mostrar', 'enseñar', 'ocultar', 'esconder',
      'transición', 'animar',
      // Commands - Events
      'en', 'cuando', 'al', 'disparar', 'activar', 'enviar',
      // Commands - DOM focus
      'enfocar', 'desenfocar',
      // Commands - Navigation
      'ir', 'navegar',
      // Commands - Async
      'esperar', 'buscar', 'estabilizar',
      // Commands - Control flow
      'si', 'sino', 'repetir', 'para', 'mientras',
      'continuar', 'detener', 'parar', 'lanzar', 'arrojar',
      'llamar', 'devolver', 'retornar',
      // Commands - Advanced
      'js', 'asíncrono', 'asincrono',
      'decir', 'predeterminar', 'iniciar', 'inicializar', 'comportamiento',
      // Modifiers
      'dentro de', 'antes', 'después', 'despues',
    ],
    missingFromTokenizer: [], // Now synced
    potentialConflicts: [],
  },
  {
    code: 'tr',
    name: 'Turkish',
    wordOrder: 'SOV',
    direction: 'ltr',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: true,
      eventHandlerPatterns: false, // Uses generated patterns
      tests: true,
      morphologyTests: true,
    },
    morphology: {
      needed: true,
      reason: 'Turkish is highly agglutinative with vowel harmony',
      inflectionTypes: [
        'Vowel harmony (değiştir + iyor → değiştiriyor)',
        'Present continuous -iyor/-ıyor/-uyor/-üyor',
        'Past tense -di/-dı/-du/-dü',
        'Reported past -miş/-mış/-muş/-müş',
        'Person suffixes -im/-sin/-iz',
        'Negation -me/-ma',
        'Infinitive -mek/-mak',
      ],
      integratedWithTokenizer: true,
      confidenceThreshold: 0.7,
    },
    profileKeywords: [
      'değiştir', 'ekle', 'kaldır', 'koy', 'ayarla',
      'göster', 'gizle', 'ekle', 'öneekle',
      'artır', 'azalt', 'bekle', 'getir',
      'git', 'tetikle', 'gönder', 'kaydet', 'al', 'yap', 'kopyala',
      'odakla', 'bulanıklaştır', 'geçiş', 'yerleş', 'fırlat',
      'asenkron', 'söyle', 'varsayılan', 'başlat', 'davranış',
      'içine', 'önce', 'sonra',
    ],
    tokenizerKeywords: [
      // Commands - Class/Attribute operations
      'değiştir', 'değistir', 'ekle', 'kaldır', 'kaldir', 'sil',
      // Commands - Content operations
      'koy', 'yerleştir', 'yerlestir', 'sonunaekle', 'sona_ekle',
      'basaekle', 'başa_ekle', 'basa_ekle',
      'al', 'yap', 'oluştur', 'olustur', 'kopyala', 'klonla',
      // Commands - Variable operations
      'ayarla', 'belirle', 'getir', 'elde_et',
      'artır', 'artir', 'azalt', 'kaydet', 'yazdır', 'yazdir',
      // Commands - Visibility
      'göster', 'goster', 'gizle', 'sakla',
      'geçiş', 'gecis', 'animasyon',
      // Commands - Events
      'üzerinde', 'uzerinde', 'olduğunda', 'oldugunda',
      'tetikle', 'ateşle', 'atesle', 'gönder', 'gonder',
      // Commands - DOM focus
      'odakla', 'odaklan', 'bulanıklaştır', 'bulaniklastir', 'odak_kaldır', 'odak_kaldir',
      // Commands - Navigation
      'git', 'yönlendir', 'yonlendir',
      // Commands - Async
      'bekle', 'çek', 'cek', 'yerleş', 'yerles', 'istikrar', 'sabitlen',
      // Commands - Control flow
      'eğer', 'eger', 'yoksa', 'değilse', 'degilse',
      'tekrarla', 'herbir', 'her', 'iken',
      'devam', 'devam_et', 'dur', 'durdur',
      'fırlat', 'firlat', 'at',
      'çağır', 'cagir', 'dön', 'don', 'döndür', 'dondur',
      // Commands - Advanced
      'js', 'javascript', 'asenkron', 'eşzamansız', 'eszamansiz',
      'söyle', 'soyle', 'varsayılan', 'varsayilan',
      'başlat', 'baslat', 'başla', 'basla', 'davranış', 'davranis',
      // Modifiers
      'içine', 'icine', 'önce', 'once', 'sonra',
    ],
    missingFromTokenizer: [], // Now synced
    potentialConflicts: [],
  },
  {
    code: 'zh',
    name: 'Chinese',
    wordOrder: 'SVO',
    direction: 'ltr',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: false,
      eventHandlerPatterns: false, // Uses generated patterns
      tests: true,
      morphologyTests: false,
    },
    morphology: {
      needed: false,
      reason: 'Chinese is isolating with no verb conjugation; keywords match base forms',
      inflectionTypes: [],
      integratedWithTokenizer: false,
      confidenceThreshold: 1.0,
    },
    profileKeywords: [
      '切换', '添加', '移除', '放置', '设置',
      '显示', '隐藏', '追加', '前置',
      '增加', '减少', '等待', '获取',
      '前往', '触发', '发送', '日志', '拿取', '制作', '复制',
      '聚焦', '失焦', '过渡', '稳定', '抛出', '调用', '返回',
      '脚本', '异步', '告诉', '默认', '初始化', '行为',
      '里', '之前', '之后',
    ],
    tokenizerKeywords: [
      // Commands - Class/Attribute operations
      '切换', '添加', '加', '移除', '删除', '去掉',
      // Commands - Content operations
      '放置', '放', '放入', '追加', '附加', '前置', '预置',
      '拿取', '取', '制作', '创建', '复制', '克隆',
      // Commands - Variable operations
      '设置', '设定', '获取', '取得', '获得',
      '增加', '减少', '日志', '记录', '打印',
      // Commands - Visibility
      '显示', '展示', '隐藏', '过渡', '动画',
      // Commands - Events
      '当', '在', '触发', '激发', '发送',
      // Commands - DOM focus
      '聚焦', '对焦', '失焦', '模糊',
      // Commands - Navigation
      '前往', '跳转', '导航',
      // Commands - Async
      '等待', '抓取', '获取数据', '稳定', '安定',
      // Commands - Control flow
      '如果', '若', '否则', '不然',
      '重复', '循环', '遍历', '每个', '为每', '当',
      '继续', '停止', '中止', '抛出', '抛',
      '调用', '呼叫', '返回', '回',
      // Commands - Advanced
      'js', 'javascript', '脚本', '异步',
      '告诉', '通知', '默认', '缺省', '初始化', '初始', '行为', '动作',
      // Modifiers
      '到里面', '进入', '里', '之前', '前', '之后', '后',
    ],
    missingFromTokenizer: [], // Now synced
    potentialConflicts: [],
  },
];

/**
 * Documents the current state of command support.
 */
export const SUPPORTED_COMMANDS: CommandChecklist[] = [
  {
    action: 'toggle',
    schemaExists: true,
    wiredInPatterns: false,
    usesHandCraftedPatterns: true, // Hand-crafted in patterns/toggle.ts
    profileKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    tokenizerKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    missingTokenizerKeywordsIn: [],
    testsFor: ['en', 'ja', 'ar', 'es', 'ko', 'tr'],
  },
  {
    action: 'add',
    schemaExists: true,
    wiredInPatterns: true,
    usesHandCraftedPatterns: false,
    profileKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    tokenizerKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    missingTokenizerKeywordsIn: [],
    testsFor: ['en', 'ja', 'ko', 'ar', 'es', 'tr', 'zh'],
  },
  {
    action: 'append',
    schemaExists: true,
    wiredInPatterns: true,
    usesHandCraftedPatterns: false,
    profileKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    tokenizerKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    missingTokenizerKeywordsIn: [],
    testsFor: ['en', 'ja', 'es', 'ar'],
  },
  {
    action: 'prepend',
    schemaExists: true,
    wiredInPatterns: true,
    usesHandCraftedPatterns: false,
    profileKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    tokenizerKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    missingTokenizerKeywordsIn: [],
    testsFor: ['en', 'ja', 'es'],
  },
  {
    action: 'trigger',
    schemaExists: true,
    wiredInPatterns: true,
    usesHandCraftedPatterns: false,
    profileKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    tokenizerKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    missingTokenizerKeywordsIn: [],
    testsFor: ['en', 'ja', 'es', 'ar'],
  },
  {
    action: 'set',
    schemaExists: true,
    wiredInPatterns: true,
    usesHandCraftedPatterns: false,
    profileKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    tokenizerKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    missingTokenizerKeywordsIn: [],
    testsFor: ['en', 'ja', 'es', 'ar', 'ko', 'tr'],
  },
  // Tier 2: Content & variable operations (newly wired)
  {
    action: 'take',
    schemaExists: true,
    wiredInPatterns: true,
    usesHandCraftedPatterns: false,
    profileKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    tokenizerKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    missingTokenizerKeywordsIn: [],
    testsFor: ['en'],
  },
  {
    action: 'make',
    schemaExists: true,
    wiredInPatterns: true,
    usesHandCraftedPatterns: false,
    profileKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    tokenizerKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    missingTokenizerKeywordsIn: [],
    testsFor: ['en'],
  },
  {
    action: 'clone',
    schemaExists: true,
    wiredInPatterns: true,
    usesHandCraftedPatterns: false,
    profileKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    tokenizerKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    missingTokenizerKeywordsIn: [],
    testsFor: ['en'],
  },
  {
    action: 'get',
    schemaExists: true,
    wiredInPatterns: true,
    usesHandCraftedPatterns: false,
    profileKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    tokenizerKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    missingTokenizerKeywordsIn: [],
    testsFor: ['en'],
  },
  // Tier 3: Control flow & DOM (newly wired)
  {
    action: 'focus',
    schemaExists: true,
    wiredInPatterns: true,
    usesHandCraftedPatterns: false,
    profileKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    tokenizerKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    missingTokenizerKeywordsIn: [],
    testsFor: ['en'],
  },
  {
    action: 'blur',
    schemaExists: true,
    wiredInPatterns: true,
    usesHandCraftedPatterns: false,
    profileKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    tokenizerKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    missingTokenizerKeywordsIn: [],
    testsFor: ['en'],
  },
  {
    action: 'call',
    schemaExists: true,
    wiredInPatterns: true,
    usesHandCraftedPatterns: false,
    profileKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    tokenizerKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    missingTokenizerKeywordsIn: [],
    testsFor: ['en'],
  },
  {
    action: 'return',
    schemaExists: true,
    wiredInPatterns: true,
    usesHandCraftedPatterns: false,
    profileKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    tokenizerKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    missingTokenizerKeywordsIn: [],
    testsFor: ['en'],
  },
];

// =============================================================================
// Process Documentation
// =============================================================================

/**
 * Step-by-step process for adding a new language.
 */
export const ADD_LANGUAGE_PROCESS = `
# Adding a New Language

## Step 1: Create Language Profile
File: packages/semantic/src/generators/language-profiles.ts

Add a new profile with:
- code: ISO 639-1 code (e.g., 'de' for German)
- name: Human-readable name
- wordOrder: 'SVO', 'SOV', or 'VSO'
- direction: 'ltr' or 'rtl'
- keywords: Map of command → { primary, alternatives, normalized }
- particles: Object marking case/role particles
- prepositions: Destination/source markers

## Step 2: Create Tokenizer
File: packages/semantic/src/tokenizers/{code}.ts

Copy structure from similar language tokenizer:
- Character classification functions (if non-Latin script)
- KEYWORDS map: native words → English normalized
- Particle detection
- Word extraction logic

## Step 3: Register Tokenizer
File: packages/semantic/src/tokenizers/index.ts

- Import tokenizer
- Add to tokenizers map
- Add to exports

## Step 4: Add Event Handler Patterns (if needed)
File: packages/semantic/src/patterns/event-handler.ts

If the language needs custom event handler syntax:
- Add pattern for standard event form
- Add pattern for source-filtered events
- Add event name translations

## Step 5: Add Tests
File: packages/semantic/test/official-examples.test.ts

Add tests for:
- Basic commands (toggle, add, put)
- Commands with targets
- Multilingual equivalents section
- AST equivalence tests

## Step 6: Update Documentation
File: packages/semantic/src/language-building-schema.ts

Add entry to SUPPORTED_LANGUAGES array.
`;

/**
 * Step-by-step process for adding a new command.
 */
export const ADD_COMMAND_PROCESS = `
# Adding a New Command

## Step 1: Define Command Schema
File: packages/semantic/src/generators/command-schemas.ts

Add schema with:
- action: command name
- description: what it does
- category: 'dom-class', 'dom-content', 'variable', etc.
- primaryRole: main semantic role
- roles: array of RoleSpec with:
  - role: semantic role name
  - description
  - required: boolean
  - expectedTypes: ['selector', 'literal', 'reference', 'expression']
  - default: optional default value
  - svoPosition/sovPosition: word order hints

## Step 2: Add Keywords to Language Profiles
File: packages/semantic/src/generators/language-profiles.ts

For EACH language profile, add:
\`\`\`typescript
{command}: {
  primary: 'native_word',
  alternatives: ['alt1', 'alt2'],
  normalized: 'command',
}
\`\`\`

## Step 3: Add Keywords to Tokenizers
Files: packages/semantic/src/tokenizers/{language}.ts

For EACH tokenizer's KEYWORDS map, add:
\`\`\`typescript
['native_word', 'command'],
['alternative1', 'command'],
['alternative2', 'command'],
\`\`\`

## Step 4: Wire Schema in Pattern Registry
File: packages/semantic/src/patterns/index.ts

- Import schema from generators
- Add to generatedPatterns array:
  \`...generatePatternsForCommand({command}Schema),\`

## Step 5: Add Tests
File: packages/semantic/test/official-examples.test.ts

Add tests for:
- English syntax
- Each supported language
- Edge cases (implicit targets, etc.)

## Step 6: Update Documentation
File: packages/semantic/src/language-building-schema.ts

Add entry to SUPPORTED_COMMANDS array.
`;
