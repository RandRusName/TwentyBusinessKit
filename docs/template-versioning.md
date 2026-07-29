# Template Versioning

Built-in templates:

```text
templateCode = mikoton-commercial-proposal
templateVersion = 1   # legacy XLSM path
templateVersion = 2   # AGGREGATE_V2 macro-free XLSX
```

Files (built-in):

```text
templates/mikoton-commercial-proposal-v1.xlsm
templates/mikoton-commercial-proposal-v1.mapping.json
```

Rules:

- Never edit the original user-provided workbook directly.
- Add a new `vN` template file for mapping-breaking changes.
- Keep old templates available while generated records reference them.
- Store resolved `templateCode` and `templateVersion` on `CommercialProposal`.
- Store generation file metadata in `resultMetadata`.

## Custom XLSX templates

Users can upload immutable XLSX template versions via the Template Builder.

- Metadata objects: `CommercialProposalXlsxTemplate` / `…Version`
- Binary: object storage (`storageKey` + sha256); no long-term base64 in metadata
- One global ACTIVE version drives generation for new AGGREGATE_V2 proposals
- Built-in v2 remains the fallback when no ACTIVE custom version exists
- Custom XLSX is a render source; response schema still uses
  `templateCode = mikoton-commercial-proposal` / `templateVersion = 2`
- Audit: `templateSource`, `templateVersionId`, `templateFileSha256`,
  `mappingSchemaVersion` on result metadata

Per-proposal template selection is a future P1 task.

See `docs/modules/commercial-proposals/xlsx-template-builder.md`.
