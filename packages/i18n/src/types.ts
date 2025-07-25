// packages/i18n/src/types.ts

export interface Dictionary {
  commands: Record<string, string>;
  modifiers: Record<string, string>;
  events: Record<string, string>;
  logical: Record<string, string>;
  temporal: Record<string, string>;
  values: Record<string, string>;
  attributes: Record<string, string>;
  [category: string]: Record<string, string>;
}

export interface I18nConfig {
  locale: string;
  fallbackLocale?: string;
  dictionaries?: Record<string, Dictionary>;
  detectLocale?: boolean;
  rtlLocales?: string[];
  preserveOriginalAttribute?: string;
}

export interface TranslationOptions {
  from?: string;
  to: string;
  preserveOriginal?: boolean;
  validate?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  coverage: {
    total: number;
    translated: number;
    missing: string[];
  };
}

export interface ValidationError {
  type: 'missing' | 'invalid' | 'duplicate';
  key: string;
  message: string;
}

export interface ValidationWarning {
  type: 'unused' | 'deprecated' | 'inconsistent';
  key: string;
  message: string;
}

export interface LocaleMetadata {
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
  pluralRules?: (n: number) => string;
}

export interface TranslationContext {
  locale: string;
  direction: 'ltr' | 'rtl';
  dictionary: Dictionary;
  metadata: LocaleMetadata;
}

export type TokenType = 
  | 'command'
  | 'modifier'
  | 'event'
  | 'logical'
  | 'temporal'
  | 'value'
  | 'attribute'
  | 'identifier'
  | 'operator'
  | 'literal';

export interface Token {
  type: TokenType;
  value: string;
  translated?: string;
  position: {
    start: number;
    end: number;
    line: number;
    column: number;
  };
}

export interface TranslationResult {
  translated: string;
  original?: string;
  tokens: Token[];
  locale: {
    from: string;
    to: string;
  };
  warnings?: string[];
}
