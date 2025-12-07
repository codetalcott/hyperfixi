# Compound Examples - Automated Testing Guide

Quick reference for automated testing of compound-examples.html with hard-refresh and log capture.

## Quick Start (Most Common Commands)

```bash
# Fast iteration - run after code changes
npm run test:compound

# Watch mode - auto-runs every 3 seconds
npm run test:compound:watch

# Verbose debugging - shows full stack traces
npm run test:compound:verbose

# Show browser window (non-headless)
npm run test:compound:headed
```

## What It Does

1. **Hard refreshes** the page (bypasses all cache)
2. **Captures all console output** (log, warn, error, info, debug)
3. **Detects page errors** (runtime exceptions)
4. **Color-codes output** for easy scanning
5. **Auto-saves logs** to `console-logs/compound-TIMESTAMP.txt`
6. **Exit codes**: 0 = success, 1 = errors found

## Available Commands

### Basic Usage

```bash
# Default (Chromium, headless)
npm run test:compound

# Firefox
npm run test:compound:firefox

# Show browser window
npm run test:compound:headed

# Verbose output with stack traces
npm run test:compound:verbose

# Watch mode (re-run every 3 seconds)
npm run test:compound:watch
```

### Advanced Usage

```bash
# Direct script execution with options
node test-compound-auto.mjs [browser] [options]

# Examples:
node test-compound-auto.mjs chrome --headed
node test-compound-auto.mjs firefox --verbose
node test-compound-auto.mjs --save my-logs.txt
node test-compound-auto.mjs webkit --watch
```

### Options

- `chromium` | `chrome` | `firefox` | `webkit` - Browser to use (default: chromium)
- `--headed` | `-h` - Show browser window (non-headless)
- `--verbose` | `-v` - Show full stack traces and source locations
- `--watch` | `-w` - Re-run tests every 3 seconds
- `--save <file>` - Custom log file path (default: console-logs/compound-TIMESTAMP.txt)

## Output Format

### Console Output (Color-Coded)

```
🧪 Compound Examples Test Runner
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ Started at 10:36:44 AM
🌐 Browser: chromium
📄 URL: http://127.0.0.1:3000/compound-examples.html
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 Loading page with hard refresh...

⚠️  [WARNING] ⚠️  Attempting to register command with undefined name: {...}
📝 [LOG] 🔧 About to create transition command...
❌ [ERROR] Unknown function: Draggable

✅ Page loaded
⏳ Waiting 2000ms for scripts to execute...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Test Summary
⏱️  Duration: 3550ms
📝 Total logs: 522
❌ Errors: 6
⚠️  Warnings: 34
💾 Logs saved to: /path/to/console-logs/compound-2025-10-29T14-36-44.txt
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Saved Log File

Plain text format with timestamps for later analysis:

```
=== Compound Examples Test Logs ===
Timestamp: 2025-10-29T14:36:44.000Z
Browser: chromium
URL: http://127.0.0.1:3000/compound-examples.html
Duration: 3550ms
Total logs: 522
Errors: 6
Warnings: 34

=== Console Output ===
[WARNING] ⚠️  Attempting to register command with undefined name: {...}
[LOG] 🔧 About to create transition command...
[ERROR] Unknown function: Draggable
...

=== End of Logs ===
```

## Integration with Development Workflow

### Fast Iteration Cycle

```bash
# 1. Make code changes
vim src/parser/parser.ts

# 2. Rebuild browser bundle
npm run build:browser

# 3. Test with hard refresh and capture logs
npm run test:compound

# 4. Review logs if errors found
cat console-logs/compound-LATEST.txt
```

### Watch Mode (Continuous Testing)

```bash
# Terminal 1: Start watch mode
npm run test:compound:watch

# Terminal 2: Make code changes
# Tests auto-run every 3 seconds

# Press Ctrl+C to stop watch mode
```

### Claude Code Integration

The test script is designed for use with Claude Code automation:

```javascript
// Bash tool command
const result = await bash({
  command: 'cd packages/core && npm run test:compound',
  timeout: 15000
});

// Exit code: 0 = pass, 1 = fail
if (result.exitCode === 0) {
  console.log('✅ All tests passed');
} else {
  console.log('❌ Errors found, check logs');
}
```

## Current Test Results (Latest Run)

**Status**: ❌ **6 errors, 34 warnings**

**Key Issues Found**:
1. **34 warnings**: Commands registering with undefined names
2. **3 errors**: Unknown function "Draggable" (behavior not recognized)
3. **Runtime check**: HyperScript runtime detection failed

**Log Location**: `console-logs/compound-2025-10-29T14-36-44.txt`

## Tips for Effective Testing

### 1. Use Verbose Mode for Debugging

```bash
npm run test:compound:verbose
```

Shows full stack traces and source file locations for all logs.

### 2. Use Headed Mode to See Visual State

```bash
npm run test:compound:headed
```

Opens browser window so you can see what's happening (useful for CSS/layout issues).

### 3. Use Watch Mode for TDD

```bash
npm run test:compound:watch
```

Auto-runs tests every 3 seconds - perfect for test-driven development.

### 4. Compare Logs Over Time

```bash
# All logs are timestamped
ls -lt console-logs/compound-*.txt

# Compare two runs
diff console-logs/compound-2025-10-29T14-36-44.txt \
     console-logs/compound-2025-10-29T14-38-12.txt
```

### 5. Filter Logs for Specific Issues

```bash
# Find all errors
grep "ERROR" console-logs/compound-*.txt

# Find all warnings
grep "WARNING" console-logs/compound-*.txt

# Find specific function errors
grep "Unknown function" console-logs/compound-*.txt
```

## Troubleshooting

### Server Not Running

```
Error: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3000/compound-examples.html
```

**Solution**: Start the HTTP server first:
```bash
npx http-server packages/core -p 3000 -c-1
```

### Browser Launch Failed

```
Error: Executable doesn't exist at /path/to/browser
```

**Solution**: Install Playwright browsers:
```bash
npx playwright install chromium firefox webkit
```

### No Logs Captured

If no logs appear, check that:
1. HTTP server is running
2. Page is loading without network errors
3. JavaScript is executing (check browser console manually)

### Too Many Logs

Adjust the `WAIT_TIME` in `test-compound-auto.mjs`:

```javascript
const WAIT_TIME = 2000; // Reduce if page loads faster
```

## Next Steps

Based on the current test results, the following issues need attention:

1. **Fix undefined command names** (34 warnings)
   - Commands are registering without proper names
   - Check command registration in runtime.ts

2. **Fix Draggable behavior** (3 errors)
   - Behavior "Draggable" not being recognized
   - Check behavior registration in parser/runtime

3. **Verify runtime detection** (1 error)
   - `window._hyperscript` or `window.hyperscriptFixi` not found
   - Check browser bundle exports

See [compound-examples.html](compound-examples.html) for the test page source.
