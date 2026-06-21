import { z } from "zod";
import { toUtcDate } from "./date.js";

export const eventInputSchema = z
  .object({
    title: z.string().trim().min(1, "Activity title is required.").max(150),
    date: z.string().date(),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    location: z.string().trim().min(1, "Location is required.").max(300),
    rsvpDeadlineDate: z.string().date(),
    rsvpDeadlineTime: z.string().regex(/^\d{2}:\d{2}$/),
    notes: z.string().trim().max(1_500).optional(),
    reminderMinutes: z.coerce.number().int().min(0).max(10_080).optional(),
  })
  .transform((value) => ({
    ...value,
    eventStartsAt: toUtcDate(value.date, value.time),
    rsvpDeadlineAt: toUtcDate(value.rsvpDeadlineDate, value.rsvpDeadlineTime),
  }))
  .superRefine((value, context) => {
    if (value.eventStartsAt <= new Date()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date"],
        message: "Please choose a future date and time.",
      });
    }
    if (value.rsvpDeadlineAt >= value.eventStartsAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rsvpDeadlineDate"],
        message: "RSVP deadline must be before the event starts.",
      });
    }
  });

export type ValidatedEventInput = z.infer<typeof eventInputSchema>;

export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !result[key]) result[key] = issue.message;
  }
  return result;
}
