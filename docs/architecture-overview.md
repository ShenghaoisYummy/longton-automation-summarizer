# Backend Architecture Overview

## Purpose
The automation summarizer backend powers Longton Legal's matter briefings. It ingests activity from Actionstep, builds an LLM-ready summary, and renders outputs suitable for email or chat delivery. The service is intentionally modular so each stage can grow into a dedicated subsystem as integrations mature.

## Key Subsystems
- **API Layer (`src/server.ts`)** – Hosts the Express app, exposes a `/health` probe and the `POST /api/invoice-summaries` endpoint, and coordinates service startup.
- **Configuration (`src/shared/config.ts`)** – Loads environment variables via `dotenv`, enforces required secrets, and shares runtime types through `src/shared/types.ts`.
- **Actionstep Ingestion (`src/actionstep/ingestion.ts`)** – Normalizes matter context and time entries. Currently uses sample data but is the seam for webhooks, delta polling, and persistence.
- **Summarization (`src/summarizer/summarizer.ts`)** – Prepares totals, sorts time entries, and constructs the narrative that the LLM layer will enhance.
- **Delivery (`src/delivery/notifier.ts`)** – Builds a plain-text invoice email and currently logs a stub send, pending SMTP or chat adapters.
- **Pipeline Orchestration (`src/pipeline/workflow.ts`)** – Strings the ingestion, summarization, and delivery steps together and will later house scheduling logic.

## Data Flow
1. A client calls `POST /api/invoice-summaries` with an `actionId`.
2. The pipeline module fetches the invoice context via the Actionstep adapter (stubbed today).
3. The summarizer converts the context into an `InvoiceSummary`, including totals and narrative.
4. The notifier assembles a plain-text email payload and (for now) logs the attempted send.
5. The API responds with `{ summary, presentation }`, ready to deliver or persist.

## Configuration & Secrets
Set the following variables in `.env` (see `.env.example` if present):

| Variable | Purpose |
| --- | --- |
| `ACTIONSTEP_CLIENT_ID` / `ACTIONSTEP_CLIENT_SECRET` | OAuth credentials for Actionstep API calls. |
| `ACTIONSTEP_BASE_URL` | Base URL for the tenant-specific Actionstep instance. |
| `DATABASE_URL` | Connection string for persistence once data is stored. |
| `LLM_API_KEY` / `LLM_MODEL` | Access to the chosen language model provider. |
| `PORT` | Optional; defaults to `3000` if unset. |
| `EMAIL_SENDER` | Outbound email identity (optional). |
| `TEAMS_WEBHOOK_URL` | Microsoft Teams webhook for chat notifications (optional). |
| `SUMMARY_DAILY_CADENCE` / `SUMMARY_WEEKLY_CADENCE` / `SUMMARY_MONTHLY_CADENCE` | Cron expressions used to schedule summaries. |

## Developer Workflow
- Install dependencies: `npm install`
- Start the dev server with live reload: `npm run dev`
- Run type checks and build artifacts: `npm run build`
- Execute automated tests (Vitest): `npm test`
- Lint TypeScript sources: `npm run lint`

Tests live under `backend/tests/` and mirror the domain folders in `src/`. Add fixtures beside the modules they exercise to keep feedback tight.

## Extensibility Roadmap
- Replace the sample ingestion with real Actionstep integrations and persistence.
- Expand `schedulePipelines()` to register workflows with Temporal, Airflow, or another orchestrator.
- Integrate the LLM provider by fleshing out `initializeSummarizer()` and adding prompt templates.
- Wire `dispatchEmail()` to SMTP or another delivery provider, add HTML templates, and enforce cadence throttling in `initializeDelivery()`.
- Introduce observability hooks (structured logging, tracing, metrics) once the workflow hardens.

## Repository Map
- `src/` – Runtime code, broken down by domain.
- `tests/` – Unit/integration coverage for each domain.
- `docs/` – Product requirements, proposals, data samples, and this architecture guide.
- `infra/` – Placeholder for infrastructure-as-code definitions.
- `migrations/` – Placeholder for database schema evolution.

This overview should help new contributors understand how the current pieces fit together and where to extend the system next.
