import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { config } from '../shared/config.js';
import { InvoiceContext, InvoiceSummary } from '../shared/types.js';

let geminiModel: GenerativeModel | null = null;

function ensureGeminiModel(): GenerativeModel | null {
  if (geminiModel) {
    return geminiModel;
  }

  try {
    const { llm } = config.load();
    const client = new GoogleGenerativeAI(llm.apiKey);
    geminiModel = client.getGenerativeModel({ model: llm.model });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[Summarizer] Unable to initialize Gemini model during ensureGeminiModel', error);
    geminiModel = null;
  }

  return geminiModel;
}

export async function initializeSummarizer() {
  geminiModel = null;
  ensureGeminiModel();
}

function sumAmounts(entries: InvoiceContext['timeEntries'], predicate: (value: boolean) => boolean) {
  return entries
    .filter((entry) => predicate(entry.isBillable))
    .reduce((acc, entry) => acc + entry.billableAmount, 0);
}

function sumHours(entries: InvoiceContext['timeEntries'], predicate: (entry: InvoiceContext['timeEntries'][number]) => boolean) {
  return entries
    .filter((entry) => predicate(entry))
    .reduce((acc, entry) => acc + (entry.billableHours > 0 ? entry.billableHours : entry.actualHours), 0);
}

function buildNarrative(summary: InvoiceSummary): string {
  const totalEntries = summary.entries.length;
  const latestEntry = summary.entries[0];
  const latestDetail = latestEntry
    ? `Latest activity on ${latestEntry.date} (${latestEntry.description}).`
    : 'No activity reported in the current period.';

  return [
    `Matter ${summary.matterNumber} (${summary.matterName}) for ${summary.clientName}.`,
    `${totalEntries} time entries captured with billable work totaling ${summary.totals.billable.toFixed(2)} ${summary.currency}.`,
    `Fees awaiting invoicing: ${summary.fees.uninvoiced.amount.toFixed(2)} ${summary.currency} across ${summary.fees.uninvoiced.hours.toFixed(2)} hours.`,
    `Outstanding balance is ${summary.totals.outstanding.toFixed(2)} ${summary.currency}.`,
    latestDetail,
  ].join(' ');
}

export function buildInvoiceSummary(context: InvoiceContext): InvoiceSummary {
  const billableTotal = sumAmounts(context.timeEntries, (isBillable) => isBillable);
  const nonBillableTotal = sumAmounts(context.timeEntries, (isBillable) => !isBillable);

  const feesInvoicedAmount = context.timeEntries
    .filter((entry) => entry.billReference)
    .reduce((acc, entry) => acc + entry.billableAmount, 0);

  const feesUninvoicedAmount = context.timeEntries
    .filter((entry) => !entry.billReference)
    .reduce((acc, entry) => acc + entry.billableAmount, 0);

  const feesInvoicedHours = sumHours(context.timeEntries, (entry) => Boolean(entry.billReference));
  const feesUninvoicedHours = sumHours(context.timeEntries, (entry) => !entry.billReference);

  const feesPanel = {
    invoiced: {
      amount: feesInvoicedAmount,
      hours: feesInvoicedHours,
    },
    uninvoiced: {
      amount: feesUninvoicedAmount,
      hours: feesUninvoicedHours,
    },
  };

  const invoicesPanel = {
    invoiced: context.totals.billed,
    outstanding: context.totals.outstanding,
  };

  const inferredWriteOffs = context.writeOffs ?? Math.max(0, context.totals.billed - context.totals.payments - context.totals.outstanding);

  const paymentsPanel = {
    paidToDate: context.totals.payments,
    writeOffs: inferredWriteOffs,
  };

  const disbursementsPanel = {
    invoiced: context.disbursements?.invoiced ?? null,
    uninvoiced: context.disbursements?.uninvoiced ?? null,
    unpaidSupplier: context.disbursements?.unpaidSupplier ?? null,
  };

  const trustPanel = {
    balance: context.trust?.balance ?? null,
  };

  const entries = [...context.timeEntries]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .map((entry) => ({
      id: entry.id,
      description: entry.description,
      date: entry.timestamp,
      owner: entry.ownerName ?? entry.owner,
      amount: entry.billableAmount,
      isBillable: entry.isBillable,
      hours: entry.billableHours > 0 ? entry.billableHours : entry.actualHours,
    }));

  const summary: InvoiceSummary = {
    actionId: context.actionId,
    matterNumber: context.matterNumber,
    matterName: context.matterName,
    clientName: context.clientName,
    clientEmail: context.clientEmail,
    currency: context.currency,
    totals: {
      billable: billableTotal,
      nonBillable: nonBillableTotal,
      billed: context.totals.billed,
      payments: context.totals.payments,
      outstanding: context.totals.outstanding,
    },
    entries,
    narrativeSummary: '',
    fees: feesPanel,
    panels: {
      fees: feesPanel,
      invoices: invoicesPanel,
      payments: paymentsPanel,
      disbursements: disbursementsPanel,
      trust: trustPanel,
    },
    generatedAt: new Date().toISOString(),
  };

  summary.narrativeSummary = buildNarrative(summary);
  return summary;
}

function buildGeminiPrompt(summary: InvoiceSummary): string {
  const maxEntries = 10;
  const keyEntries = summary.entries.slice(0, maxEntries).map((entry) => ({
    id: entry.id,
    date: entry.date,
    owner: entry.owner,
    description: entry.description,
    amount: entry.amount,
    hours: entry.hours,
    isBillable: entry.isBillable,
  }));

  const structuredSummary = {
    matter: {
      number: summary.matterNumber,
      name: summary.matterName,
      client: summary.clientName,
      currency: summary.currency,
    },
    totals: summary.totals,
    fees: summary.fees,
    invoices: summary.panels.invoices,
    payments: summary.panels.payments,
    disbursements: summary.panels.disbursements,
    trust: summary.panels.trust,
    entries: keyEntries,
    generatedAt: summary.generatedAt,
  };

  const instructions = [
    'You are assisting an Australian law firm partner with a concise invoice briefing.',
    'Write a short narrative (2-3 sentences) in plain text summarising fee status, outstanding amounts, and recent activity.',
    'Highlight any uninvoiced fees, overdue balances, and notable recent work. Avoid markdown and bullet lists.',
    'Use the provided currency code directly (do not convert) and keep the tone professional but direct.',
  ].join(' ');

  return `${instructions}\n\nInvoice summary (JSON):\n${JSON.stringify(structuredSummary, null, 2)}`;
}

export async function enhanceNarrativeWithLlm(summary: InvoiceSummary): Promise<string> {
  const fallbackNarrative = summary.narrativeSummary || buildNarrative(summary);
  const model = ensureGeminiModel();

  if (!model) {
    return fallbackNarrative;
  }

  try {
    const prompt = buildGeminiPrompt(summary);
    const response = await model.generateContent(prompt);
    const text = response.response?.text();

    if (typeof text === 'string' && text.trim().length > 0) {
      return text.trim();
    }

    // eslint-disable-next-line no-console
    console.warn('[Summarizer] Gemini returned empty response; using fallback narrative');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Summarizer] Gemini generateContent failed', error);
  }

  return fallbackNarrative;
}

export function __setGeminiModelForTests(model: GenerativeModel | null) {
  geminiModel = model;
}
