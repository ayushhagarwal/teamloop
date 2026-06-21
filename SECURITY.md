# Security Policy

## Reporting a vulnerability

Please do not open a public issue for a vulnerability involving Slack tokens,
request verification, authorization, data exposure, or injection. Send a
private report to the security contact listed by the repository owner with:

- affected version or commit;
- reproduction steps;
- likely impact;
- any suggested mitigation.

Maintainers should acknowledge reports within seven days. Do not include real
workspace tokens or personal data in a report.

## Supported versions

Security fixes target the latest release on `main`.

## Deployment notes

Use HTTPS, a strong `SLACK_STATE_SECRET`, and a base64-encoded 32-byte
`TOKEN_ENCRYPTION_KEY` for OAuth installs. Rotate any credential that may have
been exposed and remove it from Git history.
