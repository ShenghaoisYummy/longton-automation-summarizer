import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrapActionstepIngestion, fetchInvoiceContext } from '../../src/actionstep/ingestion.js';
import { AppConfig, config } from '../../src/shared/config.js';

const mockConfig: AppConfig = {
  actionstep: {
    clientId: 'client-id',
    clientSecret: 'client-secret',
    baseUrl: 'https://example.actionstep.com',
    accessToken: 'token',
  },
  databaseUrl: 'postgres://example',
  llm: {
    apiKey: 'key',
    model: 'model',
  },
  port: 3000,
  delivery: {
    emailSender: 'no-reply@example.com',
    teamsWebhookUrl: undefined,
  },
  cadence: {
    daily: undefined,
    weekly: undefined,
    monthly: undefined,
  },
};

const actionResponse = {
  action: {
    id: 64150,
    number: 'M-64150',
    name: 'Sample Demand Letter',
    currency: 'AUD',
    links: {
      primaryClient: ['52278'],
    },
  },
  linked: {
    participants: [
      {
        id: 52278,
        displayName: 'Acme Holdings Pty Ltd',
        email: 'finance@acme.example',
      },
    ],
  },
};

const timeEntriesResponse = {
  timeentries: [
    {
      id: 317710,
      description: 'Drafting authority to release and forward to client',
      timestampDate: '2024-11-25T00:00:00+11:00',
      actualHours: '0.50',
      billableHours: '0.00',
      billableAmount: '200.00',
      isBillable: 'F',
      billReference: null,
      links: {
        owner: '16',
        action: '64150',
      },
    },
    {
      id: 321981,
      description: 'Telephone conference with you and MW',
      timestampDate: '2024-12-13T00:00:00+11:00',
      actualHours: '0.80',
      billableHours: '0.80',
      billableAmount: '320.00',
      isBillable: 'T',
      billReference: '10576',
      links: {
        owner: '16',
        action: '64150',
      },
    },
  ],
  linked: {
    participants: [
      {
        id: 16,
        displayName: 'Minbo Wang',
        email: 'minbo@example.com',
      },
    ],
  },
  meta: {
    paging: {
      timeentries: {
        page: 1,
        nextPage: null,
      },
    },
  },
};

const billsResponse = {
  bills: [
    {
      id: 54910,
      status: 'Closed',
      currency: 'AUD',
      totalInclusive: '520.00',
      totalPaid: '200.00',
      totalDue: '320.00',
    },
    {
      id: 60000,
      status: 'Draft',
      currency: 'AUD',
      totalInclusive: '999.00',
      totalPaid: '0.00',
      totalDue: '999.00',
    },
  ],
};

function jsonResponse(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  });
}

describe('bootstrapActionstepIngestion', () => {
  it('resolves without error', async () => {
    await expect(bootstrapActionstepIngestion()).resolves.toBeUndefined();
  });
});

describe('fetchInvoiceContext', () => {
  beforeEach(() => {
    vi.spyOn(config, 'load').mockReturnValue(mockConfig);

    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const url = input instanceof URL ? input.toString() : String(input);

      if (url.includes('/api/rest/actions/')) {
        return Promise.resolve(jsonResponse(actionResponse));
      }

      if (url.includes('/api/rest/timeentries')) {
        return Promise.resolve(jsonResponse(timeEntriesResponse));
      }

      if (url.includes('/api/rest/bills')) {
        return Promise.resolve(jsonResponse(billsResponse));
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('maps Actionstep responses into invoice context', async () => {
    const context = await fetchInvoiceContext('64150');

    expect(context.matterNumber).toBe('M-64150');
    expect(context.clientName).toBe('Acme Holdings Pty Ltd');
    expect(context.clientEmail).toBe('finance@acme.example');
    expect(context.currency).toBe('AUD');
    expect(context.totals).toEqual({ billed: 520, payments: 200, outstanding: 320 });
    expect(context.timeEntries).toHaveLength(2);
    expect(context.timeEntries[0].ownerName).toBe('Minbo Wang');
  });

  it('throws when the Actionstep API responds with an error', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
      Promise.resolve(new Response('Not found', { status: 404, statusText: 'Not Found' }))
    );

    await expect(fetchInvoiceContext('missing')).rejects.toThrow(/failed: 404 Not Found/);
  });
});

describe('bootstrapActionstepIngestion', () => {
  it('resolves without error', async () => {
    await expect(bootstrapActionstepIngestion()).resolves.toBeUndefined();
  });
});
