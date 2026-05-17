# Spec Change 16: Entity-Specific WebApp Metadata v1

Tracking issue: #16

## Scope

Define lean, user-facing metadata fields with entity-specific cost semantics:

- Package fields: `status`, `category`, `estimateOverallCost`, `quickstart`, `customAttributes`
- Agent fields: `status`, `category`, `estimateCost`, `customAttributes`
- Flow fields: `status`, `category`, `estimateCost`, `customAttributes`

## Status and Cost Enums

- `status`: `active`, `deprecated`, `archived`, `yanked`
- Package cost `band`: `low`, `medium`, `high`, `mixed`
- Agent/flow cost `band`: `low`, `medium`, `high`

## MUST and OPTIONAL (new-publish path)

Package MUST:

- `status`
- `category`
- `estimateOverallCost.band`

Package OPTIONAL:

- `estimateOverallCost.estimatedCost`
- `quickstart`
- `customAttributes`

Agent MUST:

- `status`
- `category`
- `estimateCost.estimatedCost`
- `estimateCost.band`

Agent OPTIONAL:

- `customAttributes`

Flow MUST:

- `status`
- `category`
- `estimateCost.estimatedCost`
- `estimateCost.band`

Flow OPTIONAL:

- `customAttributes`

## Notes

- Package `estimateOverallCost.estimatedCost` MAY be omitted when `band` is `mixed`.
- Legacy historical versions remain valid without backfill.
