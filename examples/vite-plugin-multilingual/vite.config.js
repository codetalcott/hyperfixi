import { hyperfixi } from '@hyperfixi/vite-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  plugins: [
    hyperfixi({
      // Mode: 'interpret' (default) or 'compile' (smallest bundles)
      // mode: 'compile',  // Uncomment for ~1KB bundles (no runtime parser)

      // Auto-detect languages from source files
      semantic: 'auto',

      // Always include English as fallback
      extraLanguages: ['en'],

      // Enable debug logging to see detected languages
      debug: true,
    }),
  ],
  optimizeDeps: {
    exclude: ['hyperfixi', 'virtual:hyperfixi'],
  },
  resolve: {
    alias: {
      // Resolve to built files (symlinked packages handle this automatically)
    },
  },
};
