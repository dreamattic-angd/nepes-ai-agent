# Code Review — Project-Specific Checklists

> 이 파일은 `review-full.md`의 Section 4 참조 파일입니다.
> 프로젝트별 패턴 확인이 필요할 때 Read tool로 불러옵니다.

**목적**: 프로젝트별(Java Backend, Vue.js Frontend) 코드 패턴 체크리스트를 제공한다. `review-full.md`에서 참조 파일로 불러와 사용한다.

## Output Format

각 체크리스트 항목은 Critical/Warning/Suggestion 심각도로 분류하여 리뷰 리포트에 포함한다.

## Phase 0: Java Backend 패턴 확인

> **이동됨**: Java Backend 패턴은 `.claude/agents/code-review/review-java.md`로 통합되었습니다.
> Java 전용 리뷰가 필요할 경우 `java-code-reviewer` 에이전트가 자동으로 해당 파일을 참조합니다.

## Phase 1: Vue.js Frontend 패턴 확인

> **이동됨**: Vue.js / JS/TS Frontend 패턴은 `.claude/agents/code-review/review-js.md`로 통합되었습니다.
> JS/TS 전용 리뷰가 필요할 경우 `js-code-reviewer` 에이전트가 자동으로 해당 파일을 참조합니다.

## Error Handling

- 참조 파일 로드 실패 시: 해당 체크리스트 섹션을 skip하고 리뷰 계속 진행.
- 패턴 미해당 시: 체크리스트 항목을 N/A로 처리.

---

## Node.js / JavaScript (hooks, scripts)

> **이동됨**: Node.js / JavaScript 패턴은 `.claude/agents/code-review/review-js.md`로 통합되었습니다.
> 전체 JS/TS 체크리스트(async error handling, env variable access, sequential async, sync blocking 등)를 해당 파일에서 확인하십시오.

---

## Java Backend

> **이동됨**: Java Backend 패턴은 `.claude/agents/code-review/review-java.md`로 통합되었습니다.
> DB connection management, ActiveMQ resource management, hardcoded config, Spring/JPA 패턴 등을 해당 파일에서 확인하십시오.

---

## Vue.js Frontend

> **이동됨**: Vue.js Frontend 패턴은 `.claude/agents/code-review/review-js.md`로 통합되었습니다.
> Reactivity system, API error handling 등의 패턴을 해당 파일에서 확인하십시오.
