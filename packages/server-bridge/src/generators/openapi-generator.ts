import type { RouteDescriptor, GeneratorOptions, GenerateResult, GeneratedFile } from '../types.js';
import type { RouteGenerator } from './types.js';

export class OpenAPIGenerator implements RouteGenerator {
  readonly framework = 'openapi';

  generate(routes: RouteDescriptor[], options: GeneratorOptions): GenerateResult {
    const files: GeneratedFile[] = [];
    const warnings: string[] = [];

    if (routes.length === 0) {
      warnings.push('No routes to generate');
      return { files, preserved: [], warnings };
    }

    const spec = this.buildSpec(routes);
    const yaml = this.toYaml(spec);

    files.push({
      path: 'openapi.yaml',
      content: yaml,
      isNew: true,
    });

    return { files, preserved: [], warnings };
  }

  private buildSpec(routes: RouteDescriptor[]): OpenAPISpec {
    const paths: Record<string, Record<string, OpenAPIOperation>> = {};

    for (const route of routes) {
      // Convert :param to {param} for OpenAPI
      const oaPath = route.path.replace(/:(\w+)/g, '{$1}');
      const method = route.method.toLowerCase();

      if (!paths[oaPath]) {
        paths[oaPath] = {};
      }

      paths[oaPath][method] = this.buildOperation(route);
    }

    return {
      openapi: '3.1.0',
      info: {
        title: 'ServerBridge Generated API',
        version: '0.1.0',
        description: 'Auto-extracted from hyperscript/htmx attributes',
      },
      paths,
    };
  }

  private buildOperation(route: RouteDescriptor): OpenAPIOperation {
    const op: OpenAPIOperation = {
      operationId: route.handlerName,
      summary: `Source: ${route.source.file}${route.source.line ? ':' + route.source.line : ''} (${route.source.kind})`,
      responses: {
        '200': this.buildResponse(route),
      },
    };

    // Path parameters
    if (route.pathParams.length > 0) {
      op.parameters = route.pathParams.map(name => ({
        name,
        in: 'path' as const,
        required: true,
        schema: { type: inferParamType(name) },
      }));
    }

    // Query parameters
    if (route.queryParams && route.queryParams.length > 0) {
      const queryParamSpecs = route.queryParams.map(param => ({
        name: param.name,
        in: 'query' as const,
        required: param.required,
        schema: { type: 'string' as const },
      }));
      if (op.parameters) {
        op.parameters.push(...queryParamSpecs);
      } else {
        op.parameters = queryParamSpecs;
      }
    }

    // Request body
    if (
      route.requestBody &&
      route.requestBody.length > 0 &&
      ['POST', 'PUT', 'PATCH'].includes(route.method)
    ) {
      const required = route.requestBody.filter(f => f.required).map(f => f.name);
      const properties: Record<string, { type: string; format?: string }> = {};

      for (const field of route.requestBody) {
        properties[field.name] = fieldToSchema(field.type);
      }

      op.requestBody = {
        required: required.length > 0,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              ...(required.length > 0 ? { required } : {}),
              properties,
            },
          },
        },
      };
    }

    return op;
  }

  private buildResponse(route: RouteDescriptor): OpenAPIResponse {
    const contentType =
      route.responseFormat === 'json'
        ? 'application/json'
        : route.responseFormat === 'html'
          ? 'text/html'
          : 'text/plain';

    return {
      description: 'Success',
      content: {
        [contentType]: {
          schema: route.responseFormat === 'json' ? { type: 'object' } : { type: 'string' },
        },
      },
    };
  }

  /**
   * Minimal YAML serializer — avoids adding a yaml dependency.
   * Handles the specific nested structure of OpenAPI specs.
   */
  toYaml(obj: unknown, indent: number = 0): string {
    const pad = '  '.repeat(indent);

    if (obj === null || obj === undefined) {
      return 'null';
    }

    if (typeof obj === 'string') {
      // Quote strings that could be ambiguous
      if (
        obj === '' ||
        obj.includes(':') ||
        obj.includes('#') ||
        obj.includes("'") ||
        /^\d/.test(obj) ||
        obj === 'true' ||
        obj === 'false'
      ) {
        return `'${obj.replace(/'/g, "''")}'`;
      }
      return obj;
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return String(obj);
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';

      // For simple string/number arrays, use inline format
      if (obj.every(item => typeof item === 'string' || typeof item === 'number')) {
        return `[${obj.map(item => (typeof item === 'string' ? `'${item}'` : String(item))).join(', ')}]`;
      }

      return obj
        .map(item => {
          if (typeof item === 'object' && item !== null) {
            const inner = this.toYaml(item, indent + 1).trimStart();
            return `${pad}- ${inner}`;
          }
          return `${pad}- ${this.toYaml(item)}`;
        })
        .join('\n');
    }

    if (typeof obj === 'object') {
      const entries = Object.entries(obj as Record<string, unknown>);
      if (entries.length === 0) return '{}';

      return entries
        .map(([key, value]) => {
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const inner = this.toYaml(value, indent + 1);
            return `${pad}${key}:\n${inner}`;
          }
          if (Array.isArray(value) && value.length > 0 && value.some(v => typeof v === 'object')) {
            const inner = this.toYaml(value, indent + 1);
            return `${pad}${key}:\n${inner}`;
          }
          return `${pad}${key}: ${this.toYaml(value, indent + 1)}`;
        })
        .join('\n');
    }

    return String(obj);
  }
}

// --- Helper types (not exported) ---

interface OpenAPISpec {
  openapi: string;
  info: { title: string; version: string; description: string };
  paths: Record<string, Record<string, OpenAPIOperation>>;
}

interface OpenAPIOperation {
  operationId: string;
  summary: string;
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
}

interface OpenAPIParameter {
  name: string;
  in: 'path' | 'query';
  required: boolean;
  schema: { type: string };
}

interface OpenAPIRequestBody {
  required: boolean;
  content: Record<string, { schema: Record<string, unknown> }>;
}

interface OpenAPIResponse {
  description: string;
  content: Record<string, { schema: { type: string } }>;
}

function inferParamType(name: string): string {
  if (name === 'id' || name.endsWith('Id')) return 'string';
  if (name === 'page' || name === 'limit' || name === 'offset') return 'integer';
  return 'string';
}

function fieldToSchema(type: string): { type: string; format?: string } {
  switch (type) {
    case 'number':
      return { type: 'number' };
    case 'boolean':
      return { type: 'boolean' };
    case 'file':
      return { type: 'string', format: 'binary' };
    default:
      return { type: 'string' };
  }
}
