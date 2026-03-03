---
description: Format, lint, simplify, update devlog, and commit (no push)
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Task, TodoWrite
---

# Polish and Push Workflow

Execute this workflow step by step. NEVER push to remote - only commit locally.

## Step 1: Format and Lint

Run formatting and linting:

```bash
npm run format
npm run lint
```

If lint fails, fix the issues and re-run until it passes. Do not proceed until lint passes.

## Step 2: Check Modified Files

Get list of modified files (staged and unstaged):

```bash
git diff --name-only HEAD
git diff --name-only --cached
```

If no modified files, inform user and stop.

## Step 3: Code Simplification Review

Use the code-simplifier agent (via Task tool with subagent_type "code-simplifier:code-simplifier") to review ONLY the modified files from Step 2.

Tell the agent to focus on:
- Unnecessary complexity
- Code that could be cleaner
- Redundant logic

**CRITICAL**: If the code-simplifier suggests any improvements:
1. Show the suggestions to the user
2. STOP the workflow - do NOT proceed to devlog or commit
3. Tell user to fix issues and run `/polish-and-push` again

Only proceed to Step 4 if code-simplifier confirms the code is clean.

## Step 4: Update Devlog

Today's date for devlog filename: !`date +%Y-%m-%d`

Read the current devlog file if it exists: `docs/devlog/YYYY-MM-DD.md`

Add or update an entry summarizing what changed in this session based on:
- Git diff summary
- Files modified
- Nature of changes

Write in Polish, John Carmack .plan style - direct, technical, no fluff. Keep it concise.

If the file doesn't exist, create it with proper structure:
```markdown
# YYYY-MM-DD

## Co zrobione

- [changes here]

## Notatki techniczne

[optional observations]
```

## Step 5: Commit

Stage all changes including the devlog:

```bash
git add -A
```

Generate a concise commit message based on the changes. Follow conventional commits style.

Create the commit:

```bash
git commit -m "$(cat <<'EOF'
<type>: <description>

<optional body>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

## IMPORTANT

- NEVER run `git push` - user will push manually
- If any step fails, stop and report to user
- Keep devlog entries concise and technical
