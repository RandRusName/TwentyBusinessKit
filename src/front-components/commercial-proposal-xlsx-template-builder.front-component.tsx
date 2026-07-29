import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { enqueueSnackbar, useColorScheme } from 'twenty-sdk/front-component';

import { COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_BUILDER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  AppRouteError,
  callAppRoute,
} from 'src/front-components/utils/call-app-route';
import {
  buildMappingFromDrafts,
  collectClientMappingIssues,
  createDefaultScalarBindings,
  createDefaultWorkItemsDraft,
  fileToBase64,
  formatFileSize,
  groupScalarFields,
  listWorkItemFields,
  validateSelectedXlsxFile,
  workbookSheetNames,
  type BuilderStep,
  type ScalarBindingDraft,
  type WorkItemsTableDraft,
} from 'src/front-components/xlsx-template-builder/builder-helpers';
import { getBuilderStyles } from 'src/front-components/xlsx-template-builder/builder-styles';
import {
  buildMappingHighlights,
  describePickerMode,
  findSheet,
  resolveSingleCellNamedRange,
  sheetHasPreview,
  type CellPickerMode,
} from 'src/front-components/xlsx-template-builder/preview-helpers';
import { SpreadsheetPreview } from 'src/front-components/xlsx-template-builder/SpreadsheetPreview';
import type {
  XlsxTemplateMapping,
  XlsxWorkbookMetadata,
} from 'src/modules/documents';
import { parseXlsxA1Cell } from 'src/modules/documents';

type InspectResponse = {
  status: 'success';
  requestId: string;
  sha256: string;
  workbook: XlsxWorkbookMetadata;
};

type ValidateResponse = {
  status: 'success';
  requestId: string;
  valid: true;
  mapping: XlsxTemplateMapping;
  warnings: Array<{ code: string; message: string; path?: string }>;
};

type TemplateVersionSummary = {
  id: string;
  templateId: string;
  version: number;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  displayName: string;
  originalFileName: string;
  fileSha256: string;
  storageKey: string;
  mappingSchemaVersion?: '1.0';
  createdAt: string;
  activatedAt: string | null;
};

type ListTemplatesResponse = {
  status: 'success';
  requestId: string;
  templates: Array<{
    id: string;
    displayName: string;
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
    activeVersionId: string | null;
    updatedAt: string;
    versions: TemplateVersionSummary[];
  }>;
  activeVersion: TemplateVersionSummary | null;
};

type CreateVersionResponse = {
  status: 'success';
  requestId: string;
  templateVersion: TemplateVersionSummary;
};

const STEPS: Array<{ id: BuilderStep; label: string }> = [
  { id: 'upload', label: '1. Upload' },
  { id: 'workbook', label: '2. Workbook' },
  { id: 'scalars', label: '3. Scalar fields' },
  { id: 'workItems', label: '4. Items table' },
  { id: 'validate', label: '5. Validate & Save' },
];

const createLocalId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const CommercialProposalXlsxTemplateBuilder = () => {
  const colorScheme = useColorScheme();
  const styles = getBuilderStyles(colorScheme);
  const scalarGroups = useMemo(() => groupScalarFields(), []);
  const workItemFields = useMemo(() => listWorkItemFields(), []);

  const [step, setStep] = useState<BuilderStep>('upload');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [contentBase64, setContentBase64] = useState<string | null>(null);
  const [workbook, setWorkbook] = useState<XlsxWorkbookMetadata | null>(null);
  const [sha256, setSha256] = useState<string | null>(null);
  const [defaultSheet, setDefaultSheet] = useState('');
  const [scalarBindings, setScalarBindings] = useState<ScalarBindingDraft[]>(
    [],
  );
  const [workItems, setWorkItems] = useState<WorkItemsTableDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [validatedMapping, setValidatedMapping] =
    useState<XlsxTemplateMapping | null>(null);
  const [warnings, setWarnings] = useState<
    Array<{ code: string; message: string; path?: string }>
  >([]);
  const [showAdvancedJson, setShowAdvancedJson] = useState(false);
  const [pickerMode, setPickerMode] = useState<CellPickerMode>({
    kind: 'none',
  });
  const [pickerMessage, setPickerMessage] = useState<string | null>(null);
  const [selectedPreviewCell, setSelectedPreviewCell] = useState<string | null>(
    null,
  );
  const [savedTemplates, setSavedTemplates] = useState<
    ListTemplatesResponse['templates']
  >([]);
  const [activeVersion, setActiveVersion] =
    useState<TemplateVersionSummary | null>(null);
  const [lastSavedVersion, setLastSavedVersion] =
    useState<TemplateVersionSummary | null>(null);

  const loadTemplates = async () => {
    try {
      const response = await callAppRoute<ListTemplatesResponse>(
        '/commercial-proposal-templates/list',
        {},
      );
      setSavedTemplates(response.templates ?? []);
      setActiveVersion(response.activeVersion ?? null);
    } catch {
      // List is informational; builder still works for upload/validate/save.
    }
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  const sheets = workbookSheetNames(workbook);
  const activePreviewSheetName =
    step === 'workItems' && workItems !== null
      ? workItems.sheetName || defaultSheet
      : defaultSheet;
  const activePreviewSheet = findSheet(workbook, activePreviewSheetName);
  const highlightState = useMemo(
    () =>
      buildMappingHighlights({
        sheetName: activePreviewSheetName,
        scalarBindings,
        workItems,
        sheet: activePreviewSheet,
      }),
    [activePreviewSheet, activePreviewSheetName, scalarBindings, workItems],
  );
  const mappingPreview = useMemo(() => {
    if (workItems === null) return null;
    return buildMappingFromDrafts({ scalarBindings, workItems });
  }, [scalarBindings, workItems]);

  const setFileFromInput = async (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0] ?? null;
    setError(null);
    setValidatedMapping(null);
    setWarnings([]);
    setWorkbook(null);
    setSha256(null);
    setContentBase64(null);
    const issue = validateSelectedXlsxFile(next);
    if (issue !== null) {
      setFile(null);
      setError(issue.message);
      return;
    }
    setFile(next);
    if (next !== null && displayName.trim() === '') {
      setDisplayName(next.name.replace(/\.xlsx$/i, ''));
    }
  };

  const inspectWorkbook = async () => {
    setError(null);
    setValidatedMapping(null);
    const issue = validateSelectedXlsxFile(file);
    if (issue !== null || file === null) {
      setError(issue?.message ?? 'Select an .xlsx file');
      return;
    }
    if (displayName.trim() === '') {
      setError('Template display name is required');
      return;
    }

    setBusy(true);
    try {
      const base64 = await fileToBase64(file);
      const response = await callAppRoute<InspectResponse>(
        '/commercial-proposal-templates/inspect-xlsx',
        {
          originalFileName: file.name,
          templateFileBase64: base64,
          contentBase64: base64,
        },
      );

      const firstSheet = response.workbook.sheets[0]?.name ?? '';
      setContentBase64(base64);
      setWorkbook(response.workbook);
      setSha256(response.sha256);
      setRequestId(response.requestId);
      setDefaultSheet(firstSheet);
      setScalarBindings(createDefaultScalarBindings(firstSheet));
      setWorkItems(createDefaultWorkItemsDraft(firstSheet));
      setStep('workbook');
      enqueueSnackbar({
        message: `Workbook inspected (${response.workbook.sheets.length} sheet(s))`,
        variant: 'success',
      });
    } catch (caught) {
      const message =
        caught instanceof AppRouteError
          ? caught.message
          : 'Failed to inspect workbook';
      setError(message);
      if (caught instanceof AppRouteError && caught.diagnostic) {
        setRequestId(null);
      }
    } finally {
      setBusy(false);
    }
  };

  const applyDefaultSheet = (sheetName: string) => {
    setDefaultSheet(sheetName);
    setScalarBindings((current) =>
      current.map((binding) =>
        binding.sheetName.trim() === ''
          ? { ...binding, sheetName: sheetName }
          : binding,
      ),
    );
    setWorkItems((current) =>
      current === null
        ? current
        : {
            ...current,
            sheetName:
              current.sheetName.trim() === '' ? sheetName : current.sheetName,
          },
    );
  };

  const addScalarBinding = () => {
    const firstField = scalarGroups[0]?.fields[0]?.path ?? 'proposal.number';
    setScalarBindings((current) => [
      ...current,
      {
        id: createLocalId(),
        fieldPath: firstField,
        sheetName: defaultSheet,
        cell: '',
      },
    ]);
  };

  const handlePreviewCellClick = (cell: {
    row: number;
    column: number;
    address: string;
  }) => {
    setSelectedPreviewCell(cell.address);
    setPickerMessage(null);

    if (pickerMode.kind === 'scalar') {
      setScalarBindings((current) =>
        current.map((item, index) =>
          index === pickerMode.bindingIndex
            ? {
                ...item,
                sheetName: activePreviewSheetName,
                cell: cell.address,
              }
            : item,
        ),
      );
      setPickerMode({ kind: 'none' });
      return;
    }

    if (pickerMode.kind === 'workItemsColumn' && workItems !== null) {
      if (
        Number.isInteger(workItems.templateRow) &&
        workItems.templateRow > 0 &&
        cell.row !== workItems.templateRow
      ) {
        setPickerMessage(
          `Column cells must belong to the selected template row ${workItems.templateRow}.`,
        );
        return;
      }
      const nextTemplateRow =
        !Number.isInteger(workItems.templateRow) || workItems.templateRow < 1
          ? cell.row
          : workItems.templateRow;
      setWorkItems({
        ...workItems,
        sheetName: activePreviewSheetName,
        templateRow: nextTemplateRow,
        columns: workItems.columns.map((item, index) =>
          index === pickerMode.columnIndex
            ? { ...item, enabled: true, cell: cell.address }
            : item,
        ),
      });
      setPickerMode({ kind: 'none' });
    }
  };

  const handlePreviewRowClick = (row: number) => {
    if (pickerMode.kind !== 'workItemsTemplateRow' || workItems === null) {
      return;
    }
    setWorkItems({
      ...workItems,
      sheetName: activePreviewSheetName,
      templateRow: row,
    });
    setPickerMode({ kind: 'none' });
    setPickerMessage(null);
  };

  const renderPreviewPanel = () => {
    if (workbook === null) {
      return null;
    }
    if (!sheetHasPreview(activePreviewSheet)) {
      return (
        <div style={styles.warning}>
          Workbook preview is not available for this file. You can still
          configure cells manually.
        </div>
      );
    }

    const pickerHint = describePickerMode(pickerMode);

    return (
      <div style={styles.box}>
        <div style={styles.row}>
          <label style={styles.label}>
            Preview sheet
            <select
              style={{ ...styles.select, display: 'block', marginTop: 4 }}
              value={activePreviewSheetName}
              onChange={(event) => {
                if (step === 'workItems' && workItems !== null) {
                  setWorkItems({ ...workItems, sheetName: event.target.value });
                } else {
                  applyDefaultSheet(event.target.value);
                }
              }}
            >
              {sheets.map((sheet) => (
                <option key={sheet} value={sheet}>
                  {sheet}
                </option>
              ))}
            </select>
          </label>
          {pickerHint !== null && (
            <div style={styles.warning}>
              {pickerHint}
              <button
                type="button"
                style={{ ...styles.buttonSecondary, marginLeft: 8 }}
                onClick={() => {
                  setPickerMode({ kind: 'none' });
                  setPickerMessage(null);
                }}
              >
                Cancel pick
              </button>
            </div>
          )}
        </div>
        {pickerMessage !== null && (
          <div style={styles.error}>{pickerMessage}</div>
        )}
        {highlightState.warnings.length > 0 && (
          <div style={styles.warning}>
            {highlightState.warnings.join('\n')}
          </div>
        )}
        {activePreviewSheet !== undefined && (
          <SpreadsheetPreview
            sheet={activePreviewSheet}
            colorScheme={colorScheme}
            selectedCell={selectedPreviewCell}
            highlightedCells={highlightState.highlightedCells}
            tableTemplateRow={
              workItems?.enabled && workItems.sheetName === activePreviewSheetName
                ? workItems.templateRow
                : null
            }
            onCellClick={handlePreviewCellClick}
            onRowClick={handlePreviewRowClick}
          />
        )}
        {(activePreviewSheet?.namedRanges.length ?? 0) > 0 && (
          <div>
            <p style={styles.muted}>Named ranges (single-cell only)</p>
            <div style={styles.row}>
              {activePreviewSheet?.namedRanges.map((named) => {
                const resolved = resolveSingleCellNamedRange(named.refersTo);
                return (
                  <button
                    key={`${named.name}:${named.refersTo}`}
                    type="button"
                    style={styles.buttonSecondary}
                    disabled={resolved === null}
                    title={named.refersTo}
                    onClick={() => {
                      if (resolved === null) return;
                      const parsed = parseXlsxA1Cell(resolved.cell);
                      if (parsed === null) return;
                      handlePreviewCellClick({
                        row: parsed.row,
                        column: 1,
                        address: resolved.cell,
                      });
                    }}
                  >
                    {named.name} → {resolved?.cell ?? 'multi-cell'}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const validateMapping = async () => {
    setError(null);
    setValidatedMapping(null);
    setWarnings([]);
    if (workItems === null || workbook === null) {
      setError('Inspect a workbook before validating');
      return;
    }

    const clientIssues = collectClientMappingIssues({
      scalarBindings,
      workItems,
    });
    if (clientIssues.length > 0) {
      setError(clientIssues.map((issue) => issue.message).join('\n'));
      return;
    }

    const mapping = buildMappingFromDrafts({ scalarBindings, workItems });
    setBusy(true);
    try {
      const response = await callAppRoute<ValidateResponse>(
        '/commercial-proposal-templates/validate-mapping',
        {
          workbook,
          mapping,
        },
      );
      setValidatedMapping(response.mapping);
      setWarnings(response.warnings ?? []);
      setRequestId(response.requestId);
      setStep('validate');
      enqueueSnackbar({
        message: 'Mapping is valid',
        variant: 'success',
      });
    } catch (caught) {
      const message =
        caught instanceof AppRouteError
          ? caught.message
          : 'Mapping validation failed';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const saveVersion = async (activate: boolean) => {
    setError(null);
    if (validatedMapping === null || contentBase64 === null || file === null) {
      setError('Validate the mapping before saving');
      return;
    }
    if (displayName.trim() === '') {
      setError('Display name is required before saving');
      return;
    }

    setBusy(true);
    try {
      const response = await callAppRoute<CreateVersionResponse>(
        '/commercial-proposal-templates/create-version',
        {
          displayName: displayName.trim(),
          description: description.trim() || undefined,
          originalFileName: file.name,
          contentBase64,
          workbook,
          mapping: validatedMapping,
          activate,
          expectedSha256: sha256 ?? undefined,
        },
      );
      setLastSavedVersion(response.templateVersion);
      setRequestId(response.requestId);
      await loadTemplates();
      enqueueSnackbar({
        message: activate
          ? `Saved and activated v${response.templateVersion.version}`
          : `Saved draft v${response.templateVersion.version}`,
        variant: 'success',
      });
    } catch (caught) {
      const message =
        caught instanceof AppRouteError
          ? caught.message
          : 'Failed to save template version';
      setError(message);
      enqueueSnackbar({
        message,
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const activateExistingVersion = async (templateVersionId: string) => {
    setError(null);
    setBusy(true);
    try {
      await callAppRoute('/commercial-proposal-templates/activate', {
        templateVersionId,
      });
      await loadTemplates();
      enqueueSnackbar({
        message: 'Template version activated',
        variant: 'success',
      });
    } catch (caught) {
      const message =
        caught instanceof AppRouteError
          ? caught.message
          : 'Failed to activate template version';
      setError(message);
      enqueueSnackbar({ message, variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.root}>
      <h1 style={styles.title}>Commercial Proposal XLSX templates</h1>
      <p style={styles.muted}>
        Upload a workbook, map proposal fields to cells, validate, then save an
        immutable version. The global ACTIVE version is used for Commercial
        Proposal generation; without one, the built-in template is used.
      </p>

      <div style={styles.box}>
        <h2 style={styles.title}>Active template</h2>
        {activeVersion === null ? (
          <p style={styles.muted}>
            No ACTIVE custom template. Generation uses the built-in
            mikoton-commercial-proposal v2 workbook.
          </p>
        ) : (
          <div style={styles.success}>
            {activeVersion.displayName} · v{activeVersion.version} ·{' '}
            {activeVersion.originalFileName}
            {' · '}
            sha256 {activeVersion.fileSha256.slice(0, 12)}…
            {activeVersion.activatedAt
              ? ` · activated ${activeVersion.activatedAt}`
              : ''}
          </div>
        )}
        {savedTemplates.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <h3 style={{ ...styles.title, fontSize: 14 }}>
              Saved versions
            </h3>
            {savedTemplates.flatMap((template) =>
              template.versions.map((version) => (
                <div
                  key={version.id}
                  style={{
                    ...styles.row,
                    justifyContent: 'space-between',
                    marginBottom: 8,
                    gap: 8,
                  }}
                >
                  <span style={styles.muted}>
                    {template.displayName} v{version.version} ·{' '}
                    {version.status} · {version.originalFileName} ·{' '}
                    {version.fileSha256.slice(0, 8)}…
                  </span>
                  {version.status !== 'ACTIVE' && (
                    <button
                      type="button"
                      style={{
                        ...styles.buttonSecondary,
                        ...(busy ? styles.buttonDisabled : {}),
                      }}
                      disabled={busy}
                      onClick={() => void activateExistingVersion(version.id)}
                    >
                      Activate
                    </button>
                  )}
                </div>
              )),
            )}
          </div>
        )}
      </div>

      <div style={styles.steps}>
        {STEPS.map((item) => (
          <button
            key={item.id}
            type="button"
            style={{
              ...styles.stepChip,
              ...(step === item.id ? styles.stepChipActive : {}),
              ...styles.buttonSecondary,
              padding: '4px 10px',
            }}
            onClick={() => setStep(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error !== null && <div style={styles.error}>{error}</div>}
      {requestId !== null && (
        <p style={styles.muted}>Last requestId: {requestId}</p>
      )}

      {step === 'upload' && (
        <div style={styles.box}>
          <label style={styles.label}>
            Template display name
            <input
              style={{ ...styles.input, width: '100%', marginTop: 4 }}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Mikoton proposal template"
            />
          </label>
          <label style={styles.label}>
            Description (optional)
            <textarea
              style={{
                ...styles.input,
                width: '100%',
                marginTop: 4,
                minHeight: 64,
              }}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label style={styles.label}>
            XLSX file (.xlsx, max 5 MB)
            <input
              style={{ marginTop: 6 }}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={setFileFromInput}
            />
          </label>
          {file !== null && (
            <p style={styles.muted}>
              {file.name} · {formatFileSize(file.size)}
            </p>
          )}
          <div style={styles.row}>
            <button
              type="button"
              style={{
                ...styles.button,
                ...(busy ? styles.buttonDisabled : {}),
              }}
              disabled={busy}
              onClick={() => void inspectWorkbook()}
            >
              {busy ? 'Inspecting…' : 'Inspect workbook'}
            </button>
          </div>
        </div>
      )}

      {step === 'workbook' && workbook !== null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={styles.box}>
            <p style={styles.muted}>SHA-256: {sha256}</p>
            <p style={styles.muted}>File: {file?.name}</p>
            <label style={styles.label}>
              Default sheet
              <select
                style={{ ...styles.select, display: 'block', marginTop: 4 }}
                value={defaultSheet}
                onChange={(event) => applyDefaultSheet(event.target.value)}
              >
                {sheets.map((sheet) => (
                  <option key={sheet} value={sheet}>
                    {sheet}
                  </option>
                ))}
              </select>
            </label>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Sheet</th>
                  <th style={styles.th}>Max row</th>
                  <th style={styles.th}>Max col</th>
                  <th style={styles.th}>Merges</th>
                  <th style={styles.th}>Named ranges</th>
                  <th style={styles.th}>Preview</th>
                </tr>
              </thead>
              <tbody>
                {workbook.sheets.map((sheet) => (
                  <tr key={sheet.name}>
                    <td style={styles.td}>{sheet.name}</td>
                    <td style={styles.td}>{sheet.maxRow}</td>
                    <td style={styles.td}>{sheet.maxColumn}</td>
                    <td style={styles.td}>{sheet.mergedRanges.length}</td>
                    <td style={styles.td}>{sheet.namedRanges.length}</td>
                    <td style={styles.td}>
                      {sheetHasPreview(sheet) ? 'yes' : 'no'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={styles.row}>
              <button
                type="button"
                style={styles.button}
                onClick={() => setStep('scalars')}
              >
                Continue to scalar fields
              </button>
            </div>
          </div>
          {renderPreviewPanel()}
        </div>
      )}

      {step === 'scalars' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={styles.box}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Field</th>
                  <th style={styles.th}>Sheet</th>
                  <th style={styles.th}>Cell</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th} />
                </tr>
              </thead>
              <tbody>
                {scalarBindings.map((binding, index) => {
                  const fieldMeta = scalarGroups
                    .flatMap((group) => group.fields)
                    .find((field) => field.path === binding.fieldPath);
                  return (
                    <tr key={binding.id}>
                      <td style={styles.td}>
                        <select
                          style={styles.select}
                          value={binding.fieldPath}
                          onChange={(event) =>
                            setScalarBindings((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, fieldPath: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        >
                          {scalarGroups.map((group) => (
                            <optgroup key={group.category} label={group.category}>
                              {group.fields.map((field) => (
                                <option key={field.path} value={field.path}>
                                  {field.label} ({field.path})
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </td>
                      <td style={styles.td}>
                        <select
                          style={styles.select}
                          value={binding.sheetName}
                          onChange={(event) =>
                            setScalarBindings((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, sheetName: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        >
                          {sheets.map((sheet) => (
                            <option key={sheet} value={sheet}>
                              {sheet}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.row}>
                          <input
                            style={{ ...styles.input, width: 88 }}
                            value={binding.cell}
                            placeholder="B2"
                            onChange={(event) =>
                              setScalarBindings((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, cell: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                          <button
                            type="button"
                            style={styles.buttonSecondary}
                            onClick={() => {
                              setPickerMode({ kind: 'scalar', bindingIndex: index });
                              setPickerMessage(null);
                              if (binding.sheetName) {
                                applyDefaultSheet(binding.sheetName);
                              }
                            }}
                          >
                            Pick cell
                          </button>
                        </div>
                      </td>
                      <td style={styles.td}>{fieldMeta?.valueType ?? '—'}</td>
                      <td style={styles.td}>
                        <button
                          type="button"
                          style={styles.buttonDanger}
                          onClick={() =>
                            setScalarBindings((current) =>
                              current.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            )
                          }
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={styles.row}>
              <button
                type="button"
                style={styles.buttonSecondary}
                onClick={addScalarBinding}
              >
                Add scalar binding
              </button>
              <button
                type="button"
                style={styles.button}
                onClick={() => setStep('workItems')}
              >
                Continue to items table
              </button>
            </div>
          </div>
          {renderPreviewPanel()}
        </div>
      )}

      {step === 'workItems' && workItems !== null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={styles.box}>
            <label style={styles.label}>
              <input
                type="checkbox"
                checked={workItems.enabled}
                onChange={(event) =>
                  setWorkItems({ ...workItems, enabled: event.target.checked })
                }
              />{' '}
              Enable work items table (`content.workItems`)
            </label>
            {workItems.enabled && (
              <>
                <div style={styles.row}>
                  <label style={styles.label}>
                    Sheet
                    <select
                      style={{
                        ...styles.select,
                        display: 'block',
                        marginTop: 4,
                      }}
                      value={workItems.sheetName}
                      onChange={(event) =>
                        setWorkItems({
                          ...workItems,
                          sheetName: event.target.value,
                        })
                      }
                    >
                      {sheets.map((sheet) => (
                        <option key={sheet} value={sheet}>
                          {sheet}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={styles.label}>
                    Template row
                    <div style={{ ...styles.row, marginTop: 4 }}>
                      <input
                        style={styles.input}
                        type="number"
                        min={1}
                        value={workItems.templateRow}
                        onChange={(event) =>
                          setWorkItems({
                            ...workItems,
                            templateRow: Number(event.target.value),
                          })
                        }
                      />
                      <button
                        type="button"
                        style={styles.buttonSecondary}
                        onClick={() => {
                          setPickerMode({ kind: 'workItemsTemplateRow' });
                          setPickerMessage(null);
                        }}
                      >
                        Pick template row
                      </button>
                    </div>
                  </label>
                  <label style={styles.label}>
                    Minimum rows
                    <select
                      style={{
                        ...styles.select,
                        display: 'block',
                        marginTop: 4,
                      }}
                      value={workItems.minRows}
                      onChange={(event) =>
                        setWorkItems({
                          ...workItems,
                          minRows: Number(event.target.value) as 0 | 1,
                        })
                      }
                    >
                      <option value={0}>0</option>
                      <option value={1}>1</option>
                    </select>
                  </label>
                </div>
                <p style={styles.muted}>
                  Insert mode: insert rows and shift down (fixed)
                </p>
                <label style={styles.label}>
                  <input
                    type="checkbox"
                    checked={workItems.copyStyleFromTemplateRow}
                    onChange={(event) =>
                      setWorkItems({
                        ...workItems,
                        copyStyleFromTemplateRow: event.target.checked,
                      })
                    }
                  />{' '}
                  Copy style from template row
                </label>
                <label style={styles.label}>
                  <input
                    type="checkbox"
                    checked={workItems.preserveFormulas}
                    onChange={(event) =>
                      setWorkItems({
                        ...workItems,
                        preserveFormulas: event.target.checked,
                      })
                    }
                  />{' '}
                  Preserve formulas
                </label>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Use</th>
                      <th style={styles.th}>Work item field</th>
                      <th style={styles.th}>Cell in template row</th>
                      <th style={styles.th}>Required?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workItems.columns.map((column, index) => {
                      const meta = workItemFields.find(
                        (field) => field.path === column.fieldPath,
                      );
                      const required =
                        column.fieldPath === 'name' ||
                        column.fieldPath === 'quantity' ||
                        column.fieldPath === 'unitPrice' ||
                        column.fieldPath === 'lineAmount';
                      return (
                        <tr key={column.fieldPath}>
                          <td style={styles.td}>
                            <input
                              type="checkbox"
                              checked={column.enabled}
                              onChange={(event) =>
                                setWorkItems({
                                  ...workItems,
                                  columns: workItems.columns.map(
                                    (item, itemIndex) =>
                                      itemIndex === index
                                        ? {
                                            ...item,
                                            enabled: event.target.checked,
                                          }
                                        : item,
                                  ),
                                })
                              }
                            />
                          </td>
                          <td style={styles.td}>
                            {meta?.label ?? column.fieldPath} (
                            {column.fieldPath})
                          </td>
                          <td style={styles.td}>
                            <div style={styles.row}>
                              <input
                                style={{ ...styles.input, width: 88 }}
                                value={column.cell}
                                placeholder={`A${workItems.templateRow}`}
                                disabled={!column.enabled}
                                onChange={(event) =>
                                  setWorkItems({
                                    ...workItems,
                                    columns: workItems.columns.map(
                                      (item, itemIndex) =>
                                        itemIndex === index
                                          ? {
                                              ...item,
                                              cell: event.target.value,
                                            }
                                          : item,
                                    ),
                                  })
                                }
                              />
                              <button
                                type="button"
                                style={styles.buttonSecondary}
                                disabled={!column.enabled}
                                onClick={() => {
                                  setPickerMode({
                                    kind: 'workItemsColumn',
                                    columnIndex: index,
                                  });
                                  setPickerMessage(null);
                                }}
                              >
                                Pick cell
                              </button>
                            </div>
                          </td>
                          <td style={styles.td}>
                            {required ? 'yes / either price' : 'optional'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
            <div style={styles.row}>
              <button
                type="button"
                style={{
                  ...styles.button,
                  ...(busy ? styles.buttonDisabled : {}),
                }}
                disabled={busy}
                onClick={() => void validateMapping()}
              >
                {busy ? 'Validating…' : 'Validate mapping'}
              </button>
            </div>
          </div>
          {renderPreviewPanel()}
        </div>
      )}

      {step === 'validate' && (
        <div style={styles.box}>
          {validatedMapping !== null ? (
            <div style={styles.success}>
              Mapping validated. You can save a draft or save and activate.
            </div>
          ) : (
            <div style={styles.warning}>
              Run validation from the Items table step first.
            </div>
          )}
          {lastSavedVersion !== null && (
            <div style={styles.success}>
              Last saved: v{lastSavedVersion.version} ({lastSavedVersion.status}
              ) · {lastSavedVersion.storageKey}
            </div>
          )}
          {warnings.length > 0 && (
            <div style={styles.warning}>
              {warnings
                .map((warning) => `${warning.code}: ${warning.message}`)
                .join('\n')}
            </div>
          )}
          <button
            type="button"
            style={styles.buttonSecondary}
            onClick={() => setShowAdvancedJson((value) => !value)}
          >
            {showAdvancedJson ? 'Hide' : 'Show'} mapping JSON
          </button>
          {showAdvancedJson && mappingPreview !== null && (
            <pre style={styles.code}>
              {JSON.stringify(mappingPreview, null, 2)}
            </pre>
          )}
          <div style={styles.row}>
            <button
              type="button"
              style={{
                ...styles.button,
                ...(busy ? styles.buttonDisabled : {}),
              }}
              disabled={busy}
              onClick={() => void validateMapping()}
            >
              Validate mapping
            </button>
            <button
              type="button"
              style={{
                ...styles.buttonSecondary,
                ...(busy || validatedMapping === null
                  ? styles.buttonDisabled
                  : {}),
              }}
              disabled={busy || validatedMapping === null}
              onClick={() => void saveVersion(false)}
            >
              Save as draft
            </button>
            <button
              type="button"
              style={{
                ...styles.buttonSecondary,
                ...(busy || validatedMapping === null
                  ? styles.buttonDisabled
                  : {}),
              }}
              disabled={busy || validatedMapping === null}
              onClick={() => void saveVersion(true)}
            >
              Save and activate
            </button>
          </div>
          <p style={styles.muted}>
            Save stores the XLSX in object storage and keeps only storageKey +
            sha256 + mapping in metadata. Activating sets the global ACTIVE
            template used by generation.
          </p>
        </div>
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier:
    COMMERCIAL_PROPOSAL_XLSX_TEMPLATE_BUILDER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'Commercial Proposal XLSX Template Builder',
  description:
    'Upload and map XLSX templates for Commercial Proposal document generation',
  component: CommercialProposalXlsxTemplateBuilder,
});
