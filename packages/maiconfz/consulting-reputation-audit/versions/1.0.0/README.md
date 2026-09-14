# consulting-reputation-audit

**IT consulting company reputation audit** from public sources, pasted
reviews, company websites, and GPTW directories. Chat-only: one agent emits
a balanced, attributed report with praise themes, criticism themes, alignment
gaps, and an improvement plan.

This is a `maiconfz` community package, not an official agents-repo product.
Installed agents reply in the **language the user used** (English if mixed
or unclear).

## What this package is

- A reputation audit for IT consulting company leadership
- Evidence from **public HTTPS URLs**, **uploads**, and **pasted reviews**
- **Great Place to Work** certification/ranking verification (best-effort)
- **Honest, realistic analysis** with liability-safe attributed language

## What this package is not

- **Not** legal, HR, PR, or investment advice
- **Not** astroturfing or fake-review guidance
- **Not** an IDE workflow — chat-only; no host-tree inspection

## Install

```bash
npx agents-repo@latest install maiconfz/consulting-reputation-audit
```

## Usage

Use **`consulting-reputation-chat`** in chat-web (default) or after install
in your IDE chat.

Provide any of:

- **Company name** (your consulting firm)
- **Website** and **careers page** HTTPS URLs
- **Country/region** and **company size**
- **Review URLs** or **pasted excerpts** (Glassdoor, Teamlyzer, Reddit)
- **Focus areas** (employer brand, bench perception, retention)
- **GPTW claim** to verify (optional)
- **Competitor names** (optional)

The agent emits **`consulting-reputation-report`** when evidence is
sufficient. Thin messages trigger an interview instead.

### Structured inputs

| Input | Purpose |
| --- | --- |
| `company-name` | Company being audited (required) |
| `company-website` | Public HTTPS URL |
| `careers-page-url` | Culture/jobs page |
| `focus-areas` | What leadership wants to improve |
| `gptw-claim` | Stated certification to verify |
| `review-source-urls` | Review site URLs |
| `review-excerpts` | Pasted public reviews |

### Evidence limits

- At most **15** HTTPS fetches per turn; uploads do not count
- Up to **2** GPTW directory fetches per turn
- Review sites may block automated fetch — paste excerpts when needed

## Package contents

| Asset | Role |
| --- | --- |
| `consulting-reputation-chat` | Chat-web IT consulting reputation audit |

## Validate and build

```bash
PKG=maiconfz/consulting-reputation-audit
npm run package:validate -- --package "$PKG"
npm run package:build -- --package "$PKG"
npm run package:validate-artifacts -- --package "$PKG" --version 1.0.0
```

Do not author `detail.json` or any files under `versions/`.
