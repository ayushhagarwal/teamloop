export class TeamLoopError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "TeamLoopError";
  }
}

export class NotFoundError extends TeamLoopError {
  constructor(message = "That event no longer exists.") {
    super(message, "NOT_FOUND");
  }
}

export class PermissionError extends TeamLoopError {
  constructor(message = "Only the organizer can do that.") {
    super(message, "FORBIDDEN");
  }
}

export class EventStateError extends TeamLoopError {
  constructor(message: string, code = "INVALID_EVENT_STATE") {
    super(message, code);
  }
}

export function toUserMessage(error: unknown): string {
  if (error instanceof TeamLoopError) return error.message;
  return "Something went wrong. Please try again.";
}
