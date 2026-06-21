import { EventStatus, EventType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { renderEventCard } from "../blocks/event-card.blocks.js";
import { eventFixture } from "./fixtures.js";

const text = (blocks: ReturnType<typeof renderEventCard>) => JSON.stringify(blocks);

describe("event card blocks", () => {
  it("renders a lunch card", () => {
    expect(text(renderEventCard(eventFixture()))).toContain("Lunch details");
    expect(text(renderEventCard(eventFixture()))).toContain("$15");
  });

  it("renders a potluck card with claimed and needed items", () => {
    const event = eventFixture({
      type: EventType.POTLUCK,
      metadata: { neededCategories: ["Main dish", "Dessert"] },
      potluckItems: [
        {
          id: "item_1",
          eventId: "event_1",
          category: "Dessert",
          itemName: "Brownies",
          claimedBySlackUserId: "U1",
          servesCount: 8,
          dietaryType: "Veg",
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    const output = text(renderEventCard(event));
    expect(output).toContain("Brownies");
    expect(output).toContain("Main dish");
  });

  it("renders a weekend run card", () => {
    const output = text(
      renderEventCard(
        eventFixture({
          type: EventType.WEEKEND_RUN,
          metadata: {
            distance: "10K",
            pace: "Easy",
            beginnerFriendly: true,
          },
        }),
      ),
    );
    expect(output).toContain("10K");
    expect(output).toContain("Beginner-friendly");
  });

  it("renders cancelled and closed states", () => {
    expect(
      text(renderEventCard(eventFixture({ status: EventStatus.CANCELLED }))),
    ).toContain("cancelled");
    expect(
      text(renderEventCard(eventFixture({ status: EventStatus.RSVP_CLOSED }))),
    ).toContain("RSVPs are closed");
  });
});
