# Documents

Format-neutral document generation contracts and technical adapters to the
external document-service / storage stack.

## Status

`active` — generation port and HTTP adapter are available. Worker internals
(MinIO, LibreOffice, credentials) must not leak into proposal domain code.

Also exports XLSX A1 helpers, structural template-mapping schema, inspect port
types, and `CustomXlsxTemplateRenderConfig` for optional custom-template
generation. Business field allowlists live in Commercial Proposals.

## Public API

Import only from `src/modules/documents`.
