import { EventStatus, RsvpStatus, type PrismaClient, type RSVP } from "@prisma/client";
import { EventStateError, NotFoundError } from "../utils/errors.js";

export interface RsvpCounts {
  going: number;
  maybe: number;
  cannotMakeIt: number;
}

export class RsvpService {
  constructor(private readonly db: PrismaClient) {}

  async upsert(
    eventId: string,
    slackUserId: string,
    status: RsvpStatus,
  ): Promise<RSVP> {
    const event = await this.db.event.findUnique({
      where: { id: eventId },
      select: { status: true },
    });
    if (!event) throw new NotFoundError();
    if (event.status === EventStatus.CANCELLED) {
      throw new EventStateError("This event has been cancelled.", "EVENT_CANCELLED");
    }
    if (event.status === EventStatus.RSVP_CLOSED) {
      throw new EventStateError("RSVPs are closed for this event.", "RSVP_CLOSED");
    }

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
