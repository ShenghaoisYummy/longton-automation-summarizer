import { fetchInvoiceContext } from '../actionstep/ingestion.js';
import { buildInvoiceSummary, enhanceNarrativeWithLlm } from '../summarizer/summarizer.js';
import { InvoiceSummaryResponse } from '../shared/types.js';

export async function generateInvoiceSummary(actionId: string): Promise<InvoiceSummaryResponse> {
  const context = await fetchInvoiceContext(actionId);
  const summary = buildInvoiceSummary(context);
  const narrative = await enhanceNarrativeWithLlm(summary);
  summary.narrativeSummary = narrative;
  // eslint-disable-next-line no-console
  console.log('[InvoiceSummary] Gemini narrative preview', narrative.slice(0, 240));
  return { summary, email: null };
}

export async function schedulePipelines() {
  // TODO: register workflow schedules (Temporal/Airflow bridge).
  // This stub ensures the bootstrap flow is ready for future expansion.
  return Promise.resolve();
}
