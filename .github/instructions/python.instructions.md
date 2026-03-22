---
applyTo: "**/*.py"
description: Guidelines for high-performance, functional, and clean Python code.
---

# Python Coding Standards

## 1. Core Syntax & Style
- **Naming:** `snake_case` (vars/funcs), `PascalCase` (classes), `UPPER_CASE` (constants).
- **Strings:** Prefer double quotes (`" "`). Use f-strings for interpolation. Use triple double-quotes for multi-line strings.
- **Entry Point:** Always wrap execution in `if __name__ == "__main__":`.
- **Formatting:** Adhere to PEP 8. Use 4 spaces for indentation. Ensure a single newline at EOF.

## 2. Type Hinting & Documentation
- **Hints:** Annotate all function signatures and variable assignments. Use modern `|` for unions (Python 3.10+).
- **Docs:** Write Google-style docstrings for all classes and functions. Describe parameters, return types, and exceptions.

## 3. Data Structures & Functional Logic
- **Comprehensions:** Use list/dict/set comprehensions instead of loops and `.append()` or `.update()`.
- **Immutability:** Prefer `tuple` or `NamedTuple` for fixed records. Use `dataclasses` with `frozen=True` for data objects.
- **Access:** Use `.get(key, default)` for dictionaries to prevent `KeyError`.
- **Iterables:** Use generator expressions `(x for x in data)` for large datasets to save memory.

## 4. Control Flow & Pattern Matching
- **Structural Pattern Matching:** Use `match/case` (Python 3.10+) for complex branching instead of `if-elif`.
- **Conditionals:** Prefer ternary operators for simple logic. Use `any()` and `all()` for sequence checks.
- **Boolean Logic:** Rely on truthy/falsy values (e.g., `if items:` instead of `if len(items) > 0:`).
- **Returns:** Implement early returns to minimize nesting.

## 5. Resource Management & IO
- **Context Managers:** Use `with` for file/socket operations and database connections.
- **Paths:** Use `pathlib.Path` instead of `os.path` for cross-platform filesystem operations.

## 6. Error Handling
- **Specificity:** Catch specific exceptions (e.g., `ValueError`), never a bare `except:`.
- **Reraising:** Use `raise ... from e` to preserve stack traces when wrapping errors.