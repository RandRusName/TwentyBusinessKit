import { defineObject, FieldType, RelationType } from 'twenty-sdk/define';

import {
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_FIELD_VERSIONS_UNIVERSAL_IDENTIFIER,
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_ACTIVATED_AT_UNIVERSAL_IDENTIFIER,
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_DESCRIPTION_UNIVERSAL_IDENTIFIER,
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_DISPLAY_NAME_UNIVERSAL_IDENTIFIER,
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_FILE_SHA256_UNIVERSAL_IDENTIFIER,
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_MAPPING_UNIVERSAL_IDENTIFIER,
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_ORIGINAL_FILE_NAME_UNIVERSAL_IDENTIFIER,
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_STATUS_UNIVERSAL_IDENTIFIER,
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_STORAGE_KEY_UNIVERSAL_IDENTIFIER,
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_TEMPLATE_UNIVERSAL_IDENTIFIER,
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_VERSION_UNIVERSAL_IDENTIFIER,
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_WORKBOOK_METADATA_UNIVERSAL_IDENTIFIER,
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineObject({
  universalIdentifier:
    COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'commercialProposalXlsxTemplateVersion',
  namePlural: 'commercialProposalXlsxTemplateVersions',
  labelSingular: 'XLSX template version',
  labelPlural: 'XLSX template versions',
  description:
    'Immutable Commercial Proposal XLSX template version (storageKey + mapping)',
  icon: 'IconVersions',
  isSearchable: false,
  isUICreatable: false,
  isUIEditable: false,
  labelIdentifierFieldMetadataUniversalIdentifier:
    COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_DISPLAY_NAME_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier:
        COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_TEMPLATE_UNIVERSAL_IDENTIFIER,
      type: FieldType.RELATION,
      name: 'template',
      label: 'Template',
      description: 'Parent template family',
      isNullable: false,
      isUIEditable: false,
      relationTargetObjectMetadataUniversalIdentifier:
        COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
      relationTargetFieldMetadataUniversalIdentifier:
        COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_FIELD_VERSIONS_UNIVERSAL_IDENTIFIER,
      universalSettings: {
        relationType: RelationType.MANY_TO_ONE,
        joinColumnName: 'templateId',
      },
    },
    {
      universalIdentifier:
        COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_VERSION_UNIVERSAL_IDENTIFIER,
      type: FieldType.NUMBER,
      name: 'version',
      label: 'Version',
      description: 'Monotonic version number within the template family',
      defaultValue: 1,
      isNullable: false,
      isUIEditable: false,
      universalSettings: {
        decimals: 0,
      },
    },
    {
      universalIdentifier:
        COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_STATUS_UNIVERSAL_IDENTIFIER,
      type: FieldType.SELECT,
      name: 'status',
      label: 'Status',
      description: 'DRAFT, ACTIVE, or ARCHIVED version status',
      defaultValue: "'DRAFT'",
      isNullable: false,
      isUIEditable: false,
      options: [
        { position: 0, label: 'Draft', value: 'DRAFT', color: 'gray' },
        { position: 1, label: 'Active', value: 'ACTIVE', color: 'green' },
        { position: 2, label: 'Archived', value: 'ARCHIVED', color: 'orange' },
      ],
    },
    {
      universalIdentifier:
        COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_DISPLAY_NAME_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'displayName',
      label: 'Display name',
      description: 'Display name captured at upload time',
      defaultValue: "''",
      isNullable: false,
      isUIEditable: false,
    },
    {
      universalIdentifier:
        COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_DESCRIPTION_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'description',
      label: 'Description',
      description: 'Optional description captured at upload time',
      isNullable: true,
      defaultValue: null,
      isUIEditable: false,
    },
    {
      universalIdentifier:
        COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_ORIGINAL_FILE_NAME_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'originalFileName',
      label: 'Original file name',
      description: 'Original uploaded .xlsx file name',
      defaultValue: "''",
      isNullable: false,
      isUIEditable: false,
    },
    {
      universalIdentifier:
        COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_FILE_SHA256_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'fileSha256',
      label: 'File SHA-256',
      description: 'SHA-256 of the stored XLSX binary',
      defaultValue: "''",
      isNullable: false,
      isUIEditable: false,
    },
    {
      universalIdentifier:
        COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_STORAGE_KEY_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'storageKey',
      label: 'Storage key',
      description: 'Object-storage key for the immutable XLSX binary',
      defaultValue: "''",
      isNullable: false,
      isUIEditable: false,
    },
    {
      universalIdentifier:
        COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_WORKBOOK_METADATA_UNIVERSAL_IDENTIFIER,
      type: FieldType.RAW_JSON,
      name: 'workbookMetadata',
      label: 'Workbook metadata',
      description: 'Inspected workbook metadata captured at upload',
      isNullable: true,
      defaultValue: null,
      isUIEditable: false,
    },
    {
      universalIdentifier:
        COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_MAPPING_UNIVERSAL_IDENTIFIER,
      type: FieldType.RAW_JSON,
      name: 'mapping',
      label: 'Mapping',
      description: 'Immutable field-to-cell mapping for this version',
      isNullable: true,
      defaultValue: null,
      isUIEditable: false,
    },
    {
      universalIdentifier:
        COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_ACTIVATED_AT_UNIVERSAL_IDENTIFIER,
      type: FieldType.DATE_TIME,
      name: 'activatedAt',
      label: 'Activated at',
      description: 'When this version became the global ACTIVE template',
      isNullable: true,
      defaultValue: null,
      isUIEditable: false,
    },
  ],
});
