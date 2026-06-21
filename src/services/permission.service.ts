import type { Event } from "@prisma/client";
import { PermissionError } from "../utils/errors.js";

export class PermissionService {
  assertOrganizer(
    event: Pick<Event, "organizerSlackUserId">,
    slackUserId: string,
  ): void {
    if (event.organizerSlackUserId !== slackUserId) {
      throw new PermissionError();
    }
  }
}
