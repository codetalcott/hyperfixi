/**
 * HyperFixi Developer Tools
 * CLI tools and visual builder API for HyperFixi development
 */

// Export types (explicitly to avoid conflicts)
export type {
  CLICommand,
  CLIOption,
  ProjectConfig,
  ProjectTemplate,
  TemplateFile,
  ScaffoldOptions,
  BuilderConfig,
  ComponentLibrary,
  ComponentDefinition,
  ComponentProperty,
  ComponentEvent,
  ComponentSlot,
  ComponentExample,
  ComponentCategory,
  BuilderTheme,
  AnalysisResult,
  ScriptAnalysis,
  ElementAnalysis,
  AnalysisIssue,
  AnalysisMetrics,
  GeneratorConfig,
  GeneratedCode,
  GeneratedFile,
  GenerationMetadata,
  DevServerConfig,
  BuildConfig,
  BuildPlugin,
  DocsConfig,
  DocsPlugin,
  ProfileResult,
  ProfileOperation,
  ProfileHotSpot,
  BundleAnalysis,
  BundleModule,
  BundleDependency,
  DebugConfig,
  DebugBreakpoint,
  DebugSession,
  DebugFrame,
  DebugVariable,
} from './types';

// Export analyzer
export { analyzeProject, analyzeFile, generateReport, validateScript, getSuggestions } from './analyzer';

// Export builder
export { VisualBuilderServer, buildProject } from './builder';

// Export generator
export { createProject, createComponent, createTemplate, generateCode } from './generator';

// Export dev-server
export { DevServer, startDevServer } from './dev-server';

// Export new modules
export { BuilderStorage, createProject as createBuilderProject } from './builder-storage';
export type { BuilderProject, ProjectSummary, StorageConfig } from './builder-storage';

export { BundleAnalyzer, analyzeBundle, analyzeBundleFiles } from './bundle-analyzer';
export type { TreemapNode, AnalyzerOptions } from './bundle-analyzer';

export { HyperFixiMigrator, migrate, createMigrationRule } from './migrator';
export type { MigrationConfig, MigrationRule, MigrationResult, FileTransformResult } from './migrator';

export { HyperScriptProfiler, profile, compareProfiles } from './profiler';
export type { ProfilerConfig } from './profiler';

// Export debugger
export {
  HyperScriptDebugger,
  createDebugger,
  BreakpointManager,
  VariableInspector,
} from './debugger/index';
export type { DebugEvent, DebugEventType, DebugMessage } from './debugger/index';

// Quick start functions
export { quickStartAnalyzer } from './quick-start/analyzer';
export { quickStartBuilder } from './quick-start/builder';
export { quickStartGenerator } from './quick-start/generator';

// Version
export const version = '0.1.0';