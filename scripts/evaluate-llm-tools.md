# LLM Tools Evaluation Protocol

## Purpose

Evaluate whether Agent Skills and MCP tools provide measurable benefits for LLM agents working with HyperFixi hyperscript.

## Test Categories

### 1. Baseline Hyperscript Knowledge

Test what LLMs know without any tools.

**Prompts to test:**
```
1. "Write hyperscript that toggles a class on click"
2. "Write hyperscript that shows a modal and hides it after 2 seconds"
3. "Write hyperscript that validates an email input on blur"
4. "Write hyperscript for a tab navigation component"
```

**Expected:** LLMs should handle basic cases correctly from training data.

### 2. Multilingual (Unique Value)

Test if LLMs can write hyperscript in non-English languages.

**Prompts:**
```
1. "Write the same toggle hyperscript in Japanese"
2. "Write hyperscript in Korean that adds a class on hover"
3. "Translate 'on click toggle .active then wait 1s then remove .active' to Arabic"
```

**Expected:** LLMs will likely fail without reference material. This is where our tools provide unique value.

### 3. Validation Accuracy

Test if validation tools catch real errors.

**Test cases:**
```javascript
// Should pass
"on click toggle .active"

// Should fail - unmatched quote
"on click put 'hello into #output"

// Should fail - missing 'then'
"on click toggle .a toggle .b"

// Should warn - deprecated pattern
"on click call setTimeout(fn, 1000)"
```

### 4. Complex Patterns

Test whether pattern lookup helps with advanced features.

**Prompts:**
```
1. "Write hyperscript for infinite scroll loading"
2. "Write hyperscript for form validation with multiple fields"
3. "Write hyperscript for drag and drop reordering"
```

## Evaluation Metrics

| Metric | Description |
|--------|-------------|
| **Correctness** | Does the generated code parse and work? |
| **Idiomatic** | Does it follow hyperscript conventions? |
| **Completeness** | Does it handle edge cases? |
| **Tool Usage** | Did the agent use available tools? |

## Quick Self-Test

Run these tests in Claude Code to evaluate current behavior:

### Test 1: Basic Generation (No Tools Needed)
```
Write hyperscript that toggles .open on #menu when #hamburger is clicked
```

### Test 2: Multilingual (Tools Needed)
```
Write hyperscript in Japanese that shows #modal on click
```

### Test 3: Validation (MCP Tool)
```
Validate this hyperscript: on click put 'hello into #output
```

## Results Template

```markdown
## Evaluation Results - [Date]

### Test 1: Basic Generation
- [ ] Correct syntax
- [ ] Works as expected
- [ ] Tool used: None / validate_hyperscript / other

### Test 2: Multilingual
- [ ] Used correct Japanese keywords
- [ ] Proper word order (SOV)
- [ ] Tool used: SKILL.md / translate_hyperscript / none

### Test 3: Validation
- [ ] Detected the error
- [ ] Provided helpful message
- [ ] Tool used: validate_hyperscript / get_diagnostics / manual inspection
```

## Conclusions

After running evaluation:

1. **Agent Skills value**: Primarily for multilingual examples and quick syntax reference
2. **MCP validation value**: Catches syntax errors that visual inspection misses
3. **MCP analysis value**: Limited - hyperscript rarely complex enough to need it
4. **Recommendation**: Focus on validation and multilingual as differentiators
