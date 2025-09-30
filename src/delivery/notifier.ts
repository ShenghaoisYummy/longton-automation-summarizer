import { InvoiceEmail, InvoiceSummary } from '../shared/types.js';

function currency(value: number, currencyCode: string) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(value);
}

function currencyOrUnavailable(value: number | null, currencyCode: string) {
  return value === null ? 'Not available' : currency(value, currencyCode);
}

function buildEmailBody(summary: InvoiceSummary): string {
  const billableText = currency(summary.totals.billable, summary.currency);
  const nonBillableText = currency(summary.totals.nonBillable, summary.currency);
  const outstandingText = currency(summary.totals.outstanding, summary.currency);
  const invoicesInvoicedText = currency(summary.panels.invoices.invoiced, summary.currency);
  const paymentsPaidText = currency(summary.panels.payments.paidToDate, summary.currency);
  const paymentsWriteOffsText = currency(summary.panels.payments.writeOffs, summary.currency);
  const disbursementsInvoicedText = currencyOrUnavailable(summary.panels.disbursements.invoiced, summary.currency);
  const disbursementsUninvoicedText = currencyOrUnavailable(summary.panels.disbursements.uninvoiced, summary.currency);
  const disbursementsUnpaidText = currencyOrUnavailable(summary.panels.disbursements.unpaidSupplier, summary.currency);
  const trustBalanceText = currencyOrUnavailable(summary.panels.trust.balance, summary.currency);

  const entryLines = summary.entries.map(
    (entry) =>
      `${new Date(entry.date).toLocaleDateString()} | ${entry.owner} | ${entry.description} | ${currency(entry.amount, summary.currency)} (${entry.hours.toFixed(2)}h)`
  );

  return [
    `Invoice summary for matter ${summary.matterNumber} (${summary.matterName})`,
    `Client: ${summary.clientName}`,
    `Generated: ${new Date(summary.generatedAt).toLocaleString()}`,
    '',
    `Billable total: ${billableText}`,
    `Non-billable total: ${nonBillableText}`,
    `Outstanding: ${outstandingText}`,
    '',
    `Fees (invoiced): ${currency(summary.fees.invoiced.amount, summary.currency)} / ${summary.fees.invoiced.hours.toFixed(2)}h`,
    `Fees (uninvoiced): ${currency(summary.fees.uninvoiced.amount, summary.currency)} / ${summary.fees.uninvoiced.hours.toFixed(2)}h`,
    `Invoices — Invoiced: ${invoicesInvoicedText} | Outstanding: ${outstandingText}`,
    `Payments — Paid to date: ${paymentsPaidText} | Write-offs: ${paymentsWriteOffsText}`,
    `Disbursements — Invoiced: ${disbursementsInvoicedText} | Uninvoiced: ${disbursementsUninvoicedText} | Unpaid supplier: ${disbursementsUnpaidText}`,
    `Trust balance: ${trustBalanceText}`,
    '',
    'Entries:',
    ...entryLines,
    '',
    summary.narrativeSummary,
  ].join('\n');
}

async function dispatchEmail(email: InvoiceEmail): Promise<void> {
  // TODO: integrate with SMTP or transactional email provider.
  // eslint-disable-next-line no-console
  console.log(`Sending invoice summary email to ${email.to}`);
}

export async function sendInvoiceSummary(summary: InvoiceSummary): Promise<InvoiceEmail> {
  if (!summary.clientEmail) {
    throw new Error('Unable to send invoice summary email: client email is missing');
  }

  const email: InvoiceEmail = {
    to: summary.clientEmail,
    subject: `Invoice summary for matter ${summary.matterNumber}`,
    body: buildEmailBody(summary),
  };

  await dispatchEmail(email);
  return email;
}

export async function initializeDelivery() {
  // TODO: configure outbound channels (SMTP, email templates) and cadence guards.
  return Promise.resolve();
}
