// packages/i18n/src/runtime.ts

import { HyperscriptTranslator } from './translator';
import { Dictionary, I18nConfig, TranslationOptions } from './types';
import { getBrowserLocales, isRTL } from './utils/locale';
import { getFormatter } from './formatting';

/**
 * Runtime i18n manager for client-side locale switching
 */
export interface RuntimeI18nOptions extends I18nConfig {
  autoDetect?: boolean;
  storageKey?: string;
  urlParam?: string;
  cookieName?: string;
  updateURL?: boolean;
  updateTitle?: boolean;
  updateLang?: boolean;
  updateDir?: boolean;
}

export class RuntimeI18nManager {
  private translator: HyperscriptTranslator;
  private options: Required<RuntimeI18nOptions>;
  private currentLocale: string;
  private observers: Set<(locale: string) => void> = new Set();
  private initialized = false;

  constructor(options: Partial<RuntimeI18nOptions> = {}) {
    this.options = {
      locale: options.locale || 'en',
      fallbackLocale: options.fallbackLocale || 'en',
      dictionaries: options.dictionaries || {},
      detectLocale: options.detectLocale ?? true,
      rtlLocales: options.rtlLocales || ['ar', 'he', 'fa', 'ur'],
      preserveOriginalAttribute: options.preserveOriginalAttribute || 'data-i18n-original',
      autoDetect: options.autoDetect ?? true,
      storageKey: options.storageKey || 'hyperfixi-locale',
      urlParam: options.urlParam || 'lang',
      cookieName: options.cookieName || 'hyperfixi-locale',
      updateURL: options.updateURL ?? false,
      updateTitle: options.updateTitle ?? true,
      updateLang: options.updateLang ?? true,
      updateDir: options.updateDir ?? true,
    };

    this.translator = new HyperscriptTranslator(this.options);
    this.currentLocale = this.options.locale;
  }

  /**
   * Initialize the runtime i18n system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (typeof window !== 'undefined') {
      // Detect initial locale
      const detectedLocale = this.detectInitialLocale();
      if (detectedLocale !== this.currentLocale) {
        await this.setLocale(detectedLocale, false);
      }

      // Set up event listeners
      this.setupEventListeners();
      
      // Translate existing elements
      this.translatePage();
      
      // Update document attributes
      this.updateDocumentAttributes();
    }

    this.initialized = true;
  }

  /**
   * Set the current locale
   */
  async setLocale(locale: string, updateStorage = true): Promise<void> {
    if (locale === this.currentLocale) return;

    const oldLocale = this.currentLocale;
    this.currentLocale = locale;

    // Update storage if requested
    if (updateStorage && typeof window !== 'undefined') {
      this.saveLocaleToStorage(locale);
    }

    // Update URL if requested
    if (this.options.updateURL && typeof window !== 'undefined') {
      this.updateURL(locale);
    }

    // Update document attributes
    if (typeof document !== 'undefined') {
      this.updateDocumentAttributes();
    }

    // Translate the page
    if (typeof document !== 'undefined') {
      this.translatePage(oldLocale);
    }

    // Notify observers
    this.notifyObservers(locale);
  }

  /**
   * Get the current locale
   */
  getLocale(): string {
    return this.currentLocale;
  }

  /**
   * Get supported locales
   */
  getSupportedLocales(): string[] {
    return this.translator.getSupportedLocales();
  }

  /**
   * Check if a locale is RTL
   */
  isRTL(locale?: string): boolean {
    return isRTL(locale || this.currentLocale);
  }

  /**
   * Translate a hyperscript string
   */
  translate(text: string, options: Partial<TranslationOptions> = {}): string {
    return this.translator.translate(text, {
      from: options.from || 'en',
      to: options.to || this.currentLocale,
      ...options,
    });
  }

  /**
   * Format a value according to current locale
   */
  format(value: any, type?: string): string {
    return getFormatter(this.currentLocale).formatHyperscriptValue(value, type);
  }

  /**
   * Add dictionary for a locale
   */
  addDictionary(locale: string, dictionary: Dictionary): void {
    this.translator.addDictionary(locale, dictionary);
  }

  /**
   * Subscribe to locale changes
   */
  onLocaleChange(callback: (locale: string) => void): () => void {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  /**
   * Create a locale switcher element
   */
  createLocaleSwitcher(options: {
    type?: 'dropdown' | 'buttons';
    className?: string;
    showNativeNames?: boolean;
  } = {}): HTMLElement {
    const { type = 'dropdown', className = 'locale-switcher', showNativeNames = true } = options;
    const supportedLocales = this.getSupportedLocales();

    if (type === 'dropdown') {
      const select = document.createElement('select');
      select.className = className;
      
      supportedLocales.forEach(locale => {
        const option = document.createElement('option');
        option.value = locale;
        option.textContent = this.getLocaleDisplayName(locale, showNativeNames);
        option.selected = locale === this.currentLocale;
        select.appendChild(option);
      });

      select.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.setLocale(target.value);
      });

      return select;
    } else {
      const container = document.createElement('div');
      container.className = className;

      supportedLocales.forEach(locale => {
        const button = document.createElement('button');
        button.textContent = this.getLocaleDisplayName(locale, showNativeNames);
        button.dataset.locale = locale;
        button.className = locale === this.currentLocale ? 'active' : '';
        
        button.addEventListener('click', () => {
          this.setLocale(locale);
        });

        container.appendChild(button);
      });

      return container;
    }
  }

  /**
   * Detect initial locale from various sources
   */
  private detectInitialLocale(): string {
    if (!this.options.autoDetect || typeof window === 'undefined') {
      return this.options.locale;
    }

    // 1. URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const urlLocale = urlParams.get(this.options.urlParam);
    if (urlLocale && this.translator.getSupportedLocales().includes(urlLocale)) {
      return urlLocale;
    }

    // 2. Local storage
    const storageLocale = localStorage.getItem(this.options.storageKey);
    if (storageLocale && this.translator.getSupportedLocales().includes(storageLocale)) {
      return storageLocale;
    }

    // 3. Cookie
    const cookieLocale = this.getCookie(this.options.cookieName);
    if (cookieLocale && this.translator.getSupportedLocales().includes(cookieLocale)) {
      return cookieLocale;
    }

    // 4. Browser languages
    const browserLocales = getBrowserLocales();
    for (const locale of browserLocales) {
      if (this.translator.getSupportedLocales().includes(locale)) {
        return locale;
      }
      // Try language-only match
      const lang = locale.split('-')[0];
      if (this.translator.getSupportedLocales().includes(lang)) {
        return lang;
      }
    }

    return this.options.fallbackLocale;
  }

  /**
   * Save locale to storage
   */
  private saveLocaleToStorage(locale: string): void {
    try {
      localStorage.setItem(this.options.storageKey, locale);
      this.setCookie(this.options.cookieName, locale, 365);
    } catch (error) {
      console.warn('Failed to save locale to storage:', error);
    }
  }

  /**
   * Update URL with current locale
   */
  private updateURL(locale: string): void {
    const url = new URL(window.location.href);
    url.searchParams.set(this.options.urlParam, locale);
    window.history.replaceState({}, '', url.toString());
  }

  /**
   * Update document attributes
   */
  private updateDocumentAttributes(): void {
    if (typeof document === 'undefined') return;

    if (this.options.updateLang) {
      document.documentElement.lang = this.currentLocale;
    }

    if (this.options.updateDir) {
      document.documentElement.dir = this.isRTL() ? 'rtl' : 'ltr';
    }

    if (this.options.updateTitle && document.title) {
      // Optionally translate the title if it contains hyperscript-like content
      // This is a simple implementation - could be enhanced
      document.title = this.translate(document.title);
    }
  }

  /**
   * Translate the entire page
   */
  private translatePage(fromLocale?: string): void {
    if (typeof document === 'undefined') return;

    // Find all elements with hyperscript attributes
    const attributes = ['_', 'data-script', 'script'];
    
    attributes.forEach(attr => {
      const elements = document.querySelectorAll(`[${attr}]`);
      elements.forEach(element => {
        const original = element.getAttribute(attr);
        if (!original) return;

        try {
          const translated = this.translator.translate(original, {
            from: fromLocale || 'en',
            to: this.currentLocale,
          });

          if (translated !== original) {
            // Preserve original if configured
            if (this.options.preserveOriginalAttribute) {
              element.setAttribute(this.options.preserveOriginalAttribute, original);
            }
            
            element.setAttribute(attr, translated);
          }
        } catch (error) {
          console.warn(`Failed to translate ${attr} attribute:`, error);
        }
      });
    });
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen for language change events
    window.addEventListener('languagechange', () => {
      if (this.options.autoDetect) {
        const newLocale = this.detectInitialLocale();
        if (newLocale !== this.currentLocale) {
          this.setLocale(newLocale);
        }
      }
    });

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', () => {
      if (this.options.updateURL) {
        const urlParams = new URLSearchParams(window.location.search);
        const urlLocale = urlParams.get(this.options.urlParam);
        if (urlLocale && urlLocale !== this.currentLocale) {
          this.setLocale(urlLocale, false);
        }
      }
    });
  }

  /**
   * Notify observers of locale change
   */
  private notifyObservers(locale: string): void {
    this.observers.forEach(callback => {
      try {
        callback(locale);
      } catch (error) {
        console.warn('Locale change observer error:', error);
      }
    });
  }

  /**
   * Get locale display name
   */
  private getLocaleDisplayName(locale: string, showNative: boolean): string {
    const names: Record<string, { english: string; native: string }> = {
      en: { english: 'English', native: 'English' },
      es: { english: 'Spanish', native: 'Español' },
      fr: { english: 'French', native: 'Français' },
      de: { english: 'German', native: 'Deutsch' },
      ja: { english: 'Japanese', native: '日本語' },
      ko: { english: 'Korean', native: '한국어' },
      zh: { english: 'Chinese', native: '中文' },
      ar: { english: 'Arabic', native: 'العربية' },
    };

    const info = names[locale];
    if (!info) return locale;

    return showNative ? info.native : info.english;
  }

  /**
   * Cookie utilities
   */
  private getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  private setCookie(name: string, value: string, days: number): void {
    if (typeof document === 'undefined') return;
    
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  }
}

/**
 * Global runtime instance
 */
export let runtimeI18n: RuntimeI18nManager | null = null;

/**
 * Initialize global runtime i18n
 */
export function initializeI18n(options?: RuntimeI18nOptions): RuntimeI18nManager {
  runtimeI18n = new RuntimeI18nManager(options);
  return runtimeI18n;
}

/**
 * Get global runtime i18n instance
 */
export function getI18n(): RuntimeI18nManager {
  if (!runtimeI18n) {
    throw new Error('I18n not initialized. Call initializeI18n() first.');
  }
  return runtimeI18n;
}