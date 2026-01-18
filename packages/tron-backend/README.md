# TRON Backend Integration for HyperFixi

> **TRON** (Tree Root Object Notation) - Zero-copy binary serialization for hyperscript execution

## Overview

This package provides backend integration between HyperFixi's hyperscript runtime and TRON (formerly Lite³), a high-performance zero-copy serialization format. TRON enables O(log n) field access directly on the wire format without traditional parsing overhead.

## Why TRON for HyperFixi?

| Feature | JSON | TRON | Benefit |
|---------|------|------|---------|
| Parse time | O(n) | O(1) | No parsing needed |
| Field access | O(n) | O(log n) | B-tree structure |
| Memory copies | Multiple | Zero | Direct wire access |
| Type safety | Runtime | Embedded | Self-describing |
| Speed vs JSON | 1x | 120x | SIMD optimized |

### Integration Points

1. **SSR Hydration** - Transfer component state to client without JSON parse overhead
2. **Event Payloads** - High-throughput event streaming with zero-copy access
3. **Compilation Cache** - Fast serialization of compiled hyperscript ASTs
4. **API Responses** - Efficient request/response for hyperscript services
5. **Real-time Sync** - WebSocket state synchronization

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    HyperFixi Runtime                             │
├─────────────────────────────────────────────────────────────────┤
│  packages/core    │  packages/ssr-support  │  packages/server   │
│  - Compilation    │  - Hydration           │  - HTTP Service    │
│  - Execution      │  - State Transfer      │  - Event Sources   │
└────────┬──────────┴──────────┬─────────────┴────────┬───────────┘
         │                     │                      │
         ▼                     ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              TRON Protocol Layer (This Package)                  │
├─────────────────────────────────────────────────────────────────┤
│  Protocol Definition  │  Type Mappings  │  Streaming Support    │
└────────┬──────────────┴────────┬────────┴───────────┬───────────┘
         │                       │                    │
         ▼                       ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend Adapters                              │
├────────────────┬────────────────┬───────────────┬───────────────┤
│   Node.js      │      Go        │     Rust      │     Mojo      │
│   (Reference)  │   (Native)     │   (FFI)       │   (Python++)  │
└────────────────┴────────────────┴───────────────┴───────────────┘
```

## Backend Language Selection

This integration is **backend-agnostic**. Choose based on your requirements:

| Backend | Strengths | Use Case |
|---------|-----------|----------|
| **Node.js** | TypeScript ecosystem, existing hyperfixi integration | Default choice, rapid development |
| **Go** | Simple deployment, excellent concurrency | Microservices, containers |
| **Rust** | Maximum performance, native TRON FFI | High-throughput, latency-critical |
| **Mojo** | Python syntax + C performance | ML/AI integration, scientific |

## Quick Start

### Node.js (Reference Implementation)

```bash
npm install @hyperfixi/tron-backend
```

```typescript
import { TronBackend } from '@hyperfixi/tron-backend';
import { createExpressAdapter } from '@hyperfixi/server-integration';

const backend = new TronBackend({
  format: 'tron',  // Use TRON instead of JSON
  fallback: 'json' // Fallback for unsupported clients
});

// Integrate with existing hyperfixi service
const app = express();
app.use(backend.middleware());
app.use(createExpressAdapter());
```

### Go

```go
import "github.com/hyperfixi/tron-backend-go"

backend := tron.NewBackend(tron.Config{
    Format:   tron.FormatTRON,
    Fallback: tron.FormatJSON,
})

http.Handle("/api/", backend.Handler(hyperscriptHandler))
```

### Rust

```rust
use hyperfixi_tron::TronBackend;

let backend = TronBackend::new(Config {
    format: Format::Tron,
    fallback: Some(Format::Json),
});

// Axum integration
Router::new()
    .route("/api/*", backend.handler())
```

## Protocol Specification

### Content-Type Negotiation

```
Accept: application/tron          # Request TRON format
Accept: application/json          # Request JSON fallback
Accept: application/tron, application/json;q=0.9  # Prefer TRON
```

### TRON Message Structure

```
┌──────────────────────────────────────────┐
│ TRON Header (8 bytes)                    │
├──────────────────────────────────────────┤
│ Magic: 0x54524F4E ("TRON")               │
│ Version: uint16                          │
│ Flags: uint16                            │
├──────────────────────────────────────────┤
│ HyperFixi Payload                        │
├──────────────────────────────────────────┤
│ type: "compile" | "execute" | "event"    │
│ id: string (request correlation)         │
│ data: {...}                              │
│ meta: {...}                              │
└──────────────────────────────────────────┘
```

### Payload Types

#### Compilation Request
```typescript
{
  type: "compile",
  id: "req_123",
  data: {
    source: "toggle .active on me",
    language: "en",
    options: { semantic: true }
  }
}
```

#### Execution Event
```typescript
{
  type: "event",
  id: "evt_456",
  data: {
    eventType: "click",
    target: "#button",
    context: { /* serialized context */ }
  }
}
```

#### SSR Hydration
```typescript
{
  type: "hydrate",
  id: "hyd_789",
  data: {
    components: [
      { selector: "#counter", state: { count: 42 } }
    ],
    scripts: ["on click increment :count"]
  }
}
```

## Implementation Status

- [x] Protocol specification
- [x] TypeScript types
- [x] Node.js adapter (reference)
- [ ] Go adapter
- [ ] Rust adapter
- [ ] Mojo adapter
- [ ] SSR hydration integration
- [ ] Event streaming
- [ ] Compilation cache

## Performance Targets

| Operation | JSON | TRON Target |
|-----------|------|-------------|
| Compile response serialize | 2ms | 0.02ms |
| Hydration state transfer | 5ms | 0.05ms |
| Event payload roundtrip | 1ms | 0.01ms |
| Cache hit deserialize | 0.5ms | 0ms (zero-copy) |

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build all adapters
npm run build

# Generate backend templates
npm run generate:backends
```

## Related Documentation

- [TRON/Lite³ Official Documentation](https://lite3.io/)
- [TRON GitHub Repository](https://github.com/fastserial/lite3)
- [HyperFixi Server Integration](../server-integration/README.md)
- [HyperFixi SSR Support](../ssr-support/README.md)
