import { CoreApiClient } from 'twenty-client-sdk/core';

import type {
  CreateXlsxTemplateVersionInput,
  XlsxTemplateRepository,
  XlsxTemplateSummary,
  XlsxTemplateVersionDetail,
  XlsxTemplateVersionSummary,
} from 'src/modules/commercial-proposals/application/xlsx-template-repository';
import type {
  CommercialProposalXlsxTemplateStatus,
} from 'src/modules/commercial-proposals/domain/templates/xlsx-template-version';
import { ApplicationError } from 'src/modules/foundation';
import type {
  XlsxTemplateMapping,
  XlsxWorkbookMetadata,
} from 'src/modules/documents';

type CoreClient = InstanceType<typeof CoreApiClient>;

type TemplateRecord = {
  id: string;
  displayName?: string | null;
  description?: string | null;
  status?: CommercialProposalXlsxTemplateStatus | null;
  activeVersionId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type VersionRecord = {
  id: string;
  templateId?: string | null;
  template?: { id?: string | null } | null;
  version?: number | null;
  status?: CommercialProposalXlsxTemplateStatus | null;
  displayName?: string | null;
  description?: string | null;
  originalFileName?: string | null;
  fileSha256?: string | null;
  storageKey?: string | null;
  workbookMetadata?: XlsxWorkbookMetadata | null;
  mapping?: XlsxTemplateMapping | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  activatedAt?: string | null;
};

const VERSION_SELECTION = {
  id: true,
  version: true,
  status: true,
  displayName: true,
  description: true,
  originalFileName: true,
  fileSha256: true,
  storageKey: true,
  workbookMetadata: true,
  mapping: true,
  createdAt: true,
  updatedAt: true,
  activatedAt: true,
  templateId: true,
  template: { id: true },
} as const;

const TEMPLATE_SELECTION = {
  id: true,
  displayName: true,
  description: true,
  status: true,
  activeVersionId: true,
  createdAt: true,
  updatedAt: true,
} as const;

const toSummary = (record: VersionRecord): XlsxTemplateVersionSummary => ({
  id: record.id,
  templateId: record.template?.id ?? record.templateId ?? '',
  version: record.version ?? 0,
  status: record.status ?? 'DRAFT',
  displayName: record.displayName ?? '',
  originalFileName: record.originalFileName ?? '',
  fileSha256: record.fileSha256 ?? '',
  storageKey: record.storageKey ?? '',
  mappingSchemaVersion: '1.0',
  createdAt: record.createdAt ?? '',
  activatedAt: record.activatedAt ?? null,
});

const toDetail = (record: VersionRecord): XlsxTemplateVersionDetail => {
  if (
    record.mapping === null ||
    record.mapping === undefined ||
    record.workbookMetadata === null ||
    record.workbookMetadata === undefined
  ) {
    throw new ApplicationError(
      'COMMERCIAL_PROPOSAL_DATA_INTEGRITY_ERROR',
      'XLSX template version is missing mapping or workbook metadata',
    );
  }

  return {
    ...toSummary(record),
    mapping: record.mapping,
    workbookMetadata: record.workbookMetadata,
    description: record.description ?? null,
  };
};

/**
 * Best-effort activation across non-transactional Twenty metadata writes.
 * Remaining risk: concurrent activate calls may briefly leave multiple ACTIVE
 * rows until the next successful activate/create with activate=true.
 */
export class TwentyXlsxTemplateRepository implements XlsxTemplateRepository {
  constructor(private readonly client: CoreClient = new CoreApiClient()) {}

  async createVersion(
    input: CreateXlsxTemplateVersionInput,
  ): Promise<XlsxTemplateVersionDetail> {
    const displayName = input.displayName.trim();
    if (displayName === '') {
      throw new ApplicationError('INVALID_INPUT', 'displayName is required');
    }

    let template = await this.findTemplateByDisplayName(displayName);
    if (template === null) {
      const created = await this.client.mutation({
        createCommercialProposalXlsxTemplate: {
          __args: {
            data: {
              displayName,
              description: input.description ?? null,
              status: 'DRAFT',
              activeVersionId: null,
            },
          },
          ...TEMPLATE_SELECTION,
        },
      });
      template = created.createCommercialProposalXlsxTemplate as TemplateRecord;
    }

    const existingVersions = await this.listVersionsForTemplate(template.id);
    const nextVersion =
      existingVersions.reduce(
        (max, version) => Math.max(max, version.version ?? 0),
        0,
      ) + 1;

    const createdVersion = await this.client.mutation({
      createCommercialProposalXlsxTemplateVersion: {
        __args: {
          data: {
            templateId: template.id,
            version: nextVersion,
            status: 'DRAFT',
            displayName,
            description: input.description ?? null,
            originalFileName: input.originalFileName,
            fileSha256: input.fileSha256,
            storageKey: input.storageKey,
            workbookMetadata: input.workbookMetadata,
            mapping: input.mapping,
            activatedAt: null,
          },
        },
        ...VERSION_SELECTION,
      },
    });

    const version = toDetail(
      createdVersion.createCommercialProposalXlsxTemplateVersion as VersionRecord,
    );

    if (input.activate) {
      return this.activateVersion(version.id);
    }

    return version;
  }

  async listTemplates(): Promise<XlsxTemplateSummary[]> {
    const templates = await this.listAllTemplates();
    const versions = await this.listAllVersions();
    const versionsByTemplate = new Map<string, XlsxTemplateVersionSummary[]>();

    for (const version of versions) {
      const summary = toSummary(version);
      const list = versionsByTemplate.get(summary.templateId) ?? [];
      list.push(summary);
      versionsByTemplate.set(summary.templateId, list);
    }

    return templates.map((template) => ({
      id: template.id,
      displayName: template.displayName ?? '',
      status: template.status ?? 'DRAFT',
      activeVersionId: template.activeVersionId ?? null,
      updatedAt: template.updatedAt ?? '',
      versions: (versionsByTemplate.get(template.id) ?? []).sort(
        (left, right) => right.version - left.version,
      ),
    }));
  }

  async activateVersion(
    templateVersionId: string,
  ): Promise<XlsxTemplateVersionDetail> {
    const target = await this.getVersion(templateVersionId);
    if (target === null) {
      throw new ApplicationError(
        'XLSX_TEMPLATE_NOT_FOUND',
        'XLSX template version was not found',
      );
    }

    const nowIso = new Date().toISOString();
    const activeVersions = await this.listActiveVersions();

    for (const active of activeVersions) {
      if (active.id === target.id) continue;
      await this.client.mutation({
        updateCommercialProposalXlsxTemplateVersion: {
          __args: {
            id: active.id,
            data: {
              status: 'ARCHIVED',
            },
          },
          id: true,
        },
      });

      const parentId = active.template?.id ?? active.templateId;
      if (parentId !== undefined && parentId !== null && parentId !== target.templateId) {
        await this.client.mutation({
          updateCommercialProposalXlsxTemplate: {
            __args: {
              id: parentId,
              data: {
                status: 'ARCHIVED',
                activeVersionId: null,
              },
            },
            id: true,
          },
        });
      }
    }

    await this.client.mutation({
      updateCommercialProposalXlsxTemplateVersion: {
        __args: {
          id: target.id,
          data: {
            status: 'ACTIVE',
            activatedAt: nowIso,
          },
        },
        id: true,
      },
    });

    await this.client.mutation({
      updateCommercialProposalXlsxTemplate: {
        __args: {
          id: target.templateId,
          data: {
            status: 'ACTIVE',
            activeVersionId: target.id,
          },
        },
        id: true,
      },
    });

    const refreshed = await this.getVersion(target.id);
    if (refreshed === null) {
      throw new ApplicationError(
        'XLSX_TEMPLATE_NOT_FOUND',
        'XLSX template version was not found after activation',
      );
    }
    return refreshed;
  }

  async getActiveVersion(): Promise<XlsxTemplateVersionDetail | null> {
    const actives = await this.listActiveVersions();
    if (actives.length === 0) {
      return null;
    }
    // Prefer the most recently activated when multiple exist (best-effort).
    const sorted = [...actives].sort((left, right) => {
      const leftAt = left.activatedAt ?? left.createdAt ?? '';
      const rightAt = right.activatedAt ?? right.createdAt ?? '';
      return rightAt.localeCompare(leftAt);
    });
    return toDetail(sorted[0]!);
  }

  async getVersion(
    templateVersionId: string,
  ): Promise<XlsxTemplateVersionDetail | null> {
    const response = await this.client.query({
      commercialProposalXlsxTemplateVersion: {
        __args: {
          filter: {
            id: { eq: templateVersionId },
          },
        },
        ...VERSION_SELECTION,
      },
    });

    const record = response.commercialProposalXlsxTemplateVersion as
      | VersionRecord
      | null
      | undefined;
    if (record === null || record === undefined) {
      return null;
    }
    return toDetail(record);
  }

  private async findTemplateByDisplayName(
    displayName: string,
  ): Promise<TemplateRecord | null> {
    const response = await this.client.query({
      commercialProposalXlsxTemplates: {
        __args: {
          first: 1,
          filter: {
            displayName: { eq: displayName },
          },
        },
        edges: {
          node: TEMPLATE_SELECTION,
        },
      },
    });

    const connection = response.commercialProposalXlsxTemplates as {
      edges?: Array<{ node?: TemplateRecord | null } | null>;
    };
    return connection.edges?.[0]?.node ?? null;
  }

  private async listVersionsForTemplate(
    templateId: string,
  ): Promise<VersionRecord[]> {
    const response = await this.client.query({
      commercialProposalXlsxTemplateVersions: {
        __args: {
          first: 200,
          filter: {
            templateId: { eq: templateId },
          },
        },
        edges: {
          node: VERSION_SELECTION,
        },
      },
    });

    const connection = response.commercialProposalXlsxTemplateVersions as {
      edges?: Array<{ node?: VersionRecord | null } | null>;
    };
    return (connection.edges ?? [])
      .map((edge) => edge?.node)
      .filter((node): node is VersionRecord => node !== null && node !== undefined);
  }

  private async listAllTemplates(): Promise<TemplateRecord[]> {
    const response = await this.client.query({
      commercialProposalXlsxTemplates: {
        __args: {
          first: 200,
        },
        edges: {
          node: TEMPLATE_SELECTION,
        },
      },
    });
    const connection = response.commercialProposalXlsxTemplates as {
      edges?: Array<{ node?: TemplateRecord | null } | null>;
    };
    return (connection.edges ?? [])
      .map((edge) => edge?.node)
      .filter((node): node is TemplateRecord => node !== null && node !== undefined);
  }

  private async listAllVersions(): Promise<VersionRecord[]> {
    const response = await this.client.query({
      commercialProposalXlsxTemplateVersions: {
        __args: {
          first: 500,
        },
        edges: {
          node: VERSION_SELECTION,
        },
      },
    });
    const connection = response.commercialProposalXlsxTemplateVersions as {
      edges?: Array<{ node?: VersionRecord | null } | null>;
    };
    return (connection.edges ?? [])
      .map((edge) => edge?.node)
      .filter((node): node is VersionRecord => node !== null && node !== undefined);
  }

  private async listActiveVersions(): Promise<VersionRecord[]> {
    const response = await this.client.query({
      commercialProposalXlsxTemplateVersions: {
        __args: {
          first: 50,
          filter: {
            status: { eq: 'ACTIVE' },
          },
        },
        edges: {
          node: VERSION_SELECTION,
        },
      },
    });
    const connection = response.commercialProposalXlsxTemplateVersions as {
      edges?: Array<{ node?: VersionRecord | null } | null>;
    };
    return (connection.edges ?? [])
      .map((edge) => edge?.node)
      .filter((node): node is VersionRecord => node !== null && node !== undefined);
  }
}
