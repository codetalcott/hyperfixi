/**
 * TRON Backend Integration for HyperFixi
 *
 * @module @hyperfixi/tron-backend
 * @description High-performance TRON (Tree Root Object Notation) serialization
 * for hyperscript compilation, execution, and SSR hydration.
 */

// =============================================================================
// Protocol Types
// =============================================================================

export type {
  // Core types
  TronHeader,
  TronMessage,
  TronPayloadType,
  TronFlags,

  // Payloads
  CompilePayload,
  ExecutePayload,
  EventPayload,
  HydratePayload,
  ValidatePayload,
  TranslatePayload,
  BatchPayload,
  StreamPayload,
  ErrorPayload,

  // Requests
  CompileRequest,
  CompileOptions,
  ExecuteRequest,
  ExecutionContext,
  ValidateRequest,
  TranslateRequest,
  HydrateRequest,
  HydrateComponent,
  BatchRequest,

  // Results
  CompileResult,
  CompileMeta,
  ExecuteResult,
  ExecuteMeta,
  ValidateResult,
  TranslateResult,
  HydrateResult,
  BatchResult,

  // Errors
  ErrorData,
  TronErrorCode,

  // Negotiation
  ContentNegotiation,
} from './types/protocol';

export {
  TRON_CONTENT_TYPE,
  JSON_CONTENT_TYPE,
  parseAcceptHeader,
} from './types/protocol';

// =============================================================================
// Adapter Interface
// =============================================================================

export type {
  ITronAdapter,
  TronAdapterConfig,
  AdapterResult,
  AdapterError,
  TronMiddleware,
  MiddlewareRequest,
  MiddlewareResponse,
  ITronAdapterFactory,
  BackendType,
  BackendCapabilities,
} from './adapters/adapter-interface';

export {
  BaseTronAdapter,
  DEFAULT_CONFIG,
} from './adapters/adapter-interface';

// =============================================================================
// Node.js Adapter
// =============================================================================

export {
  NodeTronAdapter,
  createNodeAdapter,
} from './backends/nodejs/adapter';

// =============================================================================
// Factory
// =============================================================================

import type { ITronAdapter, ITronAdapterFactory, BackendType, TronAdapterConfig } from './adapters/adapter-interface';
import { NodeTronAdapter } from './backends/nodejs/adapter';

/**
 * TRON Adapter Factory
 *
 * Creates adapters for different backend languages.
 */
class TronAdapterFactory implements ITronAdapterFactory {
  private availableBackends = new Map<BackendType, boolean>([
    ['nodejs', true],
    ['go', false],     // Requires external Go binary
    ['rust', false],   // Requires external Rust binary
    ['mojo', false],   // Requires Mojo runtime
  ]);

  async create(backend: BackendType, config?: Partial<TronAdapterConfig>): Promise<ITronAdapter> {
    switch (backend) {
      case 'nodejs':
        const adapter = new NodeTronAdapter(config);
        await adapter.initialize();
        return adapter;

      case 'go':
        throw new Error(
          'Go backend requires external setup. ' +
          'See packages/tron-backend/src/backends/go/README.md'
        );

      case 'rust':
        throw new Error(
          'Rust backend requires external setup. ' +
          'See packages/tron-backend/src/backends/rust/README.md'
        );

      case 'mojo':
        throw new Error(
          'Mojo backend requires Modular runtime. ' +
          'See packages/tron-backend/src/backends/mojo/README.md'
        );

      default:
        throw new Error(`Unknown backend: ${backend}`);
    }
  }

  getAvailableBackends(): BackendType[] {
    return Array.from(this.availableBackends.entries())
      .filter(([_, available]) => available)
      .map(([backend]) => backend);
  }

  isBackendAvailable(backend: BackendType): boolean {
    return this.availableBackends.get(backend) || false;
  }
}

/**
 * Create a TRON adapter factory
 */
export function createAdapterFactory(): ITronAdapterFactory {
  return new TronAdapterFactory();
}

/**
 * Create a TRON adapter with automatic backend selection
 *
 * Tries backends in order of preference:
 * 1. Node.js (always available)
 * 2. Rust (if native bindings available)
 * 3. Go (if binary available)
 */
export async function createAdapter(
  config?: Partial<TronAdapterConfig>,
  preferredBackend?: BackendType
): Promise<ITronAdapter> {
  const factory = createAdapterFactory();

  if (preferredBackend) {
    return factory.create(preferredBackend, config);
  }

  // Default to Node.js
  return factory.create('nodejs', config);
}

// =============================================================================
// Convenience Exports
// =============================================================================

/**
 * Default TRON backend instance
 *
 * Usage:
 * ```typescript
 * import { TronBackend } from '@hyperfixi/tron-backend';
 *
 * await TronBackend.initialize();
 * const result = await TronBackend.compile({ source: 'toggle .active' });
 * ```
 */
export const TronBackend = {
  _adapter: null as ITronAdapter | null,

  async initialize(config?: Partial<TronAdapterConfig>): Promise<void> {
    this._adapter = await createAdapter(config);
  },

  async compile(request: import('./types/protocol').CompileRequest) {
    if (!this._adapter) throw new Error('TronBackend not initialized');
    return this._adapter.compile(request);
  },

  async execute(request: import('./types/protocol').ExecuteRequest) {
    if (!this._adapter) throw new Error('TronBackend not initialized');
    return this._adapter.execute(request);
  },

  async validate(request: import('./types/protocol').ValidateRequest) {
    if (!this._adapter) throw new Error('TronBackend not initialized');
    return this._adapter.validate(request);
  },

  async translate(request: import('./types/protocol').TranslateRequest) {
    if (!this._adapter) throw new Error('TronBackend not initialized');
    return this._adapter.translate(request);
  },

  async hydrate(request: import('./types/protocol').HydrateRequest) {
    if (!this._adapter) throw new Error('TronBackend not initialized');
    return this._adapter.hydrate(request);
  },

  async batch(request: import('./types/protocol').BatchRequest) {
    if (!this._adapter) throw new Error('TronBackend not initialized');
    return this._adapter.batch(request);
  },

  isReady(): boolean {
    return this._adapter?.isReady() ?? false;
  },
};

export default TronBackend;
