import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const sourceExtensions = new Set(['.ts', '.tsx']);

const KNOWN_MODULES = [
  'foundation',
  'sales',
  'catalog',
  'documents',
  'commercial-proposals',
  'administration',
];

/**
 * Deep imports that remain during incremental migration.
 * Prefer public entrypoints (`src/modules/<id>`). Shrink this list as files move.
 */
const LEGACY_DEEP_IMPORT_ALLOWLIST = new Set([
  // Intra-module wiring is allowed by the public-API rule; keep empty unless
  // an outside consumer still needs a temporary deep path.
]);

const walk = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });

const files = walk(srcRoot).filter((file) =>
  sourceExtensions.has(path.extname(file)),
);
const failures = [];

const importsOf = (source) =>
  [...source.matchAll(/(?:from\s+|import\s*\()['"]([^'"]+)['"]/g)].map(
    (match) => match[1],
  );

const moduleFromPath = (value) => {
  const normalized = value.replaceAll('\\', '/');
  const match = normalized.match(/(?:^|\/)modules\/([^/]+)/);
  const candidate = match?.[1] ?? null;
  if (candidate === null || candidate === 'registry.ts' || candidate === 'registry') {
    return null;
  }
  if (!KNOWN_MODULES.includes(candidate)) {
    return null;
  }
  return candidate;
};

const isPublicModuleImport = (imported, targetModule) => {
  const normalized = imported.replaceAll('\\', '/');
  return (
    normalized === `src/modules/${targetModule}` ||
    normalized === `src/modules/${targetModule}/index` ||
    normalized === `src/modules/${targetModule}/index.ts`
  );
};

const isDeepModuleImport = (imported, targetModule) => {
  const normalized = imported.replaceAll('\\', '/');
  if (!normalized.startsWith(`src/modules/${targetModule}/`)) {
    return false;
  }
  return !isPublicModuleImport(imported, targetModule);
};

const moduleGraph = new Map();
for (const moduleId of KNOWN_MODULES) {
  moduleGraph.set(moduleId, new Set());
}

for (const file of files) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const source = fs.readFileSync(file, 'utf8');
  const imports = importsOf(source);
  const owner = moduleFromPath(relative);

  if (relative.startsWith('src/platform/')) {
    for (const imported of imports) {
      if (imported.startsWith('src/modules/')) {
        failures.push(`${relative}: platform cannot import ${imported}`);
      }
    }
  }

  if (owner !== null) {
    const dependencies = moduleGraph.get(owner) ?? new Set();
    for (const imported of imports) {
      const dependency = moduleFromPath(imported);
      if (dependency !== null && dependency !== owner) {
        dependencies.add(dependency);
      }
    }
    moduleGraph.set(owner, dependencies);
  }

  const reusableModules = [
    'foundation',
    'sales',
    'catalog',
    'documents',
    'administration',
  ];
  if (reusableModules.includes(owner ?? '') || relative.startsWith('src/platform/')) {
    for (const imported of imports) {
      if (
        imported === 'src/modules/commercial-proposals' ||
        imported.startsWith('src/modules/commercial-proposals/')
      ) {
        failures.push(
          `${relative}: ${owner ?? 'platform'} cannot import Commercial Proposals`,
        );
      }
      if (
        imported === 'src/domain/commercial-proposal' ||
        imported.startsWith('src/domain/commercial-proposal/')
      ) {
        failures.push(
          `${relative}: ${owner ?? 'platform'} cannot import proposal legacy domain`,
        );
      }
    }
  }

  for (const imported of imports) {
    const targetModule = moduleFromPath(imported);
    if (targetModule === null) {
      continue;
    }
    if (!isDeepModuleImport(imported, targetModule)) {
      continue;
    }
    // Intra-module deep imports are allowed (application <-> infrastructure).
    if (owner === targetModule) {
      continue;
    }
    const allowKey = `${relative} -> ${imported}`;
    if (LEGACY_DEEP_IMPORT_ALLOWLIST.has(allowKey)) {
      continue;
    }
    failures.push(
      `${relative}: cross-module deep import ${imported} (use src/modules/${targetModule})`,
    );
  }

  if (relative.match(/^src\/modules\/[^/]+\/domain\//)) {
    const forbidden = imports.filter(
      (imported) =>
        imported.startsWith('twenty-sdk') ||
        imported.startsWith('twenty-client-sdk') ||
        imported === 'react' ||
        imported.startsWith('react/'),
    );
    if (forbidden.length > 0 || source.includes('process.env')) {
      failures.push(`${relative}: module domain must stay platform-independent`);
    }
  }
}

const visit = (module, trail = []) => {
  if (trail.includes(module)) {
    failures.push(`module cycle: ${[...trail, module].join(' -> ')}`);
    return;
  }
  for (const dependency of moduleGraph.get(module) ?? []) {
    visit(dependency, [...trail, module]);
  }
};
for (const module of moduleGraph.keys()) visit(module);

const requireText = (relative, expected) => {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  if (!source.includes(expected)) {
    failures.push(`${relative}: missing architecture contract ${expected}`);
  }
};

requireText(
  'src/logic-functions/generate-commercial-proposal.logic-function.ts',
  'src/modules/documents',
);
requireText(
  'src/logic-functions/get-opportunity-context.logic-function.ts',
  'src/modules/sales',
);
requireText(
  'src/logic-functions/search-catalog-items.logic-function.ts',
  'src/modules/catalog',
);

// Registry consistency (parsed without TypeScript execution).
const registryPath = path.join(root, 'src/modules/registry.ts');
const registrySource = fs.readFileSync(registryPath, 'utf8');
const moduleBlockMatches = [
  ...registrySource.matchAll(
    /\{\s*id:\s*'([^']+)'[\s\S]*?dependsOn:\s*\[([^\]]*)\][\s\S]*?status:\s*'([^']+)'[\s\S]*?publicApi:\s*'([^']+)'/g,
  ),
];

if (moduleBlockMatches.length === 0) {
  failures.push('src/modules/registry.ts: could not parse APP_MODULES definitions');
} else {
  const ids = moduleBlockMatches.map((match) => match[1]);
  if (new Set(ids).size !== ids.length) {
    failures.push('src/modules/registry.ts: duplicate module ids');
  }
  for (const expected of KNOWN_MODULES) {
    if (!ids.includes(expected)) {
      failures.push(`src/modules/registry.ts: missing module ${expected}`);
    }
  }

  const dependsOnById = new Map();
  for (const match of moduleBlockMatches) {
    const id = match[1];
    const dependsOn = [...match[2].matchAll(/'([^']+)'/g)].map((item) => item[1]);
    dependsOnById.set(id, dependsOn);
    for (const dependency of dependsOn) {
      if (!ids.includes(dependency)) {
        failures.push(
          `src/modules/registry.ts: ${id} depends on unknown module ${dependency}`,
        );
      }
    }
    const publicApi = match[4];
    if (!fs.existsSync(path.join(root, publicApi))) {
      failures.push(`src/modules/registry.ts: missing public API file ${publicApi}`);
    }
  }

  const proposalDeps = dependsOnById.get('commercial-proposals') ?? [];
  for (const required of ['foundation', 'sales', 'catalog', 'documents']) {
    if (!proposalDeps.includes(required)) {
      failures.push(
        `src/modules/registry.ts: commercial-proposals must depend on ${required}`,
      );
    }
  }

  for (const [id, dependsOn] of dependsOnById.entries()) {
    if (id !== 'commercial-proposals' && dependsOn.includes('commercial-proposals')) {
      failures.push(
        `src/modules/registry.ts: ${id} must not depend on commercial-proposals`,
      );
    }
  }

  const registryVisit = (module, trail = []) => {
    if (trail.includes(module)) {
      failures.push(
        `src/modules/registry.ts: dependency cycle ${[...trail, module].join(' -> ')}`,
      );
      return;
    }
    for (const dependency of dependsOnById.get(module) ?? []) {
      registryVisit(dependency, [...trail, module]);
    }
  };
  for (const id of ids) registryVisit(id);
}

if (failures.length > 0) {
  console.error('Architecture checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Architecture checks passed for ${files.length} TypeScript source files and ${KNOWN_MODULES.length} module boundaries.`,
);
