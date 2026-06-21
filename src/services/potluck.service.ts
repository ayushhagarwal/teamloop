import { RsvpStatus, type PotluckItem, type PrismaClient } from "@prisma/client";
import { NotFoundError } from "../utils/errors.js";

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
      select: { id: true, type: true },
    });
    if (!event) throw new NotFoundError();
    if (event.type !== "POTLUCK") throw new Error("Not a potluck event");

    return this.db.$transaction(async (tx) => {
      const item = await tx.potluckItem.create({
        data: {
          eventId,
          claimedBySlackUserId: slackUserId,
          category: input.category,
          itemName: input.itemName,
          ...(input.servesCount ? { servesCount: input.servesCount } : {}),
          ...(input.dietaryType ? { dietaryType: input.dietaryType } : {}),
          ...(input.notes ? { notes: input.notes } : {}),
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
