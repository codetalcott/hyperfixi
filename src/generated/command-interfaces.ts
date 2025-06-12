
/**
 * Generated TypeScript interfaces for hyperscript commands
 * Source: hyperscript-lsp database
 */

import type { CommandImplementation } from '@types/core';


export interface AddCommand extends CommandImplementation {
  name: 'add';
  syntax: 'add <class-ref+ or attribute-ref or object-literal> [to <target-expression>] [where <expr>]';
  purpose: 'The add command allows you to add a class (via a class ref), an attribute(via an attribute ref) or CSS attributes (via an object literal) to either the current element or to another element.
Note: Hyperscript supports hyphens in object property names, so you can write add { font-size: '2em' }. However, double hyphens (--) mark comments in hyperscript, so if you need to use them for [CSS Custom Properties][], use quotes -- add { '--big-font-size': '2em' }.
The where clause allows you filter what elements have the class or property added in the target.  The expression will be evaluated foreach element in target and, if the result is true, the element class or property will be added.  If it is false, the classor property will be removed.  The it symbol will be set to the current element, allowing you to express conditions against each elementin target.  Note that this clause only works with classes and properties.';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface AppendCommand extends CommandImplementation {
  name: 'append';
  syntax: 'append <string> [to <string> | <array> | <HTML Element>]';
  purpose: 'The append command adds a string value to the end of another string, array, or HTML Element. If no target variable is defined, then the standard result variable is used by default.';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface AsyncCommand extends CommandImplementation {
  name: 'async';
  syntax: 'async <command>

async do
 {command}
end';
  purpose: 'The async command you to execute a command or a block of commands asynchronously (they will not block hyperscript from continuingeven if they return a promise)';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface BeepCommand extends CommandImplementation {
  name: 'beep';
  syntax: 'beep! <expression> {, <expression>}';
  purpose: 'The beep! command allows you to debug an expression (or multiple expressions) by printingthe source of the expression, its result and the type of the result to the console.  This isquick and convenient mechanism for print-debugging in hyperscript.
Note that the syntax is slightly different than the beep! expression, which bindsto unary expressions rather than general expressions.
Note that you can also print the value of multiple expressions in a single beep! command.Note that you can also print the value of multiple expressions in a single beep! command.';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface BreakCommand extends CommandImplementation {
  name: 'break';
  syntax: 'break';
  purpose: 'The break command works inside any repeat block.  It exits the loop.';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface CallCommand extends CommandImplementation {
  name: 'call';
  syntax: 'call <expression>
get <expression>';
  purpose: 'The call command allows you evaluate an expression.
The value of this expression will be put into the it variable.
get is an alias for call and can be used if it more clearly expresses the meaning of the code.';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface ContinueCommand extends CommandImplementation {
  name: 'continue';
  syntax: 'continue';
  purpose: 'The continue command works inside any repeat block.  It exits the current iteration of the loop and begins at the top of the next iteration.';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface DecrementCommand extends CommandImplementation {
  name: 'decrement';
  syntax: 'decrement <target> [by <number>]';
  purpose: 'The decrement command subtracts from an existing variable, property, or attribute. It defaults to subtracting the value 1, but this can be changed using the by modifier. If the target variable is null, then it is assumed to be 0, and then decremented by the specified amount. The decrement command is the opposite of the increment command command.';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface DefaultCommand extends CommandImplementation {
  name: 'default';
  syntax: 'default <target> to <expr>';
  purpose: 'The default command defaults a variable or property to a given value.';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface FetchCommand extends CommandImplementation {
  name: 'fetch';
  syntax: 'fetch <stringLike> [ as [ a | an ]( json | Object | html | response ) ] [<object literal> | 'with' <naked named arguments>]';
  purpose: 'The fetch command issues a fetch request to thegiven URL. The URL can either be a naked URL or a string literal.
By default the result will be processed as text, but you can have it processedas JSON, as HTML, or as a raw response object by adding the as json, as htmlor as response modifiers.
Additionally, you can use conversions directly on theresponse text.
This command saves the result into the it variable.
This command is asynchronous.
The fetch command supports both timeouts as well as request cancellation.
To add a timeout to a request syntactically, you can use add a timeout property using the with form:
To cancel a fetch request, send a fetch:abort event to the element that triggered the request:
If you need to fetch from a dynamically-generated URL, just use a template literal string (the ones with the backticks) as the URL.  For example:
The fetch command features a few events that can be listened to (using hyperscript or javascript) to do thingslike configure the fetch options, update UI state, etc.';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface GoCommand extends CommandImplementation {
  name: 'go';
  syntax: 'go [to] url <stringLike> [in new window]
 go [to] [top|middle|bottom] [left|center|right] [of] <expression> [(+|-) <number> [px] ][smoothly|instantly]
 go back';
  purpose: 'The go command allows you navigate on the page with various forms
go to url <stringLike> will navigate to the given URL. If the url starts with an anchor # it will instead updatethe windows href.
go to <modifiers> elt will scroll the element into view on the current page. You can pick the top, bottom, left, etc.by using modifiers, and you can pick the animation style with a following smoothly or instantly.
Additionally you can use a pixel-based offset to pad the scrolling by some amount since, annoyingly, the default behavior ofscrollIntoView() is to put the element right on the edge of the viewport.
Finally, the go back form will navigate back in the history stack.';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface HaltCommand extends CommandImplementation {
  name: 'halt';
  syntax: 'halt [the event['s]] (bubbling|default)
exit';
  purpose: 'The halt command prevents an event from bubbling and/or from performing its default action.
The form halt the event will halt both the bubbling and default for the event, but continue execution of theevent handler
The form halt the event's (bubbling|default) will halt either the bubbling or the default for the event, but continueexecution of the event handler
The form halt will halt both the bubbling and default for the event and exit the current event handler, acting the sameas the exit command.
The form halt (bubbling|default) will halt either the bubbling or the default for the event and exit the current eventhandler.';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface HideCommand extends CommandImplementation {
  name: 'hide';
  syntax: 'hide [target] [with <hide-show-strategy>[: <argument>]] [when <expr>]';
  purpose: 'The hide command allows you to hide an element in the DOM using various strategies. The default strategy is display.
By default, the following strategies are available:
display - toggle display between none and block
visibility - toggle visibility between hidden and visible
opacity - toggle opacity between 0 and 1
You can change the default hide/show strategy by setting _hyperscript.config.defaultHideShowStrategy
You can add new hide/show strategies by setting new values into the _hyperscript.config.hideShowStrategies object.
In case you are using Tailwind CSS, you may want to use their utility classes.
You will have to set _hyperscript.config.defaultHideShowStrategy to one of this options :
twDisplay - add class hidden Display - Tailwind CSS
twVisibility - add class invisible Visibility - Tailwind CSS
twOpacity - add class opacity-0 Opacity - Tailwind CSS
You may also have to update your tailwind.config.js to add to the safe list the classes you need
More information here : Content Configuration - Tailwind CSS';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface IfCommand extends CommandImplementation {
  name: 'if';
  syntax: 'if <conditional> [then] <command-list> [(else | otherwise) <command-list>] end`';
  purpose: 'The if command provides the standard if-statement control flow.
Note that a leading if on a separate line from an else statement will be treated as a nested if within the else:';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface IncrementCommand extends CommandImplementation {
  name: 'increment';
  syntax: 'increment <target> [by <number>]';
  purpose: 'The increment command adds to an existing variable, property, or attribute. It defaults to adding the value 1, but this can be changed using the by modifier. If the target variable is null, then it is assumed to be 0, and then incremented by the specified amount. The increment command is the opposite of the decrement command command.';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface JsCommand extends CommandImplementation {
  name: 'js';
  syntax: '<button
  _="on click
           js
               if ('clipboard' in window.navigator) {
               	 return navigator.clipboard.readText()
               }
           end
           put it in my.innerHTML "
></button>';
  purpose: 'Note: This page is about the inline JS command. _hyperscript also supports JS blocks at the top level.
The js command can be used to embed JavaScript code inline in _hyperscript, as shown below:
this inside a js block is the global scope (window, or self in workers).
If the js block returns a promise, the code that comes after it will execute when it resolves.
If the js block needs to use variables from the surrounding _hyperscript code, these need to be explicitly declared as shown:
{% include "js_end.md" %}';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface LogCommand extends CommandImplementation {
  name: 'log';
  syntax: 'log <expression> {, <expression>} [with <expression>]';
  purpose: 'The log command logs an expression to console.log or whatever value is provided with the with clause.';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface MakeCommand extends CommandImplementation {
  name: 'make';
  syntax: 'make (a|an) <expression> [from <arg-list>] [called <identifier>]
make (a|an) <query-ref>                    [called <identifier>]';
  purpose: 'The make command can be used to create class instances or DOM elements.
In the first form:
is equal to the JavaScript new URL("/path/", "https://origin.example.com").
In the second form:
will create an <a> element and add the class "navlink" to it. Currently, onlyclasses and IDs are supported.';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface MeasureCommand extends CommandImplementation {
  name: 'measure';
  syntax: 'measure <possessive> [measurement {, measurement}';
  purpose: 'The measure command gets the measurements for a given element using getBoundingClientRect() as well as thescroll* properties. It will place the result into the result variable.
You may also specify particular measurements to be saved into local variables, by name.
The available measurements are:
x
y
left
top
right
bottom
width
height
bounds
scrollLeft
scrollTop
scrollLeftMax
scrollTopMax
scrollWidth
scrollHeight
scroll';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface PickCommand extends CommandImplementation {
  name: 'pick';
  syntax: 'set arr to [10, 11, 12, 13, 14, 15]
pick items 2 to 4 from arr
--      it = [12, 13]
pick items 2 to 4 from arr inclusive
--      it = [12, 13, 14]
pick items 2 to 4 from arr exclusive
--      it = [13]';
  purpose: 'This command has several forms:
item | items
character | characters
match
matches
{%syntax "pick items at|from[[?]] from[[?]] [[start]] to [[end]] from [[array]] inclusive|exclusive[[?]]"%}
{%syntax "pick item at[[?]] [...]"%}
Selects items from <var>array</var> using Array.slice. By default, it willinclude <var>start</var> but not <var>end</var>. You can use inclusive orexclusive to override this behavior. If <var>end</var> is omitted, it willreturn an array containing just one item.
You can use the keywords start or end for <var>start</var> and<var>end</var>, respectively.
{%syntax "pick characters [...]"%}
{%syntax "pick character [...]"%}
Same as pick items, but for strings, using String.slice.
{%syntax "pick match of[[?]] [[regex]] | [[flags]][[?]] from [[string]]"%}
Selects the first match for the <var>regex</var> in the <var>string</var>.
{%syntax "pick matches of[[?]] [[regex]] | [[flags]][[?]] from [[string]]"%}
Returns an iterable of all matches for the <var>regex</var> in the<var>string</var>.';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface Pseudo-commandsCommand extends CommandImplementation {
  name: 'pseudo-commands';
  syntax: '<method name>(<arg list>) [(to | on | with | into | from | at)] <expression>';
  purpose: 'Pseudo-commands allow you to treat a method on an object as a top level command. The method name must be followed byan argument list, then optional prepositional syntax to clarify the code, then an expression. The method will belooked up on the value returned by the expression and executed.
A function defined with the same name as a hyperscript command cannot be called as a pseudo-command.
Built-in commands can be called with or without parentheses grouping the single object the command works on. If a function has the same name as a command but takes more than a single parameter, the hyperscript parser will not see the call to the function as a pseudo-command, but will see the additional parameters in the function call as a parse error for the built-in command.
For example, this function's name, increment(), collides with the built-in hyperscript increment command.
This demonstrates typical increment command usage:
Here is a call to the increment command with parens around the variable to increment.';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface PutCommand extends CommandImplementation {
  name: 'put';
  syntax: 'put <expression> (into | before | at [the] start of | at [the] end of | after)  <expression>`';
  purpose: 'The put command allows you to insert content into a variable, property or the DOM.
Content that is added to the DOM via the put command targeting DOM will have any hyperscript content within itinitialized without needing to call processNode().';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface RemoveCommand extends CommandImplementation {
  name: 'remove';
  syntax: 'remove <expression> [from <expression>]';
  purpose: 'The remove command allows you to remove an element from the DOM or to removea class or property from an element node.';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface RenderCommand extends CommandImplementation {
  name: 'render';
  syntax: '<script src="https://unpkg.com/hyperscript.org@0.9.14/dist/template.js"></script>';
  purpose: 'Note: if you want the template command, you must include the /dist/template.js file in addition to the hyperscript script
The render command implements a simple template language. This language has two rules:
You can use ${} string interpolation, just like in template literals. However, bare `$var` interpolation is not supported.
Interpolated expressions will be HTML-escaped, unless they are preceded by unescaped.
Any line starting with @ is executed as a _hyperscript statement.
The result of rendering the template will be stored in the result (or it) variable.
For example, if we want to render a list of colors:
Our template might look like this:';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface RepeatCommand extends CommandImplementation {
  name: 'repeat';
  syntax: 'repeat for <identifier> in <expression> [index <identifier>] { <command> } end
repeat in <expression> [index <identifier>] { <command> } end
repeat while <expression> [index <identifier>] { <command> } end
repeat until <expression> [index <identifier>] { <command> } end
repeat until event <expression> [from <expression>] [index <identifier>] { <command> } end
repeat <number> times [index <identifier>] { <command> } end
repeat forever <expression> [index <identifier>] { <command> } end
for <identifier> in <expression> [index <identifier>]';
  purpose: 'The repeat command provides iteration in the hyperscript language. It is very flexible and supports many forms.
In every form you may assign a named value to the current iteration index by appending a index i to theloop specification.
Here are examples of all the above forms:';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface ReturnCommand extends CommandImplementation {
  name: 'return';
  syntax: 'return <expression>
exit';
  purpose: 'The return command returns a value from a function in hyperscript or stops an event handler from continuing.
You may use the exit form to return no value.';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface SendCommand extends CommandImplementation {
  name: 'send';
  syntax: 'send <event-name>[(<named arguments>)] [to <expression>]
 trigger <event-name>[(<named arguments>)] [on <expression>]';
  purpose: 'The send command sends an event to the given target. Arguments can optionally be provided in a named argument listand will be passed in the event.detail object.
You can alternatively use the equivalent trigger syntax.';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface SetCommand extends CommandImplementation {
  name: 'set';
  syntax: 'set <expression> to <expression>
  set <object literal> on <expression>';
  purpose: 'The set command allows you to set a value of a variable, property or the DOM. It is similar to the put commandbut reads more naturally for operations like setting variables.
It can also be used to set many properties at once using the set {...} on form.
When setting a symbol, such as x, the following rules are used:
If a symbol x exists in the current local scope, set the locally scoped value
If not, if a symbol x exists in the current element-local scope, set the element-local scoped value
If not, create a new locally scoped symbol named x with the value
Note that if you wish to set a global variable you must explicitly use the global modifier unless the symbol startswith a $:';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface SettleCommand extends CommandImplementation {
  name: 'settle';
  syntax: 'settle [<expression>]';
  purpose: 'The settle command allows you to synchronize on the CSS transition of an element. It will listen for thetransitionend even on the given element (or me if no element is given).
If a transitionstart event is not received within 500ms, the command will continue assuming that notransition will occur.';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface ShowCommand extends CommandImplementation {
  name: 'show';
  syntax: 'show [target] [with <hide-show-strategy>[: <argument>]] [where <expr>]';
  purpose: 'The show command allows you to show an element in the DOM using various strategies. The default strategy is display.
By default, the following strategies are available:
display - toggle display between none and block
visibility - toggle visibility between hidden and visible
opacity - toggle visibility between 0 and 1
You can also use the style-literal form (e.g. *display).
You can change the default hide/show strategy by setting _hyperscript.config.defaultHideShowStrategy
You can add new hide/show strategies by setting the hyperscript.config.hideShowStrategies object.
Note that the display strategy can take an argument to specify the type of display to use when showing. The defaultis block
The where clause allows you filter what elements are shown in the target.  The expression will be evaluated foreach element in target and, if the result is true, the element will be shown.  If it is false, the element will behidden.  The it symbol will be set to the current element, allowing you to express conditions against each elementin target';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface TakeCommand extends CommandImplementation {
  name: 'take';
  syntax: 'take <class-ref+ or attribute-ref [with <expression>]> [from <expression>] [for <expression>]';
  purpose: 'The take command allows you to take a class or an attribute from a set of elements (or all elements) and add it to the current element (or the targeted element).
When using take with attributes, elements matching from expression will have their attributes with the same name removed regardless of value.You can specify a new value to be assigned instead via with clause (in this case the attribute will be added even if the element didn't have it originally).';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface TellCommand extends CommandImplementation {
  name: 'tell';
  syntax: 'tell <expression>
  <statements>
end';
  purpose: 'The tell command can be used to temporarily change the default target for commands like add.
Within tell blocks, keywords you, your, and yourself can be used to identify the individual element being referenced.';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface ThrowCommand extends CommandImplementation {
  name: 'throw';
  syntax: 'throw <expression>';
  purpose: 'The throw command throws an exception.';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface ToggleCommand extends CommandImplementation {
  name: 'toggle';
  syntax: 'toggle ({<class-ref>} | <attribute-ref> | between <class-ref> and <class-ref>)
 [on <expression>]
  [(for <time expression>) |
   (until <event name> [from <expression>]]`

toggle [the | my] ('*opacity' | '*visibility' | '*display')
 [of <expression>]
  [(for <time expression>) |
   (until <event name> [from <expression>]]`';
  purpose: 'The toggle command allows you to toggle:
A class or set of classes (via a class ref)
An attribute (via an attribute ref)
Or the visibility of an element via opacity, visibility or display
on either the current element or, if a target expressionis provided, to the targeted element(s).
You can use the form toggle between .class1 and .class2 to flip between two classes.
If you provide a for <time expression> the class or attribute will be toggled for that amount of time.
If you provide an until <event name> the class or attribute will be toggled until the given event is received.';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface TransitionCommand extends CommandImplementation {
  name: 'transition';
  syntax: 'transition [[element] <transition target>]
  {<property name> [from <string>} to <string>}
[over <time expression> | using <expression>]';
  purpose: 'The transition command allows you to transition properties on an element from one value to another.
If you use the form transition <transition target> the transition will take place on the specified target, otherwiseit is done on the current me.
The transition target can be a pseudo-possessive:
If the target is a symbol it will need to be preceded by a the or the keyword element to distinguish the symbol from aproperty name:
Following the start is a series of transitions, starting with a style property name, followed optionally bya from and an initial value. If this is omitted, the current calculated value of the property is used.
Next comes a required to followed by a final value to transition the property too. Note that you can useeither strings or naked strings.
You can optionally set the transition time by using the over clause and passing in a time expression such as500ms or 2 seconds.
Finally, if you don't specify a transition time, you can optionally set the transition style by using the usingclause and passing in a string that specifies a transformation specification, e.g. all 1s ease-in.';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface TriggerCommand extends CommandImplementation {
  name: 'trigger';
  syntax: 'null';
  purpose: 'See the send command documentation';
  hasBody: false;
  isBlocking: false;
  
  
}

export interface WaitCommand extends CommandImplementation {
  name: 'wait';
  syntax: 'wait (<time expression> | for (<event> [from <source>]) [or ...] )';
  purpose: 'The wait command can either wait for an event to occur or for a fixed amount of time
In the form wait for <event> {or <event>} [from <source>] the hyperscript will pause until the element receivesany of the specified events.
Events may destructure properties into local variables using the eventName(property1, property2, ...) form.
In the wait <time-expr> form, it waits the given amount of time, which can be in the following formats:
10 - 10 milliseconds
100 ms - 100 milliseconds
100 milliseconds - 100 milliseconds
1 s - 1000 milliseconds
1 seconds - 1000 milliseconds
You can also mix timeouts and events, which can be useful to avoid waiting forever for an event:
This command is asynchronous. All commands that follow it will be delayed until the wait completes.';
  hasBody: false;
  isBlocking: false;
  
  
}

export type HyperscriptCommand = AddCommand | AppendCommand | AsyncCommand | BeepCommand | BreakCommand | CallCommand | ContinueCommand | DecrementCommand | DefaultCommand | FetchCommand | GoCommand | HaltCommand | HideCommand | IfCommand | IncrementCommand | JsCommand | LogCommand | MakeCommand | MeasureCommand | PickCommand | Pseudo-commandsCommand | PutCommand | RemoveCommand | RenderCommand | RepeatCommand | ReturnCommand | SendCommand | SetCommand | SettleCommand | ShowCommand | TakeCommand | TellCommand | ThrowCommand | ToggleCommand | TransitionCommand | TriggerCommand | WaitCommand;
