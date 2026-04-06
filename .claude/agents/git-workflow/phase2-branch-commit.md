# Phase 2 — Branch Creation + Commit

## Role
Based on Phase 1 analysis results, automatically generate a branch name and commit message, then execute immediately.

## Procedure

### Step 0: Validate Phase 1 Output

Before starting Phase 2, verify that all required fields from Phase 1 are present.

**Required fields:**
- Project name (PROJECT_NAME)
- commit type (one of: feat/fix/improve/refactor/docs/chore)
- Changed file list (at least 1 file)
- Current branch
- Branch strategy (new branch / keep current branch)

If any field is missing, stop the workflow and instruct the user to restart from Phase 1:
```
⚠️ Phase 1 analysis data is incomplete.
Missing fields: {missing field list}

Please restart the workflow from the beginning.
```

### Step 1: Automatically Generate Branch Name

Perform this step only when "new branch" was decided in Phase 1.
Skip if "keep current branch".

**Branch name generation rules:**

| commit type | Branch prefix | Example |
|-------------|--------------|---------|
| feat | feature/ | feature/add-validation-api |
| fix | bugfix/ | bugfix/fix-db-connection-leak |
| improve | feature/ | feature/improve-phase2-checklist |
| refactor | feature/ | feature/refactor-database |
| docs | feature/ | feature/update-readme |
| chore | feature/ | feature/update-gitignore |

**Name generation method:**
- Lowercase, hyphen-separated
- Format: `{prefix}/{brief-description}`

### Step 2: Automatically Generate Commit Message

**Commit message format:**
```
{type}: {brief description}
```

- The `{type}` prefix is always written in English (conventional commits standard).
- The `{brief description}` is written in **Korean**, except for technical terms (class names, method names, file names, protocol names, library names, etc.) which remain in English.

| type | Description | Example |
|------|-------------|---------|
| feat | 새 기능 추가 | feat: Validation API 기능 추가 (#ITSM-3421) |
| fix | 버그 수정 | fix: DB 연결 누수 수정 (#ITSM-3421) |
| improve | 기존 기능 개선 | improve: Phase 2 체크리스트 개선 (#ITSM-3421) |
| docs | 문서 업데이트 | docs: README 업데이트 (#ITSM-3421) |
| refactor | 리팩토링 | refactor: Database 클래스 분리 (#ITSM-3421) |
| chore | 빌드, 설정 변경 | chore: .gitignore 추가 (#ITSM-3421) |
| merge | 브랜치 병합 | merge: feature/login-api (#ITSM-3421) |

**ITSM number application rules:**
- If `ITSM_NUMBER` is present → append `(#ITSM-{number})` to the end of the commit message
- If `ITSM_NUMBER` is "none" → generate commit message without ITSM reference

### Self-Verification (mandatory before execution)

Step 3 실행 전에 아래 항목을 확인한다. 하나라도 실패하면 즉시 교정 후 재확인한다.

**브랜치명 검증:**
- [ ] prefix가 `feature/` 또는 `bugfix/` 중 하나
- [ ] 설명부는 소문자·숫자·하이픈만 사용 (대문자, 공백, 특수문자 없음)

**커밋 메시지 검증:**
- [ ] `{type}: {설명}` 형식 준수
- [ ] type이 `feat/fix/improve/refactor/docs/chore/merge` 중 하나
- [ ] 설명이 한국어 (클래스명·메서드명 등 기술 용어 제외)
- [ ] ITSM 번호 있는 경우 끝에 `(#ITSM-숫자)` 형식으로 존재

**인라인 eval 검증:**

```bash
node "%USERPROFILE%/.claude/scripts/eval-runner.js" --validate branch-name-format --input "{\"branchName\":\"<실제 브랜치명>\"}"

node "%USERPROFILE%/.claude/scripts/eval-runner.js" --validate commit-msg-format --input "{\"message\":\"<실제 커밋 메시지>\"}"
```

- exit code 0 → 검증 통과, Step 3 진행
- exit code 1 → 출력된 오류 확인 후 수정, 재검증

---

### Step 3: Execute

Execute immediately without user confirmation:

```bash
# 1. Create feature branch (from current position — preserves changes)
git checkout -b {branch name}

# 2. Stage changed files
git add {files}

# 3. Commit
git commit -m "{commit message}"
```

**⚠️ Important: Do NOT run `git checkout {MAIN_BRANCH}`, `git checkout develop`, or `git pull` first.**
The user may have modified code on the develop branch before committing.
`git checkout -b` creates a new branch while keeping current changes, so it is safe.

**⚠️ Do NOT modify the VERSION file at this step. Version updates are performed in Phase 3.**

### Execution Complete Output

```
✅ Commit complete

Branch: {branch name}
Commit: {first 7 chars of commit hash} {commit message}

Proceeding with develop merge.
```

## Checkpoint Save (automatic)

After the commit complete output, run the following command via Bash to save progress.
Do not stop the workflow if this fails (best-effort).

```bash
node -e "
  const cp = require(process.env.USERPROFILE + '/.claude/hooks/checkpoint.js');
  const log = require(process.env.USERPROFILE + '/.claude/hooks/log-workflow.js');
  cp.saveCheckpoint('git-workflow', 'phase2', {
    project: '{PROJECT_NAME}',
    commitType: '{COMMIT_TYPE}',
    itsm: '{ITSM_NUMBER}',
    branch: '{branch name}',
    commitHash: '{first 7 chars of commit hash}',
    commitMsg: '{commit message}'
  });
  log.logWorkflow({
    workflow: 'git-workflow', phase: 2, event: 'phase2_complete',
    result: 'success',
    project: '{PROJECT_NAME}', branch: '{branch name}', commitHash: '{first 7 chars of commit hash}'
  });
"
```

Replace `{...}` with actual values determined in this phase.

## Failure Handling

### Retry Rules

| Command | Max Retries | Retry Condition | When Retry Not Possible |
|---------|------------|----------------|------------------------|
| `git checkout -b` | 1 | branch already exists → add `-2` suffix to branch name | Ask user to confirm branch name |
| `git add` | 1 | file not found → re-check `git status` and refresh file list | Report missing files to user |
| `git commit` (nothing to commit) | 0 | No retry — Phase 1 analysis was wrong | End workflow, instruct user to re-run Phase 1 |
| `git commit` (pre-commit hook failed) | 1 | Check hook output, fix issue, retry | Report hook error to user |

### Failure Logging

Log all failures (including those that later succeeded on retry) with the following command:

```bash
node -e "
  const fl = require(process.env.USERPROFILE+'/.claude/hooks/failure-logger.js');
  fl.logFailure({
    workflow: 'git-workflow', phase: 2,
    failureType: '{TYPE}', subType: '{SUBTYPE}',
    severity: '{SEVERITY}',
    cause: '{error message}',
    context: { branch: '{branch name}', command: '{command executed}' },
    recoveryAction: '{recovery action taken}',
    resolved: {true/false},
    retryCount: {retry count}
  });
"
```

Replace `{...}` with actual values.