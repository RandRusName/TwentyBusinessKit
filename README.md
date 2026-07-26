# Mikoton CRM Application (TwentyBusinessKit)

One installable **Twenty App** implemented as a modular monolith.

Commercial Proposals is the first production business module — not the product
boundary. Package name `mikoton-commercial-proposals` and universal identifiers
stay unchanged for upgrade compatibility.

```text
Twenty Core
  -> CRM Application
       -> Foundation
       -> Sales
       -> Catalog
       -> Commercial Proposals
       -> Documents
       -> Administration
```

See `docs/architecture/README.md` and `docs/modules/README.md`.

## Current modules

| Module | Status |
|---|---|
| Foundation | supporting |
| Sales | active |
| Catalog | active |
| Commercial Proposals | active (first production module) |
| Documents | active |
| Administration | supporting |

Detailed Commercial Proposals behavior:
[`docs/modules/commercial-proposals.md`](docs/modules/commercial-proposals.md).

XLSX template builder:
[`docs/modules/commercial-proposals/xlsx-template-builder.md`](docs/modules/commercial-proposals/xlsx-template-builder.md).

How to add a module:
[`docs/architecture/new-module-guide.md`](docs/architecture/new-module-guide.md).

## Versions

- App: see `package.json`
- Twenty Server: `v2.20.0`
- `twenty-sdk@2.20.0` / `twenty-client-sdk@2.20.0`
- Target instance: `$TWENTY_API_URL` (example
  `https://your-twenty-instance.example`)

## Distribution status

This repository is public, but the application is distributed as a **private
Twenty App** for controlled internal deployment. It is not published to the
public Twenty Marketplace yet.

Phase 5.5 corrective hardening is implemented. Restricted-user and controlled
rollback evidence remains open, so the evidence-based verdict is
**NOT READY FOR PRODUCTION USE**. See
`docs/phase-5-5-production-acceptance.md`.

## Local checks

Use `yarn.cmd` on Windows PowerShell if script execution blocks `yarn.ps1`.

```powershell
yarn.cmd install --immutable
yarn.cmd lint
yarn.cmd typecheck
yarn.cmd test:architecture
yarn.cmd test:unit
yarn.cmd test:document-service
yarn.cmd test:secrets
yarn.cmd test:private-urls
yarn.cmd twenty dev:build .
```

Architecture boundaries are enforced by `yarn test:architecture` (also run in
CI before unit tests).

For a production-ready private tarball, prefer the WSL build (Windows
`yarn twenty dev:build --tarball .` can write Windows path separators into
`manifest.json`):

```cmd
build.bat
build.bat --clean
```

## Private deployment overview

GitHub Actions must not deploy to the internal target or receive its API key.

```cmd
deploy.bat
```

Configure `TWENTY_API_URL` (and optional remote) before deploy — see
`docs/private-deployment.md`. Full runbooks:
`docs/tarball-build.md`, `docs/upgrade.md`, `docs/rollback.md`.

## Not in this phase

- DOCX generation
- public Marketplace distribution
- Company entry point
- CPQ features

## Further reading

- Architecture: `docs/architecture/`
- Modules: `docs/modules/`
- Document service: `docs/document-service-runbook.md`
- Security: `docs/security.md`
- Testing: `docs/testing.md`
