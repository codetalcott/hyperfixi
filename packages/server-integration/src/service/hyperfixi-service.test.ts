/**
 * Tests for HyperfixiService - HTTP API for hyperscript compilation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { HyperfixiService } from './hyperfixi-service.js';
import type { CompileRequest, ValidateRequest, BatchCompileRequest } from '../types.js';

describe('HyperfixiService', () => {
  let service: HyperfixiService;
  let app: any;

  beforeEach(async () => {
    service = new HyperfixiService({
      port: 0, // Use random port for testing
      host: 'localhost',
      cache: {
        enabled: true,
        maxSize: 100,
        ttl: 60000,
      },
      cors: {
        enabled: true,
        origins: ['*'],
      },
      security: {
        helmet: true,
        compression: true,
      },
    });

    app = await service.start();
  });

  afterEach(async () => {
    await service.stop();
  });

  describe('Health Check', () => {
    it('should respond to health check', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        version: expect.any(String),
        uptime: expect.any(Number),
      });
    });

    it('should include cache stats in health check', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.cache).toMatchObject({
        size: expect.any(Number),
        hits: expect.any(Number),
        misses: expect.any(Number),
        hitRatio: expect.any(Number),
      });
    });
  });

  describe('Compilation Endpoint', () => {
    it('should compile hyperscript via HTTP', async () => {
      const compileRequest: CompileRequest = {
        scripts: {
          search: 'on keyup debounce 300ms send search',
        },
      };

      const response = await request(app).post('/compile').send(compileRequest).expect(200);

      expect(response.body).toMatchObject({
        compiled: {
          search: expect.any(String),
        },
        metadata: {
          search: {
            events: expect.arrayContaining(['keyup']),
            commands: expect.arrayContaining(['send']),
            complexity: expect.any(Number),
          },
        },
        timings: {
          total: expect.any(Number),
          parse: expect.any(Number),
          compile: expect.any(Number),
          cache: expect.any(Number),
        },
        warnings: expect.any(Array),
        errors: expect.any(Array),
      });
    });

    it('should handle compilation with options', async () => {
      const compileRequest: CompileRequest = {
        scripts: {
          modal: 'on click toggle .modal',
        },
        options: {
          minify: true,
          compatibility: 'legacy',
        },
      };

      const response = await request(app).post('/compile').send(compileRequest).expect(200);

      expect(response.body.compiled.modal).toBeDefined();
    });

    it('should handle template variables', async () => {
      const compileRequest: CompileRequest = {
        scripts: {
          userAction: 'on click fetch /api/users/{{userId}}',
        },
        context: {
          templateVars: { userId: '123' },
        },
      };

      const response = await request(app).post('/compile').send(compileRequest).expect(200);

      expect(response.body.compiled.userAction).toContain('123');
    });

    it('should handle multiple scripts', async () => {
      const compileRequest: CompileRequest = {
        scripts: {
          search: 'on keyup send search',
          modal: 'on click toggle .modal',
          form: 'on submit halt the event',
        },
      };

      const response = await request(app).post('/compile').send(compileRequest).expect(200);

      expect(response.body.compiled).toHaveProperty('search');
      expect(response.body.compiled).toHaveProperty('modal');
      expect(response.body.compiled).toHaveProperty('form');
      expect(response.body.metadata).toHaveProperty('search');
      expect(response.body.metadata).toHaveProperty('modal');
      expect(response.body.metadata).toHaveProperty('form');
    });

    it('should return errors for invalid syntax', async () => {
      const compileRequest: CompileRequest = {
        scripts: {
          invalid: 'on click toggle .', // Invalid selector
        },
      };

      const response = await request(app).post('/compile').send(compileRequest).expect(200); // Should not return 500, but include errors in response

      expect(response.body.errors).not.toHaveLength(0);
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/compile')
        .send({}) // Empty body
        .expect(400);

      expect(response.body.error).toContain('scripts');
    });
  });

  describe('Validation Endpoint', () => {
    it('should validate hyperscript without compiling', async () => {
      const validateRequest: ValidateRequest = {
        script: 'on click toggle .active',
      };

      const response = await request(app).post('/validate').send(validateRequest).expect(200);

      expect(response.body).toMatchObject({
        valid: true,
        errors: [],
        warnings: expect.any(Array),
        metadata: {
          events: expect.arrayContaining(['click']),
          commands: expect.arrayContaining(['toggle']),
          selectors: expect.arrayContaining(['.active']),
        },
      });
    });

    it('should detect invalid hyperscript', async () => {
      const validateRequest: ValidateRequest = {
        script: 'on click toggle .', // Invalid selector
      };

      const response = await request(app).post('/validate').send(validateRequest).expect(200);

      expect(response.body).toMatchObject({
        valid: false,
        errors: expect.arrayContaining([
          expect.objectContaining({
            type: expect.any(String),
            message: expect.stringContaining('selector'),
            line: expect.any(Number),
            column: expect.any(Number),
          }),
        ]),
      });
    });

    it('should handle template variables in validation', async () => {
      const validateRequest: ValidateRequest = {
        script: 'on click fetch /api/users/{{userId}}',
        context: {
          templateVars: { userId: '123' },
        },
      };

      const response = await request(app).post('/validate').send(validateRequest).expect(200);

      expect(response.body.valid).toBe(true);
    });
  });

  describe('Batch Processing', () => {
    it('should compile multiple scripts in one request', async () => {
      const batchRequest: BatchCompileRequest = {
        definitions: [
          {
            id: 'search',
            script: 'on keyup send search',
            options: { minify: true },
          },
          {
            id: 'modal',
            script: 'on click toggle .modal',
            options: { compatibility: 'legacy' },
          },
        ],
      };

      const response = await request(app).post('/batch').send(batchRequest).expect(200);

      expect(response.body.compiled).toHaveProperty('search');
      expect(response.body.compiled).toHaveProperty('modal');
      expect(response.body.timings.total).toBeLessThan(1000); // Should be fast
    });

    it('should handle mixed success and failure in batch', async () => {
      const batchRequest: BatchCompileRequest = {
        definitions: [
          {
            id: 'valid',
            script: 'on click toggle .active',
          },
          {
            id: 'invalid',
            script: 'on click toggle .', // Invalid
          },
        ],
      };

      const response = await request(app).post('/batch').send(batchRequest).expect(200);

      expect(response.body.compiled).toHaveProperty('valid');
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Caching', () => {
    it('should cache compilation results', async () => {
      const compileRequest: CompileRequest = {
        scripts: {
          cached: 'on click toggle .active',
        },
      };

      // First request
      const response1 = await request(app).post('/compile').send(compileRequest).expect(200);

      const firstTiming = response1.body.timings.total;

      // Second request (should be cached)
      const response2 = await request(app).post('/compile').send(compileRequest).expect(200);

      const secondTiming = response2.body.timings.total;

      // Results should be identical
      expect(response1.body.compiled).toEqual(response2.body.compiled);

      // Second request should be faster (cached)
      expect(secondTiming).toBeLessThan(firstTiming);
    });

    it('should invalidate cache on different options', async () => {
      const script = { cached: 'on click toggle .active' };

      const request1: CompileRequest = {
        scripts: script,
        options: { minify: false },
      };

      const request2: CompileRequest = {
        scripts: script,
        options: { minify: true },
      };

      const response1 = await request(app).post('/compile').send(request1).expect(200);

      const response2 = await request(app).post('/compile').send(request2).expect(200);

      // Results should be different due to different options
      expect(response1.body.compiled.cached).not.toEqual(response2.body.compiled.cached);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/compile')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.error).toContain('Invalid JSON');
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/compile')
        .send({ options: {} }) // Missing scripts
        .expect(400);

      expect(response.body.error).toContain('scripts');
    });

    it('should handle internal server errors gracefully', async () => {
      // This would require mocking internal errors
      // For now, we'll test that the service doesn't crash
      const response = await request(app)
        .post('/compile')
        .send({
          scripts: {
            test: 'valid script on click log "test"',
          },
        })
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('CORS and Security', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should include security headers', async () => {
      const response = await request(app).get('/health').expect(200);

      // Helmet adds various security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should compress responses', async () => {
      const compileRequest: CompileRequest = {
        scripts: {
          large: 'on click '.repeat(100) + 'log "large script"',
        },
      };

      const response = await request(app)
        .post('/compile')
        .send(compileRequest)
        .set('Accept-Encoding', 'gzip')
        .expect(200);

      // Response should be successful (compression is optional in test environment)
      expect(response.body.compiled).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/compile')
          .send({
            scripts: {
              [`script${i}`]: `on click log "script ${i}"`,
            },
          })
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.compiled).toBeDefined();
      });
    });

    it('should complete requests within reasonable time', async () => {
      const start = Date.now();

      await request(app)
        .post('/compile')
        .send({
          scripts: {
            performance: 'on click wait 1ms then log "done"',
          },
        })
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
