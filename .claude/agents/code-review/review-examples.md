# Code Review — Execution Flow & Interaction Examples

> 이 파일은 `review-full.md`의 Section 9 참조 파일입니다.
> 흐름도와 상호작용 예시가 필요할 때 Read tool로 불러옵니다.

**목적**: 코드 리뷰 실행 흐름도 및 변경 코드/기존 코드 상호작용 예시를 제공한다. `review-full.md`에서 참조 파일로 불러와 사용한다.

## Output Format

흐름도와 예시는 리뷰어의 판단 기준으로 참조되며, 리뷰 결과 리포트에 직접 출력되지 않는다.

## Phase 0: 흐름도 참조

Diff-based 리뷰 흐름 및 판정 기준을 확인한다.

## Phase 1: 예시 참조

변경 코드와 기존 코드 구분 예시를 통해 리뷰 대상 범위를 판단한다.

## Error Handling

- 참조 파일 로드 실패 시: 기본 판단 기준으로 리뷰 계속 진행.

---

## Diff-based Review Flow

```
Review starts
    │
    ▼
[Step 1] git diff {base-branch} --name-only
    │   → collect list of changed files
    │
    ▼
[Step 2] git diff {base-branch} -- src/
    │   → extract changed content (diff)
    │
    ▼
[Step 3] Line classification
    │
    ├─ `+` lines (added/modified) ──────────────────────┐
    │                                                    │
    ├─ `-` lines (deleted) → check deletion impact ─────┼─→ 🎯 Review target
    │                                                    │     (verdict reflected)
    └─ Context lines (unchanged) ───────────────────────┘
                │
                └─→ Reference notes
                      (verdict not reflected)
    │
    ▼
[Step 4] Issue classification
    │
    ├─ Issues in changed code → Critical/Warning/Suggestion
    │                            (reflected in verdict)
    │
    └─ Issues in unchanged code → Reference notes
                                   (not reflected in verdict)
    │
    ▼
[Step 5] Verdict (based on changed code)
    │
    ├─ 0 Critical & Warning ≤ 3 → ✅ PASS
    ├─ 0 Critical & Warning ≥ 4 → ⚠️ REVIEW_NEEDED
    └─ Critical ≥ 1             → ❌ REJECT
```

---

## Interaction Examples: Changed Code vs. Existing Code

### Example 1: Changed code calls existing code causing an issue

```java
// Existing code (not changed)
public String getData() {
    return null;  // may return null
}

// Changed code (review target)
+ String result = getData().trim();  // 🔴 Critical: NPE possible
```

**Verdict:** This issue is a **problem in the changed code**.
- `getData()` returning null is a characteristic of existing code
- The problem is that the changed code calls it without a null check
- **Included in review targets, reflected in verdict**

### Example 2: A problem in the existing code itself

```java
// Existing code (not changed) - already existing issue
public void processData() {
    Connection conn = getConnection();
    // ... conn.close() missing (resource leak)
}

// Changed code (different method)
+ public void newFeature() {
+     // new feature implementation
+ }
```

**Verdict:** This issue is a **reference note**.
- The resource leak in `processData()` is an existing code issue
- Unrelated to the current work (`newFeature`)
- **Classified as reference note, not reflected in verdict**
- Recommend a separate `bugfix/resource-leak-fix` branch
