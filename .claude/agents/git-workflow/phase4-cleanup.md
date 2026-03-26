# Phase 4 — 정리

## 역할
feature 브랜치를 삭제하고 완료 보고를 출력한다.

## 수행 절차

### 1단계: feature 브랜치 삭제

```bash
git branch -d {feature 브랜치명}
```

### 2단계: 완료 보고

**develop 머지 (일반):**
```
════════════════════════════════════════
✅ 워크플로우 완료
════════════════════════════════════════

[프로젝트] {PROJECT_NAME}
[버전] {이전버전} → {새버전}
[변경] {커밋 메시지}
[브랜치] {feature 브랜치명} → develop (머지 완료, 브랜치 삭제됨)
[태그] v{새버전} 생성됨

────────────────────────────────────────
⛔ 푸시 시 태그를 반드시 포함하세요

CLI:
  git push origin develop
  git push origin v{새버전}

또는:
  git push origin develop --tags

Fork 사용 시:
  Push 버튼 → "Include tags" 체크 필수
────────────────────────────────────────
```

**{MAIN_BRANCH} 배포 머지 포함 시:**
```
════════════════════════════════════════
✅ 워크플로우 완료 (배포 머지 포함)
════════════════════════════════════════

[프로젝트] {PROJECT_NAME}
[develop 버전] {이전버전} → {새버전}
[릴리스 버전] {새버전} → v{새 MAJOR 버전}
[변경] {커밋 메시지}
[브랜치] {feature 브랜치명} → develop → {MAIN_BRANCH} (머지 완료, 브랜치 삭제됨)
[태그] v{새버전} (develop), v{새 MAJOR 버전} (release)

────────────────────────────────────────
⛔ 푸시 시 태그를 반드시 포함하세요

CLI:
  git push origin develop
  git push origin {MAIN_BRANCH}
  git push origin v{새버전}
  git push origin v{새 MAJOR 버전}

또는:
  git push origin develop {MAIN_BRANCH} --tags

Fork 사용 시:
  Push 버튼 → "Include tags" 체크 필수
────────────────────────────────────────
```

## 체크포인트 클리어 + 워크플로우 로그 (자동)

완료 보고 출력 후, 아래 명령을 Bash로 실행한다.
실패해도 워크플로우를 중단하지 않는다 (best-effort).

```bash
node -e "
  const cp = require(process.env.USERPROFILE + '/.claude/hooks/checkpoint.js');
  const log = require(process.env.USERPROFILE + '/.claude/hooks/log-workflow.js');
  log.logWorkflow({
    workflow: 'git-workflow', phase: 4, event: 'workflow_complete',
    project: '{PROJECT_NAME}', oldVersion: '{이전버전}', newVersion: '{새버전}',
    tag: 'v{새버전}', itsm: '{ITSM_NUMBER}', commitType: '{COMMIT_TYPE}'
  });
  cp.clearCheckpoint('git-workflow');
"
```

`{...}` 부분은 워크플로우에서 결정된 실제 값으로 치환한다.

## 3단계 (선택): Draft PR 생성

**프로젝트 설정 테이블의 `Draft PR`이 Y이고, 사용자가 "PR도 만들어줘", "PR 생성", "Draft PR" 등을 요청한 경우에만 실행.**
요청이 없으면 이 단계를 건너뛴다.

```bash
# GitHub CLI로 Draft PR 생성
gh pr create --draft \
  --title "{commit type}: {커밋 메시지 요약}" \
  --body "## 변경사항
- {주요 변경 내용}

## 버전
{이전버전} → {새버전}

## 관련 태그
v{새버전}"
```

### 완료 보고

```
📝 Draft PR이 생성되었습니다.

PR URL: {PR URL}
상태: Draft (리뷰 준비 전)

Ready for Review로 전환하려면:
  gh pr ready {PR번호}
```

**주의:**
- `gh` CLI가 설치되어 있고 인증이 완료된 상태여야 한다
- `gh` 미설치 시 안내 메시지를 출력하고 건너뛴다

---

## 푸시 관련 규칙

**Claude Code에서 push를 직접 실행하지 않는다.** 사용자가 직접 수행한다.
사용자가 "푸시해줘"라고 요청하면:

```
푸시는 직접 실행해주세요.

CLI:
  git push origin develop --tags

{MAIN_BRANCH} 배포 머지도 포함된 경우:
  git push origin develop {MAIN_BRANCH} --tags

Fork:
  Push → "Include tags" 체크

⚠️ 태그 없이 Push하면 버전 이력이 유실됩니다.
```

## 실패 처리

### 재시도 규칙

| 명령 | 최대 재시도 | 재시도 조건 | 재시도 불가 시 |
|------|-----------|-----------|-------------|
| `git branch -d` | 1회 | not fully merged → 사용자에게 `-D` 사용 확인 후 재시도 | 브랜치를 수동으로 관리하도록 안내 |
| `gh pr create` | 2회 | 네트워크 에러 → 2초 간격 재시도 | PR 생성 건너뜀, 수동 생성 안내 |

### `git branch -d` 실패 처리

```
⚠️ feature 브랜치 삭제 실패: {에러 메시지}

브랜치가 완전히 머지되지 않았을 수 있습니다.
강제 삭제(-D)를 진행할까요? (Y/N)
```
- Y → `git branch -D {브랜치명}` 실행
- N → 브랜치 유지, 완료 보고에서 안내

### 실패 기록

모든 실패를 아래 명령으로 기록한다:

```bash
node -e "
  const fl = require(process.env.USERPROFILE+'/.claude/hooks/failure-logger.js');
  fl.logFailure({
    workflow: 'git-workflow', phase: 4,
    failureType: '{TYPE}', subType: '{SUBTYPE}',
    severity: '{SEVERITY}',
    cause: '{에러 메시지}',
    context: { branch: '{브랜치명}' },
    recoveryAction: '{수행한 복구 조치}',
    resolved: {true/false},
    retryCount: {재시도 횟수}
  });
"
```

`{...}` 부분은 실제 값으로 치환한다.
