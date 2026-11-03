import { EventStatus } from "@prisma/client";
import { EventStateError } from "./errors.js";

export function assertEventAcceptsResponses(status: EventStatus): void {
  if (status === EventStatus.CANCELLED) {
    throw new EventStateError("This event has been cancelled.", "EVENT_CANCELLED");
  }
  if (status === EventStatus.RSVP_CLOSED) {
    throw new EventStateError("RSVPs are closed for this event.", "RSVP_CLOSED");
  }
}
