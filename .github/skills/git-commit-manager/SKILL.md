---
name: 'git-commit-manager'
description: 'Automates the creation of high-quality git commits. Handles reviewing/staging changes, splitting logical boundaries, and generating standardized Conventional Commits. Use when the user asks to commit, draft a message, stage changes, or split work.'
---

# Git Commit Manager

## Goal

Make commits that are easy to review, safe to ship, and strictly formatted. Ensure only intended changes are included, commits are logically scoped, and messages cleanly describe what changed and why.

## Format Specification

- **Conventional Commits Required:** `type(scope): short description`.
- **Allowed Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`.
- **Scope:** Lowercase, concise (e.g., architectural domain, module, or component).
- For further details: [Git conventions](./references/git-conventions.md).

---

## Execution Pipeline

### Step 1: Inspect & Stage Boundaries

1. **Inspect:** Check the working tree using `git status` and `git diff` (unstaged). For large diffs, use `git diff --stat`.
2. **Decide Boundaries:** Split unrelated changes (e.g., feature vs. refactor, backend vs. frontend, logic vs. formatting). *If unsure whether to use single or multiple commits, ask the user or default to multiple small commits.*
3. **Stage:** Stage logically scoped changes. Prefer patch staging for files with mixed changes: `git add -p`. To unstage, use `git restore --staged <path>`.
4. **Sanity Check:** Review staged changes (`git diff --cached`). Ensure no secrets, accidental debug logs, or unrelated formatting churn are included.

### Step 2: Analyze Changes

Parse the script output and map the changes to the schema:

1. **Type:** Categorize the core intent from the allowed list.
2. **Scope:** Identify the specific domain modified.
3. **Intent:** Isolate the critical "what" and "why" in 1-2 sentences. *Note: If the staged changes cannot be described cleanly in a single sentence, the commit is too broad. Return to Step 1 and split the changes.*

### Step 3: Draft the Message

Strictly adhere to these formatting constraints:

1. **Subject Line:** Must be less than 72 characters, use the imperative mood (e.g., "add", not "added" or "adds"), and must not end with a period.
2. **Body (Optional):** Wrap text strictly at 72 characters. Explain the "why" and "how" (do not write an implementation diary).
3. **Footer (Optional):** Use for breaking changes (`BREAKING CHANGE: ...`) or issue tracker references (`Closes #123`).

### Step 4: Verification & Output

1. **Verify:** Run the repository's fastest meaningful check (e.g., unit tests, linting, or build) on the staged code before moving on.
2. **Output:** Provide the final, execution-ready command inside a bash code block. Format multiple lines using sequential `-m` flags to prevent terminal formatting errors.
3. **Hand-off:** Do not execute the final `git commit` command yourself. Hand it off to the user for final review and execution.

---

## Quality Check (Internal)

Before generating the final bash block, silently verify:

- Pipeline Step 2 was executed automatically via the terminal tool.
- `type` is strictly from the allowed list.
- Subject line uses the imperative mood and is < 72 characters.
- The output contains ONLY the bash block and any necessary fatal error messages. **Strictly avoid conversational padding** (e.g., "Here is your command!").

### Example Output
```bash
git commit -m "feat(auth): add OAuth2 login with Google" -m "Implements Google OAuth2 flow using the existing session management system. Users can now sign in with their Google account." -m "Closes #142"
```
