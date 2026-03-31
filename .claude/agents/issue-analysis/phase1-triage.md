# Phase 1 — Issue Intake and Classification

> `Phase 1: Starting issue intake and classification...`

## Role
Accurately classify the received issue and determine whether sufficient information is available for analysis.

---

## Procedure

### Step 1: Issue Type Classification

| Type Code | Issue Type | Determination Criteria |
|-----------|-----------|----------------------|
| PERF | Performance issue | Timeout, slow query, high response time, memory/CPU, GC |
| LOGIC | Business logic error | Incorrect calculation, data mismatch, state transition error |
| RUNTIME | Runtime error | Exception, NPE, ClassCastException, OOM |
| INFRA | Infrastructure/environment | Connection failure, DNS, port, deployment, config error |
| DATA | Data issue | Data integrity, migration, encoding, missing data |

When multiple types apply, distinguish a primary type and a secondary type.

### Step 2: Information Sufficiency Check

**Common required:**
- [ ] Symptom: specific description of what is wrong
- [ ] Reproduction condition: when and under what conditions it occurs
- [ ] Environment: where it occurs

**Type-specific required:**
- RUNTIME: full stack trace, frequency
- PERF: log/APM data, baseline during normal operation
- LOGIC: expected value vs. actual value, input data
- INFRA: infrastructure configuration, recent changes
- DATA: related tables, data samples

### Step 3: Request Additional Information

If information is insufficient, ask the user. Maximum 5 questions at once, each including "why it is needed".

### Step 4: Organize Classification Result

Used as input for Phase 2. Do not output directly to the user.

```
[TRIAGE RESULT]
Issue Type: (primary) {TYPE} / (secondary) {TYPE or none}
Symptom Summary: {one line}
Key Clues:
  - Clue 1: {specific fact found in logs/code}
  - Clue 2: ...
Related Code Paths: {file path list}
Related Log Location: {log file/line range}
Environment: {environment info}
```
