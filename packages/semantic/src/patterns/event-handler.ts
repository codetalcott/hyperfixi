/**
 * Event Handler Patterns (Consolidated)
 *
 * Hand-crafted event handler patterns across languages,
 * plus shared event name translations and normalization.
 *
 * Phase 3.2: Consolidated from 26 files into single file.
 */

import type { LanguagePattern } from '../types';

// =============================================================================
// Shared Event Name Translations
// =============================================================================

/**
 * Common event names translated across languages.
 * Used by tokenizers to normalize event names to English.
 */
export const eventNameTranslations: Record<string, Record<string, string>> = {
  // Korean event names → English
  ko: {
    클릭: 'click',
    입력: 'input',
    변경: 'change',
    제출: 'submit',
    키다운: 'keydown',
    키업: 'keyup',
    마우스오버: 'mouseover',
    마우스아웃: 'mouseout',
    마우스다운: 'mousedown',
    마우스업: 'mouseup',
    포커스: 'focus',
    블러: 'blur',
    로드: 'load',
    리사이즈: 'resize',
    스크롤: 'scroll',
  },
  // Japanese event names → English
  ja: {
    クリック: 'click',
    入力: 'input',
    変更: 'change',
    送信: 'submit',
    キーダウン: 'keydown',
    キーアップ: 'keyup',
    キープレス: 'keypress',
    マウスオーバー: 'mouseover',
    マウスアウト: 'mouseout',
    マウス押下: 'mousedown',
    マウス解放: 'mouseup',
    フォーカス: 'focus',
    ブラー: 'blur',
    ロード: 'load',
    読み込み: 'load',
    サイズ変更: 'resize',
    スクロール: 'scroll',
  },
  // Arabic event names → English
  ar: {
    النقر: 'click',
    نقر: 'click',
    الإدخال: 'input',
    إدخال: 'input',
    التغيير: 'change',
    تغيير: 'change',
    الإرسال: 'submit',
    إرسال: 'submit',
    'ضغط المفتاح': 'keydown',
    'رفع المفتاح': 'keyup',
    'تمرير الماوس': 'mouseover',
    التركيز: 'focus',
    تحميل: 'load',
    تمرير: 'scroll',
  },
  // Spanish event names → English
  es: {
    clic: 'click',
    click: 'click',
    entrada: 'input',
    cambio: 'change',
    envío: 'submit',
    enviar: 'submit',
    'tecla abajo': 'keydown',
    'tecla arriba': 'keyup',
    'ratón encima': 'mouseover',
    'ratón fuera': 'mouseout',
    enfoque: 'focus',
    desenfoque: 'blur',
    carga: 'load',
    desplazamiento: 'scroll',
  },
  // Turkish event names → English
  tr: {
    tıklama: 'click',
    tıkla: 'click',
    tık: 'click',
    giriş: 'input',
    girdi: 'input',
    değişiklik: 'change',
    değişim: 'change',
    gönderme: 'submit',
    gönder: 'submit',
    tuşbasma: 'keydown',
    tuşbırakma: 'keyup',
    fare_bas: 'mousedown',
    fare_bırak: 'mouseup',
    fareiçinde: 'mouseover',
    faredışında: 'mouseout',
    odaklanma: 'focus',
    odak: 'focus',
    bulanıklık: 'blur',
    yükleme: 'load',
    yükle: 'load',
    boyut_değiştir: 'resize',
    kaydırma: 'scroll',
  },
  // Portuguese event names → English
  pt: {
    clique: 'click',
    clicar: 'click',
    click: 'click',
    entrada: 'input',
    inserir: 'input',
    mudança: 'change',
    mudanca: 'change',
    alterar: 'change',
    envio: 'submit',
    enviar: 'submit',
    'tecla baixo': 'keydown',
    'tecla cima': 'keyup',
    'pressionar tecla': 'keydown',
    'soltar tecla': 'keyup',
    'mouse sobre': 'mouseover',
    'mouse fora': 'mouseout',
    foco: 'focus',
    focar: 'focus',
    desfoque: 'blur',
    desfocar: 'blur',
    carregar: 'load',
    carregamento: 'load',
    rolagem: 'scroll',
    rolar: 'scroll',
  },
  // Chinese event names → English
  zh: {
    点击: 'click',
    单击: 'click',
    双击: 'dblclick',
    输入: 'input',
    改变: 'change',
    变化: 'change',
    变更: 'change',
    提交: 'submit',
    发送: 'submit',
    按键: 'keydown',
    键入: 'keydown',
    松键: 'keyup',
    鼠标进入: 'mouseover',
    鼠标移入: 'mouseover',
    鼠标离开: 'mouseout',
    鼠标移出: 'mouseout',
    焦点: 'focus',
    聚焦: 'focus',
    失焦: 'blur',
    模糊: 'blur',
    加载: 'load',
    载入: 'load',
    滚动: 'scroll',
  },
  // French event names → English
  fr: {
    clic: 'click',
    cliquer: 'click',
    click: 'click',
    saisie: 'input',
    entrée: 'input',
    changement: 'change',
    changer: 'change',
    soumettre: 'submit',
    soumission: 'submit',
    envoi: 'submit',
    'touche bas': 'keydown',
    'touche haut': 'keyup',
    'souris dessus': 'mouseover',
    'souris dehors': 'mouseout',
    focus: 'focus',
    focaliser: 'focus',
    défocus: 'blur',
    défocaliser: 'blur',
    chargement: 'load',
    charger: 'load',
    défilement: 'scroll',
    défiler: 'scroll',
  },
  // German event names → English
  de: {
    klick: 'click',
    klicken: 'click',
    click: 'click',
    eingabe: 'input',
    eingeben: 'input',
    änderung: 'change',
    ändern: 'change',
    absenden: 'submit',
    einreichen: 'submit',
    'taste runter': 'keydown',
    'taste hoch': 'keyup',
    'maus über': 'mouseover',
    'maus raus': 'mouseout',
    fokus: 'focus',
    fokussieren: 'focus',
    defokussieren: 'blur',
    unschärfe: 'blur',
    laden: 'load',
    ladung: 'load',
    scrollen: 'scroll',
    blättern: 'scroll',
  },
  // Indonesian event names → English
  id: {
    klik: 'click',
    click: 'click',
    masukan: 'input',
    input: 'input',
    ubah: 'change',
    perubahan: 'change',
    kirim: 'submit',
    'tekan tombol': 'keydown',
    'lepas tombol': 'keyup',
    'mouse masuk': 'mouseover',
    'mouse keluar': 'mouseout',
    fokus: 'focus',
    blur: 'blur',
    muat: 'load',
    memuat: 'load',
    gulir: 'scroll',
    menggulir: 'scroll',
  },
  // Bengali event names → English
  bn: {
    ক্লিক: 'click',
    ইনপুট: 'input',
    জমা: 'submit',
    লোড: 'load',
    স্ক্রোল: 'scroll',
    রিসাইজ: 'resize',
    ঝাপসা: 'blur',
    ফোকাস: 'focus',
    পরিবর্তন: 'change',
  },
  // Quechua event names → English (loanwords with native adaptations)
  qu: {
    click: 'click',
    "ñit'iy": 'click',
    ñitiy: 'click',
    yaykuchiy: 'input',
    yaykuy: 'input',
    tikray: 'change',
    "t'ikray": 'change',
    apachiy: 'submit',
    kachay: 'submit',
    'llave uray': 'keydown',
    'llave hawa': 'keyup',
    "q'away": 'focus',
    qhaway: 'focus',
    paqariy: 'blur',
    "mana q'away": 'blur',
    cargay: 'load',
    apakuy: 'load',
    apamuy: 'load',
    kunray: 'scroll',
    muyuy: 'scroll',
    hatun_kay: 'resize',
  },
  // Swahili event names → English
  sw: {
    bofya: 'click',
    click: 'click',
    kubofya: 'click',
    ingiza: 'input',
    kubadilisha: 'change',
    mabadiliko: 'change',
    tuma: 'submit',
    kutuma: 'submit',
    'bonyeza chini': 'keydown',
    'bonyeza juu': 'keyup',
    'panya juu': 'mouseover',
    'panya nje': 'mouseout',
    lenga: 'focus',
    kulenga: 'focus',
    blur: 'blur',
    pakia: 'load',
    kupakia: 'load',
    sogeza: 'scroll',
    kusogeza: 'scroll',
  },
};

/**
 * Normalize an event name to English.
 */
export function normalizeEventName(event: string, language: string): string {
  const translations = eventNameTranslations[language];
  if (translations && translations[event]) {
    return translations[event];
  }
  return event.toLowerCase();
}

// =============================================================================
// Per-Language Event Handler Patterns
// =============================================================================

function getEventHandlerPatternsBn(): LanguagePattern[] {
  return [
    // SOV pattern: ক্লিক তে .active কে টগল করুন
    {
      id: 'event-handler-bn-sov',
      language: 'bn',
      command: 'on',
      priority: 100,
      template: {
        format: '{event} তে {action}',
        tokens: [
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'তে', alternatives: ['এ'] },
          { type: 'role', role: 'action' },
        ],
      },
      extraction: {
        event: { position: 0 },
        action: { position: 2 },
      },
    },
    // With source: #button থেকে ক্লিক তে .active কে টগল করুন
    {
      id: 'event-handler-bn-with-source',
      language: 'bn',
      command: 'on',
      priority: 95,
      template: {
        format: '{source} থেকে {event} তে {action}',
        tokens: [
          { type: 'role', role: 'source' },
          { type: 'literal', value: 'থেকে' },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'তে', alternatives: ['এ'] },
          { type: 'role', role: 'action' },
        ],
      },
      extraction: {
        source: { position: 0 },
        event: { marker: 'তে', position: 2 },
        action: { position: 4 },
      },
    },
    // যখন pattern: যখন ক্লিক .active কে টগল করুন
    {
      id: 'event-handler-bn-when',
      language: 'bn',
      command: 'on',
      priority: 90,
      template: {
        format: 'যখন {event} {action}',
        tokens: [
          { type: 'literal', value: 'যখন' },
          { type: 'role', role: 'event' },
          { type: 'role', role: 'action' },
        ],
      },
      extraction: {
        event: { position: 1 },
        action: { position: 2 },
      },
    },
  ];
}

function getEventHandlerPatternsDe(): LanguagePattern[] {
  return [
    {
      id: 'event-de-wenn-source',
      language: 'de',
      command: 'on',
      priority: 115,
      template: {
        format: 'wenn {event} von {source} {body}',
        tokens: [
          { type: 'literal', value: 'wenn', alternatives: ['falls', 'sobald'] },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'von', alternatives: ['aus'] },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { marker: 'von', markerAlternatives: ['aus'] },
      },
    },
    {
      id: 'event-de-wenn',
      language: 'de',
      command: 'on',
      priority: 105,
      template: {
        format: 'wenn {event} {body}',
        tokens: [
          { type: 'literal', value: 'wenn', alternatives: ['falls', 'sobald'] },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    {
      id: 'event-de-bei-source',
      language: 'de',
      command: 'on',
      priority: 110,
      template: {
        format: 'bei {event} von {source} {body}',
        tokens: [
          { type: 'literal', value: 'bei', alternatives: ['beim'] },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'von', alternatives: ['aus'] },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { marker: 'von', markerAlternatives: ['aus'] },
      },
    },
    {
      id: 'event-de-bei',
      language: 'de',
      command: 'on',
      priority: 100,
      template: {
        format: 'bei {event} {body}',
        tokens: [
          { type: 'literal', value: 'bei', alternatives: ['beim'] },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    {
      id: 'event-de-auf',
      language: 'de',
      command: 'on',
      priority: 95,
      template: {
        format: 'auf {event} {body}',
        tokens: [
          { type: 'literal', value: 'auf' },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    {
      id: 'event-de-im-falle',
      language: 'de',
      command: 'on',
      priority: 90,
      template: {
        format: 'im Falle von {event} {body}',
        tokens: [
          { type: 'literal', value: 'im Falle von', alternatives: ['im Fall von'] },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
  ];
}

function getEventHandlerPatternsEn(): LanguagePattern[] {
  return [
    {
      id: 'event-en-when-source',
      language: 'en',
      command: 'on',
      priority: 115,
      template: {
        format: 'when {event} from {source} {body}',
        tokens: [
          { type: 'literal', value: 'when' },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'from' },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { marker: 'from' },
      },
    },
    {
      id: 'event-en-when',
      language: 'en',
      command: 'on',
      priority: 105,
      template: {
        format: 'when {event} {body}',
        tokens: [
          { type: 'literal', value: 'when' },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    {
      id: 'event-en-source',
      language: 'en',
      command: 'on',
      priority: 110,
      template: {
        format: 'on {event} from {source} {body}',
        tokens: [
          { type: 'literal', value: 'on' },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'from' },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { marker: 'from' },
      },
    },
    {
      id: 'event-en-standard',
      language: 'en',
      command: 'on',
      priority: 100,
      template: {
        format: 'on {event} {body}',
        tokens: [
          { type: 'literal', value: 'on' },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    {
      id: 'event-en-upon',
      language: 'en',
      command: 'on',
      priority: 98,
      template: {
        format: 'upon {event} {body}',
        tokens: [
          { type: 'literal', value: 'upon' },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    {
      id: 'event-en-if',
      language: 'en',
      command: 'on',
      priority: 95,
      template: {
        format: 'if {event} {body}',
        tokens: [
          { type: 'literal', value: 'if' },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
  ];
}

function getEventHandlerPatternsEs(): LanguagePattern[] {
  return [
    {
      id: 'event-es-native-al-source',
      language: 'es',
      command: 'on',
      priority: 115,
      template: {
        format: 'al {event} en {source} {body}',
        tokens: [
          { type: 'literal', value: 'al' },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'en', alternatives: ['de'] },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { marker: 'en', markerAlternatives: ['de'] },
      },
    },
    {
      id: 'event-es-cuando-source',
      language: 'es',
      command: 'on',
      priority: 112,
      template: {
        format: 'cuando {event} en {source} {body}',
        tokens: [
          { type: 'literal', value: 'cuando' },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'en', alternatives: ['de'] },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { marker: 'en', markerAlternatives: ['de'] },
      },
    },
    {
      id: 'event-es-native-al',
      language: 'es',
      command: 'on',
      priority: 108,
      template: {
        format: 'al {event} {body}',
        tokens: [
          { type: 'literal', value: 'al' },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    {
      id: 'event-es-standard',
      language: 'es',
      command: 'on',
      priority: 100,
      template: {
        format: 'en {event} {body}',
        tokens: [
          { type: 'literal', value: 'en', alternatives: ['al', 'cuando'] },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    {
      id: 'event-es-source',
      language: 'es',
      command: 'on',
      priority: 110,
      template: {
        format: 'en {event} desde {source} {body}',
        tokens: [
          { type: 'literal', value: 'en', alternatives: ['al'] },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'desde', alternatives: ['de'] },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { marker: 'desde', markerAlternatives: ['de'] },
      },
    },
    {
      id: 'event-es-when',
      language: 'es',
      command: 'on',
      priority: 95,
      template: {
        format: 'cuando {event} {body}',
        tokens: [
          { type: 'literal', value: 'cuando' },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    {
      id: 'event-es-conditional-si',
      language: 'es',
      command: 'on',
      priority: 85,
      template: {
        format: 'si {event} {body}',
        tokens: [
          { type: 'literal', value: 'si' },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
  ];
}

function getEventHandlerPatternsFr(): LanguagePattern[] {
  return [
    {
      id: 'event-fr-quand-source',
      language: 'fr',
      command: 'on',
      priority: 115,
      template: {
        format: 'quand {event} de {source} {body}',
        tokens: [
          { type: 'literal', value: 'quand', alternatives: ['lorsque'] },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'de', alternatives: ['depuis'] },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { marker: 'de', markerAlternatives: ['depuis'] },
      },
    },
    {
      id: 'event-fr-quand',
      language: 'fr',
      command: 'on',
      priority: 105,
      template: {
        format: 'quand {event} {body}',
        tokens: [
          { type: 'literal', value: 'quand', alternatives: ['lorsque'] },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    {
      id: 'event-fr-sur-source',
      language: 'fr',
      command: 'on',
      priority: 110,
      template: {
        format: 'sur {event} de {source} {body}',
        tokens: [
          { type: 'literal', value: 'sur', alternatives: ['lors de'] },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'de', alternatives: ['depuis'] },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { marker: 'de', markerAlternatives: ['depuis'] },
      },
    },
    {
      id: 'event-fr-sur',
      language: 'fr',
      command: 'on',
      priority: 100,
      template: {
        format: 'sur {event} {body}',
        tokens: [
          { type: 'literal', value: 'sur', alternatives: ['lors de'] },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    {
      id: 'event-fr-si',
      language: 'fr',
      command: 'on',
      priority: 95,
      template: {
        format: 'si {event} {body}',
        tokens: [
          { type: 'literal', value: 'si' },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    {
      id: 'event-fr-a',
      language: 'fr',
      command: 'on',
      priority: 90,
      template: {
        format: 'à {event} {body}',
        tokens: [
          { type: 'literal', value: 'à', alternatives: ['au'] },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
  ];
}

function getEventHandlerPatternsHi(): LanguagePattern[] {
  return [
    // Standard event: क्लिक पर ...
    {
      id: 'event-hi-standard',
      language: 'hi',
      command: 'on',
      priority: 100,
      template: {
        format: '{event} पर',
        tokens: [
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'पर', alternatives: ['में', 'जब'] },
        ],
      },
      extraction: {
        event: { position: 0 },
      },
    },
    // With source: #button से क्लिक पर ...
    {
      id: 'event-hi-with-source',
      language: 'hi',
      command: 'on',
      priority: 95,
      template: {
        format: '{source} से {event} पर',
        tokens: [
          { type: 'role', role: 'source' },
          { type: 'literal', value: 'से' },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'पर', alternatives: ['में', 'जब'] },
        ],
      },
      extraction: {
        source: { position: 0 },
        event: { marker: 'से', position: 2 },
      },
    },
    // Bare event name: क्लिक
    {
      id: 'event-hi-bare',
      language: 'hi',
      command: 'on',
      priority: 80,
      template: {
        format: '{event}',
        tokens: [{ type: 'role', role: 'event' }],
      },
      extraction: {
        event: { position: 0 },
      },
    },
  ];
}

function getEventHandlerPatternsId(): LanguagePattern[] {
  return [
    {
      id: 'event-id-ketika-source',
      language: 'id',
      command: 'on',
      priority: 115,
      template: {
        format: 'ketika {event} dari {source} {body}',
        tokens: [
          { type: 'literal', value: 'ketika', alternatives: ['saat', 'waktu'] },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'dari' },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { marker: 'dari' },
      },
    },
    {
      id: 'event-id-ketika',
      language: 'id',
      command: 'on',
      priority: 105,
      template: {
        format: 'ketika {event} {body}',
        tokens: [
          { type: 'literal', value: 'ketika', alternatives: ['saat', 'waktu'] },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    {
      id: 'event-id-pada-source',
      language: 'id',
      command: 'on',
      priority: 110,
      template: {
        format: 'pada {event} dari {source} {body}',
        tokens: [
          { type: 'literal', value: 'pada' },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'dari' },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { marker: 'dari' },
      },
    },
    {
      id: 'event-id-pada',
      language: 'id',
      command: 'on',
      priority: 100,
      template: {
        format: 'pada {event} {body}',
        tokens: [
          { type: 'literal', value: 'pada' },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    {
      id: 'event-id-jika',
      language: 'id',
      command: 'on',
      priority: 95,
      template: {
        format: 'jika {event} {body}',
        tokens: [
          { type: 'literal', value: 'jika', alternatives: ['kalau', 'apabila'] },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    {
      id: 'event-id-bila',
      language: 'id',
      command: 'on',
      priority: 90,
      template: {
        format: 'bila {event} {body}',
        tokens: [
          { type: 'literal', value: 'bila' },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
  ];
}

function getEventHandlerPatternsIt(): LanguagePattern[] {
  return [
    {
      id: 'event-handler-it-full',
      language: 'it',
      command: 'on',
      priority: 100,
      template: {
        format: 'su {event} {action}',
        tokens: [
          { type: 'literal', value: 'su', alternatives: ['quando', 'al', 'on'] },
          { type: 'role', role: 'event' },
          { type: 'role', role: 'action' },
        ],
      },
      extraction: {
        event: { position: 1 },
        action: { position: 2 },
      },
    },
    {
      id: 'event-handler-it-from',
      language: 'it',
      command: 'on',
      priority: 95,
      template: {
        format: 'su {event} da {source} {action}',
        tokens: [
          { type: 'literal', value: 'su', alternatives: ['quando', 'al', 'on'] },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'da', alternatives: ['di'] },
          { type: 'role', role: 'source' },
          { type: 'role', role: 'action' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { marker: 'da', markerAlternatives: ['di'] },
        action: { position: -1 },
      },
    },
  ];
}

function getEventHandlerPatternsMs(): LanguagePattern[] {
  return [
    // Pattern: apabila {event} {body} - simple event handler
    {
      id: 'event-ms-apabila',
      language: 'ms',
      command: 'on',
      priority: 100,
      template: {
        format: 'apabila {event} {body}',
        tokens: [
          { type: 'literal', value: 'apabila', alternatives: ['bila', 'ketika'] },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    // Pattern: apabila {event} dari {source} - with source
    {
      id: 'event-ms-apabila-source',
      language: 'ms',
      command: 'on',
      priority: 110,
      template: {
        format: 'apabila {event} dari {source} {body}',
        tokens: [
          { type: 'literal', value: 'apabila', alternatives: ['bila', 'ketika'] },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'dari' },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { marker: 'dari' },
      },
    },
  ];
}

function getEventHandlerPatternsPl(): LanguagePattern[] {
  return [
    {
      id: 'event-handler-pl-full',
      language: 'pl',
      command: 'on',
      priority: 100,
      template: {
        format: 'gdy {event} na {source}',
        tokens: [
          { type: 'literal', value: 'gdy', alternatives: ['przy', 'na'] },
          { type: 'role', role: 'event' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'na', alternatives: ['w', 'przy', 'z'] },
              { type: 'role', role: 'source' },
            ],
          },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: {
          marker: 'na',
          markerAlternatives: ['w', 'przy', 'z'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'event-handler-pl-simple',
      language: 'pl',
      command: 'on',
      priority: 90,
      template: {
        format: 'gdy {event}',
        tokens: [
          { type: 'literal', value: 'gdy', alternatives: ['przy', 'na'] },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { default: { type: 'reference', value: 'me' } },
      },
    },
  ];
}

function getEventHandlerPatternsPt(): LanguagePattern[] {
  return [
    {
      id: 'event-pt-ao-source',
      language: 'pt',
      command: 'on',
      priority: 115,
      template: {
        format: 'ao {event} em {source} {body}',
        tokens: [
          { type: 'literal', value: 'ao', alternatives: ['à'] },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'em', alternatives: ['de', 'no', 'na'] },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { marker: 'em', markerAlternatives: ['de', 'no', 'na'] },
      },
    },
    {
      id: 'event-pt-quando-source',
      language: 'pt',
      command: 'on',
      priority: 110,
      template: {
        format: 'quando {event} de {source} {body}',
        tokens: [
          { type: 'literal', value: 'quando' },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'de', alternatives: ['em', 'no', 'na'] },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { marker: 'de', markerAlternatives: ['em', 'no', 'na'] },
      },
    },
    {
      id: 'event-pt-ao',
      language: 'pt',
      command: 'on',
      priority: 105,
      template: {
        format: 'ao {event} {body}',
        tokens: [
          { type: 'literal', value: 'ao', alternatives: ['à'] },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    {
      id: 'event-pt-quando',
      language: 'pt',
      command: 'on',
      priority: 100,
      template: {
        format: 'quando {event} {body}',
        tokens: [
          { type: 'literal', value: 'quando' },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    {
      id: 'event-pt-em',
      language: 'pt',
      command: 'on',
      priority: 95,
      template: {
        format: 'em {event} {body}',
        tokens: [
          { type: 'literal', value: 'em', alternatives: ['no', 'na'] },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    {
      id: 'event-pt-se',
      language: 'pt',
      command: 'on',
      priority: 90,
      template: {
        format: 'se {event} {body}',
        tokens: [
          { type: 'literal', value: 'se' },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
  ];
}

function getEventHandlerPatternsQu(): LanguagePattern[] {
  return [
    {
      id: 'event-qu-source',
      language: 'qu',
      command: 'on',
      priority: 110,
      template: {
        format: '{event} pi {source} manta {body}',
        tokens: [
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'pi' },
          { type: 'role', role: 'source' },
          { type: 'literal', value: 'manta' },
        ],
      },
      extraction: {
        event: { position: 0 },
        source: { marker: 'manta' },
      },
    },
    {
      id: 'event-qu-kaqtin',
      language: 'qu',
      command: 'on',
      priority: 105,
      template: {
        format: '{event} kaqtin {body}',
        tokens: [
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'kaqtin', alternatives: ['qtin', 'ptin'] },
        ],
      },
      extraction: {
        event: { position: 0 },
      },
    },
    {
      id: 'event-qu-standard',
      language: 'qu',
      command: 'on',
      priority: 100,
      template: {
        format: '{event} pi {body}',
        tokens: [
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'pi', alternatives: ['kaqpi', 'kaqpim'] },
        ],
      },
      extraction: {
        event: { position: 0 },
      },
    },
  ];
}

function getEventHandlerPatternsRu(): LanguagePattern[] {
  return [
    {
      id: 'event-handler-ru-full',
      language: 'ru',
      command: 'on',
      priority: 100,
      template: {
        format: 'при {event} на {source}',
        tokens: [
          { type: 'literal', value: 'при', alternatives: ['когда'] },
          { type: 'role', role: 'event' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'на', alternatives: ['в', 'от'] },
              { type: 'role', role: 'source' },
            ],
          },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: {
          marker: 'на',
          markerAlternatives: ['в', 'от'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'event-handler-ru-simple',
      language: 'ru',
      command: 'on',
      priority: 90,
      template: {
        format: 'при {event}',
        tokens: [
          { type: 'literal', value: 'при', alternatives: ['когда'] },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { default: { type: 'reference', value: 'me' } },
      },
    },
  ];
}

function getEventHandlerPatternsSw(): LanguagePattern[] {
  return [
    {
      id: 'event-sw-unapo-source',
      language: 'sw',
      command: 'on',
      priority: 115,
      template: {
        format: 'unapo {event} kutoka {source} {body}',
        tokens: [
          { type: 'literal', value: 'unapo', alternatives: ['wakati wa', 'wakati'] },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'kutoka' },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { marker: 'kutoka' },
      },
    },
    {
      id: 'event-sw-unapo',
      language: 'sw',
      command: 'on',
      priority: 105,
      template: {
        format: 'unapo {event} {body}',
        tokens: [
          { type: 'literal', value: 'unapo', alternatives: ['wakati wa', 'wakati'] },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    {
      id: 'event-sw-kwa-source',
      language: 'sw',
      command: 'on',
      priority: 110,
      template: {
        format: 'kwa {event} kutoka {source} {body}',
        tokens: [
          { type: 'literal', value: 'kwa' },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'kutoka' },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { marker: 'kutoka' },
      },
    },
    {
      id: 'event-sw-kwa',
      language: 'sw',
      command: 'on',
      priority: 100,
      template: {
        format: 'kwa {event} {body}',
        tokens: [
          { type: 'literal', value: 'kwa' },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    {
      id: 'event-sw-ikiwa',
      language: 'sw',
      command: 'on',
      priority: 95,
      template: {
        format: 'ikiwa {event} {body}',
        tokens: [
          { type: 'literal', value: 'ikiwa', alternatives: ['kama'] },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    {
      id: 'event-sw-baada-ya',
      language: 'sw',
      command: 'on',
      priority: 90,
      template: {
        format: 'baada ya {event} {body}',
        tokens: [
          { type: 'literal', value: 'baada ya' },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
  ];
}

function getEventHandlerPatternsTh(): LanguagePattern[] {
  return [
    // SVO pattern: เมื่อ คลิก สลับ .active
    {
      id: 'event-handler-th-svo',
      language: 'th',
      command: 'on',
      priority: 100,
      template: {
        format: 'เมื่อ {event} {action}',
        tokens: [
          { type: 'literal', value: 'เมื่อ', alternatives: ['ตอน'] },
          { type: 'role', role: 'event' },
          { type: 'role', role: 'action' },
        ],
      },
      extraction: {
        event: { position: 1 },
        action: { position: 2 },
      },
    },
    // With source: เมื่อ คลิก จาก #button สลับ .active
    {
      id: 'event-handler-th-with-source',
      language: 'th',
      command: 'on',
      priority: 95,
      template: {
        format: 'เมื่อ {event} จาก {source} {action}',
        tokens: [
          { type: 'literal', value: 'เมื่อ', alternatives: ['ตอน'] },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'จาก' },
          { type: 'role', role: 'source' },
          { type: 'role', role: 'action' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { marker: 'จาก', position: 3 },
        action: { position: 4 },
      },
    },
  ];
}

function getEventHandlerPatternsTl(): LanguagePattern[] {
  return [
    // VSO with source: kapag [event] mula_sa [source] [body]
    {
      id: 'event-tl-kapag-source',
      language: 'tl',
      command: 'on',
      priority: 115,
      template: {
        format: 'kapag {event} mula_sa {source} {body}',
        tokens: [
          { type: 'literal', value: 'kapag', alternatives: ['kung', 'sa'] },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'mula_sa', alternatives: ['galing_sa'] },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { marker: 'mula_sa' },
      },
    },
    // VSO simple: kapag [event] [body]
    {
      id: 'event-tl-kapag',
      language: 'tl',
      command: 'on',
      priority: 105,
      template: {
        format: 'kapag {event} {body}',
        tokens: [
          { type: 'literal', value: 'kapag', alternatives: ['kung', 'sa'] },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
  ];
}

function getEventHandlerPatternsUk(): LanguagePattern[] {
  return [
    {
      id: 'event-handler-uk-full',
      language: 'uk',
      command: 'on',
      priority: 100,
      template: {
        format: 'при {event} на {source}',
        tokens: [
          { type: 'literal', value: 'при', alternatives: ['коли'] },
          { type: 'role', role: 'event' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'на', alternatives: ['в', 'від'] },
              { type: 'role', role: 'source' },
            ],
          },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: {
          marker: 'на',
          markerAlternatives: ['в', 'від'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'event-handler-uk-simple',
      language: 'uk',
      command: 'on',
      priority: 90,
      template: {
        format: 'при {event}',
        tokens: [
          { type: 'literal', value: 'при', alternatives: ['коли'] },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { default: { type: 'reference', value: 'me' } },
      },
    },
  ];
}

function getEventHandlerPatternsVi(): LanguagePattern[] {
  return [
    {
      id: 'event-handler-vi-full',
      language: 'vi',
      command: 'on',
      priority: 100,
      template: {
        format: 'khi {event} trên {source}',
        tokens: [
          { type: 'literal', value: 'khi', alternatives: ['lúc', 'trên'] },
          { type: 'role', role: 'event' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'trên', alternatives: ['tại'] },
              { type: 'role', role: 'source' },
            ],
          },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: {
          marker: 'trên',
          markerAlternatives: ['tại'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'event-handler-vi-simple',
      language: 'vi',
      command: 'on',
      priority: 90,
      template: {
        format: 'khi {event}',
        tokens: [
          { type: 'literal', value: 'khi', alternatives: ['lúc', 'trên'] },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { default: { type: 'reference', value: 'me' } },
      },
    },
  ];
}

function getEventHandlerPatternsZh(): LanguagePattern[] {
  return [
    {
      id: 'event-zh-temporal-source',
      language: 'zh',
      command: 'on',
      priority: 115,
      template: {
        format: '{event} 的时候 从 {source} {body}',
        tokens: [
          { type: 'role', role: 'event' },
          { type: 'literal', value: '的时候', alternatives: ['时候', '时'] },
          { type: 'literal', value: '从', alternatives: ['在'] },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        event: { position: 0 },
        source: { marker: '从', markerAlternatives: ['在'] },
      },
    },
    {
      id: 'event-zh-source',
      language: 'zh',
      command: 'on',
      priority: 110,
      template: {
        format: '当 {event} 从 {source} {body}',
        tokens: [
          { type: 'literal', value: '当' },
          { type: 'role', role: 'event' },
          { type: 'literal', value: '从', alternatives: ['在'] },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { marker: '从', markerAlternatives: ['在'] },
      },
    },
    {
      id: 'event-zh-immediate',
      language: 'zh',
      command: 'on',
      priority: 108,
      template: {
        format: '一 {event} 就 {body}',
        tokens: [
          { type: 'literal', value: '一' },
          { type: 'role', role: 'event' },
          { type: 'literal', value: '就' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    {
      id: 'event-zh-temporal',
      language: 'zh',
      command: 'on',
      priority: 105,
      template: {
        format: '{event} 的时候 {body}',
        tokens: [
          { type: 'role', role: 'event' },
          { type: 'literal', value: '的时候', alternatives: ['时候', '时'] },
        ],
      },
      extraction: {
        event: { position: 0 },
      },
    },
    {
      id: 'event-zh-whenever',
      language: 'zh',
      command: 'on',
      priority: 103,
      template: {
        format: '每当 {event} {body}',
        tokens: [
          { type: 'literal', value: '每当', alternatives: ['每次'] },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    {
      id: 'event-zh-standard',
      language: 'zh',
      command: 'on',
      priority: 100,
      template: {
        format: '当 {event} {body}',
        tokens: [
          { type: 'literal', value: '当' },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
    {
      id: 'event-zh-completion',
      language: 'zh',
      command: 'on',
      priority: 95,
      template: {
        format: '{event} 了 {body}',
        tokens: [
          { type: 'role', role: 'event' },
          { type: 'literal', value: '了' },
        ],
      },
      extraction: {
        event: { position: 0 },
      },
    },
    {
      id: 'event-zh-conditional',
      language: 'zh',
      command: 'on',
      priority: 90,
      template: {
        format: '如果 {event} {body}',
        tokens: [
          { type: 'literal', value: '如果', alternatives: ['若', '假如'] },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
  ];
}

/**
 * Get event handler patterns for a specific language.
 */
export function getEventHandlerPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'bn':
      return getEventHandlerPatternsBn();
    case 'de':
      return getEventHandlerPatternsDe();
    case 'en':
      return getEventHandlerPatternsEn();
    case 'es':
      return getEventHandlerPatternsEs();
    case 'fr':
      return getEventHandlerPatternsFr();
    case 'hi':
      return getEventHandlerPatternsHi();
    case 'id':
      return getEventHandlerPatternsId();
    case 'it':
      return getEventHandlerPatternsIt();
    case 'ms':
      return getEventHandlerPatternsMs();
    case 'pl':
      return getEventHandlerPatternsPl();
    case 'pt':
      return getEventHandlerPatternsPt();
    case 'qu':
      return getEventHandlerPatternsQu();
    case 'ru':
      return getEventHandlerPatternsRu();
    case 'sw':
      return getEventHandlerPatternsSw();
    case 'th':
      return getEventHandlerPatternsTh();
    case 'tl':
      return getEventHandlerPatternsTl();
    case 'uk':
      return getEventHandlerPatternsUk();
    case 'vi':
      return getEventHandlerPatternsVi();
    case 'zh':
      return getEventHandlerPatternsZh();
    default:
      return [];
  }
}
