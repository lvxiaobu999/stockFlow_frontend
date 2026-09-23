# StockFlow Frontend Agent Guide

## Scope

StockFlow is a React 19 + TypeScript + Vite frontend for an inventory, purchasing and sales (进存销) MVP. This repository contains frontend code only; do not add backend services or database migrations here.

## Development commands

- `pnpm dev` starts Vite with hot reload.
- `pnpm build` runs the TypeScript project build and production Vite build.
- `pnpm lint` runs Oxlint. `pnpm lint:fix` auto-fixes what it can.
- `pnpm lint:css` runs Stylelint over `src/**/*.{css,less}`. `pnpm lint:css:fix` auto-fixes what it can.
- `pnpm typecheck` runs TypeScript type checking across all projects.
- `pnpm format` formats the repo with Prettier; `pnpm format:check` verifies formatting only.
- `pnpm preview` serves the production build locally.

Fix errors from `pnpm lint` and `pnpm build` before handing off changes.

## Commit convention

Commits follow Conventional Commits and are enforced by commitlint via a husky `commit-msg` hook. A `pre-commit` hook runs `lint-staged`, which formats and lints staged files.

Format: `type(scope): subject` — types include `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

## Architecture rules

- Use `src/` as the application root and import through the `@/*` alias for shared modules.
- Routes live in `src/router/`, the app shell in `src/layouts/`, and one file per page in `src/pages/`. Lazy-load heavier pages to keep the initial bundle small.
- Use Ant Design for application components and its `ConfigProvider` token system for theme changes.
- Use Tailwind v4 utilities for small layout adjustments. Tailwind is configured CSS-first: theme tokens live in the `@theme` block of `src/styles/index.css` and there is no `tailwind.config.*` or `postcss.config.*`. antd styles are wrapped in `@layer antd` (via `StyleProvider layer` in `AppProviders`, with the layer order declared at the top of `src/styles/index.css`) so plain utilities like `text-brand-600` can override antd component styles — do not add `!important` for that. Keep reusable or stateful UI styles in colocated CSS modules or `src/styles/App.less`; all CSS/Less must pass `pnpm lint:css`.
- Organize business code by vertical slice under `src/features/<domain>/` (`types.ts`, `services/`, `hooks/`, `components/`). Keep `src/pages/` as thin route composition entries.
- Keep API calls behind the typed Axios client in `src/services/httpClient.ts`. Do not access `fetch` or import Axios directly from pages or presentational components.
- Use TanStack Query for server state (`useQuery`/`useMutation`, query keys and invalidation). Do not copy API response data into Zustand.
- Define domain types before wiring pages to real APIs. Mock data should be clearly named and easy to replace with a service implementation.
- Use `src/components/` only for components that are genuinely business-agnostic. Do not create one-off abstractions or duplicate dashboard/page markup.
- Keep cross-page UI/session state in `src/stores/` with Zustand. Keep server data, form state and ephemeral view state in the owning feature.
- Put pure utility methods in `src/utils/`; utilities must not depend on React, router or feature state.
- Mock API handlers live in `src/mocks/` and must match the real service response types. Use MSW in development via `VITE_USE_MOCK_API=true`.
- Route transitions use the shared fade transition in `AppLayout`; preserve the overflow boundary so animations never introduce horizontal scrollbars. Respect `prefers-reduced-motion`.
- Internal navigation progress is handled by `NavigationProgress` with NProgress; new navigation surfaces should use normal internal anchors/router links so progress tracking remains consistent.
- Add navigation entries only in `src/config/navigation.tsx`; do not duplicate sidebar labels or paths in layouts.
- Every data-driven page must handle loading, empty and error states. Every new route must be lazy-loaded when its bundle is non-trivial.

## Collaboration rules

- Before adding a component, search `src/components/` and the owning feature for an existing equivalent.
- Before adding a store field, explain why the state must cross a route boundary; prefer local state for one screen.
- Keep one responsibility per file and use named exports for reusable components, hooks and services.
- New feature work should update the relevant route, navigation item, domain types, service and tests/docs in the same change when applicable.
- Run `pnpm typecheck`, `pnpm lint`, `pnpm format:check` and `pnpm build` before handoff.

## Commenting rules

Treat comments as a first-class part of the code, not an afterthought. A new teammate should be able to understand the intent behind a function, hook, effect or domain type without asking the author.

- Write code comments in Simplified Chinese, matching the existing convention (`/** ... */` doc blocks and `//` inline notes).
- Add a JSDoc block to every exported function, component, hook, service method, class, and non-obvious constant. State **what it does and why it exists**, not just what it is.
- Comment the **why**, not the **what**: business rules, non-obvious decisions, edge cases, magic numbers, and workarounds. Do not restate self-evident code.
- Document non-obvious fields in domain types and response envelopes — units, enum meaning, and backend conventions (e.g. `total` means total pages, not total rows).
- Comment hooks and effects: the side effect they produce, when they run, and what cleanup they perform (timers, event listeners, history patching).
- Comment store fields whose state crosses a route boundary, per the architecture rule above.
- Keep comments current when the code changes and delete stale comments. A wrong comment is worse than no comment.

## Quality bar

- All new code must be TypeScript and pass `pnpm build`, `pnpm lint` and `pnpm typecheck`.
- Avoid `any`, dead code, and unhandled promises. Use `unknown` with narrowing at external boundaries.
- Preserve responsive behavior for widths from 320px upward and keyboard accessibility for interactive controls.
- Never commit secrets. Only variables prefixed with `VITE_` are exposed to browser code.
