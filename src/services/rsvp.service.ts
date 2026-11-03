import { RsvpStatus, type PrismaClient, type RSVP } from "@prisma/client";
import { assertEventAcceptsResponses } from "../utils/event-state.js";
import { NotFoundError } from "../utils/errors.js";

export interface RsvpCounts {
  going: number;
  maybe: number;
  cannotMakeIt: number;
}

export class RsvpService {
  constructor(private readonly db: PrismaClient) {}

  async upsert(
    eventId: string,
    slackTeamId: string,
    slackUserId: string,
    status: RsvpStatus,
  ): Promise<RSVP> {
    const event = await this.db.event.findUnique({
      where: { id: eventId },
      select: { status: true, workspace: { select: { slackTeamId: true } } },
    });
    if (!event || event.workspace.slackTeamId !== slackTeamId)
      throw new NotFoundError();
    assertEventAcceptsResponses(event.status);

    return this.db.rSVP.upsert({
      where: { eventId_slackUserId: { eventId, slackUserId } },
      update: { status },
      create: { eventId, slackUserId, status },
    });
  }

  async counts(eventId: string): Promise<RsvpCounts> {
    const rows = await this.db.rSVP.groupBy({
      by: ["status"],
      where: { eventId },
      _count: { _all: true },
    });
    const counts: RsvpCounts = { going: 0, maybe: 0, cannotMakeIt: 0 };
    for (const row of rows) {
      if (row.status === RsvpStatus.GOING) counts.going = row._count._all;
      if (row.status === RsvpStatus.MAYBE) counts.maybe = row._count._all;
      if (row.status === RsvpStatus.CANNOT_MAKE_IT) {
        counts.cannotMakeIt = row._count._all;
      }
    }
    return counts;
  }
}
