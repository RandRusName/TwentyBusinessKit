# Commercial Proposals

First production business module of the Mikoton CRM Application.

## Status

`active` — proposal aggregate, editor, numbering and generation orchestration
are production-facing. Legacy folders under `src/domain`, `src/services`,
`src/logic-functions` and `src/front-components` remain during migration.

## Public API

Import only from `src/modules/commercial-proposals`.

Exports include proposal repository ports and the XLSX template-builder
foundation (field registry, mapping validation, version domain types).

Detailed product behavior: `docs/modules/commercial-proposals.md`.
Template builder: `docs/modules/commercial-proposals/xlsx-template-builder.md`.
