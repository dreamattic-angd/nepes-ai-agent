# PR Review

Analyzes a GitHub Pull Request and performs a code review.

Target: $ARGUMENTS (PR number or PR URL)

## Execution Order

1. Collect PR information: Execute Phase 1 of `.claude/agents/pr-review/review-pr.md`
2. Analyze changes: Execute Phase 2 (4-perspective review)
3. Write review comments: Execute Phase 3
4. Submit after user confirmation: Execute Phase 4

## Usage Examples

```
Review PR 123
https://github.com/user/repo/pull/123 review
```

## Prerequisites

- `gh` CLI is installed and authentication is complete
- Git repository is connected to GitHub