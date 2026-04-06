# Implementation Tasks

## Task List

| Order | Task | File | Status | Notes |
|-------|------|------|--------|-------|
| 1 | Command 파일 작성 | `.claude/commands/ai-guideline-analyzer.md` | Done | frontmatter + 입력 파싱 + agent 위임 + 결과 출력 구현 |
| 2 | Agent 파일 작성 | `.claude/agents/ai-guideline-analyzer.md` | Done | Phase 0-4 전체, Static Rubric S1-S8, Adaptive Rubric, 점수 공식, 병렬 Sub-agent 프롬프트, Self-Verification 구현 |
| 3 | [CR Fix] S7 줄 수 카운트 — Bash 제거, Read tool 기반으로 교체 | `.claude/agents/ai-guideline-analyzer.md` | Done | line 151: `wc -l {file_path}` 구문 삭제, Read tool 사용 및 마지막 줄 번호 활용 명시 |
| 4 | [CR Fix] 분석 시작 시 터미널 출력 형식 추가 (Section 9.2) | `.claude/commands/ai-guideline-analyzer.md` | Done | Step 2에 분석 시작 메시지 출력 형식 블록 추가, agent Phase 0 담당임을 명시 |
| 5 | [CR Fix] command-agent 출력 책임 계약 명확화 | `.claude/commands/ai-guideline-analyzer.md` | Done | Step 3을 "완료 확인"으로 재작성, command는 별도 출력 없음 명시 |
| 6 | [CR Fix] Sub-agent JSON 파싱 실패 폴백 처리 추가 | `.claude/agents/ai-guideline-analyzer.md` | Done | 결과 병합 섹션에 파싱 실패 시 에러 레코드 형식 및 계속 진행 규칙 추가 |
| 7 | [review.md Critical] Sub-agent 프롬프트 S7에 Bash 금지 제약 추가 | `.claude/agents/ai-guideline-analyzer.md` | Done | Sub-agent 프롬프트 S7 항목에 IMPORTANT 3줄 제약 삽입. S8 모호 표현 목록 5개→8개 통일 |
| 8 | [review.md Warning] Phase 1 출력을 단일 4줄 블록으로 통합 | `.claude/agents/ai-guideline-analyzer.md` | Done | Phase 0 중간 출력 제거(메모로 변경), Phase 1 분류 완료 후 분석 방식 포함 4줄 블록을 한 번에 출력 |
| 9 | [review.md Warning] command 파일 시작 메시지 코드 블록 역할 명확화 | `.claude/commands/ai-guideline-analyzer.md` | Done | 모호한 참고 코드 블록 제거, Step 3에 "Phase 1 분류 완료 시점에 출력" 명시 |
| 10 | [review2 Warning] Phase 2 실행 방식 결정 테이블을 Phase 1으로 이동 | `.claude/agents/ai-guideline-analyzer.md` | Done | "분류 완료 후" 섹션에 결정 테이블 추가, Phase 2 헤더를 "Phase 1에서 결정된 방식에 따라 진행"으로 대체하여 전방 참조 해소 |
| 11 | [review2 Suggestion] Phase 1 ambiguous 케이스 Read 시 limit: 50 명시 | `.claude/agents/ai-guideline-analyzer.md` | Done | Step 2 안내문을 "Read tool(limit: 50)로 상위 50줄만 읽어 판단"으로 변경, 50줄 판단 불가 시 전체 Read 폴백 명시 |

## Changed Files Summary

| File | Change Type | Lines Changed |
|------|------------|--------------|
| `.claude/commands/ai-guideline-analyzer.md` | New | +50 |
| `.claude/agents/ai-guideline-analyzer.md` | New | +260 |
| `.claude/commands/ai-guideline-analyzer.md` | Modified (CR Fix round 1) | +14 / -4 |
| `.claude/agents/ai-guideline-analyzer.md` | Modified (CR Fix round 1) | +7 / -1 |
| `.claude/agents/ai-guideline-analyzer.md` | Modified (review.md fix) | +13 / -10 |
| `.claude/commands/ai-guideline-analyzer.md` | Modified (review.md fix) | +2 / -6 |
| `.claude/agents/ai-guideline-analyzer.md` | Modified (review2.md fix) | +12 / -7 |
