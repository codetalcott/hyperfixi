// Hand-curated fx-* attribute and modifier vocabulary for each dixi locale.
//
// This is the source of truth for dixi-specific vocabulary that has no analogue
// in @lokascript/semantic profiles (which model _hyperscript keywords, not
// fixi-family attribute names). The generator at scripts/gen-locales.mjs
// reads this file alongside the semantic profile to produce locales/{code}.js.
//
// Fields per locale:
//   - profile:      basename of the semantic profile file (without .ts)
//   - name:         display name for the language
//   - reviewed:     true if a native speaker has reviewed attrs/modifiers
//   - attrs:        localized HTML attribute name -> canonical English name
//   - modifiers:    localized modifier name -> canonical English name
//   - valuesExtra:  event-name translations not present in the semantic profile
//                   (some profiles only define focus/blur/init; this fills gaps)
//
// Reviewed locales: es, ja, ar (these match the prior hand-authored dixi locales).
// Other locales are best-effort translations that warrant native-speaker review.

/**
 * @typedef {{
 *   profile: string,
 *   name: string,
 *   reviewed: boolean,
 *   attrs: Record<string, string>,
 *   modifiers: Record<string, string>,
 *   valuesExtra?: Record<string, string>,
 * }} LocaleSpec
 */

/** @type {Record<string, LocaleSpec>} */
export const LOCALES = {
  en: {
    profile: 'english',
    name: 'English',
    reviewed: true,
    attrs: {},
    modifiers: {},
  },

  es: {
    profile: 'spanish',
    name: 'Spanish',
    reviewed: true,
    attrs: {
      'fx-acción': 'fx-action',
      'fx-método': 'fx-method',
      'fx-disparador': 'fx-trigger',
      'fx-objetivo': 'fx-target',
      'fx-intercambio': 'fx-swap',
      vivo: 'live',
      'mx-ignorar': 'mx-ignore',
    },
    modifiers: {
      prevenir: 'prevent',
      detener: 'stop',
      'una-vez': 'once',
    },
  },

  ja: {
    profile: 'japanese',
    name: 'Japanese',
    reviewed: true,
    attrs: {
      'fx-アクション': 'fx-action',
      'fx-メソッド': 'fx-method',
      'fx-トリガー': 'fx-trigger',
      'fx-ターゲット': 'fx-target',
      'fx-スワップ': 'fx-swap',
      ライブ: 'live',
      'mx-無視': 'mx-ignore',
    },
    modifiers: {
      防止: 'prevent',
      停止: 'stop',
      一度: 'once',
    },
    valuesExtra: {
      クリック: 'click',
      変更: 'change',
      送信: 'submit',
      入力: 'input',
    },
  },

  ar: {
    profile: 'arabic',
    name: 'Arabic',
    reviewed: true,
    attrs: {
      'fx-إجراء': 'fx-action',
      'fx-طريقة': 'fx-method',
      'fx-محفز': 'fx-trigger',
      'fx-هدف': 'fx-target',
      'fx-تبديل': 'fx-swap',
      حي: 'live',
      'mx-تجاهل': 'mx-ignore',
    },
    modifiers: {
      منع: 'prevent',
      إيقاف: 'stop',
      مرة: 'once',
    },
    valuesExtra: {
      نقر: 'click',
      تغيير: 'change',
      إرسال: 'submit',
      إدخال: 'input',
    },
  },

  fr: {
    profile: 'french',
    name: 'French',
    reviewed: false,
    attrs: {
      'fx-action': 'fx-action',
      'fx-méthode': 'fx-method',
      'fx-déclencheur': 'fx-trigger',
      'fx-cible': 'fx-target',
      'fx-échange': 'fx-swap',
      direct: 'live',
      'mx-ignorer': 'mx-ignore',
    },
    modifiers: {
      empêcher: 'prevent',
      arrêter: 'stop',
      'une-fois': 'once',
    },
  },

  de: {
    profile: 'german',
    name: 'German',
    reviewed: false,
    attrs: {
      'fx-aktion': 'fx-action',
      'fx-methode': 'fx-method',
      'fx-auslöser': 'fx-trigger',
      'fx-ziel': 'fx-target',
      'fx-tausch': 'fx-swap',
      'mx-ignorieren': 'mx-ignore',
    },
    modifiers: {
      verhindern: 'prevent',
      stoppen: 'stop',
      einmal: 'once',
    },
  },

  it: {
    profile: 'italian',
    name: 'Italian',
    reviewed: false,
    attrs: {
      'fx-azione': 'fx-action',
      'fx-metodo': 'fx-method',
      'fx-attivatore': 'fx-trigger',
      'fx-destinazione': 'fx-target',
      'fx-scambio': 'fx-swap',
      diretto: 'live',
      'mx-ignora': 'mx-ignore',
    },
    modifiers: {
      prevenire: 'prevent',
      fermare: 'stop',
      'una-volta': 'once',
    },
  },

  pt: {
    profile: 'portuguese',
    name: 'Portuguese',
    reviewed: false,
    attrs: {
      'fx-ação': 'fx-action',
      'fx-método': 'fx-method',
      'fx-gatilho': 'fx-trigger',
      'fx-alvo': 'fx-target',
      'fx-troca': 'fx-swap',
      'ao-vivo': 'live',
      'mx-ignorar': 'mx-ignore',
    },
    modifiers: {
      prevenir: 'prevent',
      parar: 'stop',
      'uma-vez': 'once',
    },
  },

  ru: {
    profile: 'russian',
    name: 'Russian',
    reviewed: false,
    attrs: {
      'fx-действие': 'fx-action',
      'fx-метод': 'fx-method',
      'fx-триггер': 'fx-trigger',
      'fx-цель': 'fx-target',
      'fx-обмен': 'fx-swap',
      'mx-игнорировать': 'mx-ignore',
    },
    modifiers: {
      предотвратить: 'prevent',
      остановить: 'stop',
      однажды: 'once',
    },
  },

  uk: {
    profile: 'ukrainian',
    name: 'Ukrainian',
    reviewed: false,
    attrs: {
      'fx-дія': 'fx-action',
      'fx-метод': 'fx-method',
      'fx-тригер': 'fx-trigger',
      'fx-ціль': 'fx-target',
      'fx-обмін': 'fx-swap',
      наживо: 'live',
      'mx-ігнорувати': 'mx-ignore',
    },
    modifiers: {
      запобігти: 'prevent',
      зупинити: 'stop',
      'один-раз': 'once',
    },
  },

  zh: {
    profile: 'chinese',
    name: 'Chinese',
    reviewed: false,
    attrs: {
      'fx-动作': 'fx-action',
      'fx-方法': 'fx-method',
      'fx-触发': 'fx-trigger',
      'fx-目标': 'fx-target',
      'fx-交换': 'fx-swap',
      实时: 'live',
      'mx-忽略': 'mx-ignore',
    },
    modifiers: {
      阻止: 'prevent',
      停止: 'stop',
      一次: 'once',
    },
  },

  ko: {
    profile: 'korean',
    name: 'Korean',
    reviewed: false,
    attrs: {
      'fx-액션': 'fx-action',
      'fx-메소드': 'fx-method',
      'fx-트리거': 'fx-trigger',
      'fx-타겟': 'fx-target',
      'fx-스왑': 'fx-swap',
      라이브: 'live',
      'mx-무시': 'mx-ignore',
    },
    modifiers: {
      방지: 'prevent',
      중지: 'stop',
      한번: 'once',
    },
  },

  tr: {
    profile: 'turkish',
    name: 'Turkish',
    reviewed: false,
    attrs: {
      'fx-eylem': 'fx-action',
      'fx-yöntem': 'fx-method',
      'fx-tetikleyici': 'fx-trigger',
      'fx-hedef': 'fx-target',
      'fx-değişim': 'fx-swap',
      canlı: 'live',
      'mx-yoksay': 'mx-ignore',
    },
    modifiers: {
      önle: 'prevent',
      durdur: 'stop',
      'bir-kez': 'once',
    },
  },

  pl: {
    profile: 'polish',
    name: 'Polish',
    reviewed: false,
    attrs: {
      'fx-akcja': 'fx-action',
      'fx-metoda': 'fx-method',
      'fx-wyzwalacz': 'fx-trigger',
      'fx-cel': 'fx-target',
      'fx-zamiana': 'fx-swap',
      'na-żywo': 'live',
      'mx-ignoruj': 'mx-ignore',
    },
    modifiers: {
      zapobiegaj: 'prevent',
      zatrzymaj: 'stop',
      raz: 'once',
    },
  },

  vi: {
    profile: 'vietnamese',
    name: 'Vietnamese',
    reviewed: false,
    attrs: {
      'fx-hành-động': 'fx-action',
      'fx-phương-thức': 'fx-method',
      'fx-kích-hoạt': 'fx-trigger',
      'fx-mục-tiêu': 'fx-target',
      'fx-hoán-đổi': 'fx-swap',
      'trực-tiếp': 'live',
      'mx-bỏ-qua': 'mx-ignore',
    },
    modifiers: {
      'ngăn-chặn': 'prevent',
      dừng: 'stop',
      'một-lần': 'once',
    },
  },

  he: {
    profile: 'hebrew',
    name: 'Hebrew',
    reviewed: false,
    attrs: {
      'fx-פעולה': 'fx-action',
      'fx-שיטה': 'fx-method',
      'fx-מפעיל': 'fx-trigger',
      'fx-יעד': 'fx-target',
      'fx-החלפה': 'fx-swap',
      חי: 'live',
      'mx-התעלם': 'mx-ignore',
    },
    modifiers: {
      מנע: 'prevent',
      עצור: 'stop',
      פעם: 'once',
    },
  },

  hi: {
    profile: 'hindi',
    name: 'Hindi',
    reviewed: false,
    attrs: {
      'fx-क्रिया': 'fx-action',
      'fx-विधि': 'fx-method',
      'fx-ट्रिगर': 'fx-trigger',
      'fx-लक्ष्य': 'fx-target',
      'fx-अदला-बदली': 'fx-swap',
      लाइव: 'live',
      'mx-अनदेखा': 'mx-ignore',
    },
    modifiers: {
      रोकें: 'prevent',
      रुकें: 'stop',
      'एक-बार': 'once',
    },
  },

  bn: {
    profile: 'bengali',
    name: 'Bengali',
    reviewed: false,
    attrs: {
      'fx-ক্রিয়া': 'fx-action',
      'fx-পদ্ধতি': 'fx-method',
      'fx-ট্রিগার': 'fx-trigger',
      'fx-লক্ষ্য': 'fx-target',
      'fx-অদলবদল': 'fx-swap',
      লাইভ: 'live',
      'mx-উপেক্ষা': 'mx-ignore',
    },
    modifiers: {
      প্রতিরোধ: 'prevent',
      বন্ধ: 'stop',
      একবার: 'once',
    },
  },

  id: {
    profile: 'indonesian',
    name: 'Indonesian',
    reviewed: false,
    attrs: {
      'fx-aksi': 'fx-action',
      'fx-metode': 'fx-method',
      'fx-pemicu': 'fx-trigger',
      'fx-tukar': 'fx-swap',
      langsung: 'live',
      'mx-abaikan': 'mx-ignore',
    },
    modifiers: {
      cegah: 'prevent',
      hentikan: 'stop',
      sekali: 'once',
    },
  },

  ms: {
    profile: 'ms',
    name: 'Malay',
    reviewed: false,
    attrs: {
      'fx-tindakan': 'fx-action',
      'fx-kaedah': 'fx-method',
      'fx-pencetus': 'fx-trigger',
      'fx-sasaran': 'fx-target',
      'fx-tukar': 'fx-swap',
      'mx-abaikan': 'mx-ignore',
    },
    modifiers: {
      elak: 'prevent',
      hentikan: 'stop',
      sekali: 'once',
    },
    valuesExtra: {
      klik: 'click',
      ubah: 'change',
      hantar: 'submit',
      input: 'input',
    },
  },

  th: {
    profile: 'thai',
    name: 'Thai',
    reviewed: false,
    attrs: {
      'fx-การกระทำ': 'fx-action',
      'fx-วิธี': 'fx-method',
      'fx-ตัวกระตุ้น': 'fx-trigger',
      'fx-เป้าหมาย': 'fx-target',
      'fx-สลับ': 'fx-swap',
      สด: 'live',
      'mx-เพิกเฉย': 'mx-ignore',
    },
    modifiers: {
      ป้องกัน: 'prevent',
      หยุด: 'stop',
      ครั้งเดียว: 'once',
    },
  },

  tl: {
    profile: 'tl',
    name: 'Tagalog',
    reviewed: false,
    attrs: {
      'fx-aksyon': 'fx-action',
      'fx-pamamaraan': 'fx-method',
      'fx-pampukaw': 'fx-trigger',
      'fx-palit': 'fx-swap',
      'mx-balewalain': 'mx-ignore',
    },
    modifiers: {
      iwasan: 'prevent',
      itigil: 'stop',
      'isang-beses': 'once',
    },
    valuesExtra: {
      'i-click': 'click',
      baguhin: 'change',
      ipasa: 'submit',
      ilagay: 'input',
    },
  },

  sw: {
    profile: 'swahili',
    name: 'Swahili',
    reviewed: false,
    attrs: {
      'fx-kitendo': 'fx-action',
      'fx-mbinu': 'fx-method',
      'fx-kichocheo': 'fx-trigger',
      'fx-lengo': 'fx-target',
      'fx-badilisha': 'fx-swap',
      'moja-kwa-moja': 'live',
      'mx-puuza': 'mx-ignore',
    },
    modifiers: {
      zuia: 'prevent',
      simamisha: 'stop',
      'mara-moja': 'once',
    },
    valuesExtra: {
      bofya: 'click',
      badilisha: 'change',
      wasilisha: 'submit',
      ingiza: 'input',
    },
  },

  qu: {
    profile: 'quechua',
    name: 'Quechua',
    reviewed: false,
    attrs: {},
    modifiers: {},
  },
};

/** Locales whose attrs/modifiers have been native-speaker reviewed. */
export const REVIEWED = new Set(
  Object.entries(LOCALES)
    .filter(([, spec]) => spec.reviewed)
    .map(([code]) => code)
);
