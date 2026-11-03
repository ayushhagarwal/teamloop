import { EventStatus, RsvpStatus, type PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { PotluckService } from "../services/potluck.service.js";
import { FIELD_LIMITS } from "../utils/limits.js";

function database(status: EventStatus) {
  const tx = {
    potluckItem: { create: vi.fn().mockResolvedValue({ id: "item_1" }) },
    rSVP: { upsert: vi.fn().mockResolvedValue({ id: "rsvp_1" }) },
  };
  const db = {
    event: {
      findUnique: vi.fn().mockResolvedValue({ id: "event_1", type: "POTLUCK", status }),
    },
    $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  return { db: db as unknown as PrismaClient, tx };
}

describe("PotluckService.addItem", () => {
  it("claims an item and marks the person going while RSVP is open", async () => {
    const { db, tx } = database(EventStatus.OPEN);
    await new PotluckService(db).addItem("event_1", "U1", {
      category: "Dessert",
      itemName: "Brownies",
    });
    expect(tx.rSVP.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { eventId: "event_1", slackUserId: "U1", status: RsvpStatus.GOING },
      }),
    );
  });

  it.each([
    [EventStatus.RSVP_CLOSED, "RSVPs are closed"],
    [EventStatus.CANCELLED, "cancelled"],
  ])("does not create a going RSVP when the event is %s", async (status, message) => {
    const { db, tx } = database(status);
    await expect(
      new PotluckService(db).addItem("event_1", "U1", {
        category: "Dessert",
        itemName: "Brownies",
      }),
    ).rejects.toThrow(message);
    expect(tx.rSVP.upsert).not.toHaveBeenCalled();
    expect(tx.potluckItem.create).not.toHaveBeenCalled();
  });

  it("rejects an item name or note past the modal limit", async () => {
    const { db, tx } = database(EventStatus.OPEN);
    const service = new PotluckService(db);
    await expect(
      service.addItem("event_1", "U1", {
        category: "Dessert",
        itemName: "x".repeat(FIELD_LIMITS.potluckItemName + 1),
      }),
    ).rejects.toThrow("Item name");
    await expect(
      service.addItem("event_1", "U1", {
        category: "Dessert",
        itemName: "Brownies",
        notes: "n".repeat(FIELD_LIMITS.potluckItemNotes + 1),
      }),
    ).rejects.toThrow("Notes");
    expect(tx.rSVP.upsert).not.toHaveBeenCalled();
  });
});
