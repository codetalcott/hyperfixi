# Claude Code Integration Guide

**How to get automated test feedback during development cycles**

---

## 🎯 Overview

This guide shows how Claude Code can automatically run tests and receive structured feedback during development. The system provides multiple output formats and integration points.

---

## 🚀 Quick Start

### 1. **One-Command Test Feedback**

```bash
# Run tests and get console output (human-readable)
npm run test:feedback --prefix packages/core

# Exit code: 0 = all pass, 1 = some failures
```

**Output Example**:
```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║           ✅ Test Results: 100% Pass Rate ✅                      ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝

📊 Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Total Tests:  18
   ✅ Passed:     18
   ❌ Failed:     0
   📈 Pass Rate:  100%

✅ SET Tests: 3/3 passed
✅ PUT Tests: 2/2 passed
✅ LOG Tests: 2/2 passed
✅ DOM Tests: 2/2 passed
✅ EXPRESSION Tests: 4/4 passed
✅ CONTEXT Tests: 2/2 passed

🎉 All tests passed! Safe to proceed.
```

---

## 📊 Output Formats

### **Console Output** (Default - Human Readable)

```bash
npm run test:feedback --prefix packages/core
```

Use when:
- ✅ Reading results directly in terminal
- ✅ Quick visual feedback
- ✅ Debugging during development

### **JSON Output** (Machine Parseable)

```bash
npm run test:feedback:json --prefix packages/core
```

**Structure**:
```json
{
  "summary": {
    "total": 18,
    "passed": 18,
    "failed": 0,
    "passRate": "100%"
  },
  "categories": {
    "SET": [
      {
        "name": "Set local variable",
        "passed": true,
        "result": "Success",
        "error": "",
        "code": "set x to 42"
      }
    ],
    "PUT": [...],
    "LOG": [...],
    "DOM": [...],
    "EXPRESSION": [...],
    "CONTEXT": [...]
  },
  "timestamp": "2025-10-28T15:30:45.123Z"
}
```

Use when:
- ✅ Parsing results programmatically
- ✅ Integrating with CI/CD
- ✅ Storing test history
- ✅ Building dashboards

### **Markdown Output** (Documentation)

```bash
npm run test:feedback:md --prefix packages/core
```

**Structure**:
```markdown
# Test Results

**Status**: ✅ PASS | **Pass Rate**: 100% | **Timestamp**: 2025-10-28T15:30:45.123Z

## Summary

- **Total Tests**: 18
- **Passed**: 18 ✅
- **Failed**: 0 ❌
- **Pass Rate**: 100%

## Results by Category

### ✅ SET (3/3)

- ✅ **Set local variable**
- ✅ **Set string variable**
- ✅ **Set element property**

[... more categories ...]
```

Use when:
- ✅ Generating test reports
- ✅ Documentation
- ✅ Sharing with team
- ✅ Archiving results

---

## 🔄 Development Workflow Integration

### **Pattern 1: After Each Code Change**

```bash
# 1. Make code changes
# 2. Rebuild and test
npm run build:browser --prefix packages/core && \
npm run test:feedback --prefix packages/core

# Exit code indicates success/failure
# Claude can check $? for pass/fail
```

### **Pattern 2: Quick Validation**

```bash
# Fast build + test with minimal output
npm run test:quick --prefix packages/core
```

### **Pattern 3: Detailed Debugging**

```bash
# Verbose mode with console logs
npm run test:feedback:verbose --prefix packages/core
```

### **Pattern 4: Save Results for Analysis**

```bash
# Generate JSON report
npm run test:feedback:json --prefix packages/core > test-results.json

# Claude can then read test-results.json
cat test-results.json | jq '.summary'
```

---

## 🤖 Claude Code Usage Examples

### Example 1: Check If Tests Pass

```bash
# Run tests and capture exit code
npm run test:feedback --prefix packages/core
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ All tests passed - safe to commit"
else
  echo "❌ Tests failed - review output above"
fi
```

### Example 2: Parse JSON Results

```bash
# Get JSON results
RESULTS=$(npm run test:feedback:json --prefix packages/core 2>&1)

# Extract pass rate
PASS_RATE=$(echo "$RESULTS" | jq -r '.summary.passRate')
echo "Pass rate: $PASS_RATE"

# Count failures
FAILED=$(echo "$RESULTS" | jq -r '.summary.failed')
echo "Failed tests: $FAILED"

# List failed test names
echo "$RESULTS" | jq -r '.categories | to_entries[] | .value[] | select(.passed == false) | .name'
```

### Example 3: Automated Pre-Commit Check

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running tests before commit..."
npm run test:quick --prefix packages/core

if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Commit aborted."
  echo "Fix failing tests or use --no-verify to skip"
  exit 1
fi

echo "✅ Tests passed. Proceeding with commit."
exit 0
```

### Example 4: Generate Test Report

```bash
# Generate markdown report with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
npm run test:feedback:md --prefix packages/core > "reports/test-$TIMESTAMP.md"

echo "Report saved to reports/test-$TIMESTAMP.md"
```

---

## 📁 Output Files

Test results are automatically saved to:
```
packages/core/test-results/
├── test-results-2025-10-28T15-30-45-123Z.json
├── test-results-2025-10-28T15-30-45-123Z.md
└── test-results-2025-10-28T15-30-45-123Z.txt
```

**Reading saved results**:
```bash
# List recent test runs
ls -lt packages/core/test-results/ | head -5

# View latest JSON result
cat packages/core/test-results/test-results-*.json | jq '.'

# View latest markdown result
cat packages/core/test-results/test-results-*.md
```

---

## 🎯 Best Practices for Claude Code

### 1. **Always Check Exit Codes**

```bash
npm run test:feedback --prefix packages/core
if [ $? -eq 0 ]; then
  # Tests passed - safe to proceed
  echo "Proceeding with deployment..."
else
  # Tests failed - investigate
  echo "Stopping - tests must pass first"
  exit 1
fi
```

### 2. **Use JSON for Programmatic Access**

```bash
# Parse structured data
RESULTS=$(npm run test:feedback:json --prefix packages/core 2>&1)

# Make decisions based on results
PASS_RATE=$(echo "$RESULTS" | jq -r '.summary.passRate' | sed 's/%//')
if [ "$PASS_RATE" -ge 95 ]; then
  echo "✅ Excellent pass rate: $PASS_RATE%"
else
  echo "⚠️  Pass rate below 95%: $PASS_RATE%"
fi
```

### 3. **Combine with Build Process**

```bash
# Build + Test Pipeline
npm run build:browser --prefix packages/core && \
npm run test:feedback --prefix packages/core && \
echo "✅ Build and tests successful" || \
echo "❌ Build or tests failed"
```

### 4. **Track Test Results Over Time**

```bash
# Save result with git commit SHA
GIT_SHA=$(git rev-parse --short HEAD)
npm run test:feedback:json --prefix packages/core > \
  "test-results/commit-$GIT_SHA.json"
```

---

## 🔍 Debugging Failed Tests

When tests fail, the output shows:

1. **Test name** - Which specific test failed
2. **Error message** - Why it failed
3. **Code snippet** - The hyperscript code that was tested
4. **Expected vs actual** - What was expected vs what happened

**Example**:
```
❌ SET Tests: 2/3 passed
   ❌ Set element property
      Error: No element context available for attribute setting
      Code: set my innerHTML to "test"
```

**Debugging steps**:
1. Note the failing test name
2. Check the error message
3. Review the code snippet
4. Open [test-dashboard.html](http://127.0.0.1:3000/test-dashboard.html) for interactive debugging
5. Fix the issue
6. Re-run: `npm run test:feedback --prefix packages/core`

---

## 📈 Interpreting Results

### Pass Rate Guidelines

| Pass Rate | Status | Action |
|-----------|--------|--------|
| 100% | ✅ Excellent | Safe to proceed |
| 95-99% | ⚠️ Good | Review failures, non-blocking |
| 80-94% | ⚠️ Needs Work | Fix critical failures |
| <80% | ❌ Critical | Do not proceed, fix immediately |

### Common Failure Patterns

1. **Missing Context**
   - Error: "No element context available"
   - Fix: Ensure `createContext()` called with element

2. **Undefined Variables**
   - Error: "Variable x resolved to undefined"
   - Fix: Set variable in context before using

3. **DOM Not Ready**
   - Error: "Element not found"
   - Fix: Ensure element added to DOM before testing

4. **Async Issues**
   - Error: "Promise rejected"
   - Fix: Use `await` with async commands

---

## 🛠️ Advanced Usage

### Custom Test Filtering

```bash
# Run only specific test categories
# (requires modifying test-feedback.mjs to support --filter)

# Example for future enhancement:
# npm run test:feedback -- --filter=SET,PUT
```

### Integration with CI/CD

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run build:browser --prefix packages/core
      - run: npm run test:feedback:json --prefix packages/core
      - name: Upload results
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: packages/core/test-results/
```

### Comparison with Previous Results

```bash
# Save baseline
npm run test:feedback:json --prefix packages/core > baseline.json

# After changes, compare
npm run test:feedback:json --prefix packages/core > current.json
diff baseline.json current.json
```

---

## 📞 Support & Troubleshooting

### Server Not Running

```bash
# Error: connect ECONNREFUSED 127.0.0.1:3000
# Solution: Start HTTP server
npx http-server packages/core -p 3000 -c-1
```

### Browser Launch Failed

```bash
# Error: Failed to launch chromium
# Solution: Install Playwright browsers
npx playwright install chromium
```

### Timeout Errors

```bash
# Error: Timeout 30000ms exceeded
# Solution: Increase timeout in test-feedback.mjs
# Or use --quick flag for faster tests
npm run test:quick --prefix packages/core
```

---

## 🎓 Summary

**Key Commands**:
```bash
# Standard test run with console output
npm run test:feedback --prefix packages/core

# Machine-parseable JSON
npm run test:feedback:json --prefix packages/core

# Documentation-friendly Markdown
npm run test:feedback:md --prefix packages/core

# Quick validation
npm run test:quick --prefix packages/core

# Detailed debugging
npm run test:feedback:verbose --prefix packages/core
```

**Exit Codes**:
- `0` = All tests passed ✅
- `1` = Some tests failed ❌

**Output Locations**:
- Console: stdout
- Files: `packages/core/test-results/`

**Integration Points**:
- Exit codes for pass/fail decisions
- JSON for programmatic parsing
- Markdown for documentation
- Files for historical tracking

---

**Generated for Claude Code** 🤖
*Automated testing feedback for rapid development cycles*
