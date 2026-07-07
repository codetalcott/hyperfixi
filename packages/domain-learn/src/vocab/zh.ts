/**
 * Chinese learn vocabulary (the 15 core verbs). Grammar comes from
 * `@lokascript/semantic`'s Chinese profile via the framework bridge;
 * morphology tables and sentence frames stay hand-authored in
 * `../profiles/zh.ts`.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const zhVocabulary: DomainVocabulary = {
  keywords: {
    add: { primary: '添加' },
    remove: { primary: '移除' },
    toggle: { primary: '切换' },
    put: { primary: '放置' },
    set: { primary: '设置' },
    show: { primary: '显示' },
    hide: { primary: '隐藏' },
    get: { primary: '获取' },
    wait: { primary: '等待' },
    fetch: { primary: '抓取' },
    send: { primary: '发送' },
    go: { primary: '前往' },
    increment: { primary: '增加' },
    decrement: { primary: '减少' },
    take: { primary: '拿取' },
  },
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
