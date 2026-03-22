#!/usr/bin/env bash
# Outputs the git diff for LLM analysis.

# Ensure we are inside a git repository
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "Error: Not a git repository. Please run this command from within a git repository."
  exit 1
fi

STAGED_DIFF=$(git diff --staged)

if [ -n "$STAGED_DIFF" ]; then
  echo "--- STAGED CHANGES ---"
  echo "$STAGED_DIFF"
else
  UNSTAGED_DIFF=$(git diff)
  if [ -n "$UNSTAGED_DIFF" ]; then
    echo "--- UNSTAGED CHANGES ---"
    echo "Note: These changes are not yet staged for commit."
    echo "$UNSTAGED_DIFF"
  else
    echo "No changes found. The working tree is clean."
  fi
fi
