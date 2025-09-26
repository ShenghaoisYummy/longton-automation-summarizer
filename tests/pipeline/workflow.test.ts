import { describe, it, expect } from 'vitest';
import { schedulePipelines } from '../../src/pipeline/workflow.js';

describe('schedulePipelines', () => {
  it('resolves without error', async () => {
    await expect(schedulePipelines()).resolves.toBeUndefined();
  });
});
