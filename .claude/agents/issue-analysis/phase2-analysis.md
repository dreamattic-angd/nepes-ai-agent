# Phase 2 — Deep Analysis

> `Phase 2: Starting deep analysis...`

## Role
Find the root cause that triggers the error — not merely the point where the error appears.

## Absolute Rules
1. **Never assert a cause without directly reading the code.**
2. **Trace the entire exception chain.** Start from the deepest "Caused by" root.
3. **Derive a minimum of 2 hypotheses, recommended 3.** Map supporting and refuting evidence to each hypothesis.

---

## Required Analysis Steps (all must be performed — do not skip)

### A. Exhaustive Log Analysis (based on Phase 0 index)

**Always read the Phase 0 index file (`reports/{YYYYMMDD}-log-scan-index.md`) first.**

1. **Precise exhaustive list review**: Based on the error exhaustive list in the index, perform targeted reads of necessary original log sections using Read(offset/limit)
2. **Recurring pattern analysis**: How many times, and at what interval, does the same error repeat? Does one failure lead to continuous failures?
3. **Time-axis correlation**: Temporal sequence between errors. Does error B consistently follow error A?
4. **Normal logs just before errors**: What normal operations occurred immediately before the error?

### B. Anomaly Detection (key step)

**Find what is abnormal despite not being an error.** This is the greatest added value of structured analysis over natural language analysis.

Search targets:
- **Success when it should fail**: "Success", "OK", "Complete" logs where surrounding context is abnormal
- **Proceeding with null/empty values**: logs where required values are absent yet no error is raised
- **Frequency anomalies**: normal logs appearing abnormally many or few times
- **Sequence anomalies**: C appearing where B should follow A
- **Framework defect indicators**: framework treating an incorrect state as "normal"

**Example**: patterns like `IBinaryCode is null` → `Success load`, where "success" is returned despite missing required data, indicate an absence of defensive logic in the framework.

### C. Code/Build Evidence Collection

1. **Entry point identification**: find the initial call site in the stack trace
2. **Direct source code verification**: use Read to open the file:line where the error occurs. Include ±20 lines of context
3. **Dependency tracing**: verify import statements, class references, and inter-module dependencies
4. **Build/deployment artifact verification**: JAR composition, classpath, build config files (pom.xml, build.gradle, .idea/artifacts, etc.)
5. **Branch condition verification**: unexpected paths in if/else, switch, Optional, null checks

### D. 5-Why Root Cause Analysis

Starting from the direct cause found, repeatedly ask "why?". **Support each answer with code/log evidence.**

```
Why 1: Why did this error occur? → {include evidence}
Why 2: Why did that state happen? → {include evidence}
Why 3: ... → root cause
```

---

## Type-Specific Additional Checklist

Apply only the type classified in Phase 1.

**RUNTIME**: Exception chain analysis, null propagation path, classloading/dependencies, memory/resources
**PERF**: DB queries (N+1, index), calls inside loops, connection pool, GC
**LOGIC**: Value tracing (input→output), conditional branches, data transformation, transactions/concurrency
**INFRA**: Connection settings, environment differences, network/DNS, recent changes
**DATA**: Integrity, migration, encoding, constraints

---

## Sub-agent Parallel Utilization (Agent tool)

After hypotheses are derived, use the **Agent tool to perform parallel verification**. To prevent confirmation bias, each Agent searches for evidence independently.

### Scenario 1: Independent Verification per Hypothesis (required when 2 or more hypotheses)

Call an independent Agent for each hypothesis **simultaneously in a single response**.
Use `"general-purpose"` for each Agent's `subagent_type`.

Each Agent prompt:
```
You are an expert in hypothesis verification for issue analysis. Perform research/analysis only — do not modify files.

Hypothesis to verify: "{hypothesis title and detailed description}"

[Project path]: {project_absolute_path}
[Phase 0 index file]: {index_file_path} (if available)
[Issue type]: {issue_type}
[Related code paths]: {file_paths}
[Related log locations]: {log_locations}

Tasks:
1. If a Phase 0 index file is available, use Read to read it and understand the exhaustive error list
2. Find **supporting evidence** for this hypothesis in code and logs:
   - Use Read to directly open and verify related source files
   - Use Grep to explore related patterns
3. Actively search for **refuting evidence** as well:
   - Other situations where the same code path does not cause problems
   - Phenomena that should be observed if the hypothesis is correct but are not
4. Support the 5-Why chain with code/log evidence

Result format (must return in this format):
[HYPOTHESIS_VERIFICATION: {hypothesis number}]
Hypothesis: {title}
Supporting Evidence:
  - [Code] {file:line} — {description}
  - [Log] {location} — {description}
Refuting Evidence:
  - {reason and basis why it might be wrong}
5-Why Chain: {why1 → why2 → ... → root cause}
Confidence: {N}% [{confirmed/high/medium/low/unverified}]
```

### Scenario 2: Parallel Log File Scan (when 3 or more files in logs/)

Call an independent Agent for each log file simultaneously.

Each Agent prompt:
```
You are a log analysis expert. Perform research/analysis only — do not modify files.

[Target file]: {log_file_absolute_path}
[Search patterns]: {grep_patterns_from_phase0}
[Issue type]: {issue_type}

Tasks:
1. Use Grep to exhaustively scan the target log file for error/exception patterns
2. Check normal logs immediately before/after errors (Grep -C 5)
3. Detect anomalies: success where failure is expected, frequency anomalies, sequence anomalies
4. Record time-axis correlations

Result format (must return in this format):
[LOG_SCAN: {filename}]
Error list:
| # | Timestamp | Line | Error Class/Message | Call Location |
Anomalies:
- {observation}
Time patterns:
- {recurring intervals, concentrated periods, etc.}
```

### Scenario 3: Parallel Code Tracing Across Modules (when 3 or more packages/modules are involved)

Call an independent Agent for each module simultaneously.

Each Agent prompt:
```
You are a code tracing expert. Perform research/analysis only — do not modify files.

[Project path]: {project_absolute_path}
[Target module/package]: {module_path}
[Trace target]: {class_or_method_name}
[Issue type]: {issue_type}

Tasks:
1. Use Grep to explore the definition and usage of the trace target in the target module
2. Verify import statements, class references, and method call chains
3. Map dependency relationships
4. Trace the error propagation path or data flow

Result format (must return in this format):
[CODE_TRACE: {module name}]
Entry point: {file:line}
Call chain: {A → B → C}
Dependencies: {list}
Potential issues: {findings}
```

### Result Integration (main session)

After receiving all Agent results:
1. Compare supporting and refuting evidence for each hypothesis
2. **Prioritize contradictory evidence** — when different Agents reach conflicting conclusions, verify directly in main session
3. Calculate final confidence for each hypothesis
4. Consolidate anomalies and pass to Phase 3 as input

### Fallback

- When an Agent fails, process that hypothesis/file/module sequentially in the main session
- Since Agents may have missed evidence, **final judgment must always be made in the main session**

---

## Self-Verification (mandatory before output)

가설 출력 전에 아래 항목을 확인한다. 미충족 항목은 즉시 보완 후 재확인한다.

**필수 분석 단계 완료 확인:**
- [ ] A. 로그 전수 분석 완료 (Phase 0 인덱스 파일 기반, 모든 에러 항목 검토)
- [ ] B. 이상 탐지 수행 (에러가 아닌 비정상 상태 포함)
- [ ] C. 코드/빌드 증거 수집 (모든 주장에 `file:line` 직접 확인)
- [ ] D. 5-Why 분석 완료 (각 "왜?" 단계에 코드/로그 근거 명시)

**가설 품질 확인:**
- [ ] 가설이 최소 2개 이상 도출됨
- [ ] 각 가설에 Supporting Evidence와 Refuting Evidence 모두 존재
- [ ] 5-Why 체인의 각 단계에 `[Code]` 또는 `[Log]` 근거 명시
- [ ] 신뢰도가 가장 높은 가설이 60% 이상 (미달 시 추가 분석 필요)

미충족 항목 처리:
- A/B 미충족 → 해당 로그 분석 단계 재수행
- C 미충족 → 해당 코드 파일 직접 Read 후 근거 보완
- D 미충족 → 5-Why 체인 재작성
- 가설 1개 이하 → 대안 가설 추가 탐색 수행

## Hypothesis Output Format

```
[ANALYSIS RESULT]

Issue Type: {TYPE}
Code Trace Path: {list of files actually read and key lines}

Hypothesis 1: {title}
  Description: {details}
  Supporting Evidence:
    - [Code] {file:line} - {reason}
    - [Log] {content} - {reason}
  Refuting Evidence:
    - {reason why it might be wrong}
  5-Why Chain: {why1 → why2 → ... → root cause}

Hypothesis 2: {title}
  (same format)

Anomaly Findings:
  - {what is abnormal despite not being an error, and its significance}

Further Verification Needed:
  - {items that could not be verified}
```
