//! TRON Backend Integration for HyperFixi in Rust
//!
//! This crate provides high-performance TRON (Tree Root Object Notation) integration
//! for hyperscript compilation and execution in Rust backends.
//!
//! # Example
//!
//! ```rust
//! use hyperfixi_tron::{TronBackend, Config, Format};
//!
//! let backend = TronBackend::new(Config {
//!     format: Format::Tron,
//!     fallback: Some(Format::Json),
//!     ..Default::default()
//! });
//!
//! // With Axum
//! let app = Router::new()
//!     .route("/compile", post(backend.compile_handler()));
//! ```

use std::sync::Arc;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use thiserror::Error;

// =============================================================================
// FFI Bindings to Lite³
// =============================================================================

#[cfg(feature = "native")]
mod ffi {
    use std::os::raw::{c_char, c_int, c_void};

    #[repr(C)]
    pub struct Lite3Ctx {
        _private: [u8; 0],
    }

    extern "C" {
        pub fn lite3_ctx_create() -> *mut Lite3Ctx;
        pub fn lite3_ctx_destroy(ctx: *mut Lite3Ctx);
        pub fn lite3_ctx_init_obj(ctx: *mut Lite3Ctx);
        pub fn lite3_ctx_set_str(
            ctx: *mut Lite3Ctx,
            parent: c_int,
            key: *const c_char,
            value: *const c_char,
        );
        pub fn lite3_ctx_set_i64(
            ctx: *mut Lite3Ctx,
            parent: c_int,
            key: *const c_char,
            value: i64,
        );
        pub fn lite3_ctx_get_buffer(ctx: *mut Lite3Ctx, len: *mut usize) -> *const c_char;
    }
}

// =============================================================================
// Types
// =============================================================================

/// Serialization format
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Format {
    #[default]
    Tron,
    Json,
}

/// Backend configuration
#[derive(Debug, Clone)]
pub struct Config {
    pub format: Format,
    pub fallback: Option<Format>,
    pub protocol_version: u16,
    pub compression: bool,
    pub checksums: bool,
    pub max_message_size: usize,
    pub timeout: Duration,
    pub debug: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            format: Format::Tron,
            fallback: Some(Format::Json),
            protocol_version: 1,
            compression: false,
            checksums: false,
            max_message_size: 10 * 1024 * 1024, // 10MB
            timeout: Duration::from_secs(30),
            debug: false,
        }
    }
}

// =============================================================================
// Protocol Types
// =============================================================================

/// TRON magic number: "TRON" in ASCII
pub const TRON_MAGIC: u32 = 0x54524F4E;

/// TRON header
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TronHeader {
    pub magic: u32,
    pub version: u16,
    pub flags: u16,
}

impl Default for TronHeader {
    fn default() -> Self {
        Self {
            magic: TRON_MAGIC,
            version: 1,
            flags: 0,
        }
    }
}

/// TRON message envelope
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TronMessage<T> {
    pub header: TronHeader,
    pub payload: T,
}

/// Compile request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompileRequest {
    pub source: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<CompileOptions>,
}

/// Compile options
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CompileOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub semantic: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confidence_threshold: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub traditional: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_map: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target: Option<String>,
}

/// Compile result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompileResult {
    pub ast: Vec<u8>,
    pub meta: CompileMeta,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_map: Option<String>,
}

/// Compile metadata
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CompileMeta {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parser_used: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub semantic_confidence: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detected_language: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub warnings: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compile_time_ms: Option<f64>,
}

/// Execute request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteRequest {
    pub code: CodeSource,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<ExecutionContext>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target: Option<String>,
}

/// Code source - either source string or pre-compiled AST
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum CodeSource {
    Source(String),
    Ast(Vec<u8>),
}

/// Execution context
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ExecutionContext {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locals: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub globals: Option<serde_json::Value>,
}

/// Execute result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<ExecutionContext>,
    pub meta: ExecuteMeta,
}

/// Execution metadata
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ExecuteMeta {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub execution_time_ms: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub commands_executed: Option<u32>,
}

// =============================================================================
// Errors
// =============================================================================

/// Error codes
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u16)]
pub enum ErrorCode {
    InvalidMessage = 1000,
    UnsupportedVersion = 1001,
    InvalidPayloadType = 1002,
    ChecksumMismatch = 1003,
    ParseError = 2000,
    SyntaxError = 2001,
    UnsupportedLanguage = 2002,
    RuntimeError = 3000,
    Timeout = 3001,
    InternalError = 5000,
    ServiceUnavailable = 5001,
}

/// TRON error
#[derive(Debug, Error, Serialize, Deserialize)]
#[error("[{code:?}] {message}")]
pub struct TronError {
    pub code: ErrorCode,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<serde_json::Value>,
}

/// Result type alias
pub type TronResult<T> = Result<T, TronError>;

// =============================================================================
// Backend Implementation
// =============================================================================

/// TRON backend adapter
pub struct TronBackend {
    config: Config,
    ready: std::sync::atomic::AtomicBool,
}

impl TronBackend {
    /// Create a new TRON backend
    pub fn new(config: Config) -> Self {
        Self {
            config,
            ready: std::sync::atomic::AtomicBool::new(false),
        }
    }

    /// Initialize the backend
    pub async fn initialize(&self) -> TronResult<()> {
        // Initialize native TRON library if available
        #[cfg(feature = "native")]
        {
            // Pre-warm the allocator
            unsafe {
                let ctx = ffi::lite3_ctx_create();
                ffi::lite3_ctx_destroy(ctx);
            }
        }

        self.ready
            .store(true, std::sync::atomic::Ordering::SeqCst);
        Ok(())
    }

    /// Check if backend is ready
    pub fn is_ready(&self) -> bool {
        self.ready.load(std::sync::atomic::Ordering::SeqCst)
    }

    /// Encode a message to TRON format
    pub fn encode<T: Serialize>(&self, message: &TronMessage<T>) -> TronResult<Vec<u8>> {
        #[cfg(feature = "native")]
        {
            self.encode_native(message)
        }

        #[cfg(not(feature = "native"))]
        {
            self.encode_emulated(message)
        }
    }

    /// Decode a TRON message
    pub fn decode<T: for<'de> Deserialize<'de>>(&self, data: &[u8]) -> TronResult<TronMessage<T>> {
        #[cfg(feature = "native")]
        {
            self.decode_native(data)
        }

        #[cfg(not(feature = "native"))]
        {
            self.decode_emulated(data)
        }
    }

    /// Compile hyperscript source
    pub async fn compile(&self, request: CompileRequest) -> TronResult<CompileResult> {
        let start = Instant::now();

        // TODO: Integrate with HyperFixi WASM module
        // For now, return a placeholder

        Ok(CompileResult {
            ast: Vec::new(),
            meta: CompileMeta {
                parser_used: Some("placeholder".to_string()),
                compile_time_ms: Some(start.elapsed().as_secs_f64() * 1000.0),
                ..Default::default()
            },
            source_map: None,
        })
    }

    /// Execute hyperscript
    pub async fn execute(&self, request: ExecuteRequest) -> TronResult<ExecuteResult> {
        let start = Instant::now();

        // TODO: Integrate with HyperFixi WASM module

        Ok(ExecuteResult {
            success: true,
            value: None,
            context: request.context,
            meta: ExecuteMeta {
                execution_time_ms: Some(start.elapsed().as_secs_f64() * 1000.0),
                commands_executed: Some(1),
            },
        })
    }

    // -------------------------------------------------------------------------
    // Private Methods
    // -------------------------------------------------------------------------

    #[cfg(feature = "native")]
    fn encode_native<T: Serialize>(&self, message: &TronMessage<T>) -> TronResult<Vec<u8>> {
        use std::ffi::CString;

        unsafe {
            let ctx = ffi::lite3_ctx_create();
            ffi::lite3_ctx_init_obj(ctx);

            // Set header
            let magic_key = CString::new("magic").unwrap();
            ffi::lite3_ctx_set_i64(ctx, 0, magic_key.as_ptr(), message.header.magic as i64);

            let version_key = CString::new("version").unwrap();
            ffi::lite3_ctx_set_i64(ctx, 0, version_key.as_ptr(), message.header.version as i64);

            let flags_key = CString::new("flags").unwrap();
            ffi::lite3_ctx_set_i64(ctx, 0, flags_key.as_ptr(), message.header.flags as i64);

            // Serialize payload
            let payload_json = serde_json::to_string(&message.payload).map_err(|e| TronError {
                code: ErrorCode::InternalError,
                message: format!("Failed to serialize payload: {}", e),
                context: None,
            })?;

            let payload_key = CString::new("payload").unwrap();
            let payload_value = CString::new(payload_json).unwrap();
            ffi::lite3_ctx_set_str(ctx, 0, payload_key.as_ptr(), payload_value.as_ptr());

            // Get buffer
            let mut len: usize = 0;
            let buf_ptr = ffi::lite3_ctx_get_buffer(ctx, &mut len);
            let result = std::slice::from_raw_parts(buf_ptr as *const u8, len).to_vec();

            ffi::lite3_ctx_destroy(ctx);

            Ok(result)
        }
    }

    #[cfg(not(feature = "native"))]
    fn encode_emulated<T: Serialize>(&self, message: &TronMessage<T>) -> TronResult<Vec<u8>> {
        // JSON-based emulation for development
        let json = serde_json::to_vec(message).map_err(|e| TronError {
            code: ErrorCode::InternalError,
            message: format!("Failed to encode: {}", e),
            context: None,
        })?;

        // Prepend header (8 bytes)
        let mut result = Vec::with_capacity(8 + json.len());

        // Magic (4 bytes, big-endian)
        result.extend_from_slice(&message.header.magic.to_be_bytes());
        // Version (2 bytes, big-endian)
        result.extend_from_slice(&message.header.version.to_be_bytes());
        // Flags (2 bytes, big-endian)
        result.extend_from_slice(&message.header.flags.to_be_bytes());
        // Payload
        result.extend_from_slice(&json);

        Ok(result)
    }

    #[cfg(feature = "native")]
    fn decode_native<T: for<'de> Deserialize<'de>>(
        &self,
        data: &[u8],
    ) -> TronResult<TronMessage<T>> {
        // For native, we'd use lite3_ctx_from_buffer
        // Fallback to JSON for now
        self.decode_emulated(data)
    }

    #[cfg(not(feature = "native"))]
    fn decode_emulated<T: for<'de> Deserialize<'de>>(
        &self,
        data: &[u8],
    ) -> TronResult<TronMessage<T>> {
        if data.len() < 8 {
            return Err(TronError {
                code: ErrorCode::InvalidMessage,
                message: "Message too short".to_string(),
                context: None,
            });
        }

        // Read header
        let magic = u32::from_be_bytes([data[0], data[1], data[2], data[3]]);
        if magic != TRON_MAGIC {
            return Err(TronError {
                code: ErrorCode::InvalidMessage,
                message: format!("Invalid magic: 0x{:08X}", magic),
                context: None,
            });
        }

        let version = u16::from_be_bytes([data[4], data[5]]);
        let flags = u16::from_be_bytes([data[6], data[7]]);

        // Parse JSON payload
        let payload: T = serde_json::from_slice(&data[8..]).map_err(|e| TronError {
            code: ErrorCode::InvalidMessage,
            message: format!("Failed to decode payload: {}", e),
            context: None,
        })?;

        Ok(TronMessage {
            header: TronHeader {
                magic,
                version,
                flags,
            },
            payload,
        })
    }
}

// =============================================================================
// Axum Integration
// =============================================================================

#[cfg(feature = "axum")]
pub mod axum_integration {
    use super::*;
    use axum::{
        extract::State,
        http::{header, HeaderMap, StatusCode},
        response::{IntoResponse, Response},
        Json,
    };

    /// Axum state wrapper
    pub type TronState = Arc<TronBackend>;

    /// Compile handler for Axum
    pub async fn compile_handler(
        State(backend): State<TronState>,
        Json(request): Json<CompileRequest>,
    ) -> Result<Json<CompileResult>, TronErrorResponse> {
        backend
            .compile(request)
            .await
            .map(Json)
            .map_err(TronErrorResponse)
    }

    /// Execute handler for Axum
    pub async fn execute_handler(
        State(backend): State<TronState>,
        Json(request): Json<ExecuteRequest>,
    ) -> Result<Json<ExecuteResult>, TronErrorResponse> {
        backend
            .execute(request)
            .await
            .map(Json)
            .map_err(TronErrorResponse)
    }

    /// Error response wrapper
    pub struct TronErrorResponse(pub TronError);

    impl IntoResponse for TronErrorResponse {
        fn into_response(self) -> Response {
            let status = match self.0.code {
                ErrorCode::InvalidMessage | ErrorCode::InvalidPayloadType => StatusCode::BAD_REQUEST,
                ErrorCode::UnsupportedVersion | ErrorCode::UnsupportedLanguage => {
                    StatusCode::NOT_IMPLEMENTED
                }
                ErrorCode::ParseError | ErrorCode::SyntaxError => StatusCode::UNPROCESSABLE_ENTITY,
                ErrorCode::RuntimeError => StatusCode::INTERNAL_SERVER_ERROR,
                ErrorCode::Timeout => StatusCode::REQUEST_TIMEOUT,
                ErrorCode::ServiceUnavailable => StatusCode::SERVICE_UNAVAILABLE,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            };

            (status, Json(self.0)).into_response()
        }
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tron_header_default() {
        let header = TronHeader::default();
        assert_eq!(header.magic, TRON_MAGIC);
        assert_eq!(header.version, 1);
        assert_eq!(header.flags, 0);
    }

    #[test]
    fn test_encode_decode_roundtrip() {
        let backend = TronBackend::new(Config::default());

        let message = TronMessage {
            header: TronHeader::default(),
            payload: CompileRequest {
                source: "toggle .active".to_string(),
                language: Some("en".to_string()),
                options: None,
            },
        };

        let encoded = backend.encode(&message).unwrap();
        let decoded: TronMessage<CompileRequest> = backend.decode(&encoded).unwrap();

        assert_eq!(decoded.header.magic, TRON_MAGIC);
        assert_eq!(decoded.payload.source, "toggle .active");
    }

    #[tokio::test]
    async fn test_compile() {
        let backend = TronBackend::new(Config::default());
        backend.initialize().await.unwrap();

        let result = backend
            .compile(CompileRequest {
                source: "toggle .active".to_string(),
                language: None,
                options: None,
            })
            .await
            .unwrap();

        assert!(result.meta.compile_time_ms.is_some());
    }
}
