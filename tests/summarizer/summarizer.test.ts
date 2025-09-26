import { describe, it, expect } from 'vitest';
import { initializeSummarizer } from '../../src/summarizer/summarizer.js';

describe('initializeSummarizer', () => {
  it('resolves without error', async () => {
    await expect(initializeSummarizer()).resolves.toBeUndefined();
  });
});
