# Slack Marketplace readiness

TeamLoop V1 supports OAuth distribution, but a real submission still needs
operational and listing work.

## Product and installation

- [ ] Stable production HTTPS origin and direct install URL.
- [ ] OAuth install, reinstall, and uninstall tested across multiple workspaces.
- [ ] Staging Slack app with the same granular scopes.
- [ ] Friendly installation success and failure pages.
- [ ] At least the currently required number of active workspace installs.
      Slack’s current guidelines should be checked immediately before submission;
      as of June 21, 2026, the published guideline says apps installed on fewer
      than five active workspaces are not accepted.

## Listing assets

- [ ] Final app icon and brand-approved screenshots.
- [ ] Short and long descriptions.
- [ ] Demo video showing all six commands and organizer controls.
- [ ] Support email and public support page.
- [ ] Public privacy policy and terms of service.
- [ ] Installation, configuration, and uninstall instructions.

## Review notes

- Explain why each of the three scopes is necessary.
- Provide test-workspace installation instructions and fictional test data.
- Demonstrate permission errors for non-organizers.
- Demonstrate token encryption, request-signature verification, data deletion,
  duplicate reminder prevention, and failure handling.
- Verify the listing and product behavior match.
- Add at least one additional app collaborator.

## Maintenance

- Monitor errors, uninstalls, support requests, and Slack platform changes.
- Keep contact, privacy, support, and listing URLs working.
- Use a staging app and resubmit material behavior or scope changes.
- Revoke tokens and communicate clearly if the app is discontinued.

Official references:

- [Marketplace guidelines and requirements](https://docs.slack.dev/slack-marketplace/slack-marketplace-app-guidelines-and-requirements)
- [Distribution and review process](https://docs.slack.dev/slack-marketplace/distributing-your-app-in-the-slack-marketplace)
- [Marketplace review guide](https://docs.slack.dev/slack-marketplace/slack-marketplace-review-guide)
