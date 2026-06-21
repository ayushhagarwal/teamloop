import { prisma } from "../src/db/prisma.js";

async function main(): Promise<void> {
  await prisma.workspace.upsert({
    where: { slackTeamId: "T_TEAMLOOP_DEMO" },
    update: {},
    create: {
      slackTeamId: "T_TEAMLOOP_DEMO",
      name: "TeamLoop Demo",
    },
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
