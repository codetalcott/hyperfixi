# Why integrate Fixi and Hyperscript?

The ability to create, send, and listen for custom events is a cornerstone of Hyperscript's power. When you combine that with our asynchronous `fetch` command, you unlock the ability to create sophisticated, decoupled, and highly reactive applications directly within your HTML.

This synergy allows components to communicate across the DOM without being directly nested or aware of each other's internal structure. Let's explore some of these interesting combinations.

### 1. From Action to Global Reaction: `fetch` Sending Events

A common challenge in web applications is keeping disparate parts of the UI in sync. For example, when a user updates their name in a form, the user's name displayed in the main navigation bar should also change. Custom events make this trivial.

**The Pattern:** An element performs a `fetch` operation (e.g., a POST to update data). On success, it doesn't just update itself; it broadcasts a custom event to the entire page. Other components, anywhere on the page, can listen for this event and update themselves accordingly.

**Use Case:** A user updates their profile. After the `fetch` confirms the update was successful, it sends a `profileUpdated` event with the new user data as a payload.

```html
<form _="on submit fetch /user/profile with method: 'POST', body: formToJSON(me)
         then send profileUpdated({user: it}) to body">
  <input name="name" type="text"/>
  <button type="submit">Save</button>
</form>

---

<div id="main-nav">
  Welcome, <span _="on profileUpdated(user) from body put user.name into me">
    Current User Name
  </span>
</div>

<h1 _="on profileUpdated(user) from body
         set my.textContent to `Welcome back, ${user.name}!`">
  Welcome back...
</h1>
```

**Why this is powerful:** The form's only responsibility is to submit the data and announce that a change occurred. It doesn't need to know about the navbar or the welcome banner. This creates a highly decoupled and maintainable system. You can add more components that listen for `profileUpdated` without ever touching the original form's code.

### 2. Decoupled Triggers: Custom Events Calling `fetch`

This is the reverse pattern and is equally powerful. An action in one component can trigger a `fetch` call in another, allowing you to create "smart" components that know how to load their own content when told.

**The Pattern:** An element sends a custom event to trigger an action. Another component is listening for that event, and its response is to execute a `fetch` call to load or refresh its own content.

**Use Case:** A gallery of product thumbnails. Clicking any thumbnail should load the detailed product view into a dedicated modal dialog.

```html
<div id="product-gallery">
  <img src="thumb1.jpg" _="on click send showProduct(id: 1) to #product-modal">
  <img src="thumb2.jpg" _="on click send showProduct(id: 2) to #product-modal">
</div>

---

<div id="product-modal" class="hidden"
     _="on showProduct(id)
          fetch /products/{id} and put it into me
          then remove .hidden from me">
  </div>
```

**Why this is powerful:** The thumbnails are "dumb." They only know how to announce that a product should be shown. The modal is completely self-contained. It defines the logic for how it gets populated and displayed. This separation of concerns is a hallmark of clean architecture.

### 3. Advanced Pattern: Chained and Asynchronous Workflows

You can chain these patterns to create complex workflows that remain readable and declarative. Imagine a multi-step checkout process where each step is loaded dynamically based on the successful completion of the previous one.

**Use Case:** A two-step "cart validation" process. Step 1 validates the items. If successful, it automatically triggers the loading of Step 2, the shipping options.

```html
<div id="checkout-flow">

  <div id="step-1">
    <button _="on click
                 fetch /cart/validate with method: 'POST'
                 then send loadStep(url: it.nextStepUrl) to #checkout-flow">
      Validate Items
    </button>
  </div>

</div>

<script type="text/hyperscript">
  -- This is a behavior defined on the main container
  behavior LoadStep on #checkout-flow
    on loadStep(url) from me
      fetch url and replace the content of me
    end
  end
</script>
```

**Why this is powerful:** The logic for the entire flow is not hard-coded.
1. The button in Step 1 triggers a `fetch`.
2. The server response (`it`) contains the URL for the next step (`it.nextStepUrl`).
3. The `then` clause uses this URL to `send` a `loadStep` event to the main `#checkout-flow` container.
4. The container is listening for `loadStep` and knows how to `fetch` the given URL and replace its own content with the next step in the flow.

This creates a state machine managed entirely through declarative events and `fetch` calls, resulting in a system that is incredibly easy to reason about and debug.