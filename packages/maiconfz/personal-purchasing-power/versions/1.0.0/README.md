# personal-purchasing-power

Chat-web illustration of a household's own price basket: Laspeyres
purchasing-power loss, labeled scenarios, and counterfactuals versus a local
yield, a broad stock index, and Bitcoin. When the currency is neither the
US dollar nor the euro, the same stake is also shown as unremunerated dollar
cash and euro cash.

This is a `maiconfz` community package. Outputs are **educational
illustrations** of the reader's inputs and cited sources. They are **not**
investment, financial, tax, accounting, or legal advice.

## Consumption (chat-web only)

This package is **for registry chat-web**. Use it in the
[agents-repo webapp](https://agents-repo.org) chat experience, or any
consumer that loads `/pkg/.../instructions.json`. The agent is a
conversational report generator. It does **not** inspect an IDE workspace
or run local tooling.

Registry metadata declares **`chat-web`** as a supported consumption
channel. IDE install ZIPs exist for catalog plumbing. This package is
**not** designed or documented as a Cursor or Copilot coding workflow.

The agent replies in the **language the user used** (English if mixed or
unclear).

## What this package is

- A fixed-basket (Laspeyres) price index from the household's own shares
- Purchasing-power loss over a cited window, with the official consumer
  price index as a contrast column when a series can be cited
- The same stake illustrated against a local yield, one broad equity index,
  and Bitcoin, in the household currency
- Unremunerated USD and EUR cash when the currency is neither
- A closing ranking of those illustrated endings, plus labeled repeats of
  cited-window growth

## What this package is not

- Not a forecast of inflation or exchange rates
- Not an instruction to buy, sell, hold, or move money
- Not a price database or a tax calculator
- Not a claim that an official consumer-price index is fraudulent

## Chat agent

| Agent | Use when |
| --- | --- |
| `personal-purchasing-power-chat` | A household basket, purchasing power, and illustrated counterfactuals |

## Method

`currency` is the ISO 4217 code of the basket's unit of account. Spend
shares are renormalized to 100 percent. Prefer prices the user observed.
Unsourced lines stay blank. If unsourced weight is above 20 percent, the
index is **partial** and every real-return figure says so.

### Past index

Laspeyres is the headline. It reprices the base basket:

```text
L = sum(p_t * q_0) / sum(p_0 * q_0)
L = sum(w_i0 * (p_it / p_i0))
purchasing power = 1 / (L_end / L_start)
loss = 1 - L_start / L_end
annualized = (L_end / L_start) ^ (1 / years) - 1
```

Annualize only when the span is at least one day. If the user also gives
end-period quantities, also report Paasche and Fisher `sqrt(L * P)`.
Laspeyres stays the headline.

The official consumer-price series, when cited, is one contrast column. It
can differ because it uses an average basket, a housing method, quality
adjustment, or substitution.

### Real return

Every path uses the personal index, not the official CPI, and the cumulative
total return:

```text
real return = (1 + nominal total return) / (L_end / L_start) - 1
```

Paths, omitted when the series cannot be cited:

- Local risk-free or savings yield, compounded
- One broad local equity total-return index, or a price index with dividends
  described as omitted
- Bitcoin held from the start date to the end date, in the user's currency

Figures are gross of tax unless the user supplies a rate.

### Dollar and euro cash

Run only when the currency is neither USD nor EUR. FX is local currency per
1 USD, and the same convention per 1 EUR, on the start and end dates.
Foreign units of the stake are `local stake / FX`.

```text
L_foreign = (L_end / L_start) * (FX_start / FX_end)
```

`L_foreign` above 1 means the same basket became more expensive in that
currency. Local cash has nominal return 0. Dollar cash and euro cash are
unremunerated: nominal local return is `FX_end / FX_start - 1`.

### Future scenarios

Basket scenarios stay in the user's currency. They are the historical
item CAGRs on the fixed basket, user-supplied item rates when given, and a
uniform band of 2 percentage points either side of the annualized personal
rate. The band is an illustration, not a confidence interval.

The closing ranking may repeat each path's own cited-window annualized
return, including the local-currency change of dollar or euro cash. That
repeat is labeled "if that cited-window change were repeated." It is not an
exchange-rate forecast.

```text
r = (1 + nominal total return) ^ (1 / years) - 1
ending = stake * (1 + r) ^ H / (start basket-unit * L_S / L_start)
```

Local cash uses `r = 0`. One start basket-unit is the stated start cost of
the basket when the user gave it. When the user gave only shares, one start
basket-unit is the stake. If `future-years` is omitted, `H` is the
historical span rounded to the nearest whole year, at least 1. A horizon
above 30 years is still shown and labeled as long.

The report orders paths by ending basket-units. A tie at the reported
precision stays a tie. When the scenarios disagree, the illustration does
not single out one path.

## Notice

Package and agents are an educational illustration of the reader's inputs
and cited sources.

- Not investment, financial, tax, accounting, or legal advice.
- No advisory, brokerage, or fiduciary relationship with the reader, the
  package authors, or the registry.
- Provided **as is** under the MIT license. Authors and distributors
  disclaim warranties of accuracy.
- An AI system produced the chat text and can mis-state sources, dates,
  prices, exchange rates, and arithmetic.
- Figures can be wrong, incomplete, stale, or inapplicable.
- Past rankings and scenario orderings are not forecasts and not
  instructions.
- Decisions, and any gain or loss from a decision, are the reader's sole
  responsibility.
- Check every figure with independent sources before any financial action.

The report heading for these bullets stays `## Notice`.

## Validation

From the registry repository root:

```bash
npm run package:validate -- --package maiconfz/personal-purchasing-power
npm run package:build -- --package maiconfz/personal-purchasing-power
npm run package:validate-artifacts -- \
  --package maiconfz/personal-purchasing-power --version 1.0.0
```
