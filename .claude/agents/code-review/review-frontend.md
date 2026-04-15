# Frontend Platform Checklist

> This file is referenced by `frontend-code-reviewer.md` as the **Frontend Platform** perspective (Phase 1.5).
> It consolidates React/Next.js-specific patterns, accessibility, and UI/UX concerns.

**Purpose**: Provide a frontend-specific checklist applied IN ADDITION to the standard 4-perspective review.
This forms a **fifth perspective: Frontend Platform**.

## Output Format

Each finding is classified as Critical / Warning / Suggestion and included in the review report under the
**Perspective: Frontend Platform** label.

---

## Frontend Platform Checks

### 1. `'use client'` on Server Component Without Necessity — Warning

`'use client'` directive added to a component that does not use hooks, event handlers, or browser APIs.
Unnecessary client components increase the JS bundle size and lose RSC benefits.

```tsx
// ❌ Warning — 'use client' not needed for static rendering
'use client';
export function StaticCard({ title }: { title: string }) {
  return <div>{title}</div>;
}

// ✅ Correct — Server Component by default
export function StaticCard({ title }: { title: string }) {
  return <div>{title}</div>;
}
```

**Detection Pattern:** `'use client'` file that contains no `useState`, `useEffect`, `useRef`, event handler props (`onClick`, `onChange`), or browser API calls (`window`, `document`, `localStorage`).

---

### 2. `useEffect` Missing Dependency Array (Infinite Re-render Risk) — Critical

`useEffect` with a callback but no second argument runs after every render.

```tsx
// ❌ Critical — runs after every render
useEffect(() => {
  fetchData(id);
});

// ✅ Correct
useEffect(() => {
  fetchData(id);
}, [id]);
```

**Detection Pattern:** `useEffect(() => { ... })` with no second argument.

---

### 3. Missing `key` Prop in List Rendering — Warning

`.map()` returning JSX without a stable `key` prop causes reconciliation issues and performance degradation.

```tsx
// ❌ Warning — no key prop
{items.map(item => <AlarmRow item={item} />)}

// ✅ Correct
{items.map(item => <AlarmRow key={item.id} item={item} />)}
```

**Detection Pattern:** `.map(...)` returning JSX without a `key` prop on the root element.

---

### 4. `any` Type in TypeScript — Warning

Explicit `: any` annotation defeats TypeScript's type safety and propagates unsafety downstream.

```tsx
// ❌ Warning
function process(data: any) { ... }
const result: any = await fetchData();

// ✅ Correct
function process(data: AlarmPayload) { ... }
const result: ApiResponse<Alarm[]> = await fetchData();
```

**Detection Pattern:** Explicit `: any` annotation or untyped function parameters that resolve to implicit `any`.

---

### 5. Component Function Exceeds 150 Lines — Warning

Large component functions are hard to test, violate single-responsibility, and slow down rendering analysis.

```
// ❌ Warning — AnalyticsDashboard.tsx: 340 lines

// ✅ Correct — extract sub-components and custom hooks
// AnalyticsDashboard.tsx: 70 lines
// useAnalyticsData.ts: 80 lines
// AlarmSummaryPanel.tsx: 60 lines
// ChartSection.tsx: 50 lines
```

**Detection Pattern:** Single `.tsx` or `.jsx` file with a component function body exceeding 150 lines.

---

### 6. Missing `aria-*` or Semantic HTML on Interactive Elements — Warning

Interactive elements (buttons, modals, dropdowns) without appropriate ARIA attributes or semantic HTML are inaccessible to screen readers.

```tsx
// ❌ Warning — div acting as button with no accessibility
<div onClick={handleClose}>✕</div>

// ✅ Correct
<button type="button" aria-label="Close dialog" onClick={handleClose}>✕</button>
```

**Detection Pattern:** `<div>` or `<span>` with `onClick` handler that lacks `role`, `aria-label`, or `tabIndex`.

---

### 7. `localStorage` Used for JWT / Auth Token Storage — Critical

Storing auth tokens in `localStorage` exposes them to XSS attacks. Use `httpOnly` cookies instead.

```tsx
// ❌ Critical — XSS-accessible
localStorage.setItem('jwt_token', token);
localStorage.setItem('auth', accessToken);

// ✅ Correct — use httpOnly cookies managed server-side (NextAuth handles this)
```

**Detection Pattern:** `localStorage.setItem` with key containing `token`, `jwt`, `auth`, or `session` (case-insensitive).

---

### 8. Sequential `await` for Independent Data Fetches — Warning

Two or more `await` calls in a Server Component where the second does not depend on the first result.

```tsx
// ❌ Warning — sequential fetch (slower)
const user = await fetchUser(id);
const alarms = await fetchAlarms(id);  // doesn't depend on user

// ✅ Correct — parallel fetch
const [user, alarms] = await Promise.all([fetchUser(id), fetchAlarms(id)]);
```

**Detection Pattern:** Two or more `await` calls in sequence where the second operand does not reference the first result variable.

---

### 9. CSS Class Collision Risk (Non-Module CSS) — Warning

Applying global CSS class names without CSS Modules or scoped styling risks class name collisions across components.

```tsx
// ❌ Warning — global class name, collision risk
import './styles.css';
<div className="card">...</div>

// ✅ Correct — scoped with CSS Modules
import styles from './Card.module.css';
<div className={styles.card}>...</div>
```

**Detection Pattern:** `import './something.css'` (non-module import) with `className` usage in the same component.

---

### 10. `process.env` / `NEXT_PUBLIC_` Variable Used Without Existence Check — Warning

Environment variable accessed without a null/undefined guard may fail silently at runtime.

```tsx
// ❌ Warning — may be undefined
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
fetch(process.env.NEXT_PUBLIC_API_URL + '/data');

// ✅ Correct
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (!apiUrl) throw new Error('NEXT_PUBLIC_API_URL is not configured');
fetch(`${apiUrl}/data`);
```

**Detection Pattern:** `process.env.NEXT_PUBLIC_*` or `process.env.*` used directly as a function argument without a preceding null/undefined guard.

---

### 11. Image Without `alt` Attribute — Critical

`<img>` or Next.js `<Image>` without an `alt` attribute fails WCAG accessibility requirements.

```tsx
// ❌ Critical — missing alt
<img src={logoUrl} />
<Image src={logoUrl} width={100} height={40} />

// ✅ Correct
<img src={logoUrl} alt="NEPES logo" />
<Image src={logoUrl} width={100} height={40} alt="NEPES logo" />
```

**Detection Pattern:** `<img>` or `<Image>` element without an `alt` attribute.

---

### 12. Unhandled Promise in Event Handler — Critical

`async` event handler without try/catch or `.catch()` silently swallows errors in the UI.

```tsx
// ❌ Critical — unhandled rejection
<button onClick={async () => { await submitForm(); }}>Submit</button>

// ✅ Correct
<button onClick={async () => {
  try {
    await submitForm();
  } catch (err) {
    setError('Failed to submit. Please try again.');
  }
}}>Submit</button>
```

**Detection Pattern:** `async` arrow function in an event handler prop (`onClick`, `onSubmit`, etc.) without a `try/catch` block.

---

## Error Handling

- If this file cannot be read: skip the Frontend Platform perspective and log `[Language checklist file not found — Frontend platform checks skipped]` in the report header.
- Pattern not applicable (no `.tsx`/`.jsx` files in scope): mark as N/A.
