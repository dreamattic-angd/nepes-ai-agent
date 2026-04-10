# JS/TS Platform Checklist

> This file is referenced by `js-code-reviewer.md` as the **JS/TS Platform** perspective (Phase 1.5).
> It consolidates all JavaScript/TypeScript-specific patterns previously in `review-checklists.md` plus additional React/Vue checks.

**Purpose**: Provide a JS/TS-specific checklist applied IN ADDITION to the standard 4-perspective review.
This forms a **fifth perspective: JS/TS Platform**.

## Output Format

Each finding is classified as Critical / Warning / Suggestion and included in the review report under the
**Perspective: JS/TS Platform** label.

---

## JS/TS Platform Checks

### 1. `async` Function Result Not `await`-ed (Silent Promise Rejection) — Critical

`async` function called as a statement without `await`, `.then().catch()`, or `void` keyword.

```javascript
// ❌ Critical - unhandled rejection, silent failure
async function saveData() { ... }
saveData();  // fire-and-forget with no error handling

// ✅ Correct patterns
await saveData();

// or with explicit void (intentional fire-and-forget, but MUST have internal catch)
void saveData().catch(err => logger.error(err));
```

**Detection Pattern:** `asyncFn();` called as a statement without `await`, without `.then().catch()`, and without `void` keyword.

---

### 2. `useEffect` Missing Dependency Array (Infinite Re-render Risk) — Critical

`useEffect` with a callback but no second argument.

```javascript
// ❌ Critical - runs after every render
useEffect(() => {
    fetchUser(userId);
});

// ✅ Correct pattern
useEffect(() => {
    fetchUser(userId);
}, [userId]);
```

**Detection Pattern:** `useEffect(() => { ... })` with no second argument.

---

### 3. `useEffect` with Stale Closure (Missing Dependency) — Warning

Variable used inside `useEffect` callback that is not listed in the dependency array.

```javascript
// ❌ Warning - stale closure on `count`
useEffect(() => {
    const id = setInterval(() => {
        setCount(count + 1);  // count is stale
    }, 1000);
    return () => clearInterval(id);
}, []);  // count missing from deps

// ✅ Correct pattern
useEffect(() => {
    const id = setInterval(() => {
        setCount(c => c + 1);  // functional update avoids stale closure
    }, 1000);
    return () => clearInterval(id);
}, []);
```

**Detection Pattern:** Variable used inside `useEffect` callback that is not listed in the dependency array (ESLint `react-hooks/exhaustive-deps` equivalent).

---

### 4. `any` Type Used in TypeScript (Type Safety Collapse) — Warning

Explicit `: any` annotation or implicit `any` from untyped function parameters.

```typescript
// ❌ Warning - defeats TypeScript's purpose
function process(data: any) { ... }
const result: any = fetchData();

// ✅ Correct pattern
function process(data: UserPayload) { ... }
const result: ApiResponse<User> = await fetchData();
```

**Detection Pattern:** Explicit `: any` annotation or untyped function parameters that resolve to implicit `any`.

---

### 5. `Promise.all` Not Used for Independent Parallel Async Calls — Warning

Two or more `await` calls in sequence where the second does not depend on the first result.

```javascript
// ❌ Warning - sequential when independent (slower)
const user = await fetchUser(id);
const orders = await fetchOrders(id);  // doesn't depend on user result

// ✅ Correct pattern - parallel
const [user, orders] = await Promise.all([fetchUser(id), fetchOrders(id)]);
```

**Detection Pattern:** Two or more `await` calls in sequence where the second operand does not reference the first result variable.

---

### 6. Vue `reactive` Object Replaced Wholesale (Reactivity Lost) — Warning

Direct assignment on a variable declared with `reactive()` replaces the reactive proxy.

```javascript
// ❌ Warning - reactivity lost
const data = reactive({ items: [] });
data = { items: newItems };  // reassignment breaks reactivity

// ✅ Correct pattern
data.items = newItems;
// or
Object.assign(data, { items: newItems });
```

**Detection Pattern:** `data = { ... }` assignment on a variable declared with `reactive()`.

---

### 7. `localStorage` Used for JWT / Auth Token Storage — Critical

Storing authentication tokens in `localStorage` exposes them to XSS attacks.

```javascript
// ❌ Critical - XSS-accessible token storage
localStorage.setItem('jwt_token', token);
localStorage.setItem('auth', accessToken);
localStorage.setItem('session_id', sessionId);

// ✅ Correct pattern - use httpOnly cookies managed server-side
// tokens should never be stored in localStorage
```

**Detection Pattern:** `localStorage.setItem` with key containing `token`, `jwt`, `auth`, or `session` (case-insensitive).

---

### 8. `process.env.VAR` Accessed Without Existence Check — Warning

`process.env.SOME_VAR` used directly without a null/undefined guard.

```javascript
// ❌ Warning - may be undefined at runtime
const dbUrl = process.env.DB_URL;
connectToDb(process.env.DB_URL);  // undefined passed silently

// ✅ Correct pattern
const dbUrl = process.env.DB_URL;
if (!dbUrl) throw new Error('DB_URL environment variable is not set');
connectToDb(dbUrl);
```

**Detection Pattern:** `process.env.SOME_VAR` used directly as a function argument or in an expression without a preceding null/undefined guard.

---

### 9. React/Vue Component Function Exceeds 150 Lines — Warning

Large component functions are hard to test and violate the single-responsibility principle.

```
// ❌ Warning - component body exceeds 150 lines
// UserDashboard.tsx: 320 lines

// ✅ Correct pattern - extract sub-components and custom hooks
// UserDashboard.tsx: 60 lines
// useUserDashboard.ts: 80 lines
// UserStats.tsx: 40 lines
```

**Detection Pattern:** Single `.tsx` or `.vue` component file with a component function body over 150 lines.

---

### 10. Missing `key` Prop in List Rendering — Warning

`.map()` returning JSX or Vue template elements without a stable `key` prop.

```jsx
// ❌ Warning - no key prop
{items.map(item => <ListItem item={item} />)}

// ✅ Correct pattern
{items.map(item => <ListItem key={item.id} item={item} />)}
```

**Detection Pattern:** `.map(...)` returning JSX or Vue `v-for` directive without a `key` prop on the root element.

---

## Migrated Patterns from review-checklists.md

### Async Error Handling — Warning

```javascript
// ❌ Warning - Promise without catch
fetchData().then(result => process(result));
someAsyncFn(); // fire-and-forget without error handling

// ✅ Correct pattern
fetchData()
  .then(result => process(result))
  .catch(err => console.error('fetch failed:', err));
```

### Environment Variable Access — Warning

```javascript
// ❌ Warning - no existence check
const dbUrl = process.env.DB_URL; // may be undefined

// ✅ Correct pattern - verify before use
const dbUrl = process.env.DB_URL;
if (!dbUrl) throw new Error('DB_URL environment variable is not set');
```

### Sequential Async (Parallelizable) — Warning

```javascript
// ❌ Warning - sequential when independent
const a = await fetchA();
const b = await fetchB(); // doesn't depend on a

// ✅ Correct pattern - parallel
const [a, b] = await Promise.all([fetchA(), fetchB()]);
```

### Synchronous Blocking in Async Context — Warning

```javascript
// ❌ Warning - blocking the event loop
const data = fs.readFileSync('large-file.json'); // blocks

// ✅ Correct pattern
const data = await fs.promises.readFile('large-file.json', 'utf8');
```

---

## Error Handling

- If this file cannot be read: skip the JS/TS Platform perspective and log `[Language checklist file not found — JS/TS platform checks skipped]` in the report header.
- Pattern not applicable (no JS/TS files in scope): mark as N/A.
