import type { PrismaClient, Preference } from "@prisma/client";
import { NotFoundError } from "../utils/errors.js";

export class PreferenceService {
  constructor(private readonly db: PrismaClient) {}

  async upsert(
    eventId: string,
    slackUserId: string,
    key: string,
    value: string,
  ): Promise<Preference> {
    const event = await this.db.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) throw new NotFoundError();

    return this.db.preference.upsert({
      where: {
        eventId_slackUserId_key: { eventId, slackUserId, key },
      },
      update: { value },
      create: { eventId, slackUserId, key, value },
    });
  }
}
