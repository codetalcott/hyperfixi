/**
 * Multilingual Server Plugin Examples
 *
 * This file demonstrates practical usage patterns for the multilingual server plugin.
 * Each example shows the same functionality expressed in different languages.
 */

import {
  createMultilingualServerPlugin,
  type MultilingualCommand,
  type MultilingualKeywordMap,
  type LanguageCode,
} from './index';
import { definePlugin } from '../index';
import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

// ============================================================================
// Example 1: Database Query Command (Multilingual)
// ============================================================================

/**
 * Keywords for 'query' command
 */
const queryKeywords: MultilingualKeywordMap = {
  en: { primary: 'query', alternatives: ['fetch', 'select'] },
  ja: { primary: 'クエリ', alternatives: ['取得', '検索'] },
  ko: { primary: '쿼리', alternatives: ['조회', '검색'] },
  es: { primary: 'consultar', alternatives: ['buscar', 'obtener'] },
  ar: { primary: 'استعلام', alternatives: ['جلب', 'بحث'] },
  zh: { primary: '查询', alternatives: ['获取', '搜索'] },
  fr: { primary: 'requête', alternatives: ['rechercher', 'obtenir'] },
  de: { primary: 'abfragen', alternatives: ['suchen', 'holen'] },
};

/**
 * Multilingual database query command
 *
 * Usage examples:
 *   English:  query users where active = true
 *   Japanese: ユーザー を クエリ where active = true
 *   Spanish:  consultar usuarios donde active = true
 *   Arabic:   استعلام المستخدمين حيث active = true
 */
export const queryCommand: MultilingualCommand = {
  name: 'query',
  keywords: queryKeywords,

  semanticRoles: {
    primary: 'patient', // The table/collection to query
    optional: ['condition', 'destination'], // WHERE clause, result destination
  },

  metadata: {
    description: 'Query a database table or collection',
    syntax: ['query <table> [where <condition>]', 'query <table> into <variable>'],
    examples: [
      'query users where active = true',
      'クエリ ユーザー where active = true',
      'consultar usuarios donde active = true',
    ],
    category: 'server',
  },

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, unknown> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ) {
    // Semantic parser has already extracted roles from any language
    return {
      table: raw.args[0] ? await evaluator.evaluate(raw.args[0], context) : null,
      condition: raw.modifiers?.where,
      destination: raw.modifiers?.into,
    };
  },

  async execute(
    input: { table: unknown; condition: unknown; destination: unknown },
    context: TypedExecutionContext
  ) {
    // Get database from context
    const db = context.locals.get('database');
    if (!db) {
      throw new Error('Database not available in context');
    }

    // Execute query (placeholder implementation)
    const result = { table: input.table, condition: input.condition };

    // Store in destination if specified
    if (input.destination && typeof input.destination === 'string') {
      context.locals.set(input.destination, result);
    }

    return result;
  },
};

// ============================================================================
// Example 2: Send Email Command (Multilingual)
// ============================================================================

const sendEmailKeywords: MultilingualKeywordMap = {
  en: { primary: 'sendEmail', alternatives: ['email', 'mail'] },
  ja: { primary: 'メール送信', alternatives: ['メールを送る', 'Eメール'] },
  ko: { primary: '이메일전송', alternatives: ['메일보내기'] },
  es: { primary: 'enviarCorreo', alternatives: ['correo', 'email'] },
  ar: { primary: 'إرسال_بريد', alternatives: ['بريد'] },
  zh: { primary: '发送邮件', alternatives: ['邮件', '电子邮件'] },
};

/**
 * Multilingual email sending command
 *
 * Usage examples:
 *   English:  sendEmail to user@example.com with subject "Hello"
 *   Japanese: user@example.com に メール送信 with subject "こんにちは"
 *   Spanish:  enviarCorreo a user@example.com con asunto "Hola"
 */
export const sendEmailCommand: MultilingualCommand = {
  name: 'sendEmail',
  keywords: sendEmailKeywords,

  semanticRoles: {
    primary: 'destination', // Email recipient
    optional: ['content', 'source'], // Email body, from address
  },

  metadata: {
    description: 'Send an email',
    category: 'server',
  },

  async parseInput(raw, evaluator, context) {
    return {
      to: raw.args[0] ? await evaluator.evaluate(raw.args[0], context) : null,
      subject: raw.modifiers?.subject,
      body: raw.modifiers?.body ?? raw.modifiers?.with,
      from: raw.modifiers?.from,
    };
  },

  async execute(
    input: { to: unknown; subject: unknown; body: unknown; from: unknown },
    context: TypedExecutionContext
  ) {
    const mailer = context.locals.get('mailer');
    if (!mailer) {
      throw new Error('Mailer not available in context');
    }

    return {
      sent: true,
      to: input.to,
      subject: input.subject,
    };
  },
};

// ============================================================================
// Example 3: Log Command (Multilingual)
// ============================================================================

const logKeywords: MultilingualKeywordMap = {
  en: { primary: 'log', alternatives: ['print', 'output'] },
  ja: { primary: 'ログ', alternatives: ['出力', '表示'] },
  ko: { primary: '로그', alternatives: ['출력', '기록'] },
  es: { primary: 'registrar', alternatives: ['imprimir', 'mostrar'] },
  ar: { primary: 'سجل', alternatives: ['طباعة'] },
  zh: { primary: '日志', alternatives: ['打印', '输出'] },
  fr: { primary: 'enregistrer', alternatives: ['afficher'] },
  de: { primary: 'protokollieren', alternatives: ['ausgeben'] },
  ru: { primary: 'логировать', alternatives: ['вывести'] },
};

export const logCommand: MultilingualCommand = {
  name: 'log',
  keywords: logKeywords,

  metadata: {
    description: 'Log a message to server console',
    category: 'server',
  },

  async parseInput(raw, evaluator, context) {
    const args = [];
    for (const arg of raw.args || []) {
      args.push(await evaluator.evaluate(arg, context));
    }
    return { message: args.join(' '), level: raw.modifiers?.level ?? 'info' };
  },

  async execute(input: { message: string; level: string }, context: TypedExecutionContext) {
    const logger = context.locals.get('logger') ?? console;
    const level = input.level as 'info' | 'warn' | 'error' | 'debug';

    if (typeof (logger as Console)[level] === 'function') {
      (logger as Console)[level](input.message);
    } else {
      console.log(input.message);
    }

    return { logged: true, message: input.message };
  },
};

// ============================================================================
// Example 4: Cache Command (Multilingual)
// ============================================================================

const cacheKeywords: MultilingualKeywordMap = {
  en: { primary: 'cache', alternatives: ['store', 'save'] },
  ja: { primary: 'キャッシュ', alternatives: ['保存', '格納'] },
  ko: { primary: '캐시', alternatives: ['저장'] },
  es: { primary: 'almacenar', alternatives: ['guardar', 'caché'] },
  ar: { primary: 'تخزين', alternatives: ['حفظ'] },
  zh: { primary: '缓存', alternatives: ['存储', '保存'] },
};

export const cacheCommand: MultilingualCommand = {
  name: 'cache',
  keywords: cacheKeywords,

  semanticRoles: {
    primary: 'patient', // What to cache
    optional: ['destination', 'quantity'], // Key name, TTL
  },

  metadata: {
    description: 'Store data in cache',
    category: 'server',
  },

  async parseInput(raw, evaluator, context) {
    return {
      value: raw.args[0] ? await evaluator.evaluate(raw.args[0], context) : null,
      key: raw.modifiers?.as ?? raw.modifiers?.key,
      ttl: raw.modifiers?.for ?? raw.modifiers?.ttl,
    };
  },

  async execute(
    input: { value: unknown; key: unknown; ttl: unknown },
    context: TypedExecutionContext
  ) {
    const cache = context.locals.get('cache');
    if (!cache) {
      throw new Error('Cache not available in context');
    }

    return { cached: true, key: input.key };
  },
};

// ============================================================================
// Example 5: Complete Server Plugin
// ============================================================================

/**
 * Complete multilingual server plugin with all example commands
 *
 * @example
 * import { completeServerPlugin } from '@hyperfixi/core/registry/multilingual/examples';
 * import { getDefaultRegistry } from '@hyperfixi/core/registry';
 *
 * getDefaultRegistry().use(completeServerPlugin);
 *
 * // Now hyperscript in any language works:
 * // Japanese: リクエスト で ユーザー を クエリ
 * // Spanish:  en solicitud consultar usuarios
 */
export const completeServerPlugin = definePlugin({
  name: 'hyperfixi-server-complete',
  version: '1.0.0',

  commands: [
    queryCommand as never,
    sendEmailCommand as never,
    logCommand as never,
    cacheCommand as never,
  ],

  contextProviders: [
    {
      name: 'database',
      provide: ctx => ctx.locals.get('database') ?? ctx.globals.get('database'),
      options: { description: 'Database connection', cache: true },
    },
    {
      name: 'cache',
      provide: ctx => ctx.locals.get('cache') ?? ctx.globals.get('cache'),
      options: { description: 'Cache store', cache: true },
    },
    {
      name: 'logger',
      provide: () => console,
      options: { description: 'Server logger', cache: true },
    },
  ],

  setup(registry) {
    console.log('[hyperfixi-server-complete] Server plugin loaded with multilingual support');
  },
});

// ============================================================================
// Example 6: Usage Patterns by Language
// ============================================================================

/**
 * Example hyperscript patterns in different languages
 *
 * These show how the same server-side logic is expressed across languages.
 * The semantic parser extracts the same roles regardless of source language.
 */
export const usageExamples = {
  /**
   * English (SVO - Subject-Verb-Object)
   */
  english: `
    on request(GET, /api/users)
      query users where active = true
      respond with <json> it </json>
    end

    on request(POST, /api/users)
      set user to request.body
      log "Creating user: " + user.name
      cache user as user.id
      respond with status 201 and <json> user </json>
    end
  `,

  /**
   * Japanese (SOV - Subject-Object-Verb)
   * Particles mark semantic roles: を (patient), に (destination), で (event)
   */
  japanese: `
    リクエスト(GET, /api/users) で
      ユーザー を クエリ where active = true
      それ を <json> で 応答
    終わり

    リクエスト(POST, /api/users) で
      request.body を user に 設定
      "ユーザー作成: " + user.name を ログ
      user を user.id として キャッシュ
      status 201 で user を <json> で 応答
    終わり
  `,

  /**
   * Spanish (SVO - Subject-Verb-Object)
   */
  spanish: `
    en solicitud(GET, /api/usuarios)
      consultar usuarios donde active = true
      responder con <json> ello </json>
    fin

    en solicitud(POST, /api/usuarios)
      asignar usuario a request.body
      registrar "Creando usuario: " + usuario.nombre
      almacenar usuario como usuario.id
      responder con status 201 y <json> usuario </json>
    fin
  `,

  /**
   * Arabic (VSO - Verb-Subject-Object)
   * Read right-to-left, verb comes first
   */
  arabic: `
    على طلب(GET، /api/users)
      استعلام المستخدمين حيث active = true
      رد مع <json> it </json>
    نهاية

    على طلب(POST، /api/users)
      عيّن المستخدم إلى request.body
      سجل "إنشاء مستخدم: " + user.name
      خزّن المستخدم كـ user.id
      رد مع حالة 201 و <json> المستخدم </json>
    نهاية
  `,

  /**
   * Korean (SOV - Subject-Object-Verb)
   * Particles mark roles: 를/을 (patient), 에 (destination), 로 (manner)
   */
  korean: `
    요청(GET, /api/users) 에서
      사용자들을 쿼리 where active = true
      그것을 <json>으로 응답
    끝

    요청(POST, /api/users) 에서
      request.body를 user에 설정
      "사용자 생성: " + user.name을 로그
      user를 user.id로 캐시
      상태 201과 <json> user </json>로 응답
    끝
  `,

  /**
   * Chinese (SVO - Subject-Verb-Object)
   */
  chinese: `
    在请求(GET, /api/users)时
      查询 用户 where active = true
      响应 用 <json> 它 </json>
    结束

    在请求(POST, /api/users)时
      设置 用户 为 request.body
      日志 "创建用户: " + user.name
      缓存 用户 为 user.id
      响应 状态 201 用 <json> 用户 </json>
    结束
  `,
};

// ============================================================================
// Example 7: Framework Integration Pattern
// ============================================================================

/**
 * Express.js integration example
 *
 * Shows how to set up the multilingual server plugin with Express.
 */
export const expressIntegration = `
import express from 'express';
import { getDefaultRegistry } from '@hyperfixi/core/registry';
import { createMultilingualServerPlugin } from '@hyperfixi/core/registry/multilingual';
import { createRequestEventSource } from '@hyperfixi/core/registry/examples/server-event-source';

const app = express();
const registry = getDefaultRegistry();

// Install multilingual server plugin
const serverPlugin = createMultilingualServerPlugin({
  languages: ['en', 'ja', 'es', 'ar'],
});
registry.use(serverPlugin);

// Create and register request event source
const requestSource = createRequestEventSource();
registry.eventSources.register('request', requestSource);

// Middleware to inject context
app.use((req, res, next) => {
  // Register request/response in context
  registry.context.register('request', () => req);
  registry.context.register('response', () => res);
  next();
});

// Route hyperscript handler
app.use('/api/*', (req, res) => {
  const handled = requestSource.handleRequest(
    {
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      params: req.params,
      headers: req.headers,
      body: req.body,
    },
    {
      status: (code) => { res.status(code); return res; },
      header: (name, value) => { res.set(name, value); return res; },
      json: (data) => res.json(data),
      html: (content) => res.send(content),
      text: (content) => res.send(content),
      redirect: (url, code) => res.redirect(code ?? 302, url),
      send: (data) => res.send(data),
    }
  );

  if (!handled) {
    res.status(404).json({ error: 'Not found' });
  }
});
`;
