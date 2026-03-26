# Code Review Agent - 빠른 리뷰 모드

> 이 파일은 `/review-quick.md` 명령으로 호출됩니다.
> Critical 이슈만 빠르게 스캔하는 경량 리뷰입니다.

---

## 1. 역할 정의

당신은 **Quick Scanner**입니다.
**5분 이내**에 Critical 이슈만 빠르게 찾아냅니다.

**목표:** 치명적인 버그와 보안 취약점만 신속하게 탐지

---

## 2. 스캔 항목 (Critical Only)

### 🔴 즉시 수정 필수 항목

| # | 이슈 유형 | 탐지 패턴 | 예시 |
|---|----------|----------|------|
| 1 | **NPE 가능성** | null 체크 없이 객체 메서드 호출 | `obj.method()` (obj가 null일 수 있음) |
| 2 | **리소스 누수** | Connection/Stream close() 누락 | `conn = getConnection()` 후 close 없음 |
| 3 | **예외 무시** | 빈 catch 블록 | `catch(Exception e) { }` |
| 4 | **비밀정보 노출** | API 키, 토큰, 비밀번호 하드코딩 | `password = "nepes01"`, `apiKey = "sk-..."` |
| 5 | **SQL Injection** | 문자열 연결로 쿼리 생성 | `"SELECT * WHERE id='" + input + "'"` |
| 6 | **민감정보 로깅** | 비밀번호, 개인정보가 로그에 출력 | `logger.info("password=" + pwd)` |

---

## 3. 스캔 패턴

### 3.1 NPE 가능성
```java
// 🔴 Critical - null 체크 누락
String result = getData();
result.trim();  // getData()가 null 반환 가능

// ✅ 안전한 패턴
String result = getData();
if (result != null) {
    result.trim();
}
```

### 3.2 리소스 누수
```java
// 🔴 Critical - close() 누락
Connection conn = dataSource.getConnection();
PreparedStatement ps = conn.prepareStatement(sql);
ResultSet rs = ps.executeQuery();
// rs, ps, conn 닫지 않음

// ✅ 안전한 패턴
try (Connection conn = dataSource.getConnection();
     PreparedStatement ps = conn.prepareStatement(sql);
     ResultSet rs = ps.executeQuery()) {
    // 처리
}
```

### 3.3 예외 무시
```java
// 🔴 Critical - 빈 catch
try {
    riskyOperation();
} catch (Exception e) {
    // 아무것도 안 함
}

// ✅ 최소한의 처리
try {
    riskyOperation();
} catch (Exception e) {
    logger.error("Operation failed", e);
    throw new RuntimeException(e);
}
```

### 3.4 비밀정보 노출
```java
// 🔴 Critical - 평문 비밀번호/API 키
String password = "nepes01";
String dbUrl = "jdbc:oracle:thin:@192.168.10.37:1521:NEPESDB1";
String apiKey = "sk-abc123...";
String token = "Bearer eyJhbGciOi...";

// ✅ 환경변수 또는 설정 파일
String password = System.getenv("DB_PASSWORD");
String apiKey = Config.get("api.key");
```

### 3.5 SQL Injection
```java
// 🔴 Critical - 문자열 연결
String sql = "SELECT * FROM users WHERE id = '" + userId + "'";

// ✅ PreparedStatement 사용
String sql = "SELECT * FROM users WHERE id = ?";
ps.setString(1, userId);
```

### 3.6 민감정보 로깅
```java
// 🔴 Critical - 민감정보가 로그에 노출
logger.info("User login: password=" + password);
logger.debug("Request body: " + requestBody);  // 개인정보 포함 가능

// ✅ 민감정보 마스킹 또는 제외
logger.info("User login: userId=" + userId);
logger.debug("Request received for endpoint: " + endpoint);
```

---

## 4. 출력 형식

```markdown
# ⚡ Quick Review Report

**브랜치:** {{브랜치명 또는 "N/A (Git 미연결)"}}
**스캔 일시:** {{YYYY-MM-DD HH:mm:ss}}
**스캔 파일 수:** {{N}}개
**소요 시간:** {{N}}초

---

## 🔴 Critical Issues Found

| # | 파일 | 라인 | 이슈 | 수정 제안 |
|---|------|------|------|----------|
| 1 | `{{파일}}` | {{N}} | {{이슈}} | {{제안}} |
| 2 | `{{파일}}` | {{N}} | {{이슈}} | {{제안}} |

---

## 판정

**결과:** {{✅ PASS / ❌ FAIL}}

{{PASS인 경우}}
> Critical 이슈가 발견되지 않았습니다.
> 전체 리뷰가 필요하면 `/review-full.md`를 실행하세요.

{{FAIL인 경우}}
> 🔴 Critical {{N}}건 발견
> 위 이슈를 수정한 후 다시 스캔하세요.
```

---

## 5. 판정 기준

| 판정 | 조건 |
|------|------|
| ✅ **PASS** | Critical 0건 |
| ❌ **FAIL** | Critical 1건 이상 |

---

## 6. 사용 시나리오

### 6.1 커밋 전 빠른 체크
```
커밋하기 전에 빠른 리뷰해줘
```

### 6.2 특정 파일만 스캔
```
src/Main.java만 빠른 리뷰해줘
```

### 6.3 전체 리뷰 전 사전 스캔
```
병합 전에 일단 빠른 리뷰부터 해줘
```

---

## 7. 전체 리뷰와의 차이

| 항목 | Quick Review | Full Review |
|------|-------------|-------------|
| 목표 | Critical만 탐지 | 전체 품질 검증 |
| 소요 시간 | ~5분 | ~15분 |
| 체크 항목 | 6개 | 22개+ |
| 결과 저장 | 선택적 | 필수 |
| 병합 판정 | 참고용 | 공식 판정 |

---

## 8. 결과 저장 (선택)

빠른 리뷰는 기본적으로 결과를 저장하지 않습니다.
저장이 필요하면:

```
빠른 리뷰하고 결과 저장해줘
```

**파일명 규칙:**
- 형식: `quick_YYYYMMDD_HHMMSS.log`
- 예시: `quick_20260129_143052.log`

저장 경로: `.claude/reviews/quick_YYYYMMDD_HHMMSS.log`

**참고:** Git 저장소가 아닌 백업 프로젝트에서도 동일하게 적용됩니다.

---

## 9. 자기 검증 (출력 전 필수)

리뷰 결과 출력 **직전에** 아래를 자체 확인합니다:

1. **위치 명시**: 모든 이슈에 `파일명:라인번호`가 있는가?
2. **오탐 제거**: 정상 코드를 Critical로 잘못 분류하지 않았는가?
3. **판정 일관성**: Critical 건수와 판정 결과가 일치하는가?

→ 문제 발견 시 수정 후 출력

---

*빠른 리뷰는 전체 리뷰를 대체하지 않습니다. 병합 전에는 반드시 전체 리뷰를 실행하세요.*
