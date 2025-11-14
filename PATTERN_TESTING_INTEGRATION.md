# Pattern Testing - Integration Guide

**How to use pattern testing automatically in your development workflow**

---

## 🎯 Integration Options

You have **3 ways** to use the pattern testing infrastructure:

| Method | When | How | Auto/Manual |
|--------|------|-----|-------------|
| **🪝 Claude Hooks** | After builds, edits, commits | Automatic | ⚡ Automatic |
| **🎨 Claude Skill** | On-demand validation | `/validate-patterns` | 🖱️ Manual |
| **📦 NPM Scripts** | Command line testing | `npm run patterns:test` | 🖱️ Manual |

---

## 🪝 Option 1: Claude Hooks (RECOMMENDED)

### What Are Hooks?

Hooks run automatically when you use specific tools (Bash, Edit, Write). They provide **instant feedback** without manual intervention.

### Proposed Hook Configuration

I've created [.claude/hooks-pattern-testing.json](.claude/hooks-pattern-testing.json) with these hooks:

#### After Building Browser Bundle
```json
{
  "name": "validate-patterns-after-build",
  "pattern": "npm run build:browser",
  "command": "node scripts/test-all-patterns.mjs"
}
```
**Triggers:** After `npm run build:browser`
**Benefit:** Automatically validates all patterns after bundle updates

#### After Editing Command Files
```json
{
  "name": "validate-patterns-after-command-edit",
  "pattern": "packages/core/src/commands/.*\\.(ts|js)",
  "command": "npm run build:browser --prefix packages/core && node scripts/test-all-patterns.mjs"
}
```
**Triggers:** After editing any command file
**Benefit:** Catches regressions immediately when modifying commands

#### After Updating Pattern Registry
```json
{
  "name": "validate-patterns-after-registry-change",
  "pattern": "patterns-registry\\.(ts|mjs)",
  "command": "node scripts/generate-pattern-tests.mjs && node scripts/test-all-patterns.mjs"
}
```
**Triggers:** After editing patterns-registry.ts or patterns-registry.mjs
**Benefit:** Automatically regenerates tests when registry changes

#### Before Git Commit (Non-blocking)
```json
{
  "name": "validate-patterns-before-commit",
  "pattern": "git commit(?!.*--no-verify)",
  "command": "node scripts/test-all-patterns.mjs"
}
```
**Triggers:** Before `git commit`
**Benefit:** Warns about pattern regressions before committing

### How to Enable

**Option A: Replace existing hooks (CAREFUL)**
```bash
# Backup current hooks
cp .claude/hooks.json .claude/hooks.json.backup

# Use new hooks
cp .claude/hooks-pattern-testing.json .claude/hooks.json
```

**Option B: Merge manually (RECOMMENDED)**

Open [.claude/hooks.json](.claude/hooks.json) and add the new hooks from [.claude/hooks-pattern-testing.json](.claude/hooks-pattern-testing.json).

**Example merged structure:**
```json
{
  "hooks": {
    "afterToolUse": {
      "Bash": [
        // Existing: validate-after-build
        { "name": "validate-after-build", ... },
        // NEW: Pattern testing after build
        { "name": "validate-patterns-after-build", ... },
        // Existing: quick-validate-typecheck
        { "name": "quick-validate-typecheck", ... }
      ],
      "Edit": [
        // NEW: Pattern testing after command edits
        { "name": "validate-patterns-after-command-edit", ... }
      ],
      "Write": [
        // NEW: Pattern testing after registry changes
        { "name": "validate-patterns-after-registry-change", ... }
      ]
    }
  }
}
```

### Hook Configuration Tips

**Blocking vs Non-blocking:**
- `"blocking": true` - Prevents next action until complete (use for critical validation)
- `"blocking": false` - Runs in background, warns on failure (use for supplementary checks)

**Show Output:**
- `"showOutput": true` - Always show output
- `"showOutput": "onFailure"` - Only show if fails (cleaner)
- `"showOutput": false` - Never show (silent)

**Timeout:**
- Pattern tests complete in ~19 seconds
- Recommended timeout: `30000` (30 seconds)
- Including build: `45000` (45 seconds)

### Example Workflow with Hooks

```
1. You: "Edit toggle.ts to add new feature"
   → Claude edits packages/core/src/commands/dom/toggle.ts
   → 🪝 Hook triggers: validate-patterns-after-command-edit
   → Build runs automatically
   → Pattern tests run automatically
   → ✅ Results displayed: "All 54 patterns passing"

2. You: "Build the browser bundle"
   → Claude runs: npm run build:browser
   → 🪝 Hook triggers: validate-patterns-after-build
   → Pattern tests run automatically
   → ✅ Results displayed: "All patterns still passing"

3. You: "Commit these changes"
   → Claude runs: git commit -m "..."
   → 🪝 Hook triggers: validate-patterns-before-commit
   → Pattern tests run automatically
   → ✅ Results displayed: "Safe to commit"
```

**Benefits:**
- ✅ **Zero manual effort** - Tests run automatically
- ✅ **Instant feedback** - See results immediately
- ✅ **Prevents regressions** - Catches issues before they spread
- ✅ **Confidence** - Know that patterns still work

---

## 🎨 Option 2: Claude Skill

### What Is a Skill?

A skill is a reusable capability you can invoke by name. Use when you want **explicit control** over when tests run.

### How to Invoke

Just mention the skill in conversation:

**Explicit invocation:**
```
You: "Validate patterns"
You: "Run pattern tests"
You: "Test all patterns"
```

**Context-aware invocation:**
```
You: "I just modified the toggle command, can you make sure everything still works?"
Claude: [Invokes validate-patterns skill automatically]
```

### What the Skill Does

1. ✅ Builds browser bundle
2. ✅ Regenerates test pages
3. ✅ Runs comprehensive test suite
4. ✅ Displays results summary
5. ✅ Shows recent test report

### Skill Location

[.claude/skills/validate-patterns.md](.claude/skills/validate-patterns.md)

**Benefits:**
- ✅ **On-demand** - Run when YOU want
- ✅ **Comprehensive** - Includes build + regeneration + testing
- ✅ **Visible** - Full output shown
- ✅ **No surprises** - Explicit invocation

**When to Use:**
- Before creating pull requests
- After implementing new patterns
- When investigating compatibility issues
- After fixing bugs that might affect patterns

---

## 📦 Option 3: NPM Scripts

### Available Commands

Added to [package.json](package.json):

```bash
# Generate test pages from registry
npm run patterns:generate

# Run test suite (assumes pages already generated)
npm run patterns:test

# Generate + test (recommended)
npm run patterns:validate

# Extract patterns from official _hyperscript tests
npm run patterns:extract

# Full validation: build + generate + test
npm run patterns:full
```

### Usage Examples

**Quick test (if bundle already built):**
```bash
npm run patterns:test
```

**Full validation (includes build):**
```bash
npm run patterns:full
```

**After updating registry:**
```bash
npm run patterns:validate
```

**One-time pattern extraction:**
```bash
npm run patterns:extract
```

### Integration with CI/CD

**GitHub Actions example:**
```yaml
# .github/workflows/pattern-tests.yml
name: Pattern Compatibility Tests

on: [push, pull_request]

jobs:
  test-patterns:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm install
      - name: Run pattern tests
        run: npm run patterns:full
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: pattern-test-results
          path: test-results/
```

**Pre-commit hook example:**
```bash
# .git/hooks/pre-commit
#!/bin/bash
npm run patterns:test
if [ $? -ne 0 ]; then
  echo "❌ Pattern tests failed"
  exit 1
fi
```

**Benefits:**
- ✅ **Scriptable** - Easy to automate
- ✅ **CI/CD ready** - Works in GitHub Actions
- ✅ **Familiar** - Standard npm commands
- ✅ **Composable** - Combine with other scripts

---

## 🎯 Comparison: Which Option to Use?

| Feature | Claude Hooks | Claude Skill | NPM Scripts |
|---------|-------------|--------------|-------------|
| **Automation** | ⚡ Automatic | 🖱️ Manual | 🖱️ Manual |
| **Setup effort** | 🟡 Medium | 🟢 Easy | 🟢 Easy |
| **Feedback speed** | ⚡ Instant | ⚡ Instant | 🟡 On-demand |
| **Control** | 🟡 Automatic | ✅ Full | ✅ Full |
| **CI/CD ready** | ❌ No | ❌ No | ✅ Yes |
| **Regression detection** | ✅ Excellent | 🟡 Manual | 🟡 Manual |
| **Best for** | Development | Ad-hoc testing | CI/CD |

### Recommended Combination

**Use ALL THREE together:**

1. **Claude Hooks** - Automatic validation during development
   - Catches regressions immediately
   - Zero manual effort
   - Continuous feedback

2. **Claude Skill** - Explicit validation on-demand
   - Before pull requests
   - After major changes
   - When investigating issues

3. **NPM Scripts** - CI/CD and scripting
   - GitHub Actions workflow
   - Pre-commit hooks
   - Automated testing pipelines

---

## 🚀 Quick Setup (All 3 Options)

### 1️⃣ Enable Claude Hooks (5 minutes)

```bash
# Merge new hooks into existing configuration
# See "Option B: Merge manually" section above
```

**Edit:** [.claude/hooks.json](.claude/hooks.json)
**Reference:** [.claude/hooks-pattern-testing.json](.claude/hooks-pattern-testing.json)

### 2️⃣ Skill Already Available

**Location:** [.claude/skills/validate-patterns.md](.claude/skills/validate-patterns.md)

**Invocation:** Just say "validate patterns" in conversation

### 3️⃣ NPM Scripts Already Added

**Added to:** [package.json](package.json)

**Usage:**
```bash
npm run patterns:full  # Run now!
```

---

## 📊 What You'll See

### Hook Output (Automatic)

```
🔨 Building browser bundle...
✅ Build complete

🧪 Running pattern compatibility tests...
📝 Testing: test-commands.html... ✅ 24/24
📝 Testing: test-eventHandlers.html... ✅ 9/9
📝 Testing: test-temporalModifiers.html... ✅ 3/3
...
📊 Total patterns tested: 54
✅ Passed: 54 (100%)
❌ Failed: 0
⏱️  19 seconds

✅ All 54 patterns passing - compatibility maintained
```

### Skill Output (Manual)

```
🔨 Building browser bundle...
🏗️  Regenerating pattern test pages...
🧪 Running pattern compatibility tests...

📊 Total patterns tested: 54
✅ Passed: 54 (100%)
❌ Failed: 0 (0%)
❓ Unknown: 0 (0%)

📊 Latest test results:
[Shows recent test summary from markdown report]

✅ Pattern validation complete - all tests passing!
```

### NPM Script Output

```bash
$ npm run patterns:test

🧪 Running comprehensive pattern test suite...

📂 Found 9 test files

📝 Testing: test-commands.html...
   ✅ Passed: 24/24 (100%)

...

======================================================================
 COMPREHENSIVE PATTERN TEST RESULTS
======================================================================
📊 Total patterns tested: 54
✅ Passed: 54 (100%)
❌ Failed: 0 (0%)
❓ Unknown: 0 (0%)
======================================================================

💾 Detailed results saved to: test-results/pattern-test-results-*.json
📝 Markdown report saved to: test-results/pattern-test-results-*.md
```

---

## 🎓 Usage Tips

### For Active Development

**Enable hooks** - Automatic validation during coding
```
You: "Edit toggle.ts to add feature X"
→ Claude edits file
→ Hook automatically runs tests
→ Instant feedback on compatibility
```

### Before Pull Requests

**Use skill** - Explicit comprehensive validation
```
You: "Validate patterns before I create a PR"
→ Claude runs full validation
→ Builds, regenerates, tests
→ Detailed report with confidence
```

### In CI/CD Pipelines

**Use npm scripts** - Automated testing
```yaml
- name: Validate patterns
  run: npm run patterns:full
```

### After Bug Fixes

**Combination approach:**
1. Fix the bug
2. Claude hook runs automatically (instant feedback)
3. Run skill for comprehensive check (confidence)
4. Commit with npm script validation (safety)

---

## 🔧 Customization

### Adjust Hook Behavior

Edit [.claude/hooks.json](.claude/hooks.json):

**Make pattern tests blocking (prevent action on failure):**
```json
{
  "name": "validate-patterns-after-build",
  "blocking": true  // Changed from false
}
```

**Show output always (not just on failure):**
```json
{
  "name": "validate-patterns-after-build",
  "showOutput": true  // Changed from "onFailure"
}
```

**Disable specific hooks:**
```json
{
  "name": "validate-patterns-after-build",
  "enabled": false  // Add this line
}
```

### Add Custom npm Script

Edit [package.json](package.json):

```json
{
  "scripts": {
    "patterns:commands-only": "node scripts/test-specific-category.mjs commands",
    "patterns:watch": "nodemon --watch patterns-registry.mjs --exec 'npm run patterns:validate'"
  }
}
```

### Modify Skill Behavior

Edit [.claude/skills/validate-patterns.md](.claude/skills/validate-patterns.md)

**Example: Skip build step:**
```bash
# Remove this line:
npm run build:browser --prefix packages/core

# Tests will use existing bundle
```

---

## 📈 Tracking Impact

### Before Integration
- ❌ Manual testing only
- ❌ Regressions discovered late
- ❌ Uncertain compatibility
- ❌ Slow feedback loops

### After Integration
- ✅ Automatic validation
- ✅ Regressions caught immediately
- ✅ Measured compatibility (54/54 = 100%)
- ✅ <20 second feedback

### Metrics to Track

**Pattern Coverage:**
```bash
# Check implementation progress
node -e "import('./patterns-registry.mjs').then(m => {
  const stats = m.getPatternStats();
  console.log(\`Implemented: \${stats.implementedPercent}%\`);
  console.log(\`Tested: \${stats.testedPercent}%\`);
})"
```

**Test Results Over Time:**
```bash
# Compare test runs
ls -t test-results/*.json | head -2 | xargs -I {} sh -c 'echo {}; cat {} | jq .summary'
```

**Regression Detection:**
```bash
# Check if any patterns regressed
npm run patterns:test
# Exit code 0 = pass, 1 = fail
```

---

## 🎉 Conclusion

You now have **three powerful ways** to integrate pattern testing:

1. **🪝 Hooks** - Automatic validation (set it and forget it)
2. **🎨 Skill** - Manual validation (explicit control)
3. **📦 Scripts** - CI/CD integration (automation pipelines)

**Recommended setup:**
- ✅ Enable Claude hooks for automatic validation
- ✅ Use skill before pull requests
- ✅ Add npm scripts to CI/CD pipeline

This gives you **comprehensive coverage** with minimal manual effort!

---

## 📚 Related Documentation

- [PATTERN_TESTING_GUIDE.md](PATTERN_TESTING_GUIDE.md) - Complete guide
- [PATTERN_TESTING_QUICKSTART.md](PATTERN_TESTING_QUICKSTART.md) - 5-minute start
- [PATTERN_TESTING_IMPLEMENTATION_SUMMARY.md](PATTERN_TESTING_IMPLEMENTATION_SUMMARY.md) - Implementation details
- [.claude/hooks-pattern-testing.json](.claude/hooks-pattern-testing.json) - Proposed hooks
- [.claude/skills/validate-patterns.md](.claude/skills/validate-patterns.md) - Skill definition

---

**Ready to use immediately!** Choose the integration method(s) that work best for your workflow.
