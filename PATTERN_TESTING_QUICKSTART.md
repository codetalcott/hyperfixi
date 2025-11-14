# Pattern Testing - Quick Start Guide

**Get started with systematic pattern testing in under 5 minutes!**

---

## 🚀 Quick Commands

```bash
# 1. Generate test pages (one-time setup)
node scripts/generate-pattern-tests.mjs

# 2. Run comprehensive test suite
node scripts/test-all-patterns.mjs

# 3. View results
cat test-results/pattern-test-results-*.md | tail -50
```

That's it! You'll see results like:

```
✅ Passed: 54/54 (100%)
❌ Failed: 0
❓ Unknown: 0
```

---

## 📊 What Gets Tested

- **54 patterns** across 8 categories
- **Commands** - DOM manipulation (set, add, remove, toggle, etc.)
- **Events** - Event handling (on click, on load, filters, etc.)
- **Operators** - Expressions (+, contains, matches)
- **Control Flow** - Conditionals (if, if-else)
- **References** - Element access (me, it, #id, .class, etc.)
- **Properties** - Property access (., my, its)
- **Context** - tell command
- **Temporal** - Command chaining (then)

---

## 🎯 Common Tasks

### View Test Pages in Browser

```bash
# Open specific category
open http://127.0.0.1:3000/cookbook/generated-tests/test-commands.html

# Open all patterns
open http://127.0.0.1:3000/cookbook/generated-tests/test-all-patterns.html
```

### Find Untested Patterns

```javascript
import { getUntestedPatterns } from './patterns-registry.mjs';

const untested = getUntestedPatterns();
console.log(`Untested: ${untested.length}`);
untested.forEach(p => console.log(`  - ${p.syntax}`));
```

### Check Pattern Status

```javascript
import { getPatternStats } from './patterns-registry.mjs';

const stats = getPatternStats();
console.log(`Implemented: ${stats.implementedPercent}%`);
console.log(`Tested: ${stats.testedPercent}%`);
```

### Re-generate Tests After Registry Changes

```bash
# Edit patterns-registry.mjs with new patterns
# Then regenerate:
node scripts/generate-pattern-tests.mjs
node scripts/test-all-patterns.mjs
```

---

## 🔍 Understanding Results

### Console Output

```
📝 Testing: test-commands.html...
   ✅ Passed: 24/24 (100%)   ← All patterns compiled successfully

📝 Testing: test-eventHandlers.html...
   ✅ Passed: 8/10 (80%)     ← Some patterns failed
   ❌ Failed: 2              ← See details below
```

### Status Meanings

- **✅ COMPILED** = Pattern compiled successfully
- **❌ FAILED** = Pattern failed to compile
- **❓ UNKNOWN** = Pattern needs investigation

### Reports Location

```
test-results/
├── pattern-test-results-2025-11-13.json  ← Machine-readable
└── pattern-test-results-2025-11-13.md    ← Human-readable
```

---

## 🐛 Troubleshooting

### "Cannot connect to server"

**Solution:**
```bash
npx http-server packages/core -p 3000 -c-1 &
```

### "Test directory not found"

**Solution:**
```bash
node scripts/generate-pattern-tests.mjs
```

### "Module not found"

**Solution:**
```bash
npm install  # Install playwright and dependencies
```

---

## 📚 Learn More

- [PATTERN_TESTING_GUIDE.md](PATTERN_TESTING_GUIDE.md) - Full documentation
- [PATTERN_TESTING_IMPLEMENTATION_SUMMARY.md](PATTERN_TESTING_IMPLEMENTATION_SUMMARY.md) - Implementation details
- [patterns-registry.mjs](patterns-registry.mjs) - Pattern catalog

---

## 🎯 Next Steps

1. **Run tests now**: `node scripts/test-all-patterns.mjs`
2. **Review results**: Check test-results/*.md
3. **Explore patterns**: Open browser test pages
4. **Add CI/CD**: Integrate into your workflow

**Questions?** See [PATTERN_TESTING_GUIDE.md](PATTERN_TESTING_GUIDE.md) for detailed docs.
