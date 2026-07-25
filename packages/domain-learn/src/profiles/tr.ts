import { buildPatternProfile } from '@lokascript/framework';
import { LEARN_LANGUAGES } from '../vocab';
import type { LearnLanguageProfile } from '../types';

export const trProfile: LearnLanguageProfile = {
  patternProfile: buildPatternProfile(LEARN_LANGUAGES.tr.slice, LEARN_LANGUAGES.tr.vocab),
  morphologyTable: {
    add: {
      dictionary: 'eklemek',
      imperative: {
        sen: 'ekle',
        siz: 'ekleyin',
      },
      present: {
        ben: 'ekliyorum',
        sen: 'ekliyorsun',
        o: 'ekler',
        biz: 'ekliyoruz',
        siz: 'ekliyorsunuz',
        onlar: 'ekliyorlar',
      },
      past: {
        o: 'ekledi',
        ben: 'ekledim',
      },
      future: {
        o: 'ekleyecek',
      },
      negative: {
        o: 'eklemez',
      },
      progressive: {
        o: 'ekliyor',
      },
      gerund: 'ekleyerek',
    },
    remove: {
      dictionary: 'kaldırmak',
      imperative: {
        sen: 'kaldır',
        siz: 'kaldırın',
      },
      present: {
        ben: 'kaldırıyorum',
        sen: 'kaldırıyorsun',
        o: 'kaldırır',
        biz: 'kaldırıyoruz',
        siz: 'kaldırıyorsunuz',
        onlar: 'kaldırıyorlar',
      },
      past: {
        o: 'kaldırdı',
        ben: 'kaldırdım',
      },
      future: {
        o: 'kaldıracak',
      },
      negative: {
        o: 'kaldırmaz',
      },
      progressive: {
        o: 'kaldırıyor',
      },
      gerund: 'kaldırarak',
    },
    toggle: {
      dictionary: 'değiştirmek',
      imperative: {
        sen: 'değiştir',
        siz: 'değiştirin',
      },
      present: {
        ben: 'değiştiriyorum',
        sen: 'değiştiriyorsun',
        o: 'değiştirir',
        biz: 'değiştiriyoruz',
        siz: 'değiştiriyorsunuz',
        onlar: 'değiştiriyorlar',
      },
      past: {
        o: 'değiştirdi',
        ben: 'değiştirdim',
      },
      future: {
        o: 'değiştirecek',
      },
      negative: {
        o: 'değiştirmez',
      },
      progressive: {
        o: 'değiştiriyor',
      },
      gerund: 'değiştirerek',
    },
    put: {
      dictionary: 'koymak',
      imperative: {
        sen: 'koy',
        siz: 'koyun',
      },
      present: {
        ben: 'koyuyorum',
        sen: 'koyuyorsun',
        o: 'koyar',
        biz: 'koyuyoruz',
        siz: 'koyuyorsunuz',
        onlar: 'koyuyorlar',
      },
      past: {
        o: 'koydu',
        ben: 'koydum',
      },
      future: {
        o: 'koyacak',
      },
      negative: {
        o: 'koymaz',
      },
      progressive: {
        o: 'koyuyor',
      },
      gerund: 'koyarak',
    },
    set: {
      dictionary: 'ayarlamak',
      imperative: {
        sen: 'ayarla',
        siz: 'ayarlayin',
      },
      present: {
        ben: 'ayarliyorum',
        sen: 'ayarliyorsun',
        o: 'ayarlar',
        biz: 'ayarliyoruz',
        siz: 'ayarliyorsunuz',
        onlar: 'ayarliyorlar',
      },
      past: {
        o: 'ayarladi',
        ben: 'ayarladim',
      },
      future: {
        o: 'ayarlayacak',
      },
      negative: {
        o: 'ayarlamaz',
      },
      progressive: {
        o: 'ayarliyor',
      },
      gerund: 'ayarlayarak',
    },
    show: {
      dictionary: 'göstermek',
      imperative: {
        sen: 'göster',
        siz: 'gösterin',
      },
      present: {
        ben: 'gösteriyorum',
        sen: 'gösteriyorsun',
        o: 'gösterir',
        biz: 'gösteriyoruz',
        siz: 'gösteriyorsunuz',
        onlar: 'gösteriyorlar',
      },
      past: {
        o: 'gösterdi',
        ben: 'gösterdim',
      },
      future: {
        o: 'gösterecek',
      },
      negative: {
        o: 'göstermez',
      },
      progressive: {
        o: 'gösteriyor',
      },
      gerund: 'göstererek',
    },
    hide: {
      dictionary: 'gizlemek',
      imperative: {
        sen: 'gizle',
        siz: 'gizleyin',
      },
      present: {
        ben: 'gizliyorum',
        sen: 'gizliyorsun',
        o: 'gizler',
        biz: 'gizliyoruz',
        siz: 'gizliyorsunuz',
        onlar: 'gizliyorlar',
      },
      past: {
        o: 'gizledi',
        ben: 'gizledim',
      },
      future: {
        o: 'gizleyecek',
      },
      negative: {
        o: 'gizlemez',
      },
      progressive: {
        o: 'gizliyor',
      },
      gerund: 'gizleyerek',
    },
    get: {
      dictionary: 'almak',
      imperative: {
        sen: 'al',
        siz: 'alin',
      },
      present: {
        ben: 'aliyorum',
        sen: 'aliyorsun',
        o: 'alir',
        biz: 'aliyoruz',
        siz: 'aliyorsunuz',
        onlar: 'aliyorlar',
      },
      past: {
        o: 'aldi',
        ben: 'aldim',
      },
      future: {
        o: 'alacak',
      },
      negative: {
        o: 'almaz',
      },
      progressive: {
        o: 'aliyor',
      },
      gerund: 'alarak',
    },
    wait: {
      dictionary: 'beklemek',
      imperative: {
        sen: 'bekle',
        siz: 'bekleyin',
      },
      present: {
        ben: 'bekliyorum',
        sen: 'bekliyorsun',
        o: 'bekler',
        biz: 'bekliyoruz',
        siz: 'bekliyorsunuz',
        onlar: 'bekliyorlar',
      },
      past: {
        o: 'bekledi',
        ben: 'bekledim',
      },
      future: {
        o: 'bekleyecek',
      },
      negative: {
        o: 'beklemez',
      },
      progressive: {
        o: 'bekliyor',
      },
      gerund: 'bekleyerek',
    },
    fetch: {
      dictionary: 'getirmek',
      imperative: {
        sen: 'getir',
        siz: 'getirin',
      },
      present: {
        ben: 'getiriyorum',
        sen: 'getiriyorsun',
        o: 'getirir',
        biz: 'getiriyoruz',
        siz: 'getiriyorsunuz',
        onlar: 'getiriyorlar',
      },
      past: {
        o: 'getirdi',
        ben: 'getirdim',
      },
      future: {
        o: 'getirecek',
      },
      negative: {
        o: 'getirmez',
      },
      progressive: {
        o: 'getiriyor',
      },
      gerund: 'getirerek',
    },
    send: {
      dictionary: 'göndermek',
      imperative: {
        sen: 'gönder',
        siz: 'gönderin',
      },
      present: {
        ben: 'gönderiyorum',
        sen: 'gönderiyorsun',
        o: 'gönderir',
        biz: 'gönderiyoruz',
        siz: 'gönderiyorsunuz',
        onlar: 'gönderiyorlar',
      },
      past: {
        o: 'gönderdi',
        ben: 'gönderdim',
      },
      future: {
        o: 'gönderecek',
      },
      negative: {
        o: 'göndermez',
      },
      progressive: {
        o: 'gönderiyor',
      },
      gerund: 'göndererek',
    },
    go: {
      dictionary: 'gitmek',
      imperative: {
        sen: 'git',
        siz: 'gidin',
      },
      present: {
        ben: 'gidiyorum',
        sen: 'gidiyorsun',
        o: 'gider',
        biz: 'gidiyoruz',
        siz: 'gidiyorsunuz',
        onlar: 'gidiyorlar',
      },
      past: {
        o: 'gitti',
        ben: 'gittim',
      },
      future: {
        o: 'gidecek',
      },
      negative: {
        o: 'gitmez',
      },
      progressive: {
        o: 'gidiyor',
      },
      gerund: 'giderek',
    },
    increment: {
      dictionary: 'artırmak',
      imperative: {
        sen: 'artır',
        siz: 'artırın',
      },
      present: {
        ben: 'artırıyorum',
        sen: 'artırıyorsun',
        o: 'artırır',
        biz: 'artırıyoruz',
        siz: 'artırıyorsunuz',
        onlar: 'artırıyorlar',
      },
      past: {
        o: 'artırdı',
        ben: 'artırdım',
      },
      future: {
        o: 'artıracak',
      },
      negative: {
        o: 'artırmaz',
      },
      progressive: {
        o: 'artırıyor',
      },
      gerund: 'artırarak',
    },
    decrement: {
      dictionary: 'azaltmak',
      imperative: {
        sen: 'azalt',
        siz: 'azaltin',
      },
      present: {
        ben: 'azaltiyorum',
        sen: 'azaltiyorsun',
        o: 'azaltir',
        biz: 'azaltiyoruz',
        siz: 'azaltiyorsunuz',
        onlar: 'azaltiyorlar',
      },
      past: {
        o: 'azaltti',
        ben: 'azalttim',
      },
      future: {
        o: 'azaltacak',
      },
      negative: {
        o: 'azaltmaz',
      },
      progressive: {
        o: 'azaltiyor',
      },
      gerund: 'azaltarak',
    },
    take: {
      dictionary: 'almak',
      imperative: {
        sen: 'al',
        siz: 'alin',
      },
      present: {
        ben: 'aliyorum',
        sen: 'aliyorsun',
        o: 'alir',
        biz: 'aliyoruz',
        siz: 'aliyorsunuz',
        onlar: 'aliyorlar',
      },
      past: {
        o: 'aldi',
        ben: 'aldim',
      },
      future: {
        o: 'alacak',
      },
      negative: {
        o: 'almaz',
      },
      progressive: {
        o: 'aliyor',
      },
      gerund: 'alarak',
    },
  },
  frames: {
    code: 'tr',
    wordOrder: 'SOV',
    frames: [
      {
        function: 'commanding',
        template: '{target} {patient} {verb.imperative.sen}',
        verbForm: 'imperative.sen',
        example: "#button'a .active ekle",
      },
      {
        function: 'describing',
        template: '{subject} {target} {patient} {verb.present.o}',
        verbForm: 'present.o',
        example: "Sistem #button'a .active ekler",
      },
      {
        function: 'narrating',
        template: '{subject} {target} {patient} {verb.past.o}',
        verbForm: 'past.o',
        example: "Sistem #button'a .active ekledi",
      },
      {
        function: 'questioning',
        template: '{subject} {target} {patient} {verb.present.o} mi?',
        verbForm: 'present.o',
        example: "Sistem #button'a .active ekler mi?",
      },
      {
        function: 'negating',
        template: '{subject} {target} {patient} {verb.negative.o}',
        verbForm: 'negative.o',
        example: "Sistem #button'a .active eklemez",
      },
      {
        function: 'planning',
        template: '{subject} {target} {patient} {verb.future.o}',
        verbForm: 'future.o',
        example: "Sistem #button'a .active ekleyecek",
      },
      {
        function: 'progressing',
        template: '{subject} {target} {patient} {verb.progressive.o}',
        verbForm: 'progressive.o',
        example: "Sistem #button'a .active ekliyor",
      },
    ],
  },
  defaultSubject: 'Sistem',
};
