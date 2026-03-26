# Phase 1 — 변경사항 분석

## 역할
변경된 파일을 분석하여 commit type을 분류하고, ITSM 티켓을 확인한 뒤, 사용자에게 요약을 보여준다.

## 수행 절차

### 1단계: 변경 파일 확인

```bash
git status
```

변경사항이 없으면 아래를 출력하고 **즉시 종료**한다:
```
변경된 파일이 없습니다. 워크플로우를 종료합니다.
```

### 2단계: 현재 브랜치 확인

```bash
git branch --show-current
```

**차단 브랜치 목록:**
아래 브랜치에서 실행된 경우, 사용자 선택지 없이 즉시 종료한다.

| 차단 브랜치 |
|------------|
| 12'_2025_NEW_EQPs |

```
⛔ '{브랜치명}'은(는) 보호 브랜치입니다. 이 브랜치에서는 git-workflow를 실행할 수 없습니다.
워크플로우를 종료하고, 사용자의 원래 요청을 Claude Code 기본 동작으로 수행합니다.
```

워크플로우 종료 후 **Claude Code 기본 git 동작**(워크플로우의 브랜치 전략·버전 체계·태깅 규칙 적용 없이)으로 사용자의 원래 요청을 이어서 처리한다.

**차단 브랜치가 아닌 경우 아래 분기를 따른다:**

#### develop 브랜치 자동 준비

{MAIN_BRANCH} 또는 develop에 있을 때, develop 브랜치를 자동으로 준비한다.
사용자 확인 없이 자동 실행하며, 수행한 작업을 안내 메시지로 출력한다.

```bash
# develop 존재 확인
git branch --list develop
```

- **develop이 없는 경우** → {MAIN_BRANCH}에서 자동 생성:
  ```bash
  git checkout -b develop
  ```
  ```
  ℹ️ develop 브랜치가 없어 {MAIN_BRANCH}에서 새로 생성했습니다.
  ```

- **develop이 있고 {MAIN_BRANCH}에 있는 경우** → develop으로 이동 후 동기화 확인:
  ```bash
  git checkout develop
  # develop이 main보다 뒤처져 있는지 확인
  git log develop..{MAIN_BRANCH} --oneline
  ```
  - 뒤처진 커밋이 있으면 → {MAIN_BRANCH}를 develop에 머지하여 동기화:
    ```bash
    git merge {MAIN_BRANCH} --no-ff -m "merge: sync {MAIN_BRANCH} into develop"
    ```
    ```
    ℹ️ develop이 {MAIN_BRANCH}보다 뒤처져 있어 동기화했습니다.
    ```
  - 동일하면 → 그대로 사용

- **이미 develop에 있는 경우** → 그대로 진행

#### 브랜치 분기

- develop에 있으면 → 정상 (Phase 2에서 feature 브랜치를 생성한다)
- 이미 feature/bugfix 브랜치에 있으면 → 사용자에게 확인:
  ```
  현재 '{브랜치명}' 브랜치에 있습니다.
  1. 이 브랜치에서 계속 작업 (새 브랜치 안 만듦)
  2. develop으로 돌아가서 새 브랜치 생성

  선택해주세요 (1/2):
  ```
- 그 외 브랜치에 있으면 → 경고:
  ```
  ⚠️ 현재 '{브랜치명}' 브랜치에 있습니다.
  1. 이 브랜치에서 계속 작업
  2. develop으로 돌아가서 새 브랜치 생성

  선택해주세요 (1/2):
  ```

### 3단계: commit type 자동 분류

변경된 파일과 내용을 분석하여 commit type을 판별한다.

| type | 조건 |
|------|------|
| feat | 새 기능 추가 |
| fix | 버그 수정 |
| improve | 기존 기능 개선 (Phase 내용 수정, 설정 개선 등) |
| refactor | 리팩토링 (기능 변경 없이 코드 개선) |
| docs | 문서 수정 |
| chore | 빌드, 설정, 기타 |

### 4단계: 영향 에이전트 식별 (NEPES_AI_AGENTS만)

프로젝트가 NEPES_AI_AGENTS일 때만 수행한다. 다른 프로젝트는 이 단계를 건너뛴다.

변경 파일 경로에서 에이전트명/커맨드명을 추출한다:
- `.claude/agents/{name}/` → `{name}` (에이전트)
- `.claude/agents/{group}/{name}/` → `{group}/{name}` (에이전트)
- `.claude/commands/{name}.md` → `{name}` (커맨드)
- `.claude/commands/{group}/{name}.md` → `{group}/{name}` (커맨드)

### 5단계: ITSM 티켓 번호 확인

**A. 동일 대화에서 ITSM 등록이 선행된 경우:**

등록 응답의 `requestId`를 자동 제시하고 사용자 확인을 받는다.

```
직전 ITSM 등록에서 #ITSM-{requestId}를 확인했습니다.
이 번호를 사용할까요? (Y/직접 번호 입력/n)
```

- **Y** → `ITSM_NUMBER={requestId}`
- **직접 번호 입력** → `ITSM_NUMBER={입력값}`
- **"n"** → 아래 B 케이스의 "n" 처리와 동일

⛔ **이 단계에서 반드시 멈추고 사용자 응답을 기다린다.**
`$ARGUMENTS`로 전달된 ITSM 번호는 "사용자가 확인한 것"이 아니다.
반드시 제시 후 사용자의 명시적 응답(Y/번호/n)을 받아야 한다.

**B. ITSM 등록이 선행되지 않은 경우:**

사용자에게 ITSM 티켓 번호를 입력받는다.

```
ITSM 티켓 번호를 입력해주세요:
  - 번호 입력 (예: 3207)
  - 없으면 "n" 입력
```

- **번호 입력** → `ITSM_NUMBER`로 사용
- **"n" 입력** → 아래 경고를 표시하고 사용자 최종 확인:
  ```
  ⚠️ ITSM 번호 없이 진행하면 추적성이 확보되지 않습니다.
  ITSM 번호 없이 진행하시겠습니까? (Y/N)
  ```
  - Y → `ITSM_NUMBER=없음` (커밋/머지 메시지에서 ITSM 참조 생략)
  - N → 워크플로우 중단 (ITSM 등록 후 재실행)

### 6단계: 사용자에게 변경사항 요약 출력

아래 형식으로 보여주고 확인을 받는다:

```
📋 변경사항 분석 결과

[프로젝트] {PROJECT_NAME}
[ITSM] #ITSM-{번호} / 없음
[commit type] feat / fix / improve / ...
[사유] {왜 해당 type인지 한 줄}
[영향 에이전트] {에이전트 목록} ← NEPES_AI_AGENTS일 때만 표시

[변경 파일]
  수정: src/Main.java
  추가: src/NewFeature.java
  삭제: (없음)

계속 진행할까요? (Y/N)
```

⛔ **이 단계에서 반드시 멈추고 사용자 응답을 기다린다.**
변경 파일 리스트는 사용자가 반드시 확인해야 하는 항목이다.
사용자가 Y를 입력할 때까지 절대 Phase 2로 진행하지 않는다.

사용자가 "N"이면 워크플로우를 종료한다.
사용자가 commit type에 동의하지 않으면 사용자 의견을 우선한다.

## Phase 1 출력 (Phase 2 입력으로 전달)

```
[CHANGE ANALYSIS]
프로젝트: {PROJECT_NAME}
ITSM 번호: #ITSM-{번호} / 없음
commit type: feat / fix / improve / ...
영향 에이전트: {에이전트 목록} ← NEPES_AI_AGENTS일 때만
변경 파일 목록: {파일 목록}
변경 요약: {한 줄 설명}
현재 브랜치: {브랜치명}
브랜치 전략: 새 브랜치 생성 / 현재 브랜치 유지
```
