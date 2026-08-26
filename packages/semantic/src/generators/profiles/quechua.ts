/**
 * Quechua Language Profile
 *
 * SOV word order, postpositions (suffixes), polysynthetic/agglutinative.
 * Indigenous language of the Andean region with rich morphology.
 */

import type { LanguageProfile } from './types';

export const quechuaProfile: LanguageProfile = {
  code: 'qu',
  name: 'Quechua',
  nativeName: 'Runasimi',
  direction: 'ltr',
  script: 'latin',
  wordOrder: 'SOV',
  markingStrategy: 'postposition',
  usesSpaces: true,
  verb: {
    position: 'end',
    subjectDrop: true,
  },
  references: {
    // Aligned to the i18n dict's emitted surface forms (the corpus-canonical
    // words the parser must recognize — §7l). The dict emits noqa/punta/kurku;
    // the old ñuqa/ñawpaqman/ukhu appear in ZERO corpus rows, so the put
    // destination (`noqa man` → me), the matches condition target (`punta`), and
    // the DOM body (`kurku`, for modal-open/modal-close-button/make-toast) never
    // resolved.
    me: 'noqa', // "I/me" (dict form; ñuqa is the formal spelling, unused in corpus)
    it: 'chay', // dict form for `it` (pay = he/she, not the dict's choice)
    you: 'qam', // "you"
    result: 'rurasqa',
    event: 'ruwakuq',
    target: 'punta',
    body: 'kurku',
    document: 'qillqa',
    window: 'k_iri',
    detail: 'sut_iy',
  },
  possessive: {
    marker: '-pa', // Genitive suffix
    markerPosition: 'after-object',
    // Quechua: ñuqapa value = "my value"
    keywords: {
      // Genitive forms (pronoun + -pa suffix)
      // "my" - ñuqapa, ñuqaypa
      ñuqapa: 'me',
      ñuqaypa: 'me',
      // The qu dict's `my` is the romanization noqaq — what the dot-notation
      // transformer emits into possessive-dot heads (noqaq.textContent).
      // Recognize it so the possessive matcher can assemble the property-path.
      noqaq: 'me',
      // "your" - qampa
      qampa: 'you',
      // "its/his/her" - paypa
      paypa: 'it',
      // The corpus dot-notation possessive is chaypaq (its = chay + -paq
      // genitive), which the agglutinative tokenizer SPLITS into `chay` (it) +
      // `paq` particle — so the one-token keyword lookup sees only `chay`.
      // Recognize the bare head here and skip the genitive particle via
      // `connectors` below (the same mechanism as id `saya punya X`). Guarded
      // against over-match by the matcher itself: it only fires when a
      // property-shaped token follows (`.name`), so a marked `chay ta …`
      // patient or the chayqa/chaymanta then-keywords never form a phantom
      // possessive (single tokens / particle follows).
      chay: 'it',
    },
    connectors: ['paq', 'pa'],
  },
  roleMarkers: {
    patient: { primary: 'ta', position: 'after' },
    destination: { primary: 'man', alternatives: ['pa'], position: 'after' },
    source: { primary: 'manta', position: 'after' },
    style: { primary: 'wan', position: 'after' },
    event: { primary: 'pi', position: 'after' }, // Locative: event occurs "at" (pi)
  },
  keywords: {
    toggle: { primary: "t'ikray", alternatives: ['tikray'], normalized: 'toggle' },
    add: { primary: 'yapay', alternatives: ['yapaykuy'], normalized: 'add' },
    remove: { primary: 'qichuy', alternatives: ['hurquy', 'anchuchiy'], normalized: 'remove' },
    put: { primary: 'churay', alternatives: ['tiyachiy'], normalized: 'put' },
    append: { primary: 'qatichiy', alternatives: ['qhipaman_yapay'], normalized: 'append' },
    prepend: { primary: 'ñawpachiy', normalized: 'prepend' },
    take: { primary: 'hapiy', normalized: 'take' },
    make: { primary: 'ruray', alternatives: ['kamay'], normalized: 'make' },
    clone: { primary: 'kikinchay', alternatives: [], normalized: 'clone' },
    swap: {
      primary: "t'inkuy",
      alternatives: ['rantikunakuy', 'rantin_tikray'],
      normalized: 'swap',
    },
    morph: { primary: 'tukunay', alternatives: [], normalized: 'morph' },
    set: { primary: 'churanay', alternatives: ['kamaykuy'], normalized: 'set' },
    get: { primary: 'taripay', normalized: 'get' },
    increment: { primary: 'yapachiy', normalized: 'increment' },
    decrement: { primary: 'pisiyachiy', normalized: 'decrement' },
    log: { primary: 'qillqakuy', alternatives: ['willakuy'], normalized: 'log' },
    show: { primary: 'rikuchiy', alternatives: ['qawachiy'], normalized: 'show' },
    hide: { primary: 'pakay', alternatives: ['pakakuy'], normalized: 'hide' },
    transition: { primary: 'pasay', alternatives: [], normalized: 'transition' },
    on: { primary: 'chaypim', alternatives: ['kaypi'], normalized: 'on' },
    trigger: { primary: 'kuyuchiy', alternatives: ['kichay'], normalized: 'trigger' },
    send: { primary: 'kachay', alternatives: ['apachiy'], normalized: 'send' },
    focus: { primary: 'qhawachiy', alternatives: ['qhaway'], normalized: 'focus' },
    blur: { primary: 'paqariy', alternatives: ['mana qhawachiy'], normalized: 'blur' },
    // Phase 1 (v0.9.90): DOM / form state / debug
    // Batch 3: apostrophe-less chusaq added — the i18n dict renders the empty
    // COMMAND with it (its `is empty` expression word), which parsed null against
    // the ch'usaq-only command patterns.
    empty: { primary: "ch'usaq", alternatives: ['chusaq'], normalized: 'empty' },
    open: { primary: 'paskay', normalized: 'open' },
    close: { primary: 'wichqay', normalized: 'close' },
    select: { primary: 'marcay', normalized: 'select' },
    clear: { primary: 'pichay', normalized: 'clear' },
    reset: { primary: 'musuqchay', normalized: 'reset' },
    breakpoint: { primary: 'sayachinay', normalized: 'breakpoint' },
    go: { primary: 'riy', alternatives: ['puriy'], normalized: 'go' },
    scroll: { primary: 'kunray', alternatives: [], normalized: 'scroll' },
    push: { primary: 'tanqay', normalized: 'push' },
    replace: { primary: 'tikray_url', alternatives: [], normalized: 'replace' },
    process: { primary: 'rurariy', normalized: 'process' },
    wait: { primary: 'suyay', normalized: 'wait' },
    fetch: { primary: 'apamuy', alternatives: ['taripakaramuy'], normalized: 'fetch' },
    settle: { primary: 'tiyakuy', normalized: 'settle' },
    if: { primary: 'sichus', normalized: 'if' },
    // `mana sichus` = "if not" (Quechua has no single-word "unless"). Spaced phrase
    // so the BaseTokenizer multi-word matcher catches it longest-first — otherwise
    // the tokenizer splits it into `mana`(=false) + `sichus`(=if) and the clause
    // mis-parses as `if`. The i18n qu dict emits the same spaced form (was
    // `mana_sichus`, whose `_`-split caused exactly that drop).
    unless: { primary: 'mana sichus', normalized: 'unless' },
    when: { primary: 'maykama', normalized: 'when' },
    where: { primary: 'maypi', normalized: 'where' },
    else: { primary: 'manachus', alternatives: ['hukniraq'], normalized: 'else' },
    repeat: { primary: 'kutipay', alternatives: ['muyu'], normalized: 'repeat' },
    for: { primary: 'sapankaq', normalized: 'for' },
    while: { primary: 'kaykamaqa', normalized: 'while' },
    // `repeat forever` loop keyword — corpus word recognized so loopType types
    // as `:literal` like EN (the repeat.loopType R1 residue; see spanish.ts).
    forever: { primary: 'forever', normalized: 'forever' },
    continue: { primary: 'qatipay', normalized: 'continue' },
    halt: { primary: 'sayay', alternatives: [], normalized: 'halt' },
    throw: { primary: 'chanqay', normalized: 'throw' },
    call: { primary: 'waqyay', alternatives: ['qayay'], normalized: 'call' },
    return: { primary: 'kutichiy', alternatives: ['kutimuy'], normalized: 'return' },
    then: { primary: 'chaymantataq', alternatives: ['hinaspa', 'chaymanta'], normalized: 'then' },
    and: { primary: 'hinallataq', alternatives: ['ima', 'chaymantawan'], normalized: 'and' },
    // Comparison operator (`target matches .x`). Without this keyword the surface
    // stays an identifier and leaks verbatim into the condition's raw expression,
    // which the core expression parser reads as English (modal-close-backdrop /
    // focus-trap drop their then-branch). Not an ActionType and has no command
    // schema, so no pattern is generated from it.
    matches: { primary: 'tupan', normalized: 'matches' },
    // Existence operator (`if #modal exists`). Same seam as `matches`: without the
    // keyword the surface stays an identifier and leaks verbatim into the
    // condition's raw expression (if-exists). Neither an ActionType nor a command
    // schema, so no pattern is generated from it.
    exists: { primary: 'tiyan', normalized: 'exists' },
    // Copula (`if result is false`, `if my value is empty`). Without the keyword the
    // surface stays an identifier and leaks verbatim into the condition's raw
    // expression, which the core expression parser reads as English. Neither an
    // ActionType nor a command schema, so no pattern is generated from it.
    is: { primary: 'kanqa', normalized: 'is' },
    end: { primary: 'tukukuy', alternatives: ['tukuy', 'puchukay'], normalized: 'end' },
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'mana waqtalla', normalized: 'async' },
    tell: { primary: 'niy', alternatives: [], normalized: 'tell' },
    // The qu dict renders default as ñawpaq_kaq ("the prior one"); qallariy
    // ("to begin") kept as alternative for back-compat — but note the qu dict
    // uses qallariy for RESET, so primary must stay ñawpaq_kaq.
    default: { primary: 'ñawpaq_kaq', alternatives: ['qallariy'], normalized: 'default' },
    init: { primary: 'qallarichiy', normalized: 'init' },
    behavior: { primary: 'ruwana', normalized: 'behavior' },
    install: { primary: 'tarpuy', normalized: 'install' },
    measure: { primary: 'tupuy', normalized: 'measure' },
    beep: { primary: 'waqay', normalized: 'beep' },
    break: { primary: "p'akiy", normalized: 'break' },
    copy: { primary: 'qillqay', normalized: 'copy' },
    exit: { primary: 'lluqsiy', normalized: 'exit' },
    pick: { primary: 'akllay', normalized: 'pick' },
    render: { primary: 'rikurichiy', normalized: 'render' },
    into: { primary: 'ukuman', normalized: 'into' },
    before: { primary: 'ñawpaq', normalized: 'before' },
    after: { primary: 'qhipa', normalized: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: 'kama', alternatives: ['-kama'], normalized: 'until' },
    event: { primary: 'ruwakuq', alternatives: ['imayna'], normalized: 'event' },
    from: { primary: 'manta', alternatives: ['-manta'], normalized: 'from' },
    // Common event names (for event handler pattern matching)
    click: { primary: 'ñitiy', normalized: 'click' },
    load: { primary: 'apakuy', normalized: 'load' },
    submit: { primary: 'apaykachay', normalized: 'submit' },
    hover: { primary: 'hawachiy', normalized: 'hover' },
    input: { primary: 'yaykuchiy', normalized: 'input' },
    change: { primary: 'kambiay', normalized: 'change' },
    // Phase 8 (htmx v4 localized attributes): attribute-suffix keywords
    // used by the vocab generator — `sse-tinkiy`, `hx-kawsachkaq`, etc.
    // These are aspirational Runasimi coinages using native morphology
    // (-y infinitive, -na instrument nominalizer, -chiy causative).
    // No established Quechua ICT corpus exists to validate against.
    connect: { primary: 'tinkiy', alternatives: ['watay', 'hukllachay'], normalized: 'connect' },
    stream: {
      primary: 'phawachiy',
      alternatives: ['sururichiy', "ch'uquchiy"],
      normalized: 'stream',
    },
    live: { primary: 'kawsachkaq', alternatives: ['kunan-pacha', 'kawsay'], normalized: 'live' },
    socket: { primary: 'tinkina', alternatives: ["t'oqo", 'tinkiy-tinkina'], normalized: 'socket' },
    // Reactive / realtime commands (bind keeps the English verb; no idiomatic
    // Runasimi coinage that avoids collision with connect's `watay`)
    bind: { primary: 'bind', alternatives: ['watachiy'], normalized: 'bind' },
    intercept: { primary: "hark'ay", alternatives: ['intercept'], normalized: 'intercept' },
    worker: { primary: "llamk'aq", alternatives: ['worker'], normalized: 'worker' },
    eventsource: {
      primary: 'eventsource',
      alternatives: ['kawsay-pukyu'],
      normalized: 'eventsource',
    },
  },
  eventHandler: {
    keyword: { primary: 'pi', alternatives: ['kaqtin'] },
    sourceMarker: { primary: 'manta', position: 'after' },
    eventMarker: { primary: 'pi', alternatives: ['kaqtin', 'kaqpi'], position: 'after' },
  },
  lexicon: {
    events: {
      blur: { primary: 'paqariy' },
      change: { primary: 'kambiay' },
      click: { primary: 'ñitiy' },
      dblclick: { primary: 'dblclick' },
      focus: { primary: 'qhaway' },
      input: { primary: 'yaykuchiy' },
      keydown: { primary: 'llave uray' },
      keypress: { primary: 'keypress' },
      keyup: { primary: 'llave hawa' },
      load: { primary: 'apakuy' },
      mousedown: { primary: 'ratñitiy' },
      mouseenter: { primary: 'mouseenter' },
      mouseleave: { primary: 'mouseleave' },
      mousemove: { primary: 'mousemove' },
      mouseout: { primary: 'mouseout' },
      mouseover: { primary: 'mouseover' },
      mouseup: { primary: 'rathuqariy' },
      reset: { primary: 'musuqchay' },
      resize: { primary: 'hatun_kay' },
      scroll: { primary: 'kunray' },
      submit: { primary: 'apaykachay' },
      touchcancel: { primary: 'touchcancel' },
      touchend: { primary: 'touchend' },
      touchmove: { primary: 'touchmove' },
      touchstart: { primary: 'touchstart' },
      unload: { primary: 'unload' },
    },
    logical: {
      and: { primary: 'chaymanta' },
      changes: { primary: 'tukurikun' },
      contains: { primary: 'ukupi_kan' },
      else: { primary: 'manachus' },
      end: { primary: 'tukuy' },
      equals: { primary: 'kikin' },
      exists: { primary: 'tiyan' },
      has: { primary: 'kachkan' },
      have: { primary: 'kachkani' },
      includes: { primary: 'churasqa' },
      is: { primary: 'kanqa' },
      live: { primary: 'kawsay' },
      matches: { primary: 'tupan' },
      not: { primary: 'mana' },
      or: { primary: 'utaq' },
      otherwise: { primary: 'huk_kaqpi' },
      then: { primary: 'chayqa' },
      when: { primary: 'maykama' },
      where: { primary: 'maypi' },
    },
    temporal: {
      h: { primary: 'h' },
      hour: { primary: 'hora' },
      hours: { primary: 'horakuna' },
      millisecond: { primary: 'iskay_paqta_sikundu' },
      milliseconds: { primary: 'iskay_paqta_sikundukuna' },
      min: { primary: 'm' },
      minute: { primary: 'minutu' },
      minutes: { primary: 'minutukuna' },
      ms: { primary: 'ms' },
      s: { primary: 's' },
      second: { primary: 'sikundu' },
      seconds: { primary: 'sikundukuna' },
    },
    values: {
      body: { primary: 'kurku' },
      detail: { primary: 'sut_iy' },
      document: { primary: 'qillqa' },
      element: { primary: 'raku' },
      event: { primary: 'ruway' },
      false: { primary: 'llulla' },
      it: { primary: 'chay' },
      its: { primary: 'chaypaq' },
      me: { primary: 'noqa' },
      my: { primary: 'noqaq' },
      myself: { primary: 'noqa killa' },
      null: { primary: 'chusaq' },
      result: { primary: 'lluqsiy' },
      target: { primary: 'punta' },
      true: { primary: 'cheqaq' },
      undefined: { primary: 'mana_riqsisqa' },
      value: { primary: 'chanin' },
      window: { primary: 'k_iri' },
      you: { primary: 'qam' },
      your: { primary: 'qampaq' },
      yourself: { primary: 'qam killa' },
    },
    attributes: {
      attribute: { primary: 'kaq' },
      attributes: { primary: 'kaqkuna' },
      class: { primary: 'ayllu' },
      classes: { primary: 'ayllukuna' },
      properties: { primary: 'kanaykuna' },
      property: { primary: 'kanay' },
      style: { primary: 'sami' },
      styles: { primary: 'samikuna' },
    },
    expressions: {
      at: { primary: 'pi' },
      characters: { primary: 'sanampa' },
      children: { primary: 'wawakuna' },
      closest: { primary: 'kaylla' },
      empty: { primary: 'chusaq' },
      'ends with': { primary: 'tukusqa wan' },
      first: { primary: 'ñawpaq' },
      'ignoring case': { primary: 'hatun-huchuy qillqata-saqiy' },
      'joined by': { primary: 'huñusqa' },
      last: { primary: 'qhipa' },
      'mapped to': { primary: 'kay kaqman' },
      next: { primary: 'qhipantin' },
      no: { primary: 'mana_kanchu' },
      parent: { primary: 'mama_tayta' },
      prev: { primary: 'ñawpaq' },
      previous: { primary: 'ñawpaqnin' },
      random: { primary: 'imaymanata' },
      some: { primary: 'wakin' },
      'sorted by': { primary: 'niqpi ruwasqa' },
      'split by': { primary: 'rakisqa' },
      'starts with': { primary: 'qallarisqa wan' },
      within: { primary: 'ukupi' },
    },
  },
};
