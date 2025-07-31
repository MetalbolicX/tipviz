---
applyTo: "**/*.ts, **/*.tsx, **/*.js, **/*.jsx, **/*.mjs, **/*.cjs,"
description: This document provides guidelines and best practices for writing TypeScript and JavaScript code. It is intended to ensure consistency, readability, and maintainability across the codebase.
---
# Instructions to write TypeScript/JavaScript code

<general_guidelines>

- Use `ES2022` or greater version of modern JavaSript.
- Use `ES6` modules over CommonJS for imports and exports.
- In JavaScript files, use the `strict` directive. In additions, always use JsDoc when a variable is declared, and in functions and methods of the classes.

<example>

```js
"use strict";

/**
 * Adds two numbers.
 * @param {number} a - The first number.
 * @param {number} b - The second number.
 * @returns {number} The sum of the two numbers.
 */
const add = (a, b) =>  a + b;

const x /** @type {number} */ = 5;
const y /** @type {number} */ = 10;
const sum = add(x, y);
console.log(`The sum is: ${sum}`);
```

<example>

- Always use `===` and `!==` over `==` and `!=`.
- Use `async/await` for asynchronous code over promises and callbacks.
- In TypeScript files, for primitive types, never add the types annotation.

<example>

```ts
const add = (a: number, b: number): number => a + b;
const x = 5; // No type annotation needed
const y = 10; // No type annotation needed
const sum = add(x, y);
console.log(`The sum is: ${sum}`);
```

</example>

</general_guidelines>

<naming_conventions>

- Use `camelCase` for variable and function names, and `PascalCase` for class names.
- Use `UPPER_SNAKE_CASE` for constants.

</naming_conventions>

<code_style>

- Always use double quotes for the strings and use semicolon at the end.
- To concatenate a string, always use template literals. And never use the `+` operator. In addition, use template literals for multi-line strings.
- Have preference for the functional programming paradigm rather than the imperative one and its characteristics such as immutability, higher order functions, pure functions, etc.

<example>

```ts
const salute = (name?: string = "John Doe"): string => `Hello, ${name}!`;
const toUpperCase = (str: string): string => str.toUpperCase();

const pipe = (...fns: Function[]) => (value: any) =>
  fns.reduce((acc, fn) => fn(acc), value);

const result = pipe(salute, toUpperCase)("Alice");
console.log(result); // "HELLO, ALICE!"
```

</example>

- To assigne variable, use `const` keyword. For reassignable variables use `let` and never use `var`. In case a variable dealts with resource management, use `using` keyword.

<example>

```js
const getConnection = async () => {
  const connection = await getDatabaseConnection();
  return {
    connection,
    [Symbol.asyncDispose]: async () => await connection.close()
  };
};
​
{
  await using db = getConnection();
  // Use db.connection for queries
}
// Connection is automatically closed here
```

<example>

<example>

```js
import { open } from "node:fs/promises";
​
const getFileHandle = async (path) => {
  const fileHandle = await open(path, "r");
  return {
    fileHandle,
    [Symbol.asyncDispose]: async () => await fileHandle.close()
  };
};
​
{
  await using file = getFileHandle("example.txt");
  // Operate on file.fileHandle
}
// File is automatically closed after this block
```

</example>

- Take advantage of the truthy and falsy values.
- Use for simple conditions the ternary operator instead of `if` statements. Use if for three levels of conditions and for more than four levels of conditions use `switch` statements.

<example>

```ts
const isLoggedIn = true;
const message = isLoggedIn ? "Welcome back!" : "Please log in.";
console.log(message); // "Welcome back!"
```

- Have preference for `for of` loop to iterate over arrays and `for in` loop to iterate over objects.
- Never use of `for` loop to fill arrays and use the array method methods.
- To increase an array use the spread operator and not the `push` method.
- To create asynchronous arrays, use the new `Array.fromAsync` method.
- To iterate for asynchronous operations, use `for await of` loop.

<example>

```ts
// Not recommended
const numbers = [];
for (let i = 0; i < 10; i++) {
  numbers.push(i);
}

// Recommended
const numbers = Array.from({ length: 10 }, (_, i) => i);

const moreNumbers = [10, 11, 12];
const allNumbers = [...numbers, ...moreNumbers];

async function* generateNumbers(): AsyncGenerator<number> {
  for (let i = 0; i < 3; i++) {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async operation
    yield i;
  }
}

const createArray = async (): Promise<void> => {
  const numbersArray = await Array.fromAsync(generateNumbers());
  console.log(numbersArray); // Output: [0, 1, 2]
};

createArray();
```

</example>

- Use the array methods like `map`, `filter`, `reduce`, `find`, `some`, `every`, etc. to manipulate arrays. Do not use `for` loops to manipulate arrays.
- To update, delete or add the information of an object using the spread operator.
- Use destructuring to extract values from arrays and objects.
- Avoid to get the value of an array by index, instead use the `at` method. Especially use the `at` method to get last value of an array. For example: `const lastItem = items.at(-1);`.

<example>

```ts
const person = { name: "Alice", age: 30, city: "Wonderland" };
const { name, age } = person; // Destructuring an object
const numbers = [1, 2, 3, 4, 5];
const [first, second, ...rest] = numbers; // Destructuring an array

const newPerson = { ...person, age: 31, city: "New Wonderland", phone: "123-456-7890" }; // Updating an object

const evenNumbers = numbers.map(num => num * 2);
const lastEvenNumber = evenNumbers.at(-1);
```

</example>

- Write arrow functions over normal functions and take advantage of the implicit return.
- When anonymous functions are used to process arrays, try to keep in one line and reduce the use of curly braces and `return` statements.
- Use default parameters for functions to provide default values.
- Use rest parameters to handle variable number of arguments.
- Use destructuring in function parameters to extract values from objects and arrays.

<example>

```ts
// Functions with destructured parameters
const printPerson = ({ name, age, city }): void =>
  console.log(`Name: ${name}, Age: ${age}, City: ${city}`);

const printCoordinates = ([x, y]: [number, number]): void =>
  console.log(`X: ${x}, Y: ${y}`);

const calculateSum = (...numbers: number[]): number =>
  numbers.reduce((total, num) => total + num, 0);

const greet = (name: string = "Guest"): string => `Hello, ${name}!`;


const coordinates: [number, number][] = [
  [10, 20, 30],
  [20, 30, 40],
  [30, 40, 50],
  [30, 40, 50],
  [30, 40, 50]
];

const xyCoordinates = coordinates.map(([x, y]) => ({ x, y }));
```

<example>

- Use optional chaining (`?.`) to safely access nested properties without throwing an error if a property is `null` or `undefined`.
- Use nullish coalescing operator (`??`) to provide a default value when dealing with `null` or `undefined`.
- Take advantage of the logical assignment operators (`&&=`, `||=`, `??=`) to conditionally assign values.

<example>

```ts
const user = {
  profile: {
    name: "Alice",
    age: 30,
    address: null
  }
};

const address = user.profile.address ?? "Unknown";
console.log(address); // Output: "Unknown"

const userProfile = {
  name: "Alice",
  age: 30,
  address: null
};

const userAddress = userProfile.address?.street ?? "No street provided";


const settings = {
  theme: "dark",
  notifications: null
};

/*
A real-world use case might be in feature flagging, where you want to ensure both a feature flag and some condition are met:
*/
let isFeatureEnabled = true;
let userIsAdmin = false;

// The feature will only be enabled for admin users
isFeatureEnabled &&= userIsAdmin;  // isFeatureEnabled becomes false

const greet = (name: string = ""): void => {
  name ||= "Guest";
  console.log(`Hello, ${name}!`);
};

greet(); // Outputs: "Hello, Guest!"
greet("Alice"); // Outputs: "Hello, Alice!"

/*
In scenarios where you only want to set a default if a variable is genuinely absent and not just falsy, this operator shines:
*/
let userPreferences = {
  theme: "",
  fontSize: null
};

userPreferences.theme ??= "dark";  // theme remains ""
userPreferences.fontSize ??= 16;   // fontSize becomes 16
```

</example>

- For error handling, use the `tryCatch` pattern for synchronous code to simulate Go's error handling. For asynchronous code, use `Promise.try` method.

<example>

```ts
const fetchData = (url: string): Promise<any> =>
  Promise.try(async () => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }).catch(error => {
    console.error("Error fetching data:", error);
    throw error;
  });

const tryCatch = <T>(fn: () => T): [T, null] | [null, unknown] => {
  try {
    const result = fn();
    return [result, null];
  } catch (error) {
    return [null, error];
  }
};

const [data, error] = tryCatch(() => JSON.parse('{"key": "value"}'));
if (error) {
  console.error("Error parsing JSON:", error);
} else {
  console.log("Parsed data:", data);
}
```
</example>

</code_style>