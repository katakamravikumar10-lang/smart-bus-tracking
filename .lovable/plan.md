## Scope reality-check

The app has only three authenticated routes today: `/dashboard`, `/profile`, `/settings`. All the "Bus Details / Edit Bus / Create Driver / Trip Details / …" screens listed in your brief are **modal-based** inside the Admin dashboard's DataTable tabs — they aren't separate URLs. Turning every dialog into its own route would be a large rebuild and would break existing flows, which you asked me NOT to do.

So this plan focuses on what actually improves navigation **within the current architecture**, plus reusable pieces you can drop into any future detail/edit route.

## What I'll build

### 1. Reusable navigation primitives (`src/components/nav/`)
- **`BackButton.tsx`** — left-arrow + "Back" label, uses `router.history.canGoBack()`; falls back to a supplied `fallbackTo` (defaults to `/dashboard`). Theme-aware, `aria-label`, `min-h-11` on mobile, hover animation. Never loops (uses history, not `-1` blindly).
- **`Breadcrumbs.tsx`** — accepts `items: { label, to?, params? }[]`; last item is the current page (non-clickable, `aria-current="page"`). Uses shadcn `Breadcrumb` primitives (already installed).
- **`PageHeader.tsx`** — composes BackButton + Breadcrumbs + title + description + `actions` slot. One consistent header for every sub-page.

### 2. Wire into existing routes
- `/profile` → PageHeader: `Dashboard → Profile`, back-to-dashboard fallback.
- `/settings` → PageHeader: `Dashboard → Settings`, back-to-dashboard fallback.
- Landing (`/`), `/auth`, `/reset-password`, `/dashboard` — **no back button** (as specified).

### 3. BrandHeader enhancements
- **Active-page highlight** for Profile/Settings/Dashboard links in the account dropdown (via `data-status="active"` from TanStack `Link`).
- **Mobile nav drawer** (shadcn `Sheet`) with quick links: Dashboard, Profile, Settings, Notifications, Sign out. Trigger button shows only below `sm:`.
- Existing avatar dropdown, NotificationsBell, ThemeToggle, sticky positioning all preserved.

### 4. State preservation (search / filters / tabs / scroll)
- Add `scrollRestoration: true` to the router config so scroll position is restored on back navigation.
- Admin dashboard's active tab: persist to `sessionStorage` (`admin.dashboard.tab`) so returning from Profile/Settings lands on the same tab. Filters/pagination in `DataTable` are already component-state; scroll restoration covers them.
- No changes to `Map` state (Google Maps component owns its own zoom); no dashboard business logic touched.

### 5. Subtle animation polish
- Reuse existing `animate-fade-in` for PageHeader mount.
- `hover-scale`-style transform on BackButton and mobile drawer trigger.
- No page-transition library added (would fight TanStack Router's SSR); we use the existing tailwind keyframes only.

### 6. Accessibility
- BackButton: `aria-label="Go back"`, keyboard-activatable (native `<button>`), visible `focus-visible:ring`.
- Breadcrumbs: `<nav aria-label="Breadcrumb">`, `aria-current="page"` on last item.
- Mobile drawer: shadcn `Sheet` (Radix) — focus trap + Esc handled.
- Ensure single `<main>` per page (already correct in Profile/Settings; verified on Dashboard).

### 7. What's explicitly **NOT** in scope
- Splitting modal-based CRUD (Create/Edit Bus, Driver, Student, Faculty, Route, Announcement, Trip Details) into dedicated routes. That's a rebuild.
- Bottom tab bar (would conflict with existing sticky BrandHeader on the small route set).
- Sidebar shell (dashboards use tabs, not a sidebar; adding one would restructure the app).
- Any changes to Demo Mode, GPS Simulator, Google Maps, Auth, RLS, dashboards, or DataTable business logic.

### Files touched
- new: `src/components/nav/BackButton.tsx`, `src/components/nav/Breadcrumbs.tsx`, `src/components/nav/PageHeader.tsx`, `src/components/MobileNavDrawer.tsx`
- edit: `src/components/BrandHeader.tsx` (add mobile drawer trigger + active states), `src/routes/_authenticated/profile.tsx`, `src/routes/_authenticated/settings.tsx`, `src/components/dashboards/AdminDashboard.tsx` (persist active tab only), `src/router.tsx` (enable `scrollRestoration`)

### Verification
- `bunx tsgo --noEmit` clean.
- Manual sanity check via Playwright: navigate Dashboard → Profile → Back, confirm same tab restored.

## Reusable pattern for future detail/edit routes

When you're ready to split modal-based dialogs into their own routes (e.g. `/_authenticated/buses/$busId`), each new route just drops in:

```tsx
<PageHeader
  breadcrumbs={[
    { label: "Dashboard", to: "/dashboard" },
    { label: "Buses", to: "/dashboard", search: { tab: "buses" } },
    { label: bus.bus_number },
  ]}
  title={bus.bus_number}
  description="Live status, route, and driver assignment"
  actions={<Button>Edit</Button>}
/>
```

That's the extension path — no need to touch these primitives again.

Reply "go" and I'll build it.
