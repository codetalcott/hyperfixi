# HyperFixi Command Reference

> Auto-generated from command metadata
> Generated: 2026-07-28T15:21:42.542Z

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

| Command          | Category     | Description                                                                                |
| ---------------- | ------------ | ------------------------------------------------------------------------------------------ |
| `add`            | dom          | Add CSS classes, attributes, or styles to elements.                                        |
| `append`         | content      | Add content to the end of a string, array, Set, or HTML element.                           |
| `async`          | advanced     | Execute commands asynchronously without blocking.                                          |
| `beep`           | utility      | Debug output for expressions with type information.                                        |
| `break`          | control-flow | Exit from the current loop (repeat, for, while, until).                                    |
| `call`           | execution    | Evaluate an expression and store the result in the it variable.                            |
| `continue`       | control-flow | Skip to the next iteration of the current loop.                                            |
| `copy`           | utility      | Copy text or element content to the clipboard.                                             |
| `decrement`      | data         | Modify a variable or property by a specified amount (default: 1).                          |
| `default`        | data         | Set a value only if it doesn't already exist.                                              |
| `exit`           | control-flow | Immediately terminate execution of the current event handler or behavior.                  |
| `fetch`          | async        | Make HTTP requests with lifecycle event support.                                           |
| `get`            | data         | Evaluate an expression and store the result in it.                                         |
| `go`             | navigation   | Navigation functionality including URL navigation, element scrolling, and browser history. |
| `halt`           | control-flow | Stop command execution or prevent event defaults.                                          |
| `hide`           | dom          | Hide elements by setting display to none.                                                  |
| `if`             | control-flow | Conditional execution based on boolean expressions.                                        |
| `increment`      | data         | Modify a variable or property by a specified amount (default: 1).                          |
| `install`        | behaviors    | Install a behavior on an element with optional parameters.                                 |
| `js`             | advanced     | Execute inline JavaScript code with access to hyperscript context.                         |
| `log`            | utility      | Log values to the console.                                                                 |
| `make`           | dom          | Create DOM elements or class instances.                                                    |
| `measure`        | animation    | Measure DOM element dimensions, positions, and properties.                                 |
| `pick`           | utility      | Select from a collection (first/last/random/range/regex match).                            |
| `prepend`        | content      | Add content to the start of a string, array, Set, or HTML element.                         |
| `pseudo-command` | execution    | Treat a method on an object as a top-level command.                                        |
| `put`            | dom          | Insert content into elements or properties.                                                |
| `remove`         | dom          | Remove CSS classes, attributes, styles, or elements from the DOM.                          |
| `render`         | templates    | Render templates with @if, @else, and @repeat directives.                                  |
| `repeat`         | control-flow | Iteration in hyperscript - for-in, counted, conditional, event-driven, and infinite loops. |
| `return`         | control-flow | Return a value from a command sequence or function, terminating execution.                 |
| `send`           | event        | Dispatch events on elements.                                                               |
| `set`            | data         | Set values to variables, attributes, or properties.                                        |
| `settle`         | animation    | Wait for CSS transitions and animations to complete.                                       |
| `show`           | dom          | Show elements by restoring display property.                                               |
| `take`           | animation    | Move classes, attributes, and properties from one element to another.                      |
| `tell`           | utility      | Execute commands in the context of target elements.                                        |
| `throw`          | control-flow | Throw an error with a specified message.                                                   |
| `toggle`         | dom          | Toggle classes, attributes, or interactive elements.                                       |
| `transition`     | animation    | Animate CSS properties using CSS transitions.                                              |
| `trigger`        | event        | Dispatch events on elements.                                                               |
| `unless`         | control-flow | Conditional execution based on boolean expressions.                                        |
| `wait`           | async        | Wait for time delay, event, or race condition.                                             |

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

**Side Effects:** timing

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
take class from <#source/>
```

```hyperscript
take @data-value from <.source/> and put it on <#target/>
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

**Side Effects:** style-change, timing

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

**Examples:**

```hyperscript
fetch "/api/data"
```

```hyperscript
fetch "/api/users" as json
```

```hyperscript
fetch "/api/save" with { method:"POST" }
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
wait for click
```

```hyperscript
wait for click or 1s
```

```hyperscript
wait for mousemove(clientX, clientY)
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

```hyperscript
unless <condition> <commands>
```

**Examples:**

```hyperscript
if x > 5 then add .active
```

```hyperscript
if user.isAdmin then show #adminPanel else hide #adminPanel
```

```hyperscript
unless user.isLoggedIn showLoginForm
```

**Side Effects:** conditional-execution

---

### repeat

Iteration in hyperscript - for-in, counted, conditional, event-driven, and infinite loops

**Syntax:**

```hyperscript
repeat for <var> in <collection> { <commands> }
```

```hyperscript
repeat <count> times { <commands> }
```

```hyperscript
repeat while <condition> { <commands> }
```

```hyperscript
repeat until <condition> { <commands> }
```

```hyperscript
repeat forever { <commands> }
```

**Examples:**

```hyperscript
repeat for item in items { log item }
```

```hyperscript
repeat 5 times { log "hello" }
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
if found then return result
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
if not valid then throw "Validation failed"
```

**Side Effects:** error-throwing, execution-termination

---

### unless

Conditional execution based on boolean expressions

**Syntax:**

```hyperscript
if <condition> then <commands>
```

```hyperscript
if <condition> then <commands> else <commands>
```

```hyperscript
unless <condition> <commands>
```

**Examples:**

```hyperscript
if x > 5 then add .active
```

```hyperscript
if user.isAdmin then show #adminPanel else hide #adminPanel
```

```hyperscript
unless user.isLoggedIn showLoginForm
```

**Side Effects:** conditional-execution

---

## Data Commands

### decrement

Modify a variable or property by a specified amount (default: 1)

**Syntax:**

```hyperscript
increment <target> [by <number>]
```

```hyperscript
decrement <target> [by <number>]
```

**Examples:**

```hyperscript
increment counter
```

```hyperscript
increment counter by 5
```

```hyperscript
decrement counter
```

```hyperscript
decrement counter by 5
```

**Side Effects:** data-mutation, context-modification

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

**Side Effects:** context-mutation

---

### increment

Modify a variable or property by a specified amount (default: 1)

**Syntax:**

```hyperscript
increment <target> [by <number>]
```

```hyperscript
decrement <target> [by <number>]
```

**Examples:**

```hyperscript
increment counter
```

```hyperscript
increment counter by 5
```

```hyperscript
decrement counter
```

```hyperscript
decrement counter by 5
```

**Side Effects:** data-mutation, context-modification

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

**Side Effects:** state-mutation, dom-mutation

---

## DOM Manipulation Commands

### add

Add CSS classes, attributes, or styles to elements

**Syntax:**

```hyperscript
add <classes|@attr|{styles}> [to <target>]
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

```hyperscript
add [@data-test="value"] to #element
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

Create DOM elements or class instances

**Syntax:**

```hyperscript
make a <tag#id.class1.class2/>
```

```hyperscript
make a <ClassName> from <args> called <identifier>
```

**Examples:**

```hyperscript
make an <a.navlink/> called linkElement
```

```hyperscript
make a URL from "/path/", "https://origin.example.com"
```

**Side Effects:** dom-creation, data-mutation

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

**Examples:**

```hyperscript
put "Hello World" into me
```

```hyperscript
put <div>Content</div> before #target
```

```hyperscript
put value into #elem's innerHTML
```

**Side Effects:** dom-mutation

---

### remove

Remove CSS classes, attributes, styles, or elements from the DOM

**Syntax:**

```hyperscript
remove <classes|@attr|*prop|element> [from <target>]
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

```hyperscript
remove me
```

```hyperscript
remove closest .item
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
toggle <class> [on <target>]
```

```hyperscript
toggle @attr
```

```hyperscript
toggle <element> [as modal]
```

```hyperscript
toggle <expr> for <duration>
```

**Examples:**

```hyperscript
toggle .active on me
```

```hyperscript
toggle @disabled
```

```hyperscript
toggle #myDialog as modal
```

```hyperscript
toggle .loading for 2s
```

**Side Effects:** dom-mutation

---

## Content Commands

### append

Add content to the end of a string, array, Set, or HTML element

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
append "<p>New</p>" to #content
```

```hyperscript
append " (edited)" to #title's textContent
```

**Side Effects:** data-mutation, dom-mutation

---

### prepend

Add content to the start of a string, array, Set, or HTML element

**Syntax:**

```hyperscript
prepend <content>
```

```hyperscript
prepend <content> to <target>
```

**Examples:**

```hyperscript
prepend "Hello"
```

```hyperscript
prepend "World" to greeting
```

```hyperscript
prepend item to myArray
```

```hyperscript
prepend "<p>First</p>" to #content
```

**Side Effects:** data-mutation, dom-mutation

---

## Navigation Commands

### go

Navigation functionality including URL navigation, element scrolling, and browser history

**Syntax:**

```hyperscript
go back
```

```hyperscript
go to url <url> [in new window]
```

```hyperscript
go to [position] [of] <element>
```

**Examples:**

```hyperscript
go back
```

```hyperscript
go to url "https://example.com"
```

```hyperscript
go to top of #header
```

**Side Effects:** navigation, scrolling

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

Select from a collection (first/last/random/range/regex match)

**Syntax:**

```hyperscript
pick first <count> of <expr>
```

```hyperscript
pick last <count> of <expr>
```

```hyperscript
pick random [<count>] of <expr>
```

```hyperscript
pick items <i> to <j> of <expr>
```

```hyperscript
pick match of <regex> from <expr>
```

```hyperscript
pick from <array>
```

```hyperscript
pick <item1>, <item2>, ...
```

**Examples:**

```hyperscript
pick first 3 of items
```

```hyperscript
pick last 2 of items
```

```hyperscript
pick random 2 of items
```

```hyperscript
pick items 1 to 3 of items
```

```hyperscript
pick match of "[0-9]+" from text
```

```hyperscript
pick from colors
```

```hyperscript
pick "red", "green", "blue"
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

**Side Effects:** code-execution, data-mutation

---

## Events Commands

### send

Dispatch events on elements

**Syntax:**

```hyperscript
trigger <event> on <target>
```

```hyperscript
trigger <event>(<detail>) on <target>
```

```hyperscript
send <event> to <target>
```

```hyperscript
send <event>(<detail>) to <target>
```

**Examples:**

```hyperscript
trigger click on #button
```

```hyperscript
trigger customEvent on me
```

```hyperscript
send dataEvent to #target
```

```hyperscript
send myEvent(count: 42) to me
```

**Side Effects:** event-dispatch

---

### trigger

Dispatch events on elements

**Syntax:**

```hyperscript
trigger <event> on <target>
```

```hyperscript
trigger <event>(<detail>) on <target>
```

```hyperscript
send <event> to <target>
```

```hyperscript
send <event>(<detail>) to <target>
```

**Examples:**

```hyperscript
trigger click on #button
```

```hyperscript
trigger customEvent on me
```

```hyperscript
send dataEvent to #target
```

```hyperscript
send myEvent(count: 42) to me
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

**Examples:**

```hyperscript
call myFunction()
```

```hyperscript
call fetch("/api/data")
```

```hyperscript
call element.focus()
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

| Effect                  | Description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| `dom-mutation`          | Modifies DOM elements (add/remove classes, attributes, etc.) |
| `dom-query`             | Queries or selects DOM elements                              |
| `dom-creation`          | Creates new DOM elements                                     |
| `dom-observation`       | Observes DOM changes (MutationObserver)                      |
| `element-modification`  | Modifies element properties                                  |
| `context-modification`  | Modifies execution context variables                         |
| `context-switching`     | Changes the current context (me, you, it)                    |
| `context-mutation`      | Mutates context state                                        |
| `state-mutation`        | Mutates application state                                    |
| `conditional-execution` | Conditionally executes code branches                         |
| `iteration`             | Iterates over collections or repeats actions                 |
| `control-flow`          | Affects control flow (break, continue, return)               |
| `execution-termination` | Terminates script execution                                  |
| `time`                  | Delays or schedules execution                                |
| `timing`                | No description available                                     |
| `style-change`          | No description available                                     |
| `event-listening`       | Adds event listeners                                         |
| `event-dispatch`        | Dispatches events                                            |
| `event-dispatching`     | Dispatches custom events                                     |
| `event-prevention`      | Prevents default event behavior                              |
| `event-listeners`       | Manages event listeners                                      |
| `custom-events`         | Creates custom events                                        |
| `command-execution`     | Executes other commands                                      |
| `code-execution`        | Executes arbitrary code                                      |
| `function-execution`    | Executes functions                                           |
| `method-execution`      | Executes object methods                                      |
| `async-execution`       | Executes asynchronously                                      |
| `data-mutation`         | Mutates data structures                                      |
| `data-binding`          | Creates data bindings                                        |
| `property-transfer`     | Transfers properties between elements                        |
| `network`               | Makes network requests                                       |
| `storage`               | Accesses browser storage                                     |
| `navigation`            | Navigates to URLs                                            |
| `clipboard`             | Accesses clipboard                                           |
| `clipboard-write`       | Writes to clipboard                                          |
| `console`               | Writes to console                                            |
| `console-output`        | Outputs to console                                           |
| `animation`             | Creates animations or transitions                            |
| `focus`                 | Changes element focus                                        |
| `scroll`                | Scrolls elements or viewport                                 |
| `scrolling`             | No description available                                     |
| `template-execution`    | Executes template logic                                      |
| `behavior-installation` | Installs behaviors on elements                               |
| `random-selection`      | Makes random selections                                      |
| `debugging`             | Assists with debugging                                       |
| `error-throwing`        | Throws errors                                                |
