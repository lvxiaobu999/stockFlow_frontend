# StockFlow Frontend Agent Guide

## Scope

StockFlow is a React 19 + TypeScript + Vite frontend for an inventory, purchasing and sales (进存销) MVP. This repository contains frontend code only; do not add backend services or database migrations here.

## Development commands

- `pnpm dev` starts Vite with hot reload.
- `pnpm build` runs the TypeScript project build and production Vite build.
- `pnpm lint` runs Oxlint. `pnpm lint:fix` auto-fixes what it can.
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
- Use Tailwind utilities for small layout adjustments; keep reusable or stateful UI styles in colocated CSS modules or `src/App.css`.
- Keep API calls behind a typed service layer. Do not access `fetch` directly from presentational components.
- Define domain types before wiring pages to real APIs. Mock data should be clearly named and easy to replace.

## Quality bar

- All new code must be TypeScript and pass `pnpm build`, `pnpm lint` and `pnpm typecheck`.
- Avoid `any`, dead code, and unhandled promises. Use `unknown` with narrowing at external boundaries.
- Preserve responsive behavior for widths from 320px upward and keyboard accessibility for interactive controls.
- Never commit secrets. Only variables prefixed with `VITE_` are exposed to browser code.
