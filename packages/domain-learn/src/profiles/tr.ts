import type { LearnLanguageProfile } from '../types';

export const trProfile: LearnLanguageProfile = {
  patternProfile: {
    code: 'tr',
    wordOrder: 'SOV',
    keywords: {
      add: { primary: 'ekle', alternatives: ['eklemek'] },
      remove: { primary: 'kaldir', alternatives: ['kaldirmak'] },
      toggle: { primary: 'degistir', alternatives: ['degistirmek'] },
      put: { primary: 'koy', alternatives: ['koymak'] },
      set: { primary: 'ayarla', alternatives: ['ayarlamak'] },
      show: { primary: 'goster', alternatives: ['gostermek'] },
      hide: { primary: 'gizle', alternatives: ['gizlemek'] },
      get: { primary: 'al', alternatives: ['almak'] },
      wait: { primary: 'bekle', alternatives: ['beklemek'] },
      fetch: { primary: 'getir', alternatives: ['getirmek'] },
      send: { primary: 'gonder', alternatives: ['gondermek'] },
      go: { primary: 'git', alternatives: ['gitmek'] },
      increment: { primary: 'artir', alternatives: ['artirmak'] },
      decrement: { primary: 'azalt', alternatives: ['azaltmak'] },
      take: { primary: 'al', alternatives: ['almak'] },
    },
  },
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
      dictionary: 'kaldirmak',
      imperative: {
        sen: 'kaldir',
        siz: 'kaldirin',
      },
      present: {
        ben: 'kaldiriyorum',
        sen: 'kaldiriyorsun',
        o: 'kaldirir',
        biz: 'kaldiriyoruz',
        siz: 'kaldiriyorsunuz',
        onlar: 'kaldiriyorlar',
      },
      past: {
        o: 'kaldirdi',
        ben: 'kaldirdim',
      },
      future: {
        o: 'kaldiracak',
      },
      negative: {
        o: 'kaldirmaz',
      },
      progressive: {
        o: 'kaldiriyor',
      },
      gerund: 'kaldirarak',
    },
    toggle: {
      dictionary: 'degistirmek',
      imperative: {
        sen: 'degistir',
        siz: 'degistirin',
      },
      present: {
        ben: 'degistiriyorum',
        sen: 'degistiriyorsun',
        o: 'degistirir',
        biz: 'degistiriyoruz',
        siz: 'degistiriyorsunuz',
        onlar: 'degistiriyorlar',
      },
      past: {
        o: 'degistirdi',
        ben: 'degistirdim',
      },
      future: {
        o: 'degistirecek',
      },
      negative: {
        o: 'degistirmez',
      },
      progressive: {
        o: 'degistiriyor',
      },
      gerund: 'degistirerek',
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
      dictionary: 'gostermek',
      imperative: {
        sen: 'goster',
        siz: 'gosterin',
      },
      present: {
        ben: 'gosteriyorum',
        sen: 'gosteriyorsun',
        o: 'gosterir',
        biz: 'gosteriyoruz',
        siz: 'gosteriyorsunuz',
        onlar: 'gosteriyorlar',
      },
      past: {
        o: 'gosterdi',
        ben: 'gosterdim',
      },
      future: {
        o: 'gosterecek',
      },
      negative: {
        o: 'gostermez',
      },
      progressive: {
        o: 'gosteriyor',
      },
      gerund: 'gostererek',
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
      dictionary: 'gondermek',
      imperative: {
        sen: 'gonder',
        siz: 'gonderin',
      },
      present: {
        ben: 'gonderiyorum',
        sen: 'gonderiyorsun',
        o: 'gonderir',
        biz: 'gonderiyoruz',
        siz: 'gonderiyorsunuz',
        onlar: 'gonderiyorlar',
      },
      past: {
        o: 'gonderdi',
        ben: 'gonderdim',
      },
      future: {
        o: 'gonderecek',
      },
      negative: {
        o: 'gondermez',
      },
      progressive: {
        o: 'gonderiyor',
      },
      gerund: 'gondererek',
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
      dictionary: 'artirmak',
      imperative: {
        sen: 'artir',
        siz: 'artirin',
      },
      present: {
        ben: 'artiriyorum',
        sen: 'artiriyorsun',
        o: 'artirir',
        biz: 'artiriyoruz',
        siz: 'artiriyorsunuz',
        onlar: 'artiriyorlar',
      },
      past: {
        o: 'artirdi',
        ben: 'artirdim',
      },
      future: {
        o: 'artiracak',
      },
      negative: {
        o: 'artirmaz',
      },
      progressive: {
        o: 'artiriyor',
      },
      gerund: 'artirarak',
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
