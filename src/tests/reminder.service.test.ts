import { ReminderStatus, ReminderType, type PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { ReminderService } from "../services/reminder.service.js";

function database() {
  return {
    reminder: {
      upsert: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({ id: "manual_1" }),
      findMany: vi.fn().mockResolvedValue([{ id: "due_1" }]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaClient;
}

describe("ReminderService", () => {
  it("creates default reminders idempotently", async () => {
    const db = database();
    await new ReminderService(db).createDefaults({
      eventId: "event_1",
      eventStartsAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      rsvpDeadlineAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      eventReminderMinutes: 60,
    });
    expect(db.reminder.upsert).toHaveBeenCalledTimes(2);
  });

  it("fetches and atomically claims due reminders", async () => {
    const db = database();
    const service = new ReminderService(db);
    await expect(service.due()).resolves.toEqual([{ id: "due_1" }]);
    await expect(service.claim("due_1")).resolves.toBe(true);
    expect(db.reminder.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "due_1", status: ReminderStatus.PENDING },
      }),
    );
  });

  it("marks reminders sent or failed", async () => {
    const db = database();
    const service = new ReminderService(db);
    await service.markSent("due_1");
    await service.markFailed("due_2", new Error("boom"));
    expect(db.reminder.update).toHaveBeenCalledTimes(2);
  });

  it("creates a manual reminder", async () => {
    const db = database();
    await new ReminderService(db).createManual("event_1");
    expect(db.reminder.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: ReminderType.MANUAL }),
    });
  });
});
