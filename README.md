# Hyperscript-Fixi Integration

A modern, modular, and readable syntax for connecting the declarative server communication of Fixi.js with the expressive event-handling of Hyperscript.

## What is this?

This project is a thoughtful integration of two powerful, minimalist libraries:

* **[Fixi.js](https://github.com/bigskysoftware/fixi):** A featherlight library for making server requests directly from HTML.
* **[Hyperscript](https://hyperscript.org):** An expressive, natural-language syntax for handling events and DOM manipulations.

Instead of simply using them side-by-side, this project creates a unified, enhanced syntax that leverages the strengths of both, enabling developers to build sophisticated applications with surprising simplicity.

## Project Goals

Our primary goal is to create a developer experience that is intuitive, powerful, and efficient. We are guided by the following principles:

1. **Create an Elegant, Unified Syntax:** Introduce a single, powerful `fetch` command within Hyperscript that feels like a natural extension of the language. This avoids juggling multiple `fx-` attributes and consolidates logic into one clean, readable location.

    ```html
    <button _="on click fetch /path/to/content and replace #target-div">
      Load Content
    </button>
    ```

2. **Embrace Extreme Modularity:** The integration is designed from the ground up to be tree-shakable. Your final application bundle will only include the specific functionality you actually use, resulting in the smallest possible asset size.

3. **Enhance Developer and AI Experience:** The syntax is designed to be easy to write, read, and debug for human developers. Its structured and predictable nature also makes it highly suitable for generation and analysis by AI agents.

4. **Be Declarative and HTML-Centric:** Stay true to the philosophy of keeping behavior and logic co-located with the HTML they affect. This reduces the need for large, separate JavaScript files and makes components easier to understand at a glance.

5. **Enable Powerful, Event-Driven Architecture:** By combining `fetch` with Hyperscript's custom events, our goal is to enable complex, decoupled UI communication (e.g., state-sharing, notifications) without immediately reaching for heavier, client-side state management libraries.
