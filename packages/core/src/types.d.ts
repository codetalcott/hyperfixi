declare global {
  namespace Hyperscript {
    interface Commands {
      fetch(url: string, ...args: any[]): Promise<any>;
    }
  }
}

// Module declaration for @lokascript/i18n/browser
// This module is resolved by the bundler at build time
declare module '@lokascript/i18n/browser' {
  export const esKeywords: any;
  export const jaKeywords: any;
  export const frKeywords: any;
  export const deKeywords: any;
  export const arKeywords: any;
  export const koKeywords: any;
  export const zhKeywords: any;
  export const trKeywords: any;
  export const idKeywords: any;
  export const ptKeywords: any;
  export const quKeywords: any;
  export const swKeywords: any;
  export function createKeywordProvider(dictionary: any): any;
  export function createEnglishProvider(): any;
  export const LocaleManager: {
    register(locale: string, provider: any): void;
    get(locale: string): any;
    has(locale: string): boolean;
    setDefault(locale: string): void;
    getAvailable(): string[];
  };
  export function detectBrowserLocale(): string;
  // The transformer half of `@lokascript/i18n/grammar` is retired; the profiles
  // half is what this bundle imports. See browser-bundle-classic-i18n.ts.
  export const profiles: Record<string, any>;
  export function getProfile(locale: string): any;
  export function getSupportedLocales(): string[];
  // Dictionaries
  export const es: any;
  export const ja: any;
  export const fr: any;
  export const de: any;
  export const ar: any;
  export const ko: any;
  export const zh: any;
  export const tr: any;
  export const id: any;
  export const pt: any;
  export const qu: any;
  export const sw: any;
}
