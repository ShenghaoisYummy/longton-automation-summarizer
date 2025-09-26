import { config } from './shared/config.js';
import { bootstrapActionstepIngestion } from './actionstep/ingestion.js';
import { schedulePipelines } from './pipeline/workflow.js';
import { initializeSummarizer } from './summarizer/summarizer.js';
import { initializeDelivery } from './delivery/notifier.js';

async function main() {
  config.load();

  await initializeSummarizer();
  await initializeDelivery();
  await bootstrapActionstepIngestion();
  await schedulePipelines();

  // eslint-disable-next-line no-console
  console.log('Automation summarizer bootstrapped.');
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error', error);
  process.exitCode = 1;
});
