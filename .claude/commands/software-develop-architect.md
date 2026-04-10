---
description: "Writes a 6-phase precision design document. Performs requirement sufficiency assessment → interview → analysis → architecture decision → design document writing → self-review."
---

Input: $ARGUMENTS

## Execution

Read the `.claude/agents/software-develop-architect.md` file using the Read tool, and follow the instructions of that agent to write the design document.

### Input Passing
- Use `$ARGUMENTS` as the requirements
- If no output path is specified, save to `specs/features/{feature name}/design.md`

### Notes
- This command **writes design documents only**. It does not perform implementation, review, or testing.
- If implementation is needed after design, use `/workflow-automate` referencing the design document.

### Judge Evaluation

After the design document is saved:

Use subagent architect-judge to evaluate [설계 문서가 저장된 경로]

Judge 완료 후 결과를 사용자에게 출력:
- action이 AUTO_APPROVED: `✅ Judge 자동 승인 (score: N) — {reason}`
- action이 NEEDS_REVIEW: `⚠️ Judge 검토 필요 (score: N) — {reason}`

## Usage Examples

```
/software-develop-architect 장비 모니터링 대시보드 기능 추가
/software-develop-architect specs/features/login/design.md 출력 경로로 로그인 기능 설계
```