---
description: "설계→구현→리뷰→테스트 워크플로우를 자동 실행합니다. 입력 내용을 분석하여 모드(신규 기능/버그 수정/새 프로젝트)를 자동 판별합니다."
---

**먼저 .claude/workflow-rules.md 파일을 Read 도구로 읽고 규칙을 숙지하라. 이후 아래를 실행하라.**

입력: $ARGUMENTS

당신은 **오케스트레이터**입니다. 직접 설계·코딩·리뷰·테스트하지 않습니다.
각 Phase에서 전문 서브에이전트를 호출하고, 결과를 확인하며, 체크포인트에서 사용자 승인을 받습니다.

---

## Step 0: 모드 자동 판별

입력($ARGUMENTS)을 분석하여 아래 3가지 모드 중 하나를 결정하라:

### 판별 기준

| 모드 | 키워드/패턴 | 예시 |
|------|-----------|------|
| **bugfix** | 버그, 수정, 오류, 에러, fix, 안됨, 깨짐, 실패, 이슈번호(#123) | "결제 금액이 0원으로 표시됨", "#42 로그인 실패" |
| **project** | 만들어, 생성, 새 프로젝트, 새로, 처음부터, init, create, 앱 | "todo app 만들어줘", "블로그 플랫폼 생성" |
| **feature** | 추가, 기능, 구현, 넣어, 개선, 연동, add, 붙여 | "로그인 기능 추가", "다크모드 구현해줘" |

### 판별 우선순위
1. 이슈번호(#숫자)가 있으면 → **bugfix**
2. 프로젝트 루트에 소스 코드가 없으면(빈 프로젝트) → **project**
3. 수정/오류/버그 관련 키워드 → **bugfix**
4. 생성/만들어 키워드 + 현재 소스 코드 없음 → **project**
5. 그 외 → **feature**

### 애매한 경우
판별이 불확실하면 사용자에게 확인:
```
입력을 분석했습니다: "{$ARGUMENTS}"

아래 중 어떤 작업인가요?
1. 🐛 버그 수정 — 기존 코드의 문제를 수정
2. ✨ 신규 기능 — 기존 프로젝트에 기능 추가
3. 🚀 새 프로젝트 — 처음부터 프로젝트 생성
```

### 모드 확정 출력
```
🔍 모드 판별: {bugfix / feature / project}
📝 작업: {$ARGUMENTS 요약}
```

---

## MODE: feature (신규 기능)

**작업명 추출:** 입력에서 기능명을 추출한다. (예: "로그인 기능 추가" → 기능명="로그인")

### Phase 1: 설계 (architect)

```
Use subagent architect to design feature "{기능명}".
MODE: feature
Output to: specs/features/{기능명}/design.md
Analyze the current project structure and create a complete design document.
```

자체 검증:
- [ ] design.md 생성 확인
- [ ] 완료 기준(EARS) 포함 확인
- [ ] 구현 태스크 파일 단위 분해 확인

→ CHECKPOINT-1 출력 → **사용자 응답 대기**

### Phase 2: 구현 + 리뷰 (y 후)

```
Use subagent developer to implement feature "{기능명}".
MODE: feature
Reference: specs/features/{기능명}/design.md
Follow the design document exactly. Do not deviate from the specified interfaces and scope.
```

developer 완료 → 즉시 code-reviewer 호출:

```
Use subagent code-reviewer to review all modified files for feature "{기능명}".
Reference: specs/features/{기능명}/design.md
Review the implementation against the design document. Focus on: design alignment, code quality, security, performance.
```

→ CHECKPOINT-2 출력 → **사용자 응답 대기**

n 시: developer → code-reviewer 재실행

### Phase 3: 테스트 (y 후)

```
Use subagent tester to write and run tests for feature "{기능명}".
MODE: feature
Reference: specs/features/{기능명}/design.md
Write tests based on completion criteria in the design document. Run all tests and report results.
```

→ CHECKPOINT-3 출력 → **사용자 응답 대기**

y 시: `git add -A && git commit -m "feat: {기능명} - 설계·구현·테스트 완료"`

---

## MODE: bugfix (버그 수정)

**이슈 파싱:** 입력에서 이슈번호와 설명을 분리한다.
- "#123 결제 오류" → 이슈번호=123, 설명=결제 오류
- "결제 금액이 0원" → 이슈번호=날짜(YYYYMMDD), 설명=전체 텍스트

### Phase 1: 분석 (architect)

```
Use subagent architect to analyze bug "{이슈}".
MODE: bugfix
Output to: specs/bugs/{이슈번호}/analysis.md
Investigate the root cause (not symptoms). Find the minimal fix with least side effects.
```

자체 검증:
- [ ] analysis.md 생성 확인
- [ ] 근본 원인 파일명:라인번호 명시 확인
- [ ] 수정 방향 최소 침습 확인

→ CHECKPOINT-1 출력 → **사용자 응답 대기**

### Phase 2: 수정 + 리뷰 (y 후)

```
Use subagent developer to fix bug "{이슈}".
MODE: bugfix
Reference: specs/bugs/{이슈번호}/analysis.md
Apply the minimal fix described in the analysis. Do NOT modify anything outside the specified scope.
```

developer 완료 → 즉시 code-reviewer 호출:

```
Use subagent code-reviewer to review the bug fix for "{이슈}".
Reference: specs/bugs/{이슈번호}/analysis.md
Focus on: regression risk, side effects, minimal change principle.
```

→ CHECKPOINT-2 출력 → **사용자 응답 대기**

### Phase 3: 회귀 테스트 (y 후)

```
Use subagent tester for regression testing of bug fix "{이슈}".
MODE: bugfix (regression)
Reference: specs/bugs/{이슈번호}/analysis.md
Verify: (1) the reported bug is fixed, (2) related features still work correctly.
```

→ CHECKPOINT-3 출력 → **사용자 응답 대기**

y 시: `git add -A && git commit -m "fix: {이슈번호} - {버그 요약}"`

---

## MODE: project (새 프로젝트)

**프로젝트명 추출:** 입력에서 프로젝트명을 추출한다. (예: "todo app 만들어줘" → 프로젝트명="todo-app")

### Phase 1: 아키텍처 설계 (architect)

```
Use subagent architect to design new project "{프로젝트명}".
MODE: project
Output to: specs/requirements.md and specs/architecture.md
Create complete requirements (MoSCoW) and architecture documents.
```

자체 검증:
- [ ] requirements.md 생성 (Must/Should/Could/Won't)
- [ ] architecture.md 생성 (기술 스택, 디렉토리, 컴포넌트)
- [ ] Must 기능 구현 경로 명확

→ CHECKPOINT-1 출력 → **사용자 응답 대기**

### Phase 2: 구현 + 리뷰 (y 후)

```
Use subagent developer to implement new project "{프로젝트명}".
MODE: project
Reference: specs/architecture.md and specs/requirements.md
Steps:
1. Create directory structure from architecture.md
2. Generate project config files (package.json/pom.xml etc.)
3. Save task list to specs/tasks.md (ordered by MoSCoW priority)
4. Implement Must features first, then Should, then Could
```

developer 완료 → 즉시 code-reviewer 호출:

```
Use subagent code-reviewer to review the entire new project "{프로젝트명}".
Reference: specs/architecture.md
Focus on: architecture alignment, code quality, security basics, project structure.
```

→ CHECKPOINT-2 출력 → **사용자 응답 대기**

### Phase 3: 테스트 (y 후)

```
Use subagent tester to write and run a test suite for new project "{프로젝트명}".
MODE: project
Reference: specs/requirements.md
Coverage targets: Must features 100%, Should features 80%+.
Write unit tests per component and integration tests for main user flows.
```

→ CHECKPOINT-3 출력 → **사용자 응답 대기**

y 시: `git init && git add -A && git commit -m "feat: {프로젝트명} initial commit - 설계·구현·테스트 완료"`

---

## 공통: "s" (상태) 처리

사용자가 "s"를 입력하면 workflow-rules.md의 상태 출력 형식을 따라 현재 진행 현황 출력.
