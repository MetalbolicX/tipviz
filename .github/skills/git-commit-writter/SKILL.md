---
name: 'git-commit-writter'
description: 'Generates standardized git commit messages following conventional commits spec.
Use when user asks to "write a commit message", "help me commit", "summarize my changes",
"what should my commit say", or "draft a commit". Analyzes staged diffs and change
descriptions to produce type(scope): description format messages.'
---

# Git Commit Message Writer

## Format

```text
type(scope): short description

[optional body]

[optional footer]
```

Allowed types: feat, fix, docs, style, refactor, test, chore, perf, ci, build

## Instructions

### Step 1: Get the diff

```sh
git diff --staged
```

If nothing is staged:

```sh
git diff HEAD
```

### Step 2: Analyze the changes

Look for:
- What files changed and what category they belong to
- Whether this adds new functionality (feat), fixes a bug (fix), or updates docs/config/tests
- The scope: which module, component, or area is affected

### Step 3: Write the message

- Keep the subject line under 72 characters
- Use imperative mood: "add feature" not "added feature"
- Do not end the subject line with a period
- Add a body if the change needs more context than the subject allows
- For details commit conventions, see [references/git-conventions.md](./references/git-conventions.md)

### Quality check

- [ ] Type is one of the allowed types
- [ ] Subject line is under 72 characters
- [ ] Imperative mood is used
- [ ] Scope is specific enough to be useful

## Examples

```text
feat(auth): add OAuth2 login with Google

Implements Google OAuth2 flow using the existing session management
system. Users can now sign in with their Google account.

Closes #142
```

```text
fix(api): handle null response from payment provider
```

```text
docs(readme): update local setup instructions for Node 22
```
