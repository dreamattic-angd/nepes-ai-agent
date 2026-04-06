# Implementation Tasks (bugfix)

## Task List
| Order | Task | File | Status | Notes |
|-------|------|------|--------|-------|
| A-1 | agent 파일 생성 (frontmatter + Phase 0~4 본문) | `.claude/agents/ai-guideline-orchestrator.md` | Done | frontmatter 필드 누락 없음 (name, description, model, tools) |
| A-2 | Phase 0: 입력 파싱 및 경로 검증 구현 | `.claude/agents/ai-guideline-orchestrator.md` | Done | Glob으로 경로 검증, 없으면 오류 출력 후 중단 |
| A-3 | Phase 1: 분석 agent 호출 및 CP-1 구현 | `.claude/agents/ai-guideline-orchestrator.md` | Done | ai-guideline-analyzer 호출 → 리포트 Read → CP-1 출력 → 사용자 응답 처리 |
| A-4 | Phase 3: 수정 agent 호출 및 결과 수집 구현 | `.claude/agents/ai-guideline-orchestrator.md` | Done | ai-guideline-fixer 호출 → Fix 리포트 Read → Phase 4 최종 보고 |
| B-1 | Phase 2: 10개 초과 시 CP-2 재확인 구현 | `.claude/agents/ai-guideline-orchestrator.md` | Done | fix_count > 10 조건부 실행, 경고 출력 후 사용자 응답 처리 |
| B-2 | FR-09: 사용자 거부 시 정상 종료 처리 | `.claude/agents/ai-guideline-orchestrator.md` | Done | CP-1/CP-2 거부 시 분석 리포트 경로 출력 후 정상 종료 |
| B-3 | Self-Verification 섹션 추가 | `.claude/agents/ai-guideline-orchestrator.md` | Done | 체크리스트 7개 포함 |
| BF-1 | W1 — Phase 0 경로 검증: 빈 디렉토리 오탐 수정 | `.claude/agents/ai-guideline-orchestrator.md` | Done | Glob 결과 0개를 유효 경로로 허용, 오류 위임 구조 명시 |
| BF-2 | W2 — CP-1 응답 처리: 3-way 분기로 변경 | `.claude/agents/ai-guideline-orchestrator.md` | Done | 명시적 승인/거부/재질문 분기 적용 |
| BF-3 | W2 — CP-2 응답 처리: 3-way 분기로 변경 | `.claude/agents/ai-guideline-orchestrator.md` | Done | 명시적 승인/거부/재질문 분기 적용 |
| BF-4 | W3 — fix_count fallback = 분석된 파일 수 (M) | `.claude/agents/ai-guideline-orchestrator.md` | Done | 2차 파싱 실패 시 M 상한값 fallback + Assumption 인라인 주석 추가 |
| BF-5 | W3 — Assumption 주석 업데이트 | `.claude/agents/ai-guideline-orchestrator.md` | Done | 분석된 파일 수를 fix_count 상한값으로 사용하는 fallback 전략 반영 |
| BF-6 | Suggestion — Fix 리포트 Read limit: 100 → 150 변경 | `.claude/agents/ai-guideline-orchestrator.md` | Done | Phase 3-2 Read 호출 limit:150 적용 및 이유 주석 추가 |
| BF-7 | W2 — CP-1/CP-2 승인 토큰에 "진행" 추가, 거부 토큰에 "취소"/"중단" 추가 | `.claude/agents/ai-guideline-orchestrator.md` | Done | review.md 수정 방향 준수 |

## Changed Files Summary
| File | Change Type | Lines Changed |
|------|------------|--------------|
| `.claude/agents/ai-guideline-orchestrator.md` | Modified | +35 / -12 |
