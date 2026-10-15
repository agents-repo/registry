# pt-it-tax-models

**IT career** chat tools for software and tech professionals in Portugal:
illustrative comparisons of **trabalho dependente (TCO)**, **Recibos Verdes**
(regime simplificado), and **Empresa Unipessoal Lda.** (sócio-gerente).

This is a `maiconfz` community package. Outputs are **educational scenarios
only** — **not** tax, legal, or accounting advice. Confirm every decision with
a **contabilista certificado** before changing contract type, invoicing, or
incorporating.

## Consumption (chat-web only)

This package is **for registry chat-web only** — use it in the
[agents-repo webapp](https://agents-repo.org) chat experience (or any consumer
that loads `/pkg/.../instructions.json`). Agents are conversational report
generators; they do **not** inspect your IDE workspace or run local tooling.

Registry metadata declares **`chat-web`** as the supported consumption channel.
IDE install ZIPs may exist for catalog plumbing, but this package is **not**
designed or documented as a Cursor/Copilot coding workflow.

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

## Unipessoal: IRC PME vs transparência fiscal

Comparison agents model **Unipessoal Lda.** with **IRC PME** in the main
three-column table by default. An optional annex covers **transparência fiscal**
(CIRC art. 6.º) when the user opts in or asks to compare regimes.

### Eligibility (IT — sociedade de profissionais)

| Check | Typical solo IT consultant | Usually fails TF |
| --- | --- | --- |
| Activity on art. 151.º list | **1332** Programadores informáticos, **1313** Analistas de sistemas, **1320** Consultores | N/A |
| Who delivers the work | **Sócio personally exercises** the professional activity **through** the Lda | Sócio is **gerente only**; employees or subcontractors deliver the IT work |
| Legal basis | CIRC art. 6.º sociedade de profissionais (subalíneas 1) / 2)) | AT [PIV 27002](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/informacoes_vinculativas/rendimento/circ/Documents/PIV_27002.pdf), [PIV 27379](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/informacoes_vinculativas/rendimento/circ/Documents/PIV_27379.pdf) |

Further reading:

- [CIRC art. 6](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/CIRC_2R/Pages/irc6.aspx)
- [OCC Guia TF](https://www.occ.pt/sites/default/files/public/2024-10/Guia_Pratico_TFa.pdf)
- [Art. 151.º table](https://diariodarepublica.pt/dr/legislacao-consolidada/portaria/2001-177307831)

### Tax mechanics (illustrative)

| Path | Entity | Sócio cash extraction |
| --- | --- | --- |
| **IRC PME** (default column) | Taxable profit → **IRC** at regional PME bands (table above) | **Gerente salary** (Cat. A, SS 34,75%) + optional **dividends** (28% illustrative withholding) |
| **Transparência fiscal** (annex) | **No IRC** on imputed matéria coletável | Profit **imputed** to sócio → **IRS art. 20.º** (declare **Anexo D**, not Anexo B); gerente salary still Cat. A; Cat. B slice shown as **range** (englobamento vs taxa liberatória — contabilista decides) |

Illustrative profit before tax (both paths):

```text
billing − costs − gerente_gross − SS_gerente_entity − spouse_gross − SS_spouse_entity
```

TF may change household cash vs IRC+dividends depending on profit level, salary
split, and annual IRS choices — agents label all figures **cenário estimado**.

## Household levers (unipessoal)

Optional annexes in comparison agents (`tco-to-unipessoal-chat`,
`unipessoal-to-tco-chat`) — not full optimization, only illustrative deltas.

| Spouse / partner role | What agents model | Notes |
| --- | --- | --- |
| **Employee** (payroll) | Extra **23,75%** employer SS + **11%** employee SS on spouse gross; **second meal card**; **household net** = sócio + spouse vs sócio-only; spouse salary **deductible** in IRC path | Real duties, **RMMG**, AT/SS sham-payroll risk; individualized benefits often Cat. A — [PIV 25701](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/informacoes_vinculativas/rendimento/circ/Documents/PIV_25701.pdf) |
| **Co-sócio** (quota holder) | Quota % split; TF imputation **pro rata** only if **each** sócio exercises art. 151 IT through the Lda | [Conjugal quotas](https://www.sociedadescomerciais.pt/sociedade-comercial-entre-conjuges/) possible; substance required |
| **Informal collaborator** | Compliance note only — not RV “cônjuge colaborador” (SS art. 166); reclassification risk | Use formal employment or professional advice |

Recibos Verdes **entidade contratante** rules are separate; see
`recibos-verdes-deep-dive-chat`.

## Liability

Package and agents are provided **as is** under the MIT license. Authors and
distributors disclaim warranties of accuracy. Users accept sole responsibility
for financial and tax decisions. Find a certified accountant via
[OCC](https://www.occ.pt) (no endorsement of specific firms).
