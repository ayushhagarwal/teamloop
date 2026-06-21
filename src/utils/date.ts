const SLACK_DATE_FORMAT = "{date_long_pretty} at {time}";

export function toUtcDate(date: string, time: string): Date {
  return new Date(`${date}T${time}:00.000Z`);
}

export function slackDate(date: Date): string {
  const unix = Math.floor(date.getTime() / 1000);
  return `<!date^${unix}^${SLACK_DATE_FORMAT}|${date.toISOString()}>`;
}

export function slackTime(date: Date): string {
  const unix = Math.floor(date.getTime() / 1000);
  return `<!date^${unix}^{time}|${date.toISOString()}>`;
}

export function minutesBefore(date: Date, minutes: number): Date {
  return new Date(date.getTime() - minutes * 60_000);
}
