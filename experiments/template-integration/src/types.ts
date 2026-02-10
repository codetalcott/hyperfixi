import { ComponentDefinition } from '@lokascript/component-schema';

/**
 * Template compilation and processing types
 */

export interface TemplateOptions {
  /** Whether to minify the compiled output */
  minify?: boolean;
  /** Whether to include source maps */
  sourceMaps?: boolean;
  /** Target environment for compilation */
  target?: 'browser' | 'server' | 'universal';
  /** Whether to enable development mode features */
  development?: boolean;
  /** Custom delimiters for template variables */
  delimiters?: {
    start: string;
    end: string;
  };
}

export interface TemplateContext {
  /** Template variables to substitute */
  variables?: Record<string, any>;
  /** Component instances available in template */
  components?: Record<string, ComponentDefinition>;
  /** Global functions available to hyperscript */
  // eslint-disable-next-line @typescript-eslint/ban-types
  functions?: Record<string, Function>;
  /** Current request context (for SSR) */
  request?: {
    url?: string;
    headers?: Record<string, string>;
    params?: Record<string, string>;
    query?: Record<string, string>;
  };
  /** User/session context */
  user?: {
    id?: string;
    roles?: string[];
    permissions?: string[];
    [key: string]: any;
  };
}

export interface TemplateDirective {
  /** Directive name (e.g., 'if', 'for', 'component') */
  name: string;
  /** Directive expression */
  expression: string;
  /** Directive attributes */
  attributes?: Record<string, string>;
  /** Child elements or content */
  children?: TemplateNode[];
}

export interface TemplateNode {
  /** Node type */
  type: 'element' | 'text' | 'directive' | 'component' | 'hyperscript';
  /** Tag name for elements */
  tagName?: string;
  /** Node attributes */
  attributes?: Record<string, string>;
  /** Text content */
  content?: string;
  /** Child nodes */
  children?: TemplateNode[];
  /** Template directive information */
  directive?: TemplateDirective;
  /** Component reference */
  component?: ComponentDefinition;
  /** Hyperscript code */
  hyperscript?: string | string[];
  /** Source location for debugging */
  location?: {
    line: number;
    column: number;
    file?: string;
  };
}

export interface CompilationResult {
  /** Compiled HTML output */
  html: string;
  /** Extracted and compiled hyperscript */
  hyperscript: string[];
  /** Component dependencies */
  components: ComponentDefinition[];
  /** CSS dependencies */
  css: string[];
  /** JavaScript dependencies */
  javascript: string[];
  /** Template variables used */
  variables: string[];
  /** Source map (if enabled) */
  sourceMap?: SourceMap;
  /** Compilation warnings */
  warnings: CompilationWarning[];
  /** Performance metadata */
  performance?: {
    parseTime: number;
    compileTime: number;
    totalTime: number;
  };
}

export interface CompilationWarning {
  /** Warning type */
  type:
    | 'unused-variable'
    | 'missing-component'
    | 'invalid-hyperscript'
    | 'performance'
    | 'security';
  /** Warning message */
  message: string;
  /** Source location */
  location?: {
    line: number;
    column: number;
    file?: string;
  };
  /** Suggested fix */
  fix?: string;
}

export interface SourceMap {
  /** Source map version */
  version: number;
  /** Source files */
  sources: string[];
  /** Source names */
  names: string[];
  /** Mappings string */
  mappings: string;
  /** Source content */
  sourcesContent?: string[];
}

export interface TemplateEngine {
  /** Compile a template string */
  compile(template: string, options?: TemplateOptions): Promise<CompilationResult>;
  /** Render a compiled template with context */
  render(compiled: CompilationResult, context: TemplateContext): Promise<string>;
  /** Parse template into AST */
  parse(template: string): TemplateNode[];
  /** Add custom directive handler */
  addDirective(name: string, handler: DirectiveHandler): void;
  /** Register component for use in templates */
  registerComponent(component: ComponentDefinition): void;
}

export interface DirectiveHandler {
  /** Handle directive processing */
  process(directive: TemplateDirective, context: TemplateContext): Promise<TemplateNode[]>;
  /** Validate directive syntax */
  validate?(directive: TemplateDirective): string[];
}

export interface HyperscriptBlock {
  /** Raw hyperscript code */
  code: string;
  /** Template variables used in this block */
  variables: string[];
  /** Component dependencies */
  components: string[];
  /** Block type */
  type: 'inline' | 'attribute' | 'component';
  /** Source location */
  location?: {
    line: number;
    column: number;
    file?: string;
  };
}

export interface ComponentInstance {
  /** Component definition */
  definition: ComponentDefinition;
  /** Instance-specific variables */
  variables: Record<string, any>;
  /** Rendered HTML */
  html: string;
  /** Compiled hyperscript */
  hyperscript: string[];
  /** Child component instances */
  children: ComponentInstance[];
}

export interface TemplateBundle {
  /** Main template HTML */
  html: string;
  /** All hyperscript code combined */
  hyperscript: string;
  /** CSS dependencies */
  css: string[];
  /** JavaScript dependencies */
  javascript: string[];
  /** Component definitions */
  components: ComponentDefinition[];
  /** Bundle metadata */
  metadata: {
    version: string;
    generatedAt: string;
    options: TemplateOptions;
    performance: {
      bundleSize: number;
      compressionRatio: number;
      buildTime: number;
    };
  };
}

export interface CacheEntry {
  /** Cached compilation result */
  result: CompilationResult;
  /** Cache timestamp */
  timestamp: number;
  /** Template hash for invalidation */
  hash: string;
  /** Cache metadata */
  metadata: {
    hits: number;
    lastAccessed: number;
    options: TemplateOptions;
  };
}

export interface ITemplateError {
  /** Error type */
  type: 'parse' | 'compile' | 'render' | 'validation';
  /** Source location */
  location?: {
    line: number;
    column: number;
    file?: string;
  };
  /** Error code */
  code?: string;
  /** Additional context */
  context?: Record<string, any>;
}

export class TemplateError extends Error implements ITemplateError {
  public location?: {
    line: number;
    column: number;
    file?: string;
  };
  public code?: string;
  public context?: Record<string, any>;

  constructor(
    message: string,
    public type: 'parse' | 'compile' | 'render' | 'validation',
    location?: {
      line: number;
      column: number;
      file?: string;
    },
    code?: string,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'TemplateError';
    if (location) this.location = location;
    if (code) this.code = code;
    if (context) this.context = context;
  }
}
