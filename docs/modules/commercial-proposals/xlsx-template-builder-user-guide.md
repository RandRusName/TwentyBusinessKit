# Commercial Proposal XLSX Template Builder — user guide

## Open the builder

1. In Twenty, open the command menu (`Cmd+K` / `Ctrl+K`).
2. Run **Шаблоны КП (XLSX)** / **Commercial Proposal XLSX Template Builder**.
3. The builder opens as a front component (no record selection required).

## Prepare Excel

1. Use a normal `.xlsx` file (not `.xlsm`, not password-protected).
2. Put static labels and branding manually in Excel.
3. Reserve one product/service row (example: row 15) for repeating items.
4. Put totals / signatures **below** that template row so inserts can shift them down.
5. Optional: put row formulas on the template row (for example `=D15*F15`).

## Map fields (example)

```text
proposal.number          -> B2
proposal.date            -> B3
customer.companyName     -> B6
proposal.amount          -> F32

content.workItems table:
  sheetName: КП
  templateRow: 15
  name        -> B15
  quantity    -> D15
  unitPrice   -> F15
  lineAmount  -> H15
```

## Steps in the UI

1. **Upload** — display name + `.xlsx` (max 5 MB) → **Inspect workbook**.
2. **Workbook** — review sheets / dimensions / merge counts; pick default sheet;
   review the lightweight spreadsheet preview.
3. **Scalar fields** — map fields manually **or** click **Pick cell** then click
   a preview cell.
4. **Items table** — enable `content.workItems`, set template row (or
   **Pick template row**), map columns (**Pick cell** on the template row).
5. **Validate & Save** — call backend validation. Save/activate is blocked until
   persistence is implemented (`FEATURE_NOT_IMPLEMENTED`).

### Cell picker tips

- Green-ish cells = scalar bindings; blue-ish = work-item columns.
- Template row is highlighted across the grid.
- Duplicate targets and row mismatches show warnings before backend validate.
- If preview is missing: *“Workbook preview is not available… configure cells manually.”*
- Manual A1 input always works.
- Formula cells show a `ƒ` marker; values are not recalculated in the browser.
- Charts/images are not shown; large sheets are truncated (80×30).

## After activation (future)

When persistence lands:

- Save creates an immutable template version (file in object storage + mapping).
- Activate marks one version as the default custom template.
- New generations use the active custom template; built-in remains fallback.
- Generated file metadata records `templateSource`, `templateVersionId`, sha256.

Until then, generation always uses the built-in Mikoton template.
