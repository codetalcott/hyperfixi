// Package tron provides TRON backend integration for HyperFixi in Go.
//
// This package implements the TRON protocol for high-performance
// hyperscript compilation and execution in Go backends.
//
// Example usage:
//
//	backend := tron.NewBackend(tron.Config{
//	    Format:   tron.FormatTRON,
//	    Fallback: tron.FormatJSON,
//	})
//
//	http.Handle("/api/", backend.Handler(yourHandler))
package tron

/*
#cgo LDFLAGS: -llite3
#include <lite3_context_api.h>
#include <stdlib.h>

// Helper to create TRON context
lite3_ctx* tron_create() {
    return lite3_ctx_create();
}

// Helper to destroy TRON context
void tron_destroy(lite3_ctx* ctx) {
    lite3_ctx_destroy(ctx);
}

// Helper to initialize as object
void tron_init_obj(lite3_ctx* ctx) {
    lite3_ctx_init_obj(ctx);
}

// Helper to set string
void tron_set_str(lite3_ctx* ctx, int parent, const char* key, const char* value) {
    lite3_ctx_set_str(ctx, parent, key, value);
}

// Helper to set int64
void tron_set_i64(lite3_ctx* ctx, int parent, const char* key, int64_t value) {
    lite3_ctx_set_i64(ctx, parent, key, value);
}

// Helper to get buffer
const char* tron_get_buffer(lite3_ctx* ctx, size_t* len) {
    return lite3_ctx_get_buffer(ctx, len);
}
*/
import "C"

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
	"unsafe"
)

// =============================================================================
// Types
// =============================================================================

// Format represents the serialization format
type Format int

const (
	FormatTRON Format = iota
	FormatJSON
)

// Config holds adapter configuration
type Config struct {
	Format          Format
	Fallback        Format
	ProtocolVersion int
	Compression     bool
	Checksums       bool
	MaxMessageSize  int64
	Timeout         time.Duration
	Debug           bool
}

// DefaultConfig returns default configuration
func DefaultConfig() Config {
	return Config{
		Format:          FormatTRON,
		Fallback:        FormatJSON,
		ProtocolVersion: 1,
		Compression:     false,
		Checksums:       false,
		MaxMessageSize:  10 * 1024 * 1024, // 10MB
		Timeout:         30 * time.Second,
		Debug:           false,
	}
}

// =============================================================================
// Protocol Types
// =============================================================================

// TronHeader is the TRON message header
type TronHeader struct {
	Magic   uint32 `json:"magic"`
	Version uint16 `json:"version"`
	Flags   uint16 `json:"flags"`
}

// TronMessage is a TRON protocol message
type TronMessage struct {
	Header  TronHeader  `json:"header"`
	Payload interface{} `json:"payload"`
}

// CompileRequest is a compilation request
type CompileRequest struct {
	Source   string         `json:"source"`
	Language string         `json:"language,omitempty"`
	Options  CompileOptions `json:"options,omitempty"`
}

// CompileOptions are compilation options
type CompileOptions struct {
	Semantic            bool    `json:"semantic,omitempty"`
	ConfidenceThreshold float64 `json:"confidenceThreshold,omitempty"`
	Traditional         bool    `json:"traditional,omitempty"`
	SourceMap           bool    `json:"sourceMap,omitempty"`
	Target              string  `json:"target,omitempty"`
}

// CompileResult is a compilation result
type CompileResult struct {
	AST       []byte      `json:"ast"`
	Meta      CompileMeta `json:"meta"`
	SourceMap string      `json:"sourceMap,omitempty"`
}

// CompileMeta contains compilation metadata
type CompileMeta struct {
	ParserUsed         string   `json:"parserUsed,omitempty"`
	SemanticConfidence float64  `json:"semanticConfidence,omitempty"`
	DetectedLanguage   string   `json:"detectedLanguage,omitempty"`
	Warnings           []string `json:"warnings,omitempty"`
	CompileTimeMs      float64  `json:"compileTimeMs,omitempty"`
}

// ErrorCode represents a TRON error code
type ErrorCode int

const (
	ErrInvalidMessage     ErrorCode = 1000
	ErrUnsupportedVersion ErrorCode = 1001
	ErrParseError         ErrorCode = 2000
	ErrRuntimeError       ErrorCode = 3000
	ErrInternalError      ErrorCode = 5000
)

// TronError is a TRON protocol error
type TronError struct {
	Code    ErrorCode `json:"code"`
	Message string    `json:"message"`
}

func (e TronError) Error() string {
	return fmt.Sprintf("[%d] %s", e.Code, e.Message)
}

// =============================================================================
// Backend Implementation
// =============================================================================

// Backend is the TRON backend adapter
type Backend struct {
	config Config
	pool   sync.Pool // Pool of TRON contexts for performance
	mu     sync.RWMutex
	ready  bool
}

// NewBackend creates a new TRON backend
func NewBackend(config Config) *Backend {
	b := &Backend{
		config: config,
		pool: sync.Pool{
			New: func() interface{} {
				return C.tron_create()
			},
		},
	}
	return b
}

// Initialize initializes the backend
func (b *Backend) Initialize() error {
	b.mu.Lock()
	defer b.mu.Unlock()

	// Pre-warm the pool
	for i := 0; i < 10; i++ {
		ctx := C.tron_create()
		b.pool.Put(ctx)
	}

	b.ready = true
	return nil
}

// Close cleans up resources
func (b *Backend) Close() error {
	b.mu.Lock()
	defer b.mu.Unlock()

	b.ready = false
	return nil
}

// IsReady returns whether the backend is ready
func (b *Backend) IsReady() bool {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return b.ready
}

// =============================================================================
// Encoding/Decoding
// =============================================================================

// Encode encodes a message to TRON format
func (b *Backend) Encode(msg *TronMessage) ([]byte, error) {
	ctx := b.pool.Get().(*C.lite3_ctx)
	defer func() {
		C.tron_destroy(ctx)
		b.pool.Put(C.tron_create())
	}()

	C.tron_init_obj(ctx)

	// Set header fields
	C.tron_set_i64(ctx, 0, C.CString("magic"), C.int64_t(msg.Header.Magic))
	C.tron_set_i64(ctx, 0, C.CString("version"), C.int64_t(msg.Header.Version))
	C.tron_set_i64(ctx, 0, C.CString("flags"), C.int64_t(msg.Header.Flags))

	// Serialize payload as JSON for now (could be optimized)
	payloadJSON, err := json.Marshal(msg.Payload)
	if err != nil {
		return nil, err
	}
	C.tron_set_str(ctx, 0, C.CString("payload"), C.CString(string(payloadJSON)))

	// Get the buffer
	var bufLen C.size_t
	bufPtr := C.tron_get_buffer(ctx, &bufLen)

	return C.GoBytes(unsafe.Pointer(bufPtr), C.int(bufLen)), nil
}

// Decode decodes a TRON message
func (b *Backend) Decode(data []byte) (*TronMessage, error) {
	// For now, use JSON fallback for decoding
	// Real implementation would use Lite³ API
	var msg TronMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		return nil, err
	}
	return &msg, nil
}

// =============================================================================
// HyperFixi Operations
// =============================================================================

// Compile compiles hyperscript source
func (b *Backend) Compile(ctx context.Context, req *CompileRequest) (*CompileResult, error) {
	start := time.Now()

	// TODO: Integrate with HyperFixi WASM or native module
	// For now, return a placeholder result

	return &CompileResult{
		AST: []byte{},
		Meta: CompileMeta{
			ParserUsed:    "placeholder",
			CompileTimeMs: float64(time.Since(start).Microseconds()) / 1000,
		},
	}, nil
}

// =============================================================================
// HTTP Handler
// =============================================================================

// Handler returns an HTTP handler for the TRON backend
func (b *Backend) Handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Content negotiation
		accept := r.Header.Get("Accept")
		format := b.negotiateFormat(accept)

		// Set response content type
		if format == FormatTRON {
			w.Header().Set("Content-Type", "application/tron")
		} else {
			w.Header().Set("Content-Type", "application/json")
		}

		// Store format in context for downstream handlers
		ctx := context.WithValue(r.Context(), formatKey, format)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

type contextKey string

const formatKey contextKey = "tron-format"

func (b *Backend) negotiateFormat(accept string) Format {
	// Simple negotiation - prefer TRON if supported
	if accept == "application/tron" {
		return FormatTRON
	}
	return b.config.Fallback
}

// =============================================================================
// Middleware
// =============================================================================

// Middleware returns middleware that adds TRON support
func (b *Backend) Middleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return b.Handler(next)
	}
}

// CompileHandler returns an HTTP handler for compilation requests
func (b *Backend) CompileHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req CompileRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			b.writeError(w, TronError{Code: ErrInvalidMessage, Message: err.Error()})
			return
		}

		result, err := b.Compile(r.Context(), &req)
		if err != nil {
			b.writeError(w, TronError{Code: ErrParseError, Message: err.Error()})
			return
		}

		b.writeJSON(w, result)
	}
}

func (b *Backend) writeJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func (b *Backend) writeError(w http.ResponseWriter, err TronError) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(w).Encode(err)
}
