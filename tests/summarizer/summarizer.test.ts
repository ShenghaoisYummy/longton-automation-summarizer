import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppConfig, config } from '../../src/shared/config.js';
import {
  __setGeminiModelForTests,
  buildInvoiceSummary,
  enhanceNarrativeWithLlm,
  initializeSummarizer,
} from '../../src/summarizer/summarizer.js';
import { InvoiceContext } from '../../src/shared/types.js';

const mockGenerateContent = vi.fn();

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: mockGenerateContent,
    })),
  })),
}) as unknown as typeof import('@google/generative-ai'));

const mockConfig: AppConfig = {
  actionstep: {
    clientId: 'client-id',
    clientSecret: 'client-secret',
    baseUrl: 'https://example.actionstep.com',
    accessToken: 'token',
  },
  databaseUrl: 'postgres://example',
  llm: {
    apiKey: 'api-key',
    model: 'gemini-1.5-flash',
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

const baseContext: InvoiceContext = {
  actionId: 'A-1',
  matterNumber: 'MAT-001',
  matterName: 'Share Sale Dispute',
  clientName: 'Acme Holdings Pty Ltd',
  clientEmail: 'finance@acme.example',
  currency: 'AUD',
  totals: {
    billed: 1500,
    payments: 500,
    outstanding: 1000,
  },
  timeEntries: [
    {
      id: '1',
      description: 'Draft settlement deed',
      timestamp: '2024-03-01T10:00:00.000Z',
      actualHours: 1,
      billableHours: 1,
      billableAmount: 400,
      isBillable: true,
      owner: 'minbo',
      ownerName: 'Minbo Wang',
      billReference: 'INV-1001',
    },
    {
      id: '2',
      description: 'Client call re: settlement position',
      timestamp: '2024-03-05T02:00:00.000Z',
      actualHours: 0.8,
      billableHours: 0.8,
      billableAmount: 320,
      isBillable: true,
      owner: 'jessica',
      ownerName: 'Jessica Lee',
      billReference: null,
    },
  ],
  disbursements: {
    invoiced: 220,
    uninvoiced: 110,
    unpaidSupplier: 0,
  },
  trust: {
    balance: 85,
  },
  writeOffs: 50,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGenerateContent.mockReset();
  vi.spyOn(config, 'load').mockReturnValue(mockConfig);
  __setGeminiModelForTests(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  __setGeminiModelForTests(null);
});

describe('initializeSummarizer', () => {
  it('resolves without error when configuration is available', async () => {
    await expect(initializeSummarizer()).resolves.toBeUndefined();
  });
});

describe('enhanceNarrativeWithLlm', () => {
  it('returns Gemini generated narrative when available', async () => {
    const summary = buildInvoiceSummary(baseContext);
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'Gemini narrative output',
      },
    });

    const result = await enhanceNarrativeWithLlm(summary);

    expect(result).toBe('Gemini narrative output');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('falls back to the baseline narrative when Gemini is unavailable', async () => {
    vi.spyOn(config, 'load').mockImplementation(() => {
      throw new Error('missing configuration');
    });
    __setGeminiModelForTests(null);
    const summary = buildInvoiceSummary(baseContext);
    const baseline = summary.narrativeSummary;

    const result = await enhanceNarrativeWithLlm(summary);

    expect(result).toBe(baseline);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('falls back when Gemini returns an empty response', async () => {
    const summary = buildInvoiceSummary(baseContext);
    const baseline = summary.narrativeSummary;

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => '',
      },
    });

    const result = await enhanceNarrativeWithLlm(summary);

    expect(result).toBe(baseline);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('falls back when Gemini throws an error', async () => {
    const summary = buildInvoiceSummary(baseContext);
    const baseline = summary.narrativeSummary;

    mockGenerateContent.mockRejectedValue(new Error('network issue'));

    const result = await enhanceNarrativeWithLlm(summary);

    expect(result).toBe(baseline);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });
});
