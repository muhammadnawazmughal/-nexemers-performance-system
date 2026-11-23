import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { createApp } from './app.js';

try {
  await connectDatabase();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Nexemers API listening on http://localhost:${env.port}`);
  });
} catch (error) {
  console.error(`Server startup failed: ${error.message}`);
  process.exit(1);
}
