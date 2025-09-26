# Automation Summarizer Backend

Minimal starter scaffold for the Longton Legal workflow summarizer. The layout keeps the codebase small while leaving clear seams for scaling into more services later.

## Directory Layout

- `src/` – application code split by core domains
  - `actionstep/` – adapters for pulling and normalizing Actionstep data
  - `pipeline/` – orchestration logic and scheduling hooks
  - `summarizer/` – LLM prompt assembly, request flow, and formatting
  - `delivery/` – outbound channels (email, Teams) and cadence rules
  - `shared/` – shared utilities (config, persistence, logging)
- `tests/` – mirrors `src/` with unit and integration tests per domain
- `migrations/` – database migrations and seed helpers
- `infra/` – IaC, deployment manifests, and operational scripts
- `docs/` – architecture notes, runbooks, and prompt guidelines

## Next Steps

1. Pick the primary runtime (Node.js/TypeScript or Python/FastAPI) and initialize dependencies.
2. Define the canonical data models and create the first migration.
3. Stub Actionstep ingestion and summarization flows with integration tests.
4. Hook CI to lint, test, and validate migrations.

