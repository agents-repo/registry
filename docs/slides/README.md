# Presentation slides

Marp PDF deck for this repository. **Commit PDF only** — do not commit HTML.

Org convention (paths, scripts, Chrome notes, theme sync):
[agents-repo/.github docs/slides/README.md](https://github.com/agents-repo/.github/blob/main/docs/slides/README.md)

Authoring: [Marp](https://marp.app/) and the
[Marp for VS Code](https://marketplace.visualstudio.com/items?itemName=marp-team.marp-vscode)
extension.

## Deck

| Deck | PDF | Audience |
| --- | --- | --- |
| [package-creation.md](package-creation.md) | [package-creation.pdf](pdf/package-creation.pdf) | First-time package authors |

Theme: `docs/slides/theme/theme.css` (`@theme agents-repo`), copied from
`.github`. Re-copy after org theme or `scripts/slides.mjs` changes.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run slides:build` | Write PDF and source fingerprint under `docs/slides/pdf/` |
| `npm run slides:preview:html` | Write HTML under `docs/slides/build/` (gitignored) |
| `npm run slides:check` | Fail on source drift, missing/non-PDF artifact, or Chrome rebuild failure |

`slides:check` fingerprints Marp HTML, not PDF bytes. Reviewers MUST inspect
diffs to `docs/slides/pdf/*.pdf`. Rebuild errors no longer hide earlier drift.

After editing the deck, run `npm run slides:build` and commit `docs/slides/pdf/`.
