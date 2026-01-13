/**
 * TypeScript definitions for HyperFixi Component Schema
 */

// Core Component Types
export type ComponentCategory =
  | 'form'
  | 'navigation'
  | 'ui-interaction'
  | 'data-display'
  | 'animation'
  | 'validation'
  | 'communication'
  | 'utility'
  | 'layout'
  | 'custom';

export type CompatibilityMode = 'modern' | 'legacy';

export type DeploymentEnvironment = 'development' | 'staging' | 'production' | 'test';

export type SupportedFramework = 'express' | 'django' | 'flask' | 'fastapi' | 'gin' | 'vanilla';

export type EventType =
  | 'click'
  | 'dblclick'
  | 'mousedown'
  | 'mouseup'
  | 'mouseover'
  | 'mouseout'
  | 'keydown'
  | 'keyup'
  | 'keypress'
  | 'focus'
  | 'blur'
  | 'change'
  | 'input'
  | 'submit'
  | 'reset'
  | 'load'
  | 'unload'
  | 'resize'
  | 'scroll'
  | 'error'
  | 'dragstart'
  | 'drag'
  | 'dragenter'
  | 'dragover'
  | 'dragleave'
  | 'drop'
  | 'dragend'
  | 'touchstart'
  | 'touchmove'
  | 'touchend'
  | 'touchcancel';

export type HyperscriptCommand =
  | 'add'
  | 'remove'
  | 'toggle'
  | 'put'
  | 'fetch'
  | 'post'
  | 'get'
  | 'delete'
  | 'trigger'
  | 'wait'
  | 'halt'
  | 'log'
  | 'call'
  | 'set'
  | 'take'
  | 'make'
  | 'hide'
  | 'show'
  | 'fadeIn'
  | 'fadeOut'
  | 'slideUp'
  | 'slideDown';

export type VariableType = 'string' | 'number' | 'boolean' | 'array' | 'object';

// Template Variable Definition
export interface TemplateVariable {
  type: VariableType;
  default?: any;
  description?: string;
  required?: boolean;
}

// Template Slot Definition
export interface TemplateSlot {
  description?: string;
  required?: boolean;
  default?: string;
}

// Template Definition
export interface ComponentTemplate {
  html?: string;
  variables?: Record<string, TemplateVariable>;
  slots?: Record<string, TemplateSlot>;
}

// Dependencies
export interface ComponentDependencies {
  components?: string[];
  css?: string[];
  javascript?: string[];
}

// Compilation Configuration
export interface CompilationConfig {
  minify?: boolean;
  compatibility?: CompatibilityMode;
  sourceMap?: boolean;
  optimization?: boolean;
}

// Deployment Configuration
export interface DeploymentConfig {
  environments?: DeploymentEnvironment[];
  frameworks?: SupportedFramework[];
}

// Component Configuration
export interface ComponentConfiguration {
  compilation?: CompilationConfig;
  deployment?: DeploymentConfig;
}

// Usage Example
export interface ComponentExample {
  name: string;
  description?: string;
  html: string;
  variables?: Record<string, any>;
}

// Component Metadata
export interface ComponentMetadata {
  author?: string;
  license?: string;
  repository?: string;
  documentation?: string;
  examples?: ComponentExample[];
  keywords?: string[];
  created?: string;
  updated?: string;
}

// Validation Metadata
export interface ComponentValidation {
  events?: EventType[];
  selectors?: string[];
  commands?: HyperscriptCommand[];
  complexity?: number;
}

// Unit Test Definition
export interface ComponentUnitTest {
  name: string;
  description?: string;
  setup?: string;
  action: string;
  expected: string;
}

// Integration Test Definition
export interface ComponentIntegrationTest {
  name: string;
  description?: string;
  scenario: string;
  steps: string[];
}

// Testing Configuration
export interface ComponentTesting {
  unit?: ComponentUnitTest[];
  integration?: ComponentIntegrationTest[];
}

// Main Component Definition
export interface ComponentDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  category?: ComponentCategory;
  tags?: string[];
  hyperscript: string | string[];
  template?: ComponentTemplate;
  dependencies?: ComponentDependencies;
  configuration?: ComponentConfiguration;
  metadata?: ComponentMetadata;
  validation?: ComponentValidation;
  testing?: ComponentTesting;
}

// Collection Dependencies
export interface CollectionDependency {
  name: string;
  version: string;
  source?: string;
}

export interface ExternalDependencies {
  css?: string[];
  javascript?: string[];
}

export interface CollectionDependencies {
  collections?: CollectionDependency[];
  external?: ExternalDependencies;
}

// Collection Configuration
export interface CollectionDefaults {
  compilation?: CompilationConfig;
}

export interface EnvironmentRequirements {
  node?: string;
  frameworks?: string[];
}

export interface CollectionConfiguration {
  defaults?: CollectionDefaults;
  environment?: EnvironmentRequirements;
}

// Collection Manifest
export interface BuildInfo {
  timestamp?: string;
  version?: string;
  environment?: string;
}

export interface GeneratedAssets {
  css?: string[];
  javascript?: string[];
  templates?: string[];
}

export interface CollectionStatistics {
  totalComponents?: number;
  categories?: Record<string, number>;
  averageComplexity?: number;
}

export interface CollectionManifest {
  build?: BuildInfo;
  assets?: GeneratedAssets;
  statistics?: CollectionStatistics;
}

// Component Collection Definition
export interface ComponentCollection {
  name: string;
  description?: string;
  version: string;
  author?: string;
  license?: string;
  repository?: string;
  homepage?: string;
  keywords?: string[];
  configuration?: CollectionConfiguration;
  dependencies?: CollectionDependencies;
  components: Record<string, ComponentDefinition | string>;
  manifest?: CollectionManifest;
}

// Validation Results
export interface ValidationError {
  path: string;
  message: string;
  value?: any;
  schema?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Registry Types
export interface ComponentRegistry {
  register(component: ComponentDefinition): Promise<void>;
  unregister(id: string): Promise<void>;
  get(id: string): Promise<ComponentDefinition | null>;
  list(filter?: ComponentFilter): Promise<ComponentDefinition[]>;
  search(query: string): Promise<ComponentDefinition[]>;
  validate(component: ComponentDefinition): ValidationResult;
}

export interface ComponentFilter {
  category?: ComponentCategory;
  tags?: string[];
  author?: string;
  version?: string;
  keywords?: string[];
  complexity?: {
    min?: number;
    max?: number;
  };
}
