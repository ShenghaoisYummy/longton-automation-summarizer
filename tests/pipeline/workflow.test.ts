import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InvoiceContext, InvoiceSummary } from '../../src/shared/types.js';

vi.mock('../../src/actionstep/ingestion.js', () => ({
  fetchInvoiceContext: vi.fn(),
  bootstrapActionstepIngestion: vi.fn(),
})) as unknown as typeof import('../../src/actionstep/ingestion.js');

vi.mock('../../src/summarizer/summarizer.js', () => ({
  buildInvoiceSummary: vi.fn(),
  enhanceNarrativeWithLlm: vi.fn(),
})) as unknown as typeof import('../../src/summarizer/summarizer.js');

import { fetchInvoiceContext } from '../../src/actionstep/ingestion.js';
import { buildInvoiceSummary, enhanceNarrativeWithLlm } from '../../src/summarizer/summarizer.js';
import { generateInvoiceSummary, schedulePipelines } from '../../src/pipeline/workflow.js';

afterEach(() => {
  vi.clearAllMocks();
});

describe('schedulePipelines', () => {
  it('resolves without error', async () => {
    await expect(schedulePipelines()).resolves.toBeUndefined();
  });
});

describe('generateInvoiceSummary', () => {
  it('enriches the narrative with Gemini and disables email delivery', async () => {
    const mockedFetch = vi.mocked(fetchInvoiceContext);
    const mockedBuild = vi.mocked(buildInvoiceSummary);
    const mockedEnhance = vi.mocked(enhanceNarrativeWithLlm);

    const context = { actionId: 'ACTION-123' } as InvoiceContext;
    const summary = {
      actionId: 'ACTION-123',
      narrativeSummary: 'baseline narrative',
    } as unknown as InvoiceSummary;

    mockedFetch.mockResolvedValue(context);
    mockedBuild.mockReturnValue(summary);
    mockedEnhance.mockResolvedValue('enhanced narrative');

    const result = await generateInvoiceSummary('ACTION-123');

    expect(mockedFetch).toHaveBeenCalledWith('ACTION-123');
    expect(mockedBuild).toHaveBeenCalledWith(context);
    expect(mockedEnhance).toHaveBeenCalledWith(summary);
    expect(summary.narrativeSummary).toBe('enhanced narrative');
    expect(result).toEqual({ summary, email: null });
  });
});
