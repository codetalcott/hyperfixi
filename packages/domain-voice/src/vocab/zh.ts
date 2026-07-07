/**
 * Chinese voice vocabulary. Grammar (SVO, CJK script) comes from
 * `@lokascript/semantic`'s Chinese profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const zhVocabulary: DomainVocabulary = {
  keywords: {
    navigate: { primary: '导航' },
    click: { primary: '点击' },
    type: { primary: '输入' },
    scroll: { primary: '滚动' },
    read: { primary: '朗读' },
    zoom: { primary: '缩放' },
    select: { primary: '选择' },
    back: { primary: '返回' },
    forward: { primary: '前进' },
    focus: { primary: '聚焦' },
    close: { primary: '关闭' },
    open: { primary: '打开' },
    search: { primary: '搜索' },
    help: { primary: '帮助' },
  },
  tokenizerKeywords: [
    '到',
    '在',
    '幅',
    '上',
    '下',
    '左',
    '右',
    '全部',
    '标签',
    '对话框',
    '页面',
    '放大',
    '缩小',
    '重置',
  ],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
