# Pull Request

## Summary

Describe the change and why it is needed.

## Related Issues

`Closes #<issue-number>`

Replace the backticked placeholder above with an unbackticked Closes # line (use
your issue number).

For standard tasks, use `Closes #<issue-number>`. For security vulnerabilities
without a public tracking issue, reference the advisory identifier (for example
`GHSA-...`) and coordinate linkage with maintainers per the
[Workflow exceptions](https://github.com/agents-repo/.github/blob/main/CONTRIBUTING.md#workflow-exceptions)
section of the organization CONTRIBUTING guide.

## Workflow Checklist

- [ ] A tracking issue was opened before implementation.
- [ ] The branch name follows `<prefix>/<issue-number>-<slug>`.
- [ ] This pull request was created as a draft (`gh pr create --draft` or UI
  draft option).
- [ ] This draft PR was opened before implementation commits (or it documents
  why not).
- [ ] `## Related Issues` includes a tracking reference (`Closes #<issue-number>`
  or a security-advisory identifier per the
  [Workflow exceptions](https://github.com/agents-repo/.github/blob/main/CONTRIBUTING.md#workflow-exceptions)
  section of the organization CONTRIBUTING guide).
- [ ] Merge to `main` is for human maintainers only; agents and automation
  must not merge this PR or push directly to `main`.
- [ ] A human developer marked this PR ready for review after validation (not
  agents or automation).

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
- [ ] IDE mirror drift check passes when mirror sources changed:

  ```bash
  npm run package:sync-ide-targets -- --check \
    --package agents-repo/agents-repo-package-creation --target all
  ```

  Plus per-package checks for other dogfooded packages as needed.
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
- [ ] If this is a package submission: PR title uses `feat(package):` or
  `fix(package):` (or the optional `feat(package)!:` / `fix(package)!:` form
  for breaking package semver emphasis). All package titles publish a registry
  PATCH tag so `v2.x` consumers receive the update. CI validates this title in
  `pr-package-validation` when package directories change.

## Risk and Rollback

- Risk level: low / medium / high
- Rollback plan:
