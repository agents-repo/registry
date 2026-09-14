# consulting-employer-check

**IT worker employer evaluation** for consulting firms from public sources,
pasted reviews, and company websites. Chat-only: one agent emits a
structured, balanced, attributed report with pros, cons, GPTW signals, and
interview questions.

This is a `maiconfz` community package, not an official agents-repo product.
Installed agents reply in the **language the user used** (English if mixed
or unclear).

## What this package is

- An employer check for IT professionals evaluating consulting employers
- Evidence from **public HTTPS URLs**, **uploads**, and **pasted reviews**
- **Great Place to Work** directory lookup (best-effort, geo-adaptive)
- **Liability-safe language** — attributed third-party themes, not direct
  accusations

## What this package is not

- **Not** legal, employment, HR, or investment advice
- **Not** a guarantee of review accuracy — sources may be biased or outdated
- **Not** an IDE workflow — chat-only; no host-tree inspection

## Install

```bash
npx agents-repo@latest install maiconfz/consulting-employer-check
```

## Usage

Use **`employer-check-chat`** in chat-web (default) or after install in your
IDE chat.

Provide any of:

- **Company name** and **country/region**
- **Company website** or careers page HTTPS URL
- **Target role** or seniority
- **Review URLs** (Glassdoor, Teamlyzer, Reddit) or **pasted excerpts**
- **Competitor names** (optional)

The agent emits **`employer-check-report`** when evidence is sufficient.
Thin messages trigger an interview instead.

### Structured inputs

| Input | Purpose |
| --- | --- |
| `company-name` | Employer to evaluate (required with website) |
| `company-website` | Public HTTPS URL |
| `country-or-region` | Geo-adaptive sources (GPTW, Teamlyzer) |
| `role-or-seniority` | Tailors report sections |
| `review-source-urls` | Review site URLs |
| `review-excerpts` | Pasted review text |

### Evidence limits

- At most **15** HTTPS fetches per turn; uploads do not count
- Up to **2** GPTW directory fetches per turn
- Review sites may block automated fetch — paste excerpts when needed

## Package contents

| Asset | Role |
| --- | --- |
| `employer-check-chat` | Chat-web IT consulting employer evaluation |

## Validate and build

```bash
PKG=maiconfz/consulting-employer-check
npm run package:validate -- --package "$PKG"
npm run package:build -- --package "$PKG"
npm run package:validate-artifacts -- --package "$PKG" --version 1.0.0
```

Do not author `detail.json` or any files under `versions/`.
