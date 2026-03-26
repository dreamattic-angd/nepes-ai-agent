# Phase 2 — 브랜치 생성 + 커밋

## 역할
Phase 1의 분석 결과를 바탕으로 브랜치명과 커밋 메시지를 자동 생성하고 즉시 실행한다.

## 수행 절차

### 0단계: Phase 1 출력 검증

Phase 2 시작 전에 Phase 1에서 전달받은 데이터의 필수 필드가 모두 존재하는지 확인한다.

**필수 필드:**
- 프로젝트명 (PROJECT_NAME)
- commit type (feat/fix/improve/refactor/docs/chore 중 하나)
- 변경 파일 목록 (최소 1개)
- 현재 브랜치
- 브랜치 전략 (새 브랜치 생성 / 현재 브랜치 유지)

누락된 필드가 있으면 워크플로우를 중단하고 Phase 1부터 재실행을 안내한다:
```
⚠️ Phase 1 분석 데이터가 불완전합니다.
누락된 항목: {누락 필드 목록}

워크플로우를 처음부터 다시 실행해주세요.
```

### 1단계: 브랜치명 자동 생성

Phase 1에서 "새 브랜치 생성"으로 결정된 경우에만 수행한다.
"현재 브랜치 유지"면 이 단계를 건너뛴다.

**브랜치명 생성 규칙:**

| commit type | 브랜치 접두사 | 예시 |
|-------------|-------------|------|
| feat | feature/ | feature/add-validation-api |
| fix | bugfix/ | bugfix/fix-db-connection-leak |
| improve | feature/ | feature/improve-phase2-checklist |
| refactor | feature/ | feature/refactor-database |
| docs | feature/ | feature/update-readme |
| chore | feature/ | feature/update-gitignore |

**이름 생성 방법:**
- 소문자, 하이픈 구분
- 형식: `{접두사}/{간단한-설명}`

### 2단계: 커밋 메시지 자동 생성

**커밋 메시지 형식:**
```
{type}: {간단한 설명}
```

| type | 설명 | 예시 |
|------|------|------|
| feat | 새 기능 추가 | feat: Validation API 기능 추가 (#ITSM-3421) |
| fix | 버그 수정 | fix: DB 연결 누수 해결 (#ITSM-3421) |
| improve | 기존 기능 개선 | improve: Phase 2 체크리스트 보강 (#ITSM-3421) |
| docs | 문서 수정 | docs: README 업데이트 (#ITSM-3421) |
| refactor | 리팩토링 | refactor: Database 클래스 분리 (#ITSM-3421) |
| chore | 빌드, 설정 | chore: .gitignore 추가 (#ITSM-3421) |

**ITSM 번호 적용 규칙:**
- `ITSM_NUMBER`가 있으면 → 커밋 메시지 끝에 `(#ITSM-{번호})` 추가
- `ITSM_NUMBER`가 없음이면 → ITSM 참조 없이 커밋 메시지 생성

### 3단계: 실행

사용자 확인 없이 즉시 실행한다:

```bash
# 1. 피처 브랜치 생성 (현재 위치에서 바로 생성 — 변경사항 유지)
git checkout -b {브랜치명}

# 2. 변경 파일 스테이징
git add {파일들}

# 3. 커밋
git commit -m "{커밋 메시지}"
```

**⚠️ 중요: `git checkout {MAIN_BRANCH}`나 `git checkout develop`이나 `git pull`을 먼저 실행하지 않는다.**
사용자가 develop 브랜치에서 코드 수정 후 커밋 전 상태일 수 있다.
`git checkout -b`는 현재 변경사항을 그대로 가지고 새 브랜치를 생성하므로 안전하다.

**⚠️ 이 단계에서 VERSION 파일은 수정하지 않는다. 버전 업데이트는 Phase 3에서 수행한다.**

### 실행 완료 출력

```
✅ 커밋 완료

브랜치: {브랜치명}
커밋: {커밋 해시 앞 7자리} {커밋 메시지}

develop 머지를 진행합니다.
```

## 체크포인트 저장 (자동)

커밋 완료 출력 후, 아래 명령을 Bash로 실행하여 진행 상태를 저장한다.
실패해도 워크플로우를 중단하지 않는다 (best-effort).

```bash
node -e "
  const cp = require(process.env.USERPROFILE + '/.claude/hooks/checkpoint.js');
  const log = require(process.env.USERPROFILE + '/.claude/hooks/log-workflow.js');
  cp.saveCheckpoint('git-workflow', 'phase2', {
    project: '{PROJECT_NAME}',
    commitType: '{COMMIT_TYPE}',
    itsm: '{ITSM_NUMBER}',
    branch: '{브랜치명}',
    commitHash: '{커밋 해시 앞 7자리}',
    commitMsg: '{커밋 메시지}'
  });
  log.logWorkflow({
    workflow: 'git-workflow', phase: 2, event: 'phase2_complete',
    result: 'success',
    project: '{PROJECT_NAME}', branch: '{브랜치명}', commitHash: '{커밋 해시 앞 7자리}'
  });
"
```

`{...}` 부분은 이 phase에서 결정된 실제 값으로 치환한다.

## 실패 처리

### 재시도 규칙

| 명령 | 최대 재시도 | 재시도 조건 | 재시도 불가 시 |
|------|-----------|-----------|-------------|
| `git checkout -b` | 1회 | branch already exists → 브랜치명에 `-2` 접미사 추가 | 사용자에게 브랜치명 확인 |
| `git add` | 1회 | file not found → `git status` 재확인 후 파일 목록 갱신 | 누락 파일 목록을 사용자에게 보고 |
| `git commit` (nothing to commit) | 0회 | 재시도 불가 — Phase 1 분석이 잘못됨 | 워크플로우 종료, Phase 1 재실행 안내 |
| `git commit` (pre-commit hook 실패) | 1회 | 훅 출력 확인 후 문제 수정하고 재시도 | 훅 에러 내용을 사용자에게 보고 |

### 실패 기록

모든 실패 (재시도 성공 포함)를 아래 명령으로 기록한다:

```bash
node -e "
  const fl = require(process.env.USERPROFILE+'/.claude/hooks/failure-logger.js');
  fl.logFailure({
    workflow: 'git-workflow', phase: 2,
    failureType: '{TYPE}', subType: '{SUBTYPE}',
    severity: '{SEVERITY}',
    cause: '{에러 메시지}',
    context: { branch: '{브랜치명}', command: '{실행한 명령}' },
    recoveryAction: '{수행한 복구 조치}',
    resolved: {true/false},
    retryCount: {재시도 횟수}
  });
"
```

`{...}` 부분은 실제 값으로 치환한다.
