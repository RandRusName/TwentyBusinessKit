#!/usr/bin/env node

const baseUrl = (process.env.TWENTY_URL || process.env.TWENTY_API_URL || '').replace(
  /\/$/u,
  '',
);

if (!baseUrl) {
  console.error(
    'ERROR: TWENTY_URL or TWENTY_API_URL is required for the Twenty health preflight.',
  );
  process.exit(1);
}

const url = `${baseUrl}/healthz`;

try {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  const text = await response.text();

  if (!response.ok) {
    console.error(`ERROR: HTTP ${response.status} from ${url}`);
    process.exit(1);
  }

  if (!text.includes('"status":"ok"') && !text.includes('"status": "ok"')) {
    console.error(`ERROR: Unexpected health response from ${url}: ${text}`);
    process.exit(1);
  }

  process.stdout.write(text);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ERROR: WSL cannot reach ${url}: ${message}`);
  process.exit(1);
}
