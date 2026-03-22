---
applyTo: '**'
description: 'Core conventions for clean, secure, and efficient code generation.'
---

# Global Coding Standards

## 1. Operational Constraints
- **Precision:** Do not speculate. Ask for clarification if requirements are ambiguous.
- **Atomic Changes:** Modify files one at a time.
- **Zero Verbosity:** Never apologize, explain "understanding," or summarize changes.
- **Code Only:** Do not output whitespace-only changes or "before/after" comparisons unless requested.
- **Safety:** Prioritize performance, security, and robust error handling with user-friendly messages.

## 2. Clean Code & Naming
- **Booleans:** Prefix with `is`, `has`, `can`, or `should` (e.g., `isUserLoggedIn`, `hasPermission`).
- **Functions:** Use action verbs (e.g., `fetchData`, `validateForm`).
- **Clarity:** Use descriptive names over abbreviations, except for standard industry terms (API, URL) or specific library conventions (e.g., `d, i` in D3).
- **Constants:** Replace hardcoded values with `UPPER_SNAKE_CASE` constants.

<example>
// Good: Descriptive, Constant usage, Action-based function
const TAX_RATE = 0.2;
function calculateFinalPrice(basePrice: number): number {
  return basePrice * (1 + TAX_RATE);
}
</example>

## 3. Logic & Control Flow
- **Early Returns:** Avoid deep nesting. Use guard clauses to handle edge cases first.
- **Modularity:** Design for reusability and single responsibility.

<example>
// Recommended: Guard clauses reduce nesting
function processOrder(order: Order): Result {
  if (!order.isValid) return { error: "Invalid" };
  if (order.isProcessed) return { error: "Duplicate" };

  return executeProcessing(order);
}
</example>
