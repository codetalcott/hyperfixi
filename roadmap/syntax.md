# Proposal: a functional, intuitive, elegant, and robust syntax for both human developers and AI agents

The goal is to move beyond simply wrapping JavaScript functions and to create a true Domain-Specific Language (DSL) for asynchronous server communication within Hyperscript.

### Guiding Principles

1.  **Clarity at a Glance:** Simple requests should look simple. Complex requests should be explicit and unambiguous, not confusing.
2.  **Natural Language Flow:** The syntax should read like a set of instructions, leveraging Hyperscript's event-driven, sentence-like structure.
3.  **Unified Command:** Instead of multiple commands (`get`, `post`, etc.), we'll unify them under a single, powerful `fetch` command. This simplifies the API surface and makes it easier to learn.
4.  **Consistency and Predictability:** The syntax should have a consistent structure that is easy for developers to remember and for AI to generate or parse.

---

### The Proposed `fetch` Command

I propose a single, versatile `fetch` command that has two primary forms: a highly-readable **Shorthand Syntax** for common use cases, and an explicit **Extended Syntax** for more complex needs.

#### 1. Shorthand Syntax (for simple GET requests)

This syntax is optimized for the most common web interaction: getting a piece of HTML from the server and placing it on the page.

**Structure:**
`fetch <url> [and] <placement> <target>`

* **`fetch <url>`**: The core action. Always starts with `fetch` followed by the URL to retrieve.
* **`[and]`**: An optional connector word to improve readability.
* **`<placement>`**: A keyword defining how the fetched content interacts with the target.
    * `replace`: Replaces the target element itself.
    * `put into`: Replaces the inner HTML of the target element.
    * `append to`: Adds the content inside the target, at the end.
    * `prepend to`: Adds the content inside the target, at the beginning.
* **`<target>`**: A CSS selector for the element to be modified.

**Examples:**

```html
<button _="on click fetch /user/profile and replace #profile-section">
  View Profile
</button>

<a _="on click fetch /items/details and put it into #details-modal">
  Show Details
</a>

<button _="on click fetch /notifications/next and append to #notification-list">
  Load More
</button>
```

**Why it works:** This syntax is incredibly clear and self-documenting. It describes the entire user-story—event, action, and result—in one concise line.

#### 2. Extended Syntax (for POST, PUT, Headers, etc.)

When you need more control, the Extended Syntax provides explicit key-value pairs for configuration. It's designed to be powerful and extensible.

**Structure:**
`fetch <url> with <option>: <value>, <option>: <value>, ...`

* **`fetch <url>`**: Same as the shorthand.
* **`with`**: A keyword that signals the start of the options block.
* **`<option>: <value>`**: A comma-separated list of key-value pairs. The value can be a string, a number, or a Hyperscript expression (like `me.value` or `formToJSON(me)`).

**Key Options:**

| Option      | Description                                                                                              | Example Value              |
|-------------|----------------------------------------------------------------------------------------------------------|----------------------------|
| `method`    | The HTTP method. Defaults to `'GET'`.                                                                    | `'POST'`, `'PUT'`, `'DELETE'` |
| `body`      | The request body. Often used with a helper function to serialize a form.                                 | `formToJSON(me)`           |
| `headers`   | A JavaScript object of request headers.                                                                  | `{ 'Accept': 'application/json' }` |
| `target`    | A CSS selector for the target element.                                                                   | `'#contact-form'`          |
| `placement` | The placement strategy. Same as the shorthand.                                                           | `'replace'`, `'put into'`    |
| `trigger`   | A CSS selector to find an element to trigger events on after the request.                                | `'#new-element'`           |

**Examples:**

```html
<form _="on submit fetch /register with method: 'POST', body: formToJSON(me)
                   then add .hidden to me
                   then remove .hidden from #success-message">
  <button type="submit">Register</button>
</form>

<button _="on click fetch /items/delete/3 with
                     method: 'DELETE',
                     headers: { 'X-CSRF-Token': window.csrfToken },
                     target: my closest <tr/>,
                     placement: 'replace'">
  Delete Item
</button>
```

### Combining with Core Hyperscript for Advanced Logic

The true power of this integration comes from combining the `fetch` command with Hyperscript's built-in logic and `then` clauses.

The `fetch` command (in either form) resolves with the server's response, making it available as `it` in the next step. This allows for powerful, client-side conditional logic.

```html
<div _="on click fetch /check-status
         then if it contains 'OK'
           add .status-ok to me
           remove .status-error from me
         else
           add .status-error to me
           remove .status-ok from me
         end">
  Check Status
</div>

<script type="text/hyperscript">
  def userToHTML(user)
    return `<div class="user">
              <img src="${user.avatar}"/>
              <span>${user.name}</span>
            </div>`
  end
</script>

<button _="on click fetch /api/user/1
                     with headers: {'Accept': 'application/json'}
                     then call userToHTML(it)
                     then put it into #user-card">
  Fetch User
</button>
```

This proposed syntax provides a clean, powerful, and scalable foundation for building a modular integration that is a joy for developers to use and straightforward for AI to understand and generate.
