# Failure Pattern Distillation

Promotes recurring failure patterns to permanent rules in CLAUDE.md and cleans up the original logs.

## Automatic Trigger

When git-workflow runs, it automatically checks the date of the last distillation.
If **14 or more days have elapsed**, this command runs automatically before entering the workflow.
Manual execution is also available: `/distill-failures`

## User Input

$ARGUMENTS (optional — project keyword filter, e.g., `naa`, `rmsserver`)

## Confirmation Bias Prevention Principles

1. **Only patterns with verified: true can be promoted** — unverified hypotheses never go into CLAUDE.md
2. **User (human) review is required** — no automatic promotion. Verify that conditions are accurate and still valid
3. **Expired records are automatically excluded** — patterns past their expires date are excluded from candidates
4. **Project-level isolation** — failure/success records for each project are separated by the project field to prevent cross-contamination

## Procedure

### Step 0: Project Detection

Detect the current project. Extract the repo name from `git remote get-url origin` to determine the project identifier:
- `nepes-ai-agents` → NEPES_AI_AGENTS
- `RMSSERVER` → RMSSERVER
- `YTAP` → YTAP
- `APP_RMSPAGE` → APP_RMSPAGE
- `Web_rmspage` → WEB_RMSPAGE
- `YTAP_MANAGER` → YTAP_MANAGER

Use the detected project as a filter for all subsequent steps.

### Step 1: Check Last Run Date and Archive Expired Records

Check the last distillation run date:

```bash
node -e "const fs=require('fs'),p=require('path'),f=p.join(process.env.USERPROFILE||process.env.HOME,'.claude','logs','distill-last-run.json'); if(!fs.existsSync(f)){console.log('__NEVER_RUN__')}else{const d=JSON.parse(fs.readFileSync(f,'utf8')); console.log(JSON.stringify(d))}"
```

- **`__NEVER_RUN__`** → First run. Proceed.
- **Data present** → Calculate elapsed days from last run date. If fewer than 14 days, output "Distillation was run {N} days ago. Skipping." and exit. (Ignored for manual execution — always continue.)

Archive expired failure records:

```bash
node -e "const fl=require(process.env.USERPROFILE+'/.claude/hooks/failure-logger.js'); const r=fl.archiveExpired(); console.log(JSON.stringify(r));"
```

### Step 2: Request Review of Unverified Hypotheses

Display the list of unverified (verified: false) patterns for the current project and request user review:

```bash
node -e "const fr=require(process.env.USERPROFILE+'/.claude/hooks/failure-registry.js'); const u=fr.getUnverifiedPatterns({sinceDays:30, project:'{PROJECT}'}); if(u.length===0) console.log('__NO_UNVERIFIED__'); else console.log(JSON.stringify(u,null,2));"
```

- **`__NO_UNVERIFIED__`** → Output "No unverified hypotheses." and proceed to Step 3
- **If unverified patterns exist** → Display in table format and request verification:

```
📋 [{PROJECT}] Unverified Failure Hypotheses (User Review Required)

The following patterns are still hypotheses. Please verify whether each condition is accurate and the lesson is still valid.

| # | Type | Count | Condition | Lesson | Verified? |
|---|------|-------|-----------|--------|-----------|
| 1 | {type} | {count}x | {condition or 'no condition recorded'} | {lesson or cause} | Y/N |

Enter the pattern numbers to verify (comma-separated, 'skip' to skip):
```

⛔ **Always wait for user response.**

- **`skip`** → Proceed to Step 3 without verification
- **Number selection** → Change selected patterns to verified: true:

```bash
node -e "const fl=require(process.env.USERPROFILE+'/.claude/hooks/failure-logger.js'); const r=fl.setVerified('{failureType}', '{subType}', true, '{PROJECT}'); console.log(JSON.stringify(r));"
```

### Step 3: Query Distillation Candidates

Query patterns in the current project that are repeated 3 or more times in the last 30 days and have verified: true:

```bash
node -e "const fr=require(process.env.USERPROFILE+'/.claude/hooks/failure-registry.js'); const c=fr.getDistillCandidates({project:'{PROJECT}'}); if(c.length===0) console.log('__NO_CANDIDATES__'); else console.log(JSON.stringify(c,null,2));"
```

- **`__NO_CANDIDATES__`** → Output "No patterns to distill." and proceed to Step 5 (record run date)
- **If candidates exist** → Proceed to Step 4

### Step 4: User Confirmation and CLAUDE.md Promotion

Display candidate patterns in table format and confirm promotion:

```
📋 [{PROJECT}] Distillation Candidate Patterns (3+ repetitions + verified)

| # | Type | Repetitions | Condition | Lesson | Prevention Suggestion |
|---|------|------------|-----------|--------|----------------------|
| 1 | {failureType/subType} | {count}x | {condition} | {lesson} | {suggestedPrevention} |

Enter the pattern numbers to promote (comma-separated, 'all' or 'none'):
```

⛔ **Always wait for user response.**

- **`none`** → Output "Skipping distillation." and proceed to Step 5
- **Numbers or `all`** → Add selected patterns to CLAUDE.md:

```bash
node -e "const fr=require(process.env.USERPROFILE+'/.claude/hooks/failure-registry.js'); const c=fr.getDistillCandidates({project:'{PROJECT}'}); const text=fr.formatDistillRules(c); console.log(text);"
```

In the **project CLAUDE.md** (repository's `CLAUDE.md`), find the `## Failure Prevention Rules` section:
- **If section exists** → Add new rules below existing rules (check for duplicates)
- **If section does not exist** → Create a new section at the end of the file

Before adding rules, show the user the content to be added and get confirmation.

Remove the original records of promoted patterns:

```bash
node -e "const fr=require(process.env.USERPROFILE+'/.claude/hooks/failure-registry.js'); const r=fr.purgeDistilled('{failureType}', '{subType}', '{PROJECT}'); console.log(JSON.stringify(r));"
```

### Step 4.5: Eval Case Review (Optional)

If any of the promoted patterns have **rules testable as pure functions**, suggest adding eval cases to the user.

```
📋 [{PROJECT}] Eval Case Review

Among the promoted rules, the following types are useful to add as eval cases for regression prevention:
- Version calculation rules → evals/git-workflow/ (target: version-calc)
- Branch blocking rules → evals/git-workflow/ (target: branch-validation)
- Review judgment rules → evals/code-review/ (target: review-judgment)

Add eval cases? (Y/N/skip)
```

- **`Y`** → Create eval JSON cases matching the relevant patterns in the `evals/{workflow}/` directory
- **`N` or `skip`** → Skip and proceed to Step 5
- **No matching type** → Automatically skip this step

## Usage Examples

```
/distill-failures
/distill-failures naa
/distill-failures rmsserver
```

### Step 5: Record Run Date and Report Results

Record the last run date:

```bash
node -e "const fs=require('fs'),p=require('path'),d=p.join(process.env.USERPROFILE||process.env.HOME,'.claude','logs'); if(!fs.existsSync(d))fs.mkdirSync(d,{recursive:true}); const f=p.join(d,'distill-last-run.json'); const prev=fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):{}; prev['{PROJECT}']=new Date().toISOString().slice(0,10); fs.writeFileSync(f,JSON.stringify(prev,null,2),'utf8'); console.log('saved:',prev['{PROJECT}']);"
```

```
✅ [{PROJECT}] Failure Pattern Distillation Complete

Expired archived: {archived} items
Verified: {verified} items
Promoted patterns: {N} items
- {failureType/subType}: {count}x [condition: {condition}] → Promoted to CLAUDE.md rule
Cleaned up logs: {total removed} deleted, {total kept} retained
Next automatic run: {date 14 days from now}
```
