import { EventType } from "@prisma/client";
import type { ModalView } from "@slack/types";
import { describe, expect, it } from "vitest";
import { renderEventCard } from "../blocks/event-card.blocks.js";
import { activityFieldErrors } from "../interactions/event-submissions.js";
import { renderSummary } from "../blocks/summary.blocks.js";
import { buildMarathonModal } from "../modals/marathon.modal.js";
import { buildPotluckItemModal } from "../modals/potluck-item.modal.js";
import { buildPreferenceModal } from "../modals/preference.modal.js";
import { buildWeekendRunModal } from "../modals/weekendrun.modal.js";
import { FIELD_LIMITS, limitedActivityFieldErrors } from "../utils/limits.js";
import { eventFixture } from "./fixtures.js";

const metadata = {
  channelId: "C1",
  userId: "U1",
  teamId: "T1",
  eventType: "WEEKEND_RUN",
};

function maxLength(view: ModalView, blockId: string): number | undefined {
  const block = view.blocks.find(
    (entry) => "block_id" in entry && entry.block_id === blockId,
  );
  if (!block || !("element" in block)) return undefined;
  const element = block.element as { max_length?: number };
  return element.max_length;
}

describe("modal and render limits", () => {
  it("caps the previously uncapped modal text inputs", () => {
    expect(maxLength(buildWeekendRunModal(metadata), "routeLink")).toBe(
      FIELD_LIMITS.routeLink,
    );
    expect(maxLength(buildWeekendRunModal(metadata), "customDistance")).toBe(
      FIELD_LIMITS.customDistance,
    );
    expect(
      maxLength(
        buildMarathonModal({ ...metadata, eventType: "MARATHON" }),
        "customDistance",
      ),
    ).toBe(FIELD_LIMITS.customDistance);
    const potluck = buildPotluckItemModal(eventFixture({ type: EventType.POTLUCK }));
    expect(maxLength(potluck, "itemName")).toBe(FIELD_LIMITS.potluckItemName);
    expect(maxLength(potluck, "itemNotes")).toBe(FIELD_LIMITS.potluckItemNotes);
    const preference = buildPreferenceModal(eventFixture({ type: EventType.MARATHON }));
    expect(maxLength(preference, "targetPaceNote")).toBe(FIELD_LIMITS.marathonPaceNote);
  });

  it("rejects route links and custom distances before they are stored", () => {
    const raw = {
      routeLink: "r".repeat(FIELD_LIMITS.routeLink + 1),
      customDistance: "d".repeat(FIELD_LIMITS.customDistance + 1),
    };
    expect(limitedActivityFieldErrors(raw)).toEqual({
      routeLink: `Use ${FIELD_LIMITS.routeLink} characters or fewer.`,
      customDistance: `Use ${FIELD_LIMITS.customDistance} characters or fewer.`,
    });
    expect(activityFieldErrors(EventType.WEEKEND_RUN, raw)).toEqual({
      routeLink: `Use ${FIELD_LIMITS.routeLink} characters or fewer.`,
      customDistance: `Use ${FIELD_LIMITS.customDistance} characters or fewer.`,
    });
  });

  it("truncates stored route, distance, item, and pace text before rendering", () => {
    const route = "r".repeat(FIELD_LIMITS.routeLink + 40);
    const distance = "d".repeat(FIELD_LIMITS.customDistance + 40);
    const itemName = "n".repeat(FIELD_LIMITS.potluckItemName + 40);
    const pace = "p".repeat(FIELD_LIMITS.marathonPaceNote + 40);
    const event = eventFixture({
      type: EventType.WEEKEND_RUN,
      metadata: { routeLink: route, distance },
      potluckItems: [
        {
          id: "item_1",
          eventId: "event_1",
          category: "Dessert",
          itemName,
          claimedBySlackUserId: "U1",
          servesCount: null,
          dietaryType: null,
          notes: "note",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      preferences: [
        {
          id: "pref_1",
          eventId: "event_1",
          slackUserId: "U1",
          key: "targetPace",
          value: pace,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    const card = JSON.stringify(renderEventCard(event));
    const summary = JSON.stringify(renderSummary(event));
    expect(card).not.toContain(route);
    expect(card).not.toContain(distance);
    expect(card).toContain("r".repeat(20));
    expect(summary).not.toContain(pace);
    expect(summary).not.toContain(itemName);
    expect(card).toContain(`${"p".repeat(20)}`);
  });
});
