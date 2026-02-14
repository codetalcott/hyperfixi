import { ExpressGenerator } from './express-generator.js';
import { HonoGenerator } from './hono-generator.js';
import { OpenAPIGenerator } from './openapi-generator.js';
import { DjangoGenerator } from './django-generator.js';
import { FastAPIGenerator } from './fastapi-generator.js';
import type { RouteGenerator } from './types.js';

/**
 * Select the appropriate RouteGenerator for a framework name.
 * Falls back to ExpressGenerator for unrecognized values.
 */
export function selectGenerator(framework: string): RouteGenerator {
  switch (framework) {
    case 'hono':
      return new HonoGenerator();
    case 'openapi':
      return new OpenAPIGenerator();
    case 'django':
      return new DjangoGenerator();
    case 'fastapi':
      return new FastAPIGenerator();
    default:
      return new ExpressGenerator();
  }
}
