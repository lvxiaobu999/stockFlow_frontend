---
name: stockflow-frontend
description: Build and maintain the StockFlow React frontend using the project's routing, Ant Design, Tailwind and validation conventions.
---

# StockFlow frontend skill

Use this skill for feature work in the StockFlow frontend.

## Workflow

1. Inspect the existing route and component before editing.
2. Add or update domain types before connecting UI state.
3. Build pages with Ant Design components and the shared `ConfigProvider` theme. Use Tailwind for local layout utilities.
4. Add routes through the existing React Router tree and provide a useful loading, empty and error state for data-driven views.
5. Keep network access in a typed service or hook, never inline in a presentational component.
6. Run `pnpm lint` and `pnpm build` before reporting completion.

## Conventions

- TypeScript strictness is enforced by the repository tsconfig; do not weaken it to make a change compile.
- Write code comments in Simplified Chinese. Explain the **why** (business rules, non-obvious decisions, edge cases, magic numbers) rather than restating code, and add a JSDoc block to exported functions, hooks, services, classes and non-obvious domain type fields. See the "Commenting rules" section in `AGENTS.md`.
- Prefer imports from `@/` for application modules.
- Keep labels and user-facing copy in Simplified Chinese unless the feature explicitly requires another locale.
- Use semantic HTML, keyboard-accessible controls, and responsive layouts.
- Do not introduce secrets or commit local `.env` files. Browser-exposed configuration must use `VITE_` variables.

## Handoff

When finishing, describe the user-visible behavior, list the files changed, and include the exact validation commands and their result.
