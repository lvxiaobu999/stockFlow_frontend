# StockFlow Frontend Agent Guide

## Scope

StockFlow is a React 19 + TypeScript + Vite frontend for an inventory, purchasing and sales (进存销) MVP. This repository contains frontend code only; do not add backend services or database migrations here.

## Development commands

- `pnpm dev` starts Vite with hot reload.
- `pnpm build` runs the TypeScript project build and production Vite build.
- `pnpm lint` runs Oxlint. Fix errors before handing off changes.
- `pnpm preview` serves the production build locally.

## Architecture rules

- Use `src/` as the application root and import through the `@/*` alias for shared modules.
- Keep route definitions in `src/App.tsx` until the route tree becomes large enough to extract into `src/router/`.
- Use Ant Design for application components and its `ConfigProvider` token system for theme changes.
- Use Tailwind utilities for small layout adjustments; keep reusable or stateful UI styles in colocated CSS modules or `src/App.css`.
- Keep API calls behind a typed service layer. Do not access `fetch` directly from presentational components.
- Define domain types before wiring pages to real APIs. Mock data should be clearly named and easy to replace.

## Quality bar

- All new code must be TypeScript and pass `pnpm build` and `pnpm lint`.
- Avoid `any`, dead code, and unhandled promises. Use `unknown` with narrowing at external boundaries.
- Preserve responsive behavior for widths from 320px upward and keyboard accessibility for interactive controls.
- Never commit secrets. Only variables prefixed with `VITE_` are exposed to browser code.
