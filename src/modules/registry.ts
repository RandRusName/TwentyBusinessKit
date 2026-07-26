/**
 * Module registry for the Mikoton CRM Application modular monolith.
 *
 * This is documentation/metadata for architecture tests and Administration —
 * not a runtime DI container. Package name and Twenty metadata ids stay
 * unchanged for upgrade compatibility.
 */

export type AppModuleId =
  | 'foundation'
  | 'sales'
  | 'catalog'
  | 'documents'
  | 'commercial-proposals'
  | 'administration';

/** @deprecated Prefer AppModuleId; retained for existing callers. */
export type CrmModuleCode = AppModuleId;

export type AppModuleStatus = 'active' | 'supporting' | 'planned';

export type AppModuleDefinition = {
  id: AppModuleId;
  /** Alias of `id` for callers that still use `code`. */
  code: AppModuleId;
  displayName: string;
  description: string;
  owns: string[];
  dependsOn: AppModuleId[];
  /** Alias of `dependsOn` for callers that still use `dependencies`. */
  dependencies: AppModuleId[];
  requiredCapabilities: string[];
  status: AppModuleStatus;
  version: string;
  /** Stable public entrypoint relative to repository root. */
  publicApi: string;
};

export type CrmModuleDefinition = AppModuleDefinition;

export const APP_MODULES: readonly AppModuleDefinition[] = [
  {
    id: 'foundation',
    code: 'foundation',
    displayName: 'Foundation',
    description:
      'Shared platform primitives for errors, identifiers, money, dates, pagination, logging, localization and compatibility.',
    owns: [
      'errors',
      'ids',
      'money',
      'dates',
      'pagination',
      'logging',
      'localization',
      'compatibility',
    ],
    dependsOn: [],
    dependencies: [],
    requiredCapabilities: ['twenty-core-api'],
    status: 'supporting',
    version: '1.0.0',
    publicApi: 'src/modules/foundation/index.ts',
  },
  {
    id: 'sales',
    code: 'sales',
    displayName: 'Sales',
    description:
      'Adapters and contracts around Twenty Company, Person and Opportunity records.',
    owns: ['opportunity-context', 'company-context', 'crm-read-models'],
    dependsOn: ['foundation'],
    dependencies: ['foundation'],
    requiredCapabilities: ['company', 'person', 'opportunity'],
    status: 'active',
    version: '1.0.0',
    publicApi: 'src/modules/sales/index.ts',
  },
  {
    id: 'catalog',
    code: 'catalog',
    displayName: 'Catalog',
    description:
      'Reusable catalog items, selection contracts and catalog query capabilities.',
    owns: ['catalog-items', 'catalog-selection', 'catalog-query'],
    dependsOn: ['foundation'],
    dependencies: ['foundation'],
    requiredCapabilities: ['custom-objects'],
    status: 'active',
    version: '1.0.0',
    publicApi: 'src/modules/catalog/index.ts',
  },
  {
    id: 'documents',
    code: 'documents',
    displayName: 'Documents',
    description:
      'Format-neutral document generation contracts and technical adapters.',
    owns: [
      'generation-request',
      'generation-result',
      'storage-adapters',
      'worker-adapters',
    ],
    dependsOn: ['foundation'],
    dependencies: ['foundation'],
    requiredCapabilities: ['document-service', 'object-storage'],
    status: 'active',
    version: '1.0.0',
    publicApi: 'src/modules/documents/index.ts',
  },
  {
    id: 'commercial-proposals',
    code: 'commercial-proposals',
    displayName: 'Commercial Proposals',
    description:
      'Commercial proposal aggregate, editor, numbering, generation orchestration and generated-file association.',
    owns: [
      'proposal-aggregate',
      'proposal-items',
      'proposal-stages',
      'numbering',
      'editor',
      'generation-command',
    ],
    dependsOn: ['foundation', 'sales', 'catalog', 'documents'],
    dependencies: ['foundation', 'sales', 'catalog', 'documents'],
    requiredCapabilities: ['logic-functions', 'front-components', 'files'],
    status: 'active',
    version: '2.0.0',
    publicApi: 'src/modules/commercial-proposals/index.ts',
  },
  {
    id: 'administration',
    code: 'administration',
    displayName: 'Administration',
    description:
      'Settings design, compatibility checks, installation state, migration state and health diagnostics.',
    owns: [
      'settings-design',
      'compatibility',
      'installation-state',
      'migration-state',
      'health-diagnostics',
    ],
    dependsOn: ['foundation'],
    dependencies: ['foundation'],
    requiredCapabilities: ['application-variables', 'metadata-plan'],
    status: 'supporting',
    version: '1.0.0',
    publicApi: 'src/modules/administration/index.ts',
  },
] as const;

/** @deprecated Prefer APP_MODULES. */
export const CRM_MODULES = APP_MODULES;

export const listAppModules = (): readonly AppModuleDefinition[] => APP_MODULES;

export const getAppModuleById = (id: AppModuleId): AppModuleDefinition => {
  const module = APP_MODULES.find((candidate) => candidate.id === id);
  if (module === undefined) {
    throw new Error(`Unknown CRM module: ${id}`);
  }
  return module;
};

/** @deprecated Prefer getAppModuleById. */
export const getCrmModule = getAppModuleById;

export const listModuleDependencies = (
  id: AppModuleId,
): readonly AppModuleId[] => getAppModuleById(id).dependsOn;
