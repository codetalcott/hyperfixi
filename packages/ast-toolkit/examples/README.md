# AST Toolkit Examples

This directory contains comprehensive examples demonstrating various usage patterns of the HyperFixi AST Toolkit.

## Example Categories

### 1. Basic Analysis (`basic-analysis/`)
- Simple AST traversal and node finding
- Code complexity calculation
- Basic pattern detection

### 2. Advanced Query (`advanced-query/`)
- CSS-like selector queries
- XPath-style AST querying
- Complex pattern matching

### 3. LSP Integration (`lsp-integration/`)
- Language server protocol integration
- Real-time diagnostics
- Completions and hover information

### 4. AI-Powered Analysis (`ai-analysis/`)
- Natural language code explanation
- Intent recognition
- Code generation templates

### 5. Semantic Understanding (`semantic-analysis/`)
- Intent extraction from code
- Code similarity detection
- Semantic pattern recognition

### 6. Code Transformation (`code-transformation/`)
- AST modification and optimization
- Code refactoring patterns
- Automated code improvements

### 7. Real-World Applications (`real-world/`)
- Code quality analyzer
- Interactive documentation generator
- Automated refactoring tool

## Running Examples

Each example directory contains:
- `README.md` - Detailed explanation and usage
- `example.ts` - Main example code
- `sample-data.ts` - Sample AST structures for testing
- `package.json` - Dependencies (if needed)

To run an example:

```bash
cd examples/[example-name]
npm install  # if package.json exists
npx tsx example.ts
```

## Prerequisites

Make sure you have the AST Toolkit installed:

```bash
npm install @hyperfixi/ast-toolkit
```

## Contributing Examples

When adding new examples:

1. Create a new directory with a descriptive name
2. Include a comprehensive README.md
3. Provide both simple and complex use cases
4. Include sample AST data
5. Add proper error handling
6. Include performance considerations
7. Document the expected output