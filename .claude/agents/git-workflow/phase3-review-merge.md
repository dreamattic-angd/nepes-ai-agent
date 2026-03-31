# Phase 3 — Version Update + Merge

## Role
Update the version on the feature branch, merge into the develop branch, and create a tag.

## Procedure

### Step 0: Validate Phase 2 Output

Before starting Phase 3, verify that all required fields from Phase 2 are present.

**Required fields:**
- Branch name (current feature/bugfix branch)
- Commit hash
- Commit message
- commit type
- ITSM number (or 'none')

If any field is missing, stop the workflow and instruct the user to restart from Phase 1:
```
⚠️ Phase 2 commit data is incomplete.
Missing fields: {missing field list}

Please restart the workflow from the beginning.
```

### Step 1: Calculate New Version

Read the current version from the `Version File` in the project settings table.
- `./VERSION` → file content is the version number (e.g., `1.3.2`)
- `.claude/version.txt` → extract version from `## Current Version:` line (e.g., `## Current Version: 1.26.0` → `1.26.0`)

**When the user specifies a version (USER_VERSION is set):**
- Skip auto-calculation and use the user-specified version as-is.

**When the user does not specify a version:**

Auto-calculate based on commit type:

| commit type | Version Change | Example |
|-------------|---------------|---------|
| feat | MINOR +1, PATCH = 0 | 1.3.2 → 1.4.0 |
| fix | PATCH +1 | 1.3.2 → 1.3.3 |
| improve | PATCH +1 | 1.3.2 → 1.3.3 |
| docs | PATCH +1 | 1.3.2 → 1.3.3 |
| refactor | PATCH +1 | 1.3.2 → 1.3.3 |
| chore | PATCH +1 | 1.3.2 → 1.3.3 |

**⚠️ MAJOR is never auto-incremented. The user must specify it directly.**

### Self-Verification (mandatory before file modification)

버전 파일 수정 전에 아래 항목을 확인한다. 하나라도 실패하면 재계산한다.

**버전 계산 검증:**
- [ ] `x.y.z` 형식 (모두 정수)
- [ ] `feat` 타입: MINOR +1, PATCH = 0 (이전 PATCH 값과 무관하게 0으로 리셋)
- [ ] 그 외 타입 (`fix/improve/refactor/docs/chore`): PATCH +1만, MINOR 변화 없음
- [ ] 새 버전 > 이전 버전 (버전 감소 불가)
- [ ] MAJOR는 사용자가 직접 지정하지 않는 한 자동 증가 없음

**인라인 eval 검증:**

```bash
node "%USERPROFILE%/.claude/scripts/eval-runner.js" --validate version-calc --input "{\"currentVersion\":\"<이전 버전>\",\"commitType\":\"<commit type>\"}" --expected "{\"newVersion\":\"<계산한 새 버전>\"}"
```

- exit code 0 → 계산 검증 통과, Step 2 진행
- exit code 1 → 오류 내용 확인 후 버전 재계산

---

### Step 2: Modify Version File + Commit (on feature branch)

**Modify and commit the version file on the feature branch.**

#### 2-A. Modify VERSION file (projects where version file is `./VERSION`)

Record only the new version number in the `./VERSION` file.
```
Example: 1.4.0
```

#### 2-B. Modify version.txt composite file (projects where version file is `.claude/version.txt`)

Update the following sections in `.claude/version.txt`:

1. **Current version line**: `## Current Version: {old version}` → `## Current Version: {new version}`
2. **Agent status table**: for affected agents identified in Phase 1:
   - Adding a new agent → add a new row in the table (status: ✅ Active, added in version: {new version})
   - Modifying an existing agent → keep status unchanged
   - If a new agent is not in the table → add a new row
3. **Change history**: add a new entry at the top (`{new version} {commit message}`)

#### 2-C. Sync source version file (configured projects only)

If a source version file is specified in the project settings table, also modify that file.
Skip this step if not configured.

**APP_RMSPAGE — `src/common/Version.java`:**
```java
public static final String VERSION = "{new version}";
```

**YTAP — `src/Common/Version/YTAPVersion.java`:**
```java
public static final String VERSION = "{new version}";
public static final String BUILD_DATE = "{today's date yyyy-MM-dd}";
```

#### 2-D. Sync CLAUDE.md header (when `CLAUDE.md Sync` in settings table is Y)

Perform when `CLAUDE.md Sync` in the project settings table is Y. Skip if N.

Sync the version in the first line of `CLAUDE.md`:
```
"# nepes-ai-agents v{old version}" → "# nepes-ai-agents v{new version}"
```

#### 2-E. Commit

```bash
# When version file is ./VERSION:
git add VERSION {source version file (if any)}
git commit -m "chore: bump version to v{new version}"

# When version file is .claude/version.txt:
git add .claude/version.txt {CLAUDE.md (when sync is Y)}
git commit -m "chore: bump version to v{new version}"
```

### Step 2.5: Auto-update README (conditional)

**Perform only when `README Auto-update` in the project settings table is Y AND commit type is feat.**
Skip in all other cases.

#### 2.5-1. Read current README

Read `.claude/README.txt` and understand its current structure.

#### 2.5-2. Understand Changes

Review the changes identified in Phase 1:
- Newly added agents
- Deleted agents
- Modified agent descriptions

#### 2.5-3. Determine README Update Items

**When a new agent is added:**
1. Add a new row in the agent list table
2. Add an agent section (## agent name) — key features, workflow, detailed doc link
3. Update the folder structure section

**When an agent is deleted:**
1. Remove the row from the agent list table
2. Remove the agent section
3. Update the folder structure section

#### 2.5-4. Auto-update Rules (no user confirmation needed)

Execute README update automatically without asking the user.

**Folder structure section update rule:**
- **Skip** when only agent `.md` files were added/modified with no new directories or structural changes
- **Update** only when new directories are created, existing directories are deleted, or folder hierarchy changes

#### 2.5-5. Modify README + Commit

```bash
git add .claude/README.txt
git commit -m "docs: Update README ({change summary})"
```

---

### Step 3: Switch to develop + Merge

```bash
# 1. Switch to develop branch
git checkout develop

# 2. Merge (create merge commit with --no-ff)
git merge {feature branch name} --no-ff -m "merge: {feature branch name} (#ITSM-XXXX)"
# If ITSM_NUMBER exists: -m "merge: {feature branch name} (#ITSM-{number})"
# If ITSM_NUMBER is none: -m "merge: {feature branch name}"
```

**When a conflict occurs:**
```
⚠️ Merge conflict detected.

Conflicting files:
  - {file list}

How to resolve:
  1. Open the conflicting files and check the <<<<<<< / ======= / >>>>>>> markers
  2. Select the correct code or merge manually
  3. Say "continue" after resolving

Or:
  - "abort merge" → run git merge --abort and return to feature branch
  - "show conflicting files" → check conflicting files via git diff --name-only --diff-filter=U
```

**Abort (abort) recovery procedure:**
1. Run `git merge --abort`
2. Return to feature branch: `git checkout {feature branch name}`
3. Output guidance message:
```
↩️ Merge aborted. Returned to feature branch.

Options:
  1. Fix the conflict cause and say "merge again"
  2. Apply develop's latest changes to feature first: git merge develop
  3. Stop workflow
```

### Step 4: Create Tag

```bash
git tag -a v{new version} -m "{commit message}"
```

**When the tag already exists:**
```
⚠️ Tag v{new version} already exists.

1. Increment to next version (v{alternative version})
2. Overwrite existing tag (not recommended)
3. Stop workflow

Select (1/2/3):
```

---

### Step 5: {MAIN_BRANCH} Release Merge (only when explicitly requested by user)

**This step runs only when the user explicitly requests a {MAIN_BRANCH} merge with phrases like "merge to main", "apply to main", "release merge", etc.**
Skip this step in the normal workflow and proceed to the execution complete output.

#### 5-1. Calculate MAJOR Version

Calculate MAJOR +1, MINOR = 0, PATCH = 0 from the current version.

```
Example: 1.27.0 → 2.0.0
Example: 2.5.3 → 3.0.0
```

**If the user specifies a version directly** → skip auto-calculation and use the user-specified version.

#### 5-2. Modify Version File + Commit on develop

Modify and commit the version file on the develop branch.
Apply the same file modification logic as in step 3 (3-A through 3-E).

```bash
# Modify version file while on develop
# (apply same file modification logic as 3-A through 3-D)

# Commit
git add {version-related files}
git commit -m "chore: bump version to v{new MAJOR version}"
```

#### 5-3. Merge into {MAIN_BRANCH}

```bash
# 1. Switch to main branch
git checkout {MAIN_BRANCH}

# 2. Merge develop into main
git merge develop --no-ff -m "release: v{new MAJOR version} - merge develop into {MAIN_BRANCH}"
```

**When a conflict occurs:**
```
⚠️ Merge conflict detected.

Conflicting files:
  - {file list}

Say "continue" after resolving the conflict.
```

#### 5-4. Create Release Tag

```bash
git tag -a v{new MAJOR version} -m "release: v{new MAJOR version}"
```

**When the tag already exists:**
```
⚠️ Tag v{new MAJOR version} already exists.

1. Increment to next version (v{alternative version})
2. Overwrite existing tag (not recommended)
3. Stop workflow

Select (1/2/3):
```

#### 5-5. Return to develop

```bash
git checkout develop
```

---

### Execution Complete Output

**develop merge (normal):**
```
✅ develop merge + version update complete

{old version} → {new version}
Tag: v{new version}

Proceeding to cleanup.
```

**When {MAIN_BRANCH} release merge is included:**
```
✅ develop merge + {MAIN_BRANCH} release merge complete

develop version: {old version} → {new version} (MINOR/PATCH)
release version: {new version} → v{new MAJOR version} (MAJOR)
Tags: v{new version} (develop), v{new MAJOR version} (release)

Proceeding to cleanup.
```

## Checkpoint Save (automatic)

After the execution complete output, run the following command via Bash to save progress.
Do not stop the workflow if this fails (best-effort).

```bash
node -e "
  const cp = require(process.env.USERPROFILE + '/.claude/hooks/checkpoint.js');
  const log = require(process.env.USERPROFILE + '/.claude/hooks/log-workflow.js');
  cp.saveCheckpoint('git-workflow', 'phase3', {
    project: '{PROJECT_NAME}',
    commitType: '{COMMIT_TYPE}',
    itsm: '{ITSM_NUMBER}',
    branch: '{feature branch name}',
    oldVersion: '{old version}',
    newVersion: '{new version}',
    tag: 'v{new version}',
    partialResults: {
      versionUpdated: true,
      versionCommitted: true,
      mergeDone: true,
      tagDone: true
    }
  });
  log.logWorkflow({
    workflow: 'git-workflow', phase: 3, event: 'phase3_complete',
    result: 'success',
    project: '{PROJECT_NAME}', oldVersion: '{old version}', newVersion: '{new version}', tag: 'v{new version}'
  });
"
```

Replace `{...}` with actual values determined in this phase.

## Failure Handling

### Incremental Recovery (Sub-Phase Checkpoint)

Phase 3 consists of multiple steps, so the checkpoint's `partialResults` can be used to skip completed steps.

When resuming from a checkpoint with `partialResults`:
- `versionUpdated: true` → skip version calculation and file modification
- `versionCommitted: true` → skip version commit
- `mergeDone: true` → skip develop merge
- `tagDone: true` → skip tag creation

Update the checkpoint after each sub-phase completes to preserve partial progress.

### Retry Rules

| Command | Max Retries | Retry Condition | When Retry Not Possible |
|---------|------------|----------------|------------------------|
| Read version file | 2 | IO error → verify path and retry | Report file path and error to user |
| Write version file | 1 | IO error → retry | Report file path and error to user |
| `git commit` (version) | 1 | pre-commit hook failed → fix and retry | Report to user |
| `git merge` (conflict) | 0 | No retry — requires user manual resolution | Provide list of conflicting files |
| `git merge` (other) | 1 | Non-conflict error → retry | Abort merge, report to user |
| `git tag` (already exists) | 1 | Adjust version PATCH+1 and retry | Ask user to confirm version |

### Failure Logging

Log all failures (including those that later succeeded on retry) with the following command:

```bash
node -e "
  const fl = require(process.env.USERPROFILE+'/.claude/hooks/failure-logger.js');
  fl.logFailure({
    workflow: 'git-workflow', phase: 3,
    failureType: '{TYPE}', subType: '{SUBTYPE}',
    severity: '{SEVERITY}',
    cause: '{error message}',
    context: { branch: '{branch name}', version: '{version}', command: '{command executed}' },
    recoveryAction: '{recovery action taken}',
    resolved: {true/false},
    retryCount: {retry count}
  });
"
```

Replace `{...}` with actual values.
