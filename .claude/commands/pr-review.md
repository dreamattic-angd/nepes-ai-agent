# PR Review

Analyzes a GitHub Pull Request and performs a code review.

Target: $ARGUMENTS (PR number or PR URL)

## Execution Order

1. Collect PR information: Execute Phase 1 of `.claude/agents/pr-review/review-pr.md`
2. Analyze changes: Execute Phase 2 (4-perspective review)
3. Write review comments: Execute Phase 3
4. Submit after user confirmation: Execute Phase 4
5. Judge evaluation: After Phase 3 review draft is written,

   Use subagent pr-review-judge to evaluate [PR 리뷰 초안이 저장된 경로]

   Judge 완료 후 결과를 사용자에게 출력:
   - action이 AUTO_APPROVED: `✅ Judge 자동 승인 (score: N) — {reason}`
   - action이 NEEDS_REVIEW: `⚠️ Judge 검토 필요 (score: N) — {reason}`

## Usage Examples

```
Review PR 123
https://github.com/user/repo/pull/123 review
```

## Prerequisites

- `gh` CLI is installed and authentication is complete
- Git repository is connected to GitHub