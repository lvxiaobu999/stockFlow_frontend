# CLAUDE.md

This file is read by Claude Code. The canonical project guidance lives in [AGENTS.md](./AGENTS.md) so it stays in sync with Codex.

For feature work, follow the `stockflow-frontend` skill at `.claude/skills/stockflow-frontend/SKILL.md` and the vertical-slice rules in `AGENTS.md`.

Key commands: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm format`, `pnpm format:check`.

Business code belongs in `src/features/<domain>/`; keep pages thin, use the Axios client in `src/services/httpClient.ts` plus TanStack Query for server state, and use Zustand only for cross-route UI/session state. Put pure helpers in `src/utils/`, use MSW handlers under `src/mocks/`, and search for reusable components before creating new ones.
