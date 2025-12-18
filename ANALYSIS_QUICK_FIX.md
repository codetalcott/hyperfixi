# Quick Fix: Commands-v2 Support (30 minutes)

## The Problem

Your comparison tools only look in `packages/core/src/commands/` but the actual command implementations are in:
- `packages/core/src/commands-v2/` ← **Current implementations** (43 commands, tree-shakeable)
- `packages/core/src/commands/` ← Legacy (some v1 implementations)

This means analysis misses recent optimizations.

## The Fix

### File: `scripts/analysis/comparison/extract-command-metrics.mjs`

**Change lines 23 and 22:**

```javascript
// BEFORE:
const ORIGINAL_PATH = '/Users/williamtalcott/projects/_hyperscript/src/_hyperscript.js';
const HYPERFIXI_COMMANDS = join(PROJECT_ROOT, 'packages/core/src/commands');

// AFTER:
const ORIGINAL_PATH = '/Users/williamtalcott/projects/_hyperscript/src/_hyperscript.js';

// Support both v1 and v2 command layouts
const HYPERFIXI_COMMAND_DIRS = [
  join(PROJECT_ROOT, 'packages/core/src/commands-v2/'),
  join(PROJECT_ROOT, 'packages/core/src/commands/'),
].filter(dir => existsSync(dir));
```

**Change the function call around line 260:**

```javascript
// BEFORE:
async function main() {
  // ...
  const hyperFixiCommands = await findCommandFiles(HYPERFIXI_COMMANDS);

// AFTER:
async function main() {
  // ...
  const hyperFixiCommands = await findAllCommandFiles();
```

**Add new helper function before main():**

```javascript
/**
 * Find all command files across v1 and v2 directories
 */
async function findAllCommandFiles() {
  const allFiles = [];
  const seenCommands = new Set();

  for (const dir of HYPERFIXI_COMMAND_DIRS) {
    const files = await findCommandFiles(dir);

    for (const file of files) {
      // Extract command name from file path or content
      const content = await readFile(file, 'utf-8');
      const nameMatch = content.match(/@command\(\s*\{\s*name:\s*['"](\w+)['"]/);
      const className = file.match(/\/(\w+)\./);
      const name = nameMatch?.[1] ||
                   className?.[1]?.replace(/Command$/, '').toLowerCase() ||
                   'unknown';

      // Prefer v2 implementations (more recent)
      if (!seenCommands.has(name)) {
        allFiles.push(file);
        seenCommands.add(name);
      }
    }
  }

  return allFiles;
}
```

**That's it!** This will now properly analyze all 43 commands.

---

## Test It

```bash
# Run the updated analysis
node scripts/analysis/comparison/compare-implementations.mjs

# Check output - should now list commands from both directories
# Look for commands like: add, remove, set, increment, repeat, etc.
```

---

## What This Reveals

After this fix runs, you'll see:

1. **Accurate command metrics** - All 43 commands now analyzed
2. **Which optimizations worked** - Commands with @extends will show savings
3. **Baseline metrics** - Code ratio may be better than 2.97x
4. **Next targets** - Which commands still need optimization

### Expected output improvement:
```
BEFORE FIX:
- Matched commands: 25
- HyperFixi total: ~9,500 lines
- Code ratio: 2.97x

AFTER FIX:
- Matched commands: 43 ← All commands found
- HyperFixi total: accurate ← Based on actual implementations
- Code ratio: ? ← May be better due to v2 consolidations
```

---

## Next: Add Minified Size (Optional, 1 hour)

While you're in extract-command-metrics.mjs, add minified size estimation:

```javascript
// Add to extractHyperFixiCommand() return object (around line 239):

return {
  name,
  file: relative(PROJECT_ROOT, filePath),
  lines: totalLines,
  // ... existing fields ...

  // NEW ADDITIONS:
  sourceBytes: Buffer.byteLength(content, 'utf-8'),

  // Rough minified estimate
  estimatedMinifiedBytes: estimateMinified(content),

  // Check if consolidatable
  extendsBase,
  baseClass,
};

// Add helper function before extractHyperFixiCommand():
function estimateMinified(content) {
  let minified = content
    .replace(/\/\*[\s\S]*?\*\//g, '')      // Remove block comments
    .replace(/\/\/.*/g, '')                 // Remove line comments
    .replace(/\s+/g, ' ')                   // Collapse whitespace
    .replace(/\s*([{}();,:])\s*/g, '$1');   // Remove spaces around symbols

  return minified.length;
}
```

This will show which commands are actually heavy in production (minified size) vs source size.

---

## Validation Checklist

- [ ] Updated lines 22-23 to add HYPERFIXI_COMMAND_DIRS
- [ ] Added findAllCommandFiles() function
- [ ] Updated main() to call findAllCommandFiles()
- [ ] Ran analysis: `node scripts/analysis/comparison/compare-implementations.mjs`
- [ ] See all 43 commands in output (not just ~25)
- [ ] Code ratio value is reasonable (probably better than 2.97x)

---

## That's the Quick Fix!

After this, you'll have:
- ✅ Accurate analysis scope
- ✅ All commands included
- ✅ Better metrics to guide next optimization round
- ✅ Ability to verify whether recent optimizations helped

The rest of the enhancements (bundle composition, progress tracking, etc.) can be added incrementally as needed.
