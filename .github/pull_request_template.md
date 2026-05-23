# Pull Request

## Summary

Describe the change and why it is needed.

## Change Type

- [ ] Initial structure
- [ ] Spec update
- [ ] Bug fix
- [ ] Package submission
- [ ] Documentation
- [ ] Tooling or workflow
- [ ] Maintenance

## Scope

List affected paths:

- [ ] Root config files (for example: package.json, package-lock.json,
  .gitignore, .markdownlint-cli2.yaml)
- [ ] Root automation/tooling directories (for example: .husky/)
- [ ] README.md
- [ ] specs/
- [ ] packages/
- [ ] examples/
- [ ] scripts/
- [ ] .github/
- [ ] .vscode/

## Spec and Format Impact

If relevant, describe impact on:

- package format
- metadata schema
- manifest schema
- agent or flow format
- versioning rules

## Validation Checklist

- [ ] Markdown linting passes.
- [ ] ESLint/Sonar linting passes (`npm run lint:sonar`).
- [ ] Unit tests pass (`npm run test:run`).
- [ ] Typecheck passes (`npm run typecheck`).
- [ ] Repo-wide package ZIP scan passes (`npm run package:scan-zips`).
- [ ] New or changed docs are deterministic and clear.
- [ ] Matching issue template was used (or required sections were included
    manually when template application was not possible), and this PR follows
    `.github/pull_request_template.md` (or includes its required sections).
- [ ] Definition/rule changes were checked across affected specs, templates,
  README examples, and relevant metadata/manifest JSON examples.
- [ ] Root `agents/` and `flows/` `.agent.md` frontmatter `version` values
    follow `versioning-rules.md` relative to `versions/manifest.json` `latest`.
- [ ] Any JSON examples are valid and consistent with specs.
- [ ] Indentation and formatting policy remains consistent with workspace and
  lint tooling defaults.
- [ ] Any package or artifact references are accurate.
- [ ] `packages/index.json` updated if a package was added, changed,
  or published.
- [ ] If a package version was published: `npm run package:build` and
  `npm run package:validate-artifacts` completed successfully and their output
  has been reviewed.
- [ ] If a package version was published: no files under `versions/` were
  manually authored or modified outside of `package-build` script output.
- [ ] If this PR is linked to a tracking issue, `## Related Issues` includes
  `Closes #<issue-number>`.

## Risk and Rollback

- Risk level: low / medium / high
- Rollback plan:

## Related Issues

- If this PR is linked to an issue, include `Closes #<issue-number>`.
- If this PR is not tied to a tracking issue, state a short rationale here.
