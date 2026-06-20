import { BadgeDollarSign, ClipboardCheck, FileStack, Scale } from "lucide-react";
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
import { compactCode, formatDate, formatMoney, formatNumber } from "../utils/format.js";

const tabs = [
  { id: "notices", label: "Liability Notices" },
  { id: "adjustments", label: "Adjustments" },
  { id: "clearance", label: "Clearance" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function statusTone(value) {
  const status = String(value || "");
  if (["POSTED", "CLEAR", "APPROVED"].includes(status)) return "success";
  if (["REJECTED", "NOT_CLEAR", "CANCELLED"].includes(status)) return "danger";
  if (["DRAFT", "PENDING", "OPEN"].includes(status)) return "warning";
  return "neutral";
}

const initialNotice = {
  declaration_uid: "",
  subject_uid: "",
  revenue_kind_uid: "",
  period_instance_uid: "",
  revenue_component_uid: "",
  notice_type_cd: "ORIGINAL",
  issue_dt: today(),
  due_dt: "",
  net_liability_amt: "",
  component_type_cd: "PRINCIPAL",
  post_to_finance_bool: true,
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

export default function AssessmentPage() {
  const [activeTab, setActiveTab] = useState("notices");
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [lookups, setLookups] = useState({});
  const [declarations, setDeclarations] = useState([]);
  const [notices, setNotices] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [clearances, setClearances] = useState([]);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [noticeForm, setNoticeForm] = useState(initialNotice);
  const [adjustmentForm, setAdjustmentForm] = useState(initialAdjustment);
  const [clearanceForm, setClearanceForm] = useState(initialClearance);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const [overviewPayload, subjectsPayload, lookupPayload, declarationPayload, noticesPayload, adjustmentPayload, clearancePayload] =
      await Promise.all([
        apiRequest("/api/assessment/overview"),
        apiRequest("/api/registry/subjects?pageSize=100"),
        apiRequest("/api/configuration/lookups"),
        apiRequest("/api/filing/declarations?pageSize=100"),
        apiRequest("/api/assessment/liability-notices?pageSize=80"),
        apiRequest("/api/assessment/adjustments?pageSize=80"),
        apiRequest("/api/assessment/clearance-snapshots?pageSize=80"),
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
    void load().catch((loadError) => setError(loadError.message));
  }, []);

  const componentOptions = useMemo(
    () =>
      (lookups.revenue_components || []).filter(
        (component) => !noticeForm.revenue_kind_uid || component.revenue_kind_uid === noticeForm.revenue_kind_uid
      ),
    [lookups.revenue_components, noticeForm.revenue_kind_uid]
  );

  function syncDeclaration(declarationUid) {
    const declaration = declarations.find((item) => item.declaration_uid === declarationUid);
    setNoticeForm({
      ...noticeForm,
      declaration_uid: declarationUid,
      subject_uid: declaration?.subject_uid || noticeForm.subject_uid,
      revenue_kind_uid: declaration?.revenue_kind_uid || noticeForm.revenue_kind_uid,
      period_instance_uid: declaration?.period_instance_uid || noticeForm.period_instance_uid,
      net_liability_amt: declaration?.declared_total_amt ?? noticeForm.net_liability_amt,
    });
  }

  async function submitNotice(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      const amount = noticeForm.net_liability_amt === "" ? null : Number(noticeForm.net_liability_amt);
      const components =
        amount === null
          ? undefined
          : [
              {
                revenue_component_uid: noticeForm.revenue_component_uid || null,
                component_type_cd: noticeForm.component_type_cd,
                debit_amt: amount,
                credit_amt: 0,
              },
            ];
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
          net_liability_amt: amount,
          components,
          post_to_finance_bool: noticeForm.post_to_finance_bool,
        },
      });
      setNoticeForm(initialNotice);
      setSelectedNotice(payload.liability_notice);
      await load();
      setSuccess("Liability notice created");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function loadNotice(liabilityNoticeUid) {
    const payload = await apiRequest(`/api/assessment/liability-notices/${liabilityNoticeUid}`);
    setSelectedNotice(payload.liability_notice);
  }

  async function postNotice(liabilityNoticeUid) {
    setError("");
    setSuccess("");
    try {
      const payload = await apiRequest(`/api/assessment/liability-notices/${liabilityNoticeUid}/post`, { method: "POST" });
      setSelectedNotice(payload.liability_notice);
      await load();
      setSuccess("Liability notice posted to finance");
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
      setSuccess("Adjustment request recorded");
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
      setSuccess("Clearance snapshot issued");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  const noticeColumns = [
    { key: "liability_notice_no", label: "Notice" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "revenue_kind_name", label: "Revenue kind" },
    { key: "period_label_txt", label: "Period", render: (row) => row.period_label_txt || "-" },
    { key: "net_liability_amt", label: "Net liability", render: (row) => formatMoney(row.net_liability_amt) },
    { key: "liability_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.liability_state_cd)}>{compactCode(row.liability_state_cd)}</StatusPill> },
  ];

  const adjustmentColumns = [
    { key: "adjustment_no", label: "Adjustment" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "liability_notice_no", label: "Notice", render: (row) => row.liability_notice_no || "-" },
    { key: "adjustment_type_cd", label: "Type", render: (row) => compactCode(row.adjustment_type_cd) },
    { key: "adjustment_amt", label: "Amount", render: (row) => formatMoney(row.adjustment_amt) },
    { key: "adjustment_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.adjustment_state_cd)}>{compactCode(row.adjustment_state_cd)}</StatusPill> },
  ];

  const clearanceColumns = [
    { key: "snapshot_ts", label: "Snapshot", render: (row) => formatDate(row.snapshot_ts) },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "outstanding_balance_amt", label: "Balance", render: (row) => formatMoney(row.outstanding_balance_amt) },
    { key: "overdue_count_no", label: "Overdue", render: (row) => formatNumber(row.overdue_count_no) },
    { key: "clearance_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.clearance_state_cd)}>{compactCode(row.clearance_state_cd)}</StatusPill> },
  ];

  const componentColumns = [
    { key: "component_name", label: "Component", render: (row) => row.component_name || compactCode(row.component_type_cd) },
    { key: "component_type_cd", label: "Type", render: (row) => compactCode(row.component_type_cd) },
    { key: "debit_amt", label: "Debit", render: (row) => formatMoney(row.debit_amt) },
    { key: "credit_amt", label: "Credit", render: (row) => formatMoney(row.credit_amt) },
  ];

  const journalColumns = [
    { key: "journal_batch_no", label: "Batch" },
    { key: "gl_code", label: "GL code" },
    { key: "debit_amt", label: "Debit", render: (row) => formatMoney(row.debit_amt) },
    { key: "credit_amt", label: "Credit", render: (row) => formatMoney(row.credit_amt) },
  ];

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Assessment and liability" title="Notices, Adjustments And Clearance" status="Controlled posting" tone="success" />

      <div className="metric-grid">
        <MetricTile icon={FileStack} label="Liability notices" value={formatNumber(overview?.liability_notice_count)} />
        <MetricTile icon={BadgeDollarSign} label="Assessed value" value={formatMoney(overview?.assessed_total_amt)} />
        <MetricTile icon={Scale} label="Posted notices" value={formatNumber(overview?.posted_notice_count)} />
        <MetricTile icon={ClipboardCheck} label="Clearance snapshots" value={formatNumber(overview?.clearance_snapshot_count)} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "notices" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Assessment action</span>
                <h2>Create Liability Notice</h2>
              </div>
            </div>
            <form className="action-form" onSubmit={submitNotice}>
              <SelectField label="Accepted declaration" value={noticeForm.declaration_uid} onChange={syncDeclaration}>
                <option value="">Assess without declaration</option>
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
              <SelectField label="Revenue kind" value={noticeForm.revenue_kind_uid} onChange={(value) => setNoticeForm({ ...noticeForm, revenue_kind_uid: value, revenue_component_uid: "" })}>
                <option value="">Select revenue kind</option>
                {(lookups.revenue_kinds || []).map((kind) => (
                  <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>
                    {kind.revenue_kind_name}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Component" value={noticeForm.revenue_component_uid} onChange={(value) => setNoticeForm({ ...noticeForm, revenue_component_uid: value })}>
                <option value="">Default component</option>
                {componentOptions.map((component) => (
                  <option key={component.revenue_component_uid} value={component.revenue_component_uid}>
                    {component.component_name}
                  </option>
                ))}
              </SelectField>
              <div className="compact-form">
                <Field label="Issue date">
                  <input type="date" value={noticeForm.issue_dt} onChange={(event) => setNoticeForm({ ...noticeForm, issue_dt: event.target.value })} />
                </Field>
                <Field label="Due date">
                  <input type="date" value={noticeForm.due_dt} onChange={(event) => setNoticeForm({ ...noticeForm, due_dt: event.target.value })} />
                </Field>
              </div>
              <div className="compact-form">
                <Field label="Notice type">
                  <input value={noticeForm.notice_type_cd} onChange={(event) => setNoticeForm({ ...noticeForm, notice_type_cd: event.target.value.toUpperCase() })} />
                </Field>
                <Field label="Net liability">
                  <input type="number" required value={noticeForm.net_liability_amt} onChange={(event) => setNoticeForm({ ...noticeForm, net_liability_amt: event.target.value })} />
                </Field>
              </div>
              <label className="check-row">
                <span>Post to finance immediately</span>
                <input type="checkbox" checked={noticeForm.post_to_finance_bool} onChange={(event) => setNoticeForm({ ...noticeForm, post_to_finance_bool: event.target.checked })} />
              </label>
              <button className="primary-button" type="submit">Create notice</button>
            </form>
          </section>

          <section className="content-band">
            <DataTable columns={noticeColumns} rows={notices} keyField="liability_notice_uid" onRowClick={(row) => loadNotice(row.liability_notice_uid)} selectedKey={selectedNotice?.notice?.liability_notice_uid} empty="No liability notices" />
            <br />
            <div className="section-heading">
              <div>
                <span>Notice detail</span>
                <h2>{selectedNotice?.notice?.liability_notice_no || "Select a notice"}</h2>
              </div>
              {selectedNotice?.notice ? (
                <button className="secondary-button" type="button" onClick={() => postNotice(selectedNotice.notice.liability_notice_uid)} disabled={selectedNotice.notice.liability_state_cd === "POSTED"}>
                  Post notice
                </button>
              ) : null}
            </div>
            <DataTable columns={componentColumns} rows={selectedNotice?.components || []} keyField="liability_component_uid" empty="No notice components" />
            <br />
            <DataTable columns={journalColumns} rows={selectedNotice?.journal_lines || []} keyField="journal_line_uid" empty="No finance posting lines" />
          </section>
        </div>
      ) : null}

      {activeTab === "adjustments" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Controlled correction</span>
                <h2>Record Adjustment</h2>
              </div>
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
                <Field label="Adjustment amount">
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
            <DataTable columns={adjustmentColumns} rows={adjustments} keyField="adjustment_uid" empty="No adjustments" />
          </section>
        </div>
      ) : null}

      {activeTab === "clearance" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Compliance standing</span>
                <h2>Issue Clearance Snapshot</h2>
              </div>
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
              <button className="primary-button" type="submit">Issue snapshot</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={clearanceColumns} rows={clearances} keyField="clearance_snapshot_uid" empty="No clearance snapshots" />
          </section>
        </div>
      ) : null}
    </section>
  );
}
