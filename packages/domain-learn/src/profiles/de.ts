import type { LearnLanguageProfile } from '../types';

export const deProfile: LearnLanguageProfile = {
  patternProfile: {
    code: 'de',
    wordOrder: 'SVO',
    keywords: {
      add: { primary: 'hinzufügen' },
      remove: { primary: 'entfernen' },
      toggle: { primary: 'umschalten' },
      put: { primary: 'setzen' },
      set: { primary: 'festlegen' },
      show: { primary: 'anzeigen' },
      hide: { primary: 'verbergen' },
      get: { primary: 'abrufen' },
      wait: { primary: 'warten' },
      fetch: { primary: 'abrufen' },
      send: { primary: 'senden' },
      go: { primary: 'gehen' },
      increment: { primary: 'erhöhen' },
      decrement: { primary: 'verringern' },
      take: { primary: 'nehmen' },
    },
  },
  morphologyTable: {
    add: {
      infinitive: 'hinzufügen',
      separablePrefix: 'hinzu',
      imperative: {
        du: 'füge hinzu',
        Sie: 'fügen Sie hinzu',
      },
      present: {
        ich: 'füge hinzu',
        du: 'fügst hinzu',
        er: 'fügt hinzu',
        wir: 'fügen hinzu',
        ihr: 'fügt hinzu',
        sie: 'fügen hinzu',
      },
      past: {
        ich: 'fügte hinzu',
        er: 'fügte hinzu',
      },
      perfect: {
        er: 'hat hinzugefügt',
      },
      future: {
        er: 'wird hinzufügen',
      },
      presentParticiple: 'hinzufügend',
    },
    remove: {
      infinitive: 'entfernen',
      separablePrefix: '',
      imperative: {
        du: 'entferne',
        Sie: 'entfernen Sie',
      },
      present: {
        ich: 'entferne',
        du: 'entfernst',
        er: 'entfernt',
        wir: 'entfernen',
        ihr: 'entfernt',
        sie: 'entfernen',
      },
      past: {
        ich: 'entfernte',
        er: 'entfernte',
      },
      perfect: {
        er: 'hat entfernt',
      },
      future: {
        er: 'wird entfernen',
      },
      presentParticiple: 'entfernend',
    },
    toggle: {
      infinitive: 'umschalten',
      separablePrefix: 'um',
      imperative: {
        du: 'schalte um',
        Sie: 'schalten Sie um',
      },
      present: {
        ich: 'schalte um',
        du: 'schaltest um',
        er: 'schaltet um',
        wir: 'schalten um',
        ihr: 'schaltet um',
        sie: 'schalten um',
      },
      past: {
        ich: 'schaltete um',
        er: 'schaltete um',
      },
      perfect: {
        er: 'hat umgeschaltet',
      },
      future: {
        er: 'wird umschalten',
      },
      presentParticiple: 'umschaltend',
    },
    put: {
      infinitive: 'setzen',
      separablePrefix: '',
      imperative: {
        du: 'setze',
        Sie: 'setzen Sie',
      },
      present: {
        ich: 'setze',
        du: 'setzt',
        er: 'setzt',
        wir: 'setzen',
        ihr: 'setzt',
        sie: 'setzen',
      },
      past: {
        ich: 'setzte',
        er: 'setzte',
      },
      perfect: {
        er: 'hat gesetzt',
      },
      future: {
        er: 'wird setzen',
      },
      presentParticiple: 'setzend',
    },
    set: {
      infinitive: 'festlegen',
      separablePrefix: 'fest',
      imperative: {
        du: 'lege fest',
        Sie: 'legen Sie fest',
      },
      present: {
        ich: 'lege fest',
        du: 'legst fest',
        er: 'legt fest',
        wir: 'legen fest',
        ihr: 'legt fest',
        sie: 'legen fest',
      },
      past: {
        ich: 'legte fest',
        er: 'legte fest',
      },
      perfect: {
        er: 'hat festgelegt',
      },
      future: {
        er: 'wird festlegen',
      },
      presentParticiple: 'festlegend',
    },
    show: {
      infinitive: 'anzeigen',
      separablePrefix: 'an',
      imperative: {
        du: 'zeige an',
        Sie: 'zeigen Sie an',
      },
      present: {
        ich: 'zeige an',
        du: 'zeigst an',
        er: 'zeigt an',
        wir: 'zeigen an',
        ihr: 'zeigt an',
        sie: 'zeigen an',
      },
      past: {
        ich: 'zeigte an',
        er: 'zeigte an',
      },
      perfect: {
        er: 'hat angezeigt',
      },
      future: {
        er: 'wird anzeigen',
      },
      presentParticiple: 'anzeigend',
    },
    hide: {
      infinitive: 'verbergen',
      separablePrefix: '',
      imperative: {
        du: 'verbirg',
        Sie: 'verbergen Sie',
      },
      present: {
        ich: 'verberge',
        du: 'verbirgst',
        er: 'verbirgt',
        wir: 'verbergen',
        ihr: 'verbergt',
        sie: 'verbergen',
      },
      past: {
        ich: 'verbarg',
        er: 'verbarg',
      },
      perfect: {
        er: 'hat verborgen',
      },
      future: {
        er: 'wird verbergen',
      },
      presentParticiple: 'verbergend',
    },
    get: {
      infinitive: 'abrufen',
      separablePrefix: 'ab',
      imperative: {
        du: 'rufe ab',
        Sie: 'rufen Sie ab',
      },
      present: {
        ich: 'rufe ab',
        du: 'rufst ab',
        er: 'ruft ab',
        wir: 'rufen ab',
        ihr: 'ruft ab',
        sie: 'rufen ab',
      },
      past: {
        ich: 'rief ab',
        er: 'rief ab',
      },
      perfect: {
        er: 'hat abgerufen',
      },
      future: {
        er: 'wird abrufen',
      },
      presentParticiple: 'abrufend',
    },
    wait: {
      infinitive: 'warten',
      separablePrefix: '',
      imperative: {
        du: 'warte',
        Sie: 'warten Sie',
      },
      present: {
        ich: 'warte',
        du: 'wartest',
        er: 'wartet',
        wir: 'warten',
        ihr: 'wartet',
        sie: 'warten',
      },
      past: {
        ich: 'wartete',
        er: 'wartete',
      },
      perfect: {
        er: 'hat gewartet',
      },
      future: {
        er: 'wird warten',
      },
      presentParticiple: 'wartend',
    },
    fetch: {
      infinitive: 'abrufen',
      separablePrefix: 'ab',
      imperative: {
        du: 'rufe ab',
        Sie: 'rufen Sie ab',
      },
      present: {
        ich: 'rufe ab',
        du: 'rufst ab',
        er: 'ruft ab',
        wir: 'rufen ab',
        ihr: 'ruft ab',
        sie: 'rufen ab',
      },
      past: {
        ich: 'rief ab',
        er: 'rief ab',
      },
      perfect: {
        er: 'hat abgerufen',
      },
      future: {
        er: 'wird abrufen',
      },
      presentParticiple: 'abrufend',
    },
    send: {
      infinitive: 'senden',
      separablePrefix: '',
      imperative: {
        du: 'sende',
        Sie: 'senden Sie',
      },
      present: {
        ich: 'sende',
        du: 'sendest',
        er: 'sendet',
        wir: 'senden',
        ihr: 'sendet',
        sie: 'senden',
      },
      past: {
        ich: 'sendete',
        er: 'sendete',
      },
      perfect: {
        er: 'hat gesendet',
      },
      future: {
        er: 'wird senden',
      },
      presentParticiple: 'sendend',
    },
    go: {
      infinitive: 'gehen',
      separablePrefix: '',
      imperative: {
        du: 'geh',
        Sie: 'gehen Sie',
      },
      present: {
        ich: 'gehe',
        du: 'gehst',
        er: 'geht',
        wir: 'gehen',
        ihr: 'geht',
        sie: 'gehen',
      },
      past: {
        ich: 'ging',
        er: 'ging',
      },
      perfect: {
        er: 'ist gegangen',
      },
      future: {
        er: 'wird gehen',
      },
      presentParticiple: 'gehend',
    },
    increment: {
      infinitive: 'erhöhen',
      separablePrefix: '',
      imperative: {
        du: 'erhöhe',
        Sie: 'erhöhen Sie',
      },
      present: {
        ich: 'erhöhe',
        du: 'erhöhst',
        er: 'erhöht',
        wir: 'erhöhen',
        ihr: 'erhöht',
        sie: 'erhöhen',
      },
      past: {
        ich: 'erhöhte',
        er: 'erhöhte',
      },
      perfect: {
        er: 'hat erhöht',
      },
      future: {
        er: 'wird erhöhen',
      },
      presentParticiple: 'erhöhend',
    },
    decrement: {
      infinitive: 'verringern',
      separablePrefix: '',
      imperative: {
        du: 'verringere',
        Sie: 'verringern Sie',
      },
      present: {
        ich: 'verringere',
        du: 'verringerst',
        er: 'verringert',
        wir: 'verringern',
        ihr: 'verringert',
        sie: 'verringern',
      },
      past: {
        ich: 'verringerte',
        er: 'verringerte',
      },
      perfect: {
        er: 'hat verringert',
      },
      future: {
        er: 'wird verringern',
      },
      presentParticiple: 'verringernd',
    },
    take: {
      infinitive: 'nehmen',
      separablePrefix: '',
      imperative: {
        du: 'nimm',
        Sie: 'nehmen Sie',
      },
      present: {
        ich: 'nehme',
        du: 'nimmst',
        er: 'nimmt',
        wir: 'nehmen',
        ihr: 'nehmt',
        sie: 'nehmen',
      },
      past: {
        ich: 'nahm',
        er: 'nahm',
      },
      perfect: {
        er: 'hat genommen',
      },
      future: {
        er: 'wird nehmen',
      },
      presentParticiple: 'nehmend',
    },
  },
  frames: {
    code: 'de',
    wordOrder: 'SVO',
    frames: [
      {
        function: 'commanding',
        template: '{verb.imperative.du} {patient} {target}',
        verbForm: 'imperative.du',
        example: 'füge hinzu .active zu #button',
      },
      {
        function: 'describing',
        template: '{subject} {verb.present.er} {patient} {target}',
        verbForm: 'present.er',
        example: 'das System fügt hinzu .active zu #button',
      },
      {
        function: 'narrating',
        template: '{subject} {verb.perfect.er} {patient} {target}',
        verbForm: 'perfect.er',
        example: 'das System hat hinzugefügt .active zu #button',
      },
      {
        function: 'questioning',
        template: '{verb.present.er} {subject} {patient} {target} ?',
        verbForm: 'present.er',
        example: 'fügt hinzu das System .active zu #button ?',
      },
      {
        function: 'negating',
        template: '{subject} {verb.present.er} {patient} nicht {target}',
        verbForm: 'present.er',
        example: 'das System fügt hinzu .active nicht zu #button',
      },
      {
        function: 'planning',
        template: '{subject} {verb.future.er} {patient} {target}',
        verbForm: 'future.er',
        example: 'das System wird hinzufügen .active zu #button',
      },
      {
        function: 'progressing',
        template: '{subject} {verb.present.er} gerade {patient} {target}',
        verbForm: 'present.er',
        example: 'das System fügt hinzu gerade .active zu #button',
      },
    ],
  },
  defaultSubject: 'das System',
};
