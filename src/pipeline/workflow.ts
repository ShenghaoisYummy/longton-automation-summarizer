import { fetchInvoiceContext } from '../actionstep/ingestion.js';
import { sendInvoiceSummary } from '../delivery/notifier.js';
import { buildInvoiceSummary } from '../summarizer/summarizer.js';
import { InvoiceSummaryResponse } from '../shared/types.js';

export async function generateInvoiceSummary(actionId: string): Promise<InvoiceSummaryResponse> {
  const context = await fetchInvoiceContext(actionId);
  const summary = buildInvoiceSummary(context);
  const email = await sendInvoiceSummary(summary);

  return { summary, email };
}

export async function schedulePipelines() {
  // TODO: register workflow schedules (Temporal/Airflow bridge).
  // This stub ensures the bootstrap flow is ready for future expansion.
  return Promise.resolve();
}
