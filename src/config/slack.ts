export const SLACK_SCOPES = ["commands", "chat:write", "chat:write.public"] as const;

export const SLACK_ENDPOINTS = {
  events: "/slack/events",
  install: "/slack/install",
  oauthRedirect: "/slack/oauth_redirect",
} as const;
