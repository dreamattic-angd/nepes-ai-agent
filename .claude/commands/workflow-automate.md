---
description: "Automatically executes the design→implementation→review→test workflow. Analyzes the input to auto-determine the mode (new feature / bug fix / new project) and routes to lightweight or precision design based on complexity."
---

**First, read the `.claude/workflow-rules.md` file using the Read tool and internalize the rules. Then execute the following.**

Input: $ARGUMENTS

You are the **orchestrator**. You do not directly design, code, review, or test.
At each Phase, you invoke specialized sub-agents, verify their results, and obtain user approval at checkpoints.

---

## Step 0: Automatic Mode Determination

Analyze the input ($ARGUMENTS) and determine one of the following 3 modes:

### Determination Criteria

| Mode | Keywords/Patterns | Examples |
|------|------------------|---------|
| **bugfix** | bug, fix, error, broken, not working, failure, issue number (#123) | "Payment amount shows as 0", "#42 login failure" |
| **project** | create, new project, from scratch, init, build app | "Create a todo app", "Generate a blog platform" |
| **feature** | add, feature, implement, improve, integrate, attach | "Add login feature", "Implement dark mode" |

### Determination Priority
1. If there is an issue number (#number) → **bugfix**
2. If there is no source code in the project root (empty project) → **project**
3. Fix/error/bug related keywords → **bugfix**
4. Create/build keywords + no current source code → **project**
5. Otherwise → **feature**

### Ambiguous Cases
If determination is uncertain, ask the user:
```
Analyzed your input: "{$ARGUMENTS}"

Which type of task is this?
1. 🐛 Bug fix — fix an issue in existing code
2. ✨ New feature — add a feature to an existing project
3. 🚀 New project — create a project from scratch
```

---

## Step 0.5: Complexity Determination (Design Agent Routing)

After mode determination, analyze the input to determine **design complexity**.
First, check whether the task qualifies for a lightweight escape. If it does, skip the entire workflow and execute directly.

### Lightweight Escape (execute directly without workflow)

If **any one** of the following conditions is met, skip the workflow entirely and proceed with direct execution:

| Condition | Description |
|-----------|-------------|
| **No design decisions needed** | Task is a straightforward add/delete/partial edit of existing files |
| **No multi-agent coordination needed** | Task can be completed by a single agent in one pass |
| **No new system structure design needed** | Task does not introduce new components, modules, or architectural patterns |

**When escaping:**
```
⚡ Lightweight task detected — skipping workflow.
Reason: {which condition(s) matched}
Proceeding directly.
```
→ Execute the task directly using Claude Code default behavior. Do not invoke sub-agents, create spec files, or run checkpoints.

---

### Determination Criteria

| Indicator | Small-scale (Lightweight) | Medium~Large-scale (Precision) |
|-----------|--------------------------|-------------------------------|
| Number of affected components | 1 | 2 or more |
| External system integration | None | Yes (protocol/API/HW) |
| New system | Modifying existing code | Developing new system |
| DB/API design needed | Not needed | Needed |
| User explicit keywords | — | "design doc", "architecture", "architect" |

### Routing Rules

1. **MODE: project** → always **precision** (software-develop-architect)
2. **User explicitly mentions "design doc"/"architecture"/"architect"** → **precision**
3. Any **one or more** medium~large-scale indicators → **precision**
4. **All** small-scale conditions met → **lightweight** (architect)

### Existing Design Document Detection

Before entering Phase 1, check whether a design document already exists at the relevant specs/ path.

- feature: check for `specs/features/{feature name}/design.md`
- bugfix: check for `specs/bugs/{issue number}/analysis.md`
- project: check for `specs/requirements.md` or `specs/architecture.md`, or `*design*.md` under `specs/features/{project name}/`

If a design document exists:
```
📄 Existing design document found: {file path}

1. ♻️ Use existing design document — skip Phase 1, proceed to Phase 2 (implementation)
2. 🔄 Redesign — overwrite existing design document and redesign
```
Wait for user response before proceeding.

### Complexity Confirmation Output

```
🔍 Mode: {bugfix / feature / project}
📐 Design complexity: {small-scale (lightweight) / medium~large-scale (precision)}
📝 Task: {$ARGUMENTS summary}
🏗️ Design agent: {architect / software-develop-architect}
```

---

## Step 0.7: Requirements Probing (Conditional)

Evaluate the information density of $ARGUMENTS **before entering Phase 1**.

### Ambiguity Check (evaluate internally)

| Item | Satisfied? |
|------|-----------|
| Tech stack or target environment identifiable | Yes / No |
| Functional scope is clear (what is included / excluded) | Yes / No |
| Integration targets identified (external systems, APIs, HW, etc.) | Yes / No |
| Key constraints present (performance, security, scale, etc.) | Yes / No |

**2 or more "No" → probing required**
**1 or fewer "No" → skip probing, proceed to Phase 1 with original input**

### Mode-Specific Questions (max 3, ask only for missing items)

**MODE: feature**
- Q. What is the tech stack / framework of the target project?
- Q. Which existing feature or module does this integrate with?
- Q. What is the expected interaction form? (UI / REST API / CLI / background job)

**MODE: bugfix**
- Q. Under what conditions does the bug occur? (steps to reproduce)
- Q. What is the acceptable scope of the fix? (minimal patch only / refactoring allowed)
- Q. In which environment does the issue occur? (dev / staging / prod)

**MODE: project**
- Q. What is the preferred tech stack?
- Q. Who are the primary users and what is the core use case?
- Q. List the top 3 must-have features.

Output format:
```
Before starting the design, a few things need to be clarified.

Q1. [question]
Q2. [question]
(up to Q3)
```

**Wait for user answers before proceeding.**

### After Probing: Input Enrichment

After receiving answers, construct an enriched requirements block and use it as `{REQUIREMENTS}` in all subsequent design agent calls:

```
[Original Request]
{$ARGUMENTS}

[Clarified via Probing]
{probing Q&A summary}
```

Also add `PROBING_DONE: true` to the agent call prompt to signal that pre-interview was completed.

**If probing was skipped:** use original `$ARGUMENTS` as `{REQUIREMENTS}`. Do not include `PROBING_DONE`.

---

## MODE: feature (New Feature)

**Extract task name:** Extract the feature name from the input. (e.g., "Add login feature" → feature name="login")

### Phase 1: Design

**Lightweight design (architect):**
```
Use subagent architect to design feature "{feature name}".
MODE: feature
PROBING_DONE: true  ← include only if probing was completed in Step 0.7
Output to: specs/features/{feature name}/design.md
Requirements: {REQUIREMENTS}
Analyze the current project structure and create a complete design document.
```

**Precision design (software-develop-architect):**
```
Use subagent architect to design feature "{feature name}".
MODE: feature
PROBING_DONE: true  ← include only if probing was completed in Step 0.7
Output to: specs/features/{feature name}/design.md
Analyze the current project structure and create a comprehensive design document.
Requirements: {REQUIREMENTS}
```
→ In this case, invoke the agent using the prompt in `.claude/agents/software-develop-architect.md`.

Self-verification:
- [ ] Confirm design.md created
- [ ] Confirm completion criteria included (lightweight: EARS / precision: SMART)
- [ ] Confirm implementation tasks broken down by file unit
- [ ] (Precision only) Confirm FR/NFR tag linkage
- [ ] (Precision only) Confirm Mermaid diagram included

After design completion, save the design.md path and completion criteria summary to `.planning/{YYYY-MM-DD}-{feature name}.md`.

→ Output CHECKPOINT-1 → **Wait for user response**
> ⚠️ **Hard gate**: Never proceed to Phase 2 (implementation) until the user provides an explicit "y" response.

### Phase 2: Implementation + Review (after y)

```
Use subagent developer to implement feature "{feature name}".
MODE: feature
Reference: specs/features/{feature name}/design.md
Follow the design document exactly. Do not deviate from the specified interfaces and scope.
```

After developer completes → immediately invoke code-reviewer:

```
Use subagent code-reviewer to review all modified files for feature "{feature name}".
Reference: specs/features/{feature name}/design.md
Review the implementation against the design document. Focus on: design alignment, code quality, security, performance.
```

→ Output CHECKPOINT-2 → **Wait for user response**

**Automatic Critical re-execution:** If there is even 1 Critical, automatically re-run developer → code-reviewer without user input. Repeat until PASS or REVIEW_NEEDED.

If n: re-run developer → code-reviewer

### Phase 3: Test (after y)

```
Use subagent tester to write and run tests for feature "{feature name}".
MODE: feature
Reference: specs/features/{feature name}/design.md
Write tests based on completion criteria in the design document. Run all tests and report results.
```

→ Output CHECKPOINT-3 → **Wait for user response**

If y: workflow complete. Do not perform git commit (user proceeds separately).

---

## MODE: bugfix (Bug Fix)

**Parse issue:** Separate the issue number and description from the input.
- "#123 payment error" → issue number=123, description=payment error
- "Payment amount is 0" → issue number=date(YYYYMMDD), description=full text

### Phase 1: Analysis

**Lightweight analysis (architect):**
```
Use subagent architect to analyze bug "{issue}".
MODE: bugfix
PROBING_DONE: true  ← include only if probing was completed in Step 0.7
Output to: specs/bugs/{issue number}/analysis.md
Requirements: {REQUIREMENTS}
Investigate the root cause (not symptoms). Find the minimal fix with least side effects.
```

**Precision analysis (software-develop-architect):**
```
Use subagent architect to analyze bug "{issue}".
MODE: bugfix
PROBING_DONE: true  ← include only if probing was completed in Step 0.7
Output to: specs/bugs/{issue number}/analysis.md
Investigate the root cause (not symptoms). Find the minimal fix with least side effects.
Requirements: {REQUIREMENTS}
```
→ In this case, invoke the agent using the prompt in `.claude/agents/software-develop-architect.md`.

Self-verification:
- [ ] Confirm analysis.md created
- [ ] Confirm root cause specified as filename:line number
- [ ] Confirm fix direction is minimally invasive

After analysis completion, save the analysis.md path and root cause summary to `.planning/{YYYY-MM-DD}-bug-{issue number}.md`.

→ Output CHECKPOINT-1 → **Wait for user response**
> ⚠️ **Hard gate**: Never proceed to Phase 2 (fix) until the user provides an explicit "y" response.

### Phase 2: Fix + Review (after y)

```
Use subagent developer to fix bug "{issue}".
MODE: bugfix
Reference: specs/bugs/{issue number}/analysis.md
Apply the minimal fix described in the analysis. Do NOT modify anything outside the specified scope.
```

After developer completes → immediately invoke code-reviewer:

```
Use subagent code-reviewer to review the bug fix for "{issue}".
Reference: specs/bugs/{issue number}/analysis.md
Focus on: regression risk, side effects, minimal change principle.
```

→ Output CHECKPOINT-2 → **Wait for user response**

**Automatic Critical re-execution:** If there is even 1 Critical, automatically re-run developer → code-reviewer without user input. Repeat until PASS or REVIEW_NEEDED.

### Phase 3: Regression Test (after y)

```
Use subagent tester for regression testing of bug fix "{issue}".
MODE: bugfix (regression)
Reference: specs/bugs/{issue number}/analysis.md
Verify: (1) the reported bug is fixed, (2) related features still work correctly.
```

→ Output CHECKPOINT-3 → **Wait for user response**

If y: workflow complete. Do not perform git commit (user proceeds separately).

---

## MODE: project (New Project)

**Extract project name:** Extract the project name from the input. (e.g., "Create a todo app" → project name="todo-app")

> ⚠️ MODE: project always uses **precision design (software-develop-architect)**.

### Phase 1: Architecture Design (software-develop-architect)

```
Use subagent architect to design new project "{project name}".
MODE: project
PROBING_DONE: true  ← include only if probing was completed in Step 0.7
Output to: specs/features/{project name}/{project name}_design_v1.0.md
Additionally generate: specs/features/{project name}/requirements.md and specs/features/{project name}/architecture.md
Requirements: {REQUIREMENTS}
```
→ Invoke the agent using the prompt in `.claude/agents/software-develop-architect.md`.

Self-verification:
- [ ] Confirm design document created
- [ ] Confirm requirements.md created (Must/Should/Could/Won't)
- [ ] Confirm architecture.md created (tech stack, directory, components)
- [ ] Confirm FR/NFR tag linkage
- [ ] Confirm Mermaid diagram included
- [ ] Must feature implementation path is clear

After architecture design completion, save the design document path and Must feature list to `.planning/{YYYY-MM-DD}-{project name}.md`.

→ Output CHECKPOINT-1 → **Wait for user response**
> ⚠️ **Hard gate**: Never proceed to Phase 2 (implementation) until the user provides an explicit "y" response.

### Phase 2: Implementation + Review (after y)

```
Use subagent developer to implement new project "{project name}".
MODE: project
Reference: specs/features/{project name}/architecture.md and specs/features/{project name}/requirements.md
Steps:
1. Create directory structure from architecture.md
2. Generate project config files (package.json/pom.xml etc.)
3. Save task list to specs/features/{project name}/tasks.md (ordered by MoSCoW priority)
4. Implement Must features first, then Should, then Could
```

After developer completes → immediately invoke code-reviewer:

```
Use subagent code-reviewer to review the entire new project "{project name}".
Reference: specs/features/{project name}/architecture.md
Focus on: architecture alignment, code quality, security basics, project structure.
```

→ Output CHECKPOINT-2 → **Wait for user response**

### Phase 3: Test (after y)

```
Use subagent tester to write and run a test suite for new project "{project name}".
MODE: project
Reference: specs/features/{project name}/requirements.md
Coverage targets: Must features 100%, Should features 80%+.
Write unit tests per component and integration tests for main user flows.
```

→ Output CHECKPOINT-3 → **Wait for user response**

If y: workflow complete. Do not perform git commit (user proceeds separately).

---

## Common: "s" (Status) Handling

If the user inputs "s", output the current progress status following the status output format in workflow-rules.md.
Also display the design agent routing result:
```
📊 Status: {task name}
📐 Design: {lightweight (architect) / precision (software-develop-architect)}

| Phase | Assigned Agent | Status | Deliverable |
|-------|---------------|--------|-------------|
| Design | {architect / software-develop-architect} | ✅/🔄/⏳ | {filename} |
| Implementation | developer | ✅/🔄/⏳ | {filename} |
| Review | code-reviewer | ✅/🔄/⏳ | {filename} |
| Test | tester | ✅/🔄/⏳ | {filename} |
```

## Usage Examples

```
/workflow-automate 로그인 기능 추가
/workflow-automate #42 결제 금액 오류 수정
/workflow-automate todo 앱 새로 만들기
/workflow-automate "Add user authentication API"
```
