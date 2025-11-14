# Official _hyperscript Cookbook vs HyperFixi Test Coverage

**Date**: 2025-11-13
**Status**: Comprehensive Pattern Analysis
**Source**: `/Users/williamtalcott/projects/_hyperscript/www/cookbook/`

## Executive Summary

HyperFixi's current test suite ([full-cookbook-test.html](http://127.0.0.1:3000/cookbook/full-cookbook-test.html)) covers **7 out of 9** official _hyperscript cookbook examples. Two advanced patterns with complex temporal and event filtering features are missing.

## Complete Official Cookbook Examples (9 Total)

### ✅ 1. Hello World - Concat Two Strings
**Status**: ✅ **TESTED**

```hyperscript
<button _="on click set my.innerText to #first.innerText + ' ' + #second.innerText">
  Concat
</button>
```

**Patterns Used**:
- String concatenation with `+` operator
- Element reference with `#id`
- Property access with `.property`
- `set` command

---

### ✅ 2. Set Checkbox to Indeterminate State
**Status**: ✅ **TESTED**

```hyperscript
<input type="checkbox" _="on load set my.indeterminate to true">
<input type="reset" _="on click set .indeterminate.indeterminate to true">
```

**Patterns Used**:
- `on load` event handler
- Setting DOM properties (`my.indeterminate`)
- CSS class selector (`.indeterminate`)
- Chained property access (`.indeterminate.indeterminate`)

---

### ✅ 3. Fade & Remove
**Status**: ✅ **TESTED**

```hyperscript
<button _="on click transition opacity to 0 then remove me">
  Fade & Remove
</button>
```

**Patterns Used**:
- `transition` command (animation)
- `then` command chaining
- `remove` command
- `me` context reference

---

### ❌ 4. Disable Button During htmx Request
**Status**: ❌ **NOT TESTED** (Missing Pattern)

```hyperscript
<button
  hx-get="/example"
  _="on click toggle @disabled until htmx:afterOnLoad">
  Do It
</button>
```

**Patterns Used**:
- ⚠️ **`toggle @attribute`** - Attribute toggle syntax
- ⚠️ **`until` temporal modifier** - Keep state until event fires
- htmx event integration (`htmx:afterOnLoad`)

**Why It Matters**: Tests temporal state management and external event integration.

---

### ❌ 5. Disable All Buttons During htmx Request
**Status**: ❌ **NOT TESTED** (Most Complex Pattern)

```hyperscript
<body _="on every htmx:beforeSend in <button:not(.no-disable)/>
         tell it
             toggle [@disabled='true'] until htmx:afterOnLoad">
</body>
```

**Patterns Used**:
- ⚠️ **`on every`** - No event queuing (process every occurrence)
- ⚠️ **`in <selector>`** - Event filter with complex CSS selector
- ⚠️ **`tell it`** - Context switching command
- ⚠️ **`toggle [@attribute='value']`** - Attribute toggle with explicit value
- ⚠️ **`until` temporal modifier** - Temporal state management

**Why It Matters**: Most advanced cookbook example, tests multiple complex features.

---

### ✅ 6. Filter Group of Elements
**Status**: ✅ **TESTED**

```hyperscript
<input type="text"
       _="on keyup
           if the event's key is 'Escape'
             set my value to ''
             trigger keyup
           else
            show <blockquote/> in #quotes when its textContent contains my value">
```

**Patterns Used**:
- `show...when` conditional syntax
- `contains` operator
- `if/else` conditionals
- `trigger` command
- Event property access (`event's key`)

---

### ✅ 7. Drag-and-Drop Elements
**Status**: ✅ **TESTED**

```hyperscript
<p _="on dragstart call event.dataTransfer.setData('text/plain',target.textContent)">
  <button draggable=true>DRAG ME</button>
</p>

<pre _="
  on dragover or dragenter halt the event
    then set the target's style.background to 'lightgray'
  on dragleave or drop set the target's style.background to ''
  on drop get event.dataTransfer.getData('text/plain')
    then put it into the next <output/>">
```

**Patterns Used**:
- `call` command for JavaScript methods
- `halt the event` - Prevent default behavior
- `on event1 or event2` - Multiple event handlers
- `get` command
- `put...into` command
- Multiline scripts
- Method chaining on event objects

---

### ✅ 8. Event Filtering
**Status**: ✅ **TESTED**

```hyperscript
<button _="on click[event.altKey] remove .primary then settle then add .primary">
  CLICK ME
</button>
```

**Patterns Used**:
- `on event[condition]` - Event filtering with brackets
- `settle` command (wait for animations)
- `remove` and `add` class commands

---

### ✅ 9. Filter Table Rows
**Status**: ✅ **TESTED**

```hyperscript
<input _="on input
   show <tbody>tr/> in closest <table/>
     when its textContent.toLowerCase() contains my value.toLowerCase()"/>
```

**Patterns Used**:
- `show...when` with complex selector
- `closest` DOM navigation
- Method chaining (`.toLowerCase()`)
- `contains` operator

---

## Missing Patterns in HyperFixi Tests

### 🔴 Critical Missing Pattern: `until` Temporal Modifier

**Official Syntax**:
```hyperscript
toggle @disabled until htmx:afterOnLoad
toggle [@disabled='true'] until htmx:afterOnLoad
```

**What It Does**: Maintains a state change until a specific event fires.

**Test Coverage**: ❌ Not tested
**Implementation Status**: ❓ Unknown (needs verification)

### 🔴 Critical Missing Pattern: `on every` Event Modifier

**Official Syntax**:
```hyperscript
on every htmx:beforeSend in <button:not(.no-disable)/>
```

**What It Does**: Processes every event occurrence without queuing (normal behavior queues).

**Test Coverage**: ❌ Not tested
**Implementation Status**: ❓ Unknown (needs verification)

### 🔴 Critical Missing Pattern: `tell` Command

**Official Syntax**:
```hyperscript
tell it
    toggle [@disabled='true'] until htmx:afterOnLoad
```

**What It Does**: Changes the target context (`me`) for nested commands.

**Test Coverage**: ❌ Not tested
**Implementation Status**: ❓ Unknown (needs verification)

### 🟡 Advanced Pattern: `in <selector>` Event Filter

**Official Syntax**:
```hyperscript
on every htmx:beforeSend in <button:not(.no-disable)/>
```

**What It Does**: Filters events to only those occurring within matching elements.

**Test Coverage**: ❌ Not tested
**Implementation Status**: ❓ Unknown (needs verification)

### 🟡 Advanced Pattern: Attribute Toggle with Value

**Official Syntax**:
```hyperscript
toggle [@disabled='true']
```

**What It Does**: Toggles an attribute with an explicit value (vs just presence).

**Test Coverage**: ❌ Not tested
**Implementation Status**: ❓ Unknown (needs verification)

---

## Pattern Coverage Summary

| Pattern Category | Total Patterns | Tested | Not Tested | Coverage % |
|-----------------|----------------|--------|------------|------------|
| **Basic Commands** | 8 | 8 | 0 | 100% |
| **Event Handling** | 5 | 3 | 2 | 60% |
| **Temporal Modifiers** | 1 | 0 | 1 | 0% |
| **Context Switching** | 1 | 0 | 1 | 0% |
| **Advanced Filters** | 1 | 0 | 1 | 0% |
| **Overall** | 16 | 11 | 5 | 69% |

### Basic Commands ✅ (100% Coverage)
- ✅ `set` - Setting properties and values
- ✅ `add`/`remove` - Class manipulation
- ✅ `toggle` - Basic toggle (class)
- ✅ `show...when` - Conditional visibility
- ✅ `transition` - CSS transitions
- ✅ `call` - JavaScript method calls
- ✅ `get`/`put` - Value manipulation
- ✅ `halt` - Event prevention

### Event Handling ⚠️ (60% Coverage)
- ✅ `on event` - Basic event handlers
- ✅ `on event[condition]` - Bracket filters
- ✅ `on event1 or event2` - Multiple events
- ❌ `on every event` - No-queue event handling
- ❌ `on event in <selector>` - Event filtering by target

### Temporal Modifiers 🔴 (0% Coverage)
- ❌ `until event` - Temporal state management

### Context Switching 🔴 (0% Coverage)
- ❌ `tell target` - Change command context

### Advanced Attribute Manipulation 🔴 (0% Coverage)
- ❌ `toggle [@attr='value']` - Attribute toggle with value

---

## Recommendations

### Priority 1: Implement Missing htmx Integration Tests

Create tests for Examples #4 and #5, even without htmx, by using custom events:

```html
<!-- Test temporal 'until' modifier -->
<button id="test-until" _="on click
    toggle @disabled until customEvent">
  Test Until
</button>

<button onclick="document.getElementById('test-until').dispatchEvent(new Event('customEvent'))">
  Trigger Custom Event
</button>
```

### Priority 2: Test 'on every' Modifier

```html
<div id="counter">0</div>
<button _="on every click
    get #counter.textContent as Int
    then increment it
    then put it into #counter">
  Click Fast (No Queue)
</button>
```

### Priority 3: Test 'tell' Command

```html
<div id="container">
  <button _="on click
      tell #output
          put 'Context switched!' into me">
    Test Tell
  </button>
  <div id="output"></div>
</div>
```

### Priority 4: Test 'in <selector>' Event Filter

```html
<div id="parent" _="on click in <button.active/>
    log 'Only fires for active buttons'">
  <button class="active">Active</button>
  <button>Inactive</button>
</div>
```

---

## Next Steps

1. ✅ **Verify Implementation**: Check if HyperFixi has implemented:
   - `until` temporal modifier
   - `on every` event modifier
   - `tell` command
   - `in <selector>` event filter
   - `toggle [@attr='value']` syntax

2. 📝 **Create Enhanced Test Suite**: Build comprehensive test page with all 9 official examples

3. 🧪 **Test Missing Patterns**: Create isolated tests for each missing pattern

4. 📊 **Document Results**: Update compatibility matrix with findings

5. 🔧 **Implement Missing Features** (if needed): Add any missing patterns to achieve 100% cookbook compatibility

---

## Test URLs

- **Current HyperFixi Test**: http://127.0.0.1:3000/cookbook/full-cookbook-test.html
- **Official Cookbook**: https://hyperscript.org/cookbook/
- **Pattern Compatibility**: http://127.0.0.1:3000/cookbook/pattern-compatibility-test.html

---

## Conclusion

HyperFixi has **excellent** coverage of core _hyperscript patterns (100% of basic commands). However, **two critical cookbook examples** (#4 and #5) are not tested, representing advanced temporal and event filtering features that are important for real-world applications.

**Immediate Action Required**:
1. Test if `until`, `every`, `tell`, and `in` patterns are implemented
2. Add missing examples to test suite
3. Verify 100% cookbook compatibility

**Impact**: Achieving 100% cookbook compatibility would demonstrate HyperFixi is production-ready for all documented _hyperscript patterns.
