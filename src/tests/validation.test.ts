import { describe, expect, it, vi } from "vitest";
import { eventInputSchema } from "../utils/validation.js";

describe("event validation", () => {
  it("accepts a future event with an earlier RSVP deadline", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00.000Z"));
    const result = eventInputSchema.safeParse({
      title: "Team Lunch",
      date: "2030-01-02",
      time: "12:00",
      location: "Cafe",
      rsvpDeadlineDate: "2030-01-02",
      rsvpDeadlineTime: "10:00",
    });
    expect(result.success).toBe(true);
    vi.useRealTimers();
  });

  it("rejects a past event", () => {
    const result = eventInputSchema.safeParse({
      title: "Team Lunch",
      date: "2020-01-02",
      time: "12:00",
      location: "Cafe",
      rsvpDeadlineDate: "2020-01-02",
      rsvpDeadlineTime: "10:00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an RSVP deadline after the event", () => {
    const result = eventInputSchema.safeParse({
      title: "Team Lunch",
      date: "2035-01-02",
      time: "12:00",
      location: "Cafe",
      rsvpDeadlineDate: "2035-01-02",
      rsvpDeadlineTime: "13:00",
    });
    expect(result.success).toBe(false);
  });
});
