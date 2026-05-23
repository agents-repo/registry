# VS Code Workspace Settings Policy

This folder stores shared VS Code workspace configuration.

## Goals

- Keep team behavior consistent across Linux, macOS, and Windows.
- Keep formatting and linting authority in repository tooling.
- Allow personal preferences through user-level settings.

## Scope Model

### Required shared settings (tracked)

Defined in `settings.json` and intended for all contributors:

- LF line endings
- UTF-8 encoding
- Final newline and trailing-whitespace cleanup
- Stable indentation defaults (2 spaces, no auto-detection)
- 80-column ruler and markdown wrap at 80
- Search exclusions for large dependency directories

### Personal settings (not tracked)

Use user settings for personal workflow preferences, such as:

- theme and font
- minimap and explorer UI options
- terminal profile and shell integration
- local extension experiments

Do not add personal preferences to workspace settings.

## Formatter and Lint Authority

Formatting and lint behavior is defined by repository tooling:

- TypeScript lint: `eslint.config.mjs`
- JSON and JSONC lint (including indentation): `eslint.config.mjs`
- Markdown lint: `.markdownlint-cli2.yaml`
- Commands: `npm run lint:sonar` and `npm run lint:md`

The shared workspace default uses 2-space indentation, and JSON/JSONC
indentation is enforced by `npm run lint:sonar` for repo files outside
`packages/**/versions/**`.

Avoid forcing a global default formatter in workspace settings unless a
repository-wide decision is made and documented.

## Extension Recommendations

Recommended extensions are tracked in `extensions.json`.

Guidelines:

- keep recommendations minimal and repository-relevant
- prefer linting and authoring support over personal productivity tools
- avoid recommending opinionated theme or UI extensions
- use personal extension preferences at user scope

## Environment Patterns

### Linux, macOS, Windows

Use the same shared workspace settings for all platforms.

### Remote development (Codespaces/containers)

Keep workspace settings minimal and stable. If remote-only behavior is needed,
prefer remote environment configuration rather than broad workspace overrides.

## Change Management

When changing workspace settings:

1. Keep changes minimal and team-oriented.
2. Explain rationale in the pull request.
3. Include `.vscode/` in PR scope checklist.
