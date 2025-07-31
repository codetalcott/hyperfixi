import { hyperscript } from '../../../packages/core/src/index.ts';

// Initialize HyperFixi and set up the demo environment
const context = hyperscript.createContext();

// Add sample data to the context for demos  
context.globals.set('items', [1, 2, 2, 3, 4, 5]);
context.globals.set('name', 'john doe');
context.globals.set('users', [
  { name: 'Alice', age: 25, category: 'admin' },
  { name: 'Bob', age: 30, category: 'user' },
  { name: 'Charlie', age: 35, category: 'admin' }
]);

// I18n translations for the demo
const translations = {
  en: {
    greeting: 'Hello, welcome to HyperFixi!',
    description: 'This is a powerful hyperscript engine.',
    button: 'Click me',
    language: 'Language: English'
  },
  es: {
    greeting: '¡Hola, bienvenido a HyperFixi!',
    description: 'Este es un potente motor de hyperscript.',
    button: 'Haz clic aquí',
    language: 'Idioma: Español'
  },
  fr: {
    greeting: 'Bonjour, bienvenue dans HyperFixi!',
    description: 'Il s\'agit d\'un moteur hyperscript puissant.',
    button: 'Cliquez ici',
    language: 'Langue: Français'
  },
  de: {
    greeting: 'Hallo, willkommen bei HyperFixi!',
    description: 'Dies ist eine leistungsstarke Hyperscript-Engine.',
    button: 'Hier klicken',
    language: 'Sprache: Deutsch'
  },
  zh: {
    greeting: '你好，欢迎使用 HyperFixi！',
    description: '这是一个强大的 hyperscript 引擎。',
    button: '点击我',
    language: '语言：中文'
  },
  ja: {
    greeting: 'こんにちは、HyperFixi へようこそ！',
    description: 'これは強力な hyperscript エンジンです。',
    button: 'クリックしてください',
    language: '言語：日本語'
  }
};

// Debug logging system
class DebugLogger {
  private debugContent: HTMLElement;
  
  constructor() {
    this.debugContent = document.getElementById('debug-content') as HTMLElement;
  }
  
  log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const debugEntry = document.createElement('div');
    debugEntry.className = 'debug-entry';
    
    const statusIcon = {
      info: '💡',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[type];
    
    debugEntry.innerHTML = `
      <div class="debug-timestamp">${timestamp}</div>
      <div>${statusIcon} ${message}</div>
    `;
    
    this.debugContent.appendChild(debugEntry);
    this.debugContent.scrollTop = this.debugContent.scrollHeight;
    
    // Keep only last 50 entries
    const entries = this.debugContent.querySelectorAll('.debug-entry');
    if (entries.length > 50) {
      entries[0].remove();
    }
  }
}

const debugLogger = new DebugLogger();

// Expression evaluator for demo examples
class ExpressionEvaluator {
  async evaluateExpression(expression: string): Promise<any> {
    try {
      debugLogger.log(`Evaluating: ${expression}`, 'info');
      const result = await hyperscript.run(expression, context);
      debugLogger.log(`Result: ${JSON.stringify(result)}`, 'success');
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      debugLogger.log(`Error: ${errorMsg}`, 'error');
      throw error;
    }
  }
  
  formatResult(result: any): string {
    if (result === null) return 'null';
    if (result === undefined) return 'undefined';
    if (typeof result === 'object') {
      try {
        return JSON.stringify(result, null, 2);
      } catch {
        return String(result);
      }
    }
    return String(result);
  }
}

const evaluator = new ExpressionEvaluator();


// I18n demo - keep this as it provides essential functionality for language switching
class I18nDemo {
  private currentLanguage = 'en';
  
  constructor() {
    this.initializeI18nDemo();
  }
  
  initializeI18nDemo() {
    const languageSelector = document.getElementById('language-selector') as HTMLSelectElement;
    if (languageSelector) {
      languageSelector.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.switchLanguage(target.value);
      });
    }
  }
  
  switchLanguage(languageCode: string) {
    this.currentLanguage = languageCode;
    const translation = translations[languageCode as keyof typeof translations];
    
    if (translation) {
      const greetingEl = document.getElementById('i18n-greeting');
      const descriptionEl = document.getElementById('i18n-description');
      const buttonEl = document.getElementById('i18n-button');
      const resultEl = document.getElementById('i18n-result');
      
      if (greetingEl) greetingEl.textContent = translation.greeting;
      if (descriptionEl) descriptionEl.textContent = translation.description;
      if (buttonEl) buttonEl.textContent = translation.button;
      if (resultEl) resultEl.textContent = translation.language;
      
      debugLogger.log(`Language switched to ${languageCode}`, 'info');
    }
  }
}

// Enhanced Error Monitoring
class ErrorMonitor {
  private errorCount = 0;
  
  constructor() {
    this.setupErrorCapture();
  }
  
  setupErrorCapture() {
    // Capture global JavaScript errors
    window.addEventListener('error', (event) => {
      this.errorCount++;
      debugLogger.log(`Global Error ${this.errorCount}: ${event.message}`, 'error');
      debugLogger.log(`  File: ${event.filename}:${event.lineno}:${event.colno}`, 'error');
    });
    
    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.errorCount++;
      debugLogger.log(`Unhandled Promise Rejection ${this.errorCount}: ${event.reason}`, 'error');
    });
    
    // Override console.error to capture it in debug panel
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      debugLogger.log(`Console Error: ${args.map(arg => String(arg)).join(' ')}`, 'error');
      originalConsoleError.apply(console, args);
    };
    
    // Override console.warn to capture it in debug panel  
    const originalConsoleWarn = console.warn;
    console.warn = (...args: any[]) => {
      debugLogger.log(`Console Warning: ${args.map(arg => String(arg)).join(' ')}`, 'warning');
      originalConsoleWarn.apply(console, args);
    };
  }
}

// Performance Monitoring
class PerformanceTracker {
  private performanceEntries: PerformanceEntry[] = [];
  
  constructor() {
    this.setupPerformanceMonitoring();
  }
  
  setupPerformanceMonitoring() {
    // Track page load performance
    window.addEventListener('load', () => {
      const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navTiming) {
        const loadTime = navTiming.loadEventEnd - navTiming.navigationStart;
        debugLogger.log(`Page load completed in ${loadTime.toFixed(2)}ms`, 'success');
        debugLogger.log(`DOM content loaded in ${(navTiming.domContentLoadedEventEnd - navTiming.navigationStart).toFixed(2)}ms`, 'info');
      }
    });
    
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'longtask') {
            debugLogger.log(`Long task detected: ${entry.duration.toFixed(2)}ms`, 'warning');
          }
        });
      });
      
      try {
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        debugLogger.log('Long task monitoring not available', 'info');
      }
    }
  }
  
  trackOperation(name: string, startTime: number, endTime: number) {
    const duration = endTime - startTime;
    debugLogger.log(`Operation "${name}" completed in ${duration.toFixed(2)}ms`, duration > 100 ? 'warning' : 'info');
  }
}

// HyperFixi Engine Integration with Enhanced Debugging
class HyperFixiEngine {
  private errorMonitor: ErrorMonitor;
  private performanceTracker: PerformanceTracker;
  
  constructor() {
    this.errorMonitor = new ErrorMonitor();
    this.performanceTracker = new PerformanceTracker();
    this.initializeEngine();
  }
  
  async initializeEngine() {
    const startTime = performance.now();
    
    try {
      debugLogger.log('Starting HyperFixi engine initialization...', 'info');
      
      // Check what's available in the hyperscript object
      debugLogger.log(`Available hyperscript methods: ${Object.keys(hyperscript || {}).join(', ')}`, 'info');
      
      // Process any existing hyperscript elements
      const hyperscriptElements = document.querySelectorAll('[_]');
      debugLogger.log(`Found ${hyperscriptElements.length} elements with hyperscript`, 'info');
      
      if (hyperscriptElements.length === 0) {
        debugLogger.log('No hyperscript elements found - this might indicate a timing issue', 'warning');
        return;
      }
      
      // Try to initialize HyperFixi DOM processing
      if (hyperscript && typeof hyperscript.processNode === 'function') {
        debugLogger.log('Processing DOM with hyperscript.processNode()...', 'info');
        
        // Process the entire document
        hyperscript.processNode(document.body);
        debugLogger.log('HyperFixi DOM processing completed', 'success');
        
      } else if (hyperscript && typeof hyperscript.init === 'function') {
        debugLogger.log('Calling hyperscript.init()...', 'info');
        await hyperscript.init();
        debugLogger.log('HyperFixi init() completed', 'success');
        
      } else {
        debugLogger.log('No processNode() or init() method found, trying manual processing...', 'warning');
        
        // Try to process elements manually if no DOM processing method
        if (hyperscript && typeof hyperscript.run === 'function') {
          debugLogger.log('Attempting to process hyperscript elements manually...', 'info');
          
          hyperscriptElements.forEach(async (element, index) => {
            const script = element.getAttribute('_');
            if (script) {
              try {
                debugLogger.log(`Processing element ${index + 1}: ${script.substring(0, 50)}...`, 'info');
                // This won't work for event handlers, but will work for expressions
                await hyperscript.run(script, context);
              } catch (error) {
                debugLogger.log(`Failed to process element ${index + 1}: ${error}`, 'error');
              }
            }
          });
        } else {
          debugLogger.log('No run() method available either', 'error');
        }
      }
      
      const endTime = performance.now();
      this.performanceTracker.trackOperation('HyperFixi initialization', startTime, endTime);
      
      // Enhanced hyperscript syntax logging with validation
      hyperscriptElements.forEach((element, index) => {
        const script = element.getAttribute('_');
        if (script) {
          try {
            // Log the hyperscript for debugging
            const preview = script.length > 100 ? script.substring(0, 100) + '...' : script;
            debugLogger.log(`Element ${index + 1} hyperscript: ${preview}`, 'info');
            
            // Check if it looks like valid hyperscript
            if (script.includes('on ') && (script.includes(' then ') || script.includes(' hide ') || script.includes(' show '))) {
              debugLogger.log(`Element ${index + 1}: Valid hyperscript syntax detected`, 'success');
            } else {
              debugLogger.log(`Element ${index + 1}: Possible syntax issue`, 'warning');
            }
            
          } catch (error) {
            debugLogger.log(`Element ${index + 1}: Error processing hyperscript - ${error}`, 'error');
          }
        }
      });
      
      // Set up HyperFixi error monitoring if available
      this.setupHyperFixiErrorHandling();
      
    } catch (error) {
      const endTime = performance.now();
      this.performanceTracker.trackOperation('HyperFixi initialization (failed)', startTime, endTime);
      
      debugLogger.log(`HyperFixi engine initialization failed: ${error}`, 'error');
      console.error('HyperFixi initialization error:', error);
      
      // Provide comprehensive debugging information
      debugLogger.log('Debugging information:', 'info');
      debugLogger.log(`- hyperscript object available: ${!!hyperscript}`, 'info');
      debugLogger.log(`- hyperscript keys: ${hyperscript ? Object.keys(hyperscript).join(', ') : 'N/A'}`, 'info');
      debugLogger.log(`- Elements with _="" attribute: ${document.querySelectorAll('[_]').length}`, 'info');
      debugLogger.log(`- Document ready state: ${document.readyState}`, 'info');
    }
  }
  
  setupHyperFixiErrorHandling() {
    // Try to hook into HyperFixi's error handling if available
    try {
      if (hyperscript && typeof hyperscript.onError === 'function') {
        hyperscript.onError((error: Error, element: Element) => {
          debugLogger.log(`HyperFixi Runtime Error: ${error.message}`, 'error');
          if (element) {
            const script = element.getAttribute('_');
            debugLogger.log(`  Element script: ${script?.substring(0, 50)}...`, 'error');
          }
        });
        debugLogger.log('HyperFixi error handling configured', 'success');
      } else {
        debugLogger.log('HyperFixi error handling not available', 'info');
      }
    } catch (error) {
      debugLogger.log(`Failed to setup HyperFixi error handling: ${error}`, 'warning');
    }
  }
}


// Visual debug status updater
function updateDebugStatus(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  const statusElement = document.getElementById('debug-status');
  if (statusElement) {
    const colors = {
      info: '#3b82f6',
      success: '#10b981', 
      error: '#ef4444',
      warning: '#f59e0b'
    };
    statusElement.style.background = `rgba(0,0,0,0.2)`;
    statusElement.style.borderLeft = `4px solid ${colors[type]}`;
    statusElement.textContent = message;
  }
}

// Initialize HyperFixi Demo - Pure HyperFixi Implementation
document.addEventListener('DOMContentLoaded', async () => {
  updateDebugStatus('🚀 HyperFixi Demo starting - PURE HYPERFIXI MODE', 'info');
  debugLogger.log('🚀 HyperFixi Demo starting - PURE HYPERFIXI MODE', 'success');
  
  // Check what we have available
  updateDebugStatus(`HyperFixi object: ${hyperscript ? 'FOUND' : 'MISSING'}`, hyperscript ? 'success' : 'error');
  
  if (hyperscript) {
    const methods = Object.keys(hyperscript);
    updateDebugStatus(`HyperFixi methods: ${methods.join(', ')}`, 'info');
    debugLogger.log(`Available hyperscript methods: ${methods.join(', ')}`, 'info');
  }
  
  // Count hyperscript elements
  const hyperscriptElements = document.querySelectorAll('[_]');
  updateDebugStatus(`Found ${hyperscriptElements.length} hyperscript elements`, hyperscriptElements.length > 0 ? 'success' : 'warning');
  
  // Only initialize I18n as it doesn't conflict with hyperscript
  new I18nDemo();
  
  // Initialize HyperFixi engine to handle ALL hyperscript in HTML
  const engine = new HyperFixiEngine();
  
  // Test HyperFixi basic functionality
  try {
    updateDebugStatus('Testing HyperFixi expression: 2 + 3', 'info');
    const testResult = await hyperscript.run('2 + 3', context);
    const success = testResult === 5;
    updateDebugStatus(`Expression test: 2 + 3 = ${testResult} ${success ? '✅' : '❌'}`, success ? 'success' : 'error');
    debugLogger.log(`HyperFixi expression test: 2 + 3 = ${testResult}`, success ? 'success' : 'error');
  } catch (error) {
    updateDebugStatus(`❌ Expression test failed: ${error}`, 'error');
    debugLogger.log(`❌ HyperFixi expression test failed: ${error}`, 'error');
  }
  
  // Test HyperFixi compilation with detailed AST logging
  const testCases = [
    'on click hide me',
    'put "hello" into #target',
    'show #result',
    'add .active to me',
    'on click put "test" into #output'
  ];
  
  for (const testCode of testCases) {
    try {
      updateDebugStatus(`Testing compilation: ${testCode}`, 'info');
      const compileResult = hyperscript.compile(testCode);
      const success = compileResult?.success === true;
      
      debugLogger.log(`Test "${testCode}": ${success ? 'SUCCESS ✅' : 'FAILED ❌'}`, success ? 'success' : 'error');
      
      if (!success && compileResult?.errors) {
        debugLogger.log(`  Errors: ${compileResult.errors.map((e: any) => e.message).join(', ')}`, 'error');
      }
    } catch (error) {
      debugLogger.log(`Test "${testCode}" exception: ${error}`, 'error');
    }
  }
  
  // Add HyperFixi to global scope for debugging
  (window as any).hyperscript = hyperscript;
  (window as any).context = context;
  (window as any).debugLogger = debugLogger;
  
  updateDebugStatus('🎯 HyperFixi Demo ready - Check debug panel for details', 'success');
  debugLogger.log('🎯 HyperFixi Demo ready - All functionality depends on HyperFixi working correctly', 'success');
  
  // Manually process our test buttons to make sure they're included
  console.log('🔧 MANUAL PROCESSING: Starting manual button processing...');
  
  // First, let's see ALL buttons
  const allButtons = document.querySelectorAll('button');
  console.log(`🔧 MANUAL PROCESSING: Found ${allButtons.length} total buttons`);
  console.log(`🔧 MANUAL PROCESSING: Starting button enumeration...`);
  
  // Now buttons with hyperscript attributes
  const testButtons = document.querySelectorAll('button[_]');
  console.log(`🔧 MANUAL PROCESSING: Found ${testButtons.length} buttons with hyperscript attributes`);
  
  // Let's check each button individually with error handling
  allButtons.forEach((button, index) => {
    try {
      const script = button.getAttribute('_');
      const text = button.textContent?.trim();
      const hasAttribute = button.hasAttribute('_');
      const rawAttribute = button.outerHTML.includes('_=');
      console.log(`🔧 Button ${index + 1}: "${text}"`);
      console.log(`   Has _attribute: ${hasAttribute}, Raw HTML has _=: ${rawAttribute}`);
      console.log(`   Hyperscript: ${script ? `"${script}"` : 'NO'}`);
      console.log(`   OuterHTML: ${button.outerHTML.substring(0, 150)}...`);
    } catch (error) {
      console.error(`❌ Error processing button ${index + 1}:`, error);
    }
  });
  
  debugLogger.log(`Found ${testButtons.length} buttons with hyperscript attributes`, 'info');
  testButtons.forEach((button, index) => {
    const script = button.getAttribute('_');
    console.log(`🔧 Processing button ${index + 1}: "${script}"`);
    debugLogger.log(`Button ${index + 1}: ${script}`, 'info');
    hyperscript.processNode(button);
  });
  
  // Manually process the debug panel header
  const debugHeader = document.querySelector('.debug-header[_]');
  if (debugHeader) {
    debugLogger.log('Manually processing debug header', 'info');
    hyperscript.processNode(debugHeader);
  } else {
    debugLogger.log('Debug header not found', 'warning');
  }
  
  console.log('🎯 HyperFixi Demo Environment Ready - PURE HYPERFIXI MODE');
  console.log('Available globals: hyperscript, context, debugLogger');
  console.log('All navigation and interactions handled by HyperFixi');
  console.log('Try: hyperscript.run("5 + 3 * 2", context)');
});