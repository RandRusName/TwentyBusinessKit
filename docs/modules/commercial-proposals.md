# Commercial Proposals module

First production business module of the **Mikoton CRM Application**.

Package name `mikoton-commercial-proposals` and universal identifiers stay
unchanged for upgrade compatibility. The module is not the product boundary.

## Scope

Creates, edits and generates commercial proposals from Opportunities:

- custom `CommercialProposal` aggregate with items and stages;
- relations to standard `opportunity` and `company`;
- Opportunity command menu entry and draft creation UI;
- catalog-backed item defaults (snapshot on copy — later catalog edits never
  rewrite saved proposals);
- numbering (`Черновик` draft label, final `КП-### от DD.MM.YYYY`);
- XLSX/PDF generation via external document-service;
- generated files attached to the proposal record.

App version tracked in root `package.json` (currently `0.1.54`).

## Opportunity → draft

1. Command menu item opens `Создать коммерческое предложение` on a single
   Opportunity.
2. UI loads context via `POST /s/commercial-proposals/opportunity-context`.
3. Draft creation sends source opportunity, template code, language and
   required `idempotencyKey`.
4. Successful DRAFT keeps `generatedAt` / `resultMetadata` / `lastError` null,
   `sourceType = OPPORTUNITY`, and amount/currency snapshots from the
   Opportunity when available.

## Aggregate editor

- App-owned `CommercialProposalItem` / `CommercialProposalStage` metadata.
- Model-versioned fields including `contentModelVersion`.
- Authenticated routes:
  - `POST /s/commercial-proposals/:id/editor-context`
  - `POST /s/commercial-proposals/:id/save-editor`
  - `POST /s/commercial-proposals/:id/recalculate`
- Deterministic fixed-scale money calculation; replay-safe save with
  `operationId` and child `clientKey`.
- New drafts start as empty `AGGREGATE_V2` with `amount = 0`.
- Existing `LEGACY_V1` drafts keep historical amount until the user saves at
  least one valid item (explicit irreversible conversion).
- Full-width CommercialProposal record page with a single editor tab; no
  generic `FIELDS` widget on the business card.
- Collapsible Documents section for generated files.
- `en` / `ru-RU` front-component localization inherited from Twenty locale.

## Catalog selection

Inline `CatalogItem` picker copies name/description/price/unit defaults into
proposal-owned item snapshots. Catalog remains a reusable defaults source —
not a live link into saved proposals.

## Numbering and generation claim

- Yearly final-number reservation via nullable unique `finalNumberKey`
  (`YYYY:NNN`) with bounded conflict retry.
- Same-proposal generation serialized by
  `CommercialProposalGenerationClaim.proposalKey`:
  - `operationId` = logical idempotent operation;
  - `ownerToken` = physical worker fence;
  - 10-minute lease renewal;
  - ownership lost → no FAILED write / no claim delete / no attachments;
  - parallel same `operationId` → `IN_PROGRESS` / HTTP 409.

## Document generation

- Legacy XLSM template v1 and macro-free XLSX template v2.
- Schema `2.0` for persisted `AGGREGATE_V2` (50 items / 10 stages).
- Route: `POST /s/commercial-proposals/generate`.
- Requires server-side `DOCUMENT_SERVICE_URL` and `DOCUMENT_SERVICE_SECRET`.
- Details: `docs/document-generation.md`, `docs/template-mapping-v*.md`,
  `docs/document-service-runbook.md`.

## Limitations / not in this module

- DOCX generation;
- public Marketplace distribution;
- Company entry point;
- CPQ features.

## Production evidence

Phase 5.5 corrective hardening is implemented. Restricted-user and controlled
rollback evidence remains open — verdict **NOT READY FOR PRODUCTION USE**.

See `docs/phase-5-5-production-acceptance.md`, `docs/production-acceptance.md`,
`docs/private-deployment.md`.

## Module code

- Public API: `src/modules/commercial-proposals`
- Registry: `src/modules/registry.ts`
- Legacy folders during migration: `src/domain`, `src/services`,
  `src/logic-functions`, `src/front-components`, `src/objects`
