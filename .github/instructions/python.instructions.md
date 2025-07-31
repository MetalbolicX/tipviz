---
applyTo: "**/*.py"
description: This document provides guidelines for Python code.
---
# Instructions to write Python code

## General Guidelines

- Use snake_case for variable and function names, and PascalCase for class names.
- Always use double quotes for the strings and use a newline at the end of the file.
- To concatenate a string, always use f-strings (formatted string literals).
- Always add types to the first declaration of a variable and the function parameters and return types.
- Use the `if __name__ == "__main__":` construct to allow or prevent parts of code from being run when the modules are imported.
- When a variable is assignated for the first time, add the type hint to the variable declaration. For example, `my_var: int = 0`.
- When the Python version is 3.8 or higher, use the `match` statement for pattern matching instead of `if-elif-else` chains.

## Arrays and Dictionaries

- Have preference for list comprehensions and dictionary comprehensions. Reduce the use of filling list with append method. For example:

```python
# Recommended
my_list = [x for x in range(10) if x % 2 == 0]
# Not recommended
my_list = []
for x in range(10):
    if x % 2 == 0:
        my_list.append(x)
```

- To get a value from a dictionary use the `get` method to avoid `KeyError` exceptions. For example, use `my_dict.get("key", default_value)` to provide a default value if the key does not exist.


## Open Files and Resource Management

- Use the `with` statement to handle resource management, such as file operations, to ensure proper cleanup.

## Functions

- Add the docstrings to the functions and classes to describe their purpose and usage.

## Conditions

- Take advantage of the truthy and falsy values in Python to simplify conditions. For example, instead of checking if a variable is not `None`, you can simply check if it is truthy.

## Styles and Conventions

- Follow the PEP 8 style guide for Python code, which includes guidelines for naming conventions, indentation, line length, and more.

## Loops and Iteration

- Use `enumerate` when you need both the index and the value from a list or iterable.
- Use `zip` to iterate over multiple iterables in parallel.