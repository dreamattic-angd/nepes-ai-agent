# Phase 1 — Change Analysis

## Safety Gates (never skip)
- ⛔ Immediately stop when a blocked branch is detected (step 2)
- ⛔ Always wait for user response when an ITSM number is entered (step 5)
- ⛔ Always wait for user confirmation (Y) after outputting the change summary (step 6)
- ⛔ Stop immediately on REJECT verdict in code review (step 7) — never proceed to Phase 2

## Role
Analyze changed files, classify the commit type, verify the ITSM ticket, and show the user a summary.

## Procedure

### Step 1: Check Changed Files

```bash
git status
```

If there are no changes, output the following and **stop immediately**:
```
No changed files. Ending workflow.
```

### Step 1.5: Automatic Integration Integrity Verification

If there are changes, automatically verify project integrity before committing.
Run automatically without user confirmation and output results as an info message.

```bash
node .claude/scripts/integrity-check.js
```

- **exit code 0 (PASS)** → output a one-line summary and proceed to step 2:
  ```
  ✅ Integration integrity check: PASS (4/4)
  ```
- **exit code 1 (FAIL)** → show script output and ask user:
  ```
  ⚠️ Issues found during integration integrity check:
  {script output}

  Continue ignoring the issue? (Y/N)
  ```
  - Y → proceed to step 2 (user chose to ignore)
  - N → end workflow (fix the issue and re-run)
- **Script execution failure** (file not found, runtime error, etc.) → show warning and ask user:
  ```
  ⚠️ Unable to run the integration integrity check script:
  {error message}

  Skip the check and continue? (Y/N)
  ```
  - Y → proceed to step 2 (skip check)
  - N → end workflow (fix the script issue and re-run)

**If the user requests details**, re-run with `--verbose` and show results in a per-item table.

### Step 2: Check Current Branch

```bash
git branch --show-current
```

**Blocked branch list:**
When running on any of the branches below, stop immediately without offering options to the user.

| Blocked Branch |
|---------------|
| 12'_2025_NEW_EQPs |

```
⛔ '{branch name}' is a protected branch. git-workflow cannot run on this branch.
Ending workflow and processing the user's original request with Claude Code default behavior.
```

After ending the workflow, process the user's original request using **Claude Code default git behavior** (without applying the workflow's branch strategy, versioning scheme, or tagging rules).

**When not a blocked branch, follow the branches below:**

#### Automatic develop Branch Setup

When on {MAIN_BRANCH} or develop, automatically prepare the develop branch.
Run automatically without user confirmation and output performed actions as an info message.

```bash
# Check if develop exists
git branch --list develop
```

- **develop does not exist** → create from {MAIN_BRANCH}:
  ```bash
  git checkout -b develop
  ```
  ```
  ℹ️ develop branch did not exist — created from {MAIN_BRANCH}.
  ```

- **develop exists and on {MAIN_BRANCH}** → switch to develop and check sync:
  ```bash
  git checkout develop
  # Check if develop is behind main
  git log develop..{MAIN_BRANCH} --oneline
  ```
  - If behind → merge {MAIN_BRANCH} into develop to sync:
    ```bash
    git merge {MAIN_BRANCH} --no-ff -m "merge: sync {MAIN_BRANCH} into develop"
    ```
    ```
    ℹ️ develop was behind {MAIN_BRANCH} — synchronized.
    ```
  - If equal → proceed as-is

- **Already on develop** → proceed as-is

#### Branch Routing

- On develop → normal (create feature branch in Phase 2)
- Already on a feature/bugfix branch → ask user:
  ```
  Currently on '{branch name}'.
  1. Continue on this branch (no new branch)
  2. Return to develop and create a new branch

  Select (1/2):
  ```
- On any other branch → warn:
  ```
  ⚠️ Currently on '{branch name}'.
  1. Continue on this branch
  2. Return to develop and create a new branch

  Select (1/2):
  ```

### Step 3: Automatic Commit Type Classification

Analyze changed files and their content to determine the commit type.

| type | Condition |
|------|-----------|
| feat | New feature added |
| fix | Bug fixed |
| improve | Existing feature improved (phase content updates, config improvements, etc.) |
| refactor | Refactoring (code improvements without functional changes) |
| docs | Documentation updated |
| chore | Build, config, or other |

### Step 4: Identify Affected Agents (NEPES_AI_AGENTS only)

Perform this step only when the project is NEPES_AI_AGENTS. Skip for other projects.

Extract agent/command names from the changed file paths:
- `.claude/agents/{name}/` → `{name}` (agent)
- `.claude/agents/{group}/{name}/` → `{group}/{name}` (agent)
- `.claude/commands/{name}.md` → `{name}` (command)
- `.claude/commands/{group}/{name}.md` → `{group}/{name}` (command)

### Step 5: Confirm ITSM Ticket Number

**A. When ITSM registration was performed earlier in the same conversation:**

Present the `requestId` from the registration response and ask for user confirmation.

```
ITSM #{requestId} was found from the previous ITSM registration.
Use this number? (Y/enter directly/n)
```

- **Y** → `ITSM_NUMBER={requestId}`
- **Enter directly** → `ITSM_NUMBER={entered value}`
- **"n"** → same as the "n" handling in case B below

⛔ **Stop at this step and wait for user response.**
An ITSM number passed via `$ARGUMENTS` is not "confirmed by the user."
Always present the number and wait for explicit user response (Y/number/n).

**B. When no prior ITSM registration was performed:**

Ask the user to enter the ITSM ticket number.

```
Please enter the ITSM ticket number:
  - Enter number (e.g., 3207)
  - Enter "n" if none
```

- **Number entered** → use as `ITSM_NUMBER`
- **"n" entered** → show the warning below and ask for final confirmation:
  ```
  ⚠️ Proceeding without an ITSM number will result in no traceability.
  Proceed without an ITSM number? (Y/N)
  ```
  - Y → `ITSM_NUMBER=none` (omit ITSM reference in commit/merge messages)
  - N → stop workflow (register in ITSM and re-run)

### Step 6: Output Change Summary to User

Show in the format below and wait for confirmation:

```
📋 Change Analysis Result

[Project] {PROJECT_NAME}
[ITSM] #ITSM-{number} / none
[commit type] feat / fix / improve / ...
[Reason] {one line explaining why this type was chosen}
[Affected Agents] {agent list} ← shown only for NEPES_AI_AGENTS

[Changed Files]
  Modified: src/Main.java
  Added: src/NewFeature.java
  Deleted: (none)

Proceed? (Y/N)
```

> ⚠️ **This step is the last point to finalize the scope of changes.**
> If additional related changes were discovered during analysis (missing files, related config, etc.),
> include them in the list now before entering Y.
> Changes after merge completion can only be handled via a new /git-workflow.

⛔ **Stop at this step and wait for user response.**
The changed file list must be confirmed by the user.
Never proceed to Phase 2 until the user enters Y.

If the user enters "N", end the workflow.
If the user disagrees with the commit type, defer to the user's preference.

### Step 7: Code Review (pre-commit)

Automatically determine whether a code review is needed based on the commit type and changed files. **Do not ask the user — decide and act immediately.**

#### Review Necessity Judgment Criteria

| Condition | Decision |
|-----------|----------|
| commit type is `feat` or `fix` | ✅ Review required |
| commit type is `improve` or `refactor` and changed files include `.js`, `.ts`, `.py`, `.java`, `.sh` source files | ✅ Review required |
| commit type is `docs`, `chore` | ⏭️ Skip (no executable code changed) |
| commit type is `improve` or `refactor` and changed files are only `.md`, `.txt`, `.json`, `.yaml`, `.yml` config/docs | ⏭️ Skip (no executable code changed) |

- **Skip** → output info message and proceed to Phase 1 Output:
  ```
  ℹ️ Code review skipped (commit type: {type}, no executable code changes detected).
  ```
- **Review required** → run automatically using the steps below (no user confirmation needed)

#### 7-1. Get Changes to Review

```bash
# Unstaged changes
git diff

# Staged changes
git diff --cached
```

Use the combined output as the review target.

#### 7-2. Load and Execute Review

Load `.claude/agents/code-review/review-full.md` and execute the review.

- `+` lines (added/modified): **review target**
- `-` lines (deleted): check deletion impact
- Context lines: reference only

#### 7-3. Branch Based on Verdict

| Verdict | Condition | Next Step |
|---------|-----------|-----------|
| ✅ PASS | 0 Critical AND Warning ≤ 3 | → proceed to Phase 1 Output |
| ⚠️ REVIEW_NEEDED | 0 Critical AND Warning ≥ 4 | → ask user confirmation, then proceed |
| ❌ REJECT | Critical ≥ 1 | → stop workflow, request fixes |

**When REVIEW_NEEDED, ask user:**
```
⚠️ {N} Warning(s) found.

Key Warnings:
1. {file}:{line} - {description}

Proceed with commit anyway? (Y/N)
```

**When REJECT:**
```
❌ {N} Critical issue(s) found — cannot commit.

Items requiring immediate fix:
1. {file}:{line} - {description}

Fix the issues and re-run /git-workflow.
```

---

## Phase 1 Output (passed as input to Phase 2)

```
[CHANGE ANALYSIS]
Project: {PROJECT_NAME}
ITSM Number: #ITSM-{number} / none
commit type: feat / fix / improve / ...
Affected Agents: {agent list} ← NEPES_AI_AGENTS only
Changed File List: {file list}
Change Summary: {one-line description}
Current Branch: {branch name}
Branch Strategy: new branch / keep current branch
```

## Checkpoint Save (automatic)

After Phase 1 output is confirmed, run the following command via Bash to save progress.
Do not stop the workflow if this fails (best-effort).

```bash
node -e "
  const cp = require(process.env.USERPROFILE + '/.claude/hooks/checkpoint.js');
  const log = require(process.env.USERPROFILE + '/.claude/hooks/log-workflow.js');
  cp.saveCheckpoint('git-workflow', 'phase1', {
    project: '{PROJECT_NAME}',
    commitType: '{COMMIT_TYPE}',
    itsm: '{ITSM_NUMBER}',
    branch: '{current branch name}',
    branchStrategy: '{new branch / keep current branch}',
    summary: '{change summary}'
  });
  log.startTimer('git-workflow');
  log.logWorkflow({
    workflow: 'git-workflow', phase: 1, event: 'phase1_complete',
    result: 'success',
    project: '{PROJECT_NAME}', commitType: '{COMMIT_TYPE}', itsm: '{ITSM_NUMBER}'
  });
"
```

Replace `{...}` with actual values determined in this phase.

## Failure Handling

### Failure Logging

Log all failures in Phase 1 (including workflow termination) with the following command:

```bash
node -e "
  const fl = require(process.env.USERPROFILE+'/.claude/hooks/failure-logger.js');
  fl.logFailure({
    workflow: 'git-workflow', phase: 1,
    failureType: '{TYPE}', subType: '{SUBTYPE}',
    severity: '{SEVERITY}',
    cause: '{error message or termination reason}',
    context: { project: '{PROJECT_NAME}', branch: '{branch name}' },
    recoveryAction: '{action taken}',
    resolved: {true/false},
    retryCount: 0
  });
"
```

**Events to log:**
- Integration integrity check failed (failureType: `script_error`, subType: `integrity_check_fail`)
- Integration integrity check script failed to run (failureType: `script_error`, subType: `integrity_check_crash`)
- Blocked branch detected (failureType: `validation_fail`, subType: `blocked_branch`)
- User selected N at change confirmation (failureType: `validation_fail`, subType: `user_rejected`)
- Code review REJECT (failureType: `validation_fail`, subType: `review_rejected`)

Replace `{...}` with actual values.

### Logging Failures/Aborts to Workflow Log

When the workflow terminates in Phase 1, also log the result to the workflow log in addition to failure-logger:

```bash
node -e "
  const log = require(process.env.USERPROFILE + '/.claude/hooks/log-workflow.js');
  log.logWorkflow({
    workflow: 'git-workflow', phase: 1, event: 'phase1_failed',
    result: '{failure or aborted}',
    error: '{termination reason summary}',
    project: '{PROJECT_NAME}'
  });
"
```

- When the **workflow itself terminates** due to blocked branch, validation failure, etc.: `result: 'failure'`
- When the user **voluntarily aborts** by selecting N: `result: 'aborted'`