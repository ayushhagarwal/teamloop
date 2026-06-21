import { createTeamLoopApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { prisma } from "./db/prisma.js";

const env = loadEnv();
const runtime = createTeamLoopApp(env);
const reminderJob = runtime.startJobs();

await runtime.app.start(env.PORT);
runtime.logger.info("TeamLoop is running", {
  port: env.PORT,
  oauth: Boolean(env.SLACK_CLIENT_ID),
});

async function shutdown(signal: string): Promise<void> {
  runtime.logger.info("Shutting down TeamLoop", { signal });
  await reminderJob.stop();
  await runtime.receiver.stop();
  await prisma.$disconnect();
}

process.once("SIGINT", () => {
  void shutdown("SIGINT").catch(console.error);
});
process.once("SIGTERM", () => {
  void shutdown("SIGTERM").catch(console.error);
});
