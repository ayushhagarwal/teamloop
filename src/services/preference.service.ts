import type { PrismaClient, Preference } from "@prisma/client";
import { assertEventAcceptsResponses } from "../utils/event-state.js";
import { NotFoundError } from "../utils/errors.js";
import { assertMaxLength, FIELD_LIMITS } from "../utils/limits.js";

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
      select: { id: true, status: true },
    });
    if (!event) throw new NotFoundError();
    assertEventAcceptsResponses(event.status);

    const stored = key === "targetPace" ? value.trim() : value;
    if (key === "targetPace") {
      assertMaxLength(stored, FIELD_LIMITS.marathonPaceNote, "Pace note");
    }

    return this.db.preference.upsert({
      where: {
        eventId_slackUserId_key: { eventId, slackUserId, key },
      },
      update: { value: stored },
      create: { eventId, slackUserId, key, value: stored },
    });
  }
}
