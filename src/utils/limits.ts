export const FIELD_LIMITS = {
  routeLink: 1_000,
  customDistance: 100,
  potluckItemName: 150,
  potluckItemNotes: 1_500,
  marathonPaceNote: 300,
} as const;

export function limitedActivityFieldErrors(
  raw: Record<string, string>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const routeLink = raw.routeLink?.trim() ?? "";
  if (routeLink.length > FIELD_LIMITS.routeLink) {
    errors.routeLink = `Use ${FIELD_LIMITS.routeLink} characters or fewer.`;
  }
  const customDistance = raw.customDistance?.trim() ?? "";
  if (customDistance.length > FIELD_LIMITS.customDistance) {
    errors.customDistance = `Use ${FIELD_LIMITS.customDistance} characters or fewer.`;
  }
  return errors;
}

export function assertMaxLength(value: string, max: number, label: string): void {
  if (value.trim().length > max) {
    throw new Error(`${label} must be ${max} characters or fewer.`);
  }
}
