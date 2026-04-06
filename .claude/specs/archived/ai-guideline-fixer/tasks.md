# Implementation Tasks

## Task List

| Order | Task | File | Status | Notes |
|-------|------|------|--------|-------|
| 1 | Phase A: Command 구현 (FR-01) | `.claude/commands/ai-guideline-fixer.md` | Done | 입력 파싱 규칙, Agent tool 위임, Usage Examples 포함 |
| 2 | Phase B: Agent 리포트 파싱 (FR-02, FR-03, FR-10) | `.claude/agents/ai-guideline-fixer.md` | Done | Phase 0 (파싱), Phase 1 (정렬) 구현 |
| 3 | Phase C: In-scope 수정 로직 (FR-04, FR-05, FR-06, FR-09) | `.claude/agents/ai-guideline-fixer.md` | Done | Phase 2 (파일별 수정) 구현, S1~S8 + Adaptive Fix Rules 포함 |
| 4 | Phase D: Fix Report 저장 (FR-07, FR-08) | `.claude/agents/ai-guideline-fixer.md` | Done | Phase 3 (Fix Report 저장) 구현, 터미널 출력 포함 |
| 5 | [bugfix] S8 수정 대상 선별 기준 통일 | `.claude/agents/ai-guideline-fixer.md` | Done | Phase 0 line 66: "S7/S8이 3점 미만" → "S7이 3점 미만이거나 S8이 5점 미만"으로 수정 |
| 6 | [bugfix] Warning 1: 중복 bullet 목록 제거 | `.claude/commands/ai-guideline-fixer.md` | Done | 표(19-23행) 유지, bullet 목록(25-30행) 삭제 |
| 7 | [bugfix] Warning 2: `--output` 값 없는 엣지 케이스 추가 | `.claude/commands/ai-guideline-fixer.md` | Done | 표에 4번째 행 추가, 오류 메시지 지정 |

## Changed Files Summary

| File | Change Type | Lines Changed |
|------|------------|--------------|
| `.claude/commands/ai-guideline-fixer.md` | New | +60 |
| `.claude/agents/ai-guideline-fixer.md` | New | +195 |
| `.claude/specs/ai-guideline-fixer/tasks.md` | New | +20 |
| `.claude/agents/ai-guideline-fixer.md` | Modified (bugfix) | +1 / -1 |
| `.claude/commands/ai-guideline-fixer.md` | Modified (bugfix) | +1 / -6 |

## Design Compliance Notes

- command: `ai-guideline-analyzer.md` 패턴을 그대로 따름 (frontmatter, Step 구조, Usage Examples)
- agent: `ai-guideline-analyzer.md` 패턴을 그대로 따름 (frontmatter fields, Phase 구조, Self-Verification 테이블)
- Frontmatter `tools`: 디자인 명세(`Read, Grep, Edit, Write, Glob`)와 정확히 일치
- Out-of-scope 항목(S5, S7)은 Fix Rules 표 및 예외 처리 섹션 양쪽에 명시
- S8 모호 표현 교체 매핑 8개 항목 모두 포함
- 에러 케이스(파일 없음, 파싱 실패, Edit 실패 등) 모두 예외 처리 섹션에 기술
