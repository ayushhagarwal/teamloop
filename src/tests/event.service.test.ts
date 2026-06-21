import { EventStatus, EventType, type PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { EventService } from "../services/event.service.js";
import { eventFixture } from "./fixtures.js";

function database() {
  const tx = {
    workspace: {
      upsert: vi.fn().mockResolvedValue({ id: "workspace_1" }),
    },
    channel: {
      upsert: vi.fn().mockResolvedValue({ id: "channel_1" }),
    },
    event: {
      create: vi.fn().mockResolvedValue({ id: "event_1" }),
      update: vi.fn().mockResolvedValue({}),
      findUniqueOrThrow: vi.fn().mockResolvedValue(eventFixture()),
    },
    potluckItem: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    reminder: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
  };
  const db = {
    ...tx,
    event: {
      ...tx.event,
      findUnique: vi.fn().mockResolvedValue(eventFixture()),
    },
    $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  } as unknown as PrismaClient;
  return { db, tx };
}

describe("EventService", () => {
  it("creates an event and audit record", async () => {
    const { db, tx } = database();
    const event = await new EventService(db).create({
      slackTeamId: "T1",
      slackChannelId: "C1",
      organizerSlackUserId: "U_ORGANIZER",
      type: EventType.LUNCH,
      title: "Lunch",
      location: "Cafe",
      eventStartsAt: new Date("2030-01-01T12:00:00Z"),
    });
    expect(event.id).toBe("event_1");
    expect(tx.event.create).toHaveBeenCalledOnce();
    expect(tx.auditLog.create).toHaveBeenCalledOnce();
  });

  it("updates an organizer-owned event", async () => {
    const { db, tx } = database();
    await new EventService(db).update("event_1", "U_ORGANIZER", {
      title: "Updated lunch",
    });
    expect(tx.event.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "Updated lunch" }),
      }),
    );
  });

  it("rejects invalid organizer actions", async () => {
    const { db } = database();
    await expect(
      new EventService(db).cancel("event_1", "U_SOMEONE_ELSE"),
    ).rejects.toThrow("Only the organizer");
  });

  it("closes RSVP and cancels events without deleting them", async () => {
    const { db, tx } = database();
    const service = new EventService(db);
    await service.closeRsvp("event_1", "U_ORGANIZER");
    expect(tx.event.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: EventStatus.RSVP_CLOSED }),
      }),
    );
    await service.cancel("event_1", "U_ORGANIZER");
    expect(tx.reminder.updateMany).toHaveBeenCalledOnce();
  });
});
