/**
 * Node.js TRON Adapter - Reference Implementation
 *
 * This is the reference implementation for TRON-HyperFixi integration.
 * Uses native bindings to Lite³ C library via node-ffi-napi.
 *
 * For development/testing, a pure JS emulation layer is also provided.
 */

import {
  BaseTronAdapter,
  type TronAdapterConfig,
  type AdapterResult,
} from '../../adapters/adapter-interface';
import type {
  TronMessage,
  TronPayloadType,
  TronHeader,
  TronFlags,
  CompileRequest,
  CompileResult,
  ExecuteRequest,
  ExecuteResult,
  ValidateRequest,
  ValidateResult,
  TranslateRequest,
  TranslateResult,
  HydrateRequest,
  HydrateResult,
  BatchRequest,
  BatchResult,
  TronErrorCode,
} from '../../types/protocol';

// =============================================================================
// TRON Encoding Constants
// =============================================================================

const TRON_MAGIC = 0x54524F4E; // "TRON" in ASCII
const TRON_HEADER_SIZE = 8;

// =============================================================================
// Node.js Adapter Implementation
// =============================================================================

export class NodeTronAdapter extends BaseTronAdapter {
  private nativeBindings: TronNativeBindings | null = null;
  private emulationMode: boolean = false;

  constructor(config: Partial<TronAdapterConfig> = {}) {
    super(config);
  }

  async initialize(): Promise<void> {
    this.log('Initializing Node.js TRON adapter...');

    try {
      // Try to load native TRON bindings
      this.nativeBindings = await this.loadNativeBindings();
      this.log('Native TRON bindings loaded successfully');
    } catch (error) {
      this.log('Native bindings unavailable, using emulation mode:', error);
      this.emulationMode = true;
    }

    this.ready = true;
    this.log(`Adapter initialized (mode: ${this.emulationMode ? 'emulation' : 'native'})`);
  }

  async dispose(): Promise<void> {
    this.log('Disposing Node.js TRON adapter...');

    if (this.nativeBindings) {
      this.nativeBindings.cleanup();
      this.nativeBindings = null;
    }

    this.ready = false;
  }

  // -------------------------------------------------------------------------
  // Serialization
  // -------------------------------------------------------------------------

  async encode<T extends TronPayloadType>(message: TronMessage<T>): Promise<Uint8Array> {
    if (!this.ready) {
      throw new Error('Adapter not initialized');
    }

    if (this.emulationMode) {
      return this.encodeEmulated(message);
    }

    return this.nativeBindings!.encode(message);
  }

  async decode<T extends TronPayloadType>(buffer: Uint8Array): Promise<TronMessage<T>> {
    if (!this.ready) {
      throw new Error('Adapter not initialized');
    }

    if (this.emulationMode) {
      return this.decodeEmulated(buffer);
    }

    return this.nativeBindings!.decode(buffer);
  }

  // -------------------------------------------------------------------------
  // HyperFixi Operations
  // -------------------------------------------------------------------------

  async compile(request: CompileRequest): Promise<AdapterResult<CompileResult>> {
    if (!this.ready) {
      return {
        success: false,
        error: {
          code: 5001 as TronErrorCode,
          message: 'Adapter not initialized',
        },
      };
    }

    try {
      const startTime = performance.now();

      // Use hyperfixi's compilation API
      const { hyperscript } = await import('@hyperfixi/core');

      const result = await hyperscript.compileAsync(request.source, {
        language: request.language,
        confidenceThreshold: request.options?.confidenceThreshold,
        traditional: request.options?.traditional,
      });

      const compileTime = performance.now() - startTime;

      if (!result.ok) {
        return {
          success: false,
          error: {
            code: 2000 as TronErrorCode, // PARSE_ERROR
            message: result.errors.map(e => e.message).join('; '),
          },
        };
      }

      // Encode AST to TRON format
      const ast = await this.encodeAST(result.code);

      return {
        success: true,
        data: {
          ast,
          meta: {
            parserUsed: result.meta.parser as 'semantic' | 'traditional',
            semanticConfidence: result.meta.confidence,
            detectedLanguage: result.meta.language,
            warnings: result.meta.warnings,
            compileTimeMs: compileTime,
          },
          sourceMap: request.options?.sourceMap ? result.meta.sourceMap : undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 5000 as TronErrorCode,
          message: error instanceof Error ? error.message : 'Unknown compilation error',
          cause: error instanceof Error ? error : undefined,
        },
      };
    }
  }

  async execute(request: ExecuteRequest): Promise<AdapterResult<ExecuteResult>> {
    if (!this.ready) {
      return {
        success: false,
        error: {
          code: 5001 as TronErrorCode,
          message: 'Adapter not initialized',
        },
      };
    }

    try {
      const startTime = performance.now();
      const { hyperscript } = await import('@hyperfixi/core');

      // Get source code from request
      let source: string;
      if (typeof request.code === 'string') {
        source = request.code;
      } else {
        // Decode TRON AST
        source = await this.decodeAST(request.code);
      }

      // Create execution context
      const context = hyperscript.createContext();

      // Set up locals and globals
      if (request.context?.locals) {
        for (const [key, value] of Object.entries(request.context.locals)) {
          context.locals[key] = value;
        }
      }

      // Execute
      const value = await hyperscript.eval(source, undefined, {
        ...request.context?.globals,
      });

      const executionTime = performance.now() - startTime;

      return {
        success: true,
        data: {
          success: true,
          value,
          context: {
            locals: { ...context.locals },
            globals: request.context?.globals,
          },
          meta: {
            executionTimeMs: executionTime,
            commandsExecuted: 1, // Would need deeper integration to track
            sideEffects: [], // Would need side-effect tracking
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 3000 as TronErrorCode, // RUNTIME_ERROR
          message: error instanceof Error ? error.message : 'Unknown execution error',
          cause: error instanceof Error ? error : undefined,
        },
      };
    }
  }

  async validate(request: ValidateRequest): Promise<AdapterResult<ValidateResult>> {
    try {
      const { hyperscript } = await import('@hyperfixi/core');

      const result = await hyperscript.validate(request.source);

      return {
        success: true,
        data: {
          valid: result.valid,
          errors: result.errors.map(e => ({
            message: e.message,
            line: e.line,
            column: e.column,
            code: e.code,
          })),
          warnings: result.warnings?.map(w => ({
            message: w.message,
            line: w.line,
            column: w.column,
            code: w.code,
          })) || [],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 4000 as TronErrorCode,
          message: error instanceof Error ? error.message : 'Validation failed',
        },
      };
    }
  }

  async translate(request: TranslateRequest): Promise<AdapterResult<TranslateResult>> {
    try {
      const { MultilingualHyperscript } = await import('@hyperfixi/core');

      const ml = new MultilingualHyperscript();
      await ml.initialize();

      const translated = await ml.translate(
        request.source,
        request.fromLanguage,
        request.toLanguage
      );

      return {
        success: true,
        data: {
          translated,
          confidence: 0.95, // Would need deeper integration
          untranslatable: [],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 2002 as TronErrorCode, // UNSUPPORTED_LANGUAGE
          message: error instanceof Error ? error.message : 'Translation failed',
        },
      };
    }
  }

  async hydrate(request: HydrateRequest): Promise<AdapterResult<HydrateResult>> {
    try {
      // Encode hydration state to TRON
      const stateData = {
        components: request.components,
        globalState: request.globalState,
      };

      const stateBlob = await this.encode({
        header: this.createHeader(),
        payload: {
          type: 'hydrate' as const,
          id: 'hydrate-' + Date.now(),
          data: request,
        },
      });

      // Generate hydration script
      const scripts = request.scripts?.map(s => `hyperfixi.eval(\`${s}\`)`).join(';\n') || '';
      const componentInit = request.components
        .map(c => `hyperfixi.hydrate('${c.selector}', ${JSON.stringify(c.state)})`)
        .join(';\n');

      const script = `
(function() {
  const state = window.__HYPERFIXI_STATE__;
  ${componentInit}
  ${scripts}
})();
`.trim();

      return {
        success: true,
        data: {
          script,
          stateBlob,
          metrics: {
            stateSize: stateBlob.length,
            scriptSize: script.length,
            componentCount: request.components.length,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 5000 as TronErrorCode,
          message: error instanceof Error ? error.message : 'Hydration failed',
        },
      };
    }
  }

  async batch(request: BatchRequest): Promise<AdapterResult<BatchResult>> {
    const startTime = performance.now();
    const results: BatchResult['results'] = [];

    if (request.parallel) {
      // Execute operations in parallel
      const promises = request.operations.map(async op => {
        try {
          let result: AdapterResult<unknown>;

          switch (op.type) {
            case 'compile':
              result = await this.compile(op.data);
              break;
            case 'execute':
              result = await this.execute(op.data);
              break;
            case 'validate':
              result = await this.validate(op.data);
              break;
            case 'translate':
              result = await this.translate(op.data);
              break;
            default:
              result = {
                success: false,
                error: {
                  code: 1002 as TronErrorCode,
                  message: `Unknown operation type: ${(op as any).type}`,
                },
              };
          }

          return {
            id: op.id,
            success: result.success,
            result: result.success ? result.data : undefined,
            error: result.success ? undefined : result.error,
          };
        } catch (error) {
          return {
            id: op.id,
            success: false,
            error: {
              type: 'error' as const,
              id: op.id,
              data: {
                code: 5000 as TronErrorCode,
                message: error instanceof Error ? error.message : 'Unknown error',
              },
            },
          };
        }
      });

      const opResults = await Promise.all(promises);
      results.push(...opResults);
    } else {
      // Execute operations sequentially
      for (const op of request.operations) {
        try {
          let result: AdapterResult<unknown>;

          switch (op.type) {
            case 'compile':
              result = await this.compile(op.data);
              break;
            case 'execute':
              result = await this.execute(op.data);
              break;
            case 'validate':
              result = await this.validate(op.data);
              break;
            case 'translate':
              result = await this.translate(op.data);
              break;
            default:
              result = {
                success: false,
                error: {
                  code: 1002 as TronErrorCode,
                  message: `Unknown operation type: ${(op as any).type}`,
                },
              };
          }

          results.push({
            id: op.id,
            success: result.success,
            result: result.success ? result.data : undefined,
            error: result.success ? undefined : (result.error as any),
          });

          if (!result.success && request.stopOnError) {
            break;
          }
        } catch (error) {
          results.push({
            id: op.id,
            success: false,
            error: {
              type: 'error' as const,
              id: op.id,
              data: {
                code: 5000 as TronErrorCode,
                message: error instanceof Error ? error.message : 'Unknown error',
              },
            },
          });

          if (request.stopOnError) {
            break;
          }
        }
      }
    }

    return {
      success: true,
      data: {
        results,
        totalTimeMs: performance.now() - startTime,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Private Methods
  // -------------------------------------------------------------------------

  private async loadNativeBindings(): Promise<TronNativeBindings> {
    // In a real implementation, this would load the Lite³ C library
    // via node-ffi-napi or node-addon-api
    //
    // For now, we throw to trigger emulation mode
    throw new Error('Native bindings not available - install @hyperfixi/tron-native');
  }

  private createHeader(): TronHeader {
    return {
      magic: TRON_MAGIC,
      version: this.config.protocolVersion || 1,
      flags: this.computeFlags(),
    };
  }

  private computeFlags(): TronFlags {
    let flags = 0;
    if (this.config.compression) flags |= 1;
    if (this.config.checksums) flags |= 8;
    return flags;
  }

  // -------------------------------------------------------------------------
  // Emulation Mode (for development/testing)
  // -------------------------------------------------------------------------

  private encodeEmulated<T extends TronPayloadType>(message: TronMessage<T>): Uint8Array {
    // Simple JSON-based emulation of TRON encoding
    const json = JSON.stringify(message);
    const jsonBytes = new TextEncoder().encode(json);

    // Create buffer with header + JSON payload
    const buffer = new Uint8Array(TRON_HEADER_SIZE + jsonBytes.length);
    const view = new DataView(buffer.buffer);

    // Write header
    view.setUint32(0, message.header.magic, false); // Big-endian
    view.setUint16(4, message.header.version, false);
    view.setUint16(6, message.header.flags, false);

    // Write payload
    buffer.set(jsonBytes, TRON_HEADER_SIZE);

    return buffer;
  }

  private decodeEmulated<T extends TronPayloadType>(buffer: Uint8Array): TronMessage<T> {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    // Read header
    const magic = view.getUint32(0, false);
    if (magic !== TRON_MAGIC) {
      throw new Error(`Invalid TRON magic: 0x${magic.toString(16)}`);
    }

    const version = view.getUint16(4, false);
    const flags = view.getUint16(6, false);

    // Read payload (JSON in emulation mode)
    const jsonBytes = buffer.slice(TRON_HEADER_SIZE);
    const json = new TextDecoder().decode(jsonBytes);
    const parsed = JSON.parse(json);

    return {
      header: { magic, version, flags },
      payload: parsed.payload,
    };
  }

  private async encodeAST(ast: unknown): Promise<Uint8Array> {
    // Encode AST to TRON format
    const message: TronMessage<'compile'> = {
      header: this.createHeader(),
      payload: {
        type: 'compile',
        id: 'ast-' + Date.now(),
        data: { source: JSON.stringify(ast) },
      },
    };

    return this.encode(message);
  }

  private async decodeAST(buffer: Uint8Array): Promise<string> {
    const message = await this.decode<'compile'>(buffer);
    return message.payload.data.source;
  }
}

// =============================================================================
// Native Bindings Interface
// =============================================================================

interface TronNativeBindings {
  encode<T extends TronPayloadType>(message: TronMessage<T>): Uint8Array;
  decode<T extends TronPayloadType>(buffer: Uint8Array): TronMessage<T>;
  cleanup(): void;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a Node.js TRON adapter
 */
export function createNodeAdapter(config?: Partial<TronAdapterConfig>): NodeTronAdapter {
  return new NodeTronAdapter(config);
}

export default NodeTronAdapter;
