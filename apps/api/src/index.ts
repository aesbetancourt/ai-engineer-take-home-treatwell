import { buildApp } from './app';
import { seed } from './db/seed';
import { startReminderJob } from './jobs/reminders';

async function main() {
  if (process.env.SEED_ON_BOOT !== 'false') {
    seed();
  }
  const app = await buildApp();
  const port = Number(process.env.PORT ?? 4000);
  await app.listen({ port, host: '0.0.0.0' });
  console.log('API listening on ' + port);
  const stopReminderJob = startReminderJob();

  // The platform sends SIGTERM before it stops a pod. Take no new request, and let each open request and a
  // reminder that is in progress finish. The process then exits by itself, with code 0.
  process.once('SIGTERM', () => {
    stopReminderJob();
    app.close().catch((e) => {
      console.log('shutdown failed', e);
      process.exit(1);
    });
  });
}

main();
