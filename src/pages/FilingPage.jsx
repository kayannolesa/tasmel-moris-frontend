import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  ClipboardCheck,
  FileCheck2,
  FilePlus2,
  GitBranch,
  ListFilter,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  DataTable,
  Field,
  FormAlert,
  MetricTile,
  ModuleTabs,
  PageHeader,
  SelectField,
} from "../components/common/WorkspacePrimitives.jsx";
import StatusPill from "../components/common/StatusPill.jsx";
import { apiRequest } from "../services/api.js";
import { compactCode, formatDate, formatDateTime, formatMoney, formatNumber } from "../utils/format.js";

const tabs = [
  { id: "workbench", label: "Declaration Workbench" },
  { id: "lodge", label: "Lodge Declaration" },
  { id: "detail", label: "Review Detail" },
  { id: "amend", label: "Amendments" },
];

const initialFilters = {
  q: "",
  subject_uid: "",
  revenue_kind_uid: "",
  declaration_state_cd: "",
  due_from_dt: "",
  due_to_dt: "",
  period_label_txt: "",
};

const initialLodgement = {
  subject_uid: "",
  revenue_kind_uid: "",
  due_instance_uid: "",
  period_instance_uid: "",
  form_blueprint_uid: "",
  lodgement_channel_cd: "COUNTER",
  declared_total_amt: "",
  workflow_action_cd: "VALIDATE",
  reason_txt: "",
};

const initialItems = [
  { item_code: "DECLARED_AMOUNT", item_value_num: "", item_value_txt: "" },
  { item_code: "TAX_PAYABLE", item_value_num: "", item_value_txt: "" },
];

const initialStateAction = {
  workflow_action_cd: "ACCEPT",
  reason_txt: "",
};

const initialAmendment = {
  amendment_reason_cd: "CORRECTION",
  amendment_reason_txt: "",
  declared_total_amt: "",
  workflow_action_cd: "VALIDATE",
};

function stripEmpty(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== "" && value !== undefined && value !== null));
}

function buildQuery(record) {
  const params = new URLSearchParams();
  Object.entries(stripEmpty(record)).forEach(([key, value]) => params.set(key, value));
  return params.toString();
}

function declarationTone(state) {
  if (state === "ACCEPTED" || state === "VALIDATED") return "success";
  if (state === "REQUIRES_REVIEW" || state === "SUBMITTED") return "warning";
  if (state === "REJECTED") return "danger";
  if (state === "AMENDED") return "neutral";
  return "neutral";
}

function validationTone(level) {
  if (level === "ERROR") return "danger";
  if (level === "WARNING") return "warning";
  return "success";
}

function dueTone(state) {
  if (state === "FILED" || state === "PAID" || state === "ASSESSED") return "success";
  if (state === "OVERDUE") return "danger";
  if (state === "NOTIFIED") return "warning";
  return "neutral";
}

export default function FilingPage() {
  const [activeTab, setActiveTab] = useState("workbench");
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [lookups, setLookups] = useState({});
  const [dues, setDues] = useState([]);
  const [formItems, setFormItems] = useState([]);
  const [lodgements, setLodgements] = useState([]);
  const [declarations, setDeclarations] = useState([]);
  const [declarationPage, setDeclarationPage] = useState(null);
  const [selectedDeclaration, setSelectedDeclaration] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [lodgementForm, setLodgementForm] = useState(initialLodgement);
  const [items, setItems] = useState(initialItems);
  const [stateAction, setStateAction] = useState(initialStateAction);
  const [amendmentForm, setAmendmentForm] = useState(initialAmendment);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredDues = useMemo(
    () =>
      dues.filter((due) => {
        const openState = ["OPEN", "NOTIFIED", "OVERDUE"].includes(due.due_state_cd);
        const subjectMatch = !lodgementForm.subject_uid || due.subject_uid === lodgementForm.subject_uid;
        const revenueMatch = !lodgementForm.revenue_kind_uid || due.revenue_kind_uid === lodgementForm.revenue_kind_uid;
        return openState && subjectMatch && revenueMatch;
      }),
    [dues, lodgementForm.subject_uid, lodgementForm.revenue_kind_uid]
  );

  const formOptions = useMemo(
    () => (lookups.form_blueprints || []).filter((form) => !lodgementForm.revenue_kind_uid || !form.revenue_kind_uid || form.revenue_kind_uid === lodgementForm.revenue_kind_uid),
    [lodgementForm.revenue_kind_uid, lookups.form_blueprints]
  );

  const selectedFormItems = useMemo(
    () => formItems.filter((item) => item.form_blueprint_uid === lodgementForm.form_blueprint_uid),
    [formItems, lodgementForm.form_blueprint_uid]
  );

  async function load(nextFilters = filters) {
    setLoading(true);
    const declarationQuery = buildQuery({ ...nextFilters, pageSize: 100 });
    const [overviewPayload, subjectsPayload, lookupPayload, duesPayload, lodgementPayload, declarationPayload, itemsPayload] = await Promise.all([
      apiRequest("/api/filing/overview"),
      apiRequest("/api/registry/subjects?pageSize=140"),
      apiRequest("/api/configuration/lookups"),
      apiRequest("/api/obligations/dues?pageSize=180&due_event_cd=FILING"),
      apiRequest("/api/filing/lodgements?pageSize=80"),
      apiRequest(`/api/filing/declarations?${declarationQuery}`),
      apiRequest("/api/configuration/form-items"),
    ]);

    setOverview(overviewPayload.overview);
    setSubjects(subjectsPayload.rows || []);
    setLookups(lookupPayload.lookups || {});
    setDues(duesPayload.rows || []);
    setLodgements(lodgementPayload.rows || []);
    setDeclarations(declarationPayload.rows || []);
    setDeclarationPage(declarationPayload.page || null);
    setFormItems(itemsPayload.form_items || []);
    setLoading(false);
  }

  useEffect(() => {
    void load().catch((loadError) => {
      setError(loadError.message);
      setLoading(false);
    });
  }, []);

  function updateItem(index, patch) {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function selectDue(dueInstanceUid) {
    const due = dues.find((item) => item.due_instance_uid === dueInstanceUid);
    setLodgementForm({
      ...lodgementForm,
      due_instance_uid: dueInstanceUid,
      subject_uid: due?.subject_uid || lodgementForm.subject_uid,
      revenue_kind_uid: due?.revenue_kind_uid || lodgementForm.revenue_kind_uid,
      period_instance_uid: due?.period_instance_uid || "",
    });
  }

  function selectForm(formBlueprintUid) {
    const nextItems = formItems
      .filter((item) => item.form_blueprint_uid === formBlueprintUid)
      .map((item) => ({
        form_item_uid: item.form_item_uid,
        item_code: item.item_code,
        item_value_num: "",
        item_value_txt: "",
      }));
    setLodgementForm({ ...lodgementForm, form_blueprint_uid: formBlueprintUid });
    if (nextItems.length) {
      setItems(nextItems);
    }
  }

  async function loadDeclaration(declarationUid, nextTab = "detail") {
    const payload = await apiRequest(`/api/filing/declarations/${declarationUid}`);
    setSelectedDeclaration(payload.declaration);
    setStateAction(initialStateAction);
    setActiveTab(nextTab);
  }

  async function submitLodgement(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const body = {
        ...stripEmpty(lodgementForm),
        subject_uid: lodgementForm.subject_uid || null,
        revenue_kind_uid: lodgementForm.revenue_kind_uid || null,
        period_instance_uid: lodgementForm.period_instance_uid || null,
        due_instance_uid: lodgementForm.due_instance_uid || null,
        form_blueprint_uid: lodgementForm.form_blueprint_uid || null,
        declared_total_amt: lodgementForm.declared_total_amt || null,
        items: items
          .filter((item) => item.item_code)
          .map((item) => ({
            ...item,
            form_item_uid: item.form_item_uid || null,
            item_value_num: item.item_value_num === "" ? null : Number(item.item_value_num),
            item_value_txt: item.item_value_txt || null,
          })),
      };
      const payload = await apiRequest("/api/filing/lodgements", { method: "POST", body });
      setLodgementForm(initialLodgement);
      setItems(initialItems);
      await load();
      await loadDeclaration(payload.result.declaration.declaration_uid, "detail");
      setSuccess("Declaration lodgement captured and routed through validation.");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateDeclarationState(event) {
    event.preventDefault();
    if (!selectedDeclaration?.declaration?.declaration_uid) return;
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const declarationUid = selectedDeclaration.declaration.declaration_uid;
      await apiRequest(`/api/filing/declarations/${declarationUid}/state`, {
        method: "PATCH",
        body: stripEmpty(stateAction),
      });
      await loadDeclaration(declarationUid, "detail");
      await load();
      setSuccess("Declaration lifecycle updated.");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  async function resolveOutcome(outcome) {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await apiRequest(`/api/filing/validation-outcomes/${outcome.validation_outcome_uid}/resolve`, {
        method: "PATCH",
        body: { resolution_txt: "Resolved from officer filing workbench." },
      });
      await loadDeclaration(selectedDeclaration.declaration.declaration_uid, "detail");
      await load();
      setSuccess("Validation finding resolved.");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitAmendment(event) {
    event.preventDefault();
    if (!selectedDeclaration?.declaration?.declaration_uid) return;
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const payload = await apiRequest(`/api/filing/declarations/${selectedDeclaration.declaration.declaration_uid}/amendments`, {
        method: "POST",
        body: stripEmpty({
          ...amendmentForm,
          declared_total_amt: amendmentForm.declared_total_amt || null,
        }),
      });
      setAmendmentForm(initialAmendment);
      await load();
      await loadDeclaration(payload.amendment.replacement_declaration.declaration_uid, "detail");
      setSuccess("Amendment draft created.");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  const declarationColumns = [
    { key: "declaration_no", label: "Declaration" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "revenue_kind_name", label: "Revenue type" },
    { key: "period_label_txt", label: "Period", render: (row) => row.period_label_txt || "-" },
    { key: "due_dt", label: "Due", render: (row) => formatDate(row.due_dt) },
    { key: "declared_total_amt", label: "Declared", render: (row) => formatMoney(row.declared_total_amt || 0) },
    {
      key: "declaration_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={declarationTone(row.declaration_state_cd)}>{compactCode(row.declaration_state_cd)}</StatusPill>,
    },
    {
      key: "validation",
      label: "Validation",
      render: (row) =>
        Number(row.open_error_count || 0) ? (
          <StatusPill tone="danger">{formatNumber(row.open_error_count)} errors</StatusPill>
        ) : Number(row.open_warning_count || 0) ? (
          <StatusPill tone="warning">{formatNumber(row.open_warning_count)} warnings</StatusPill>
        ) : (
          <StatusPill tone="success">Clear</StatusPill>
        ),
    },
  ];

  const dueColumns = [
    { key: "due_dt", label: "Due date", render: (row) => formatDate(row.due_dt) },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "revenue_kind_name", label: "Revenue type" },
    { key: "period_label_txt", label: "Period", render: (row) => row.period_label_txt || "-" },
    {
      key: "due_state_cd",
      label: "Due state",
      render: (row) => <StatusPill tone={dueTone(row.due_state_cd)}>{compactCode(row.due_state_cd)}</StatusPill>,
    },
  ];

  const lodgementColumns = [
    { key: "lodgement_no", label: "Lodgement" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "revenue_kind_name", label: "Revenue type", render: (row) => row.revenue_kind_name || "-" },
    { key: "period_label_txt", label: "Period", render: (row) => row.period_label_txt || "-" },
    { key: "received_ts", label: "Received", render: (row) => formatDateTime(row.received_ts) },
    {
      key: "declaration_state_cd",
      label: "Declaration",
      render: (row) => <StatusPill tone={declarationTone(row.declaration_state_cd)}>{compactCode(row.declaration_state_cd)}</StatusPill>,
    },
  ];

  const itemColumns = [
    { key: "item_code", label: "Item" },
    { key: "item_label_txt", label: "Label", render: (row) => row.item_label_txt || "-" },
    { key: "item_value_txt", label: "Text", render: (row) => row.item_value_txt || "-" },
    { key: "item_value_num", label: "Numeric", render: (row) => (row.item_value_num === null || row.item_value_num === undefined ? "-" : formatNumber(row.item_value_num)) },
    {
      key: "validation_state_cd",
      label: "Validation",
      render: (row) => <StatusPill tone={row.validation_state_cd === "INVALID" ? "danger" : row.validation_state_cd === "WARNING" ? "warning" : "success"}>{compactCode(row.validation_state_cd)}</StatusPill>,
    },
  ];

  const outcomeColumns = [
    {
      key: "outcome_level_cd",
      label: "Level",
      render: (row) => <StatusPill tone={validationTone(row.outcome_level_cd)}>{compactCode(row.outcome_level_cd)}</StatusPill>,
    },
    { key: "outcome_code", label: "Code", render: (row) => compactCode(row.outcome_code) },
    { key: "field_code", label: "Field", render: (row) => row.field_code || "-" },
    { key: "outcome_message_txt", label: "Message" },
    {
      key: "resolved_bool",
      label: "Action",
      render: (row) =>
        row.resolved_bool ? (
          <StatusPill tone="success">Resolved</StatusPill>
        ) : (
          <button className="table-action-button" type="button" onClick={() => resolveOutcome(row)} disabled={saving}>
            Resolve
          </button>
        ),
    },
  ];

  const lifecycleColumns = [
    { key: "event_ts", label: "Time", render: (row) => formatDateTime(row.event_ts) },
    { key: "event_type_cd", label: "Event", render: (row) => compactCode(row.event_type_cd) },
    { key: "from_declaration_state_cd", label: "From", render: (row) => compactCode(row.from_declaration_state_cd) },
    { key: "to_declaration_state_cd", label: "To", render: (row) => compactCode(row.to_declaration_state_cd) },
    { key: "created_by_name_txt", label: "Officer", render: (row) => row.created_by_name_txt || "-" },
  ];

  const amendmentColumns = [
    { key: "amendment_reason_cd", label: "Reason", render: (row) => compactCode(row.amendment_reason_cd) },
    { key: "original_declaration_no", label: "Original", render: (row) => row.original_declaration_no || "-" },
    { key: "replacement_declaration_no", label: "Replacement", render: (row) => row.replacement_declaration_no || "-" },
    { key: "amendment_state_cd", label: "State", render: (row) => <StatusPill tone={row.amendment_state_cd === "APPROVED" ? "success" : "warning"}>{compactCode(row.amendment_state_cd)}</StatusPill> },
  ];

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Filing and declarations"
        title="Declaration Lodgement And Validation"
        status={loading ? "Loading" : "Operational"}
        tone={loading ? "warning" : "success"}
      />

      <div className="metric-grid">
        <MetricTile icon={FilePlus2} label="Lodgements" value={formatNumber(overview?.lodgement_count)} />
        <MetricTile icon={FileCheck2} label="Declarations" value={formatNumber(overview?.declaration_count)} />
        <MetricTile icon={ShieldAlert} label="Validation open" value={formatNumber(overview?.unresolved_validation_count)} />
        <MetricTile icon={CalendarClock} label="Open filing dues" value={formatNumber(overview?.open_filing_due_count)} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "workbench" ? (
        <div className="filing-workbench-grid">
          <section className="content-band filing-workbench-grid__filters">
            <div className="section-heading">
              <div>
                <span>Officer workbench</span>
                <h2>Declaration Search</h2>
              </div>
              <ListFilter size={22} />
            </div>
            <form
              className="obligation-filter-form"
              onSubmit={(event) => {
                event.preventDefault();
                void load(filters).catch((submitError) => setError(submitError.message));
              }}
            >
              <Field label="Keyword">
                <input value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
              </Field>
              <SelectField label="Taxpayer" value={filters.subject_uid} onChange={(value) => setFilters({ ...filters, subject_uid: value })}>
                <option value="">All taxpayers</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>
                ))}
              </SelectField>
              <SelectField label="Revenue type" value={filters.revenue_kind_uid} onChange={(value) => setFilters({ ...filters, revenue_kind_uid: value })}>
                <option value="">All revenue</option>
                {(lookups.revenue_kinds || []).map((kind) => (
                  <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>{kind.revenue_kind_name}</option>
                ))}
              </SelectField>
              <SelectField label="Declaration state" value={filters.declaration_state_cd} onChange={(value) => setFilters({ ...filters, declaration_state_cd: value })}>
                <option value="">All states</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="VALIDATED">Validated</option>
                <option value="REQUIRES_REVIEW">Requires review</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REJECTED">Rejected</option>
                <option value="AMENDED">Amended</option>
              </SelectField>
              <Field label="Period">
                <input value={filters.period_label_txt} onChange={(event) => setFilters({ ...filters, period_label_txt: event.target.value })} />
              </Field>
              <Field label="Due from">
                <input type="date" value={filters.due_from_dt} onChange={(event) => setFilters({ ...filters, due_from_dt: event.target.value })} />
              </Field>
              <Field label="Due to">
                <input type="date" value={filters.due_to_dt} onChange={(event) => setFilters({ ...filters, due_to_dt: event.target.value })} />
              </Field>
              <div className="form-actions full-span">
                <button className="primary-button" type="submit">Search declarations</button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setFilters(initialFilters);
                    void load(initialFilters).catch((submitError) => setError(submitError.message));
                  }}
                >
                  Reset
                </button>
              </div>
            </form>
          </section>

          <section className="content-band filing-workbench-grid__results">
            <div className="section-heading">
              <div>
                <span>{formatNumber(declarationPage?.total)} result{declarationPage?.total === 1 ? "" : "s"}</span>
                <h2>Declarations</h2>
              </div>
              <StatusPill tone="warning">{formatNumber(declarations.length)} visible</StatusPill>
            </div>
            <DataTable
              columns={declarationColumns}
              rows={declarations}
              keyField="declaration_uid"
              selectedKey={selectedDeclaration?.declaration?.declaration_uid}
              onRowClick={(row) => loadDeclaration(row.declaration_uid, "detail")}
              empty="No declarations match the current filters"
            />
          </section>
        </div>
      ) : null}

      {activeTab === "lodge" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>New declaration</span>
                <h2>Capture Lodgement</h2>
              </div>
              <ClipboardCheck size={22} />
            </div>
            <form className="action-form" onSubmit={submitLodgement}>
              <SelectField label="Filing due" value={lodgementForm.due_instance_uid} onChange={selectDue}>
                <option value="">Select filing due or capture manually</option>
                {filteredDues.map((due) => (
                  <option key={due.due_instance_uid} value={due.due_instance_uid}>
                    {formatDate(due.due_dt)} - {due.display_name_txt} - {due.period_label_txt || "No period"}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Taxpayer" required value={lodgementForm.subject_uid} onChange={(value) => setLodgementForm({ ...lodgementForm, subject_uid: value, due_instance_uid: "" })}>
                <option value="">Select taxpayer</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>
                ))}
              </SelectField>
              <SelectField label="Revenue type" required value={lodgementForm.revenue_kind_uid} onChange={(value) => setLodgementForm({ ...lodgementForm, revenue_kind_uid: value, due_instance_uid: "", form_blueprint_uid: "" })}>
                <option value="">Select revenue type</option>
                {(lookups.revenue_kinds || []).map((kind) => (
                  <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>{kind.revenue_kind_name}</option>
                ))}
              </SelectField>
              <SelectField label="Form metadata" value={lodgementForm.form_blueprint_uid} onChange={selectForm}>
                <option value="">No form metadata</option>
                {formOptions.map((form) => (
                  <option key={form.form_blueprint_uid} value={form.form_blueprint_uid}>{form.form_code} - {form.form_name}</option>
                ))}
              </SelectField>
              <div className="compact-form">
                <SelectField label="Lodgement channel" value={lodgementForm.lodgement_channel_cd} onChange={(value) => setLodgementForm({ ...lodgementForm, lodgement_channel_cd: value })}>
                  <option value="COUNTER">Counter</option>
                  <option value="PORTAL">Portal</option>
                  <option value="EMAIL">Email</option>
                  <option value="BATCH">Batch</option>
                  <option value="API">API</option>
                </SelectField>
                <SelectField label="Initial action" value={lodgementForm.workflow_action_cd} onChange={(value) => setLodgementForm({ ...lodgementForm, workflow_action_cd: value })}>
                  <option value="DRAFT">Save draft</option>
                  <option value="SUBMIT">Submit</option>
                  <option value="VALIDATE">Submit and validate</option>
                  <option value="ACCEPT">Accept if valid</option>
                </SelectField>
              </div>
              <Field label="Declared total">
                <input type="number" step="0.01" value={lodgementForm.declared_total_amt} onChange={(event) => setLodgementForm({ ...lodgementForm, declared_total_amt: event.target.value })} />
              </Field>
              <Field label="Reason or officer note">
                <textarea value={lodgementForm.reason_txt} onChange={(event) => setLodgementForm({ ...lodgementForm, reason_txt: event.target.value })} />
              </Field>

              {selectedFormItems.length ? (
                <div className="filing-form-context">
                  {selectedFormItems.slice(0, 8).map((item) => (
                    <span key={item.form_item_uid}>
                      {item.item_label_txt}
                      {item.required_bool ? " *" : ""}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="filing-item-grid">
                {items.map((item, index) => (
                  <div className="filing-item-card" key={`${item.item_code}-${index}`}>
                    <Field label="Item code">
                      <input value={item.item_code} onChange={(event) => updateItem(index, { item_code: event.target.value.toUpperCase() })} />
                    </Field>
                    <Field label="Numeric value">
                      <input type="number" step="0.01" value={item.item_value_num} onChange={(event) => updateItem(index, { item_value_num: event.target.value })} />
                    </Field>
                    <Field label="Text value">
                      <input value={item.item_value_txt} onChange={(event) => updateItem(index, { item_value_txt: event.target.value })} />
                    </Field>
                  </div>
                ))}
              </div>
              <div className="form-actions">
                <button className="secondary-button" type="button" onClick={() => setItems([...items, { item_code: "", item_value_num: "", item_value_txt: "" }])}>
                  Add item
                </button>
                <button className="primary-button" type="submit" disabled={saving}>
                  Capture declaration
                </button>
              </div>
            </form>
          </section>

          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Open filing dues</span>
                <h2>Available Obligations</h2>
              </div>
              <RefreshCw size={22} />
            </div>
            <DataTable columns={dueColumns} rows={filteredDues} keyField="due_instance_uid" onRowClick={(row) => selectDue(row.due_instance_uid)} empty="No open filing dues for the selected context" selectedKey={lodgementForm.due_instance_uid} />
            <br />
            <DataTable columns={lodgementColumns} rows={lodgements} keyField="lodgement_package_uid" empty="No lodgements recorded" />
          </section>
        </div>
      ) : null}

      {activeTab === "detail" ? (
        <div className="declaration-detail-grid">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Declaration detail</span>
                <h2>{selectedDeclaration?.declaration?.declaration_no || "Select a declaration"}</h2>
              </div>
              {selectedDeclaration?.declaration ? (
                <StatusPill tone={declarationTone(selectedDeclaration.declaration.declaration_state_cd)}>
                  {compactCode(selectedDeclaration.declaration.declaration_state_cd)}
                </StatusPill>
              ) : null}
            </div>

            {selectedDeclaration?.declaration ? (
              <>
                <div className="filing-summary-strip">
                  <div>
                    <span>Taxpayer</span>
                    <strong>{selectedDeclaration.declaration.display_name_txt}</strong>
                  </div>
                  <div>
                    <span>Revenue type</span>
                    <strong>{selectedDeclaration.declaration.revenue_kind_name}</strong>
                  </div>
                  <div>
                    <span>Period</span>
                    <strong>{selectedDeclaration.declaration.period_label_txt || "-"}</strong>
                  </div>
                  <div>
                    <span>Due state</span>
                    <strong>{compactCode(selectedDeclaration.declaration.due_state_cd)}</strong>
                  </div>
                  <div>
                    <span>Declared total</span>
                    <strong>{formatMoney(selectedDeclaration.declaration.declared_total_amt || 0)}</strong>
                  </div>
                </div>
                <DataTable columns={itemColumns} rows={selectedDeclaration.items || []} keyField="declaration_item_uid" empty="No declaration items" />
              </>
            ) : (
              <div className="empty-panel"><div><strong>No declaration selected</strong><span>Choose a declaration from the workbench to review details.</span></div></div>
            )}
          </section>

          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Lifecycle action</span>
                <h2>Validation And Decision</h2>
              </div>
              <BadgeCheck size={22} />
            </div>
            {selectedDeclaration?.declaration ? (
              <form className="stacked-form" onSubmit={updateDeclarationState}>
                <SelectField label="Decision" value={stateAction.workflow_action_cd} onChange={(value) => setStateAction({ ...stateAction, workflow_action_cd: value })}>
                  <option value="SUBMIT">Submit</option>
                  <option value="VALIDATE">Validate</option>
                  <option value="ACCEPT">Accept and mark filed</option>
                  <option value="REJECT">Reject</option>
                </SelectField>
                <Field label="Reason">
                  <textarea value={stateAction.reason_txt} onChange={(event) => setStateAction({ ...stateAction, reason_txt: event.target.value })} />
                </Field>
                <button className="primary-button" type="submit" disabled={saving || ["ACCEPTED", "REJECTED", "AMENDED"].includes(selectedDeclaration.declaration.declaration_state_cd)}>
                  Apply decision
                </button>
              </form>
            ) : (
              <div className="empty-panel"><div><strong>No lifecycle action</strong><span>Select a declaration before applying a decision.</span></div></div>
            )}
          </section>

          <section className="content-band declaration-detail-grid__wide">
            <div className="section-heading">
              <div>
                <span>Validation</span>
                <h2>Errors And Warnings</h2>
              </div>
              <AlertTriangle size={22} />
            </div>
            <DataTable columns={outcomeColumns} rows={selectedDeclaration?.validation_outcomes || []} keyField="validation_outcome_uid" empty="No active validation findings" />
          </section>

          <section className="content-band declaration-detail-grid__wide">
            <div className="section-heading">
              <div>
                <span>Declaration audit</span>
                <h2>Lifecycle History</h2>
              </div>
            </div>
            <DataTable columns={lifecycleColumns} rows={selectedDeclaration?.lifecycle_events || []} keyField="lifecycle_event_uid" empty="No lifecycle events" />
          </section>
        </div>
      ) : null}

      {activeTab === "amend" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Selected declaration</span>
                <h2>{selectedDeclaration?.declaration?.declaration_no || "Choose declaration"}</h2>
              </div>
              <GitBranch size={22} />
            </div>
            <DataTable
              columns={declarationColumns}
              rows={declarations}
              keyField="declaration_uid"
              onRowClick={(row) => loadDeclaration(row.declaration_uid, "amend")}
              empty="No declarations"
              selectedKey={selectedDeclaration?.declaration?.declaration_uid}
            />
          </section>

          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Amendment</span>
                <h2>Create Replacement Draft</h2>
              </div>
            </div>
            <form className="action-form" onSubmit={submitAmendment}>
              <Field label="Amendment reason code">
                <input value={amendmentForm.amendment_reason_cd} onChange={(event) => setAmendmentForm({ ...amendmentForm, amendment_reason_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Replacement declared total">
                <input type="number" step="0.01" value={amendmentForm.declared_total_amt} onChange={(event) => setAmendmentForm({ ...amendmentForm, declared_total_amt: event.target.value })} />
              </Field>
              <SelectField label="Initial action" value={amendmentForm.workflow_action_cd} onChange={(value) => setAmendmentForm({ ...amendmentForm, workflow_action_cd: value })}>
                <option value="DRAFT">Save draft</option>
                <option value="VALIDATE">Validate replacement</option>
                <option value="ACCEPT">Accept if valid</option>
              </SelectField>
              <Field label="Reason text">
                <textarea value={amendmentForm.amendment_reason_txt} onChange={(event) => setAmendmentForm({ ...amendmentForm, amendment_reason_txt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit" disabled={saving || !selectedDeclaration?.declaration?.declaration_uid}>
                Create amendment
              </button>
            </form>

            <br />
            <DataTable columns={amendmentColumns} rows={selectedDeclaration?.amendments || []} keyField="amendment_chain_uid" empty="No amendments for selected declaration" />
          </section>
        </div>
      ) : null}
    </section>
  );
}
