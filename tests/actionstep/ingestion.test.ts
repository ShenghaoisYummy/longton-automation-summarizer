import { describe, it, expect } from 'vitest';
import { bootstrapActionstepIngestion } from '../../src/actionstep/ingestion.js';

describe('bootstrapActionstepIngestion', () => {
  it('resolves without error', async () => {
    await expect(bootstrapActionstepIngestion()).resolves.toBeUndefined();
  });
});
