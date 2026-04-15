# Python Platform Checklist

> This file is referenced by `python-code-reviewer.md` as the **Python Platform** perspective (Phase 1.5).
> It consolidates FastAPI, async Python, Pydantic, and scientific computing-specific patterns.

**Purpose**: Provide a Python-specific checklist applied IN ADDITION to the standard 4-perspective review.
This forms a **fifth perspective: Python Platform**.

## Output Format

Each finding is classified as Critical / Warning / Suggestion and included in the review report under the
**Perspective: Python Platform** label.

---

## Python Platform Checks

### 1. Missing Type Hints on Function Parameters or Return Types — Warning

Functions without type annotations reduce IDE support, catch fewer bugs at review time, and make Pydantic integration harder.

```python
# ❌ Warning — no type hints
def process_alarm(equipment_id, threshold):
    return {"triggered": True}

# ✅ Correct
def process_alarm(equipment_id: str, threshold: float) -> AlarmResult:
    return AlarmResult(triggered=True)
```

**Detection Pattern:** Function definition (`def`) with parameters lacking `: type` annotation or missing `-> return_type`.

---

### 2. Raw `dict` Used at API Boundary Instead of Pydantic Model — Warning

Using plain `dict` as request/response type loses validation, serialization, and OpenAPI schema generation.

```python
# ❌ Warning — raw dict, no validation
@router.post("/alarms")
async def create_alarm(request: dict) -> dict:
    return {"id": "abc123"}

# ✅ Correct
@router.post("/alarms", response_model=AlarmResponse)
async def create_alarm(request: AlarmRequest) -> AlarmResponse:
    return AlarmResponse(id="abc123")
```

**Detection Pattern:** FastAPI endpoint function with `dict` as parameter type or return type annotation.

---

### 3. Blocking (Synchronous) Call Inside `async def` — Critical

Calling synchronous blocking I/O (file read, DB query, `time.sleep`) inside an `async def` function blocks the event loop and degrades all concurrent requests.

```python
# ❌ Critical — blocks the event loop
async def fetch_blob(equipment_id: str) -> bytes:
    conn = oracledb.connect(dsn=DSN)  # synchronous connect
    cursor = conn.cursor()
    cursor.execute("SELECT blob FROM equipment WHERE id = :id", [equipment_id])
    return cursor.fetchone()[0]

# ✅ Correct — run in threadpool
async def fetch_blob(equipment_id: str) -> bytes:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _fetch_blob_sync, equipment_id)

def _fetch_blob_sync(equipment_id: str) -> bytes:
    conn = oracledb.connect(dsn=DSN)
    ...
```

**Detection Pattern:** Synchronous DB/file/network call (`oracledb.connect`, `psycopg2.connect`, `open()`, `time.sleep`, `requests.get`) inside an `async def` function body without `await loop.run_in_executor`.

---

### 4. CPU-Bound numpy/scipy/ruptures Called Directly in `async def` — Warning

Scientific computing libraries (numpy, scipy, ruptures, sklearn) are CPU-bound and block the event loop when called directly in an async context.

```python
# ❌ Warning — CPU-bound call blocks event loop
async def detect_changepoints(data: np.ndarray) -> list[int]:
    algo = rpt.Pelt(model="rbf").fit(data)  # blocks event loop
    return algo.predict(pen=10)

# ✅ Correct — offload to threadpool
async def detect_changepoints(data: np.ndarray) -> list[int]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _run_detection, data)

def _run_detection(data: np.ndarray) -> list[int]:
    algo = rpt.Pelt(model="rbf").fit(data)
    return algo.predict(pen=10)
```

**Detection Pattern:** numpy/scipy/ruptures/sklearn function calls directly inside an `async def` body without `run_in_executor`.

---

### 5. Sequential `await` for Independent Async Calls — Warning

Two or more `await` calls in sequence where the second does not depend on the first result.

```python
# ❌ Warning — sequential when independent
oracle_data = await fetch_oracle_blob(equipment_id)
ts_baseline = await fetch_ts_baseline(equipment_id)  # doesn't depend on oracle_data

# ✅ Correct — parallel
oracle_data, ts_baseline = await asyncio.gather(
    fetch_oracle_blob(equipment_id),
    fetch_ts_baseline(equipment_id),
)
```

**Detection Pattern:** Two or more `await` statements in sequence where the second expression does not reference the first result variable.

---

### 6. Hardcoded DB Connection String or Credentials — Critical

Connection strings, passwords, or API keys embedded in source code expose secrets and cannot be rotated without code changes.

```python
# ❌ Critical — hardcoded credentials
conn = oracledb.connect(user="nepes", password="nepes01", dsn="192.168.10.37:1521/NEPESDB1")

# ✅ Correct — read from environment
import os
conn = oracledb.connect(
    user=os.environ["ORACLE_USER"],
    password=os.environ["ORACLE_PASSWORD"],
    dsn=os.environ["ORACLE_DSN"],
)
```

**Detection Pattern:** `connect(password="...", dsn="...")` or similar with literal string values containing IP addresses, passwords, or tokens.

---

### 7. Missing `HTTPException` Status Code on Error Path — Warning

Raising a generic `Exception` or returning an error dict instead of `HTTPException` breaks FastAPI's error response contract and OpenAPI documentation.

```python
# ❌ Warning — generic exception leaks stack trace to client
@router.get("/alarms/{alarm_id}")
async def get_alarm(alarm_id: str) -> AlarmResponse:
    alarm = await alarm_repo.find(alarm_id)
    if not alarm:
        raise Exception("Not found")  # returns 500

# ✅ Correct
    if not alarm:
        raise HTTPException(status_code=404, detail=f"Alarm {alarm_id} not found")
```

**Detection Pattern:** `raise Exception(...)` or `raise ValueError(...)` inside a FastAPI route function where `HTTPException` should be used.

---

### 8. Bare `except:` or `except Exception:` Without Logging — Warning

Catching all exceptions without logging swallows errors silently and makes debugging impossible.

```python
# ❌ Warning — silent failure
try:
    result = await process_data(payload)
except Exception:
    return {"status": "error"}

# ✅ Correct
import logging
logger = logging.getLogger(__name__)

try:
    result = await process_data(payload)
except Exception as e:
    logger.error("process_data failed: %s", e, exc_info=True)
    raise HTTPException(status_code=500, detail="Internal processing error")
```

**Detection Pattern:** `except Exception:` or bare `except:` block with no `logger.*` or `logging.*` call and no re-raise of the original exception.

---

### 9. DB Connection Not Closed / Context Manager Not Used — Critical

Database connections obtained without `with` statement or `try/finally` cause connection pool exhaustion.

```python
# ❌ Critical — connection leaked on exception
conn = oracledb.connect(dsn=DSN)
cursor = conn.cursor()
cursor.execute(sql)
# if exception here, conn.close() never called

# ✅ Correct — context manager ensures cleanup
with oracledb.connect(dsn=DSN) as conn:
    with conn.cursor() as cursor:
        cursor.execute(sql)
        return cursor.fetchall()
```

**Detection Pattern:** `oracledb.connect(...)` or `psycopg2.connect(...)` assigned to a variable outside a `with` statement, without a `try/finally` that calls `.close()`.

---

### 10. Mutable Default Argument — Warning

Using a mutable object (list, dict) as a default argument value creates a shared state bug.

```python
# ❌ Warning — shared mutable default
def process_records(records: list = []) -> list:
    records.append("processed")
    return records

# ✅ Correct
def process_records(records: list | None = None) -> list:
    if records is None:
        records = []
    records.append("processed")
    return records
```

**Detection Pattern:** Function definition with a mutable default argument (e.g., `= []`, `= {}`, `= set()`).

---

## Error Handling

- If this file cannot be read: skip the Python Platform perspective and log `[Language checklist file not found — Python platform checks skipped]` in the report header.
- Pattern not applicable (no `.py` files in scope): mark as N/A.
