import type { LearnLanguageProfile } from '../types';

export const frProfile: LearnLanguageProfile = {
  patternProfile: {
    code: 'fr',
    wordOrder: 'SVO',
    keywords: {
      add: { primary: 'ajouter', alternatives: ['ajoute'] },
      remove: { primary: 'retirer', alternatives: ['retire'] },
      toggle: { primary: 'basculer', alternatives: ['bascule'] },
      put: { primary: 'mettre', alternatives: ['mets'] },
      set: { primary: 'définir', alternatives: ['définis'] },
      show: { primary: 'montrer', alternatives: ['montre'] },
      hide: { primary: 'cacher', alternatives: ['cache'] },
      get: { primary: 'obtenir', alternatives: ['obtiens'] },
      wait: { primary: 'attendre', alternatives: ['attends'] },
      fetch: { primary: 'récupérer', alternatives: ['récupère'] },
      send: { primary: 'envoyer', alternatives: ['envoie'] },
      go: { primary: 'aller', alternatives: ['va'] },
      increment: { primary: 'incrémenter', alternatives: ['incrémente'] },
      decrement: { primary: 'décrémenter', alternatives: ['décrémente'] },
      take: { primary: 'prendre', alternatives: ['prends'] },
    },
  },
  morphologyTable: {
    add: {
      infinitive: 'ajouter',
      imperative: {
        tu: 'ajoute',
        vous: 'ajoutez',
      },
      present: {
        je: "j'ajoute",
        tu: 'ajoutes',
        il: 'ajoute',
        nous: 'ajoutons',
        vous: 'ajoutez',
        ils: 'ajoutent',
      },
      passeCompose: {
        il: 'a ajouté',
        je: 'ai ajouté',
      },
      imparfait: {
        il: 'ajoutait',
      },
      futur: {
        il: 'ajoutera',
      },
      gerondif: 'en ajoutant',
    },
    remove: {
      infinitive: 'retirer',
      imperative: {
        tu: 'retire',
        vous: 'retirez',
      },
      present: {
        je: 'je retire',
        tu: 'retires',
        il: 'retire',
        nous: 'retirons',
        vous: 'retirez',
        ils: 'retirent',
      },
      passeCompose: {
        il: 'a retiré',
        je: 'ai retiré',
      },
      imparfait: {
        il: 'retirait',
      },
      futur: {
        il: 'retirera',
      },
      gerondif: 'en retirant',
    },
    toggle: {
      infinitive: 'basculer',
      imperative: {
        tu: 'bascule',
        vous: 'basculez',
      },
      present: {
        je: 'je bascule',
        tu: 'bascules',
        il: 'bascule',
        nous: 'basculons',
        vous: 'basculez',
        ils: 'basculent',
      },
      passeCompose: {
        il: 'a basculé',
        je: 'ai basculé',
      },
      imparfait: {
        il: 'basculait',
      },
      futur: {
        il: 'basculera',
      },
      gerondif: 'en basculant',
    },
    put: {
      infinitive: 'mettre',
      imperative: {
        tu: 'mets',
        vous: 'mettez',
      },
      present: {
        je: 'je mets',
        tu: 'mets',
        il: 'met',
        nous: 'mettons',
        vous: 'mettez',
        ils: 'mettent',
      },
      passeCompose: {
        il: 'a mis',
        je: 'ai mis',
      },
      imparfait: {
        il: 'mettait',
      },
      futur: {
        il: 'mettra',
      },
      gerondif: 'en mettant',
    },
    set: {
      infinitive: 'définir',
      imperative: {
        tu: 'définis',
        vous: 'définissez',
      },
      present: {
        je: 'je définis',
        tu: 'définis',
        il: 'définit',
        nous: 'définissons',
        vous: 'définissez',
        ils: 'définissent',
      },
      passeCompose: {
        il: 'a défini',
        je: 'ai défini',
      },
      imparfait: {
        il: 'définissait',
      },
      futur: {
        il: 'définira',
      },
      gerondif: 'en définissant',
    },
    show: {
      infinitive: 'montrer',
      imperative: {
        tu: 'montre',
        vous: 'montrez',
      },
      present: {
        je: 'je montre',
        tu: 'montres',
        il: 'montre',
        nous: 'montrons',
        vous: 'montrez',
        ils: 'montrent',
      },
      passeCompose: {
        il: 'a montré',
        je: 'ai montré',
      },
      imparfait: {
        il: 'montrait',
      },
      futur: {
        il: 'montrera',
      },
      gerondif: 'en montrant',
    },
    hide: {
      infinitive: 'cacher',
      imperative: {
        tu: 'cache',
        vous: 'cachez',
      },
      present: {
        je: 'je cache',
        tu: 'caches',
        il: 'cache',
        nous: 'cachons',
        vous: 'cachez',
        ils: 'cachent',
      },
      passeCompose: {
        il: 'a caché',
        je: 'ai caché',
      },
      imparfait: {
        il: 'cachait',
      },
      futur: {
        il: 'cachera',
      },
      gerondif: 'en cachant',
    },
    get: {
      infinitive: 'obtenir',
      imperative: {
        tu: 'obtiens',
        vous: 'obtenez',
      },
      present: {
        je: "j'obtiens",
        tu: 'obtiens',
        il: 'obtient',
        nous: 'obtenons',
        vous: 'obtenez',
        ils: 'obtiennent',
      },
      passeCompose: {
        il: 'a obtenu',
        je: 'ai obtenu',
      },
      imparfait: {
        il: 'obtenait',
      },
      futur: {
        il: 'obtiendra',
      },
      gerondif: 'en obtenant',
    },
    wait: {
      infinitive: 'attendre',
      imperative: {
        tu: 'attends',
        vous: 'attendez',
      },
      present: {
        je: "j'attends",
        tu: 'attends',
        il: 'attend',
        nous: 'attendons',
        vous: 'attendez',
        ils: 'attendent',
      },
      passeCompose: {
        il: 'a attendu',
        je: 'ai attendu',
      },
      imparfait: {
        il: 'attendait',
      },
      futur: {
        il: 'attendra',
      },
      gerondif: 'en attendant',
    },
    fetch: {
      infinitive: 'récupérer',
      imperative: {
        tu: 'récupère',
        vous: 'récupérez',
      },
      present: {
        je: 'je récupère',
        tu: 'récupères',
        il: 'récupère',
        nous: 'récupérons',
        vous: 'récupérez',
        ils: 'récupèrent',
      },
      passeCompose: {
        il: 'a récupéré',
        je: 'ai récupéré',
      },
      imparfait: {
        il: 'récupérait',
      },
      futur: {
        il: 'récupérera',
      },
      gerondif: 'en récupérant',
    },
    send: {
      infinitive: 'envoyer',
      imperative: {
        tu: 'envoie',
        vous: 'envoyez',
      },
      present: {
        je: "j'envoie",
        tu: 'envoies',
        il: 'envoie',
        nous: 'envoyons',
        vous: 'envoyez',
        ils: 'envoient',
      },
      passeCompose: {
        il: 'a envoyé',
        je: 'ai envoyé',
      },
      imparfait: {
        il: 'envoyait',
      },
      futur: {
        il: 'enverra',
      },
      gerondif: 'en envoyant',
    },
    go: {
      infinitive: 'aller',
      imperative: {
        tu: 'va',
        vous: 'allez',
      },
      present: {
        je: 'je vais',
        tu: 'vas',
        il: 'va',
        nous: 'allons',
        vous: 'allez',
        ils: 'vont',
      },
      passeCompose: {
        il: 'est allé',
        je: 'suis allé',
      },
      imparfait: {
        il: 'allait',
      },
      futur: {
        il: 'ira',
      },
      gerondif: 'en allant',
    },
    increment: {
      infinitive: 'incrémenter',
      imperative: {
        tu: 'incrémente',
        vous: 'incrémentez',
      },
      present: {
        je: "j'incrémente",
        tu: 'incrémentes',
        il: 'incrémente',
        nous: 'incrémentons',
        vous: 'incrémentez',
        ils: 'incrémentent',
      },
      passeCompose: {
        il: 'a incrémenté',
        je: 'ai incrémenté',
      },
      imparfait: {
        il: 'incrémentait',
      },
      futur: {
        il: 'incrémentera',
      },
      gerondif: 'en incrémentant',
    },
    decrement: {
      infinitive: 'décrémenter',
      imperative: {
        tu: 'décrémente',
        vous: 'décrémentez',
      },
      present: {
        je: 'je décrémente',
        tu: 'décrémentes',
        il: 'décrémente',
        nous: 'décrémentons',
        vous: 'décrémentez',
        ils: 'décrémentent',
      },
      passeCompose: {
        il: 'a décrémenté',
        je: 'ai décrémenté',
      },
      imparfait: {
        il: 'décrémentait',
      },
      futur: {
        il: 'décrémentera',
      },
      gerondif: 'en décrémentant',
    },
    take: {
      infinitive: 'prendre',
      imperative: {
        tu: 'prends',
        vous: 'prenez',
      },
      present: {
        je: 'je prends',
        tu: 'prends',
        il: 'prend',
        nous: 'prenons',
        vous: 'prenez',
        ils: 'prennent',
      },
      passeCompose: {
        il: 'a pris',
        je: 'ai pris',
      },
      imparfait: {
        il: 'prenait',
      },
      futur: {
        il: 'prendra',
      },
      gerondif: 'en prenant',
    },
  },
  frames: {
    code: 'fr',
    wordOrder: 'SVO',
    frames: [
      {
        function: 'commanding',
        template: '{verb.imperative.tu} {patient} {target}',
        verbForm: 'imperative.tu',
        example: 'ajoute .active à #button',
      },
      {
        function: 'describing',
        template: '{subject} {verb.present.il} {patient} {target}',
        verbForm: 'present.il',
        example: 'le système ajoute .active à #button',
      },
      {
        function: 'narrating',
        template: '{subject} {verb.passeCompose.il} {patient} {target}',
        verbForm: 'passeCompose.il',
        example: 'le système a ajouté .active à #button',
      },
      {
        function: 'questioning',
        template: 'est-ce que {subject} {verb.present.il} {patient} {target} ?',
        verbForm: 'present.il',
        example: 'est-ce que le système ajoute .active à #button ?',
      },
      {
        function: 'negating',
        template: '{subject} ne {verb.present.il} pas {patient} {target}',
        verbForm: 'present.il',
        example: 'le système ne ajoute pas .active à #button',
      },
      {
        function: 'planning',
        template: '{subject} {verb.futur.il} {patient} {target}',
        verbForm: 'futur.il',
        example: 'le système ajoutera .active à #button',
      },
      {
        function: 'progressing',
        template: '{subject} est en train de {verb.infinitive} {patient} {target}',
        verbForm: 'infinitive',
        example: 'le système est en train de ajouter .active à #button',
      },
    ],
  },
  defaultSubject: 'le système',
};
