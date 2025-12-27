/**
 * Running Days API Server
 *
 * Entry point for the Fastify backend API
 */

import { buildApp } from './app.js';
import { config } from './config.js';
import { processRetryQueue } from './services/webhook-sender.js';

async function main(): Promise<void> {
  const app = await buildApp();

  // Graceful shutdown handlers
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}, shutting down gracefully`);

      try {
        await app.close();
        process.exit(0);
      } catch (err) {
        app.log.error(err, 'Error during shutdown');
        process.exit(1);
      }
    });
  }

  // Start webhook retry processor
  let retryIntervalId: ReturnType<typeof setInterval> | null = null;

  try {
    // Start the server
    await app.listen({
      host: config.host,
      port: config.port
    });

    app.log.info(`Server listening on http://${config.host}:${config.port}`);

    // Start background webhook retry processor (every 30 seconds)
    retryIntervalId = setInterval(async () => {
      try {
        const result = await processRetryQueue(
          app.db,
          (level, msg, obj) => app.log[level as 'info' | 'warn' | 'error'](obj, msg)
        );

        if (result.processed > 0) {
          app.log.info(result, 'Processed webhook retry queue');
        }
      } catch (err) {
        app.log.error(err, 'Error processing webhook retry queue');
      }
    }, 30_000);

  } catch (err) {
    app.log.error(err, 'Failed to start server');

    if (retryIntervalId) {
      clearInterval(retryIntervalId);
    }

    process.exit(1);
  }
}

main();
