import { EventStatus, RsvpStatus, type PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { RsvpService } from "../services/rsvp.service.js";

function database(status: EventStatus, slackTeamId = "T1") {
  return {
    event: {
      findUnique: vi.fn().mockResolvedValue({
        status,
        workspace: { slackTeamId },
      }),
    },
    rSVP: {
      upsert: vi.fn().mockResolvedValue({ id: "rsvp_1" }),
      groupBy: vi.fn().mockResolvedValue([
        { status: RsvpStatus.GOING, _count: { _all: 2 } },
        { status: RsvpStatus.MAYBE, _count: { _all: 1 } },
      ]),
    },
  } as unknown as PrismaClient;
}

describe("RsvpService", () => {
  it("creates or updates one RSVP per user", async () => {
    const db = database(EventStatus.OPEN);
    const service = new RsvpService(db);
    await service.upsert("event_1", "T1", "U1", RsvpStatus.GOING);
    expect(db.rSVP.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventId_slackUserId: { eventId: "event_1", slackUserId: "U1" } },
      }),
    );
  });

  it.each([
    [EventStatus.RSVP_CLOSED, "RSVPs are closed"],
    [EventStatus.CANCELLED, "cancelled"],
  ])("prevents RSVP when event is %s", async (status, message) => {
    await expect(
      new RsvpService(database(status)).upsert("event_1", "T1", "U1", RsvpStatus.GOING),
    ).rejects.toThrow(message);
  });

  it("rejects an RSVP when the event workspace does not match", async () => {
    const db = database(EventStatus.OPEN, "T_OTHER");
    await expect(
      new RsvpService(db).upsert("event_1", "T1", "U1", RsvpStatus.GOING),
    ).rejects.toThrow("no longer exists");
    expect(db.rSVP.upsert).not.toHaveBeenCalled();
  });

  it("counts RSVP statuses", async () => {
    await expect(
      new RsvpService(database(EventStatus.OPEN)).counts("event_1"),
    ).resolves.toEqual({
      going: 2,
      maybe: 1,
      cannotMakeIt: 0,
    });
  });
});
