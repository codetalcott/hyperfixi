/**
 * HyperfixiService - HTTP API for hyperscript compilation
 */

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { CompilationCache } from '../cache/compilation-cache.js';
import { ServerContextParser } from '../parser/server-context-parser.js';
import { HyperscriptCompiler } from './hyperscript-compiler.js';
import type {
  ServiceConfig,
  CompileRequest,
  CompileResponse,
  ValidateRequest,
  ValidateResponse,
  BatchCompileRequest,
  CompilationOptions,
  DocsRequest,
  DocsResponse,
} from '../types.js';
import {
  generateDocumentation,
  generateMarkdown,
  generateHTML,
  analyzeMetrics,
} from '@hyperfixi/core/ast-utils';

export class HyperfixiService {
  private app: Application;
  private server: any;
  private config: ServiceConfig;
  private cache: CompilationCache;
  private parser: ServerContextParser;
  private compiler: HyperscriptCompiler;
  private startTime: number;

  constructor(config: ServiceConfig) {
    this.config = config;
    this.startTime = Date.now();
    this.app = express();
    this.cache = new CompilationCache({
      maxSize: config.cache.maxSize,
      ttl: config.cache.ttl,
    });
    this.parser = new ServerContextParser();
    this.compiler = new HyperscriptCompiler(this.cache);

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<Application> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, this.config.host, () => {
          console.log(`HyperfixiService listening on ${this.config.host}:${this.config.port}`);
          resolve(this.app);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the HTTP server
   */
  async stop(): Promise<void> {
    return new Promise(resolve => {
      if (this.server) {
        this.server.close(() => {
          console.log('HyperfixiService stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get the port the server is listening on
   */
  getPort(): number {
    return this.server?.address()?.port || this.config.port;
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security headers
    if (this.config.security.helmet) {
      this.app.use(helmet());
    }

    // Compression
    if (this.config.security.compression) {
      this.app.use(compression());
    }

    // CORS
    if (this.config.cors.enabled) {
      this.app.use(
        cors({
          origin: this.config.cors.origins.includes('*') ? true : this.config.cors.origins,
        })
      );
    }

    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
      next();
    });

    // Error handling
    this.app.use((error: any, req: Request, res: Response, next: any) => {
      console.error('Request error:', error);

      if (error instanceof SyntaxError && 'body' in error) {
        return res.status(400).json({
          error: 'Invalid JSON in request body',
        });
      }

      res.status(500).json({
        error: 'Internal server error',
      });
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', this.handleHealthCheck.bind(this));

    // Compilation endpoints
    this.app.post('/compile', this.handleCompile.bind(this));
    this.app.post('/validate', this.handleValidate.bind(this));
    this.app.post('/batch', this.handleBatch.bind(this));

    // Cache management
    this.app.post('/cache/clear', this.handleCacheClear.bind(this));
    this.app.get('/cache/stats', this.handleCacheStats.bind(this));

    // Documentation endpoints
    this.app.post('/docs', this.handleDocs.bind(this));
    this.app.post('/docs/markdown', this.handleDocsMarkdown.bind(this));
    this.app.post('/docs/html', this.handleDocsHTML.bind(this));

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
      });
    });
  }

  /**
   * Health check endpoint
   */
  private async handleHealthCheck(req: Request, res: Response): Promise<void> {
    const uptime = Date.now() - this.startTime;
    const cacheStats = this.cache.getStats();

    res.json({
      status: 'healthy',
      version: '0.1.0',
      uptime,
      cache: cacheStats,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Compile endpoint
   */
  private async handleCompile(req: Request, res: Response): Promise<void> {
    try {
      const compileRequest = req.body as CompileRequest;

      // Validate request
      if (!compileRequest.scripts || typeof compileRequest.scripts !== 'object') {
        res.status(400).json({
          error: 'Missing or invalid "scripts" field',
        });
        return;
      }

      const startTime = performance.now();
      const result = await this.compileScripts(compileRequest);
      const endTime = performance.now();

      result.timings.total = endTime - startTime;

      res.json(result);
    } catch (error) {
      console.error('Compilation error:', error);
      res.status(500).json({
        error: 'Compilation failed',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Validate endpoint
   */
  private async handleValidate(req: Request, res: Response): Promise<void> {
    try {
      const validateRequest = req.body as ValidateRequest;

      // Validate request
      if (!validateRequest.script || typeof validateRequest.script !== 'string') {
        res.status(400).json({
          error: 'Missing or invalid "script" field',
        });
        return;
      }

      const result = await this.validateScript(validateRequest);
      res.json(result);
    } catch (error) {
      console.error('Validation error:', error);
      res.status(500).json({
        error: 'Validation failed',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Batch compile endpoint
   */
  private async handleBatch(req: Request, res: Response): Promise<void> {
    try {
      const batchRequest = req.body as BatchCompileRequest;

      // Validate request
      if (!batchRequest.definitions || !Array.isArray(batchRequest.definitions)) {
        res.status(400).json({
          error: 'Missing or invalid "definitions" field',
        });
        return;
      }

      const startTime = performance.now();
      const result = await this.compileBatch(batchRequest);
      const endTime = performance.now();

      result.timings.total = endTime - startTime;

      res.json(result);
    } catch (error) {
      console.error('Batch compilation error:', error);
      res.status(500).json({
        error: 'Batch compilation failed',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Cache clear endpoint
   */
  private async handleCacheClear(req: Request, res: Response): Promise<void> {
    this.cache.clear();
    res.json({
      message: 'Cache cleared successfully',
    });
  }

  /**
   * Cache stats endpoint
   */
  private async handleCacheStats(req: Request, res: Response): Promise<void> {
    const stats = this.cache.getStats();
    res.json(stats);
  }

  /**
   * Documentation endpoint - returns JSON documentation
   */
  private async handleDocs(req: Request, res: Response): Promise<void> {
    try {
      const docsRequest = req.body as DocsRequest;

      if (!docsRequest.script || typeof docsRequest.script !== 'string') {
        res.status(400).json({
          error: 'Missing or invalid "script" field',
        });
        return;
      }

      const parsed = this.parser.parse(docsRequest.script, docsRequest.context);
      const ast = await this.compiler.getAST(parsed.processed);

      if (!ast) {
        res.status(400).json({
          error: 'Could not parse script',
        });
        return;
      }

      const docs = generateDocumentation(ast);

      // Include metrics if requested
      if (docsRequest.options?.includeMetrics) {
        const metrics = analyzeMetrics(ast);
        res.json({
          ...docs,
          metrics: {
            complexity: metrics.complexity.cyclomatic,
            maintainability: metrics.maintainabilityIndex,
            readability: metrics.readabilityScore,
          },
        });
      } else {
        res.json(docs);
      }
    } catch (error) {
      console.error('Documentation generation error:', error);
      res.status(500).json({
        error: 'Documentation generation failed',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Documentation endpoint - returns Markdown
   */
  private async handleDocsMarkdown(req: Request, res: Response): Promise<void> {
    try {
      const docsRequest = req.body as DocsRequest;

      if (!docsRequest.script || typeof docsRequest.script !== 'string') {
        res.status(400).json({
          error: 'Missing or invalid "script" field',
        });
        return;
      }

      const parsed = this.parser.parse(docsRequest.script, docsRequest.context);
      const ast = await this.compiler.getAST(parsed.processed);

      if (!ast) {
        res.status(400).json({
          error: 'Could not parse script',
        });
        return;
      }

      const markdown = generateMarkdown(ast);
      res.type('text/markdown').send(markdown);
    } catch (error) {
      console.error('Markdown generation error:', error);
      res.status(500).json({
        error: 'Markdown generation failed',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Documentation endpoint - returns HTML
   */
  private async handleDocsHTML(req: Request, res: Response): Promise<void> {
    try {
      const docsRequest = req.body as DocsRequest;

      if (!docsRequest.script || typeof docsRequest.script !== 'string') {
        res.status(400).json({
          error: 'Missing or invalid "script" field',
        });
        return;
      }

      const parsed = this.parser.parse(docsRequest.script, docsRequest.context);
      const ast = await this.compiler.getAST(parsed.processed);

      if (!ast) {
        res.status(400).json({
          error: 'Could not parse script',
        });
        return;
      }

      const html = generateHTML(ast);
      res.type('text/html').send(html);
    } catch (error) {
      console.error('HTML generation error:', error);
      res.status(500).json({
        error: 'HTML generation failed',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Compile multiple scripts
   */
  private async compileScripts(request: CompileRequest): Promise<CompileResponse> {
    const compiled: Record<string, string> = {};
    const metadata: Record<string, any> = {};
    const warnings: any[] = [];
    const errors: any[] = [];

    const timings = {
      total: 0,
      parse: 0,
      compile: 0,
      cache: 0,
    };

    for (const [name, script] of Object.entries(request.scripts)) {
      try {
        const parseStart = performance.now();

        // Parse with context
        const parsed = this.parser.parse(script, request.context);

        const parseEnd = performance.now();
        timings.parse += parseEnd - parseStart;

        const compileStart = performance.now();

        // Compile the processed script
        const result = await this.compiler.compile(parsed.processed, request.options || {});

        const compileEnd = performance.now();
        timings.compile += compileEnd - compileStart;

        compiled[name] = result.compiled;
        metadata[name] = {
          ...parsed.metadata,
          ...result.metadata,
        };

        warnings.push(...result.warnings);
        errors.push(...result.errors);
      } catch (error) {
        errors.push({
          type: 'CompilationError',
          message: error instanceof Error ? error.message : String(error),
          script: name,
          line: 1,
          column: 1,
        });
      }
    }

    return {
      compiled,
      metadata,
      timings,
      warnings,
      errors,
    };
  }

  /**
   * Validate a single script
   */
  private async validateScript(request: ValidateRequest): Promise<ValidateResponse> {
    try {
      // Parse with context
      const parsed = this.parser.parse(request.script, request.context);

      // Try to compile to check for errors
      const result = await this.compiler.compile(parsed.processed, {}, true); // validation mode

      return {
        valid: result.errors.length === 0,
        errors: result.errors,
        warnings: result.warnings,
        metadata: {
          ...parsed.metadata,
          ...result.metadata,
        },
      };
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            type: 'ValidationError',
            message: error instanceof Error ? error.message : String(error),
            line: 1,
            column: 1,
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Compile batch of scripts
   */
  private async compileBatch(request: BatchCompileRequest): Promise<CompileResponse> {
    const compiled: Record<string, string> = {};
    const metadata: Record<string, any> = {};
    const warnings: any[] = [];
    const errors: any[] = [];

    const timings = {
      total: 0,
      parse: 0,
      compile: 0,
      cache: 0,
    };

    // Process definitions in parallel for better performance
    const results = await Promise.allSettled(
      request.definitions.map(async definition => {
        const parseStart = performance.now();

        const parsed = this.parser.parse(definition.script, definition.context);

        const parseEnd = performance.now();

        const compileStart = performance.now();

        const result = await this.compiler.compile(parsed.processed, definition.options || {});

        const compileEnd = performance.now();

        return {
          id: definition.id,
          compiled: result.compiled,
          metadata: {
            ...parsed.metadata,
            ...result.metadata,
          },
          warnings: result.warnings,
          errors: result.errors,
          timings: {
            parse: parseEnd - parseStart,
            compile: compileEnd - compileStart,
          },
        };
      })
    );

    // Collect results
    results.forEach((result, index) => {
      const definition = request.definitions[index];

      if (result.status === 'fulfilled') {
        const value = result.value;
        compiled[value.id] = value.compiled;
        metadata[value.id] = value.metadata;
        warnings.push(...value.warnings);
        errors.push(...value.errors);
        timings.parse += value.timings.parse;
        timings.compile += value.timings.compile;
      } else {
        errors.push({
          type: 'CompilationError',
          message: result.reason?.message || 'Unknown error',
          script: definition.id,
          line: 1,
          column: 1,
        });
      }
    });

    return {
      compiled,
      metadata,
      timings,
      warnings,
      errors,
    };
  }
}
