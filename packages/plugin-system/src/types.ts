/**
 * Plugin Types for Hyperfixi
 * Inspired by Datastar's plugin architecture
 */

import type { 
  ExecutionContext, 
  ASTNode,
  CommandNode,
  ExpressionNode 
} from '@hyperfixi/core';

export type PluginType = 'command' | 'feature' | 'transform' | 'runtime';
export type Requirement = 'allowed' | 'required' | 'denied' | 'exclusive';

/**
 * Base plugin interface
 */
export interface HyperfixiPlugin {
  type: PluginType;
  name: string;
  version?: string;
  dependencies?: string[];
}

/**
 * Command Plugin - Handles hyperscript commands like 'on', 'send', 'toggle'
 */
export interface CommandPlugin extends HyperfixiPlugin {
  type: 'command';
  pattern: RegExp | string;
  keyReq?: Requirement;
  valueReq?: Requirement;
  parse?: (ctx: ParseContext) => CommandNode | null;
  execute: (ctx: RuntimeContext) => Promise<void> | void;
}

/**
 * Feature Plugin - Adds new capabilities like behaviors, sockets
 */
export interface FeaturePlugin extends HyperfixiPlugin {
  type: 'feature';
  onGlobalInit?: (ctx: InitContext) => void;
  onElementInit?: (ctx: ElementContext) => void | (() => void);
  enhanceContext?: (ctx: ExecutionContext) => ExecutionContext;
}

/**
 * Transform Plugin - Modifies AST during parsing
 */
export interface TransformPlugin extends HyperfixiPlugin {
  type: 'transform';
  transformNode?: (node: ASTNode, ctx: TransformContext) => ASTNode | null;
  transformExpression?: (expr: ExpressionNode, ctx: TransformContext) => ExpressionNode;
}

/**
 * Runtime Plugin - Extends runtime capabilities
 */
export interface RuntimePlugin extends HyperfixiPlugin {
  type: 'runtime';
  interceptCommand?: (command: string, ctx: RuntimeContext) => boolean;
  beforeExecute?: (ctx: RuntimeContext) => void;
  afterExecute?: (ctx: RuntimeContext) => void;
}

export type Plugin = CommandPlugin | FeaturePlugin | TransformPlugin | RuntimePlugin;

/**
 * Context types for different plugin stages
 */
export interface InitContext {
  plugins: Map<string, Plugin>;
  registerCommand: (name: string, handler: CommandHandler) => void;
  registerFeature: (name: string, feature: FeatureDefinition) => void;
}

export interface ParseContext {
  input: string;
  position: number;
  tokens: Token[];
  currentToken: Token;
}

export interface RuntimeContext extends ExecutionContext {
  plugin: Plugin;
  element: Element;
  args: any[];
  modifiers: Map<string, Set<string>>;
}

export interface ElementContext {
  element: Element;
  attribute: string;
  value: string;
  cleanup: (fn: () => void) => void;
}

export interface TransformContext {
  ast: ASTNode;
  phase: 'parse' | 'optimize' | 'generate';
}

/**
 * Plugin utilities
 */
export interface CommandHandler {
  (ctx: RuntimeContext): Promise<void> | void;
}

export interface FeatureDefinition {
  name: string;
  init?: (ctx: ElementContext) => void;
  destroy?: () => void;
}

export interface Token {
  type: string;
  value: string;
  position: number;
}

/**
 * Plugin Registry
 */
export interface PluginRegistry {
  load(...plugins: Plugin[]): void;
  unload(pluginName: string): void;
  get(pluginName: string): Plugin | undefined;
  getByType<T extends Plugin>(type: PluginType): T[];
  apply(element?: Element): void;
}
