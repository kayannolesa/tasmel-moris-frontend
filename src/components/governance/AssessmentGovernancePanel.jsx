import { ClipboardCheck, FilePenLine, Scale, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api.js";
import { DataTable, Field, GovernanceShell, ReasonField, SelectField, StatePill, commonColumns, compactCode, optionLabel, runMutation } from "./GovernanceShared.jsx";

const componentTypes = ["PRINCIPAL", "PENALTY", "INTEREST", "FEE", "CREDIT", "CONCESSION", "EXEMPTION", "ADJUSTMENT_DEBIT", "ADJUSTMENT_CREDIT"];

export default function AssessmentGovernancePanel() {
  const [notices, setNotices] = useState([]);
  const [clearances, setClearances] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notice, setNotice] = useState({ liability_notice_uid: "", notice_type_cd: "", issue_dt: "", due_dt: "", reason_txt: "" });
  const [component, setComponent] = useState({ liability_component_uid: "", component_type_cd: "PRINCIPAL", amount_amt: "", reason_txt: "" });
  const [retireComponent, setRetireComponent] = useState({ liability_component_uid: "", reason_txt: "" });
  const [amendment, setAmendment] = useState({ liability_notice_uid: "", adjustment_type_cd: "CONTROLLED_AMENDMENT", adjustment_amt: "", reason_txt: "" });
  const [cancelForm, setCancelForm] = useState({ liability_notice_uid: "", workflow_action_cd: "CANCEL", reason_txt: "" });
  const [clearance, setClearance] = useState({ clearance_snapshot_uid: "", clearance_state_cd: "", outstanding_balance_amt: "", overdue_count_no: "", missing_lodgement_count_no: "", active_hold_count_no: "", open_liability_count_no: "", pending_dispute_count_no: "", pending_assessment_count_no: "", reason_txt: "" });

  async function load() {
    setLoading(true);
    const [noticePayload, clearancePayload] = await Promise.all([
      apiRequest("/api/assessment/liability-notices?pageSize=140"),
      apiRequest("/api/assessment/clearance-snapshots?pageSize=120"),
    ]);
    setNotices(noticePayload.rows || []);
    setClearances(clearancePayload.rows || []);
    setLoading(false);
  }

  async function loadNotice(uid) {
    if (!uid) return setDetail(null);
    const payload = await apiRequest(`/api/assessment/liability-notices/${uid}`);
    setDetail(payload.liability_notice || null);
  }

  useEffect(() => {
    void load().catch((loadError) => { setError(loadError.message); setLoading(false); });
  }, []);

  async function mutate(endpoint, method, body, message) {
    await runMutation({ endpoint, method, body, setError, setSuccess, setSaving, successMessage: message, reload: async () => { await load(); if (detail?.notice?.liability_notice_uid) await loadNotice(detail.notice.liability_notice_uid); } });
  }

  function syncNotice(uid) {
    const row = notices.find((entry) => entry.liability_notice_uid === uid);
    setNotice({ liability_notice_uid: uid, notice_type_cd: row?.notice_type_cd || "", issue_dt: row?.issue_dt?.slice(0, 10) || "", due_dt: row?.due_dt?.slice(0, 10) || "", reason_txt: "" });
    setAmendment({ liability_notice_uid: uid, adjustment_type_cd: "CONTROLLED_AMENDMENT", adjustment_amt: "", reason_txt: "" });
    setCancelForm({ liability_notice_uid: uid, workflow_action_cd: "CANCEL", reason_txt: "" });
    void loadNotice(uid);
  }

  function syncComponent(uid) {
    const row = detail?.components?.find((entry) => entry.liability_component_uid === uid);
    setComponent({ liability_component_uid: uid, component_type_cd: row?.component_type_cd || "PRINCIPAL", amount_amt: row?.amount_amt ?? row?.debit_amt ?? row?.credit_amt ?? "", reason_txt: "" });
    setRetireComponent({ liability_component_uid: uid, reason_txt: "" });
  }

  function syncClearance(uid) {
    const row = clearances.find((entry) => entry.clearance_snapshot_uid === uid);
    setClearance({ clearance_snapshot_uid: uid, clearance_state_cd: row?.clearance_state_cd || "", outstanding_balance_amt: row?.outstanding_balance_amt ?? "", overdue_count_no: row?.overdue_count_no ?? "", missing_lodgement_count_no: row?.missing_lodgement_count_no ?? "", active_hold_count_no: row?.active_hold_count_no ?? "", open_liability_count_no: row?.open_liability_count_no ?? "", pending_dispute_count_no: row?.pending_dispute_count_no ?? "", pending_assessment_count_no: row?.pending_assessment_count_no ?? "", reason_txt: "" });
  }

  const noticeColumns = [
    { key: "liability_notice_no", label: "Notice" },
    { key: "taxpayer", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    commonColumns.money("net_liability_amt", "Net"),
    commonColumns.state("liability_state_cd", "State"),
  ];
  const componentColumns = [
    { key: "component_type_cd", label: "Type", render: (row) => compactCode(row.component_type_cd) },
    { key: "amount", label: "Amount", render: (row) => row.amount_amt ?? row.debit_amt ?? row.credit_amt ?? "-" },
    commonColumns.state("component_state_cd", "State"),
  ];
  const clearanceColumns = [
    { key: "taxpayer", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    commonColumns.money("outstanding_balance_amt", "Outstanding"),
    { key: "overdue_count_no", label: "Overdue" },
    commonColumns.state("clearance_state_cd", "State"),
  ];

  return (
    <GovernanceShell error={error} success={success}>
      <section className="content-band">
        <div className="section-heading"><div><span>Liability notices</span><h2>Draft Notice Correction</h2></div><FilePenLine size={22} /></div>
        <DataTable columns={noticeColumns} rows={notices} keyField="liability_notice_uid" onRowClick={(row) => syncNotice(row.liability_notice_uid)} selectedKey={notice.liability_notice_uid} empty={loading ? "Loading notices" : "No liability notices"} />
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/assessment/liability-notices/${notice.liability_notice_uid}`, "PATCH", notice, "Liability notice corrected."); }}>
          <div className="compact-form"><Field label="Notice type"><input value={notice.notice_type_cd} onChange={(event) => setNotice({ ...notice, notice_type_cd: event.target.value.toUpperCase() })} /></Field><Field label="Issue date"><input type="date" value={notice.issue_dt} onChange={(event) => setNotice({ ...notice, issue_dt: event.target.value })} /></Field><Field label="Due date"><input type="date" value={notice.due_dt} onChange={(event) => setNotice({ ...notice, due_dt: event.target.value })} /></Field></div>
          <ReasonField value={notice.reason_txt} onChange={(value) => setNotice({ ...notice, reason_txt: value })} />
          <button className="secondary-button" type="submit" disabled={saving || !notice.liability_notice_uid}>Save notice correction</button>
        </form>
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/assessment/liability-notices/${cancelForm.liability_notice_uid}/state`, "PATCH", cancelForm, "Liability notice cancelled with audit reason."); }}>
          <ReasonField label="Cancellation reason" value={cancelForm.reason_txt} onChange={(value) => setCancelForm({ ...cancelForm, reason_txt: value })} />
          <button className="danger-button" type="submit" disabled={saving || !cancelForm.liability_notice_uid}>Cancel notice</button>
        </form>
      </section>

      <section className="content-band">
        <div className="section-heading"><div><span>Liability components</span><h2>Edit Or Retire Draft Components</h2></div><Scale size={22} /></div>
        <DataTable columns={componentColumns} rows={detail?.components || []} keyField="liability_component_uid" onRowClick={(row) => syncComponent(row.liability_component_uid)} selectedKey={component.liability_component_uid} empty="Select a notice to view components" />
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/assessment/liability-components/${component.liability_component_uid}`, "PATCH", component, "Liability component corrected."); }}>
          <div className="compact-form"><SelectField label="Type" value={component.component_type_cd} onChange={(value) => setComponent({ ...component, component_type_cd: value })}>{componentTypes.map((type) => <option key={type} value={type}>{compactCode(type)}</option>)}</SelectField><Field label="Amount"><input type="number" step="0.01" value={component.amount_amt} onChange={(event) => setComponent({ ...component, amount_amt: event.target.value })} /></Field></div>
          <ReasonField value={component.reason_txt} onChange={(value) => setComponent({ ...component, reason_txt: value })} />
          <button className="secondary-button" type="submit" disabled={saving || !component.liability_component_uid}>Save component</button>
        </form>
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/assessment/liability-components/${retireComponent.liability_component_uid}/retire`, "PATCH", retireComponent, "Liability component retired."); }}>
          <ReasonField label="Retirement reason" value={retireComponent.reason_txt} onChange={(value) => setRetireComponent({ ...retireComponent, reason_txt: value })} />
          <button className="danger-button" type="submit" disabled={saving || !retireComponent.liability_component_uid}>Retire component</button>
        </form>
      </section>

      <section className="content-band">
        <div className="section-heading"><div><span>Issued notice controls</span><h2>Controlled Amendment</h2></div><ClipboardCheck size={22} /></div>
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/assessment/liability-notices/${amendment.liability_notice_uid}/controlled-amendments`, "POST", amendment, "Controlled amendment recorded."); }}>
          <SelectField label="Notice" required value={amendment.liability_notice_uid} onChange={syncNotice}><option value="">Select notice</option>{notices.map((row) => <option key={row.liability_notice_uid} value={row.liability_notice_uid}>{optionLabel(row.liability_notice_no, row.display_name_txt, compactCode(row.liability_state_cd))}</option>)}</SelectField>
          <div className="compact-form"><Field label="Adjustment type"><input value={amendment.adjustment_type_cd} onChange={(event) => setAmendment({ ...amendment, adjustment_type_cd: event.target.value.toUpperCase() })} /></Field><Field label="Amount"><input type="number" step="0.01" required value={amendment.adjustment_amt} onChange={(event) => setAmendment({ ...amendment, adjustment_amt: event.target.value })} /></Field></div>
          <ReasonField value={amendment.reason_txt} onChange={(value) => setAmendment({ ...amendment, reason_txt: value })} />
          <button className="primary-button" type="submit" disabled={saving || !amendment.liability_notice_uid}>Record controlled amendment</button>
        </form>
      </section>

      <section className="content-band">
        <div className="section-heading"><div><span>Clearance review</span><h2>Snapshot Correction</h2></div><ShieldCheck size={22} /></div>
        <DataTable columns={clearanceColumns} rows={clearances} keyField="clearance_snapshot_uid" onRowClick={(row) => syncClearance(row.clearance_snapshot_uid)} selectedKey={clearance.clearance_snapshot_uid} empty="No clearance snapshots" />
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/assessment/clearance-snapshots/${clearance.clearance_snapshot_uid}`, "PATCH", clearance, "Clearance snapshot reviewed."); }}>
          <div className="compact-form"><SelectField label="Clearance state" value={clearance.clearance_state_cd} onChange={(value) => setClearance({ ...clearance, clearance_state_cd: value })}><option value="">Keep current</option><option value="CLEAR">Clear</option><option value="NOT_CLEAR">Not clear</option><option value="CONDITIONAL">Conditional</option></SelectField><Field label="Outstanding"><input type="number" step="0.01" value={clearance.outstanding_balance_amt} onChange={(event) => setClearance({ ...clearance, outstanding_balance_amt: event.target.value })} /></Field><Field label="Overdue count"><input type="number" value={clearance.overdue_count_no} onChange={(event) => setClearance({ ...clearance, overdue_count_no: event.target.value })} /></Field></div>
          <div className="compact-form"><Field label="Missing filings"><input type="number" value={clearance.missing_lodgement_count_no} onChange={(event) => setClearance({ ...clearance, missing_lodgement_count_no: event.target.value })} /></Field><Field label="Active holds"><input type="number" value={clearance.active_hold_count_no} onChange={(event) => setClearance({ ...clearance, active_hold_count_no: event.target.value })} /></Field><Field label="Open liabilities"><input type="number" value={clearance.open_liability_count_no} onChange={(event) => setClearance({ ...clearance, open_liability_count_no: event.target.value })} /></Field></div>
          <ReasonField value={clearance.reason_txt} onChange={(value) => setClearance({ ...clearance, reason_txt: value })} />
          <button className="secondary-button" type="submit" disabled={saving || !clearance.clearance_snapshot_uid}>Review snapshot</button>
        </form>
      </section>
    </GovernanceShell>
  );
}
