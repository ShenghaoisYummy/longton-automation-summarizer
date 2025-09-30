import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildInvoiceSummary } from '../../src/summarizer/summarizer.js';
import { initializeDelivery, sendInvoiceSummary } from '../../src/delivery/notifier.js';
import { InvoiceContext } from '../../src/shared/types.js';

describe('initializeDelivery', () => {
  it('resolves without error', async () => {
    await expect(initializeDelivery()).resolves.toBeUndefined();
  });
});

describe('sendInvoiceSummary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const sampleContext: InvoiceContext = {
    actionId: '64150',
    matterNumber: 'M-64150',
    matterName: 'Sample Demand Letter',
    clientName: 'Acme Holdings Pty Ltd',
    clientEmail: 'finance@acme.example',
    currency: 'AUD',
    totals: {
      billed: 520,
      payments: 200,
      outstanding: 320,
    },
    disbursements: {
      invoiced: 1048,
      uninvoiced: 0,
      unpaidSupplier: 0,
    },
    trust: {
      balance: 5804,
    },
    writeOffs: 0,
    timeEntries: [
      {
        id: '317710',
        description: 'Drafting authority to release and forward to client',
        timestamp: '2024-11-25T00:00:00+11:00',
        actualHours: 0.5,
        billableHours: 0,
        billableAmount: 200,
        isBillable: false,
        owner: '16',
        ownerName: 'Minbo Wang',
        billReference: null,
      },
      {
        id: '321981',
        description: 'Telephone conference with you and MW',
        timestamp: '2024-12-13T00:00:00+11:00',
        actualHours: 0.8,
        billableHours: 0.8,
        billableAmount: 320,
        isBillable: true,
        owner: '16',
        ownerName: 'Minbo Wang',
        billReference: '10576',
      },
    ],
  };

  it('composes an email payload and dispatches it', async () => {
    const summary = buildInvoiceSummary(sampleContext);

    const email = await sendInvoiceSummary(summary);

    expect(email.to).toBe(sampleContext.clientEmail);
    expect(email.subject).toContain(summary.matterNumber);
    expect(email.body).toContain('Billable total');
    expect(email.body).toContain('Fees (invoiced)');
    expect(email.body).toContain('Fees (uninvoiced)');
    expect(email.body).toContain('Disbursements — Invoiced');
    expect(email.body).toContain('Trust balance');
  });

  it('throws if client email is missing', async () => {
    const summary = buildInvoiceSummary({ ...sampleContext, clientEmail: undefined });

    await expect(sendInvoiceSummary({ ...summary, clientEmail: undefined })).rejects.toThrow(
      /client email is missing/
    );
  });
});
