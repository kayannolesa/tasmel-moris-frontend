import {
  BadgeDollarSign,
  CheckCircle2,
  ClipboardCheck,
  FileStack,
  History,
  Plus,
  ReceiptText,
  Scale,
  Search,
  ShieldCheck,
  Send,
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
  { id: "workbench", label: "Assessment Workbench" },
  { id: "create", label: "Create Notice" },
  { id: "adjustments", label: "Adjustments" },
  { id: "clearance", label: "Clearance" },
];

const creditComponentTypes = new Set(["CREDIT", "CONCESSION", "EXEMPTION", "ADJUSTMENT_CREDIT"]);
const closedStates = new Set(["POSTED", "AMENDED", "CANCELLED"]);

const noticeStates = ["DRAFT", "REVIEWED", "APPROVED", "ISSUED", "POSTED", "CANCELLED"];
const componentTypes = ["PRINCIPAL", "PENALTY", "INTEREST", "FEE", "CREDIT", "CONCESSION", "EXEMPTION", "ADJUSTMENT_DEBIT", "ADJUSTMENT_CREDIT"];

const initialFilters = {
  q: "",
  subject_uid: "",
  revenue_kind_uid: "",
  liability_state_cd: "",
  issue_from_dt: "",
  issue_to_dt: "",
};

const initialNotice = {
  declaration_uid: "",
  subject_uid: "",
  revenue_kind_uid: "",
  period_instance_uid: "",
  notice_type_cd: "ORIGINAL",
  issue_dt: today(),
  due_dt: "",
  workflow_action_cd: "REVIEW",
  reason_txt: "",
};

const initialComponentRow = {
  revenue_component_uid: "",
  component_type_cd: "PRINCIPAL",
  amount_amt: "",
  reason_txt: "",
};

const initialComponentForm = {
  revenue_component_uid: "",
  component_type_cd: "PENALTY",
  amount_amt: "",
  reason_txt: "",
};

const initialAdjustment = {
  subject_uid: "",
  revenue_kind_uid: "",
  liability_notice_uid: "",
  adjustment_type_cd: "OFFICER_ADJUSTMENT",
  adjustment_amt: "",
  adjustment_reason_txt: "",
};

const initialClearance = { subject_uid: "", clearance_state_cd: "" };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function statusTone(value) {
  const status = String(value || "");
  if (["POSTED", "CLEAR", "APPROVED", "ISSUED", "APPLIED"].includes(status)) return "success";
  if (["REJECTED", "NOT_CLEAR", "CANCELLED"].includes(status)) return "danger";
  if (["DRAFT", "PENDING", "REVIEWED", "OPEN"].includes(status)) return "warning";
  return "neutral";
}

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, value);
  });
  return search.toString();
}

function asAmount(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.abs(number) : 0;
}

function componentPayload(row) {
  const amount = asAmount(row.amount_amt);
  const credit = creditComponentTypes.has(row.component_type_cd);
  return {
    revenue_component_uid: row.revenue_component_uid || null,
    component_type_cd: row.component_type_cd,
    debit_amt: credit ? 0 : amount,
    credit_amt: credit ? amount : 0,
    calculation_trace_jsn: { source: "officer_assessment", note: row.reason_txt || undefined },
    reason_txt: row.reason_txt || null,
  };
}

function sumComponents(rows) {
  return rows.reduce(
    (total, row) => {
      const amount = asAmount(row.amount_amt);
      if (creditComponentTypes.has(row.component_type_cd)) return { ...total, credit: total.credit + amount };
      return { ...total, debit: total.debit + amount };
    },
    { debit: 0, credit: 0 }
  );
}

export default function AssessmentPage() {
  const [activeTab, setActiveTab] = useState("workbench");
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [lookups, setLookups] = useState({});
  const [declarations, setDeclarations] = useState([]);
  const [notices, setNotices] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [clearances, setClearances] = useState([]);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [noticeForm, setNoticeForm] = useState(initialNotice);
  const [componentRows, setComponentRows] = useState([initialComponentRow]);
  const [componentForm, setComponentForm] = useState(initialComponentForm);
  const [adjustmentForm, setAdjustmentForm] = useState(initialAdjustment);
  const [clearanceForm, setClearanceForm] = useState(initialClearance);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selected = selectedNotice?.notice || null;
  const postingLines = selected?.posting_payload_jsn?.lines || [];
  const componentTotals = useMemo(() => sumComponents(componentRows), [componentRows]);
  const canChangeSelected = selected && !closedStates.has(selected.liability_state_cd);
  const canPostSelected = selected?.liability_state_cd === "ISSUED";

  const componentOptions = useMemo(
    () =>
      (lookups.revenue_components || []).filter(
        (component) => !noticeForm.revenue_kind_uid || component.revenue_kind_uid === noticeForm.revenue_kind_uid
      ),
    [lookups.revenue_components, noticeForm.revenue_kind_uid]
  );

  async function load(nextFilters = filters) {
    const noticeQuery = buildQuery({ ...nextFilters, pageSize: 100 });
    const [overviewPayload, subjectsPayload, lookupPayload, declarationPayload, noticesPayload, adjustmentPayload, clearancePayload] =
      await Promise.all([
        apiRequest("/api/assessment/overview"),
        apiRequest("/api/registry/subjects?pageSize=150"),
        apiRequest("/api/configuration/lookups"),
        apiRequest("/api/filing/declarations?pageSize=150&declaration_state_cd=ACCEPTED"),
        apiRequest(`/api/assessment/liability-notices?${noticeQuery}`),
        apiRequest("/api/assessment/adjustments?pageSize=100"),
        apiRequest("/api/assessment/clearance-snapshots?pageSize=100"),
      ]);

    setOverview(overviewPayload.overview);
    setSubjects(subjectsPayload.rows || []);
    setLookups(lookupPayload.lookups || {});
    setDeclarations(declarationPayload.rows || []);
    setNotices(noticesPayload.rows || []);
    setAdjustments(adjustmentPayload.rows || []);
    setClearances(clearancePayload.rows || []);
  }

  useEffect(() => {
    void load().catch((loadError) => setError(loadError.message)).finally(() => setLoading(false));
  }, []);

  function updateComponentRow(index, patch) {
    setComponentRows((rows) => rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function addComponentRow() {
    setComponentRows((rows) => [...rows, { ...initialComponentRow, component_type_cd: "PENALTY" }]);
  }

  function removeComponentRow(index) {
    setComponentRows((rows) => (rows.length === 1 ? rows : rows.filter((_, rowIndex) => rowIndex !== index)));
  }

  function syncDeclaration(declarationUid) {
    const declaration = declarations.find((item) => item.declaration_uid === declarationUid);
    const amount = declaration?.declared_total_amt ?? "";
    setNoticeForm({
      ...noticeForm,
      declaration_uid: declarationUid,
      subject_uid: declaration?.subject_uid || noticeForm.subject_uid,
      revenue_kind_uid: declaration?.revenue_kind_uid || noticeForm.revenue_kind_uid,
      period_instance_uid: declaration?.period_instance_uid || noticeForm.period_instance_uid,
      due_dt: declaration?.due_dt || noticeForm.due_dt,
    });
    if (declaration) {
      setComponentRows([{ ...initialComponentRow, amount_amt: amount }]);
    }
  }

  async function refreshSelected(liabilityNoticeUid = selected?.liability_notice_uid) {
    if (!liabilityNoticeUid) return null;
    const payload = await apiRequest(`/api/assessment/liability-notices/${liabilityNoticeUid}`);
    setSelectedNotice(payload.liability_notice);
    return payload.liability_notice;
  }

  async function loadNotice(liabilityNoticeUid) {
    setError("");
    setSuccess("");
    await refreshSelected(liabilityNoticeUid);
  }

  async function runFilteredSearch(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await load(filters);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitNotice(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      const components = componentRows.map(componentPayload).filter((component) => Number(component.debit_amt || 0) || Number(component.credit_amt || 0));
      const payload = await apiRequest("/api/assessment/liability-notices", {
        method: "POST",
        body: {
          declaration_uid: noticeForm.declaration_uid || null,
          subject_uid: noticeForm.subject_uid || null,
          revenue_kind_uid: noticeForm.revenue_kind_uid || null,
          period_instance_uid: noticeForm.period_instance_uid || null,
          notice_type_cd: noticeForm.notice_type_cd,
          issue_dt: noticeForm.issue_dt || null,
          due_dt: noticeForm.due_dt || null,
          workflow_action_cd: noticeForm.workflow_action_cd || "DRAFT",
          reason_txt: noticeForm.reason_txt || null,
          components: components.length ? components : undefined,
        },
      });
      setNoticeForm(initialNotice);
      setComponentRows([initialComponentRow]);
      setSelectedNotice(payload.liability_notice);
      await load();
      setActiveTab("workbench");
      setSuccess("Liability notice created with assessment lifecycle history.");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function changeNoticeState(workflowActionCd) {
    if (!selected?.liability_notice_uid) return;
    setError("");
    setSuccess("");
    try {
      const payload = await apiRequest(`/api/assessment/liability-notices/${selected.liability_notice_uid}/state`, {
        method: "PATCH",
        body: {
          workflow_action_cd: workflowActionCd,
          reason_txt: `Officer ${compactCode(workflowActionCd).toLowerCase()} action recorded from the Assessment Workbench.`,
        },
      });
      setSelectedNotice(payload.liability_notice);
      await load();
      setSuccess(`Notice ${compactCode(workflowActionCd).toLowerCase()} action completed.`);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function postNotice() {
    if (!selected?.liability_notice_uid) return;
    setError("");
    setSuccess("");
    try {
      const payload = await apiRequest(`/api/assessment/liability-notices/${selected.liability_notice_uid}/post`, { method: "POST" });
      setSelectedNotice(payload.liability_notice);
      await load();
      setSuccess("Issued liability notice posted to finance.");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function submitComponent(event) {
    event.preventDefault();
    if (!selected?.liability_notice_uid) return;
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/assessment/liability-notices/${selected.liability_notice_uid}/components`, {
        method: "POST",
        body: componentPayload(componentForm),
      });
      setComponentForm(initialComponentForm);
      await Promise.all([refreshSelected(selected.liability_notice_uid), load()]);
      setSuccess("Liability component added and posting payload recalculated.");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function submitAdjustment(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      await apiRequest("/api/assessment/adjustments", {
        method: "POST",
        body: {
          ...adjustmentForm,
          revenue_kind_uid: adjustmentForm.revenue_kind_uid || null,
          liability_notice_uid: adjustmentForm.liability_notice_uid || null,
          adjustment_amt: Number(adjustmentForm.adjustment_amt),
          adjustment_reason_txt: adjustmentForm.adjustment_reason_txt || null,
        },
      });
      setAdjustmentForm(initialAdjustment);
      await load();
      setSuccess("Adjustment request recorded for review.");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function updateAdjustment(adjustmentUid, workflowActionCd) {
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/assessment/adjustments/${adjustmentUid}/state`, {
        method: "PATCH",
        body: { workflow_action_cd: workflowActionCd, reason_txt: "Assessment adjustment decision recorded." },
      });
      await Promise.all([load(), selected?.liability_notice_uid ? refreshSelected(selected.liability_notice_uid) : Promise.resolve()]);
      setSuccess(`Adjustment ${compactCode(workflowActionCd).toLowerCase()} action completed.`);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function submitClearance(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      await apiRequest("/api/assessment/clearance-snapshots", {
        method: "POST",
        body: {
          subject_uid: clearanceForm.subject_uid,
          clearance_state_cd: clearanceForm.clearance_state_cd || undefined,
        },
      });
      setClearanceForm(initialClearance);
      await load();
      setSuccess("Clearance snapshot calculated from liabilities, holds, overdue obligations, and disputes.");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  const noticeColumns = [
    { key: "liability_notice_no", label: "Notice" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "declaration_no", label: "Declaration", render: (row) => row.declaration_no || "-" },
    { key: "revenue_kind_name", label: "Revenue type" },
    { key: "net_liability_amt", label: "Net", render: (row) => formatMoney(row.net_liability_amt) },
    { key: "due_dt", label: "Due", render: (row) => formatDate(row.due_dt) },
    {
      key: "liability_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={statusTone(row.liability_state_cd)}>{compactCode(row.liability_state_cd)}</StatusPill>,
    },
    {
      key: "posting_ready_bool",
      label: "Posting",
      render: (row) => <StatusPill tone={row.posting_ready_bool ? "success" : "neutral"}>{row.posting_ready_bool ? "Ready" : "Held"}</StatusPill>,
    },
  ];

  const componentColumns = [
    { key: "component_name", label: "Component", render: (row) => row.component_name || compactCode(row.component_type_cd) },
    { key: "component_type_cd", label: "Type", render: (row) => compactCode(row.component_type_cd) },
    { key: "debit_amt", label: "Debit", render: (row) => formatMoney(row.debit_amt) },
    { key: "credit_amt", label: "Credit", render: (row) => formatMoney(row.credit_amt) },
  ];

  const postingColumns = [
    { key: "line_no", label: "Line" },
    { key: "gl_code", label: "GL code" },
    { key: "debit_amt", label: "Debit", render: (row) => formatMoney(row.debit_amt) },
    { key: "credit_amt", label: "Credit", render: (row) => formatMoney(row.credit_amt) },
    { key: "memo", label: "Memo", render: (row) => row.memo || row.line_memo_txt || "-" },
  ];

  const adjustmentColumns = [
    { key: "adjustment_no", label: "Adjustment" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "liability_notice_no", label: "Notice", render: (row) => row.liability_notice_no || "-" },
    { key: "adjustment_type_cd", label: "Type", render: (row) => compactCode(row.adjustment_type_cd) },
    { key: "adjustment_amt", label: "Amount", render: (row) => formatMoney(row.adjustment_amt) },
    {
      key: "adjustment_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={statusTone(row.adjustment_state_cd)}>{compactCode(row.adjustment_state_cd)}</StatusPill>,
    },
    {
      key: "actions",
      label: "Decision",
      render: (row) => (
        <div className="table-button-row">
          <button className="table-action-button" type="button" onClick={() => updateAdjustment(row.adjustment_uid, "REVIEW")} disabled={!["PENDING"].includes(row.adjustment_state_cd)}>
            Review
          </button>
          <button className="table-action-button" type="button" onClick={() => updateAdjustment(row.adjustment_uid, "APPROVE")} disabled={!["PENDING", "REVIEWED"].includes(row.adjustment_state_cd)}>
            Approve
          </button>
          <button className="table-action-button" type="button" onClick={() => updateAdjustment(row.adjustment_uid, "APPLY")} disabled={row.adjustment_state_cd !== "APPROVED"}>
            Apply
          </button>
        </div>
      ),
    },
  ];

  const clearanceColumns = [
    { key: "snapshot_ts", label: "Snapshot", render: (row) => formatDateTime(row.snapshot_ts) },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "outstanding_balance_amt", label: "Balance", render: (row) => formatMoney(row.outstanding_balance_amt) },
    { key: "overdue_count_no", label: "Overdue", render: (row) => formatNumber(row.overdue_count_no) },
    { key: "active_hold_count_no", label: "Holds", render: (row) => formatNumber(row.active_hold_count_no) },
    { key: "open_liability_count_no", label: "Open liabilities", render: (row) => formatNumber(row.open_liability_count_no) },
    { key: "pending_dispute_count_no", label: "Disputes", render: (row) => formatNumber(row.pending_dispute_count_no) },
    {
      key: "clearance_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={statusTone(row.clearance_state_cd)}>{compactCode(row.clearance_state_cd)}</StatusPill>,
    },
  ];

  const lifecycleColumns = [
    { key: "event_ts", label: "Time", render: (row) => formatDateTime(row.event_ts) },
    { key: "event_type_cd", label: "Event", render: (row) => compactCode(row.event_type_cd) },
    { key: "from_liability_state_cd", label: "From", render: (row) => compactCode(row.from_liability_state_cd) },
    { key: "to_liability_state_cd", label: "To", render: (row) => compactCode(row.to_liability_state_cd) },
    { key: "created_by_name_txt", label: "Officer", render: (row) => row.created_by_name_txt || "-" },
  ];

  const auditColumns = [
    { key: "event_ts", label: "Time", render: (row) => formatDateTime(row.event_ts) },
    { key: "event_type_cd", label: "Event", render: (row) => compactCode(row.event_type_cd) },
    { key: "action_cd", label: "Action", render: (row) => compactCode(row.action_cd) },
    { key: "display_name_txt", label: "Officer", render: (row) => row.display_name_txt || "-" },
  ];

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Assessment and liability"
        title="Assessment Workbench"
        status={loading ? "Loading" : "Controlled lifecycle"}
        tone={loading ? "warning" : "success"}
      />

      <div className="metric-grid">
        <MetricTile icon={FileStack} label="Liability notices" value={formatNumber(overview?.liability_notice_count)} />
        <MetricTile icon={BadgeDollarSign} label="Assessed value" value={formatMoney(overview?.assessed_total_amt)} />
        <MetricTile icon={Scale} label="Pending approval" value={formatNumber(overview?.pending_approval_count)} />
        <MetricTile icon={ClipboardCheck} label="Unassessed filings" value={formatNumber(overview?.unassessed_declaration_count)} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "workbench" ? (
        <div className="assessment-workbench-grid">
          <section className="content-band assessment-workbench-grid__list">
            <div className="section-heading">
              <div>
                <span>Search and queue</span>
                <h2>Liability Notices</h2>
              </div>
              <Search size={22} />
            </div>
            <form className="assessment-filter-form" onSubmit={runFilteredSearch}>
              <Field label="Keyword">
                <input value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
              </Field>
              <SelectField label="Taxpayer" value={filters.subject_uid} onChange={(value) => setFilters({ ...filters, subject_uid: value })}>
                <option value="">All taxpayers</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_uid} value={subject.subject_uid}>
                    {subject.display_name_txt}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Revenue type" value={filters.revenue_kind_uid} onChange={(value) => setFilters({ ...filters, revenue_kind_uid: value })}>
                <option value="">All revenue types</option>
                {(lookups.revenue_kinds || []).map((kind) => (
                  <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>
                    {kind.revenue_kind_name}
                  </option>
                ))}
              </SelectField>
              <SelectField label="State" value={filters.liability_state_cd} onChange={(value) => setFilters({ ...filters, liability_state_cd: value })}>
                <option value="">All states</option>
                {noticeStates.map((state) => (
                  <option key={state} value={state}>
                    {compactCode(state)}
                  </option>
                ))}
              </SelectField>
              <Field label="Issued from">
                <input type="date" value={filters.issue_from_dt} onChange={(event) => setFilters({ ...filters, issue_from_dt: event.target.value })} />
              </Field>
              <Field label="Issued to">
                <input type="date" value={filters.issue_to_dt} onChange={(event) => setFilters({ ...filters, issue_to_dt: event.target.value })} />
              </Field>
              <div className="form-actions full-span">
                <button className="secondary-button" type="button" onClick={() => {
                  setFilters(initialFilters);
                  void load(initialFilters).catch((submitError) => setError(submitError.message));
                }}>
                  Reset
                </button>
                <button className="primary-button" type="submit">Search notices</button>
              </div>
            </form>
            <DataTable
              columns={noticeColumns}
              rows={notices}
              keyField="liability_notice_uid"
              selectedKey={selected?.liability_notice_uid}
              onRowClick={(row) => loadNotice(row.liability_notice_uid)}
              empty="No liability notices match the current filters"
            />
          </section>

          <section className="content-band assessment-workbench-grid__detail">
            <div className="section-heading">
              <div>
                <span>Notice control</span>
                <h2>{selected?.liability_notice_no || "Select a notice"}</h2>
              </div>
              {selected ? <StatusPill tone={statusTone(selected.liability_state_cd)}>{compactCode(selected.liability_state_cd)}</StatusPill> : null}
            </div>

            {selected ? (
              <>
                <div className="assessment-summary-strip">
                  <div>
                    <span>Taxpayer</span>
                    <strong>{selected.display_name_txt}</strong>
                  </div>
                  <div>
                    <span>Revenue type</span>
                    <strong>{selected.revenue_kind_name}</strong>
                  </div>
                  <div>
                    <span>Net liability</span>
                    <strong>{formatMoney(selected.net_liability_amt)}</strong>
                  </div>
                  <div>
                    <span>Due date</span>
                    <strong>{formatDate(selected.due_dt)}</strong>
                  </div>
                  <div>
                    <span>Posting</span>
                    <strong>{selected.posting_ready_bool ? "Ready" : "Held"}</strong>
                  </div>
                </div>

                <div className="assessment-action-row">
                  <button className="secondary-button" type="button" onClick={() => changeNoticeState("REVIEW")} disabled={!canChangeSelected || selected.liability_state_cd !== "DRAFT"}>
                    <CheckCircle2 size={16} /> Review
                  </button>
                  <button className="secondary-button" type="button" onClick={() => changeNoticeState("APPROVE")} disabled={!canChangeSelected || !["DRAFT", "REVIEWED"].includes(selected.liability_state_cd)}>
                    <ShieldCheck size={16} /> Approve
                  </button>
                  <button className="secondary-button" type="button" onClick={() => changeNoticeState("ISSUE")} disabled={!canChangeSelected || selected.liability_state_cd !== "APPROVED"}>
                    <Send size={16} /> Issue
                  </button>
                  <button className="primary-button" type="button" onClick={postNotice} disabled={!canPostSelected}>
                    <ReceiptText size={16} /> Post
                  </button>
                  <button className="secondary-button danger-button" type="button" onClick={() => changeNoticeState("CANCEL")} disabled={!canChangeSelected}>
                    Cancel
                  </button>
                </div>

                <div className="assessment-detail-grid">
                  <div className="assessment-panel">
                    <div className="section-heading section-heading--compact">
                      <div>
                        <span>Liability breakdown</span>
                        <h2>Components</h2>
                      </div>
                      <Plus size={20} />
                    </div>
                    <DataTable columns={componentColumns} rows={selectedNotice.components || []} keyField="liability_component_uid" empty="No liability components recorded" />
                  </div>

                  <div className="assessment-panel">
                    <div className="section-heading section-heading--compact">
                      <div>
                        <span>Posting readiness</span>
                        <h2>Prepared Journal Lines</h2>
                      </div>
                      <ReceiptText size={20} />
                    </div>
                    <DataTable columns={postingColumns} rows={postingLines} keyField="line_no" empty="Posting lines will appear after components are calculated" />
                  </div>
                </div>

                <form className="assessment-component-form" onSubmit={submitComponent}>
                  <SelectField label="Component type" value={componentForm.component_type_cd} onChange={(value) => setComponentForm({ ...componentForm, component_type_cd: value })}>
                    {componentTypes.map((type) => (
                      <option key={type} value={type}>{compactCode(type)}</option>
                    ))}
                  </SelectField>
                  <SelectField label="Component" value={componentForm.revenue_component_uid} onChange={(value) => setComponentForm({ ...componentForm, revenue_component_uid: value })}>
                    <option value="">Default mapping</option>
                    {componentOptions.map((component) => (
                      <option key={component.revenue_component_uid} value={component.revenue_component_uid}>{component.component_name}</option>
                    ))}
                  </SelectField>
                  <Field label="Amount">
                    <input type="number" min="0" step="0.01" value={componentForm.amount_amt} onChange={(event) => setComponentForm({ ...componentForm, amount_amt: event.target.value })} />
                  </Field>
                  <Field label="Reason">
                    <input value={componentForm.reason_txt} onChange={(event) => setComponentForm({ ...componentForm, reason_txt: event.target.value })} />
                  </Field>
                  <button className="secondary-button" type="submit" disabled={!canChangeSelected}>Add component</button>
                </form>

                <div className="assessment-detail-grid">
                  <div className="assessment-panel">
                    <div className="section-heading section-heading--compact">
                      <div>
                        <span>Decision record</span>
                        <h2>Lifecycle History</h2>
                      </div>
                      <History size={20} />
                    </div>
                    <DataTable columns={lifecycleColumns} rows={selectedNotice.lifecycle_events || []} keyField="lifecycle_event_uid" empty="No lifecycle events recorded" />
                  </div>
                  <div className="assessment-panel">
                    <div className="section-heading section-heading--compact">
                      <div>
                        <span>Security record</span>
                        <h2>Audit Trail</h2>
                      </div>
                      <ShieldCheck size={20} />
                    </div>
                    <DataTable columns={auditColumns} rows={selectedNotice.audit_events || []} keyField="audit_event_uid" empty="No audit events recorded" />
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-panel">Select a liability notice to review assessment controls, prepared posting lines, lifecycle history, and audit records.</div>
            )}
          </section>
        </div>
      ) : null}

      {activeTab === "create" ? (
        <div className="assessment-create-grid">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Accepted filing to liability</span>
                <h2>Create Liability Notice</h2>
              </div>
              <FileStack size={22} />
            </div>
            <form className="assessment-create-form" onSubmit={submitNotice}>
              <SelectField label="Accepted declaration" value={noticeForm.declaration_uid} onChange={syncDeclaration}>
                <option value="">No declaration selected</option>
                {declarations.map((declaration) => (
                  <option key={declaration.declaration_uid} value={declaration.declaration_uid}>
                    {declaration.declaration_no} - {declaration.display_name_txt}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Taxpayer" value={noticeForm.subject_uid} onChange={(value) => setNoticeForm({ ...noticeForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_uid} value={subject.subject_uid}>
                    {subject.display_name_txt}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Revenue type" value={noticeForm.revenue_kind_uid} onChange={(value) => setNoticeForm({ ...noticeForm, revenue_kind_uid: value })}>
                <option value="">Select revenue type</option>
                {(lookups.revenue_kinds || []).map((kind) => (
                  <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>
                    {kind.revenue_kind_name}
                  </option>
                ))}
              </SelectField>
              <Field label="Notice type">
                <input value={noticeForm.notice_type_cd} onChange={(event) => setNoticeForm({ ...noticeForm, notice_type_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Issue date">
                <input type="date" value={noticeForm.issue_dt} onChange={(event) => setNoticeForm({ ...noticeForm, issue_dt: event.target.value })} />
              </Field>
              <Field label="Due date">
                <input type="date" value={noticeForm.due_dt} onChange={(event) => setNoticeForm({ ...noticeForm, due_dt: event.target.value })} />
              </Field>
              <SelectField label="Initial workflow" value={noticeForm.workflow_action_cd} onChange={(value) => setNoticeForm({ ...noticeForm, workflow_action_cd: value })}>
                <option value="DRAFT">Save as draft</option>
                <option value="REVIEW">Mark reviewed</option>
                <option value="APPROVE">Approve</option>
              </SelectField>
              <Field label="Reason">
                <textarea value={noticeForm.reason_txt} onChange={(event) => setNoticeForm({ ...noticeForm, reason_txt: event.target.value })} />
              </Field>
              <div className="assessment-component-builder full-span">
                <div className="section-heading section-heading--compact">
                  <div>
                    <span>Liability components</span>
                    <h2>Principal, Credits And Adjustments</h2>
                  </div>
                  <button className="table-action-button" type="button" onClick={addComponentRow}>Add line</button>
                </div>
                {componentRows.map((row, index) => (
                  <div className="assessment-component-row" key={`${row.component_type_cd}-${index}`}>
                    <SelectField label="Type" value={row.component_type_cd} onChange={(value) => updateComponentRow(index, { component_type_cd: value })}>
                      {componentTypes.map((type) => (
                        <option key={type} value={type}>{compactCode(type)}</option>
                      ))}
                    </SelectField>
                    <SelectField label="Component" value={row.revenue_component_uid} onChange={(value) => updateComponentRow(index, { revenue_component_uid: value })}>
                      <option value="">Default mapping</option>
                      {componentOptions.map((component) => (
                        <option key={component.revenue_component_uid} value={component.revenue_component_uid}>{component.component_name}</option>
                      ))}
                    </SelectField>
                    <Field label="Amount">
                      <input type="number" min="0" step="0.01" value={row.amount_amt} onChange={(event) => updateComponentRow(index, { amount_amt: event.target.value })} />
                    </Field>
                    <Field label="Reason">
                      <input value={row.reason_txt} onChange={(event) => updateComponentRow(index, { reason_txt: event.target.value })} />
                    </Field>
                    <button className="table-action-button" type="button" onClick={() => removeComponentRow(index)}>Remove</button>
                  </div>
                ))}
                <div className="assessment-totals">
                  <span>Debit {formatMoney(componentTotals.debit)}</span>
                  <span>Credit {formatMoney(componentTotals.credit)}</span>
                  <strong>Net {formatMoney(componentTotals.debit - componentTotals.credit)}</strong>
                </div>
              </div>
              <button className="primary-button full-span" type="submit">Create liability notice</button>
            </form>
          </section>

          <aside className="content-band assessment-create-side">
            <div className="section-heading">
              <div>
                <span>Ready for assessment</span>
                <h2>Accepted Declarations</h2>
              </div>
              <ClipboardCheck size={22} />
            </div>
            <ul className="assessment-ready-list">
              {declarations.slice(0, 10).map((declaration) => (
                <li key={declaration.declaration_uid}>
                  <button type="button" onClick={() => syncDeclaration(declaration.declaration_uid)}>
                    <strong>{declaration.declaration_no}</strong>
                    <span>{declaration.display_name_txt}</span>
                    <small>{formatMoney(declaration.declared_total_amt)} | {declaration.revenue_kind_name || "Revenue type"}</small>
                  </button>
                </li>
              ))}
              {!declarations.length ? <li className="empty-panel">No accepted declarations are awaiting assessment.</li> : null}
            </ul>
          </aside>
        </div>
      ) : null}

      {activeTab === "adjustments" ? (
        <div className="assessment-adjustment-grid">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Controlled correction</span>
                <h2>Record Adjustment</h2>
              </div>
              <Scale size={22} />
            </div>
            <form className="action-form" onSubmit={submitAdjustment}>
              <SelectField label="Taxpayer" value={adjustmentForm.subject_uid} onChange={(value) => setAdjustmentForm({ ...adjustmentForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_uid} value={subject.subject_uid}>
                    {subject.display_name_txt}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Liability notice" value={adjustmentForm.liability_notice_uid} onChange={(value) => {
                const notice = notices.find((item) => item.liability_notice_uid === value);
                setAdjustmentForm({
                  ...adjustmentForm,
                  liability_notice_uid: value,
                  subject_uid: notice?.subject_uid || adjustmentForm.subject_uid,
                  revenue_kind_uid: notice?.revenue_kind_uid || adjustmentForm.revenue_kind_uid,
                });
              }}>
                <option value="">No notice selected</option>
                {notices.map((notice) => (
                  <option key={notice.liability_notice_uid} value={notice.liability_notice_uid}>
                    {notice.liability_notice_no} - {notice.display_name_txt}
                  </option>
                ))}
              </SelectField>
              <div className="compact-form">
                <Field label="Adjustment type">
                  <input value={adjustmentForm.adjustment_type_cd} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, adjustment_type_cd: event.target.value.toUpperCase() })} />
                </Field>
                <Field label="Amount">
                  <input type="number" required value={adjustmentForm.adjustment_amt} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, adjustment_amt: event.target.value })} />
                </Field>
              </div>
              <Field label="Reason">
                <textarea value={adjustmentForm.adjustment_reason_txt} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, adjustment_reason_txt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit">Record adjustment</button>
            </form>
          </section>
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Adjustment register</span>
                <h2>Review And Apply</h2>
              </div>
              <CheckCircle2 size={22} />
            </div>
            <DataTable columns={adjustmentColumns} rows={adjustments} keyField="adjustment_uid" empty="No adjustments recorded" />
          </section>
        </div>
      ) : null}

      {activeTab === "clearance" ? (
        <div className="assessment-clearance-grid">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Compliance standing</span>
                <h2>Create Clearance Snapshot</h2>
              </div>
              <ShieldCheck size={22} />
            </div>
            <form className="action-form" onSubmit={submitClearance}>
              <SelectField label="Taxpayer" value={clearanceForm.subject_uid} onChange={(value) => setClearanceForm({ ...clearanceForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_uid} value={subject.subject_uid}>
                    {subject.display_name_txt}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Override state" value={clearanceForm.clearance_state_cd} onChange={(value) => setClearanceForm({ ...clearanceForm, clearance_state_cd: value })}>
                <option value="">System calculated</option>
                <option value="CLEAR">Clear</option>
                <option value="NOT_CLEAR">Not clear</option>
              </SelectField>
              <button className="primary-button" type="submit">Create snapshot</button>
            </form>
          </section>
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Clearance evidence</span>
                <h2>Latest Snapshots</h2>
              </div>
              <ClipboardCheck size={22} />
            </div>
            <DataTable columns={clearanceColumns} rows={clearances} keyField="clearance_snapshot_uid" empty="No clearance snapshots recorded" />
          </section>
        </div>
      ) : null}
    </section>
  );
}
