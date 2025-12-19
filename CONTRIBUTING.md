# Contributing to HyperFixi

Thank you for your interest in contributing to HyperFixi! This document provides guidelines and technical information for contributors.

## Build System Rationale

HyperFixi uses **different build tools for different packages** based on their specific needs.

| Package | Build Tool(s) | Rationale |
|---------|--------------|-----------|
| **@hyperfixi/core** | Rollup | Complex multi-bundle builds (9 browser bundles). Rollup provides fine-grained control over IIFE, UMD, ESM formats with excellent tree-shaking. |
| **@hyperfixi/semantic** | tsup (Node) + tsup IIFE (browser) | Simple, fast builds. tsup's zero-config approach works well for straightforward needs. |
| **@hyperfixi/i18n** | tsup (Node) + Rollup UMD (browser) | Hybrid: tsup for fast Node.js builds, Rollup UMD for browser compatibility. |

**Why Not Standardize?** Each tool is optimized for its package's specific requirements. The inconsistency is deliberate and beneficial.

## Getting Started

```bash
# Install dependencies
npm install

# Build all packages
npm run build --workspaces

# Run tests
npm test --workspaces
```

For detailed guidelines, see the full documentation in this file.
