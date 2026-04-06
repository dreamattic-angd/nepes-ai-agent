# Code Review — Project-Specific Checklists

> 이 파일은 `review-full.md`의 Section 4 참조 파일입니다.
> 프로젝트별 패턴 확인이 필요할 때 Read tool로 불러옵니다.

**목적**: 프로젝트별(Java Backend, Vue.js Frontend) 코드 패턴 체크리스트를 제공한다. `review-full.md`에서 참조 파일로 불러와 사용한다.

## Output Format

각 체크리스트 항목은 Critical/Warning/Suggestion 심각도로 분류하여 리뷰 리포트에 포함한다.

## Phase 0: Java Backend 패턴 확인

DB 연결 관리, ActiveMQ 리소스 관리, 하드코딩 설정 금지 패턴을 확인한다.

## Phase 1: Vue.js Frontend 패턴 확인

반응성 시스템 패턴, API 에러 처리 패턴을 확인한다.

## Error Handling

- 참조 파일 로드 실패 시: 해당 체크리스트 섹션을 skip하고 리뷰 계속 진행.
- 패턴 미해당 시: 체크리스트 항목을 N/A로 처리.

---

## Node.js / JavaScript (hooks, scripts)

`.claude/hooks/*.js` 및 `.claude/scripts/*.js` 파일에 적용한다.

**Async Error Handling:**
```javascript
// ❌ Warning - Promise without catch
fetchData().then(result => process(result));
someAsyncFn(); // fire-and-forget without error handling

// ✅ Correct pattern
fetchData()
  .then(result => process(result))
  .catch(err => console.error('fetch failed:', err));

// or async/await
try {
  const result = await fetchData();
  process(result);
} catch (err) {
  console.error('fetch failed:', err);
}
```

**Environment Variable Access:**
```javascript
// ❌ Warning - no existence check
const dbUrl = process.env.DB_URL; // may be undefined

// ✅ Correct pattern - verify before use
const dbUrl = process.env.DB_URL;
if (!dbUrl) throw new Error('DB_URL environment variable is not set');
```

**Sequential Async (Parallelizable):**
```javascript
// ❌ Warning - sequential when independent
const a = await fetchA();
const b = await fetchB(); // doesn't depend on a

// ✅ Correct pattern - parallel
const [a, b] = await Promise.all([fetchA(), fetchB()]);
```

**Synchronous Blocking in Async Context:**
```javascript
// ❌ Warning - blocking the event loop
const data = fs.readFileSync('large-file.json'); // blocks

// ✅ Correct pattern
const data = await fs.promises.readFile('large-file.json', 'utf8');
```

---

## Java Backend

**DB Connection Management (HikariCP, etc.):**
```java
// ✅ Correct pattern
try (Connection conn = dataSource.getConnection();
     PreparedStatement ps = conn.prepareStatement(sql);
     ResultSet rs = ps.executeQuery()) {
    // process
}

// ❌ Incorrect pattern - Critical
Connection conn = dataSource.getConnection();
// ... conn.close() missing
```

**ActiveMQ Resource Management:**
```java
// ✅ Correct pattern
try {
    // message processing
} finally {
    if (consumer != null) consumer.close();
    if (session != null) session.close();
    if (connection != null) connection.close();
}
```

**Hardcoded config values prohibited:**
```java
// ❌ Critical - hardcoded
String dbUrl = "jdbc:oracle:thin:@192.168.10.37:1521:NEPESDB1";
String password = "nepes01";

// ✅ Recommended
String dbUrl = Config.get("db.url");
```

---

## Vue.js Frontend

**Reactivity System:**
```javascript
// ❌ Warning - potential reactivity loss
const data = reactive({ items: [] });
data = { items: newItems }; // reactivity lost

// ✅ Correct pattern
data.items = newItems;
```

**API Error Handling:**
```javascript
// ❌ Warning - error ignored
const res = await api.get('/endpoint');

// ✅ Correct pattern
try {
    const res = await api.get('/endpoint');
} catch (error) {
    console.error('API error:', error);
    // notify user
}
```
