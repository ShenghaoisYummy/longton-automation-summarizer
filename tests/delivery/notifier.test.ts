import { describe, it, expect } from 'vitest';
import { initializeDelivery } from '../../src/delivery/notifier.js';

describe('initializeDelivery', () => {
  it('resolves without error', async () => {
    await expect(initializeDelivery()).resolves.toBeUndefined();
  });
});
