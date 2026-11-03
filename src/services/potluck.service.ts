import { RsvpStatus, type PotluckItem, type PrismaClient } from "@prisma/client";
import { assertEventAcceptsResponses } from "../utils/event-state.js";
import { NotFoundError } from "../utils/errors.js";
import { assertMaxLength, FIELD_LIMITS } from "../utils/limits.js";

export interface PotluckItemInput {
  category: string;
  itemName: string;
  servesCount?: number;
  dietaryType?: string;
  notes?: string;
}

export class PotluckService {
  constructor(private readonly db: PrismaClient) {}

  async addItem(
    eventId: string,
    slackUserId: string,
    input: PotluckItemInput,
  ): Promise<PotluckItem> {
    const event = await this.db.event.findUnique({
      where: { id: eventId },
      select: { id: true, type: true, status: true },
    });
    if (!event) throw new NotFoundError();
    if (event.type !== "POTLUCK") throw new Error("Not a potluck event");
    assertEventAcceptsResponses(event.status);

    const itemName = input.itemName.trim();
    if (!itemName) throw new Error("Enter a dish or item name.");
    assertMaxLength(itemName, FIELD_LIMITS.potluckItemName, "Item name");
    const notes = input.notes?.trim();
    if (notes) assertMaxLength(notes, FIELD_LIMITS.potluckItemNotes, "Notes");

    return this.db.$transaction(async (tx) => {
      const item = await tx.potluckItem.create({
        data: {
          eventId,
          claimedBySlackUserId: slackUserId,
          category: input.category,
          itemName,
          ...(input.servesCount ? { servesCount: input.servesCount } : {}),
          ...(input.dietaryType ? { dietaryType: input.dietaryType } : {}),
          ...(notes ? { notes } : {}),
        },
      });
      await tx.rSVP.upsert({
        where: { eventId_slackUserId: { eventId, slackUserId } },
        update: {},
        create: { eventId, slackUserId, status: RsvpStatus.GOING },
      });
      return item;
    });
  }
}
