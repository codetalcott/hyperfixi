# Go Backend for HyperFixi TRON Integration

This directory contains the Go implementation of the TRON backend adapter.

## Prerequisites

- Go 1.21+
- GCC or Clang (for CGo)
- Lite³ C library

## Building

```bash
# Install Lite³
git clone https://github.com/fastserial/lite3.git
cd lite3 && make && sudo make install

# Build the Go adapter
cd packages/tron-backend/src/backends/go
go build -o hyperfixi-tron-go ./...

# Or build as a shared library for Node.js integration
go build -buildmode=c-shared -o hyperfixi-tron.so ./...
```

## Usage

### Standalone Server

```go
package main

import (
    "net/http"
    tron "github.com/hyperfixi/tron-backend-go"
)

func main() {
    backend := tron.NewBackend(tron.Config{
        Format:   tron.FormatTRON,
        Fallback: tron.FormatJSON,
        Debug:    true,
    })

    if err := backend.Initialize(); err != nil {
        panic(err)
    }
    defer backend.Close()

    mux := http.NewServeMux()
    mux.HandleFunc("/compile", backend.CompileHandler())

    http.ListenAndServe(":8080", backend.Middleware()(mux))
}
```

### With Existing HTTP Framework

```go
// Chi
r := chi.NewRouter()
r.Use(backend.Middleware())
r.Post("/compile", backend.CompileHandler())

// Gin
r := gin.Default()
r.Use(func(c *gin.Context) {
    // Wrap with TRON middleware
    backend.Handler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        c.Next()
    })).ServeHTTP(c.Writer, c.Request)
})

// Fiber
app := fiber.New()
app.Use(adaptor.HTTPMiddleware(backend.Middleware()))
```

## Integration with Node.js

The Go adapter can be used from Node.js via:

1. **Subprocess**: Spawn Go binary and communicate via stdin/stdout
2. **HTTP**: Run Go server and communicate via HTTP
3. **FFI**: Build as shared library and use with ffi-napi

### FFI Example

```typescript
import ffi from 'ffi-napi';

const lib = ffi.Library('./hyperfixi-tron.so', {
  'Compile': ['string', ['string']],
  'Execute': ['string', ['string', 'string']],
});

const result = lib.Compile(JSON.stringify({ source: 'toggle .active' }));
```

## Performance

The Go adapter provides:
- Native CGo bindings to Lite³ C library
- Zero-allocation encoding path
- Connection pooling for HTTP mode
- Concurrent request handling

Expected performance:
- Encode latency: ~50μs
- Decode latency: ~30μs
- Compile throughput: 10,000+ req/s
