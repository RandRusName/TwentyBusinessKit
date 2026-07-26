# Setup

## Prerequisites

- Node.js compatible with `.nvmrc` and `package.json`.
- Yarn 4.
- Network access to the target Twenty instance (`$TWENTY_API_URL`).
- API key from the target Twenty workspace.

Example historical verification (2026-07-12) against the internal target
configured via `$TWENTY_API_URL`:

- `GET $TWENTY_API_URL/healthz` returned `200`.
- `GET $TWENTY_API_URL/client-config` returned `appVersion: v2.20.0`.
- `isWorkspaceSchemaDDLLocked: false`.

## Install

```powershell
yarn.cmd install
```

Dependencies are pinned to Twenty `2.20.0` in `package.json`.

## Authenticate Remote

The target server does not expose a CLI OAuth client id, so the CLI requires an
API key:

```powershell
yarn.cmd twenty remote:add --as mikoton-remote --url $env:TWENTY_API_URL --api-key "<TWENTY_API_KEY>"
yarn.cmd twenty remote:use mikoton-remote
```

Do not commit API keys or `.env` files. See `.env.example` for the expected
local variables.

## Safe Metadata Preview

Run a plan before any apply:

```powershell
yarn.cmd twenty plan -r mikoton-remote .
```

If the plan contains destructive changes, stop and review it before applying.

## Apply

Only after a clean plan:

```powershell
yarn.cmd twenty apply -r mikoton-remote .
```

For local development with automatic sync:

```powershell
yarn.cmd twenty dev -r mikoton-remote .
```
