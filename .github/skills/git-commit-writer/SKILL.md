---
name: 'git-commit-writer'
description: 'Generates standardized git commit messages following the conventional commits spec.
Use when user asks to "write a commit message", "help me commit", "summarize my changes",
"what should my commit say", or "draft a commit". Analyzes staged diffs and change
descriptions to produce type(scope): description format messages. Works in chat panels or via direct CLI piping.'
---

# Git Commit Message Writer

## Format

```
type(scope): short description

[optional body]

[optional footer]
```

Allowed types: feat, fix, docs, style, refactor, test, chore, perf, ci, build. For further reading: [Conventional Commits Specification](./references/git-conventions.md)

## Instructions, Execution Pipeline

### Retrieve Staged State (Auto-Execute)

Immediately execute this command in the terminal to capture the staged diff:

```sh
./.github/skills/git-commit-writer/scripts/get-git-diff.sh
```

- _Halt condition: If the output is "No changes found" or "Not a git repository", terminate the pipeline and notify the user_.
- Read the output carefully. If the output states "No changes found" or "Not a git repository", halt the process and inform the user.

### Step 2: Analyze the changes

Parse the output of the script as your raw input. Map the changes to the conventional commit schema:

- **Scope**: Identify the specific architectural domain, module, or component modified. Keep it lowercase and concise.
- **Type**: Categorize the core intent (e.g., `feat` for new functionality, `refactor` for logic restructuring without behavioral changes, `chore` for tooling).
- **Intent**: Isolate the single most critical change.

### Step 3: Write the message

Draft the commit message adhering strictly to these constraints:

- Subject line must be `< 72` characters.
- Subject line must use the imperative mood (e.g., "add", not "added" or "adds").
- Subject line must not end with a period.
- If context (the "why" or "how") is needed, append a body. Wrap body text strictly at 72 characters.
- Use the footer for breaking changes or issue tracker references (e.g., Closes #123, BREAKING CHANGE: ...).

### Step 4: Output the Final Command

Output the final, execution-ready command inside a `bash` code block. **Do not execute this final git commit command yourself**. Hand it off to the user for final review and execution.

Format multiple lines using sequential `-m` flags to prevent terminal formatting errors.

Example output format:

```sh
git commit -m "feat(auth): add OAuth2 login with Google" -m "Implements Google OAuth2 flow using the existing session management system. Users can now sign in with their Google account." -m "Closes #142"
```

## Quality Check (Internal)

Before generating the final bash block, silently verify:

- [ ] Pipeline step 1 was executed automatically via terminal tool.
- [ ] type is strictly from the allowed list.
- [ ] Subject line uses imperative mood and is `< 72` chars.
- [ ] Output contains ONLY the bash block and any necessary fatal error messages. No conversational padding ("Here is your command!").
