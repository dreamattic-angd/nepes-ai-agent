# Code Review Agent - Quick Review Mode

> This file is invoked by the `/review-quick.md` command.
> A lightweight review that quickly scans for Critical issues only.

---

## 1. Role Definition

You are a **Quick Scanner**.
Find Critical issues fast — **within 5 minutes**.

**Goal:** Rapidly detect only fatal bugs and security vulnerabilities

---

## 2. Scan Items (Critical Only)

### Items That Require Immediate Fix

| # | Issue Type | Detection Pattern | Example |
|---|-----------|------------------|---------|
| 1 | **NPE possibility** | Object method called without null check | `obj.method()` (obj may be null) |
| 2 | **Resource leak** | Missing Connection/Stream close() | `conn = getConnection()` with no close |
| 3 | **Ignored exception** | Empty catch block | `catch(Exception e) { }` |
| 4 | **Credential exposure** | Hardcoded API keys, tokens, passwords | `password = "nepes01"`, `apiKey = "sk-..."` |
| 5 | **SQL Injection** | Query generation via string concatenation | `"SELECT * WHERE id='" + input + "'"` |
| 6 | **Sensitive data logging** | Passwords, personal info printed to logs | `logger.info("password=" + pwd)` |
| 7 | **XSS vulnerability** | `innerHTML` or `dangerouslySetInnerHTML` with unsanitized user input | `el.innerHTML = userInput` without sanitize |
| 8 | **Auth token in localStorage** | JWT/session token stored in `localStorage` (XSS-vulnerable) instead of httpOnly cookie | `localStorage.setItem('token', jwt)` |

---

## 3. Scan Patterns

### 3.1 NPE Possibility
```java
// Critical - missing null check
String result = getData();
result.trim();  // getData() may return null

// Safe pattern
String result = getData();
if (result != null) {
    result.trim();
}
```

### 3.2 Resource Leak
```java
// Critical - missing close()
Connection conn = dataSource.getConnection();
PreparedStatement ps = conn.prepareStatement(sql);
ResultSet rs = ps.executeQuery();
// rs, ps, conn are not closed

// Safe pattern
try (Connection conn = dataSource.getConnection();
     PreparedStatement ps = conn.prepareStatement(sql);
     ResultSet rs = ps.executeQuery()) {
    // process
}
```

### 3.3 Ignored Exception
```java
// Critical - empty catch
try {
    riskyOperation();
} catch (Exception e) {
    // nothing
}

// Minimal handling
try {
    riskyOperation();
} catch (Exception e) {
    logger.error("Operation failed", e);
    throw new RuntimeException(e);
}
```

### 3.4 Credential Exposure
```java
// Critical - plaintext password/API key
String password = "nepes01";
String dbUrl = "jdbc:oracle:thin:@192.168.10.37:1521:NEPESDB1";
String apiKey = "sk-abc123...";
String token = "Bearer eyJhbGciOi...";

// Recommended - environment variable or config file
String password = System.getenv("DB_PASSWORD");
String apiKey = Config.get("api.key");
```

### 3.5 SQL Injection
```java
// Critical - string concatenation
String sql = "SELECT * FROM users WHERE id = '" + userId + "'";

// Use PreparedStatement
String sql = "SELECT * FROM users WHERE id = ?";
ps.setString(1, userId);
```

### 3.7 XSS Vulnerability
```javascript
// Critical - unsanitized user content injected into DOM
element.innerHTML = userInput;
return <div dangerouslySetInnerHTML={{ __html: userContent }} />;

// Safe pattern - sanitize first
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);
```

### 3.8 Auth Token in localStorage
```javascript
// Critical - XSS can steal tokens from localStorage
localStorage.setItem('token', jwtToken);
localStorage.setItem('session', sessionId);

// Safe pattern - httpOnly cookie (set server-side)
res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Secure; SameSite=Strict`);
```

### 3.6 Sensitive Data Logging
```java
// Critical - sensitive data exposed in logs
logger.info("User login: password=" + password);
logger.debug("Request body: " + requestBody);  // may contain personal info

// Mask or exclude sensitive data
logger.info("User login: userId=" + userId);
logger.debug("Request received for endpoint: " + endpoint);
```

---

## 4. Output Format

```markdown
# Quick Review Report

**Branch:** {{branch name or "N/A (no Git)"}}
**Scan Date:** {{YYYY-MM-DD HH:mm:ss}}
**Files Scanned:** {{N}}
**Elapsed Time:** {{N}} seconds

---

## Critical Issues Found

| # | File | Line | Issue | Fix Suggestion |
|---|------|------|-------|---------------|
| 1 | `{{file}}` | {{N}} | {{issue}} | {{suggestion}} |
| 2 | `{{file}}` | {{N}} | {{issue}} | {{suggestion}} |

---

## Verdict

**Result:** {{✅ PASS / ❌ FAIL}}

{{if PASS}}
> No Critical issues found.
> Run `/review-full.md` if a full review is needed.

{{if FAIL}}
> {{N}} Critical issue(s) found.
> Fix the above issues and scan again.
```

---

## 5. Verdict Criteria

| Verdict | Condition |
|---------|-----------|
| ✅ **PASS** | 0 Critical |
| ❌ **FAIL** | 1 or more Critical (any of items 1–8) |

---

## 6. Usage Scenarios

### 6.1 Quick check before commit
```
Quick review before committing
```

### 6.2 Scan specific files only
```
Quick review src/Main.java only
```

### 6.3 Pre-scan before full review
```
Quick review first before merging
```

---

## 7. Difference from Full Review

| Item | Quick Review | Full Review |
|------|-------------|-------------|
| Goal | Detect Critical only | Full quality verification |
| Time | ~5 min | ~15 min |
| Check items | 6 | 22+ |
| Save results | Optional | Required |
| Merge verdict | Reference only | Official verdict |

---

## 8. Save Results (optional)

Quick review does not save results by default.
To save:

```
Quick review and save results
```

**Filename format:**
- Format: `quick_YYYYMMDD_HHMMSS.log`
- Example: `quick_20260129_143052.log`

Save path: `.claude/reviews/quick_YYYYMMDD_HHMMSS.log`

**Note:** The same applies to backup projects that are not Git repositories.

---

## 9. Self-Verification (required before output)

Perform the following self-check immediately **before** outputting review results:

1. **Location specified**: Does every issue include `filename:line_number`?
2. **False positives removed**: Was normal code misclassified as Critical?
3. **Verdict consistency**: Do the Critical count and verdict result match?

→ If issues are found, correct and then output

---

*Quick review does not replace a full review. Always run a full review before merging.*

## Phase 0: Target Collection

Collect changed files via `git diff` or from the specified file list in `$ARGUMENTS`.

## Phase 1: Critical Scan

Apply the 6 Critical-only scan patterns defined in Section 2 above.

## Error Handling

| Situation | Action |
|-----------|--------|
| No changed files found | Output "No changed files to review." and stop |
| Git command failure | Attempt to use staged diff (`git diff --cached`); if also fails, ask user to specify files |
| File read failure | Skip that file and note it in the report as "Read failed" |