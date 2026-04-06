# Configuration Management Audit (CM Audit)

Runs a Configuration Management Audit (CM Audit) for the project.
Automatically checks checklist items and reports the results.

## User Input
$ARGUMENTS

## Project Configuration Table

Check the project name in $ARGUMENTS. If not provided, ask the user.

| Project Name | Keyword | Main Branch | Version Source | Version Extraction Method |
|-------------|---------|------------|---------------|--------------------------|
| NEPES_AI_AGENTS | naa | main | .claude/version.txt + CLAUDE.md | Extract from line "Current version: v{x.y.z}" |
| APP_RMSPAGE | app-rmspage | develop | ./VERSION | First token of first line (e.g., "2.4.3 chore: ...") |
| RMSSERVER | rmsserver | master | ./VERSION | Entire file (version number only) |
| YTAP | ytap | master | src/Common/Version/YTAPVersion.java | Extract from constant VERSION = "{x.y.z}" |
| YTAP_MANAGER | ytap-mgr | master | ./VERSION | Entire file (version number only) |

## Execution Procedure

### Step 1: Tag Consistency Check

Collect and compare the following values.

```bash
# Latest tag
git describe --tags --abbrev=0

# Extract version from version source file (refer to per-project method)
```

Check items:
- [A1] Latest tag == version in version source file (account for "v" prefix in tag when comparing)
- [A2] (NEPES_AI_AGENTS only) Latest tag == version on first line of CLAUDE.md
- [A3] Does the latest tag exist on the {main branch}?

```bash
# Verify A3
git branch --contains $(git rev-list -n 1 $(git describe --tags --abbrev=0)) | grep {main branch}
```

### Step 2: Tag Type Check

Check the type and message of the 5 most recent tags.

```bash
git for-each-ref refs/tags --sort=-creatordate --format='%(refname:short) | %(objecttype)' --count=5
git tag -l --sort=-creatordate --format='%(refname:short) | %(contents:subject)' | head -5
```

Check items:
- [B1] Are all recent tags annotated tags? (objecttype == tag)
- [B2] Does the tag message include the commit message subject? (version number only is NG)

### Step 3: Branch Status Check

```bash
git branch
git log {main branch} --oneline --no-merges --count=10
```

Check items:
- [C1] Are there no unnecessary feature branches remaining besides {main branch}?
- [C2] Are there no direct commits to {main branch}? (no direct commits other than "chore: bump version")

### Step 4: Change History Consistency Check (NEPES_AI_AGENTS, APP_RMSPAGE only)

```bash
git tag -l | wc -l
```

Compare the number of change history entries in the version file with the number of tags.

Check items:
- [D1] Does the number of version file history entries match the number of tags?
- [D2] Does the latest history entry match the latest tag version?

Skip this step for other projects.

### Step 5: Remote Synchronization Check

```bash
git push origin --tags --dry-run 2>&1
```

Check items:
- [E1] Have all local tags been pushed to remote?

### Step 6: Integration Integrity Automated Verification (NEPES_AI_AGENTS only)

```bash
node .claude/scripts/integrity-check.js
```

Check items:
- [F1] Is the script exit code 0? (all PASS)
- [F2] If there are FAIL items, include details in the audit result

**If the user requests detailed information**, re-run with the `--verbose` option.

Skip this step for other projects.

### Step 7: Results Report

Output in the following markdown format inside a code block. Copy to Loop for use.

````
```
## Configuration Management Audit Results ({Project Name})

**Audit Date:** {today's date}

### 1. Tag Consistency

| Item | Check Content | Result | Details |
|------|-------------|--------|---------|
| A1 | Tag-version file match | {OK/NG} | {details} |
| A2 | Tag-CLAUDE.md match | {OK/NG/N/A} | {NAA only} |
| A3 | Tag location ({main branch}) | {OK/NG} | {details} |

### 2. Tag Type

| Item | Check Content | Result | Details |
|------|-------------|--------|---------|
| B1 | Annotated tag status | {OK/NG} | {details} |
| B2 | Tag message included | {OK/NG} | {details} |

### 3. Branch Status

| Item | Check Content | Result | Details |
|------|-------------|--------|---------|
| C1 | Remaining feature branches | {OK/NG} | {details} |
| C2 | Direct commits to {main branch} | {OK/NG} | {details} |

### 4. Change History Consistency (applicable projects only)

| Item | Check Content | Result | Details |
|------|-------------|--------|---------|
| D1 | History-tag count match | {OK/NG/N/A} | {details} |
| D2 | Latest history-tag match | {OK/NG/N/A} | {details} |

### 5. Remote Synchronization

| Item | Check Content | Result | Details |
|------|-------------|--------|---------|
| E1 | Tag push status | {OK/NG} | {details} |

### 6. Integration Integrity (NAA only)

| Item | Check Content | Result | Details |
|------|-------------|--------|---------|
| F1 | integrity-check all PASS | {OK/NG/N/A} | {details} |

### Summary: {total OK count}/{total items} passed

### NG Action Required Items (omit this section if no NG)

**[{Item ID}]** {details and remediation steps}
```
````

If there are NG items, provide remediation guidance for each item.

## Usage Examples

```
/cm-audit naa
/cm-audit rmsserver
/cm-audit ytap
```