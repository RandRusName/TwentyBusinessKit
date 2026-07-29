# Commercial Proposal XLSX Template Builder

## Scope

User-configurable XLSX templates for Commercial Proposals:

- bind allowed proposal fields to workbook cells;
- expand `content.workItems` (and later `content.plan`) table rows;
- store immutable template versions (object storage + Twenty metadata);
- activate one global custom template for generation.

This pass does **not** include a full Excel editor, drag-fill, DOCX, Marketplace
packaging, or per-proposal template selection (P1).

## Default behavior (backward compatible)

Generation priority:

```text
1. Global ACTIVE custom XLSX template version (if present)
2. Else built-in mikoton-commercial-proposal v2
```

When no ACTIVE custom template exists, document-service uses the built-in path:

```text
templateCode = mikoton-commercial-proposal
templateVersion = 2
schemaVersion = 2.0
```

Custom XLSX is a **render source**, not a different business document schema.
Responses still use `templateCode = mikoton-commercial-proposal`. Distinguish via
result audit fields (`templateSource`, `templateVersionId`, …).

## End-to-end flow

```text
upload XLSX
  -> inspect workbook
  -> map fields
  -> validate mapping (warn mode)
  -> create-version (store binary + strict validate + persist metadata)
  -> activate (optional, or activate later)
  -> generate Commercial Proposal using ACTIVE custom XLSX
  -> result metadata records which template was used
```

## Mapping schema (`1.0`)

```ts
{
  schemaVersion: '1.0',
  scalarBindings: [
    { kind: 'scalar', fieldPath: 'proposal.number', sheetName: 'КП', cell: 'B2' }
  ],
  tableBindings: [
    {
      kind: 'table',
      collectionPath: 'content.workItems',
      sheetName: 'КП',
      templateRow: 15,
      insertMode: 'insertRowsAndShiftDown',
      minRows: 1,
      copyStyleFromTemplateRow: true,
      preserveFormulas: true,
      columns: [
        { fieldPath: 'name', cell: 'B15' },
        { fieldPath: 'quantity', cell: 'C15' },
        { fieldPath: 'unitPrice', cell: 'D15' }
      ]
    }
  ]
}
```

### Validation modes

| Mode | Route | Unknown sheet / vertical merge / Excel Table on template row |
|---|---|---|
| `warn` | `/validate-mapping` | warnings |
| `strict` | `/create-version` | hard errors |

Backend validation is authoritative.

## Ownership

| Layer | Owns |
|---|---|
| Commercial Proposals | field registry, business mapping validation, template metadata objects, repository, routes, generation selection |
| Documents | A1 helpers, structural mapping schema, inspect/store/render contracts, HTTP adapter |
| document-service | XLSX parse/inspect/store, custom render + row expansion, built-in templates, PDF, object storage |

## Persistence

Metadata objects:

- `CommercialProposalXlsxTemplate` — logical template family
- `CommercialProposalXlsxTemplateVersion` — immutable uploaded version

Binary storage:

- Request may include base64 **in transit only**
- `POST /v1/xlsx-templates/store` writes bytes to object storage
- Metadata stores `storageKey` + `fileSha256` + workbook metadata + mapping
- **No long-term base64** in Twenty metadata

Persistence status: **implemented** (`XLSX_TEMPLATE_PERSISTENCE_STATUS = 'implemented'`).

Activation is best-effort across non-transactional Twenty writes: after activate,
only one global ACTIVE version should remain; concurrent activates may briefly
diverge until the next successful activate.

## Routes (authenticated)

| Route | Behavior |
|---|---|
| `POST /s/commercial-proposal-templates/inspect-xlsx` | inspect via document-service |
| `POST /s/commercial-proposal-templates/validate-mapping` | business + warn-mode workbook checks |
| `POST /s/commercial-proposal-templates/create-version` | store XLSX, strict validate, persist version, optional activate |
| `POST /s/commercial-proposal-templates/list` | list families/versions + active summary |
| `POST /s/commercial-proposal-templates/activate` | activate existing version by id |

document-service:

| Route | Behavior |
|---|---|
| `POST /v1/xlsx-templates/inspect` | workbook metadata + optional preview |
| `POST /v1/xlsx-templates/store` | validate, store binary, return storageKey/sha256/workbook |

## Generation + audit

`generateCommercialProposalDocuments` loads `getActiveVersion()` for AGGREGATE_V2:

- active present → pass `templateRenderConfig` into `buildDocumentGenerationPayloadV2`
- active absent → omit config (built-in)
- infrastructure failure loading active template → generation fails (no silent fallback)

Result metadata (V2, additive):

```ts
templateSource: 'built-in' | 'custom-xlsx'
templateId?: string
templateVersionId?: string
templateFileSha256?: string
mappingSchemaVersion?: '1.0'
```

Old generated metadata without these fields remains valid (`hasGenerationResult` unchanged).

## UI

Command menu **Шаблоны КП (XLSX)** opens the builder.

- Save as draft / Save and activate call create-version
- List panel shows active version and saved versions; Activate on non-active rows
- Preview / cell picker unchanged
- Manual mapping JSON advanced panel remains

User guide: `docs/modules/commercial-proposals/xlsx-template-builder-user-guide.md`.

## Preparing an XLSX template

1. Use `.xlsx` only (not password-protected, not `.xlsm`).
2. Put one sample product row where the table should expand.
3. Prefer horizontal merges only on that template row; vertical merges across
   the template row are rejected on save/render.
4. Do not place the template row inside an Excel Table (ListObject) — rejected.
5. Put totals / signatures below the template row so inserts shift them down.
6. Keep row formulas on the template row; they are copied and row-shifted.

## Limitations (MVP)

- Preview is not a full Excel editor (no charts/images; 80×30 truncation).
- No per-proposal template picker (future P1).
- Concurrent activate is best-effort only.
- `content.plan` is allowed in schema but product UX focuses on `workItems`.

## Related docs

- `docs/modules/commercial-proposals.md`
- `docs/document-generation.md`
- `docs/template-versioning.md`
- `docs/architecture/dependency-rules.md`
