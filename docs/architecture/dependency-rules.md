# Dependency Rules

Allowed module dependencies:

```text
foundation <- sales
foundation <- catalog
foundation <- documents
foundation <- administration
foundation + sales + catalog + documents <- commercial-proposals
```

Forbidden:

- Foundation importing a business module.
- Sales, Catalog, Documents, Administration or platform importing Commercial
  Proposals **or** `src/domain/commercial-proposal`.
- Cycles between modules.
- Module domain code importing React, Twenty SDK, HTTP or `process.env`.
- Cross-module deep imports into another module's `domain` /
  `application` / `infrastructure` (use `src/modules/<module>` only).
- Presentation code importing document-service internals directly.

Ownership notes:

- Foundation owns `ApplicationError` / `ApplicationErrorCode`.
- Sales owns `OpportunityContext`.
- Catalog owns catalog item/search contracts; Commercial Proposals consumes them.
- Documents is a capability consumed by Commercial Proposals
  (`Proposals -> Documents -> worker/storage`).

## Enforcement

`scripts/test-architecture.mjs` checks:

- platform cannot import modules;
- reusable modules cannot import Commercial Proposals;
- import graph cycles;
- domain platform-independence;
- public API boundaries (deep cross-module imports);
- registry consistency (unique ids, known dependencies, public API files,
  commercial-proposals dependency set);
- generation / catalog / Opportunity routes use module public APIs.

The gate may keep a tiny `LEGACY_DEEP_IMPORT_ALLOWLIST` during migration; shrink
it as consumers move to public entrypoints.
