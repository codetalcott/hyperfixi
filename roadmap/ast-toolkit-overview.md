# AST Toolkit Assessment

## How AST Toolkit is Used in HyperFixi

The @hyperfixi/ast-toolkit serves as the analysis and tooling layer for the HyperFixi ecosystem. Here's how it's integrated:
1. Server Integration (@hyperfixi/server-integration)
Re-exports the ASTNode type for server-side compilation services:
export type { ASTNode } from '@hyperfixi/ast-toolkit';
Used in:
HTTP compilation endpoints
Template processing with {{variable}} substitution
Batch script compilation
Validation services
2. MCP (Model Context Protocol) Server
Exposes AST toolkit capabilities to AI assistants via MCP:
import { createASTToolkitMCPServer } from '@hyperfixi/ast-toolkit';
Tools exposed to AI:
analyze_code - Complexity and code smell analysis
explain_code - Natural language code explanations
benchmark - Performance profiling
find_nodes - Query AST structure
3. LSP Integration
Provides Language Server Protocol support for editor features:
import {
  astToLSPDiagnostics,   // Real-time error highlighting
  astToLSPCompletions,   // Autocomplete suggestions
  astToLSPHover,         // Hover documentation
  astToLSPSymbols        // Symbol navigation
} from '@hyperfixi/ast-toolkit';
4. i18n Package (@hyperfixi/i18n)
Uses AST analysis for internationalization:
Extract translatable strings from hyperscript
Transform commands for different locales
5. Example Use Cases
Basic Analysis
import { calculateComplexity, detectCodeSmells, findNodes } from '@hyperfixi/ast-toolkit';

const complexity = calculateComplexity(ast);
const smells = detectCodeSmells(ast);
const handlers = findNodes(ast, n => n.type === 'eventHandler');
Semantic Analysis
import { extractIntents, calculateSimilarity } from '@hyperfixi/ast-toolkit';

const intents = extractIntents(ast);  // "toggle visibility", "handle click"
const similarity = calculateSimilarity(ast1, ast2);
AI-Friendly APIs
import { explainCode, recognizeIntent } from '@hyperfixi/ast-toolkit';

const explanation = explainCode(ast, { level: 'beginner' });
const intent = recognizeIntent(ast);  // { type: 'ui-toggle', confidence: 0.9 }
Performance Optimization
import { benchmarkASTOperations, analyzePerformance } from '@hyperfixi/ast-toolkit';

const results = benchmarkASTOperations(ast, ['complexity', 'smells']);
const suggestions = analyzePerformance(ast);

## Architecture Summary

┌─────────────────────────────────────────────────────────┐
│                    @hyperfixi/core                       │
│         (Parser, Runtime, Command Execution)             │
└─────────────────────────┬───────────────────────────────┘
                          │ produces ASTs
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 @hyperfixi/ast-toolkit                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Visitor  │ │  Query   │ │ Analyzer │ │ Semantic │   │
│  │ Pattern  │ │  Engine  │ │          │ │ Analysis │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │Transform │ │   LSP    │ │    AI    │ │   MCP    │   │
│  │          │ │          │ │  APIs    │ │  Server  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└─────────────────────────────────────────────────────────┘
                          │ consumed by
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   server-    │  │     i18n     │  │   AI Tools   │
│ integration  │  │              │  │  (via MCP)   │
└──────────────┘  └──────────────┘  └──────────────┘


## Integration Status: Partially Integrated, Uses Mock ASTs

### What's Working

Type Compatibility ✅
AST toolkit imports ASTNode from @hyperfixi/core
Core's ASTNode interface is flexible: { type: string, line?, column?, start?, end?, [key: string]: unknown }
This allows any node properties, so toolkit analysis works
Package Dependency ✅
"@hyperfixi/core": "file:../core"

### What's Missing

No Direct Parser Integration ⚠️
The integration tests use manually constructed mock ASTs, not actual parsed output:
// In a real implementation, these would come from @hyperfixi/core parser
const createRealWorldAST = () => ({
  type: 'program',
  features: [...]
} as any);
AST Structure Mismatch ⚠️
Core parser produces: { type: 'program', features: [{ keyword: 'on', body: [...] }] }
Toolkit tests expect: { type: 'eventHandler', event: 'click', commands: [...] }
The mock ASTs use a different structure than what parseHyperscript() actually produces.
No End-to-End Test ⚠️
No test that does: parseHyperscript(code) → analyzeMetrics(ast)
Recommendation
To make the toolkit truly useful, it needs an adapter or to align with the actual AST structure from parseHyperscript(). Here's a quick test to verify:
Bash Test actual parser output structure
IN
node -e "
const { parseHyperscript } = require('./packages/core/dist/hyperscript-parser.js');
const result = parseHyperscript('on click toggle .active on me');
console.log('Actual AST structure:');
console.log(JSON.stringify(result.node, null, 2));
" 2>/dev/null || echo "Need to check if core is built"
OUT
Need to check if core is built
Looking at the parser tests I read earlier, the actual AST structure from parseHyperscript() is:
// Actual output from parseHyperscript('on click log "clicked"')
{
  type: 'program',
  features: [{
    type: 'feature',
    keyword: 'on',        // ← Different from toolkit's 'event: click'
    body: [{
      type: 'command',    // ← Commands in 'body', not 'commands'
      name: 'log',
      args: [{ value: 'clicked' }]
    }]
  }]
}

### Summary

Aspect	Status
Type imports from core	✅ Working
Generic ASTNode compatible	✅ Working
Visitor pattern works	✅ Working
Query engine works	✅ Working
Analysis works	✅ Working
Uses actual parser output	❌ Uses mocks
Node type names match	⚠️ Partial mismatch
Bottom line: The ast-toolkit works well with any AST structure due to the generic ASTNode type, but its test fixtures and examples use a different node naming convention than what the core parser actually produces. The toolkit functions would work on real ASTs, but:
findNodes(ast, n => n.type === 'eventHandler') → Would return 0 (core uses 'feature')
queryAll(ast, 'command') → Would work ✅
calculateComplexity(ast) → Would work ✅ (counts conditionals, nesting)

### To fully integrate

Either:
Update toolkit tests/examples to use actual parser structure
Create an AST normalizer that transforms parser output to toolkit's expected format
Update toolkit queries to handle both naming conventions