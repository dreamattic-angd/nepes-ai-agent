# Phase 4 — Cleanup

## Role
Delete the feature branch and output the completion report.

## Procedure

### Step 1: Delete Feature Branch

```bash
git branch -d {feature branch name}
```

### Step 2: Completion Report

**develop merge (normal):**
```
════════════════════════════════════════
✅ Workflow Complete
════════════════════════════════════════

[Project] {PROJECT_NAME}
[Version] {old version} → {new version}
[Change] {commit message}
[Branch] {feature branch name} → develop (merged, branch deleted)
[Tag] v{new version} created

────────────────────────────────────────
⛔ Always include tags when pushing

CLI:
  git push origin develop
  git push origin v{new version}

Or:
  git push origin develop --tags

Using Fork:
  Push button → check "Include tags"

⛔ For further changes, always run a new /git-workflow.
   Never commit directly to develop.
────────────────────────────────────────
```

**When {MAIN_BRANCH} release merge is included:**
```
════════════════════════════════════════
✅ Workflow Complete (release merge included)
════════════════════════════════════════

[Project] {PROJECT_NAME}
[develop Version] {old version} → {new version}
[Release Version] {new version} → v{new MAJOR version}
[Change] {commit message}
[Branch] {feature branch name} → develop → {MAIN_BRANCH} (merged, branch deleted)
[Tags] v{new version} (develop), v{new MAJOR version} (release)

────────────────────────────────────────
⛔ Always include tags when pushing

CLI:
  git push origin develop
  git push origin {MAIN_BRANCH}
  git push origin v{new version}
  git push origin v{new MAJOR version}

Or:
  git push origin develop {MAIN_BRANCH} --tags

Using Fork:
  Push button → check "Include tags"
────────────────────────────────────────
```

## Checkpoint Clear + Workflow Log (automatic)

After the completion report output, run the following command via Bash.
Do not stop the workflow if this fails (best-effort).

```bash
node -e "
  const cp = require(process.env.USERPROFILE + '/.claude/hooks/checkpoint.js');
  const log = require(process.env.USERPROFILE + '/.claude/hooks/log-workflow.js');
  const durationMs = log.getElapsedMs('git-workflow');
  log.logWorkflow({
    workflow: 'git-workflow', phase: 4, event: 'workflow_complete',
    result: 'success',
    durationMs: durationMs,
    project: '{PROJECT_NAME}', oldVersion: '{old version}', newVersion: '{new version}',
    tag: 'v{new version}', itsm: '{ITSM_NUMBER}', commitType: '{COMMIT_TYPE}'
  });
  log.clearTimer('git-workflow');
  cp.clearCheckpoint('git-workflow');
"
```

Replace `{...}` with actual values determined throughout the workflow.

## Step 3 (optional): Create Draft PR

**Run only when `Draft PR` in the project settings table is Y AND the user requests it with phrases like "create a PR", "PR creation", "Draft PR", etc.**
Skip this step if not requested.

```bash
# Create Draft PR using GitHub CLI
gh pr create --draft \
  --title "{commit type}: {commit message summary}" \
  --body "## Changes
- {key change content}

## Version
{old version} → {new version}

## Related Tag
v{new version}"
```

### Completion Report

```
📝 Draft PR created.

PR URL: {PR URL}
Status: Draft (not ready for review)

To mark as ready for review:
  gh pr ready {PR number}
```

**Notes:**
- Requires `gh` CLI to be installed and authenticated
- If `gh` is not installed, output a guidance message and skip

---

## Push-related Rules

**Claude Code does not execute push directly.** The user performs it manually.
If the user says "push", respond with:

```
Please push manually.

CLI:
  git push origin develop --tags

If {MAIN_BRANCH} release merge was also included:
  git push origin develop {MAIN_BRANCH} --tags

Fork:
  Push → check "Include tags"

⚠️ Pushing without tags will lose the version history.
```

## Failure Handling

### Retry Rules

| Command | Max Retries | Retry Condition | When Retry Not Possible |
|---------|------------|----------------|------------------------|
| `git branch -d` | 1 | not fully merged → ask user to confirm `-D` usage, retry | Guide user to manage branch manually |
| `gh pr create` | 2 | network error → retry at 2-second intervals | Skip PR creation, guide user to create manually |

### `git branch -d` Failure Handling

```
⚠️ Failed to delete feature branch: {error message}

The branch may not have been fully merged.
Proceed with force deletion (-D)? (Y/N)
```
- Y → run `git branch -D {branch name}`
- N → keep branch, provide guidance in completion report

### Failure Logging

Log all failures with the following command:

```bash
node -e "
  const fl = require(process.env.USERPROFILE+'/.claude/hooks/failure-logger.js');
  fl.logFailure({
    workflow: 'git-workflow', phase: 4,
    failureType: '{TYPE}', subType: '{SUBTYPE}',
    severity: '{SEVERITY}',
    cause: '{error message}',
    context: { branch: '{branch name}' },
    recoveryAction: '{recovery action taken}',
    resolved: {true/false},
    retryCount: {retry count}
  });
"
```

Replace `{...}` with actual values.
