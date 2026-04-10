# Java Platform Checklist

> This file is referenced by `java-code-reviewer.md` as the **Java Platform** perspective (Phase 1.5).
> It consolidates all Java-specific patterns previously in `review-checklists.md` plus additional Spring/JPA checks.

**Purpose**: Provide a Java-specific checklist applied IN ADDITION to the standard 4-perspective review.
This forms a **fifth perspective: Java Platform**.

## Output Format

Each finding is classified as Critical / Warning / Suggestion and included in the review report under the
**Perspective: Java Platform** label.

---

## Java Platform Checks

### 1. `@Transactional` Missing on Multi-Write Service Methods — Critical

Service methods that call `save()` or `delete()` more than once without `@Transactional` on the method or class.

```java
// ❌ Critical - multiple writes without transaction
public void transferFunds(Long fromId, Long toId, BigDecimal amount) {
    accountRepository.save(from);  // write 1
    accountRepository.save(to);    // write 2 — not atomic
}

// ✅ Correct pattern
@Transactional
public void transferFunds(Long fromId, Long toId, BigDecimal amount) {
    accountRepository.save(from);
    accountRepository.save(to);
}
```

**Detection Pattern:** Method calls `save()` or `delete()` more than once without `@Transactional` on the method or enclosing class.

---

### 2. JPA LazyLoading Outside Transaction (`LazyInitializationException` Risk) — Critical

Entity field accessed after the `@Transactional` method boundary closes (e.g., in a Controller layer after a service call).

```java
// ❌ Critical - accessing lazy collection outside transaction
@GetMapping("/orders/{id}")
public OrderDto getOrder(@PathVariable Long id) {
    Order order = orderService.findById(id);
    return order.getItems().stream()...  // LazyInitializationException risk
}

// ✅ Correct pattern - load eagerly or use DTO projection
@GetMapping("/orders/{id}")
public OrderDto getOrder(@PathVariable Long id) {
    return orderService.findOrderWithItems(id);  // service returns DTO
}
```

**Detection Pattern:** Entity field or collection accessed in Controller layer after service call, without `@Transactional` on the controller method.

---

### 3. Checked Exception Blindly Wrapped as `RuntimeException` Without Logging — Warning

```java
// ❌ Warning - exception swallowed with no log
catch (Exception e) {
    throw new RuntimeException(e);
}

// ✅ Correct pattern
catch (Exception e) {
    log.error("Operation failed: {}", e.getMessage(), e);
    throw new ServiceException("Operation failed", e);
}
```

**Detection Pattern:** `catch (Exception e) { throw new RuntimeException(e); }` with no log call in the catch block.

---

### 4. Spring Bean Circular Dependency Introduction — Warning

Class A injects Class B, and Class B's constructor/field injects Class A.

```java
// ❌ Warning - circular dependency
@Service
@RequiredArgsConstructor
public class ServiceA {
    private final ServiceB serviceB;
}

@Service
@RequiredArgsConstructor
public class ServiceB {
    private final ServiceA serviceA;  // circular
}

// ✅ Correct pattern - refactor to eliminate cycle (e.g., extract shared logic to ServiceC)
```

**Detection Pattern:** Cross-reference `@Autowired`/`@RequiredArgsConstructor` fields between two classes to detect mutual injection.

---

### 5. JPA N+1 Query Pattern (Fetch Join Missing) — Warning

Loop triggering `findById` or lazy-loaded collection without `@EntityGraph` or `JOIN FETCH`.

```java
// ❌ Warning - N+1 queries
List<Order> orders = orderRepository.findAll();
orders.forEach(o -> process(o.getCustomer().getName()));  // triggers N queries

// ✅ Correct pattern
@Query("SELECT o FROM Order o JOIN FETCH o.customer")
List<Order> findAllWithCustomer();
```

**Detection Pattern:** Loop calling a method that triggers `findById` or accesses a lazy-loaded collection without `@EntityGraph` or `JOIN FETCH` in the repository query.

---

### 6. `@Async` Method Called in Same Class (Proxying Bypass) — Warning

`@Async`-annotated method called via `this.method()` inside the same Spring bean bypasses the Spring proxy.

```java
// ❌ Warning - self-invocation bypasses @Async proxy
@Service
public class NotificationService {
    @Async
    public void sendEmail(String to) { ... }

    public void notifyAll(List<String> recipients) {
        recipients.forEach(r -> sendEmail(r));  // direct call, not async
    }
}

// ✅ Correct pattern - inject self or extract to separate bean
```

**Detection Pattern:** `@Async`-annotated method referenced by direct call (not via injected bean reference) within the same class.

---

### 7. Missing `@Valid` on `@RequestBody` Controller Parameter — Warning

`@PostMapping`/`@PutMapping` with `@RequestBody` but no `@Valid` annotation.

```java
// ❌ Warning - no validation
@PostMapping("/users")
public ResponseEntity<UserDto> createUser(@RequestBody UserRequest request) { ... }

// ✅ Correct pattern
@PostMapping("/users")
public ResponseEntity<UserDto> createUser(@Valid @RequestBody UserRequest request) { ... }
```

**Detection Pattern:** `@PostMapping` or `@PutMapping` controller method with `@RequestBody` parameter that lacks `@Valid`.

---

### 8. ActiveMQ / JMS Resource Not Closed in `finally` Block — Critical

`MessageConsumer`, `Session`, or `Connection` object created without try-with-resources or `finally` close.

```java
// ❌ Critical - resource leak on exception
Connection connection = factory.createConnection();
Session session = connection.createSession(...);
MessageConsumer consumer = session.createConsumer(dest);
// ... if exception occurs here, resources leak

// ✅ Correct pattern
try {
    // message processing
} finally {
    if (consumer != null) consumer.close();
    if (session != null) session.close();
    if (connection != null) connection.close();
}
```

**Detection Pattern:** `MessageConsumer`, `Session`, or `Connection` object instantiated without try-with-resources or a `finally` block that closes them.

---

## Migrated Patterns from review-checklists.md

### DB Connection Management (HikariCP, etc.) — Critical

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

### Hardcoded Config Values — Critical

```java
// ❌ Critical - hardcoded credentials or endpoints
String dbUrl = "jdbc:oracle:thin:@192.168.10.37:1521:NEPESDB1";
String password = "nepes01";

// ✅ Recommended
String dbUrl = Config.get("db.url");
```

---

## Error Handling

- If this file cannot be read: skip the Java Platform perspective and log `[Language checklist file not found — Java platform checks skipped]` in the report header.
- Pattern not applicable (no Java files in scope): mark as N/A.
