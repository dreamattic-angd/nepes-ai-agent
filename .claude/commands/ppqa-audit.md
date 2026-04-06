# PPQA Self-Audit

Runs a Process and Product Quality Assurance self-audit (PPQA Audit) for the project.
Automatically checks checklist items and reports the results.

## User Input
$ARGUMENTS

## Project Configuration Table

Check the project name in $ARGUMENTS. If not provided, ask the user.

| Project Name | Keyword | Main Branch | Commit Format | Convention Start | ITSM Start |
|-------------|---------|------------|--------------|-----------------|-----------|
| NEPES_AI_AGENTS | naa | main | type: description | v2.0 | v20.1 |
| APP_RMSPAGE | app-rmspage | develop | type: description | v0.1.0 | v2.4.3 |
| RMSSERVER | rmsserver | master | type(MODEL): description | v1.0.0 | v1.0.1 |
| YTAP | ytap | master | type(EQP_ID): description | v0.0.1 | v0.0.3 |
| YTAP_MANAGER | ytap-mgr | master | type: description | v1.0.1 | v1.0.14 |

## Execution Procedure

### Step 1: Collect Commits to Check

```bash
# All commits since {convention start} (for commit convention and branch strategy check)
git log {convention start}..HEAD --oneline

# Commits since {ITSM start} (for ITSM number check)
git log {ITSM start}..HEAD --oneline
```

### Step 2: Check Commit Convention Compliance

Inspect commit messages since {convention start}.

```bash
git log {convention start}..HEAD --oneline --no-merges
```

Check items:
- [A1] Do all commits follow the project's {commit format}?
  - Allowed types: feat, fix, improve, docs, refactor, chore
  - Commits with "merge:" prefix are merge commits and are excluded from this check
- [A2] Are there no commits with missing types other than "chore: bump version"?

### Step 3: Check ITSM Number Linkage

Inspect commits since {ITSM start}.

```bash
# Representative commits (feat, fix, improve, docs, refactor)
git log {ITSM start}..HEAD --oneline --no-merges --grep="^feat\|^fix\|^improve\|^docs\|^refactor"

# Merge commits
git log {ITSM start}..HEAD --oneline --merges
```

Check items:
- [B1] Do feat/fix/improve/docs/refactor commits include (#ITSM-XXXX)?
- [B2] Do merge commits include (#ITSM-XXXX)?
- [B3] chore(bump) commits are OK without an ITSM number (excluded from check)

### Step 4: Check Branch Strategy Compliance

```bash
# Check direct commits on {main branch} since {convention start}
git log {convention start}..HEAD --oneline --no-merges --first-parent {main branch}

# Check merge commits
git log {convention start}..HEAD --oneline --merges --first-parent {main branch}
```

Check items:
- [C1] Are there no direct commits to {main branch}? (excluding "chore: bump version")
- [C2] Have all feature changes been merged via feature branches with --no-ff?

### Step 5: Results Report

Output in the following markdown format inside a code block. Copy to Loop for use.

````
```
## PPQA Self-Audit Results ({Project Name})

**Audit Date:** {today's date}
**Check Scope:** {since last audit ~ present / all (first audit)}

### 1. Commit Convention Compliance (since {convention start})

| Item | Check Content | Result | Details |
|------|-------------|--------|---------|
| A1 | {commit format} format compliance | {OK/NG} | {details} |
| A2 | No commits with missing type | {OK/NG} | {details} |

### 2. ITSM Number Linkage (since {ITSM start})

| Item | Check Content | Result | Details |
|------|-------------|--------|---------|
| B1 | Representative commits include ITSM | {OK/NG} | {details} |
| B2 | Merge commits include ITSM | {OK/NG} | {details} |

### 3. Branch Strategy Compliance (since {convention start})

| Item | Check Content | Result | Details |
|------|-------------|--------|---------|
| C1 | No direct commits to {main branch} | {OK/NG} | {details} |
| C2 | --no-ff merge used | {OK/NG} | {details} |

### Summary: {total OK count}/{total items} passed

### NG Violation Details (omit this section if no NG)

**[{Item ID}] Violating commits:**
- {commit hash} {commit message}

**Cause:** {cause description}
**Action:** {action taken}
```
````

If there are NG items, list the violating commits specifically for each item.
Do not modify already-pushed commits; provide improvement guidance to prevent the same violations in the future.

## Usage Examples

```
/ppqa-audit naa
/ppqa-audit rmsserver
/ppqa-audit ytap
```