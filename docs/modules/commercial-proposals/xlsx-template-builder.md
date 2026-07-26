# Commercial Proposal XLSX Template Builder (foundation)

## Scope

User-configurable XLSX templates for Commercial Proposals:

- bind allowed proposal fields to workbook cells;
- expand `content.workItems` (and later `content.plan`) table rows;
- version uploaded templates so generated documents stay auditable.

This foundation pass does **not** include a visual spreadsheet editor,
drag-to-select cells, DOCX, Marketplace packaging, or persistence of template
binaries into Twenty metadata objects.

## Default behavior (backward compatible)

If a proposal generation request does **not** include
`templateRenderConfig`, document-service uses the built-in template:

```text
templateCode = mikoton-commercial-proposal
templateVersion = 2
schemaVersion = 2.0
```

Existing `AGGREGATE_V2` generation is unchanged.

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

### Scalar bindings

- `fieldPath` must be in the Commercial Proposal allowlist
  (`src/modules/commercial-proposals/domain/templates/xlsx-template-fields.ts`).
- `cell` must be valid A1 notation.
- Duplicate target cells are rejected.

### Table bindings (`content.workItems`)

1. Locate `sheetName` and `templateRow`.
2. For N items, insert `N - 1` rows below the template row (`insertRowsAndShiftDown`).
3. Copy row height / cell styles / number formats from the template row.
4. Preserve formulas where possible (LibreOffice recalculates on PDF export;
   Excel recalculates on open via fullCalcOnLoad when supported).
5. Write each bound column field into each generated row.
6. Content below the table shifts down with the insert.

`minRows` is `0` or `1` (default `1`). Empty work items with `minRows: 1`
keep one blank template row.

Required work-item columns for validation: `name`, `quantity`, and either
`unitPrice` or `lineAmount`.

## Ownership

| Layer | Owns |
|---|---|
| Commercial Proposals | field registry, business mapping validation, template version domain model, routes |
| Documents | A1 helpers, structural mapping schema, inspect/render contracts, HTTP adapter |
| document-service | XLSX parse/inspect, custom render + row expansion, built-in templates, PDF |

## Routes (authenticated)

```text
POST /s/commercial-proposal-templates/inspect-xlsx
POST /s/commercial-proposal-templates/validate-mapping
```

Inspect proxies to document-service `POST /v1/xlsx-templates/inspect`.

Validate-mapping is pure app-side validation (no persistence).

## Payload extension

`DocumentGenerationPayloadV2` may optionally include:

```ts
templateRenderConfig?: {
  templateSource: 'custom-xlsx';
  templateVersionId: string;
  templateFile: { storageKey; sha256; originalFileName };
  mapping: XlsxTemplateMapping;
}
```

Generation orchestration does not select a custom template yet (no persistence).
When a future pass supplies `templateRenderConfig`, document-service renders the
uploaded workbook instead of the built-in file while still validating proposal
content with schema `2.0`.

Optional result audit fields (additive only):

```ts
templateSource?: 'built-in' | 'custom-xlsx'
templateVersionId?: string
templateFileSha256?: string
mappingSchemaVersion?: '1.0'
```

## Template versioning / persistence decision

Domain types exist:

- `CommercialProposalXlsxTemplate`
- `CommercialProposalXlsxTemplateVersion`
- `XlsxTemplateRepository` port

Persistence status: **domain-only** (`XLSX_TEMPLATE_PERSISTENCE_STATUS`).

Routes:

| Route | Status |
|---|---|
| `POST /s/commercial-proposal-templates/inspect-xlsx` | implemented |
| `POST /s/commercial-proposal-templates/validate-mapping` | implemented |
| `POST /s/commercial-proposal-templates/create-version` | validates mapping, then `FEATURE_NOT_IMPLEMENTED` |
| `POST /s/commercial-proposal-templates/list` | `FEATURE_NOT_IMPLEMENTED` |
| `POST /s/commercial-proposal-templates/activate` | `FEATURE_NOT_IMPLEMENTED` |

UI: command menu **Шаблоны КП (XLSX)** opens the form-based builder
(`src/front-components/commercial-proposal-xlsx-template-builder.front-component.tsx`).

User guide: `docs/modules/commercial-proposals/xlsx-template-builder-user-guide.md`.

## UI flow

1. Upload display name + `.xlsx` (max 5 MB) → inspect via document-service.
2. Review workbook metadata (sheets, dimensions, merges); choose default sheet.
3. Configure scalar bindings (grouped Proposal / Customer / Contractor / Content).
4. Configure `content.workItems` table: sheet, template row, column cells on that row.
5. Validate via backend; Save/Activate call create-version and surface persistence TODO.

Generation still uses the built-in template until an active custom version can be stored.

## Spreadsheet preview & cell picker

Inspect returns an optional bounded `preview` matrix per sheet
(max 80 rows × 30 columns, display values truncated to 120 chars).

UI:

- lightweight scrollable grid (not Excel);
- **Pick cell** for scalar bindings;
- **Pick template row** + **Pick cell** for work-items columns;
- highlights for mapped scalar/table cells, template row, duplicates, merged/outside-preview warnings;
- manual A1 inputs remain available as fallback;
- single-cell named ranges can be clicked when present.

Formula cells are marked (`hasFormula`); formulas are **not** calculated in the browser.
Charts/images are not rendered.

## Preparing an XLSX template

1. Use `.xlsx` only (not password-protected, not `.xlsm`).
2. Put one sample product row where the table should expand.
3. Prefer horizontal merges only on that template row; vertical merges across
   the template row are rejected.
4. Do not place the template row inside an Excel Table (ListObject) in MVP —
   those are rejected to avoid silent corruption.
5. Put totals / signatures below the template row so inserts shift them down.
6. Keep row formulas on the template row (e.g. `=C15*D15`); they are copied and
   row-shifted for inserted rows. openpyxl does not evaluate formulas.

## Limitations (MVP)

- No visual grid / cell picker UI beyond the lightweight preview (not Excel).
- No full spreadsheet editing / formula calculation in browser.
- Charts/images are not rendered in preview.
- Large sheets are truncated to 80×30 for preview.
- No per-proposal template picker UI yet (built-in remains default).
- No template binary persistence / activate workflow yet.
- Vertical merges and Excel Tables on the template row are rejected at render.
- `content.plan` is allowed in the mapping schema but product UX focuses on
  `workItems` first.

## Related docs

- `docs/modules/commercial-proposals.md`
- `docs/document-generation.md`
- `docs/template-versioning.md`
- `docs/architecture/dependency-rules.md`
