/**
 * Backend Adapter Interface
 *
 * All backend implementations (Node.js, Go, Rust, Mojo) must implement this interface.
 * This ensures consistent behavior across different language runtimes.
 */

import type {
  TronMessage,
  TronPayloadType,
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
  ContentNegotiation,
  TronErrorCode,
} from '../types/protocol';

// =============================================================================
// Core Adapter Interface
// =============================================================================

/**
 * Configuration for TRON backend adapters
 */
export interface TronAdapterConfig {
  /** Primary serialization format */
  format: 'tron' | 'json';

  /** Fallback format when TRON not supported */
  fallback?: 'json';

  /** Protocol version */
  protocolVersion?: number;

  /** Enable compression */
  compression?: boolean;

  /** Enable checksums */
  checksums?: boolean;

  /** Maximum message size (bytes) */
  maxMessageSize?: number;

  /** Request timeout (ms) */
  timeout?: number;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: TronAdapterConfig = {
  format: 'tron',
  fallback: 'json',
  protocolVersion: 1,
  compression: false,
  checksums: false,
  maxMessageSize: 10 * 1024 * 1024, // 10MB
  timeout: 30000, // 30s
  debug: false,
};

/**
 * Result wrapper for adapter operations
 */
export type AdapterResult<T> =
  | { success: true; data: T; meta?: Record<string, unknown> }
  | { success: false; error: AdapterError };

/**
 * Adapter error structure
 */
export interface AdapterError {
  code: TronErrorCode;
  message: string;
  cause?: Error;
  context?: Record<string, unknown>;
}

/**
 * Main adapter interface - implement this for each backend language
 */
export interface ITronAdapter {
  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Initialize the adapter (load TRON library, set up connections, etc.)
   */
  initialize(): Promise<void>;

  /**
   * Cleanup resources
   */
  dispose(): Promise<void>;

  /**
   * Check if adapter is ready
   */
  isReady(): boolean;

  // -------------------------------------------------------------------------
  // Serialization
  // -------------------------------------------------------------------------

  /**
   * Encode a message to TRON format
   */
  encode<T extends TronPayloadType>(message: TronMessage<T>): Promise<Uint8Array>;

  /**
   * Decode a TRON message
   */
  decode<T extends TronPayloadType>(buffer: Uint8Array): Promise<TronMessage<T>>;

  /**
   * Convert between TRON and JSON
   */
  toJSON(buffer: Uint8Array): Promise<string>;
  fromJSON(json: string): Promise<Uint8Array>;

  // -------------------------------------------------------------------------
  // HyperFixi Operations
  // -------------------------------------------------------------------------

  /**
   * Compile hyperscript source code
   */
  compile(request: CompileRequest): Promise<AdapterResult<CompileResult>>;

  /**
   * Execute compiled hyperscript
   */
  execute(request: ExecuteRequest): Promise<AdapterResult<ExecuteResult>>;

  /**
   * Validate hyperscript syntax
   */
  validate(request: ValidateRequest): Promise<AdapterResult<ValidateResult>>;

  /**
   * Translate between languages
   */
  translate(request: TranslateRequest): Promise<AdapterResult<TranslateResult>>;

  /**
   * Generate SSR hydration payload
   */
  hydrate(request: HydrateRequest): Promise<AdapterResult<HydrateResult>>;

  /**
   * Execute batch operations
   */
  batch(request: BatchRequest): Promise<AdapterResult<BatchResult>>;

  // -------------------------------------------------------------------------
  // Content Negotiation
  // -------------------------------------------------------------------------

  /**
   * Get supported content types
   */
  getSupportedFormats(): string[];

  /**
   * Negotiate content type from Accept header
   */
  negotiateContent(accept: string): ContentNegotiation;

  // -------------------------------------------------------------------------
  // Configuration
  // -------------------------------------------------------------------------

  /**
   * Get current configuration
   */
  getConfig(): TronAdapterConfig;

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TronAdapterConfig>): void;
}

// =============================================================================
// Abstract Base Class
// =============================================================================

/**
 * Abstract base class with shared functionality
 *
 * Backend implementations can extend this to get common behavior
 */
export abstract class BaseTronAdapter implements ITronAdapter {
  protected config: TronAdapterConfig;
  protected ready: boolean = false;

  constructor(config: Partial<TronAdapterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // -------------------------------------------------------------------------
  // Abstract methods - must be implemented by each backend
  // -------------------------------------------------------------------------

  abstract initialize(): Promise<void>;
  abstract dispose(): Promise<void>;
  abstract encode<T extends TronPayloadType>(message: TronMessage<T>): Promise<Uint8Array>;
  abstract decode<T extends TronPayloadType>(buffer: Uint8Array): Promise<TronMessage<T>>;

  // -------------------------------------------------------------------------
  // Common implementations
  // -------------------------------------------------------------------------

  isReady(): boolean {
    return this.ready;
  }

  async toJSON(buffer: Uint8Array): Promise<string> {
    const message = await this.decode(buffer);
    return JSON.stringify(message, null, 2);
  }

  async fromJSON(json: string): Promise<Uint8Array> {
    const message = JSON.parse(json);
    return this.encode(message);
  }

  getSupportedFormats(): string[] {
    const formats = ['application/tron'];
    if (this.config.fallback === 'json') {
      formats.push('application/json');
    }
    return formats;
  }

  negotiateContent(accept: string): ContentNegotiation {
    // Import dynamically to avoid circular dependency
    const { parseAcceptHeader } = require('../types/protocol');
    return parseAcceptHeader(accept);
  }

  getConfig(): TronAdapterConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<TronAdapterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // -------------------------------------------------------------------------
  // Default implementations (override in subclasses)
  // -------------------------------------------------------------------------

  async compile(_request: CompileRequest): Promise<AdapterResult<CompileResult>> {
    return this.notImplemented('compile');
  }

  async execute(_request: ExecuteRequest): Promise<AdapterResult<ExecuteResult>> {
    return this.notImplemented('execute');
  }

  async validate(_request: ValidateRequest): Promise<AdapterResult<ValidateResult>> {
    return this.notImplemented('validate');
  }

  async translate(_request: TranslateRequest): Promise<AdapterResult<TranslateResult>> {
    return this.notImplemented('translate');
  }

  async hydrate(_request: HydrateRequest): Promise<AdapterResult<HydrateResult>> {
    return this.notImplemented('hydrate');
  }

  async batch(_request: BatchRequest): Promise<AdapterResult<BatchResult>> {
    return this.notImplemented('batch');
  }

  protected notImplemented(operation: string): AdapterResult<never> {
    return {
      success: false,
      error: {
        code: 5000, // INTERNAL_ERROR
        message: `Operation '${operation}' not implemented in this adapter`,
      },
    };
  }

  protected log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[TronAdapter] ${message}`, ...args);
    }
  }
}

// =============================================================================
// Middleware Interface
// =============================================================================

/**
 * HTTP middleware interface for framework integration
 */
export interface TronMiddleware {
  /**
   * Handle incoming request
   */
  handle(
    request: MiddlewareRequest,
    response: MiddlewareResponse,
    next: () => void
  ): Promise<void>;
}

export interface MiddlewareRequest {
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  rawBody?: Uint8Array;
}

export interface MiddlewareResponse {
  status(code: number): this;
  header(name: string, value: string): this;
  json(data: unknown): void;
  send(data: Uint8Array | string): void;
  end(): void;
}

// =============================================================================
// Factory Interface
// =============================================================================

/**
 * Factory for creating adapters
 */
export interface ITronAdapterFactory {
  /**
   * Create an adapter for the specified backend
   */
  create(backend: BackendType, config?: Partial<TronAdapterConfig>): Promise<ITronAdapter>;

  /**
   * Get available backends
   */
  getAvailableBackends(): BackendType[];

  /**
   * Check if a backend is available
   */
  isBackendAvailable(backend: BackendType): boolean;
}

export type BackendType = 'nodejs' | 'go' | 'rust' | 'mojo';

/**
 * Backend capability detection
 */
export interface BackendCapabilities {
  /** Backend identifier */
  backend: BackendType;
  /** TRON library version */
  tronVersion: string;
  /** Supported features */
  features: {
    compression: boolean;
    streaming: boolean;
    encryption: boolean;
    simd: boolean;
  };
  /** Performance characteristics */
  performance: {
    /** Typical encode latency (μs) */
    encodeLatencyUs: number;
    /** Typical decode latency (μs) */
    decodeLatencyUs: number;
    /** Max throughput (MB/s) */
    throughputMBps: number;
  };
}
