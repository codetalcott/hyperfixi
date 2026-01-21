# Examples

Real-world HTML-first examples showcasing declarative LokaScript patterns.

> **For JavaScript API usage**, see the [API Reference](../../apps/docs-site/en/api/) documentation.

## Table of Contents

- [Basic DOM Manipulation](#basic-dom-manipulation)
- [Event Handling](#event-handling)
- [Form Processing](#form-processing)
- [Animation and Timing](#animation-and-timing)
- [Modal Dialogs](#modal-dialogs)
- [Dynamic Lists](#dynamic-lists)
- [Multi-Element Coordination](#multi-element-coordination)
- [Conditional Logic](#conditional-logic)
- [Fetch and AJAX](#fetch-and-ajax)
- [Common UI Patterns](#common-ui-patterns)
- [Multilingual Examples](#multilingual-examples)

## Basic DOM Manipulation

### Toggle Classes

Toggle a CSS class on click:

```html
<button _="on click toggle .active on me">Toggle Active</button>
```

**How it works:**

- `on click` - Listens for click events
- `toggle .active` - Toggles the "active" class
- `on me` - Targets the button itself

**See also:** [Live Demo](../../examples/basics/02-toggle-class.html)

**Variations:**

Target another element:

```html
<button _="on click toggle .visible on #panel">Show/Hide</button>
<div id="panel" class="visible">Content to toggle</div>
```

Toggle multiple classes:

```html
<button _="on click toggle .active then toggle .highlighted on me">Multi-Toggle</button>
```

Toggle class on multiple elements:

```html
<button _="on click toggle .selected on .card">Toggle All Cards</button>
<div class="card">Card 1</div>
<div class="card">Card 2</div>
<div class="card">Card 3</div>
```

### Add and Remove Classes

Add a class on hover:

```html
<div _="on mouseenter add .hover then on mouseleave remove .hover">Hover over me</div>
```

Add class to one element, remove from others:

```html
<button
  _="on click
     remove .active from .tab-button
     then add .active to me"
>
  Tab Button
</button>
```

### Show and Hide Elements

Show an element on click:

```html
<button _="on click show #panel">Show Panel</button>
<div id="panel" style="display: none;">Hidden content</div>
```

Toggle visibility:

```html
<button _="on click toggle .hidden on #content">Toggle Content</button>
<div id="content" class="hidden">Content that can be toggled</div>
```

**CSS for .hidden class:**

```css
.hidden {
  display: none;
}
```

Show one panel, hide others:

```html
<button _="on click hide .panel then show #panel1">Show Panel 1</button>
<button _="on click hide .panel then show #panel2">Show Panel 2</button>

<div id="panel1" class="panel">Panel 1 content</div>
<div id="panel2" class="panel" style="display: none;">Panel 2 content</div>
```

### Update Text Content

Put text into an element:

```html
<button _="on click put 'Button clicked!' into #output">Click me</button>
<div id="output">Output will appear here</div>
```

Update a counter:

```html
<button
  _="on click
     increment #count's textContent
     then put it into #count"
>
  Increment
</button>
<span id="count">0</span>
```

### Attribute Manipulation

Toggle an attribute:

```html
<button _="on click toggle [disabled] on #submit-btn">Toggle Submit Button</button>
<button id="submit-btn">Submit</button>
```

Set an attribute:

```html
<button _="on click set @aria-expanded to 'true' on #menu">Open Menu</button>
<div id="menu" aria-expanded="false">Menu items</div>
```

---

## Event Handling

### Event Modifiers

#### Once Modifier

Execute an event handler only once:

```html
<button _="on click.once add .clicked to me then put 'Clicked once!' into me">
  Click me (works only once)
</button>
```

#### Prevent Default

Prevent form submission:

```html
<form _="on submit.prevent log 'Form submission prevented'">
  <input type="text" name="username" />
  <button type="submit">Submit</button>
</form>
```

Prevent link navigation:

```html
<a href="/page" _="on click.prevent toggle .expanded on #details"> Toggle Details </a>
<div id="details" style="display: none;">Additional details</div>
```

#### Stop Propagation

Stop event bubbling:

```html
<div _="on click add .parent-clicked to me">
  Parent div
  <button _="on click.stop add .button-clicked to me">Click me (won't trigger parent)</button>
</div>
```

#### Debounce

Debounce input events (wait 300ms after typing stops):

```html
<input
  _="on input.debounce(300)
     put my value into #output"
  placeholder="Type something..."
/>
<div id="output">You typed:</div>
```

Search with debounce:

```html
<input
  _="on input.debounce(500)
     if my value's length > 2
       add .searching to me
       fetch `/api/search?q=${my value}` as json
       put result into #results
       remove .searching from me
     end"
  placeholder="Search..."
/>
<div id="results"></div>
```

#### Throttle

Throttle scroll events (max once per 100ms):

```html
<div
  _="on scroll.throttle(100)
     if my scrollTop > 100
       add .scrolled to <body/>
     else
       remove .scrolled from <body/>
     end"
  style="height: 2000px; overflow-y: scroll;"
>
  Scroll content
</div>
```

### Multiple Events

Handle multiple events:

```html
<input
  _="on focus add .focused to me
     on blur remove .focused from me
     on input put my value into #mirror"
/>
<div id="mirror"></div>
```

### Keyboard Events

Handle Enter key:

```html
<input
  _="on keydown[key is 'Enter']
     put my value into #output
     then put '' into me"
  placeholder="Press Enter to submit"
/>
<div id="output"></div>
```

Handle Escape key:

```html
<div
  id="modal"
  _="on keydown[key is 'Escape']
     hide me"
>
  <p>Press Escape to close</p>
</div>
```

Keyboard shortcuts:

```html
<body
  _="on keydown[key is 's' and ctrlKey]
          .prevent
          log 'Save shortcut triggered'"
>
  Press Ctrl+S to save
</body>
```

---

## Form Processing

### Input Mirroring

Mirror input value in real-time:

```html
<input _="on input put my value into #mirror" placeholder="Type something..." />
<div id="mirror">You typed:</div>
```

**See also:** [Live Demo](../../examples/basics/04-input-mirror.html)

### Form Validation

Validate email on blur:

```html
<input
  type="email"
  _="on blur
     if my value contains '@'
       add .valid to me
       remove .error from me
     else
       add .error to me
       remove .valid from me
     end"
/>

<style>
  .valid {
    border-color: green;
  }
  .error {
    border-color: red;
  }
</style>
```

**See also:** [Live Demo](../../examples/intermediate/01-form-validation.html)

Required field validation:

```html
<input
  required
  _="on blur
     if my value's length is 0
       add .error to me
       show #error-message
     else
       remove .error from me
       hide #error-message
     end"
/>
<span id="error-message" style="display: none; color: red;"> This field is required </span>
```

Password strength indicator:

```html
<input
  type="password"
  _="on input
     set :length to my value's length
     if :length < 6
       put 'Weak' into #strength
       set #strength's @class to 'weak'
     else if :length < 10
       put 'Medium' into #strength
       set #strength's @class to 'medium'
     else
       put 'Strong' into #strength
       set #strength's @class to 'strong'
     end"
/>
<div id="strength"></div>

<style>
  .weak {
    color: red;
  }
  .medium {
    color: orange;
  }
  .strong {
    color: green;
  }
</style>
```

### Form Submission

Prevent default and handle with hyperscript:

```html
<form
  _="on submit.prevent
     add .loading to #submit-btn
     put 'Submitting...' into #submit-btn
     wait 2s
     put 'Success!' into #result
     remove .loading from #submit-btn
     put 'Submit' into #submit-btn"
>
  <input name="username" required />
  <button id="submit-btn" type="submit">Submit</button>
</form>
<div id="result"></div>
```

Form with validation before submit:

```html
<form
  _="on submit.prevent
     if #email's value contains '@'
       add .valid to #email
       log 'Form is valid, submitting...'
     else
       add .error to #email
       put 'Invalid email' into #error-msg
     end"
>
  <input id="email" type="email" />
  <span id="error-msg" style="color: red;"></span>
  <button type="submit">Submit</button>
</form>
```

---

## Animation and Timing

### Wait Command

Delay before action:

```html
<button
  _="on click
     add .loading to me
     wait 2s
     remove .loading from me
     add .complete to me"
>
  Click to Load
</button>
```

### Fade Effects

Fade out and remove:

```html
<button
  _="on click
     add .fade-out to #notification
     wait 500ms
     remove #notification"
>
  Dismiss Notification
</button>
<div id="notification">This notification will fade out</div>

<style>
  .fade-out {
    opacity: 0;
    transition: opacity 500ms;
  }
</style>
```

**See also:** [Live Demo](../../examples/intermediate/03-fade-effects.html)

Fade in on page load:

```html
<div class="fade-in-element" _="on load wait 100ms then add .visible to me">
  Content that fades in
</div>

<style>
  .fade-in-element {
    opacity: 0;
    transition: opacity 500ms;
  }
  .fade-in-element.visible {
    opacity: 1;
  }
</style>
```

### Transition Effects

Slide in/out panel:

```html
<button _="on click toggle .slide-out on #panel">Toggle Panel</button>

<div id="panel" class="slide-panel">Panel content</div>

<style>
  .slide-panel {
    transform: translateX(0);
    transition: transform 300ms;
  }
  .slide-panel.slide-out {
    transform: translateX(-100%);
  }
</style>
```

### Settle Command

Wait for transitions to complete:

```html
<button
  _="on click
     add .fade-out to #element
     settle
     hide #element"
>
  Fade Out and Hide
</button>

<div id="element" style="transition: opacity 300ms;">
  This will fade out completely before hiding
</div>
```

---

## Modal Dialogs

### Simple Modal

Show/hide modal:

```html
<button _="on click show #modal then add .visible to #modal">Open Modal</button>

<div id="modal" style="display: none;">
  <div class="modal-content">
    <button _="on click hide #modal then remove .visible from #modal">Close</button>
    <p>Modal content here</p>
  </div>
</div>

<style>
  #modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .modal-content {
    background: white;
    padding: 20px;
    border-radius: 8px;
  }
</style>
```

**See also:** [Live Demo](../../examples/intermediate/05-modal.html)

### Modal with Escape Key

Close modal on Escape:

```html
<div id="modal" _="on keydown[key is 'Escape'] hide me" style="display: none;">
  <div class="modal-content">
    <p>Press Escape to close</p>
  </div>
</div>
```

### Native Dialog Element

Use HTML5 `<dialog>` element:

```html
<button _="on click call #myDialog.showModal()">Open Dialog</button>

<dialog id="myDialog" _="on click[target is me] call my close()">
  <div class="dialog-content">
    <p>Dialog content</p>
    <button _="on click call #myDialog.close()">Close</button>
  </div>
</dialog>

<style>
  dialog::backdrop {
    background: rgba(0, 0, 0, 0.5);
  }
</style>
```

**See also:** [Live Demo](../../examples/intermediate/06-native-dialog.html)

---

## Dynamic Lists

### Add Items

Add items to a list:

```html
<input id="item-input" placeholder="Enter item" />
<button
  _="on click
     set :value to #item-input's value
     if :value is not ''
       make <li/> called :li
       put :value into :li
       append :li to #list
       put '' into #item-input
     end"
>
  Add Item
</button>

<ul id="list"></ul>
```

### Remove Items

Remove items with delete button:

```html
<ul id="list">
  <li>
    Item 1
    <button _="on click remove closest <li/>">Delete</button>
  </li>
  <li>
    Item 2
    <button _="on click remove closest <li/>">Delete</button>
  </li>
</ul>
```

### Fade and Remove

Animate item removal:

```html
<ul id="list">
  <li>
    Item 1
    <button
      _="on click
         add .removing to closest <li/>
         wait 300ms
         remove closest <li/>"
    >
      Delete
    </button>
  </li>
</ul>

<style>
  li {
    transition: opacity 300ms;
  }
  li.removing {
    opacity: 0;
  }
</style>
```

---

## Multi-Element Coordination

### Tabs

Tab navigation pattern:

```html
<div class="tabs">
  <button
    class="tab-button active"
    _="on click
       remove .active from .tab-button
       then add .active to me
       then hide .tab-content
       then show #tab1"
  >
    Tab 1
  </button>
  <button
    class="tab-button"
    _="on click
       remove .active from .tab-button
       then add .active to me
       then hide .tab-content
       then show #tab2"
  >
    Tab 2
  </button>
  <button
    class="tab-button"
    _="on click
       remove .active from .tab-button
       then add .active to me
       then hide .tab-content
       then show #tab3"
  >
    Tab 3
  </button>
</div>

<div id="tab1" class="tab-content">Content for Tab 1</div>
<div id="tab2" class="tab-content" style="display: none;">Content for Tab 2</div>
<div id="tab3" class="tab-content" style="display: none;">Content for Tab 3</div>

<style>
  .tab-button.active {
    background: #007bff;
    color: white;
  }
</style>
```

**See also:** [Live Demo](../../examples/intermediate/04-tabs.html)

### Accordion

Accordion collapse/expand:

```html
<div class="accordion-item">
  <button
    class="accordion-header"
    _="on click
       toggle .open on closest .accordion-item"
  >
    Section 1
  </button>
  <div class="accordion-content">Content for section 1</div>
</div>

<div class="accordion-item">
  <button
    class="accordion-header"
    _="on click
       toggle .open on closest .accordion-item"
  >
    Section 2
  </button>
  <div class="accordion-content">Content for section 2</div>
</div>

<style>
  .accordion-content {
    display: none;
    padding: 10px;
  }
  .accordion-item.open .accordion-content {
    display: block;
  }
</style>
```

Single-open accordion (close others):

```html
<button
  class="accordion-header"
  _="on click
     remove .open from .accordion-item
     then add .open to closest .accordion-item"
>
  Section (closes others when opened)
</button>
```

---

## Conditional Logic

### If/Else

Simple conditional:

```html
<button
  _="on click
     if I match .active
       remove .active from me
       put 'Activate' into me
     else
       add .active to me
       put 'Deactivate' into me
     end"
>
  Activate
</button>
```

Check input length:

```html
<input
  _="on input
     if my value's length > 10
       put 'Too long!' into #feedback
     else if my value's length > 0
       put 'Good length' into #feedback
     else
       put 'Too short!' into #feedback
     end"
/>
<div id="feedback"></div>
```

### Unless

Execute unless condition is true:

```html
<button
  _="on click
     unless me has .disabled
       log 'Button clicked!'
     end"
>
  Click me
</button>
```

### Matching Selectors

Check if element matches selector:

```html
<button
  _="on click
     if #panel matches .hidden
       show #panel
       put 'Hide' into me
     else
       hide #panel
       put 'Show' into me
     end"
>
  Show
</button>
```

---

## Fetch and AJAX

### Basic Fetch

Load data from API:

```html
<button
  _="on click
     fetch /api/data as json
     put result.message into #output"
>
  Load Data
</button>
<div id="output"></div>
```

**See also:** [Live Demo](../../examples/intermediate/02-fetch-data.html)

### Fetch with Loading State

Show loading indicator:

```html
<button
  _="on click
     add .loading to me
     put 'Loading...' into me
     fetch /api/data as json
     put result.message into #output
     remove .loading from me
     put 'Load Data' into me"
>
  Load Data
</button>
<div id="output"></div>
```

### Fetch with Error Handling

Handle errors gracefully:

```html
<button
  _="on click
     add .loading to me
     try
       fetch /api/data as json
       put result.message into #output
       remove .loading from me
       add .success to #output
     catch error
       put 'Error loading data' into #output
       remove .loading from me
       add .error to #output
     end"
>
  Load Data
</button>
<div id="output"></div>
```

### POST Request

Submit data to API:

```html
<button
  _="on click
     set :data to { name: 'Alice', age: 30 }
     fetch /api/users with method: 'POST', body: :data
     put result.id into #user-id"
>
  Create User
</button>
<div id="user-id"></div>
```

### Fetch with Headers

Add custom headers:

```html
<button
  _="on click
     fetch /api/protected
       with headers: { 'Authorization': 'Bearer token123' }
       as json
     put result into #protected-data"
>
  Load Protected Data
</button>
<div id="protected-data"></div>
```

---

## Common UI Patterns

### Dropdown Menu

Toggle dropdown on click:

```html
<div class="dropdown">
  <button _="on click toggle .open on closest .dropdown">Menu ▼</button>
  <ul class="dropdown-menu">
    <li>Option 1</li>
    <li>Option 2</li>
    <li>Option 3</li>
  </ul>
</div>

<style>
  .dropdown-menu {
    display: none;
  }
  .dropdown.open .dropdown-menu {
    display: block;
  }
</style>
```

Close dropdown when clicking outside:

```html
<div
  class="dropdown"
  _="on click toggle .open on me
     on click from <body/>
       if target is not in me
         remove .open from me
       end"
>
  <button>Menu ▼</button>
  <ul class="dropdown-menu">
    <li>Option 1</li>
  </ul>
</div>
```

### Tooltip

Show tooltip on hover:

```html
<button
  _="on mouseenter show #tooltip then add .visible to #tooltip
     on mouseleave hide #tooltip then remove .visible from #tooltip"
>
  Hover for tooltip
</button>
<div id="tooltip" style="display: none;">This is a tooltip</div>

<style>
  #tooltip {
    position: absolute;
    background: #333;
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    opacity: 0;
    transition: opacity 200ms;
  }
  #tooltip.visible {
    opacity: 1;
  }
</style>
```

### Notification/Toast

Show and auto-dismiss notification:

```html
<button
  _="on click
     show #notification
     add .visible to #notification
     wait 3s
     remove .visible from #notification
     settle
     hide #notification"
>
  Show Notification
</button>

<div id="notification" style="display: none;">Operation successful!</div>

<style>
  #notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #28a745;
    color: white;
    padding: 15px;
    border-radius: 4px;
    opacity: 0;
    transition: opacity 300ms;
  }
  #notification.visible {
    opacity: 1;
  }
</style>
```

### Infinite Scroll

Load more content on scroll:

```html
<div
  id="content-container"
  _="on scroll
     if my scrollTop + my clientHeight >= my scrollHeight - 100
       unless I match .loading
         add .loading to me
         fetch /api/more-content as json
         append result.html to me
         remove .loading from me
       end
     end"
  style="height: 400px; overflow-y: scroll;"
>
  Initial content...
</div>
```

**See also:** [Live Demo](../../examples/advanced/04-infinite-scroll.html)

### Copy to Clipboard

Copy text to clipboard:

```html
<button
  _="on click
     set navigator.clipboard.text to 'Text to copy'
     put 'Copied!' into me
     wait 2s
     put 'Copy to Clipboard' into me"
>
  Copy to Clipboard
</button>
```

---

## Multilingual Examples

LokaScript supports writing hyperscript in 23 languages. Here are common patterns in different languages:

### Toggle Button

**English:**

```html
<button _="on click toggle .active on me">Toggle</button>
```

**Spanish:**

```html
<button _="en clic alternar .active en yo">Alternar</button>
```

**Japanese:**

```html
<button _="クリック で 切り替え .active を 私">切り替え</button>
```

**Arabic (RTL):**

```html
<button _="عند النقر بدّل .active على أنا">تبديل</button>
```

### Show/Hide Content

**English:**

```html
<button _="on click toggle .hidden on #panel">Toggle Panel</button>
<div id="panel">Content</div>
```

**Spanish:**

```html
<button _="en clic alternar .hidden en #panel">Alternar Panel</button>
<div id="panel">Contenido</div>
```

**Japanese:**

```html
<button _="#panel の .hidden を クリック で 切り替え">パネルを切り替え</button>
<div id="panel">コンテンツ</div>
```

**Korean:**

```html
<button _="클릭 시 #panel 의 .hidden 을 토글">패널 토글</button>
<div id="panel">내용</div>
```

### Fetch Data

**English:**

```html
<button _="on click fetch /api/data then put result into #output">Load Data</button>
```

**Spanish:**

```html
<button _="en clic traer /api/data entonces poner result en #output">Cargar Datos</button>
```

**French:**

```html
<button _="sur clic récupérer /api/data puis mettre result dans #output">Charger Données</button>
```

**German:**

```html
<button _="bei klick hole /api/data dann setze result in #output">Daten Laden</button>
```

### Form Validation

**English:**

```html
<input
  _="on blur
     if my value contains '@'
       add .valid to me
     else
       add .error to me
     end"
/>
```

**Spanish:**

```html
<input
  _="en desenfoque
     si mi value contiene '@'
       añadir .valid a yo
     sino
       añadir .error a yo
     fin"
/>
```

**Portuguese:**

```html
<input
  _="em blur
     se meu value contém '@'
       adicionar .valid a mim
     senão
       adicionar .error a mim
     fim"
/>
```

### Language Support

LokaScript supports these languages with full grammar transformation:

- **English** (en) - SVO
- **Spanish** (es) - SVO
- **Japanese** (ja) - SOV
- **Korean** (ko) - SOV
- **Arabic** (ar) - VSO
- **Chinese** (zh) - SVO
- **French** (fr) - SVO
- **German** (de) - SOV
- **Portuguese** (pt) - SVO
- **Turkish** (tr) - SOV
- **Indonesian** (id) - SVO
- **Swahili** (sw) - SVO
- **Quechua** (qu) - SOV

For complete multilingual documentation, see:

- [Multilingual Guide](../../apps/docs-site/en/guide/multilingual.md)
- [Grammar Transformation](../../apps/docs-site/en/guide/grammar.md)
- [Semantic Parser](../../apps/docs-site/en/guide/semantic-parser.md)

---

## Advanced Patterns

For more advanced patterns, see:

- [Advanced Examples](./ADVANCED.md) - Complex state machines, draggable elements, sortable lists
- [Cookbook](../../apps/docs-site/en/cookbook/) - Step-by-step recipes with explanations
- [Live Examples](../../examples/) - Interactive HTML examples you can try

---

## Need JavaScript API?

These examples focus on HTML-first declarative patterns using `_` attributes. If you need to use the JavaScript API programmatically (for framework integrations, build tools, or dynamic compilation), see:

- [API Reference](../../apps/docs-site/en/api/) - Complete JavaScript API documentation
- [hyperscript Object](../../apps/docs-site/en/api/hyperscript.md) - Main API methods
- [compile()](../../apps/docs-site/en/api/compile.md) - Compilation API
- [execute()](../../apps/docs-site/en/api/execute.md) - Execution API
