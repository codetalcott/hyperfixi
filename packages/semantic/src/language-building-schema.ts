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
    warnings.push(`Command ${checklist.action} missing tests for: ${missingTests.join(', ')}`);
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
      'toggle',
      'add',
      'remove',
      'put',
      'set',
      'show',
      'hide',
      'append',
      'prepend',
      'increment',
      'decrement',
      'wait',
      'fetch',
      'go',
      'trigger',
      'send',
      'log',
      'make',
      'clone',
      'take',
      'get',
      'focus',
      'blur',
      'transition',
      'settle',
      'if',
      'else',
      'repeat',
      'for',
      'while',
      'continue',
      'halt',
      'throw',
      'call',
      'return',
      'js',
      'async',
      'tell',
      'default',
      'init',
      'behavior',
      'into',
      'before',
      'after',
      'on',
    ],
    tokenizerKeywords: [
      // Commands - Class/Attribute operations
      'toggle',
      'add',
      'remove',
      // Commands - Content operations
      'put',
      'append',
      'prepend',
      'take',
      'make',
      'clone',
      'swap',
      'morph', // swap/morph
      // Commands - Variable operations
      'set',
      'get',
      'increment',
      'decrement',
      'log',
      // Commands - Visibility
      'show',
      'hide',
      'transition',
      // Commands - Events
      'on',
      'trigger',
      'send',
      // Commands - DOM focus
      'focus',
      'blur',
      // Commands - Navigation
      'go',
      // Commands - Async
      'wait',
      'fetch',
      'settle',
      // Commands - Control flow
      'if',
      'else',
      'repeat',
      'for',
      'while',
      'continue',
      'halt',
      'throw',
      'call',
      'return',
      // Commands - Advanced
      'js',
      'async',
      'tell',
      'default',
      'init',
      'behavior',
      // Control flow helpers
      'then', // then
      'end', // end
      // Modifiers
      'into',
      'before',
      'after',
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
      '切り替え',
      '追加',
      '削除',
      '置く',
      '設定',
      '表示',
      '隠す',
      '末尾追加',
      '先頭追加',
      '増加',
      '減少',
      '待つ',
      '取得',
      '移動',
      '引き金',
      '送信',
      '記録',
      '作る',
      '複製',
      '取る',
      'フォーカス',
      'ぼかし',
      '遷移',
      '安定',
      'もし',
      'そうでなければ',
      '繰り返し',
      'ために',
      'の間',
      '続ける',
      '停止',
      '投げる',
      '呼び出し',
      '戻る',
      'JS実行',
      '非同期',
      '伝える',
      '既定',
      '初期化',
      '振る舞い',
      'へ',
      '前に',
      '後に',
      'で',
    ],
    tokenizerKeywords: [
      // Commands - Class/Attribute operations
      '切り替え',
      '切り替える',
      'トグル',
      'トグルする',
      '追加',
      '追加する',
      '加える',
      '削除',
      '削除する',
      '取り除く',
      // Commands - Content operations
      '置く',
      '入れる',
      '末尾追加',
      'アペンド',
      '先頭追加',
      'プリペンド',
      '取る',
      '作る',
      '作成',
      '複製',
      'クローン',
      '交換',
      'スワップ', // swap
      '変形',
      'モーフ', // morph
      // Commands - Variable operations
      'セット',
      'セットする',
      '設定',
      '設定する',
      '取得',
      '取得する',
      'ゲット',
      '増加',
      '増加する',
      '増やす',
      'インクリメント',
      '減少',
      '減少する',
      '減らす',
      'デクリメント',
      '記録',
      'ログ',
      '出力',
      // Commands - Visibility
      '表示',
      '表示する',
      '見せる',
      '隠す',
      '非表示',
      '非表示にする',
      '遷移',
      'トランジション',
      'アニメーション',
      // Commands - Events
      'で',
      '時',
      'とき',
      'トリガー',
      '発火',
      '引き金',
      '送る',
      '送信',
      '送信する',
      // Commands - DOM focus
      'フォーカス',
      '集中',
      'ぼかし',
      'フォーカス解除',
      // Commands - Navigation
      '移動',
      '行く',
      'ナビゲート',
      // Commands - Async
      '待つ',
      '待機',
      'フェッチ',
      '安定',
      '落ち着く',
      // Commands - Control flow
      'もし',
      '条件',
      'そうでなければ',
      'それ以外',
      '繰り返し',
      '繰り返す',
      'リピート',
      'ために',
      '各',
      'の間',
      '間',
      '続ける',
      '継続',
      '停止',
      '止める',
      'ハルト',
      '投げる',
      'スロー',
      '呼び出し',
      'コール',
      '呼ぶ',
      '呼び出す',
      '戻る',
      '返す',
      'リターン',
      // Commands - Advanced
      'JS実行',
      'js',
      '非同期',
      'アシンク',
      '伝える',
      'テル',
      '既定',
      'デフォルト',
      '初期化',
      'イニット',
      '振る舞い',
      'ビヘイビア',
      // Control flow helpers
      'それから',
      'そして',
      '次に', // then
      '終わり',
      '終了', // end
      // Modifiers
      'へ',
      '前に',
      '後に',
      '後',
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
      '토글',
      '추가',
      '제거',
      '놓다',
      '설정',
      '보이다',
      '숨기다',
      '추가',
      '앞에추가',
      '증가',
      '감소',
      '기다리다',
      '가져오다',
      '가다',
      '트리거',
      '보내다',
      '로그',
      '만들다',
      '복사',
      '가져오기',
      '포커스',
      '블러',
      '전환',
      '안정',
      '던지다',
      '비동기',
      '말하다',
      '기본값',
      '초기화',
      '동작',
      '으로',
      '전에',
      '후에',
    ],
    tokenizerKeywords: [
      // Commands - Class/Attribute operations
      '토글',
      '토글하다',
      '바꾸다',
      '전환',
      '스위치',
      '추가',
      '추가하다',
      '더하다',
      '제거',
      '제거하다',
      '삭제',
      '없애다',
      // Commands - Content operations
      '놓다',
      '넣다',
      '두다',
      '뒤에추가',
      '앞에추가',
      '가져가다',
      '취하다',
      '만들다',
      '생성',
      '복사',
      '클론',
      '교환',
      '스왑', // swap
      '변형',
      '모프', // morph
      // Commands - Variable operations
      '세트',
      '설정',
      '설정하다',
      '정하다',
      '가져오다',
      '얻다',
      '취득',
      '증가',
      '증가하다',
      '늘리다',
      '감소',
      '감소하다',
      '줄이다',
      '로그',
      '기록',
      // Commands - Visibility
      '보이다',
      '표시',
      '보여주다',
      '숨기다',
      '숨김',
      '감추다',
      '전환',
      '애니메이션',
      // Commands - Events
      '에',
      '시',
      '때',
      '트리거',
      '발동',
      '발사',
      '보내다',
      '전송',
      // Commands - DOM focus
      '포커스',
      '집중',
      '블러',
      '흐리게',
      // Commands - Navigation
      '가다',
      '이동',
      '네비게이트',
      // Commands - Async
      '기다리다',
      '대기',
      '페치',
      '가져오기',
      '안정',
      '정착',
      // Commands - Control flow
      '만약',
      '조건',
      '아니면',
      '그렇지않으면',
      '반복',
      '되풀이',
      '각각',
      '동안',
      '하는동안',
      '계속',
      '계속하다',
      '정지',
      '중지',
      '멈추다',
      '던지다',
      '던지기',
      '호출',
      '부르다',
      '반환',
      '돌려주다',
      // Commands - Advanced
      'js',
      'JS실행',
      '비동기',
      '어싱크',
      '말하다',
      '알리다',
      '기본값',
      '디폴트',
      '초기화',
      '시작',
      '동작',
      '행동',
      // Control flow helpers
      '그다음',
      '그리고',
      '그런다음', // then
      '끝',
      '종료', // end
      // Modifiers
      '으로',
      '로',
      '전에',
      '이전',
      '후에',
      '이후',
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
      'بدل',
      'أضف',
      'أزل',
      'ضع',
      'اضبط',
      'أظهر',
      'أخف',
      'ألحق',
      'سبق',
      'زد',
      'أنقص',
      'انتظر',
      'جلب',
      'اذهب',
      'تشغيل',
      'أرسل',
      'سجل',
      'خذ',
      'اصنع',
      'استنسخ',
      'تركيز',
      'ضبابية',
      'انتقال',
      'استقر',
      'استدع',
      'ارجع',
      'جافاسكربت',
      'متزامن',
      'أخبر',
      'افتراضي',
      'تهيئة',
      'سلوك',
      'في',
      'قبل',
      'بعد',
    ],
    tokenizerKeywords: [
      // Commands - Class/Attribute operations
      'بدّل',
      'بدل',
      'غيّر',
      'غير',
      'أضف',
      'اضف',
      'زِد',
      'أزل',
      'ازل',
      'احذف',
      'امسح',
      // Commands - Content operations
      'ضع',
      'اضع',
      'يضع',
      'اجعل',
      'ألحق',
      'سبق',
      'خذ',
      'اصنع',
      'أنشئ',
      'استنسخ',
      'انسخ',
      // Commands - Variable operations
      'اضبط',
      'عيّن',
      'عين',
      'حدد',
      'احصل',
      'زِد',
      'زد',
      'ارفع',
      'أنقص',
      'انقص',
      'قلل',
      'سجّل',
      'سجل',
      // Commands - Visibility
      'أظهر',
      'اظهر',
      'اعرض',
      'أخفِ',
      'اخفِ',
      'اخف',
      'اخفي',
      'انتقال',
      'انتقل',
      // Commands - Events
      'على',
      'عند',
      'لدى',
      'حين',
      'تشغيل',
      'شغّل',
      'شغل',
      'أطلق',
      'فعّل',
      'أرسل',
      'ارسل',
      // Commands - DOM focus
      'تركيز',
      'ركز',
      'ضبابية',
      'شوش',
      // Commands - Navigation
      'اذهب',
      // Commands - Async
      'انتظر',
      'احضر',
      'جلب',
      'استقر',
      // Commands - Control flow
      'إذا',
      'اذا',
      'لو',
      'وإلا',
      'والا',
      'كرر',
      'لكل',
      'بينما',
      'واصل',
      'أوقف',
      'توقف',
      'ارم',
      'ارمِ',
      'استدع',
      'اتصل',
      'نادِ',
      'ارجع',
      'عُد',
      // Commands - Advanced
      'جافاسكربت',
      'js',
      'متزامن',
      'أخبر',
      'افتراضي',
      'تهيئة',
      'بدء',
      'سلوك',
      // Control flow helpers
      'ثم',
      'بعدها', // then
      'نهاية',
      'انتهى', // end
      // Modifiers
      'في',
      'إلى',
      'قبل',
      'بعد',
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
      'alternar',
      'añadir',
      'quitar',
      'poner',
      'establecer',
      'mostrar',
      'ocultar',
      'añadir',
      'anteponer',
      'incrementar',
      'decrementar',
      'esperar',
      'obtener',
      'ir',
      'disparar',
      'enviar',
      'registrar',
      'tomar',
      'hacer',
      'clonar',
      'enfocar',
      'desenfocar',
      'transición',
      'estabilizar',
      'llamar',
      'devolver',
      'js',
      'asíncrono',
      'decir',
      'predeterminar',
      'iniciar',
      'comportamiento',
      'dentro de',
      'antes',
      'después',
    ],
    tokenizerKeywords: [
      // Commands - Class/Attribute operations
      'alternar',
      'cambiar',
      'toggle',
      'conmutar',
      'añadir',
      'agregar',
      'quitar',
      'eliminar',
      'borrar',
      'remover',
      // Commands - Content operations
      'poner',
      'pon',
      'colocar',
      'anteponer',
      'tomar',
      'hacer',
      'crear',
      'clonar',
      'copiar',
      'intercambiar', // swap
      'transformar',
      'mutar', // morph
      // Commands - Variable operations
      'establecer',
      'fijar',
      'obtener',
      'incrementar',
      'aumentar',
      'decrementar',
      'disminuir',
      'registrar',
      'imprimir',
      // Commands - Visibility
      'mostrar',
      'enseñar',
      'ocultar',
      'esconder',
      'transición',
      'animar',
      // Commands - Events
      'en',
      'cuando',
      'al',
      'disparar',
      'activar',
      'enviar',
      // Commands - DOM focus
      'enfocar',
      'desenfocar',
      // Commands - Navigation
      'ir',
      'navegar',
      // Commands - Async
      'esperar',
      'buscar',
      'estabilizar',
      // Commands - Control flow
      'si',
      'sino',
      'repetir',
      'para',
      'mientras',
      'continuar',
      'detener',
      'parar',
      'lanzar',
      'arrojar',
      'llamar',
      'devolver',
      'retornar',
      // Commands - Advanced
      'js',
      'asíncrono',
      'asincrono',
      'decir',
      'predeterminar',
      'iniciar',
      'inicializar',
      'comportamiento',
      // Control flow helpers
      'entonces',
      'luego', // then
      'fin',
      'terminar', // end
      // Modifiers
      'dentro de',
      'antes',
      'después',
      'despues',
    ],
    missingFromTokenizer: [], // Now synced
    potentialConflicts: [],
  },
  {
    code: 'es-MX',
    name: 'Spanish (Mexico)',
    wordOrder: 'SVO',
    direction: 'ltr',
    files: {
      languageProfile: true,
      tokenizer: true, // Uses Spanish tokenizer via inheritance
      tokenizerRegistered: true,
      morphologicalNormalizer: true, // Uses Spanish normalizer
      eventHandlerPatterns: true, // Uses Spanish patterns
      tests: true,
      morphologyTests: false,
    },
    morphology: {
      needed: true,
      reason: 'Uses Spanish morphology with Mexican-specific vocabulary',
      inflectionTypes: ['inherits from Spanish'],
      integratedWithTokenizer: true,
      confidenceThreshold: 0.7,
    },
    profileKeywords: [
      'alternar',
      'añadir',
      'quitar',
      'poner',
      'establecer',
      'mostrar',
      'ocultar',
      'añadir',
      'anteponer',
      'incrementar',
      'decrementar',
      'esperar',
      'ahorita', // Mexican alternative for wait
      'obtener',
      'jalar', // Mexican alternative for fetch
      'ir',
      'disparar',
      'enviar',
      'registrar',
      'tomar',
      'hacer',
      'clonar',
      'enfocar',
      'desenfocar',
      'transición',
      'estabilizar',
      'llamar',
      'devolver',
      'aventar', // Mexican alternative for throw
      'js',
      'asíncrono',
      'decir',
      'predeterminar',
      'iniciar',
      'comportamiento',
      'dentro de',
      'antes',
      'después',
    ],
    tokenizerKeywords: [
      // Inherits Spanish tokenizer keywords
      // Mexican-specific alternatives are in profile
    ],
    missingFromTokenizer: [],
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
      'değiştir',
      'ekle',
      'kaldır',
      'koy',
      'ayarla',
      'göster',
      'gizle',
      'ekle',
      'öneekle',
      'artır',
      'azalt',
      'bekle',
      'getir',
      'git',
      'tetikle',
      'gönder',
      'kaydet',
      'al',
      'yap',
      'kopyala',
      'odakla',
      'bulanıklaştır',
      'geçiş',
      'yerleş',
      'fırlat',
      'asenkron',
      'söyle',
      'varsayılan',
      'başlat',
      'davranış',
      'içine',
      'önce',
      'sonra',
    ],
    tokenizerKeywords: [
      // Commands - Class/Attribute operations
      'değiştir',
      'değistir',
      'ekle',
      'kaldır',
      'kaldir',
      'sil',
      // Commands - Content operations
      'koy',
      'yerleştir',
      'yerlestir',
      'sonunaekle',
      'sona_ekle',
      'basaekle',
      'başa_ekle',
      'basa_ekle',
      'al',
      'yap',
      'oluştur',
      'olustur',
      'kopyala',
      'klonla',
      'dönüştür',
      'donustur', // morph
      // Commands - Variable operations
      'ayarla',
      'belirle',
      'getir',
      'elde_et',
      'artır',
      'artir',
      'azalt',
      'kaydet',
      'yazdır',
      'yazdir',
      // Commands - Visibility
      'göster',
      'goster',
      'gizle',
      'sakla',
      'geçiş',
      'gecis',
      'animasyon',
      // Commands - Events
      'üzerinde',
      'uzerinde',
      'olduğunda',
      'oldugunda',
      'tetikle',
      'ateşle',
      'atesle',
      'gönder',
      'gonder',
      // Commands - DOM focus
      'odakla',
      'odaklan',
      'bulanıklaştır',
      'bulaniklastir',
      'odak_kaldır',
      'odak_kaldir',
      // Commands - Navigation
      'git',
      'yönlendir',
      'yonlendir',
      // Commands - Async
      'bekle',
      'çek',
      'cek',
      'yerleş',
      'yerles',
      'istikrar',
      'sabitlen',
      // Commands - Control flow
      'eğer',
      'eger',
      'yoksa',
      'değilse',
      'degilse',
      'tekrarla',
      'herbir',
      'her',
      'iken',
      'devam',
      'devam_et',
      'dur',
      'durdur',
      'fırlat',
      'firlat',
      'at',
      'çağır',
      'cagir',
      'dön',
      'don',
      'döndür',
      'dondur',
      // Commands - Advanced
      'js',
      'javascript',
      'asenkron',
      'eşzamansız',
      'eszamansiz',
      'söyle',
      'soyle',
      'varsayılan',
      'varsayilan',
      'başlat',
      'baslat',
      'başla',
      'basla',
      'davranış',
      'davranis',
      // Control flow helpers
      'sonra',
      'ardından',
      'ardindan', // then
      'son',
      'bitti', // end
      // Modifiers
      'içine',
      'icine',
      'önce',
      'once',
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
      '切换',
      '添加',
      '移除',
      '放置',
      '设置',
      '显示',
      '隐藏',
      '追加',
      '前置',
      '增加',
      '减少',
      '等待',
      '获取',
      '前往',
      '触发',
      '发送',
      '日志',
      '拿取',
      '制作',
      '复制',
      '聚焦',
      '失焦',
      '过渡',
      '稳定',
      '抛出',
      '调用',
      '返回',
      '脚本',
      '异步',
      '告诉',
      '默认',
      '初始化',
      '行为',
      '里',
      '之前',
      '之后',
    ],
    tokenizerKeywords: [
      // Commands - Class/Attribute operations
      '切换',
      '添加',
      '加',
      '移除',
      '删除',
      '去掉',
      // Commands - Content operations
      '放置',
      '放',
      '放入',
      '追加',
      '附加',
      '前置',
      '预置',
      '拿取',
      '取',
      '制作',
      '创建',
      '复制',
      '克隆',
      '交换',
      '互换', // swap
      '变形',
      '变换', // morph
      // Commands - Variable operations
      '设置',
      '设定',
      '获取',
      '取得',
      '获得',
      '增加',
      '减少',
      '日志',
      '记录',
      '打印',
      // Commands - Visibility
      '显示',
      '展示',
      '隐藏',
      '过渡',
      '动画',
      // Commands - Events
      '当',
      '在',
      '触发',
      '激发',
      '发送',
      // Commands - DOM focus
      '聚焦',
      '对焦',
      '失焦',
      '模糊',
      // Commands - Navigation
      '前往',
      '跳转',
      '导航',
      // Commands - Async
      '等待',
      '抓取',
      '获取数据',
      '稳定',
      '安定',
      // Commands - Control flow
      '如果',
      '若',
      '否则',
      '不然',
      '重复',
      '循环',
      '遍历',
      '每个',
      '为每',
      '当',
      '继续',
      '停止',
      '中止',
      '抛出',
      '抛',
      '调用',
      '呼叫',
      '返回',
      '回',
      // Commands - Advanced
      'js',
      'javascript',
      '脚本',
      '异步',
      '告诉',
      '通知',
      '默认',
      '缺省',
      '初始化',
      '初始',
      '行为',
      '动作',
      // Control flow helpers
      '然后',
      '接着', // then
      '结束',
      '完成', // end
      // Modifiers
      '到里面',
      '进入',
      '里',
      '之前',
      '前',
      '之后',
      '后',
    ],
    missingFromTokenizer: [], // Now synced
    potentialConflicts: [],
  },
  {
    code: 'pt',
    name: 'Portuguese',
    wordOrder: 'SVO',
    direction: 'ltr',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: false,
      eventHandlerPatterns: false,
      tests: false,
      morphologyTests: false,
    },
    morphology: {
      needed: false,
      reason: 'Portuguese has verb conjugation but keywords match infinitive forms',
      inflectionTypes: [],
      integratedWithTokenizer: false,
      confidenceThreshold: 1.0,
    },
    profileKeywords: [
      'alternar',
      'adicionar',
      'remover',
      'colocar',
      'definir',
      'mostrar',
      'ocultar',
      'anexar',
      'preceder',
      'incrementar',
      'decrementar',
      'esperar',
      'buscar',
      'ir',
      'disparar',
      'enviar',
      'registrar',
      'fazer',
      'clonar',
      'pegar',
      'obter',
      'focar',
      'desfocar',
    ],
    tokenizerKeywords: [
      // Commands - Class/Attribute operations
      'alternar',
      'trocar',
      'adicionar',
      'acrescentar',
      'remover',
      'eliminar',
      'apagar',
      // Commands - Content operations
      'colocar',
      'pôr',
      'por',
      'anexar',
      'preceder',
      'pegar',
      'fazer',
      'criar',
      'clonar',
      'copiar',
      'transformar',
      'mutar', // morph
      // Commands - Variable operations
      'definir',
      'configurar',
      'obter',
      'incrementar',
      'aumentar',
      'decrementar',
      'diminuir',
      'registrar',
      'imprimir',
      // Commands - Visibility
      'mostrar',
      'exibir',
      'ocultar',
      'esconder',
      'transição',
      'transicao',
      'animar',
      // Commands - Events
      'em',
      'quando',
      'ao',
      'disparar',
      'ativar',
      'enviar',
      // Commands - DOM focus
      'focar',
      'foco',
      'desfocar',
      // Commands - Navigation
      'ir',
      'navegar',
      // Commands - Async
      'esperar',
      'aguardar',
      'buscar',
      'estabilizar',
      // Commands - Control flow
      'se',
      'senão',
      'senao',
      'repetir',
      'para',
      'enquanto',
      'continuar',
      'parar',
      'lançar',
      'lancar',
      'chamar',
      'retornar',
      'devolver',
      // Commands - Advanced
      'js',
      'assíncrono',
      'assincrono',
      'dizer',
      'padrão',
      'padrao',
      'iniciar',
      'inicializar',
      'comportamento',
      // Control flow helpers
      'então',
      'entao',
      'depois', // then
      'fim',
      'terminar', // end
      // Modifiers
      'dentro de',
      'antes',
    ],
    missingFromTokenizer: [],
    potentialConflicts: [],
  },
  {
    code: 'fr',
    name: 'French',
    wordOrder: 'SVO',
    direction: 'ltr',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: false,
      eventHandlerPatterns: false,
      tests: false,
      morphologyTests: false,
    },
    morphology: {
      needed: false,
      reason: 'French has verb conjugation but keywords match infinitive forms',
      inflectionTypes: [],
      integratedWithTokenizer: false,
      confidenceThreshold: 1.0,
    },
    profileKeywords: [
      'basculer',
      'ajouter',
      'supprimer',
      'mettre',
      'définir',
      'montrer',
      'cacher',
      'annexer',
      'préfixer',
      'incrémenter',
      'décrémenter',
      'attendre',
      'chercher',
      'aller',
      'déclencher',
      'envoyer',
      'enregistrer',
      'faire',
      'cloner',
      'prendre',
      'obtenir',
      'focaliser',
      'défocaliser',
    ],
    tokenizerKeywords: [
      // Commands - Class/Attribute operations
      'basculer',
      'permuter',
      'alterner',
      'ajouter',
      'supprimer',
      'enlever',
      'retirer',
      // Commands - Content operations
      'mettre',
      'placer',
      'annexer',
      'préfixer',
      'prefixer',
      'prendre',
      'faire',
      'créer',
      'creer',
      'cloner',
      'copier',
      'transformer',
      'transmuter', // morph
      // Commands - Variable operations
      'définir',
      'definir',
      'établir',
      'etablir',
      'obtenir',
      'incrémenter',
      'incrementer',
      'décrémenter',
      'decrementer',
      'enregistrer',
      'journaliser',
      'afficher',
      // Commands - Visibility
      'montrer',
      'cacher',
      'masquer',
      'transition',
      'animer',
      // Commands - Events
      'sur',
      'quand',
      'lors',
      'déclencher',
      'declencher',
      'envoyer',
      // Commands - DOM focus
      'focaliser',
      'concentrer',
      'défocaliser',
      'defocaliser',
      // Commands - Navigation
      'aller',
      'naviguer',
      // Commands - Async
      'attendre',
      'chercher',
      'récupérer',
      'recuperer',
      'stabiliser',
      // Commands - Control flow
      'si',
      'sinon',
      'répéter',
      'repeter',
      'pour',
      'tant que',
      'pendant',
      'continuer',
      'arrêter',
      'arreter',
      'stopper',
      'lancer',
      'appeler',
      'retourner',
      'renvoyer',
      // Commands - Advanced
      'js',
      'asynchrone',
      'dire',
      'défaut',
      'defaut',
      'initialiser',
      'comportement',
      // Control flow helpers
      'alors',
      'puis',
      'ensuite', // then
      'fin',
      'terminer',
      'finir', // end
      // Modifiers
      'dans',
      'avant',
      'après',
      'apres',
    ],
    missingFromTokenizer: [],
    potentialConflicts: [],
  },
  {
    code: 'de',
    name: 'German',
    wordOrder: 'SVO',
    direction: 'ltr',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: false,
      eventHandlerPatterns: false,
      tests: false,
      morphologyTests: false,
    },
    morphology: {
      needed: false,
      reason: 'German has verb conjugation but keywords match infinitive forms',
      inflectionTypes: [],
      integratedWithTokenizer: false,
      confidenceThreshold: 1.0,
    },
    profileKeywords: [
      'umschalten',
      'hinzufügen',
      'entfernen',
      'setzen',
      'festlegen',
      'zeigen',
      'verbergen',
      'anhängen',
      'voranstellen',
      'erhöhen',
      'verringern',
      'warten',
      'abrufen',
      'gehen',
      'auslösen',
      'senden',
      'protokollieren',
      'machen',
      'klonen',
      'nehmen',
      'holen',
      'fokussieren',
      'defokussieren',
    ],
    tokenizerKeywords: [
      // Commands - Class/Attribute operations
      'umschalten',
      'wechseln',
      'hinzufügen',
      'hinzufugen',
      'hinzufgen',
      'entfernen',
      'löschen',
      'loschen',
      // Commands - Content operations
      'setzen',
      'stellen',
      'platzieren',
      'anhängen',
      'anhangen',
      'voranstellen',
      'nehmen',
      'machen',
      'erstellen',
      'erzeugen',
      'klonen',
      'kopieren',
      'verwandeln',
      'transformieren', // morph
      // Commands - Variable operations
      'festlegen',
      'definieren',
      'holen',
      'bekommen',
      'erhöhen',
      'erhohen',
      'verringern',
      'vermindern',
      'protokollieren',
      'ausgeben',
      // Commands - Visibility
      'zeigen',
      'anzeigen',
      'verbergen',
      'verstecken',
      'übergang',
      'ubergang',
      'animieren',
      // Commands - Events
      'bei',
      'wenn',
      'auf',
      'auslösen',
      'auslosen',
      'senden',
      'schicken',
      // Commands - DOM focus
      'fokussieren',
      'defokussieren',
      'entfokussieren',
      // Commands - Navigation
      'gehen',
      'navigieren',
      // Commands - Async
      'warten',
      'abrufen',
      'laden',
      'stabilisieren',
      // Commands - Control flow
      'falls',
      'sonst',
      'ansonsten',
      'wiederholen',
      'für',
      'solange',
      'während',
      'fortfahren',
      'weiter',
      'anhalten',
      'stoppen',
      'werfen',
      'aufrufen',
      'zurückgeben',
      'zuruckgeben',
      // Commands - Advanced
      'js',
      'javascript',
      'asynchron',
      'sagen',
      'standard',
      'initialisieren',
      'verhalten',
      // Control flow helpers
      'dann',
      'danach',
      'anschließend',
      'anschliessend', // then
      'ende',
      'beenden',
      'fertig', // end
      // Modifiers
      'hinein',
      'vor',
      'nach',
    ],
    missingFromTokenizer: [],
    potentialConflicts: [],
  },
  {
    code: 'id',
    name: 'Indonesian',
    wordOrder: 'SVO',
    direction: 'ltr',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: false,
      eventHandlerPatterns: false,
      tests: false,
      morphologyTests: false,
    },
    morphology: {
      needed: false,
      reason: 'Indonesian is agglutinative but prefixes/suffixes are consistent',
      inflectionTypes: [],
      integratedWithTokenizer: false,
      confidenceThreshold: 1.0,
    },
    profileKeywords: [
      'alihkan',
      'tambah',
      'hapus',
      'taruh',
      'atur',
      'tampilkan',
      'sembunyikan',
      'sisipkan',
      'awali',
      'tingkatkan',
      'turunkan',
      'tunggu',
      'ambil',
      'pergi',
      'picu',
      'kirim',
      'catat',
      'buat',
      'klon',
      'ambil',
      'dapatkan',
      'fokus',
      'blur',
    ],
    tokenizerKeywords: [
      // Commands - Class/Attribute operations
      'alihkan',
      'ganti',
      'tukar',
      'tambah',
      'tambahkan',
      'hapus',
      'buang',
      'hilangkan',
      // Commands - Content operations
      'taruh',
      'letakkan',
      'masukkan',
      'sisipkan',
      'awali',
      'ambil',
      'buat',
      'bikin',
      'ciptakan',
      'klon',
      'salin',
      'tiru',
      'ubah',
      'transformasi', // morph
      // Commands - Variable operations
      'atur',
      'tetapkan',
      'dapatkan',
      'peroleh',
      'tingkatkan',
      'naikkan',
      'turunkan',
      'kurangi',
      'catat',
      'rekam',
      'cetak',
      // Commands - Visibility
      'tampilkan',
      'perlihatkan',
      'sembunyikan',
      'tutup',
      'transisi',
      'animasikan',
      // Commands - Events
      'pada',
      'saat',
      'ketika',
      'picu',
      'jalankan',
      'kirim',
      'kirimkan',
      // Commands - DOM focus
      'fokus',
      'fokuskan',
      'hilangkan fokus',
      'blur',
      // Commands - Navigation
      'pergi',
      'pindah',
      'navigasi',
      // Commands - Async
      'tunggu',
      'muat',
      'stabilkan',
      // Commands - Control flow
      'jika',
      'kalau',
      'bila',
      'selainnya',
      'jika tidak',
      'ulangi',
      'untuk',
      'selama',
      'lanjutkan',
      'terus',
      'hentikan',
      'berhenti',
      'lempar',
      'panggil',
      'kembalikan',
      'kembali',
      // Commands - Advanced
      'js',
      'javascript',
      'asinkron',
      'katakan',
      'beritahu',
      'bawaan',
      'inisialisasi',
      'mulai',
      'perilaku',
      // Control flow helpers
      'maka',
      'lalu',
      'kemudian', // then
      'akhir',
      'selesai',
      'tamat', // end
      // Modifiers
      'ke dalam',
      'sebelum',
      'sesudah',
      'setelah',
    ],
    missingFromTokenizer: [],
    potentialConflicts: [],
  },
  {
    code: 'qu',
    name: 'Quechua',
    wordOrder: 'SOV',
    direction: 'ltr',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: false,
      eventHandlerPatterns: false,
      tests: false,
      morphologyTests: false,
    },
    morphology: {
      needed: true,
      reason: 'Quechua is polysynthetic with complex suffixation',
      inflectionTypes: ['agglutinative suffixes', 'evidential markers'],
      integratedWithTokenizer: false,
      confidenceThreshold: 0.8,
    },
    profileKeywords: [
      "t'ikray",
      'yapay',
      'qichuy',
      'churay',
      'rikuchiy',
      'pakay',
      'qatichiy',
      'ñawpachiy',
      'yapachiy',
      'pisiyachiy',
      'suyay',
      'apamuy',
      'riy',
      'qallarichiy',
      'kachay',
      'qillqakuy',
      'ruray',
      'kikinchay',
      'hapiy',
      'taripay',
      'qhawachiy',
    ],
    tokenizerKeywords: [
      // Commands - Class/Attribute operations
      "t'ikray",
      'tikray',
      'kutichiy',
      'yapay',
      'yapaykuy',
      'qichuy',
      'hurquy',
      'anchuchiy',
      // Commands - Content operations
      'churay',
      'tiyachiy',
      'qatichiy',
      'ñawpachiy',
      'nawpachiy',
      'hapiy',
      'ruray',
      'kamay',
      'kikinchay',
      'qillqay',
      "t'inkuy",
      'tinkuy', // swap
      // Commands - Variable operations
      'kamaykuy',
      'taripay',
      'yapachiy',
      'pisiyachiy',
      'qillqakuy',
      'willakuy',
      // Commands - Visibility
      'rikuchiy',
      'qawachiy',
      'pakay',
      'pakakuy',
      'kuyuchiy',
      // Commands - Events
      'chaypim',
      'kaypi',
      'qallarichiy',
      'kachay',
      'apachiy',
      // Commands - DOM focus
      'qhawachiy',
      'mana qhawachiy',
      // Commands - Navigation
      'riy',
      'puriy',
      // Commands - Async
      'suyay',
      'apamuy',
      'taripakaramuy',
      'tiyakuy',
      // Commands - Control flow
      'sichus',
      'manachus',
      'hukniraq',
      'kutipay',
      'muyu',
      'sapankaq',
      'kaykamaqa',
      'qatipay',
      'sayay',
      'tukuy',
      'chanqay',
      'waqyay',
      'kutimuy',
      // Commands - Advanced
      'js',
      'mana waqtalla',
      'niy',
      'qallariy',
      'ruwana',
      // Control flow helpers
      'chayqa',
      'chaymanta',
      'chaymantataq',
      'hinaspa', // then
      'tukukuy',
      'puchukay', // end
      // Modifiers
      'ukuman',
      'ñawpaq',
      'nawpaq',
      'qhipa',
    ],
    missingFromTokenizer: [],
    potentialConflicts: [],
  },
  {
    code: 'sw',
    name: 'Swahili',
    wordOrder: 'SVO',
    direction: 'ltr',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: false,
      eventHandlerPatterns: false,
      tests: false,
      morphologyTests: false,
    },
    morphology: {
      needed: true,
      reason: 'Swahili is agglutinative with noun class prefixes and verb agreement',
      inflectionTypes: ['noun class prefixes', 'verb prefixes'],
      integratedWithTokenizer: false,
      confidenceThreshold: 0.8,
    },
    profileKeywords: [
      'badilisha',
      'ongeza',
      'ondoa',
      'weka',
      'onyesha',
      'ficha',
      'ambatanisha',
      'tanguliza',
      'ongeza',
      'punguza',
      'subiri',
      'leta',
      'nenda',
      'chochea',
      'tuma',
      'andika',
      'tengeneza',
      'nakili',
      'chukua',
      'pata',
      'lenga',
      'blur',
    ],
    tokenizerKeywords: [
      // Commands - Class/Attribute operations
      'badilisha',
      'geuza',
      'ongeza',
      'weka',
      'ondoa',
      'futa',
      'toa',
      // Commands - Content operations
      'tia',
      'ambatanisha',
      'tanguliza',
      'chukua',
      'tengeneza',
      'unda',
      'nakili',
      'rudufu',
      // Commands - Variable operations
      'seti',
      'pata',
      'pokea',
      'punguza',
      'andika',
      'rekodi',
      // Commands - Visibility
      'onyesha',
      'ficha',
      'mficho',
      'hamisha',
      'animisha',
      // Commands - Events
      'wakati',
      'kwenye',
      'unapo',
      'chochea',
      'anzisha',
      'tuma',
      'peleka',
      // Commands - DOM focus
      'lenga',
      'angazia',
      'ondoa lenga',
      'blur',
      // Commands - Navigation
      'nenda',
      'enda',
      'elekea',
      // Commands - Async
      'subiri',
      'ngoja',
      'leta',
      'pakia',
      'tulia',
      'imarika',
      // Commands - Control flow
      'kama',
      'ikiwa',
      'vinginevyo',
      'sivyo',
      'rudia',
      'kwa',
      'endelea',
      'simama',
      'acha',
      'tupa',
      'ita',
      'piga simu',
      'rudisha',
      'rejea',
      // Commands - Advanced
      'js',
      'javascript',
      'isiyo sawia',
      'sema',
      'ambia',
      'chaguo-msingi',
      'anza',
      'tabia',
      // Control flow helpers
      'basi',
      'kisha',
      'halafu',
      'baadaye', // then
      'mwisho',
      'maliza',
      'tamati', // end
      // Modifiers
      'ndani',
      'kabla',
      'baada',
    ],
    missingFromTokenizer: [],
    potentialConflicts: [],
  },
  {
    code: 'it',
    name: 'Italian',
    wordOrder: 'SVO',
    direction: 'ltr',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: true,
      eventHandlerPatterns: false,
      tests: true,
      morphologyTests: true,
    },
    morphology: {
      needed: true,
      reason: 'Italian has verb conjugations like Spanish',
      inflectionTypes: [
        '-are conjugations',
        '-ere conjugations',
        '-ire conjugations',
        'reflexive verbs',
      ],
      integratedWithTokenizer: true,
      confidenceThreshold: 0.7,
    },
    profileKeywords: [
      'commutare',
      'aggiungere',
      'rimuovere',
      'mettere',
      'impostare',
      'mostrare',
      'nascondere',
      'incrementare',
      'decrementare',
    ],
    tokenizerKeywords: [
      'commutare',
      'alternare',
      'toggle',
      'aggiungere',
      'rimuovere',
      'eliminare',
      'mettere',
      'impostare',
      'ottenere',
      'mostrare',
      'nascondere',
      'incrementare',
      'decrementare',
    ],
    missingFromTokenizer: [],
    potentialConflicts: [],
  },
  {
    code: 'vi',
    name: 'Vietnamese',
    wordOrder: 'SVO',
    direction: 'ltr',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: false,
      eventHandlerPatterns: false,
      tests: true,
      morphologyTests: false,
    },
    morphology: {
      needed: false,
      reason: 'Vietnamese is isolating with no verb conjugation',
      inflectionTypes: [],
      integratedWithTokenizer: false,
      confidenceThreshold: 1.0,
    },
    profileKeywords: ['chuyển đổi', 'thêm', 'xóa', 'đặt', 'gán', 'hiển thị', 'ẩn', 'tăng', 'giảm'],
    tokenizerKeywords: [
      'chuyển đổi',
      'bật tắt',
      'thêm',
      'xóa',
      'gỡ bỏ',
      'đặt',
      'gán',
      'lấy giá trị',
      'hiển thị',
      'hiện',
      'ẩn',
      'tăng',
      'giảm',
    ],
    missingFromTokenizer: [],
    potentialConflicts: [],
  },
  {
    code: 'pl',
    name: 'Polish',
    wordOrder: 'SVO',
    direction: 'ltr',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: true,
      eventHandlerPatterns: false,
      tests: true,
      morphologyTests: false,
    },
    morphology: {
      needed: true,
      reason: 'Polish is fusional with verb conjugations; uses imperative form for commands',
      inflectionTypes: ['imperative form', 'present tense', 'past tense'],
      integratedWithTokenizer: false,
      confidenceThreshold: 0.7,
    },
    profileKeywords: [
      'przełącz',
      'dodaj',
      'usuń',
      'umieść',
      'ustaw',
      'pokaż',
      'ukryj',
      'zwiększ',
      'zmniejsz',
    ],
    tokenizerKeywords: [
      'przełącz',
      'przelacz',
      'dodaj',
      'usuń',
      'usun',
      'umieść',
      'umiesc',
      'ustaw',
      'pokaż',
      'pokaz',
      'ukryj',
      'zwiększ',
      'zwieksz',
      'zmniejsz',
    ],
    missingFromTokenizer: [],
    potentialConflicts: [],
  },
  {
    code: 'ru',
    name: 'Russian',
    wordOrder: 'SVO',
    direction: 'ltr',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: false,
      eventHandlerPatterns: false,
      tests: true,
      morphologyTests: false,
    },
    morphology: {
      needed: true,
      reason:
        'Russian is fusional with verb conjugations; uses infinitive or imperative form for commands',
      inflectionTypes: ['infinitive form', 'imperative form', 'present tense', 'past tense'],
      integratedWithTokenizer: false,
      confidenceThreshold: 0.7,
    },
    profileKeywords: [
      'переключить',
      'добавить',
      'удалить',
      'положить',
      'установить',
      'показать',
      'скрыть',
      'увеличить',
      'уменьшить',
    ],
    tokenizerKeywords: [
      'переключить',
      'переключи',
      'добавить',
      'добавь',
      'удалить',
      'удали',
      'положить',
      'положи',
      'установить',
      'установи',
      'показать',
      'покажи',
      'скрыть',
      'скрой',
      'увеличить',
      'увеличь',
      'уменьшить',
      'уменьши',
    ],
    missingFromTokenizer: [],
    potentialConflicts: [],
  },
  {
    code: 'uk',
    name: 'Ukrainian',
    wordOrder: 'SVO',
    direction: 'ltr',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: false,
      eventHandlerPatterns: false,
      tests: true,
      morphologyTests: false,
    },
    morphology: {
      needed: true,
      reason:
        'Ukrainian is fusional with verb conjugations; uses infinitive or imperative form for commands',
      inflectionTypes: ['infinitive form', 'imperative form', 'present tense', 'past tense'],
      integratedWithTokenizer: false,
      confidenceThreshold: 0.7,
    },
    profileKeywords: [
      'перемкнути',
      'додати',
      'видалити',
      'покласти',
      'встановити',
      'показати',
      'сховати',
      'збільшити',
      'зменшити',
    ],
    tokenizerKeywords: [
      'перемкнути',
      'перемкни',
      'додати',
      'додай',
      'видалити',
      'видали',
      'покласти',
      'поклади',
      'встановити',
      'встанови',
      'показати',
      'покажи',
      'сховати',
      'сховай',
      'збільшити',
      'збільш',
      'зменшити',
      'зменш',
    ],
    missingFromTokenizer: [],
    potentialConflicts: [],
  },
  {
    code: 'hi',
    name: 'Hindi',
    wordOrder: 'SOV',
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
      needed: true,
      reason: 'Hindi has verb conjugations but commands use imperative/infinitive forms',
      inflectionTypes: ['imperative form', 'infinitive form'],
      integratedWithTokenizer: false,
      confidenceThreshold: 0.7,
    },
    profileKeywords: [
      'टॉगल',
      'जोड़ें',
      'हटाएं',
      'रखें',
      'सेट',
      'दिखाएं',
      'छिपाएं',
      'बढ़ाएं',
      'घटाएं',
    ],
    tokenizerKeywords: [
      'टॉगल',
      'बदलें',
      'जोड़ें',
      'जोड़',
      'हटाएं',
      'हटा',
      'रखें',
      'रख',
      'सेट',
      'निर्धारित',
      'दिखाएं',
      'दिखा',
      'छिपाएं',
      'छिपा',
      'बढ़ाएं',
      'बढ़ा',
      'घटाएं',
      'घटा',
    ],
    missingFromTokenizer: [],
    potentialConflicts: [],
  },
  {
    code: 'bn',
    name: 'Bengali',
    wordOrder: 'SOV',
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
      needed: true,
      reason: 'Bengali has verb conjugations but commands use imperative forms',
      inflectionTypes: ['imperative form', 'infinitive form'],
      integratedWithTokenizer: false,
      confidenceThreshold: 0.7,
    },
    profileKeywords: ['টগল', 'যোগ', 'সরান', 'রাখুন', 'সেট', 'দেখান', 'লুকান', 'বৃদ্ধি', 'হ্রাস'],
    tokenizerKeywords: [
      'টগল',
      'পরিবর্তন',
      'যোগ',
      'সরান',
      'মুছুন',
      'রাখুন',
      'রাখ',
      'সেট',
      'নির্ধারণ',
      'দেখান',
      'দেখাও',
      'লুকান',
      'লুকাও',
      'বৃদ্ধি',
      'বাড়ান',
      'হ্রাস',
      'কমান',
    ],
    missingFromTokenizer: [],
    potentialConflicts: [],
  },
  {
    code: 'th',
    name: 'Thai',
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
      reason: 'Thai is isolating with no verb conjugation',
      inflectionTypes: [],
      integratedWithTokenizer: false,
      confidenceThreshold: 1.0,
    },
    profileKeywords: ['สลับ', 'เพิ่ม', 'ลบ', 'ใส่', 'ตั้ง', 'แสดง', 'ซ่อน', 'เพิ่มค่า', 'ลดค่า'],
    tokenizerKeywords: [
      'สลับ',
      'เปลี่ยน',
      'เพิ่ม',
      'ลบ',
      'ลบออก',
      'ใส่',
      'วาง',
      'ตั้ง',
      'กำหนด',
      'แสดง',
      'โชว์',
      'ซ่อน',
      'เพิ่มค่า',
      'ลดค่า',
    ],
    missingFromTokenizer: [],
    potentialConflicts: [],
  },
  {
    code: 'ms',
    name: 'Malay',
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
      reason: 'Malay is largely isolating with limited affixation',
      inflectionTypes: [],
      integratedWithTokenizer: false,
      confidenceThreshold: 1.0,
    },
    profileKeywords: [
      'togol',
      'tambah',
      'buang',
      'letak',
      'tetap',
      'tunjuk',
      'sembunyi',
      'tambah nilai',
      'kurang nilai',
    ],
    tokenizerKeywords: [
      'togol',
      'tukar',
      'tambah',
      'buang',
      'alih',
      'letak',
      'tetap',
      'tunjuk',
      'sembunyi',
      'tambah nilai',
      'kurang nilai',
    ],
    missingFromTokenizer: [],
    potentialConflicts: [],
  },
  {
    code: 'tl',
    name: 'Tagalog',
    wordOrder: 'VSO',
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
      needed: true,
      reason: 'Tagalog has verb focus/voice system and affix-based morphology',
      inflectionTypes: ['focus marking', 'aspect affixes'],
      integratedWithTokenizer: false,
      confidenceThreshold: 0.8,
    },
    profileKeywords: [
      'palitan',
      'idagdag',
      'alisin',
      'ilagay',
      'itakda',
      'ipakita',
      'itago',
      'dagdagan',
      'bawasan',
    ],
    tokenizerKeywords: [
      'palitan',
      'itoggle',
      'idagdag',
      'magdagdag',
      'alisin',
      'tanggalin',
      'ilagay',
      'maglagay',
      'itakda',
      'magtakda',
      'ipakita',
      'magpakita',
      'itago',
      'magtago',
      'dagdagan',
      'taasan',
      'bawasan',
      'ibaba',
    ],
    missingFromTokenizer: [],
    potentialConflicts: [],
  },
  {
    code: 'he',
    name: 'Hebrew',
    wordOrder: 'SVO',
    direction: 'rtl',
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
      needed: true,
      reason: 'Hebrew has verb conjugation (binyanim) but commands use imperative/infinitive forms',
      inflectionTypes: ['imperative form', 'infinitive form', 'binyanim patterns'],
      integratedWithTokenizer: false,
      confidenceThreshold: 0.7,
    },
    profileKeywords: ['החלף', 'הוסף', 'הסר', 'שים', 'קבע', 'הראה', 'הסתר', 'הגדל', 'הקטן'],
    tokenizerKeywords: [
      'החלף',
      'שנה',
      'הוסף',
      'הסר',
      'מחק',
      'שים',
      'הכנס',
      'קבע',
      'הגדר',
      'קבל',
      'הראה',
      'הצג',
      'הסתר',
      'הגדל',
      'הקטן',
    ],
    missingFromTokenizer: [],
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
