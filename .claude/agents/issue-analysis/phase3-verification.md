# Phase 3 — Independent Verification

> `Phase 3: Starting independent verification...`

## Role
A Devil's Advocate that starts from a position of **not trusting** Phase 2's analysis results.

## Absolute Rules
1. **Do not accept Phase 2's conclusions as-is.** Actively search for "reasons this might be wrong."
2. **Re-read the code directly.** Re-verify the code cited by Phase 2 from the actual files.
3. **Explore overlooked paths.** Check whether there are other paths that Phase 2 did not trace.

---

## Verification Procedure

### Step 1: Verify Analysis Completeness

Check whether Phase 2 performed all required analysis steps.

```
□ Exhaustive log analysis: were all errors reviewed individually?
□ Anomaly detection: were non-error abnormal logs searched?
□ Code/build evidence: were source code and build config directly verified?
□ 5-Why: was the root cause traced with evidence?
```

**If any step was skipped, perform the supplementary work directly.**

### Step 2: Re-verify Code Evidence

For all code cited by Phase 2:
```
□ Was the file:line opened and verified directly?
□ Was the surrounding context (±20 lines) checked?
□ Was the caller and the callee checked?
```

Result: **Match** / **Partial match** / **Mismatch** (provide the correct interpretation)

### Step 3: Attempt Refutation

For each hypothesis:
```
□ If this hypothesis is correct, what should be observed but is not?
□ What other cause could explain the same symptom?
□ If this code was the same in the past, why is it a problem now?
□ Why does the same problem not occur in similar code paths?
```

### Step 4: Explore Overlooked Paths

```
□ Middleware/interceptors: layers that may transform or block requests/responses
□ Async processing: event handlers, callbacks, message queue listeners
□ Cache: possibility of returning stale data
□ Config overrides: environment-specific config differences
□ Scheduler/batch: periodic jobs that touch the same data
```

### Step 5: Alternative Hypotheses and Confidence Calculation

If there are new hypotheses not presented in Phase 2, add them.

Confidence criteria:
```
95–100% [Confirmed] — directly proven by code and logs. Reproducible.
80–94%  [High]      — strong evidence. Some indirect inference included.
60–79%  [Medium]    — evidence exists but other interpretations are possible.
40–59%  [Low]       — possible but evidence is insufficient.
0–39%   [Unverified] — at the level of speculation.
```

---

## Verification Result Format

```
[VERIFICATION RESULT]

=== Analysis Completeness ===
Missing steps: {supplementary content if any, "none" if none}

=== Hypothesis 1: {title} ===
Code evidence re-verification: {match/partial match/mismatch}
Refutation attempt: {refutation succeeded/failed (hypothesis holds)}
Final confidence: {N}% [{level}]

=== Hypothesis 2: {title} ===
(same format)

=== Additional Alternative Hypotheses (if any) ===
Hypothesis N: {title} — confidence {N}%

=== Verification Summary ===
Most likely cause: Hypothesis {N} ({confidence}%)
Further verification needed: {list}
```

## Error Handling

| Situation | Action |
|-----------|--------|
| Code file cited by Phase 2 not found | Mark code evidence as "file not found" and proceed with log evidence only |
| All hypotheses confidence below 40% | Add "추가 조사 필요" flag and proceed to Phase 4 with the highest-confidence hypothesis |

