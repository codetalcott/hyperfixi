/**
 * Types for Developer Tools
 */

/**
 * CLI command interface
 */
export interface CLICommand {
  name: string;
  description: string;
  options: CLIOption[];
  action: (args: any, options: any) => Promise<void>;
}

/**
 * CLI option interface
 */
export interface CLIOption {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  default?: any;
  choices?: string[];
}

/**
 * Project configuration
 */
export interface ProjectConfig {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  hyperfixi: {
    version: string;
    entry: string;
    output: string;
    target: 'browser' | 'node' | 'both';
    features: string[];
    optimization: {
      minify: boolean;
      sourceMaps: boolean;
      treeshaking: boolean;
    };
    development: {
      port: number;
      hot: boolean;
      livereload: boolean;
    };
  };
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

/**
 * Project template
 */
export interface ProjectTemplate {
  name: string;
  description: string;
  category: 'basic' | 'advanced' | 'example';
  files: TemplateFile[];
  dependencies: string[];
  devDependencies: string[];
  postInstall?: string[];
}

/**
 * Template file
 */
export interface TemplateFile {
  path: string;
  content: string;
  executable?: boolean;
}

/**
 * Visual builder configuration
 */
export interface BuilderConfig {
  port: number;
  host: string;
  open: boolean;
  livereload: boolean;
  components: ComponentLibrary;
  theme: BuilderTheme;
}

/**
 * Component library
 */
export interface ComponentLibrary {
  name: string;
  version: string;
  components: ComponentDefinition[];
  categories: ComponentCategory[];
}

/**
 * Component definition
 */
export interface ComponentDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  template: string;
  hyperscript: string;
  styles: string;
  properties: ComponentProperty[];
  events: ComponentEvent[];
  slots: ComponentSlot[];
  examples: ComponentExample[];
}

/**
 * Component property
 */
export interface ComponentProperty {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: any;
  options?: any[];
}

/**
 * Component event
 */
export interface ComponentEvent {
  name: string;
  description: string;
  payload?: Record<string, any>;
}

/**
 * Component slot
 */
export interface ComponentSlot {
  name: string;
  description: string;
  required?: boolean;
}

/**
 * Component example
 */
export interface ComponentExample {
  name: string;
  description: string;
  code: string;
  preview?: string;
}

/**
 * Component category
 */
export interface ComponentCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

/**
 * Builder theme
 */
export interface BuilderTheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
  fonts: {
    primary: string;
    code: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
  };
}

/**
 * Code analyzer result
 */
export interface AnalysisResult {
  file: string;
  scripts: ScriptAnalysis[];
  elements: ElementAnalysis[];
  dependencies: string[];
  complexity: number;
  issues: AnalysisIssue[];
  metrics: AnalysisMetrics;
}

/**
 * Script analysis
 */
export interface ScriptAnalysis {
  content: string;
  line: number;
  column: number;
  features: string[];
  complexity: number;
  events: string[];
  selectors: string[];
  commands: string[];
  variables: string[];
  references: string[];
  issues: AnalysisIssue[];
}

/**
 * Element analysis
 */
export interface ElementAnalysis {
  tag: string;
  id?: string;
  classes: string[];
  attributes: Record<string, string>;
  hyperscript?: string;
  children: ElementAnalysis[];
  line: number;
  column: number;
}

/**
 * Analysis issue
 */
export interface AnalysisIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  line: number;
  column: number;
  suggestion?: string;
}

/**
 * Analysis metrics
 */
export interface AnalysisMetrics {
  totalScripts: number;
  totalElements: number;
  totalLines: number;
  averageComplexity: number;
  featuresUsed: string[];
  commandsUsed: string[];
  eventsUsed: string[];
}

/**
 * Code generator configuration
 */
export interface GeneratorConfig {
  target: 'typescript' | 'javascript' | 'html' | 'css';
  format: 'module' | 'script' | 'inline';
  optimization: {
    minify: boolean;
    comments: boolean;
    sourceMaps: boolean;
  };
  typescript: {
    strict: boolean;
    target: string;
    moduleResolution: string;
  };
}

/**
 * Generated code result
 */
export interface GeneratedCode {
  files: GeneratedFile[];
  dependencies: string[];
  warnings: string[];
  metadata: GenerationMetadata;
}

/**
 * Generated file
 */
export interface GeneratedFile {
  path: string;
  content: string;
  type: 'typescript' | 'javascript' | 'html' | 'css' | 'json';
  size: number;
}

/**
 * Schema-based code generation input
 */
export interface CodeGenerationSchema {
  type: 'component' | 'page' | 'form' | 'list';
  name: string;
  schema: ComponentSchema | PageSchema | FormSchema | ListSchema;
}

/**
 * Component schema for code generation
 */
export interface ComponentSchema {
  template: string;
  events?: string[];
  commands?: string[];
  styles?: string;
}

/**
 * Page schema for code generation
 */
export interface PageSchema {
  title: string;
  components?: string[];
  layout?: string;
}

/**
 * Form schema for code generation
 */
export interface FormSchema {
  fields: FormFieldSchema[];
  submitAction: string;
  validation?: boolean;
}

/**
 * Form field schema
 */
export interface FormFieldSchema {
  name: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox';
  required?: boolean;
  label?: string;
  placeholder?: string;
  options?: string[];
}

/**
 * List schema for code generation
 */
export interface ListSchema {
  itemTemplate: string;
  actions?: string[];
  sortable?: boolean;
  filterable?: boolean;
}

/**
 * Schema-based generated code result (different structure for convenience)
 */
export interface SchemaGeneratedCode {
  files: {
    html: string;
    js?: string;
    css?: string;
  };
  dependencies: string[];
  warnings: string[];
  metadata: GenerationMetadata;
}

/**
 * Generation metadata
 */
export interface GenerationMetadata {
  generator: string;
  version: string;
  timestamp: number;
  source: string;
  target: string;
  options: Record<string, any>;
}

/**
 * Development server configuration
 */
export interface DevServerConfig {
  port: number;
  host: string;
  https: boolean;
  proxy: Record<string, string>;
  static: string[];
  livereload: boolean;
  hot: boolean;
  cors: boolean;
  compression: boolean;
}

/**
 * Build configuration
 */
export interface BuildConfig {
  entry: string | string[];
  output: {
    path: string;
    filename: string;
    format: 'umd' | 'esm' | 'cjs';
  };
  optimization: {
    minify: boolean;
    sourceMaps: boolean;
    treeshaking: boolean;
    bundleAnalyzer: boolean;
  };
  externals: string[];
  plugins: BuildPlugin[];
}

/**
 * Build plugin interface
 */
export interface BuildPlugin {
  name: string;
  setup: (build: any) => void;
}

/**
 * Scaffolding options
 */
export interface ScaffoldOptions {
  template: string;
  name: string;
  description?: string;
  author?: string;
  license?: string;
  features?: string[];
  typescript: boolean;
  testing: boolean;
  linting: boolean;
  git: boolean;
  install: boolean;
}

/**
 * Migration configuration
 */
export interface MigrationConfig {
  from: string;
  to: string;
  files: string[];
  transformations: MigrationTransformation[];
  backup: boolean;
  dryRun: boolean;
}

/**
 * Migration transformation
 */
export interface MigrationTransformation {
  name: string;
  description: string;
  pattern: string | RegExp;
  replacement: string | ((match: string) => string);
  files: string[];
}

/**
 * Documentation generator configuration
 */
export interface DocsConfig {
  input: string[];
  output: string;
  format: 'markdown' | 'html' | 'json';
  theme: string;
  includePrivate: boolean;
  includeExamples: boolean;
  plugins: DocsPlugin[];
}

/**
 * Documentation plugin
 */
export interface DocsPlugin {
  name: string;
  process: (docs: any) => any;
}

/**
 * Performance profiler result
 */
export interface ProfileResult {
  duration: number;
  memory: {
    used: number;
    total: number;
    peak: number;
  };
  operations: ProfileOperation[];
  hotSpots: ProfileHotSpot[];
  recommendations: string[];
}

/**
 * Profile operation
 */
export interface ProfileOperation {
  name: string;
  duration: number;
  calls: number;
  memory: number;
  children: ProfileOperation[];
}

/**
 * Profile hot spot
 */
export interface ProfileHotSpot {
  location: string;
  operation: string;
  impact: number;
  suggestion: string;
}

/**
 * Bundle analyzer result
 */
export interface BundleAnalysis {
  size: {
    raw: number;
    gzipped: number;
    minified: number;
  };
  modules: BundleModule[];
  dependencies: BundleDependency[];
  treeshaking: {
    eliminated: string[];
    retained: string[];
  };
  recommendations: string[];
}

/**
 * Bundle module
 */
export interface BundleModule {
  id: string;
  path: string;
  size: number;
  imports: string[];
  exports: string[];
  used: boolean;
}

/**
 * Bundle dependency
 */
export interface BundleDependency {
  name: string;
  version: string;
  size: number;
  type: 'production' | 'development';
  unused: boolean;
}

/**
 * Debug session configuration
 */
export interface DebugConfig {
  port: number;
  breakpoints: DebugBreakpoint[];
  watchExpressions: string[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  sourceMap: boolean;
}

/**
 * Debug breakpoint
 */
export interface DebugBreakpoint {
  file: string;
  line: number;
  condition?: string;
  enabled: boolean;
}

/**
 * Debug session state
 */
export interface DebugSession {
  id: string;
  status: 'running' | 'paused' | 'stopped';
  callStack: DebugFrame[];
  variables: DebugVariable[];
  output: string[];
}

/**
 * Debug frame
 */
export interface DebugFrame {
  id: number;
  name: string;
  source: string;
  line: number;
  column: number;
}

/**
 * Debug variable
 */
export interface DebugVariable {
  name: string;
  value: any;
  type: string;
  scope: 'local' | 'global' | 'closure' | 'this' | 'arguments';
}