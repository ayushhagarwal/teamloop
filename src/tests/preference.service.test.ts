import { EventStatus, type PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { PreferenceService } from "../services/preference.service.js";
import { FIELD_LIMITS } from "../utils/limits.js";

function database(status: EventStatus) {
  return {
    event: { findUnique: vi.fn().mockResolvedValue({ id: "event_1", status }) },
    preference: { upsert: vi.fn().mockResolvedValue({ id: "pref_1" }) },
  } as unknown as PrismaClient;
}

describe("PreferenceService.upsert", () => {
  it("saves a preference while the event is open", async () => {
    const db = database(EventStatus.OPEN);
    await new PreferenceService(db).upsert("event_1", "U1", "primary", "Veg");
    expect(db.preference.upsert).toHaveBeenCalledOnce();
  });

  it.each([
    [EventStatus.RSVP_CLOSED, "RSVPs are closed"],
    [EventStatus.CANCELLED, "cancelled"],
  ])("rejects preferences when the event is %s", async (status, message) => {
    const db = database(status);
    await expect(
      new PreferenceService(db).upsert("event_1", "U1", "primary", "Veg"),
    ).rejects.toThrow(message);
    expect(db.preference.upsert).not.toHaveBeenCalled();
  });

  it("rejects a marathon pace note past the modal limit", async () => {
    const db = database(EventStatus.OPEN);
    await expect(
      new PreferenceService(db).upsert(
        "event_1",
        "U1",
        "targetPace",
        "p".repeat(FIELD_LIMITS.marathonPaceNote + 1),
      ),
    ).rejects.toThrow("Pace note");
    expect(db.preference.upsert).not.toHaveBeenCalled();
  });
});
