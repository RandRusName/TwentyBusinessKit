import type { XlsxTemplateValueType } from 'src/modules/documents';

export type XlsxTemplateFieldScope = 'scalar' | 'workItems' | 'plan';

export type XlsxTemplateFieldDefinition = {
  path: string;
  label: string;
  valueType: XlsxTemplateValueType;
  scope: XlsxTemplateFieldScope;
  required?: boolean;
};

export const COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_FIELDS = [
  {
    path: 'proposal.id',
    label: 'Proposal ID',
    valueType: 'string',
    scope: 'scalar',
  },
  {
    path: 'proposal.number',
    label: 'Proposal number',
    valueType: 'string',
    scope: 'scalar',
    required: true,
  },
  {
    path: 'proposal.title',
    label: 'Proposal title',
    valueType: 'string',
    scope: 'scalar',
    required: true,
  },
  {
    path: 'proposal.date',
    label: 'Proposal date',
    valueType: 'date',
    scope: 'scalar',
    required: true,
  },
  {
    path: 'proposal.language',
    label: 'Language',
    valueType: 'string',
    scope: 'scalar',
  },
  {
    path: 'proposal.currencyCode',
    label: 'Currency',
    valueType: 'string',
    scope: 'scalar',
    required: true,
  },
  {
    path: 'proposal.validityDays',
    label: 'Validity days',
    valueType: 'integer',
    scope: 'scalar',
  },
  {
    path: 'proposal.amount',
    label: 'Amount',
    valueType: 'money',
    scope: 'scalar',
    required: true,
  },
  {
    path: 'customer.companyId',
    label: 'Customer company ID',
    valueType: 'string',
    scope: 'scalar',
  },
  {
    path: 'customer.companyName',
    label: 'Customer company name',
    valueType: 'string',
    scope: 'scalar',
    required: true,
  },
  {
    path: 'customer.contactName',
    label: 'Contact name',
    valueType: 'string',
    scope: 'scalar',
  },
  {
    path: 'contractor.name',
    label: 'Contractor name',
    valueType: 'string',
    scope: 'scalar',
  },
  {
    path: 'contractor.email',
    label: 'Contractor email',
    valueType: 'string',
    scope: 'scalar',
  },
  {
    path: 'content.contextAndGoal',
    label: 'Context and goal',
    valueType: 'string',
    scope: 'scalar',
  },
  {
    path: 'content.paymentTerms',
    label: 'Payment terms',
    valueType: 'string',
    scope: 'scalar',
  },
  {
    path: 'content.assumptions',
    label: 'Assumptions',
    valueType: 'string',
    scope: 'scalar',
  },
  {
    path: 'content.nextStep',
    label: 'Next step',
    valueType: 'string',
    scope: 'scalar',
  },
  {
    path: 'position',
    label: 'Work item position',
    valueType: 'integer',
    scope: 'workItems',
  },
  {
    path: 'block',
    label: 'Work item block',
    valueType: 'string',
    scope: 'workItems',
  },
  {
    path: 'name',
    label: 'Work item name',
    valueType: 'string',
    scope: 'workItems',
    required: true,
  },
  {
    path: 'description',
    label: 'Work item description',
    valueType: 'string',
    scope: 'workItems',
  },
  {
    path: 'quantity',
    label: 'Quantity',
    valueType: 'number',
    scope: 'workItems',
    required: true,
  },
  {
    path: 'unit',
    label: 'Unit',
    valueType: 'string',
    scope: 'workItems',
  },
  {
    path: 'unitPrice',
    label: 'Unit price',
    valueType: 'money',
    scope: 'workItems',
  },
  {
    path: 'discountPercent',
    label: 'Discount %',
    valueType: 'percent',
    scope: 'workItems',
  },
  {
    path: 'lineAmount',
    label: 'Line amount',
    valueType: 'money',
    scope: 'workItems',
  },
  {
    path: 'currencyCode',
    label: 'Line currency',
    valueType: 'string',
    scope: 'workItems',
  },
  {
    path: 'position',
    label: 'Plan position',
    valueType: 'integer',
    scope: 'plan',
  },
  {
    path: 'title',
    label: 'Plan title',
    valueType: 'string',
    scope: 'plan',
    required: true,
  },
  {
    path: 'result',
    label: 'Plan result',
    valueType: 'string',
    scope: 'plan',
  },
  {
    path: 'duration',
    label: 'Plan duration',
    valueType: 'string',
    scope: 'plan',
  },
  {
    path: 'description',
    label: 'Plan description',
    valueType: 'string',
    scope: 'plan',
  },
] as const satisfies readonly XlsxTemplateFieldDefinition[];

const FIELD_INDEX = new Map(
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_FIELDS.map((field) => [
    `${field.scope}:${field.path}`,
    field as XlsxTemplateFieldDefinition,
  ]),
);

const SCALAR_PATHS: Set<string> = new Set(
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_FIELDS.filter(
    (field) => field.scope === 'scalar',
  ).map((field) => field.path),
);

export const listXlsxTemplateFields = (): XlsxTemplateFieldDefinition[] =>
  COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_FIELDS.map((field) => ({ ...field }));

export const getXlsxTemplateField = (
  path: string,
  scope: XlsxTemplateFieldScope = 'scalar',
): XlsxTemplateFieldDefinition | undefined =>
  FIELD_INDEX.get(`${scope}:${path}`);

export const isAllowedXlsxTemplateFieldPath = (
  path: string,
  scope: XlsxTemplateFieldScope = 'scalar',
): boolean => FIELD_INDEX.has(`${scope}:${path}`);

export const isAllowedScalarXlsxTemplateFieldPath = (path: string): boolean =>
  SCALAR_PATHS.has(path);

export const WORK_ITEMS_COLLECTION_PATH = 'content.workItems' as const;
export const PLAN_COLLECTION_PATH = 'content.plan' as const;

export const scopeForCollectionPath = (
  collectionPath: typeof WORK_ITEMS_COLLECTION_PATH | typeof PLAN_COLLECTION_PATH,
): Exclude<XlsxTemplateFieldScope, 'scalar'> =>
  collectionPath === WORK_ITEMS_COLLECTION_PATH ? 'workItems' : 'plan';
