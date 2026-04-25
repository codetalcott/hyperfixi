import type { LearnLanguageProfile, PortugueseForms, LanguageFrames } from '../types';

const morphologyTable: Record<string, PortugueseForms> = {
  add: {
    infinitive: 'adicionar',
    imperative: {
      voce: 'adicione',
      voces: 'adicionem',
    },
    present: {
      eu: 'eu adiciono',
      voce: 'adiciona',
      ele: 'adiciona',
      nos: 'adicionamos',
      voces: 'adicionam',
      eles: 'adicionam',
    },
    preterite: {
      ele: 'adicionou',
      eu: 'adicionei',
    },
    imperfect: {
      ele: 'adicionava',
    },
    future: {
      ele: 'adicionará',
    },
    gerund: 'adicionando',
  },

  remove: {
    infinitive: 'remover',
    imperative: {
      voce: 'remova',
      voces: 'removam',
    },
    present: {
      eu: 'eu removo',
      voce: 'remove',
      ele: 'remove',
      nos: 'removemos',
      voces: 'removem',
      eles: 'removem',
    },
    preterite: {
      ele: 'removeu',
      eu: 'removi',
    },
    imperfect: {
      ele: 'removia',
    },
    future: {
      ele: 'removerá',
    },
    gerund: 'removendo',
  },

  toggle: {
    infinitive: 'alternar',
    imperative: {
      voce: 'alterne',
      voces: 'alternem',
    },
    present: {
      eu: 'eu alterno',
      voce: 'alterna',
      ele: 'alterna',
      nos: 'alternamos',
      voces: 'alternam',
      eles: 'alternam',
    },
    preterite: {
      ele: 'alternou',
      eu: 'alternei',
    },
    imperfect: {
      ele: 'alternava',
    },
    future: {
      ele: 'alternará',
    },
    gerund: 'alternando',
  },

  put: {
    infinitive: 'colocar',
    imperative: {
      voce: 'coloque',
      voces: 'coloquem',
    },
    present: {
      eu: 'eu coloco',
      voce: 'coloca',
      ele: 'coloca',
      nos: 'colocamos',
      voces: 'colocam',
      eles: 'colocam',
    },
    preterite: {
      ele: 'colocou',
      eu: 'coloquei',
    },
    imperfect: {
      ele: 'colocava',
    },
    future: {
      ele: 'colocará',
    },
    gerund: 'colocando',
  },

  set: {
    infinitive: 'definir',
    imperative: {
      voce: 'defina',
      voces: 'definam',
    },
    present: {
      eu: 'eu defino',
      voce: 'define',
      ele: 'define',
      nos: 'definimos',
      voces: 'definem',
      eles: 'definem',
    },
    preterite: {
      ele: 'definiu',
      eu: 'defini',
    },
    imperfect: {
      ele: 'definia',
    },
    future: {
      ele: 'definirá',
    },
    gerund: 'definindo',
  },

  show: {
    infinitive: 'mostrar',
    imperative: {
      voce: 'mostre',
      voces: 'mostrem',
    },
    present: {
      eu: 'eu mostro',
      voce: 'mostra',
      ele: 'mostra',
      nos: 'mostramos',
      voces: 'mostram',
      eles: 'mostram',
    },
    preterite: {
      ele: 'mostrou',
      eu: 'mostrei',
    },
    imperfect: {
      ele: 'mostrava',
    },
    future: {
      ele: 'mostrará',
    },
    gerund: 'mostrando',
  },

  hide: {
    infinitive: 'esconder',
    imperative: {
      voce: 'esconda',
      voces: 'escondam',
    },
    present: {
      eu: 'eu escondo',
      voce: 'esconde',
      ele: 'esconde',
      nos: 'escondemos',
      voces: 'escondem',
      eles: 'escondem',
    },
    preterite: {
      ele: 'escondeu',
      eu: 'escondi',
    },
    imperfect: {
      ele: 'escondia',
    },
    future: {
      ele: 'esconderá',
    },
    gerund: 'escondendo',
  },

  get: {
    infinitive: 'obter',
    imperative: {
      voce: 'obtenha',
      voces: 'obtenham',
    },
    present: {
      eu: 'eu obtenho',
      voce: 'obtém',
      ele: 'obtém',
      nos: 'obtemos',
      voces: 'obtêm',
      eles: 'obtêm',
    },
    preterite: {
      ele: 'obteve',
      eu: 'obtive',
    },
    imperfect: {
      ele: 'obtinha',
    },
    future: {
      ele: 'obterá',
    },
    gerund: 'obtendo',
  },

  wait: {
    infinitive: 'esperar',
    imperative: {
      voce: 'espere',
      voces: 'esperem',
    },
    present: {
      eu: 'eu espero',
      voce: 'espera',
      ele: 'espera',
      nos: 'esperamos',
      voces: 'esperam',
      eles: 'esperam',
    },
    preterite: {
      ele: 'esperou',
      eu: 'esperei',
    },
    imperfect: {
      ele: 'esperava',
    },
    future: {
      ele: 'esperará',
    },
    gerund: 'esperando',
  },

  fetch: {
    infinitive: 'buscar',
    imperative: {
      voce: 'busque',
      voces: 'busquem',
    },
    present: {
      eu: 'eu busco',
      voce: 'busca',
      ele: 'busca',
      nos: 'buscamos',
      voces: 'buscam',
      eles: 'buscam',
    },
    preterite: {
      ele: 'buscou',
      eu: 'busquei',
    },
    imperfect: {
      ele: 'buscava',
    },
    future: {
      ele: 'buscará',
    },
    gerund: 'buscando',
  },

  send: {
    infinitive: 'enviar',
    imperative: {
      voce: 'envie',
      voces: 'enviem',
    },
    present: {
      eu: 'eu envio',
      voce: 'envia',
      ele: 'envia',
      nos: 'enviamos',
      voces: 'enviam',
      eles: 'enviam',
    },
    preterite: {
      ele: 'enviou',
      eu: 'enviei',
    },
    imperfect: {
      ele: 'enviava',
    },
    future: {
      ele: 'enviará',
    },
    gerund: 'enviando',
  },

  go: {
    infinitive: 'ir',
    imperative: {
      voce: 'vá',
      voces: 'vão',
    },
    present: {
      eu: 'eu vou',
      voce: 'vai',
      ele: 'vai',
      nos: 'vamos',
      voces: 'vão',
      eles: 'vão',
    },
    preterite: {
      ele: 'foi',
      eu: 'fui',
    },
    imperfect: {
      ele: 'ia',
    },
    future: {
      ele: 'irá',
    },
    gerund: 'indo',
  },

  increment: {
    infinitive: 'incrementar',
    imperative: {
      voce: 'incremente',
      voces: 'incrementem',
    },
    present: {
      eu: 'eu incremento',
      voce: 'incrementa',
      ele: 'incrementa',
      nos: 'incrementamos',
      voces: 'incrementam',
      eles: 'incrementam',
    },
    preterite: {
      ele: 'incrementou',
      eu: 'incrementei',
    },
    imperfect: {
      ele: 'incrementava',
    },
    future: {
      ele: 'incrementará',
    },
    gerund: 'incrementando',
  },

  decrement: {
    infinitive: 'decrementar',
    imperative: {
      voce: 'decremente',
      voces: 'decrementem',
    },
    present: {
      eu: 'eu decremento',
      voce: 'decrementa',
      ele: 'decrementa',
      nos: 'decrementamos',
      voces: 'decrementam',
      eles: 'decrementam',
    },
    preterite: {
      ele: 'decrementou',
      eu: 'decrementei',
    },
    imperfect: {
      ele: 'decrementava',
    },
    future: {
      ele: 'decrementará',
    },
    gerund: 'decrementando',
  },

  take: {
    infinitive: 'pegar',
    imperative: {
      voce: 'pegue',
      voces: 'peguem',
    },
    present: {
      eu: 'eu pego',
      voce: 'pega',
      ele: 'pega',
      nos: 'pegamos',
      voces: 'pegam',
      eles: 'pegam',
    },
    preterite: {
      ele: 'pegou',
      eu: 'peguei',
    },
    imperfect: {
      ele: 'pegava',
    },
    future: {
      ele: 'pegará',
    },
    gerund: 'pegando',
  },
};

const frames: LanguageFrames = {
  code: 'pt',
  wordOrder: 'SVO',
  frames: [
    {
      function: 'commanding',
      template: '{verb.imperative.voce} {patient} {target}',
      verbForm: 'imperative.voce',
      example: 'adicione .active a #button',
    },
    {
      function: 'describing',
      template: '{subject} {verb.present.ele} {patient} {target}',
      verbForm: 'present.ele',
      example: 'o sistema adiciona .active a #button',
    },
    {
      function: 'narrating',
      template: '{subject} {verb.preterite.ele} {patient} {target}',
      verbForm: 'preterite.ele',
      example: 'o sistema adicionou .active a #button',
    },
    {
      function: 'questioning',
      template: 'será que {subject} {verb.present.ele} {patient} {target} ?',
      verbForm: 'present.ele',
      example: 'será que o sistema adiciona .active a #button ?',
    },
    {
      function: 'negating',
      template: '{subject} não {verb.present.ele} {patient} {target}',
      verbForm: 'present.ele',
      example: 'o sistema não adiciona .active a #button',
    },
    {
      function: 'planning',
      template: '{subject} {verb.future.ele} {patient} {target}',
      verbForm: 'future.ele',
      example: 'o sistema adicionará .active a #button',
    },
    {
      function: 'progressing',
      template: '{subject} está {verb.gerund} {patient} {target}',
      verbForm: 'gerund',
      example: 'o sistema está adicionando .active a #button',
    },
  ],
};

export const ptProfile: LearnLanguageProfile = {
  patternProfile: {
    code: 'pt',
    wordOrder: 'SVO',
    keywords: {
      add: { primary: 'adicionar', alternatives: ['adicione'] },
      remove: { primary: 'remover', alternatives: ['remova'] },
      toggle: { primary: 'alternar', alternatives: ['alterne'] },
      put: { primary: 'colocar', alternatives: ['coloque'] },
      set: { primary: 'definir', alternatives: ['defina'] },
      show: { primary: 'mostrar', alternatives: ['mostre'] },
      hide: { primary: 'esconder', alternatives: ['esconda'] },
      get: { primary: 'obter', alternatives: ['obtenha'] },
      wait: { primary: 'esperar', alternatives: ['espere'] },
      fetch: { primary: 'buscar', alternatives: ['busque'] },
      send: { primary: 'enviar', alternatives: ['envie'] },
      go: { primary: 'ir', alternatives: ['vá'] },
      increment: { primary: 'incrementar', alternatives: ['incremente'] },
      decrement: { primary: 'decrementar', alternatives: ['decremente'] },
      take: { primary: 'pegar', alternatives: ['pegue'] },
    },
  },
  morphologyTable,
  frames,
  defaultSubject: 'o sistema',
};
