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
  wordOrder: 'SOV',
  markingStrategy: 'postposition',
  usesSpaces: true,
  verb: {
    position: 'end',
    subjectDrop: true,
  },
  references: {
    me: 'ñuqa', // "I/me"
    it: 'pay', // "it/he/she" (same pronoun)
    you: 'qam', // "you"
    result: 'rurasqa',
    event: 'ruwakuq',
    target: 'ñawpaqman',
    body: 'ukhu',
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
      // "your" - qampa
      qampa: 'you',
      // "its/his/her" - paypa
      paypa: 'it',
    },
  },
  roleMarkers: {
    patient: { primary: 'ta', position: 'after' },
    destination: { primary: 'man', alternatives: ['pa'], position: 'after' },
    source: { primary: 'manta', position: 'after' },
    style: { primary: 'wan', position: 'after' },
    event: { primary: 'ta', position: 'after' }, // Event as accusative
  },
  keywords: {
    toggle: { primary: "t'ikray", alternatives: ['tikray', 'kutichiy'], normalized: 'toggle' },
    add: { primary: 'yapay', alternatives: ['yapaykuy'], normalized: 'add' },
    remove: { primary: 'qichuy', alternatives: ['hurquy', 'anchuchiy'], normalized: 'remove' },
    put: { primary: 'churay', alternatives: ['tiyachiy'], normalized: 'put' },
    append: { primary: 'qatichiy', normalized: 'append' },
    prepend: { primary: 'ñawpachiy', normalized: 'prepend' },
    take: { primary: 'hapiy', normalized: 'take' },
    make: { primary: 'ruray', alternatives: ['kamay'], normalized: 'make' },
    clone: { primary: 'kikinchay', alternatives: ['qillqay'], normalized: 'clone' },
    swap: { primary: "t'inkuy", alternatives: ['rantikunakuy'], normalized: 'swap' },
    morph: { primary: 'tikray', alternatives: ['kutichiy'], normalized: 'morph' },
    set: { primary: 'churay', alternatives: ['kamaykuy'], normalized: 'set' },
    get: { primary: 'taripay', normalized: 'get' },
    increment: { primary: 'yapachiy', normalized: 'increment' },
    decrement: { primary: 'pisiyachiy', normalized: 'decrement' },
    log: { primary: 'qillqakuy', alternatives: ['willakuy'], normalized: 'log' },
    show: { primary: 'rikuchiy', alternatives: ['qawachiy'], normalized: 'show' },
    hide: { primary: 'pakay', alternatives: ['pakakuy'], normalized: 'hide' },
    transition: { primary: 'tikray', alternatives: ['kuyuchiy'], normalized: 'transition' },
    on: { primary: 'chaypim', alternatives: ['kaypi'], normalized: 'on' },
    trigger: { primary: 'qallarichiy', normalized: 'trigger' },
    send: { primary: 'kachay', alternatives: ['apachiy'], normalized: 'send' },
    focus: { primary: 'qhawachiy', normalized: 'focus' },
    blur: { primary: 'mana qhawachiy', normalized: 'blur' },
    go: { primary: 'riy', alternatives: ['puriy'], normalized: 'go' },
    wait: { primary: 'suyay', normalized: 'wait' },
    fetch: { primary: 'apamuy', alternatives: ['taripakaramuy'], normalized: 'fetch' },
    settle: { primary: 'tiyakuy', normalized: 'settle' },
    if: { primary: 'sichus', normalized: 'if' },
    when: { primary: 'maykama', normalized: 'when' },
    where: { primary: 'maypi', normalized: 'where' },
    else: { primary: 'manachus', alternatives: ['hukniraq'], normalized: 'else' },
    repeat: { primary: 'kutipay', alternatives: ['muyu'], normalized: 'repeat' },
    for: { primary: 'sapankaq', normalized: 'for' },
    while: { primary: 'kaykamaqa', normalized: 'while' },
    continue: { primary: 'qatipay', normalized: 'continue' },
    halt: { primary: 'sayay', alternatives: ['tukuy'], normalized: 'halt' },
    throw: { primary: 'chanqay', normalized: 'throw' },
    call: { primary: 'waqyay', normalized: 'call' },
    return: { primary: 'kutichiy', alternatives: ['kutimuy'], normalized: 'return' },
    then: { primary: 'chaymantataq', alternatives: ['hinaspa', 'chaymanta'], normalized: 'then' },
    and: { primary: 'hinallataq', alternatives: ['ima', 'chaymantawan'], normalized: 'and' },
    end: { primary: 'tukukuy', alternatives: ['tukuy', 'puchukay'], normalized: 'end' },
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'mana waqtalla', normalized: 'async' },
    tell: { primary: 'niy', alternatives: ['willakuy'], normalized: 'tell' },
    default: { primary: 'qallariy', normalized: 'default' },
    init: { primary: 'qallarichiy', normalized: 'init' },
    behavior: { primary: 'ruwana', normalized: 'behavior' },
    install: { primary: 'churay', normalized: 'install' },
    measure: { primary: 'tupuy', normalized: 'measure' },
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
    submit: { primary: 'kachay', normalized: 'submit' },
    hover: { primary: 'hawachiy', normalized: 'hover' },
    input: { primary: 'yaykuchiy', normalized: 'input' },
    change: { primary: 'tikray', normalized: 'change' },
  },
  eventHandler: {
    keyword: { primary: 'pi', alternatives: ['kaqtin'] },
    sourceMarker: { primary: 'manta', position: 'after' },
    eventMarker: { primary: 'pi', alternatives: ['kaqtin', 'kaqpi'], position: 'after' },
  },
};
