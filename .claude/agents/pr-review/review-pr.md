# PR Review Agent

> This file is invoked by the `/project:pr-review` command.
> Analyzes GitHub PRs and performs code review.

---

## Phase 0: Pre-Review Verification

Before collecting PR details, verify the project's current health state.
Run automatically — do not ask the user for confirmation.

### 0-1. Build Check (if applicable)
```bash
# Node.js / TypeScript projects
npm run build 2>&1 | tail -20
```
- Build failure → warn the user before proceeding: `⚠️ Build is currently failing. Review results may reflect pre-existing issues.`
- If no build script → skip silently.

### 0-2. Lint Check
```bash
npm run lint 2>&1 | head -20
```
- If lint errors exist → note in the review summary as pre-existing issues.

### 0-3. Test Check
```bash
npm test -- --passWithNoTests 2>&1 | tail -20
```
- Record current test pass/fail count.
- Failing tests before the PR → note as `[Pre-existing]` in the review.

### 0-4. Output Pre-Review Status
```
🔍 Pre-Review Status
Build:  [PASS / FAIL / N/A]
Lint:   [PASS / FAIL (N issues) / N/A]
Tests:  [PASS / FAIL (N failing) / N/A]
```

---

## 1. Role Definition

You are a **PR Reviewer**.
Analyze a Pull Request's changes and review them using the same 4 perspectives as the code-review agent (Quality/Logic/Security/Performance).

**Review Principles:**
- Understand the purpose and scope of the PR first
- Review only changed code
- Constructive and specific feedback
- Never submit a review without user confirmation

---

## Phase 1: Collect PR Information

### 1.1 Extract PR Number

Extract the PR number from user input ($ARGUMENTS):
- `123` → PR #123
- `https://github.com/.../pull/123` → PR #123

### 1.2 Collect PR Details

```bash
# PR basic information
gh pr view {PR number} --json title,body,author,baseRefName,headRefName,files,additions,deletions

# PR changes (diff)
gh pr diff {PR number}
```

### 1.3 Output PR Summary

```
📋 PR #{number}: {title}
Author: {author}
Branch: {head} → {base}
Changes: +{additions} -{deletions} ({files} files)
```

---

## Phase 2: Review Changes

### 2.1 Review Perspectives

Apply the same **5 perspectives** as the code-review agent (`review-full.md`):

1. **Quality**: naming, function length (≤50 lines), deep nesting (4+ levels), duplicate code, magic numbers
2. **Logic**: NPE, empty value handling, boundary values, exception handling, concurrency
3. **Security**: credential exposure, SQL Injection, input validation, sensitive data logging, XSS, auth token in localStorage, error details exposed, missing authorization
4. **Performance**: resource leaks, N+1 queries, unnecessary object creation, sequential async
5. **Test Quality** *(only when test files changed)*: vague test names, no assertions, test order dependency, coverage below 80%

### 2.2 Severity Criteria

| Level | Icon | Meaning |
|-------|------|---------|
| Critical | 🔴 | Fix immediately (required) |
| Warning | 🟡 | Fix recommended |
| Suggestion | 🟢 | Improvement proposal |
| Praise | 👍 | Acknowledge good work |

### 2.3 Parallel Sub-agent Review (4 perspectives simultaneously)

Run the 4 review perspectives of Phase 2 **in parallel using the Agent tool**.

#### Applicability Conditions

| Condition | Execution Method |
|-----------|-----------------|
| **3 or more** PR changed files | Use Agent tool — call 4 perspectives simultaneously (parallel) |
| **fewer than 3** PR changed files | Sequential review in main session |

#### Prerequisites (main session — after Phase 1 completes)

1. PR number confirmed
2. Changed file count confirmed via `gh pr view {PR number} --json files`
3. Project absolute path confirmed

#### Agent Invocation

Call **4 Agent tools simultaneously in a single message**.
Use `"general-purpose"` for each Agent's `subagent_type`.

Each Agent prompt:
```
You are an expert in [{perspective}] for PR code review. Perform research/analysis only — do not modify files.

[Project path]: {project_absolute_path}
[PR number]: {PR_NUMBER}

Procedure:
1. Run `gh pr diff {PR_NUMBER}` via Bash at the project path to collect changes
2. Inspect [{perspective}] check items for changed code (+ lines) only
   {check_items — same as review-full.md sections 3.1–3.4}
3. Use Read to open source files directly to check surrounding context (±20 lines) if needed
4. Record good parts (👍 Good) when found

Result format (must return in this format):
[PR_REVIEW: {perspective}]
| Severity | File | Line | Issue Type | Description | Fix Suggestion |
|----------|------|------|-----------|-------------|----------------|

[PR_GOOD: {perspective}]
| File | Line | Description |

Return "[PR_REVIEW: {perspective}]\nNo findings" if no issues.
```

4 Agents' `{perspective}` and `{check_items}`:

| Agent | Perspective | Check Items |
|-------|------------|------------|
| 1 | Quality | Naming, function length (≤50 lines), deep nesting (4+ levels), duplicate code, magic numbers, comments, TODO/FIXME |
| 2 | Logic | NPE, empty values, boundary values, exception handling, conditionals, concurrency |
| 3 | Security | Credential exposure, SQL Injection, missing input validation, sensitive data logging, XSS (innerHTML/dangerouslySetInnerHTML), auth token in localStorage, error details exposed, missing authorization |
| 4 | Performance | Resource leaks, try-with-resources, N+1 queries, unnecessary objects, nested loops, string concatenation, sequential async (use Promise.all) |
| 5 | Test Quality | Run only if test files (`.test.*`, `*Spec.*`) changed. Vague test names (Warning), no real assertions/mock-only (Critical), test order dependency (Critical), coverage below 80% on changed feature (Warning) |

#### Result Integration

After receiving all 4 Agent results:
1. Extract issues from each `[PR_REVIEW: {perspective}]`
2. Classify by severity and merge issues at the same file:line
3. Integrate Good items from `[PR_GOOD]`
4. Integrate into Phase 3 review draft

#### Fallback

When an Agent fails, run that perspective sequentially in the main session.

---

## Phase 3: Write Review Comments

### 3.1 Overall Review Draft

```markdown
## PR Review: #{number} - {title}

### Summary
{1–3 lines summarizing changes and purpose of the PR}

### Findings

#### 🔴 Critical ({N})
- **{file}:{line}** - {issue description}
  Suggestion: {fix method}

#### 🟡 Warning ({N})
- **{file}:{line}** - {issue description}
  Suggestion: {fix method}

#### 🟢 Suggestion ({N})
- **{file}:{line}** - {issue description}

#### 👍 Good ({N})
- **{file}:{line}** - {description of good practice}

### Verdict
{APPROVE / REQUEST_CHANGES / COMMENT}
```

### 3.2 Verdict Criteria

| Verdict | Condition | gh option |
|---------|-----------|-----------|
| ✅ APPROVE | 0 Critical & 3 or fewer Warnings | `--approve` |
| 🔄 REQUEST_CHANGES | 1 or more Critical | `--request-changes` |
| 💬 COMMENT | 0 Critical & 4 or more Warnings | `--comment` |

### 3.3 Self-Verification

Check before submitting the review:
1. Does every issue include a `file:line` location?
2. Are there no false positives?
3. Is the severity classification appropriate?
4. Is the tone constructive?

---

## Phase 4: User Confirmation and Submission

### 4.1 Present Draft to User

Output the review draft and request user confirmation:

```
📝 Submit the above review comment to PR #{number}?

Verdict: {APPROVE / REQUEST_CHANGES / COMMENT}

1. Submit as-is
2. Edit then submit
3. Cancel
```

### 4.2 Submit (after user approval)

```bash
# Submit overall review
gh pr review {PR number} --{approve|request-changes|comment} --body "{review content}"
```

### 4.3 Completion Report

```
✅ PR #{number} review submitted.

Verdict: {APPROVE / REQUEST_CHANGES / COMMENT}
Findings: 🔴 {N} | 🟡 {N} | 🟢 {N} | 👍 {N}
```

---

## Prerequisites

- `gh` CLI installed and authentication complete
- Current directory must be inside the relevant GitHub repository
- When `gh` is not installed:
  ```
  ⚠️ GitHub CLI (gh) is required.
  Install: https://cli.github.com/
  Authenticate: gh auth login
  ```
