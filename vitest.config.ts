/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Enable esbuild for TypeScript compilation
  esbuild: {
    target: 'node20',
  },
  
  test: {
    // Use happy-dom for DOM testing (faster than jsdom)
    environment: 'happy-dom',
    
    // Test file patterns
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.{test,spec}.ts',
        'src/**/*.d.ts',
        'src/generator/**',
        'src/benchmark/**',
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 95,
          statements: 95,
        },
      },
    },
    
    // Test timeout for async operations
    testTimeout: 10000,
    
    // Global test setup
    setupFiles: ['./src/test-setup.ts'],
    
    // Watch options
    watch: {
      include: ['src/**/*.ts'],
    },
    
    // Reporter configuration
    reporter: ['verbose', 'json', 'html'],
    
    // Parallel test execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
  
  // Resolve aliases for imports
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '@test': new URL('./src/test', import.meta.url).pathname,
    },
  },
  
  // Define transformations for TypeScript files
  define: {
    'import.meta.vitest': undefined,
  },
});