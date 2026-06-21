# Releasing TeamLoop

TeamLoop uses Semantic Versioning and annotated Git tags:

- `vMAJOR.MINOR.PATCH`
- patch for compatible fixes;
- minor for compatible functionality;
- major for incompatible changes.

## Prepare a release

1. Create a branch from the latest `main`.
2. Update `package.json` and `package-lock.json` to the release version.
3. Move notable changes from the Unreleased section into a dated section in
   `CHANGELOG.md`.
4. Open a pull request and wait for CI and review.
5. Rebase-merge the pull request.

## Publish

In GitHub Actions, open the **Release** workflow, choose **Run workflow** on
`main`, and enter the version without a leading `v`, for example `1.1.0`.

The workflow:

1. verifies that it is running from `main`;
2. checks that `package.json` has the requested version;
3. runs formatting, linting, typechecking, tests, and the production build;
4. creates and pushes annotated tag `v1.1.0`;
5. creates a GitHub Release with generated categorized notes.

The workflow refuses to overwrite an existing tag. Releases should never be
created from an unmerged feature branch.

## Hotfixes

Prepare a normal pull request from the current `main`, update the patch version,
rebase-merge it, then run the same workflow.
