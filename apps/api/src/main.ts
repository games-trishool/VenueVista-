import { createApp } from './bootstrap';

createApp()
  .then((app) => app.listen(Number(process.env.PORT ?? 4000), process.env.HOST ?? '0.0.0.0'))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Startup failed');
    process.exitCode = 1;
  });
