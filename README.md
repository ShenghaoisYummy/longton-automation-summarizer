# Automation Summarizer Backend

Minimal Node.js + TypeScript scaffold for the Longton Legal workflow summarizer. The layout keeps the
codebase small while leaving clear seams for scaling into more services later.

## Directory Layout

- `src/` – application code split by core domains
  - `actionstep/` – adapters for pulling and normalizing Actionstep data
  - `pipeline/` – orchestration logic and scheduling hooks
  - `summarizer/` – LLM prompt assembly, request flow, and formatting
  - `delivery/` – outbound channels (email, Teams) and cadence rules
  - `shared/` – shared utilities (config, persistence, logging)
- `tests/` – mirrors `src/` with unit and integration tests per domain
- `migrations/` – database migrations and seed helpers
- `infra/` – Terraform or deployment manifests when ready
- `docs/` – architecture notes, runbooks, and prompt guidelines

## Tooling

- TypeScript compiler (`tsc`) targets Node 18+ with strict settings.
- Vitest handles unit tests; coverage is pre-configured.
- ESLint with `@typescript-eslint` rules keeps shared code clean.
- `.env.example` tracks required secrets and cadence defaults.

## Next Steps

1. Install dependencies (`npm install`) and wire CI to run `npm test` and `npm run lint`.
2. Define the canonical data models and create the first migration.
3. Flesh out Actionstep ingestion and summarization flows with contract/integration tests.
4. Add observability glue (logging/tracing metrics) before broadening the feature set.

