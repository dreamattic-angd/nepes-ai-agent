# CLAUDE.md Health Check

Checks whether the project's CLAUDE.md is up to date and free of unnecessary content.

## Check Procedure

### Step 1: Collect Current State

Read the following files:
- `CLAUDE.md` (project guidelines)
- `.claude/version.txt` (version info and agent status)
- All command file list under `.claude/commands/`

### Step 2: Checklist Verification

Verify the following items in order:

| # | Check Item | Verification Method |
|---|-----------|-------------------|
| 1 | **Version match** | Does the version in CLAUDE.md match the current version in version.txt? |
| 2 | **Deprecated rules** | Are there rules referencing agents/commands/settings that are no longer in use? |
| 3 | **Missing rules** | Are currently active agents/commands reflected in CLAUDE.md? |
| 4 | **Conciseness** | Are there unnecessarily long descriptions or duplicate content? (token waste) |
| 5 | **Accuracy** | Are DB connection info, paths, branch names, etc. up to date? |
| 6 | **Agent status** | Does the agent list in version.txt match the actual agents/ folder? |
| 7 | **Model version** | Has the Claude model family in use changed? If so, recommend re-verifying key workflows |
| 8 | **Unverified failure hypotheses** | Are there recurring patterns with verified: false in failures.jsonl? If so, request user review |
| 9 | **Expired failure records** | Are there failure records past their expires date? If so, suggest archiving |

### Step 3: Output Results

```markdown
# 📋 CLAUDE.md Health Check Results

**Check Date**: {YYYY-MM-DD}
**CLAUDE.md Version**: {version}
**version.txt Version**: {version}

## Check Results

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Version match | ✅/❌ | {description} |
| 2 | Deprecated rules | ✅/❌ | {description} |
| 3 | Missing rules | ✅/❌ | {description} |
| 4 | Conciseness | ✅/⚠️ | {line count}, {token estimate} |
| 5 | Accuracy | ✅/❌ | {description} |
| 6 | Agent status | ✅/❌ | {description} |
| 7 | Unverified failure hypotheses | ✅/⚠️ | {N unverified, N expired} |

## Improvement Suggestions

{Specific list of improvement suggestions}
```

## Notes

- Running this check monthly is recommended
- Keeping CLAUDE.md at 25 lines or fewer is ideal
- Based on the check results, only suggest modifications to the user — proceed with changes only after user confirmation
