# Documents

Format-neutral document generation contracts and technical adapters to the
external document-service / storage stack.

## Status

`active` — generation port and HTTP adapter are available. Worker internals
(MinIO, LibreOffice, credentials) must not leak into proposal domain code.

## Public API

Import only from `src/modules/documents`.
