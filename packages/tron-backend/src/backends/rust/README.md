# Rust Backend for HyperFixi TRON Integration

This directory contains the Rust implementation of the TRON backend adapter.

## Prerequisites

- Rust 1.75+ (for async traits)
- LLVM/Clang (for Lite³ FFI)
- Lite³ C library

## Building

```bash
# Install Lite³
git clone https://github.com/fastserial/lite3.git
cd lite3 && make && sudo make install

# Build the Rust crate
cd packages/tron-backend/src/backends/rust
cargo build --release

# Build with native TRON support
cargo build --release --features native

# Build with Axum integration
cargo build --release --features axum
```

## Cargo.toml

```toml
[package]
name = "hyperfixi-tron"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["lib", "cdylib"]

[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
thiserror = "1.0"
tokio = { version = "1.0", features = ["full"] }

# Optional: HTTP framework integration
axum = { version = "0.7", optional = true }

[features]
default = []
native = []  # Enable native Lite³ FFI
axum = ["dep:axum"]
```

## Usage

### Library

```rust
use hyperfixi_tron::{TronBackend, Config, CompileRequest};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let backend = TronBackend::new(Config::default());
    backend.initialize().await?;

    let result = backend.compile(CompileRequest {
        source: "toggle .active on me".to_string(),
        language: Some("en".to_string()),
        options: None,
    }).await?;

    println!("Compiled in {}ms", result.meta.compile_time_ms.unwrap_or(0.0));
    Ok(())
}
```

### With Axum

```rust
use axum::{routing::post, Router};
use hyperfixi_tron::{TronBackend, Config};
use hyperfixi_tron::axum_integration::{compile_handler, execute_handler, TronState};
use std::sync::Arc;

#[tokio::main]
async fn main() {
    let backend = Arc::new(TronBackend::new(Config::default()));
    backend.initialize().await.unwrap();

    let app = Router::new()
        .route("/compile", post(compile_handler))
        .route("/execute", post(execute_handler))
        .with_state(backend);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

### With Actix-web

```rust
use actix_web::{web, App, HttpServer};
use hyperfixi_tron::{TronBackend, Config, CompileRequest};

async fn compile(
    backend: web::Data<TronBackend>,
    request: web::Json<CompileRequest>,
) -> impl actix_web::Responder {
    match backend.compile(request.into_inner()).await {
        Ok(result) => web::Json(result),
        Err(e) => // handle error
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let backend = TronBackend::new(Config::default());
    backend.initialize().await.unwrap();

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(backend.clone()))
            .route("/compile", web::post().to(compile))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

## Integration with Node.js

### NAPI Bindings

For high-performance Node.js integration, build with napi-rs:

```bash
# Install napi-cli
npm install -g @napi-rs/cli

# Build native module
napi build --release

# The generated .node file can be loaded directly
```

```typescript
import { TronBackend } from './hyperfixi-tron.node';

const backend = new TronBackend();
const result = backend.compile({ source: 'toggle .active' });
```

## Performance

Native Rust with Lite³ FFI provides:
- Zero-copy TRON encoding/decoding
- SIMD acceleration (when available)
- Memory-safe bindings
- Async runtime integration

Expected performance:
- Encode latency: ~20μs (SIMD), ~50μs (scalar)
- Decode latency: ~10μs (zero-copy)
- Throughput: 50,000+ encodes/s

## Safety

The native FFI implementation uses:
- Safe Rust wrappers around C FFI
- Bounds checking on all buffer operations
- Proper cleanup via Drop trait
- Thread-safe synchronization primitives
