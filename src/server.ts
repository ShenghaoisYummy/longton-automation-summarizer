import express, { Request, Response } from 'express';
import { config } from './shared/config.js';
import { bootstrapActionstepIngestion } from './actionstep/ingestion.js';
import { schedulePipelines, generateInvoiceSummary } from './pipeline/workflow.js';
import { initializeSummarizer } from './summarizer/summarizer.js';
import { initializeDelivery } from './delivery/notifier.js';
import { AppConfig } from './shared/config.js';

interface InvoiceSummaryRequest {
  actionId?: string;
  refresh?: boolean;
}

async function buildServer(appConfig: AppConfig) {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/invoice-summaries', async (req: Request<unknown, unknown, InvoiceSummaryRequest>, res: Response) => {
    const { actionId } = req.body;
    // eslint-disable-next-line no-console
    console.log('[InvoiceSummary] Request received', { actionId });

    if (!actionId) {
      // eslint-disable-next-line no-console
      console.warn('[InvoiceSummary] Missing actionId');
      return res.status(400).json({ message: 'actionId is required' });
    }

    try {
      const result = await generateInvoiceSummary(actionId);
      // eslint-disable-next-line no-console
      console.log('[InvoiceSummary] Success', {
        actionId,
        entries: result.summary.entries.length,
        fees: result.summary.fees,
        totals: result.summary.totals,
      });
      return res.status(200).json(result);
    } catch (error) {
      const status = (error as { status?: number }).status ?? 500;
      // eslint-disable-next-line no-console
      console.error('[InvoiceSummary] Failure', {
        actionId,
        status,
        message: (error as Error).message,
        stack: (error as Error).stack,
      });
      return res.status(status).json({
        message: (error as Error).message,
      });
    }
  });

  await new Promise<void>((resolve, reject) => {
    app
      .listen(appConfig.port, '0.0.0.0', () => {
        // eslint-disable-next-line no-console
        console.log(`Server listening on port ${appConfig.port}`);
        resolve();
      })
      .on('error', reject);
  });
}

async function main() {
  const appConfig = config.load();

  await initializeSummarizer();
  await initializeDelivery();
  await bootstrapActionstepIngestion();
  await schedulePipelines();

  await buildServer(appConfig);

  // eslint-disable-next-line no-console
  console.log('Automation summarizer bootstrapped.');
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error', error);
  process.exitCode = 1;
});
