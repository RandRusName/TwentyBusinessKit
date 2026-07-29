import { defineObject, FieldType, RelationType } from 'twenty-sdk/define';

import {
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_FIELD_ACTIVE_VERSION_ID_UNIVERSAL_IDENTIFIER,
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_FIELD_DESCRIPTION_UNIVERSAL_IDENTIFIER,
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_FIELD_DISPLAY_NAME_UNIVERSAL_IDENTIFIER,
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_FIELD_STATUS_UNIVERSAL_IDENTIFIER,
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_FIELD_VERSIONS_UNIVERSAL_IDENTIFIER,
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_TEMPLATE_UNIVERSAL_IDENTIFIER,
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineObject({
  universalIdentifier:
    COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'commercialProposalXlsxTemplate',
  namePlural: 'commercialProposalXlsxTemplates',
  labelSingular: 'XLSX template',
  labelPlural: 'XLSX templates',
  description:
    'Logical Commercial Proposal XLSX template family with immutable versions',
  icon: 'IconFileSpreadsheet',
  isSearchable: false,
  isUICreatable: false,
  isUIEditable: false,
  labelIdentifierFieldMetadataUniversalIdentifier:
    COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_FIELD_DISPLAY_NAME_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier:
        COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_FIELD_DISPLAY_NAME_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'displayName',
      label: 'Display name',
      description: 'Human-readable template family name',
      defaultValue: "''",
      isNullable: false,
      isUIEditable: false,
    },
    {
      universalIdentifier:
        COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_FIELD_DESCRIPTION_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'description',
      label: 'Description',
      description: 'Optional template family description',
      isNullable: true,
      defaultValue: null,
      isUIEditable: false,
    },
    {
      universalIdentifier:
        COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_FIELD_STATUS_UNIVERSAL_IDENTIFIER,
      type: FieldType.SELECT,
      name: 'status',
      label: 'Status',
      description: 'DRAFT, ACTIVE, or ARCHIVED template family status',
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
        COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_FIELD_ACTIVE_VERSION_ID_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'activeVersionId',
      label: 'Active version id',
      description:
        'Id of the currently ACTIVE immutable version for this family',
      isNullable: true,
      defaultValue: null,
      isUIEditable: false,
    },
    {
      universalIdentifier:
        COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_FIELD_VERSIONS_UNIVERSAL_IDENTIFIER,
      type: FieldType.RELATION,
      name: 'versions',
      label: 'Versions',
      description: 'Immutable uploaded versions of this template',
      isNullable: true,
      relationTargetObjectMetadataUniversalIdentifier:
        COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_OBJECT_UNIVERSAL_IDENTIFIER,
      relationTargetFieldMetadataUniversalIdentifier:
        COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_VERSION_FIELD_TEMPLATE_UNIVERSAL_IDENTIFIER,
      universalSettings: {
        relationType: RelationType.ONE_TO_MANY,
      },
    },
  ],
});
