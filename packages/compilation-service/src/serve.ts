#!/usr/bin/env npx tsx
/**
 * Start the LokaScript Compilation Service HTTP server.
 *
 * Usage:
 *   npx tsx src/serve.ts              # port 3001
 *   PORT=8080 npx tsx src/serve.ts    # custom port
 */
import { serve } from './http.js';

const port = parseInt(process.env.PORT || '3001', 10);

serve({ port, corsOrigin: '*' });
