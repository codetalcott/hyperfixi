/**
 * JSX Command Schemas
 *
 * Defines the semantic structure of JSX/React commands using the framework's
 * defineCommand/defineRole helpers. Each schema specifies roles (tag, props,
 * children, etc.) and per-language marker overrides.
 *
 * Commands:
 *  - element   — Create a JSX element
 *  - component — Define a React component
 *  - render    — Render a component into the DOM
 *  - state     — Declare a useState hook
 *  - effect    — Declare a useEffect hook
 *  - fragment  — Group elements in a React fragment
 */

import { defineCommand, defineRole } from '@lokascript/framework';

// =============================================================================
// ELEMENT — Create a JSX element
// EN: element div with className "app"
// ES: elemento div con className "app"
// JA: div className で 要素
// AR: عنصر div مع className "app"
// =============================================================================

export const elementSchema = defineCommand({
  action: 'element',
  description: 'Create a JSX element with tag, props, and optional children',
  category: 'jsx',
  primaryRole: 'tag',
  roles: [
    defineRole({
      role: 'tag',
      description: 'HTML tag or component name',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 2,
    }),
    defineRole({
      role: 'props',
      description: 'Element properties/attributes',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
      markerOverride: { en: 'with', es: 'con', ja: 'で', ar: 'مع' },
    }),
    defineRole({
      role: 'children',
      description: 'Child elements or text content',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 0,
      sovPosition: 0,
      markerOverride: { en: 'containing', es: 'conteniendo', ja: '内容', ar: 'يحتوي' },
    }),
  ],
});

// =============================================================================
// COMPONENT — Define a React component
// EN: component Button with props text onClick
// ES: componente Button con props text onClick
// JA: Button text プロパティ コンポーネント
// AR: مكوّن Button مع خصائص text onClick
// =============================================================================

export const componentSchema = defineCommand({
  action: 'component',
  description: 'Define a React function component',
  category: 'jsx',
  primaryRole: 'name',
  roles: [
    defineRole({
      role: 'name',
      description: 'Component name (PascalCase)',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 2,
    }),
    defineRole({
      role: 'props',
      description: 'Component prop definitions',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
      markerOverride: { en: 'with props', es: 'con props', ja: 'プロパティ', ar: 'مع خصائص' },
    }),
    defineRole({
      role: 'children',
      description: 'Component body / return value',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 0,
      sovPosition: 0,
      markerOverride: { en: 'returning', es: 'retornando', ja: '返す', ar: 'يُرجع' },
    }),
  ],
});

// =============================================================================
// RENDER — Render a component into the DOM
// EN: render App into root
// ES: renderizar App en root
// JA: root に App 描画
// AR: ارسم App في root
// =============================================================================

export const renderSchema = defineCommand({
  action: 'render',
  description: 'Render a React component into a DOM element',
  category: 'jsx',
  primaryRole: 'source',
  roles: [
    defineRole({
      role: 'source',
      description: 'Component to render',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 1,
    }),
    defineRole({
      role: 'destination',
      description: 'Target DOM element or container ID',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 2,
      markerOverride: { en: 'into', es: 'en', ja: 'に', ar: 'في' },
    }),
  ],
});

// =============================================================================
// STATE — Declare a useState hook
// EN: state count initial 0
// ES: estado count inicial 0
// JA: count 0 初期値 状態
// AR: حالة count ابتدائي 0
// =============================================================================

export const stateSchema = defineCommand({
  action: 'state',
  description: 'Declare a React useState hook with name and initial value',
  category: 'hooks',
  primaryRole: 'name',
  roles: [
    defineRole({
      role: 'name',
      description: 'State variable name',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 2,
    }),
    defineRole({
      role: 'initial',
      description: 'Initial state value',
      required: false,
      expectedTypes: ['expression', 'literal'],
      svoPosition: 1,
      sovPosition: 1,
      markerOverride: { en: 'initial', es: 'inicial', ja: '初期値', ar: 'ابتدائي' },
    }),
  ],
});

// =============================================================================
// EFFECT — Declare a useEffect hook
// EN: effect fetchData on count
// ES: efecto fetchData en count
// JA: count で fetchData エフェクト
// AR: تأثير fetchData عند count
// =============================================================================

export const effectSchema = defineCommand({
  action: 'effect',
  description: 'Declare a React useEffect hook with callback and dependencies',
  category: 'hooks',
  primaryRole: 'callback',
  roles: [
    defineRole({
      role: 'callback',
      description: 'Effect callback function or action',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 1,
    }),
    defineRole({
      role: 'deps',
      description: 'Dependency array for the effect',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 2,
      markerOverride: { en: 'on', es: 'en', ja: 'で', ar: 'عند' },
    }),
  ],
});

// =============================================================================
// FRAGMENT — Group elements in a React fragment
// EN: fragment header footer
// ES: fragmento header footer
// JA: header footer フラグメント
// AR: جزء header footer
// =============================================================================

export const fragmentSchema = defineCommand({
  action: 'fragment',
  description: 'Group multiple elements in a React fragment',
  category: 'jsx',
  primaryRole: 'children',
  roles: [
    defineRole({
      role: 'children',
      description: 'Child elements to group',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
    }),
  ],
});

// =============================================================================
// All Schemas
// =============================================================================

export const allSchemas = [
  elementSchema,
  componentSchema,
  renderSchema,
  stateSchema,
  effectSchema,
  fragmentSchema,
];
