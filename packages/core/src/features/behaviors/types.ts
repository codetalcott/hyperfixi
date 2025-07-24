/**
 * Behavior System Type Definitions
 * Types for _hyperscript behavior definitions and installation
 */

import type { ExecutionContext } from '../../types/core.js';

export interface BehaviorDefinition {
  name: string;
  parameters: string[];
  initBlock?: BehaviorBlock;
  eventHandlers: EventHandlerDefinition[];
}

export interface BehaviorBlock {
  commands: any[]; // Will be parsed hyperscript commands
}

export interface EventHandlerDefinition {
  event: string;
  eventSource?: string; // For "from" syntax like "on click from button"
  commands: any[]; // Will be parsed hyperscript commands
}

export interface BehaviorInstance {
  definition: BehaviorDefinition;
  element: HTMLElement;
  parameterValues: Map<string, any>;
  isInitialized: boolean;
  eventListeners: Map<string, EventListener>;
}

export interface BehaviorRegistry {
  define(behavior: BehaviorDefinition): void;
  get(name: string): BehaviorDefinition | undefined;
  install(behaviorName: string, element: HTMLElement, parameters?: Record<string, any>): Promise<BehaviorInstance>;
  uninstall(behaviorName: string, element: HTMLElement): void;
  getInstalled(element: HTMLElement): BehaviorInstance[];
}

export interface BehaviorParser {
  parse(behaviorCode: string): BehaviorDefinition;
  parseParameters(paramString: string): string[];
  parseInitBlock(initCode: string): BehaviorBlock;
  parseEventHandler(handlerCode: string): EventHandlerDefinition;
}

export interface InstallCommand {
  behaviorName: string;
  parameters: Record<string, any>;
}