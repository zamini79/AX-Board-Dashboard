# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev        # Dev server at http://localhost:8080
bun run build      # Production build
bun run lint       # ESLint
bun run test       # Vitest (single run)
bun run test:watch # Vitest (watch mode)
```

Run a single test file: `bun run test src/path/to/file.test.ts`

## Environment Variables

`.env` requires:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Architecture

**AX Board** is a Korean enterprise performance management dashboard (KPI tracking, task management, budget, BSC goal management) built with React 18 + TypeScript + Vite + shadcn/ui + Tailwind + Supabase + TanStack Query.

### Provider Stack (`src/App.tsx`)

```
QueryClientProvider → ThemeProvider → AuthProvider → TooltipProvider → BrowserRouter
```

Global QueryClient defaults: 5 min `staleTime`, 10 min `gcTime`, `refetchOnWindowFocus: false`.

### Routing & Pages (`src/pages/`)

All pages wrap content in `<AppLayout>`. Protected routes use `<ProtectedRoute>` which checks `AuthContext`. Routes: `/`, `/kpis`, `/kpi/:id`, `/tasks`, `/tasks/:id`, `/todos`, `/budget`, `/performance`, `/performance/:id`, `/user-approval`, `/settings`, `/auth`, `/reset-password`.

### Component Organization (`src/components/`)

Domain-grouped subdirectories: `ai/`, `budget/`, `dashboard/`, `department/`, `editors/`, `kpi/`, `layout/`, `performance/`, `task/`, `todo/`. Shared primitives live in `ui/` (shadcn/ui components — do not edit directly). Each domain folder has an `index.ts` barrel.

### Data Layer (`src/hooks/`)

Each domain has a dedicated hook (e.g., `useTasks`, `useKpis`, `useBudgets`, `useGoals`). The pattern is:
- `useQuery` for reads, always scoped by `profile.org_id` from `useUserProfile()`
- `useMutation` for writes with `queryClient.invalidateQueries` on success and `useToast` for feedback
- Tasks have many-to-many relations to KPIs and Initiatives via junction tables (`task_kpis`, `task_initiatives`); syncing is done by delete-then-insert

### Auth & Roles (`src/contexts/AuthContext.tsx`, `src/hooks/useUserProfile.ts`)

`AuthContext` wraps Supabase auth (email/password + OTP). `useUserProfile()` exposes role-based flags derived from the `user_roles` table:
- `isAdmin` — full access + user management
- `isCeo` — executive view (alias: `isExecutive`)
- `isManager` — admin or CEO
- `isOwnerRole` / `isOwnerOrAbove` — can create content
- `canApprove` — admin, CEO, or owner

### Supabase Integration (`src/integrations/supabase/`)

`client.ts` exports the typed `supabase` client (import from `@/integrations/supabase/client`). `types.ts` is auto-generated — do not edit. App-level domain types (interfaces and status config objects) live in `src/types/database.ts`.

### Path Alias

`@/` resolves to `src/`. Use it for all internal imports.

### Task Statuses & Types

`TaskType`: `kpi_action` | `todo`  
`TaskStatus`: `not_started` → `in_progress` → `done` → `executive_review` → `closed` (or `blocked` / `cancelled`)  
`AppRole`: `admin` > `ceo` > `owner` > `editor`
