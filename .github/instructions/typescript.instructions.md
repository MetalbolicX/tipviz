---
applyTo: '**/*.ts, **/*.tsx, **/*.js, **/*.jsx, **/*.mjs, **/*.cjs, **/*.mts, **/*.cts'
description: 'Strict JS/TS conventions for ES2024+ environments.'
---

# JS/TS Coding Standards

## Core Tech & Style
- **Engine:** ES2024+; ESM (`import/export`) over CommonJS.
- **Standards:** Follow Google TypeScript Style Guide.
- **Typing (TS):** No primitive type annotations (infer `string`, `number`, etc.). Use `unknown` instead of `any`. Strict null checks enabled.
- **Documentation (JS):** Use `'use strict'`; mandatory JSDoc for all declarations, functions, and methods in classes. Follow the ideas of [self-explanatory code commenting](./self-explanatory-code-commenting.instructions.md) for better clarity.
- **Documentation (TS):** Use TSDoc for all declarations, functions, and methods in classes. Follow the ideas of [self-explanatory code commenting](./self-explanatory-code-commenting.instructions.md) for better clarity.
- **Equality:** Always use `===` and `!==`.
- **Async:** Use `async/await` over raw `Promise` or callbacks.

## Naming
- **PascalCase:** Classes.
- **camelCase:** Variables, functions, methods.
- **kebab-case:** Files and directories.
- **UPPERCASE:** Environment variables.
- **Semantics:** Start functions with verbs. Use boolean prefixes (`is`, `has`, `can`). No magic numbers; use constants.
- **Verbiage:** Use full words.
  - **Exceptions:** `API`, `URL`, `i`/`j` (loops), `err`, `ctx`, `req`, `res`, `next`.

## Formatting & Variables
- **Syntax:** Double quotes, mandatory semicolons.
- **Strings:** Template literals only (no `+` concatenation), including multi-line.
- **Declarations:** `const` by default; `let` only if reassigning. Forbidden: `var`.
- **Resource Management:** Use `using` and `Symbol.asyncDispose` for cleanup.

## Logic & Control Flow
- **Nesting:** Prefer early returns/guard clauses.
- **Booleans:** Leverage truthy/falsy values directly.
- **Branching:** - Simple: Ternary.
  - 3 levels: `if/else`.
  - 4+ levels: `switch`.
- **Iteration:** `for...of` (arrays), `for...in` (objects), `for await...of` (async).
- **Restriction:** Never use `for` loops to populate or manipulate arrays; use array methods.

## Data Structures
- **Arrays:** - Spread operator (`...`) instead of `.push()`.
  - Use `.at()` for indexing (especially for the last element).
  - Creation: `Array.from` / `Array.fromAsync`.
  - Manipulation: `map`, `filter`, `reduce`.
  - Destructure with optional default values.
- **Objects:**
  - Use spread for copy/merge/extend.
  - Use `Object.fromEntries`, `.entries()`, `.keys()`, and `.values()`.
  - Destructure with optional default values.

## Functions
- **Style:** Prefer arrow functions with implicit returns.
- **Array Callbacks:** Keep anonymous functions on one line; omit `{}` and `return` where possible.
- **Parameters:** Use default values, rest parameters (`...args`), and object/array destructuring.

## Error Handling & Patterns
- **Safety:** Use optional chaining (`?.`) and nullish coalescing (`??`).
- **Assignment:** Use logical assignments (`&&=`, `||=`, `??=`).
- **Errors:** Use `throw` for custom error instances.

## Environment Specifics
- **Node.js:** Use `node:` prefix for built-ins; use `import.meta` for module metadata.
- **Web APIs:**
  - **DOM:** No `innerHTML`. Use `textContent` or `document.createRange().createContextualFragment()`.
  - **CSS:** Use `CSSStyleSheet` with `replaceSync()`.
  - **Network:** Use `fetch` with `AbortController` and `WebSocket`.
