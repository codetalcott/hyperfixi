# HyperFixi Command Reference

> Auto-generated from command metadata
> Generated: 2025-12-05T04:07:58.067Z

## Table of Contents

- [Animation Commands](#animation-commands)
- [Asynchronous Commands](#async-commands)
- [Control Flow Commands](#control-flow-commands)
- [Data Commands](#data-commands)
- [DOM Manipulation Commands](#dom-commands)
- [Content Commands](#content-commands)
- [Navigation Commands](#navigation-commands)
- [Utility Commands](#utility-commands)
- [Advanced Commands](#advanced-commands)
- [Events Commands](#event-commands)
- [Execution Commands](#execution-commands)
- [Templates Commands](#templates-commands)
- [Behaviors Commands](#behaviors-commands)

## Quick Reference

| Command | Category | Description |
|---------|----------|-------------|
| `add` | dom | Add CSS classes to elements. |
| `append` | content | Add content to the end of a string, array, or HTML element. |
| `async` | advanced | Execute commands asynchronously without blocking. |
| `beep` | utility | Debug output for expressions with type information. |
| `bind` | data | Create two-way data binding between variables and DOM elements. |
| `break` | control-flow | Exit from the current loop (repeat, for, while, until). |
| `call` | execution | Evaluate an expression and store the result in the it variable. |
| `continue` | control-flow | Skip to the next iteration of the current loop. |
| `copy` | utility | Copy text or element content to the clipboard. |
| `decrement` | data | Decrement a variable or property by a specified amount (default: 1). |
| `default` | data | Set a value only if it doesn't already exist. |
| `exit` | control-flow | Immediately terminate execution of the current event handler or behavior. |
| `fetch` | async | Make HTTP requests with lifecycle event support. |
| `get` | data | Evaluate an expression and store the result in it. |
| `go` | navigation | Provides navigation functionality including URL navigation, element scrolling, and browser history management. |
| `halt` | control-flow | Stop command execution or prevent event defaults. |
| `hide` | dom | Hide elements by setting display to none. |
| `if` | control-flow | Conditional execution based on boolean expressions. |
| `increment` | data | Increment a variable or property by a specified amount (default: 1). |
| `install` | behaviors | Install a behavior on an element with optional parameters. |
| `js` | advanced | Execute inline JavaScript code with access to hyperscript context. |
| `log` | utility | Log values to the console. |
| `make` | dom | The make command can be used to create class instances or DOM elements. |
| `measure` | animation | Measure DOM element dimensions, positions, and properties. |
| `persist` | data | Save and restore values from browser storage with TTL support. |
| `pick` | utility | Select a random element from a collection. |
| `pseudo-command` | execution | Treat a method on an object as a top-level command. |
| `put` | dom | Insert content into elements or properties. |
| `remove` | dom | Remove CSS classes from elements. |
| `render` | templates | Render templates with @if, @else, and @repeat directives. |
| `repeat` | control-flow | Iteration in hyperscript - for-in, counted, conditional, event-driven, and infinite loops. |
| `return` | control-flow | Return a value from a command sequence or function, terminating execution. |
| `send` | event | Send custom events to elements with optional data. |
| `set` | data | Set values to variables, attributes, or properties. |
| `settle` | animation | Wait for CSS transitions and animations to complete. |
| `show` | dom | Show elements by restoring display property. |
| `take` | animation | Move classes, attributes, and properties from one element to another. |
| `tell` | utility | Execute commands in the context of target elements. |
| `throw` | control-flow | Throw an error with a specified message. |
| `toggle` | dom | Toggle classes, attributes, or interactive elements. |
| `transition` | animation | Animate CSS properties using CSS transitions. |
| `trigger` | event | Trigger events on elements using "trigger X on Y" syntax. |
| `unless` | control-flow | Execute commands only if condition is false (inverse of if). |
| `wait` | async | Wait for time delay, event, or race condition. |

## Animation Commands

### measure

Measure DOM element dimensions, positions, and properties

**Syntax:**

```hyperscript
measure
```
```hyperscript
measure <property>
```
```hyperscript
measure <target> <property>
```
```hyperscript
measure <property> and set <variable>
```

**Examples:**

```hyperscript
measure
```
```hyperscript
measure width
```
```hyperscript
measure #element height
```
```hyperscript
measure scrollTop and set scrollPosition
```
```hyperscript
measure x and set dragX
```

**Side Effects:** data-mutation

---

### settle

Wait for CSS transitions and animations to complete

**Syntax:**

```hyperscript
settle [<target>] [for <timeout>]
```

**Examples:**

```hyperscript
settle
```
```hyperscript
settle #animated-element
```
```hyperscript
settle for 3000
```

---

### take

Move classes, attributes, and properties from one element to another

**Syntax:**

```hyperscript
take <property> from <source>
```
```hyperscript
take <property> from <source> and put it on <target>
```

**Examples:**

```hyperscript
take class from <#source/> and put it on me
```
```hyperscript
take @data-value from <.source/> and put it on <#target/>
```
```hyperscript
take title from <#old-button/>
```
```hyperscript
take background-color from <.theme-source/>
```

**Side Effects:** dom-mutation, property-transfer

---

### transition

Animate CSS properties using CSS transitions

**Syntax:**

```hyperscript
transition <property> to <value> [over <duration>] [with <timing>]
```

**Examples:**

```hyperscript
transition opacity to 0.5
```
```hyperscript
transition left to 100px over 500ms
```
```hyperscript
transition background-color to red over 1s with ease-in-out
```

---

## Asynchronous Commands

### fetch

Make HTTP requests with lifecycle event support

**Syntax:**

```hyperscript
fetch <url>
```
```hyperscript
fetch <url> as <type>
```
```hyperscript
fetch <url> with <options>
```
```hyperscript
fetch <url> with <options> as <type>
```

**Examples:**

```hyperscript
fetch "/api/data"
```
```hyperscript
fetch "/api/users" as json
```
```hyperscript
fetch "/api/save" with method:"POST"
```
```hyperscript
fetch "/api/upload" with { method:"POST", body:formData }
```
```hyperscript
fetch "/partial.html" as html
```
```hyperscript
fetch "/slow" with timeout:5000
```

**Side Effects:** network, event-dispatching

---

### wait

Wait for time delay, event, or race condition

**Syntax:**

```hyperscript
wait <time>
```
```hyperscript
wait for <event>
```
```hyperscript
wait for <event> or <condition>
```

**Examples:**

```hyperscript
wait 2s
```
```hyperscript
wait 500ms
```
```hyperscript
wait for click
```
```hyperscript
wait for load
```
```hyperscript
wait for click or 1s
```
```hyperscript
wait for mousemove(clientX, clientY)
```
```hyperscript
wait for load from <iframe/>
```

**Side Effects:** time, event-listening

---

## Control Flow Commands

### break

Exit from the current loop (repeat, for, while, until)

**Syntax:**

```hyperscript
break
```

**Examples:**

```hyperscript
break
```
```hyperscript
if found then break
```
```hyperscript
unless isValid then break
```
```hyperscript
repeat for item in items { if item == target then break }
```

**Side Effects:** control-flow

---

### continue

Skip to the next iteration of the current loop

**Syntax:**

```hyperscript
continue
```

**Examples:**

```hyperscript
continue
```
```hyperscript
if item.isInvalid then continue
```
```hyperscript
unless item.isActive then continue
```
```hyperscript
repeat for item in items { if item.skip then continue; process item }
```

**Side Effects:** control-flow

---

### exit

Immediately terminate execution of the current event handler or behavior

**Syntax:**

```hyperscript
exit
```

**Examples:**

```hyperscript
exit
```
```hyperscript
if no draggedItem exit
```
```hyperscript
if condition is false exit
```
```hyperscript
on click if disabled exit
```

**Side Effects:** control-flow

---

### halt

Stop command execution or prevent event defaults

**Syntax:**

```hyperscript
halt
```
```hyperscript
halt the event
```

**Examples:**

```hyperscript
halt
```
```hyperscript
halt the event
```
```hyperscript
if error then halt
```
```hyperscript
unless user.isValid then halt
```
```hyperscript
on click halt the event then log "clicked"
```

**Side Effects:** control-flow, event-prevention

---

### if

Conditional execution based on boolean expressions

**Syntax:**

```hyperscript
if <condition> then <commands>
```
```hyperscript
if <condition> then <commands> else <commands>
```

**Examples:**

```hyperscript
if x > 5 then add .active
```
```hyperscript
if user.isAdmin then show #adminPanel else hide #adminPanel
```
```hyperscript
if localStorage.getItem("theme") == "dark" then add .dark-mode
```
```hyperscript
if form.checkValidity() then submit else show .error
```

**Side Effects:** conditional-execution

---

### repeat

Iteration in hyperscript - for-in, counted, conditional, event-driven, and infinite loops

**Syntax:**

```hyperscript
repeat for <var> in <collection> [index <indexVar>] { <commands> }
```
```hyperscript
repeat <count> times [index <indexVar>] { <commands> }
```
```hyperscript
repeat while <condition> [index <indexVar>] { <commands> }
```
```hyperscript
repeat until <condition> [index <indexVar>] { <commands> }
```
```hyperscript
repeat until <event> [from <target>] [index <indexVar>] { <commands> }
```
```hyperscript
repeat forever [index <indexVar>] { <commands> }
```

**Examples:**

```hyperscript
repeat for item in items { log item }
```
```hyperscript
repeat 5 times { log "hello" }
```
```hyperscript
repeat while count < 10 { increment count }
```
```hyperscript
repeat until done { checkStatus }
```
```hyperscript
repeat until click from #button { animate }
```
```hyperscript
repeat forever { monitor }
```

**Side Effects:** iteration, conditional-execution

---

### return

Return a value from a command sequence or function, terminating execution

**Syntax:**

```hyperscript
return
```
```hyperscript
return <value>
```

**Examples:**

```hyperscript
return
```
```hyperscript
return 42
```
```hyperscript
return user.name
```
```hyperscript
return "success"
```
```hyperscript
if found then return result else return null
```

**Side Effects:** control-flow, context-mutation

---

### throw

Throw an error with a specified message

**Syntax:**

```hyperscript
throw <message>
```

**Examples:**

```hyperscript
throw "Invalid input"
```
```hyperscript
throw new Error("Custom error")
```
```hyperscript
if not valid then throw "Validation failed"
```

**Side Effects:** error-throwing, execution-termination

---

### unless

Execute commands only if condition is false (inverse of if)

**Syntax:**

```hyperscript
unless <condition> <command> [<command> ...]
```

**Examples:**

```hyperscript
unless user.isLoggedIn showLoginForm
```
```hyperscript
unless data.isValid clearForm showError
```
```hyperscript
unless element.isVisible fadeIn
```
```hyperscript
unless count > 10 increment
```

**Side Effects:** conditional-execution

---

## Data Commands

### bind

Create two-way data binding between variables and DOM elements

**Syntax:**

```hyperscript
bind :variable to <element>.<property>
```
```hyperscript
bind :variable from <element>.<property>
```
```hyperscript
bind :variable to <element>.<property> bidirectional
```

**Examples:**

```hyperscript
bind :username to my.value
```
```hyperscript
bind :count from #display.textContent
```
```hyperscript
bind :message to #input.value bidirectional
```
```hyperscript
bind :checked to #checkbox.checked
```
```hyperscript
bind :theme from @data-theme
```

**Side Effects:** data-binding, event-listeners, dom-observation

---

### decrement

Decrement a variable or property by a specified amount (default: 1)

**Syntax:**

```hyperscript
decrement <target> [by <number>]
```

**Examples:**

```hyperscript
decrement counter
```
```hyperscript
decrement counter by 5
```
```hyperscript
decrement me.scrollTop by 100
```

---

### default

Set a value only if it doesn't already exist

**Syntax:**

```hyperscript
default <expression> to <expression>
```

**Examples:**

```hyperscript
default myVar to "fallback"
```
```hyperscript
default @data-theme to "light"
```
```hyperscript
default my innerHTML to "No content"
```
```hyperscript
default count to 0
```

**Side Effects:** data-mutation, dom-mutation

---

### get

Evaluate an expression and store the result in it

**Syntax:**

```hyperscript
get <expression>
```

**Examples:**

```hyperscript
get #my-dialog
```
```hyperscript
get <button/>
```
```hyperscript
get me.parentElement
```
```hyperscript
get #count then set x to it.textContent
```

**Side Effects:** context-mutation

---

### increment

Increment a variable or property by a specified amount (default: 1)

**Syntax:**

```hyperscript
increment <target> [by <number>]
```

**Examples:**

```hyperscript
increment counter
```
```hyperscript
increment counter by 5
```
```hyperscript
increment me.scrollTop by 100
```

---

### persist

Save and restore values from browser storage with TTL support

**Syntax:**

```hyperscript
persist <value> to <storage> as <key>
```
```hyperscript
persist <value> to <storage> as <key> with ttl <ms>
```
```hyperscript
restore <key> from <storage>
```
```hyperscript
remove <key> from <storage>
```

**Examples:**

```hyperscript
persist myValue to local as "username"
```
```hyperscript
persist formData to session as "draft"
```
```hyperscript
persist data to local as "cache" with ttl 3600000
```
```hyperscript
restore "username" from local
```
```hyperscript
remove "cache" from local
```

**Side Effects:** storage, data-mutation

---

### set

Set values to variables, attributes, or properties

**Syntax:**

```hyperscript
set <target> to <value>
```

**Examples:**

```hyperscript
set myVar to "value"
```
```hyperscript
set @data-theme to "dark"
```
```hyperscript
set my innerHTML to "content"
```
```hyperscript
set its textContent to "text"
```

**Side Effects:** state-mutation, dom-mutation

---

## DOM Manipulation Commands

### add

Add CSS classes to elements

**Syntax:**

```hyperscript
add <classes> [to <target>]
```

**Examples:**

```hyperscript
add .active to me
```
```hyperscript
add "active selected" to <button/>
```
```hyperscript
add .highlighted to #modal
```

**Side Effects:** dom-mutation

---

### hide

Hide elements by setting display to none

**Syntax:**

```hyperscript
hide [<target>]
```

**Examples:**

```hyperscript
hide me
```
```hyperscript
hide #modal
```
```hyperscript
hide .warnings
```
```hyperscript
hide <button/>
```

**Side Effects:** dom-mutation

---

### make

The make command can be used to create class instances or DOM elements. In the first form: make a URL from "/path/", "https://origin.example.com" is equal to the JavaScript new URL("/path/", "https://origin.example.com"). In the second form: make an <a.navlink/> will create an <a> element and add the class "navlink" to it.

**Syntax:**

```hyperscript
make (a|an) <expression> [from <arg-list>] [called <identifier>]
```

**Examples:**

```hyperscript
make a URL from "/path/", "https://origin.example.com"
```
```hyperscript
make an <a.navlink/> called linkElement
```
```hyperscript
make a Date from "2023-01-01"
```
```hyperscript
make an <div#content.container/>
```
```hyperscript
make a Map called myMap
```

---

### put

Insert content into elements or properties

**Syntax:**

```hyperscript
put <value> into <target>
```
```hyperscript
put <value> before <target>
```
```hyperscript
put <value> after <target>
```
```hyperscript
put <value> at start of <target>
```
```hyperscript
put <value> at end of <target>
```

**Examples:**

```hyperscript
put "Hello World" into me
```
```hyperscript
put <div>Content</div> before #target
```
```hyperscript
put "text" at end of #container
```
```hyperscript
put value into #elem's innerHTML
```
```hyperscript
put 42 into obj's dataset.count
```

**Side Effects:** dom-mutation

---

### remove

Remove CSS classes from elements

**Syntax:**

```hyperscript
remove <classes> [from <target>]
```

**Examples:**

```hyperscript
remove .active from me
```
```hyperscript
remove "active selected" from <button/>
```
```hyperscript
remove .highlighted from #modal
```

**Side Effects:** dom-mutation

---

### show

Show elements by restoring display property

**Syntax:**

```hyperscript
show [<target>]
```

**Examples:**

```hyperscript
show me
```
```hyperscript
show #modal
```
```hyperscript
show .hidden
```
```hyperscript
show <button/>
```

**Side Effects:** dom-mutation

---

### toggle

Toggle classes, attributes, or interactive elements

**Syntax:**

```hyperscript
toggle <class-expression> [on <target>]
```
```hyperscript
toggle @attribute [on <target>]
```
```hyperscript
toggle <element-selector> [as modal]
```
```hyperscript
toggle <expression> for <duration>
```
```hyperscript
toggle <expression> until <event>
```

**Examples:**

```hyperscript
toggle .active on me
```
```hyperscript
toggle @disabled
```
```hyperscript
toggle [@disabled="true"]
```
```hyperscript
toggle "loading spinner"
```
```hyperscript
toggle #myDialog
```
```hyperscript
toggle #confirmDialog as modal
```
```hyperscript
toggle #faqSection
```
```hyperscript
toggle .loading for 2s
```
```hyperscript
toggle .active until click
```

**Side Effects:** dom-mutation

---

## Content Commands

### append

Add content to the end of a string, array, or HTML element

**Syntax:**

```hyperscript
append <content>
```
```hyperscript
append <content> to <target>
```

**Examples:**

```hyperscript
append "Hello"
```
```hyperscript
append "World" to greeting
```
```hyperscript
append item to myArray
```
```hyperscript
append "<p>New paragraph</p>" to #content
```
```hyperscript
append text to me
```

**Side Effects:** data-mutation, dom-mutation

---

## Navigation Commands

### go

Provides navigation functionality including URL navigation, element scrolling, and browser history management

**Syntax:**

```hyperscript
go [to] url <url> [in new window] | go [to] [position] [of] <target> [offset] [behavior] | go back
```

**Examples:**

```hyperscript
go to url "https://example.com"
```
```hyperscript
go back
```
```hyperscript
go to top of <#header/>
```
```hyperscript
go to url "https://example.com" in new window
```
```hyperscript
go to middle of <.content/>
```
```hyperscript
go to bottom of <#footer/> +100px smoothly
```

---

## Utility Commands

### beep

Debug output for expressions with type information

**Syntax:**

```hyperscript
beep!
```
```hyperscript
beep! <expression>
```
```hyperscript
beep! <expression>, <expression>, ...
```

**Examples:**

```hyperscript
beep!
```
```hyperscript
beep! myValue
```
```hyperscript
beep! me.id, me.className
```
```hyperscript
beep! user.name, user.age
```

**Side Effects:** console-output, debugging

---

### copy

Copy text or element content to the clipboard

**Syntax:**

```hyperscript
copy <source>
```
```hyperscript
copy <source> to clipboard
```

**Examples:**

```hyperscript
copy "Hello World"
```
```hyperscript
copy #code-snippet
```
```hyperscript
copy my textContent
```
```hyperscript
copy <div/> to clipboard
```

**Side Effects:** clipboard-write, custom-events

---

### log

Log values to the console

**Syntax:**

```hyperscript
log [<values...>]
```

**Examples:**

```hyperscript
log "Hello World"
```
```hyperscript
log me.value
```
```hyperscript
log x y z
```
```hyperscript
log "Result:" result
```

**Side Effects:** console-output

---

### pick

Select a random element from a collection

**Syntax:**

```hyperscript
pick <item1>, <item2>, ...
```
```hyperscript
pick from <array>
```

**Examples:**

```hyperscript
pick "red", "green", "blue"
```
```hyperscript
pick from colors
```
```hyperscript
pick 1, 2, 3, 4, 5
```
```hyperscript
pick from document.querySelectorAll(".option")
```

**Side Effects:** random-selection

---

### tell

Execute commands in the context of target elements

**Syntax:**

```hyperscript
tell <target> <command> [<command> ...]
```

**Examples:**

```hyperscript
tell #sidebar hide
```
```hyperscript
tell .buttons add .disabled
```
```hyperscript
tell closest <form/> submit
```
```hyperscript
tell children <input/> set value to ""
```

**Side Effects:** context-switching, command-execution

---

## Advanced Commands

### async

Execute commands asynchronously without blocking

**Syntax:**

```hyperscript
async <command> [<command> ...]
```

**Examples:**

```hyperscript
async command1 command2
```
```hyperscript
async fetchData processData
```
```hyperscript
async animateIn showContent
```
```hyperscript
async loadImage fadeIn
```

**Side Effects:** async-execution

---

### js

Execute inline JavaScript code with access to hyperscript context

**Syntax:**

```hyperscript
js <code> end
```
```hyperscript
js(param1, param2) <code> end
```

**Examples:**

```hyperscript
js console.log("Hello") end
```
```hyperscript
js(x, y) return x + y end
```
```hyperscript
js me.style.color = "red" end
```
```hyperscript
js(element) element.classList.add("active") end
```

**Side Effects:** code-execution, data-mutation

---

## Events Commands

### send

Send custom events to elements with optional data

**Syntax:**

```hyperscript
send <event> to <target>
```
```hyperscript
send <event>(<detail>) to <target>
```
```hyperscript
send <event> to <target> with <options>
```
```hyperscript
trigger <event> on <target>
```

**Examples:**

```hyperscript
send customEvent to me
```
```hyperscript
send click to #button
```
```hyperscript
send dataEvent(foo: "bar", count: 42) to #target
```
```hyperscript
send myEvent to window
```
```hyperscript
send event to #target with bubbles
```
```hyperscript
trigger loaded on document
```

**Side Effects:** event-dispatch

---

### trigger

Trigger events on elements using "trigger X on Y" syntax

**Syntax:**

```hyperscript
trigger <event> on <target>
```
```hyperscript
trigger <event>(<detail>) on <target>
```
```hyperscript
trigger <event> on <target> with <options>
```

**Examples:**

```hyperscript
trigger click on #button
```
```hyperscript
trigger customEvent on me
```
```hyperscript
trigger dataEvent(foo: "bar", count: 42) on #target
```
```hyperscript
trigger globalEvent on window
```
```hyperscript
trigger event on #target with bubbles
```
```hyperscript
trigger docEvent on document
```

**Side Effects:** event-dispatch

---

## Execution Commands

### call

Evaluate an expression and store the result in the it variable

**Syntax:**

```hyperscript
call <expression>
```
```hyperscript
get <expression>
```

**Examples:**

```hyperscript
call myFunction()
```
```hyperscript
get user.name
```
```hyperscript
call fetch("/api/data")
```
```hyperscript
get Math.random()
```
```hyperscript
call new Date().toISOString()
```
```hyperscript
get localStorage.getItem("key")
```

**Side Effects:** function-execution, context-mutation

---

### pseudo-command

Treat a method on an object as a top-level command

**Syntax:**

```hyperscript
<method>(<args>) [(to|on|with|into|from|at)] <expression>
```

**Examples:**

```hyperscript
getElementById("d1") from the document
```
```hyperscript
reload() the location of the window
```
```hyperscript
setAttribute("foo", "bar") on me
```
```hyperscript
foo() on me
```

**Side Effects:** method-execution

---

## Templates Commands

### render

Render templates with @if, @else, and @repeat directives

**Syntax:**

```hyperscript
render <template>
```
```hyperscript
render <template> with <variables>
```
```hyperscript
render <template> with (key: value, ...)
```

**Examples:**

```hyperscript
render myTemplate
```
```hyperscript
render myTemplate with (name: "Alice")
```
```hyperscript
render "<template>Hello ${name}!</template>" with (name: "World")
```
```hyperscript
render template with (items: data)
```

**Side Effects:** dom-creation, template-execution

---

## Behaviors Commands

### install

Install a behavior on an element with optional parameters

**Syntax:**

```hyperscript
install <BehaviorName>
```
```hyperscript
install <BehaviorName> on <element>
```
```hyperscript
install <BehaviorName>(param: value)
```
```hyperscript
install <BehaviorName>(param: value) on <element>
```

**Examples:**

```hyperscript
install Removable
```
```hyperscript
install Draggable on #box
```
```hyperscript
install Tooltip(text: "Help", position: "top")
```
```hyperscript
install Sortable(axis: "y") on .list
```
```hyperscript
install MyBehavior(foo: 42) on the first <div/>
```

**Side Effects:** behavior-installation, element-modification

---

## Side Effects Reference

Commands may produce the following side effects:

| Effect | Description |
|--------|-------------|
| `dom-mutation` | Modifies DOM elements (add/remove classes, attributes, etc.) |
| `dom-query` | Queries or selects DOM elements |
| `dom-creation` | Creates new DOM elements |
| `dom-observation` | Observes DOM changes (MutationObserver) |
| `element-modification` | Modifies element properties |
| `context-modification` | Modifies execution context variables |
| `context-switching` | Changes the current context (me, you, it) |
| `context-mutation` | Mutates context state |
| `state-mutation` | Mutates application state |
| `conditional-execution` | Conditionally executes code branches |
| `iteration` | Iterates over collections or repeats actions |
| `control-flow` | Affects control flow (break, continue, return) |
| `execution-termination` | Terminates script execution |
| `time` | Delays or schedules execution |
| `event-listening` | Adds event listeners |
| `event-dispatch` | Dispatches events |
| `event-dispatching` | Dispatches custom events |
| `event-prevention` | Prevents default event behavior |
| `event-listeners` | Manages event listeners |
| `custom-events` | Creates custom events |
| `command-execution` | Executes other commands |
| `code-execution` | Executes arbitrary code |
| `function-execution` | Executes functions |
| `method-execution` | Executes object methods |
| `async-execution` | Executes asynchronously |
| `data-mutation` | Mutates data structures |
| `data-binding` | Creates data bindings |
| `property-transfer` | Transfers properties between elements |
| `network` | Makes network requests |
| `storage` | Accesses browser storage |
| `navigation` | Navigates to URLs |
| `clipboard` | Accesses clipboard |
| `clipboard-write` | Writes to clipboard |
| `console` | Writes to console |
| `console-output` | Outputs to console |
| `animation` | Creates animations or transitions |
| `focus` | Changes element focus |
| `scroll` | Scrolls elements or viewport |
| `template-execution` | Executes template logic |
| `behavior-installation` | Installs behaviors on elements |
| `random-selection` | Makes random selections |
| `debugging` | Assists with debugging |
| `error-throwing` | Throws errors |
