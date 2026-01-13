/**
 * Thai Language Profile
 *
 * SVO word order, prepositions, Thai script.
 * Isolating language (like Chinese) with no inflection.
 */

import type { LanguageProfile } from './types';

export const thaiProfile: LanguageProfile = {
  code: 'th',
  name: 'Thai',
  nativeName: 'ไทย',
  direction: 'ltr',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: false, // Thai doesn't use spaces between words
  defaultVerbForm: 'base',
  verb: {
    position: 'second',
    subjectDrop: true,
  },
  references: {
    me: 'ฉัน',
    it: 'มัน',
    you: 'คุณ',
    result: 'ผลลัพธ์',
    event: 'เหตุการณ์',
    target: 'เป้าหมาย',
    body: 'บอดี้',
  },
  possessive: {
    marker: 'ของ',
    markerPosition: 'between',
  },
  roleMarkers: {
    patient: { primary: '', position: 'before' }, // Thai is isolating - no case markers
    destination: { primary: 'ใน', alternatives: ['ไปยัง'], position: 'before' },
    source: { primary: 'จาก', position: 'before' },
    style: { primary: 'ด้วย', position: 'before' },
    event: { primary: 'เมื่อ', position: 'before' },
  },
  keywords: {
    // Class/Attribute operations
    toggle: { primary: 'สลับ', alternatives: [], normalized: 'toggle' },
    add: { primary: 'เพิ่ม', alternatives: [], normalized: 'add' },
    remove: { primary: 'ลบ', alternatives: ['ลบออก'], normalized: 'remove' },
    // Content operations
    put: { primary: 'ใส่', alternatives: ['วาง'], normalized: 'put' },
    append: { primary: 'เพิ่มท้าย', alternatives: [], normalized: 'append' },
    prepend: { primary: 'เพิ่มหน้า', alternatives: [], normalized: 'prepend' },
    take: { primary: 'รับ', alternatives: [], normalized: 'take' },
    make: { primary: 'สร้าง', alternatives: [], normalized: 'make' },
    clone: { primary: 'คัดลอก', alternatives: ['สำเนา'], normalized: 'clone' },
    swap: { primary: 'สลับที่', alternatives: [], normalized: 'swap' },
    morph: { primary: 'แปลงร่าง', alternatives: [], normalized: 'morph' },
    // Variable operations
    set: { primary: 'ตั้ง', alternatives: ['กำหนด'], normalized: 'set' },
    get: { primary: 'รับค่า', alternatives: [], normalized: 'get' },
    increment: { primary: 'เพิ่มค่า', alternatives: [], normalized: 'increment' },
    decrement: { primary: 'ลดค่า', alternatives: [], normalized: 'decrement' },
    log: { primary: 'บันทึก', alternatives: [], normalized: 'log' },
    // Visibility
    show: { primary: 'แสดง', alternatives: [], normalized: 'show' },
    hide: { primary: 'ซ่อน', alternatives: [], normalized: 'hide' },
    transition: { primary: 'เปลี่ยน', alternatives: [], normalized: 'transition' },
    // Events
    on: { primary: 'เมื่อ', alternatives: ['ตอน'], normalized: 'on' },
    trigger: { primary: 'ทริกเกอร์', alternatives: [], normalized: 'trigger' },
    send: { primary: 'ส่ง', alternatives: [], normalized: 'send' },
    // DOM focus
    focus: { primary: 'โฟกัส', alternatives: [], normalized: 'focus' },
    blur: { primary: 'เบลอ', alternatives: [], normalized: 'blur' },
    // Navigation
    go: { primary: 'ไป', alternatives: ['ไปที่'], normalized: 'go' },
    // Async
    wait: { primary: 'รอ', alternatives: [], normalized: 'wait' },
    fetch: { primary: 'ดึงข้อมูล', alternatives: [], normalized: 'fetch' },
    settle: { primary: 'คงที่', alternatives: [], normalized: 'settle' },
    // Control flow
    if: { primary: 'ถ้า', alternatives: ['หาก'], normalized: 'if' },
    when: { primary: 'เมื่อ', normalized: 'when' },
    where: { primary: 'ที่ไหน', normalized: 'where' },
    else: { primary: 'ไม่งั้น', alternatives: ['ไม่เช่นนั้น'], normalized: 'else' },
    repeat: { primary: 'ทำซ้ำ', alternatives: [], normalized: 'repeat' },
    for: { primary: 'สำหรับ', alternatives: [], normalized: 'for' },
    while: { primary: 'ในขณะที่', alternatives: [], normalized: 'while' },
    continue: { primary: 'ต่อไป', alternatives: [], normalized: 'continue' },
    halt: { primary: 'หยุด', alternatives: [], normalized: 'halt' },
    throw: { primary: 'โยน', alternatives: [], normalized: 'throw' },
    call: { primary: 'เรียก', alternatives: [], normalized: 'call' },
    return: { primary: 'คืนค่า', alternatives: ['กลับ'], normalized: 'return' },
    then: { primary: 'แล้ว', alternatives: [], normalized: 'then' },
    and: { primary: 'และ', alternatives: [], normalized: 'and' },
    end: { primary: 'จบ', alternatives: [], normalized: 'end' },
    // Advanced
    js: { primary: 'เจเอส', alternatives: ['js'], normalized: 'js' },
    async: { primary: 'อะซิงค์', alternatives: [], normalized: 'async' },
    tell: { primary: 'บอก', alternatives: [], normalized: 'tell' },
    default: { primary: 'ค่าเริ่มต้น', alternatives: [], normalized: 'default' },
    init: { primary: 'เริ่มต้น', alternatives: [], normalized: 'init' },
    behavior: { primary: 'พฤติกรรม', alternatives: [], normalized: 'behavior' },
    install: { primary: 'ติดตั้ง', alternatives: [], normalized: 'install' },
    measure: { primary: 'วัด', alternatives: [], normalized: 'measure' },
    // Modifiers
    into: { primary: 'ใน', alternatives: [], normalized: 'into' },
    before: { primary: 'ก่อน', alternatives: [], normalized: 'before' },
    after: { primary: 'หลัง', alternatives: [], normalized: 'after' },
    until: { primary: 'จนถึง', alternatives: [], normalized: 'until' },
    event: { primary: 'เหตุการณ์', alternatives: [], normalized: 'event' },
    from: { primary: 'จาก', normalized: 'from' },
  },
  tokenization: {
    boundaryStrategy: 'character', // Character-based like Chinese/Japanese
  },
  eventHandler: {
    keyword: { primary: 'เมื่อ', alternatives: ['ตอน'], normalized: 'on' },
    sourceMarker: { primary: 'จาก', position: 'before' },
  },
};
