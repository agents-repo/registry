# pt-it-tax-models

**IT career** chat tools for software and tech professionals in Portugal:
illustrative comparisons of **trabalho dependente (TCO)**, **Recibos Verdes**
(regime simplificado), and **Empresa Unipessoal Lda.** (sócio-gerente).

This is a `maiconfz` community package. Outputs are **educational scenarios
only** — **not** tax, legal, or accounting advice. Confirm every decision with
a **contabilista certificado** before changing contract type, invoicing, or
incorporating.

## What this package is

- Side-by-side **illustrative** cash-flow and tax-load comparisons for IT roles
- Region input: **Continente**, **Açores (RAA)**, or **Madeira (RAM)** where
  relevant (TCO withholding, IRC PME bands, IVA normal rate)
- **Tax year:** agents default to the **current calendar year** (Europe/Lisbon)
  and may WebSearch when laws differ from the packaged rate snapshot below

## What this package is not

- Not a substitute for a contabilista, advogado fiscal, or AT/SS filing
- Not guaranteed net pay, effective rates, or deductibility of specific expenses
- Not full IVA credit modeling or contabilidade organizada

## Install

```bash
npx agents-repo@latest install maiconfz/pt-it-tax-models
```

## Chat agents

| Agent | Use when |
| --- | --- |
| `tco-to-unipessoal-chat` | Employed or evaluating an offer → freelancing or unipessoal |
| `unipessoal-to-tco-chat` | Billing or unipessoal → considering employment |
| `recibos-verdes-deep-dive-chat` | Focus on Recibos Verdes cash flow, SS trimestral, and compliance |

Installed agents reply in the **language the user used** (English if mixed or
unclear).

## Tax region quick reference

| Topic | Continente | Açores | Madeira |
| --- | --- | --- | --- |
| IVA taxa normal (services) | 23% | 16% | 22% |
| IRC PME (illustrative, first €50k / excess) | 15% / 19% | 10,5% / 13,3% | 10,5% / 13,3% |
| IRS retenção TCO | AT Continente despacho | AT RAA despacho | AT RAM despacho |
| IRS retenção Recibos Verdes | National activity rates (not regional tables) | Same | Same |

## Rate reference — verified for 2026 (`packaged-rate-snapshot-year`)

Agents use these values when `tax-year` matches **2026** or when WebSearch
cannot refresh a newer year (reports must label stale rates).

| Topic | 2026 snapshot | Source |
| --- | --- | --- |
| RMMG | €920/month (from 2026-01-01) | [DGERT](https://www.dgert.gov.pt/retribuicao-minima-mensal-garantida-para-2026) |
| IAS | €537,13 | Segurança Social 2026 |
| SS TCO / gerente | 11% worker + 23,75% entity on remuneration | MOE gerência (34,75% global) |
| SS RV (services) | 21,4% on monthly base = ⅓ of quarterly relevant income; relevant = 70% of service revenue | [SS guia prático](https://www.seg-social.pt/ptss/pssd/documento/cmc1xyfxz00dekl2ynxz676sw) |
| IRS RV retenção | 23% default for many IT services; also 11,5% / 16,5% / 20% by activity | [AT / guides](https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/tabela_ret_doclib/Pages/default.aspx) |
| Regime simplificado | Coefficient 0,75 on eligible professional services | CIRS |
| Subsídio refeição (cartão) | €10,20/day exempt | OE 2025+ |
| Km (viatura própria) | €0,40/km reference | DL 1/2025 / OCC |
| Diárias nacionais | €65,89 / €72,65 (gerente) | CIRS conditions apply |
| Dividendos (default scenario) | 28% liberatory withholding | AT guia capitais |
| Entidade contratante | >50% revenue → 7% or 10% SS on services; ≥80% economic dependence | [SS 2034](https://www.seg-social.pt/ptss/pssd/documento/cmc1ygvnw00f4kl2yl22z68po) |

Official withholding tables (TCO): [Portal AT](https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/tabela_ret_doclib/Pages/default.aspx).
IRC/IRS tax sheet: [SFP Taxas 2026 PDF](https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Folhetos_informativos/Documents/SFP-Taxas-2026.pdf).

## Liability

Package and agents are provided **as is** under the MIT license. Authors and
distributors disclaim warranties of accuracy. Users accept sole responsibility
for financial and tax decisions. Find a certified accountant via
[OCC](https://www.occ.pt) (no endorsement of specific firms).
