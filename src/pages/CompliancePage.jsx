import {
  AlertTriangle,
  BookOpenCheck,
  ClipboardCheck,
  ClipboardList,
  FileSearch,
  Flag,
  Link2,
  Radar,
  RefreshCw,
  Scale,
  ShieldCheck,
  UserCheck,
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
  { id: "workbench", label: "Risk Workbench" },
  { id: "signals", label: "Signals" },
  { id: "plans", label: "Plans" },
  { id: "audits", label: "Audits" },
  { id: "investigations", label: "Investigations" },
  { id: "disclosures", label: "Disclosures" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function futureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function statusTone(value) {
  const status = String(value || "");
  if (["LOW", "CLOSED", "COMPLETE", "COMPLETED", "SATISFIED", "ACCEPTED", "RESOLVED"].includes(status)) return "success";
  if (["MEDIUM", "NORMAL", "OPEN", "DRAFT", "PLANNED", "ISSUED", "LODGED", "QUEUED", "IN_PROGRESS"].includes(status)) return "warning";
  if (["HIGH", "CRITICAL", "URGENT", "RESTRICTED", "ESCALATED", "REJECTED", "FAILED"].includes(status)) return "danger";
  return "neutral";
}

function priorityFromRisk(rating) {
  if (rating === "CRITICAL") return "URGENT";
  if (rating === "HIGH") return "HIGH";
  if (rating === "MEDIUM") return "NORMAL";
  return "LOW";
}

function stripEmpty(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== "" && value !== null && value !== undefined));
}

const initialFilters = { q: "", risk_rating_cd: "", min_score: "" };
const initialRisk = {
  subject_uid: "",
  revenue_kind_uid: "",
  risk_scope_cd: "TAXPAYER",
  risk_score_no: 65,
  risk_rating_cd: "MEDIUM",
  risk_priority_cd: "NORMAL",
  queue_state_cd: "QUEUED",
  model_version_txt: "OFFICER_ASSESSMENT_V1",
  risk_summary_txt: "",
  signal_name: "Officer risk indicator",
  signal_weight_no: 1,
  signal_value_txt: "",
};
const initialSignalType = {
  signal_name: "",
  signal_group_cd: "OFFICER",
  default_weight_no: 10,
  default_rating_cd: "MEDIUM",
  description_txt: "",
};
const initialPlan = {
  subject_uid: "",
  risk_profile_uid: "",
  plan_name: "",
  plan_type_cd: "TARGETED_COMPLIANCE",
  start_dt: today(),
  end_dt: futureDate(90),
  target_completion_dt: futureDate(90),
  priority_cd: "NORMAL",
  plan_state_cd: "ACTIVE",
  objective_txt: "",
};
const initialAction = {
  compliance_plan_uid: "",
  subject_uid: "",
  revenue_kind_uid: "",
  action_type_cd: "REVIEW",
  action_state_cd: "OPEN",
  priority_cd: "NORMAL",
  due_dt: futureDate(14),
  action_note_txt: "",
};
const initialAudit = {
  subject_uid: "",
  revenue_kind_uid: "",
  compliance_action_uid: "",
  risk_profile_uid: "",
  scope_txt: "",
  objective_txt: "",
  audit_state_cd: "PLANNED",
  start_dt: today(),
};
const initialFinding = {
  audit_engagement_uid: "",
  finding_type_cd: "UNDER_DECLARATION",
  finding_txt: "",
  proposed_adjustment_amt: "",
  recommendation_txt: "",
};
const initialInfo = {
  subject_uid: "",
  audit_engagement_uid: "",
  request_type_cd: "DOCUMENTS",
  request_txt: "",
  issued_dt: today(),
  due_dt: futureDate(14),
  request_state_cd: "ISSUED",
};
const initialInvestigation = {
  subject_uid: "",
  risk_profile_uid: "",
  investigation_type_cd: "COMPLIANCE",
  restriction_level_cd: "RESTRICTED",
  investigation_state_cd: "OPEN",
  summary_txt: "",
};
const initialEvidence = {
  subject_uid: "",
  investigation_file_uid: "",
  audit_engagement_uid: "",
  content_record_uid: "",
  evidence_type_cd: "DOCUMENT",
  custody_state_cd: "RECEIVED",
  description_txt: "",
};
const initialDisclosure = {
  subject_uid: "",
  revenue_kind_uid: "",
  declaration_uid: "",
  liability_notice_uid: "",
  approval_request_uid: "",
  disclosure_state_cd: "LODGED",
  disclosure_summary_txt: "",
  estimated_liability_amt: "",
  assessed_liability_amt: "",
  relief_decision_cd: "",
  decision_txt: "",
};
const initialLink = {
  compliance_plan_uid: "",
  compliance_action_uid: "",
  audit_engagement_uid: "",
  investigation_file_uid: "",
  disclosure_uid: "",
  subject_uid: "",
  target_schema_cd: "DOC",
  target_table_cd: "doc_content_record",
  target_record_uid: "",
  target_role_cd: "RELATED_RECORD",
  link_note_txt: "",
};

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState("workbench");
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [staff, setStaff] = useState([]);
  const [lookups, setLookups] = useState({});
  const [contentRecords, setContentRecords] = useState([]);
  const [liabilityNotices, setLiabilityNotices] = useState([]);
  const [declarations, setDeclarations] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [workbench, setWorkbench] = useState([]);
  const [signalTypes, setSignalTypes] = useState([]);
  const [riskProfiles, setRiskProfiles] = useState([]);
  const [signals, setSignals] = useState([]);
  const [plans, setPlans] = useState([]);
  const [actions, setActions] = useState([]);
  const [audits, setAudits] = useState([]);
  const [findings, setFindings] = useState([]);
  const [infoRequests, setInfoRequests] = useState([]);
  const [investigations, setInvestigations] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [disclosures, setDisclosures] = useState([]);
  const [recordLinks, setRecordLinks] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [riskForm, setRiskForm] = useState(initialRisk);
  const [signalTypeForm, setSignalTypeForm] = useState(initialSignalType);
  const [planForm, setPlanForm] = useState(initialPlan);
  const [actionForm, setActionForm] = useState(initialAction);
  const [auditForm, setAuditForm] = useState(initialAudit);
  const [findingForm, setFindingForm] = useState(initialFinding);
  const [infoForm, setInfoForm] = useState(initialInfo);
  const [investigationForm, setInvestigationForm] = useState(initialInvestigation);
  const [evidenceForm, setEvidenceForm] = useState(initialEvidence);
  const [disclosureForm, setDisclosureForm] = useState(initialDisclosure);
  const [linkForm, setLinkForm] = useState(initialLink);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.subject_uid === riskForm.subject_uid || subject.subject_uid === planForm.subject_uid),
    [subjects, riskForm.subject_uid, planForm.subject_uid]
  );

  function subjectOptions() {
    return subjects.map((subject) => (
      <option key={subject.subject_uid} value={subject.subject_uid}>
        {subject.display_name_txt || subject.subject_no}
      </option>
    ));
  }

  function revenueKindOptions() {
    return (lookups.revenue_kinds || []).map((kind) => (
      <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>
        {kind.revenue_kind_name}
      </option>
    ));
  }

  function staffOptions() {
    return staff.map((user) => (
      <option key={user.actor_uid} value={user.actor_uid}>
        {user.display_name_txt || user.full_name_txt || user.email_txt}
      </option>
    ));
  }

  function queryString(extra = {}) {
    const params = new URLSearchParams(stripEmpty({ ...filters, ...extra }));
    params.set("pageSize", "120");
    return params.toString();
  }

  async function load() {
    setLoading(true);
    try {
      const [
        overviewPayload,
        subjectsPayload,
        lookupsPayload,
        staffPayload,
        contentPayload,
        liabilityPayload,
        declarationPayload,
        receiptPayload,
        messagePayload,
        workbenchPayload,
        typePayload,
        riskPayload,
        signalPayload,
        planPayload,
        actionPayload,
        auditPayload,
        findingPayload,
        infoPayload,
        investigationPayload,
        evidencePayload,
        disclosurePayload,
        linkPayload,
      ] = await Promise.all([
        apiRequest("/api/compliance/overview"),
        apiRequest("/api/registry/subjects?pageSize=150"),
        apiRequest("/api/configuration/lookups"),
        apiRequest("/api/admin/staff?pageSize=150").catch(() => ({ rows: [] })),
        apiRequest("/api/documents/content-records?pageSize=150"),
        apiRequest("/api/assessment/liability-notices?pageSize=150"),
        apiRequest("/api/filing/declarations?pageSize=150"),
        apiRequest("/api/finance/receipts?pageSize=150"),
        apiRequest("/api/documents/messages?pageSize=150"),
        apiRequest(`/api/compliance/risk-workbench?${queryString()}`),
        apiRequest("/api/compliance/risk-signal-types?pageSize=150"),
        apiRequest("/api/compliance/risk-profiles?pageSize=150"),
        apiRequest("/api/compliance/risk-signals?pageSize=150"),
        apiRequest("/api/compliance/plans?pageSize=150"),
        apiRequest("/api/compliance/actions?pageSize=150"),
        apiRequest("/api/compliance/audits?pageSize=150"),
        apiRequest("/api/compliance/audit-findings?pageSize=150"),
        apiRequest("/api/compliance/information-requests?pageSize=150"),
        apiRequest("/api/compliance/investigations?pageSize=150"),
        apiRequest("/api/compliance/evidence?pageSize=150"),
        apiRequest("/api/compliance/voluntary-disclosures?pageSize=150"),
        apiRequest("/api/compliance/record-links?pageSize=150"),
      ]);

      setOverview(overviewPayload.overview);
      setSubjects(subjectsPayload.rows || []);
      setLookups(lookupsPayload.lookups || {});
      setStaff(staffPayload.rows || []);
      setContentRecords(contentPayload.rows || []);
      setLiabilityNotices(liabilityPayload.rows || []);
      setDeclarations(declarationPayload.rows || []);
      setReceipts(receiptPayload.rows || []);
      setMessages(messagePayload.rows || []);
      setWorkbench(workbenchPayload.rows || []);
      setSignalTypes(typePayload.rows || []);
      setRiskProfiles(riskPayload.rows || []);
      setSignals(signalPayload.rows || []);
      setPlans(planPayload.rows || []);
      setActions(actionPayload.rows || []);
      setAudits(auditPayload.rows || []);
      setFindings(findingPayload.rows || []);
      setInfoRequests(infoPayload.rows || []);
      setInvestigations(investigationPayload.rows || []);
      setEvidence(evidencePayload.rows || []);
      setDisclosures(disclosurePayload.rows || []);
      setRecordLinks(linkPayload.rows || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load().catch((loadError) => setError(loadError.message));
  }, []);

  async function submit(endpoint, body, reset, message) {
    setError("");
    setSuccess("");
    try {
      await apiRequest(endpoint, { method: "POST", body: stripEmpty(body) });
      reset();
      await load();
      setSuccess(message);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function refreshSubjectRisk(subjectUid) {
    if (!subjectUid) return;
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/compliance/risk-workbench/${subjectUid}/refresh`, { method: "POST", body: {} });
      await load();
      setSuccess("Automated risk profile refreshed.");
    } catch (refreshError) {
      setError(refreshError.message);
    }
  }

  function seedFromWorkbench(row) {
    setRiskForm({
      ...initialRisk,
      subject_uid: row.subject_uid,
      risk_score_no: Math.round(Number(row.risk_score_no || row.calculated_score_no || 0)),
      risk_rating_cd: row.risk_rating_cd || "MEDIUM",
      risk_priority_cd: row.risk_priority_cd || priorityFromRisk(row.risk_rating_cd),
      risk_summary_txt: [
        `${row.overdue_obligation_count} overdue obligations`,
        `${row.missing_filing_count} missing filings`,
        `${row.unpaid_liability_count} unpaid liabilities`,
        `${formatMoney(row.outstanding_liability_amt)} outstanding`,
      ].join("; "),
      signal_value_txt: `${row.risk_score_no} calculated score`,
    });
    setPlanForm({
      ...initialPlan,
      subject_uid: row.subject_uid,
      risk_profile_uid: row.risk_profile_uid || "",
      priority_cd: row.risk_priority_cd || priorityFromRisk(row.risk_rating_cd),
      plan_name: `${row.display_name_txt} compliance plan`,
      objective_txt: `Address ${compactCode(row.risk_rating_cd)} risk indicators and restore taxpayer compliance standing.`,
    });
    setActionForm({
      ...initialAction,
      subject_uid: row.subject_uid,
      priority_cd: row.risk_priority_cd || priorityFromRisk(row.risk_rating_cd),
      action_note_txt: row.risk_summary_txt || "Review calculated MORIS risk indicators.",
    });
    setAuditForm({ ...initialAudit, subject_uid: row.subject_uid, risk_profile_uid: row.risk_profile_uid || "" });
    setInvestigationForm({ ...initialInvestigation, subject_uid: row.subject_uid, risk_profile_uid: row.risk_profile_uid || "" });
    setDisclosureForm({ ...initialDisclosure, subject_uid: row.subject_uid });
    setActiveTab("plans");
  }

  const workbenchColumns = [
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || row.subject_no },
    { key: "risk_score_no", label: "Score", render: (row) => formatNumber(Math.round(Number(row.risk_score_no || 0))) },
    { key: "risk_rating_cd", label: "Rating", render: (row) => <StatusPill tone={statusTone(row.risk_rating_cd)}>{compactCode(row.risk_rating_cd)}</StatusPill> },
    { key: "overdue_obligation_count", label: "Overdue", render: (row) => formatNumber(row.overdue_obligation_count) },
    { key: "missing_filing_count", label: "Missing filings", render: (row) => formatNumber(row.missing_filing_count) },
    { key: "outstanding_liability_amt", label: "Outstanding", render: (row) => formatMoney(row.outstanding_liability_amt) },
    { key: "active_hold_count", label: "Holds", render: (row) => formatNumber(row.active_hold_count) },
    {
      key: "actions",
      label: "Action",
      render: (row) => (
        <div className="inline-action-row">
          <button className="icon-inline-button" type="button" title="Refresh automated risk" onClick={(event) => { event.stopPropagation(); void refreshSubjectRisk(row.subject_uid); }}>
            <RefreshCw size={16} />
          </button>
          <button className="secondary-button secondary-button--compact" type="button" onClick={(event) => { event.stopPropagation(); seedFromWorkbench(row); }}>
            Open
          </button>
        </div>
      ),
    },
  ];

  const riskColumns = [
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "risk_scope_cd", label: "Scope", render: (row) => compactCode(row.risk_scope_cd) },
    { key: "risk_score_no", label: "Score", render: (row) => formatNumber(row.risk_score_no) },
    { key: "signal_count", label: "Signals", render: (row) => formatNumber(row.signal_count) },
    { key: "queue_state_cd", label: "Queue", render: (row) => <StatusPill tone={statusTone(row.queue_state_cd)}>{compactCode(row.queue_state_cd)}</StatusPill> },
    { key: "risk_rating_cd", label: "Rating", render: (row) => <StatusPill tone={statusTone(row.risk_rating_cd)}>{compactCode(row.risk_rating_cd)}</StatusPill> },
  ];

  const signalColumns = [
    { key: "signal_name", label: "Signal" },
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "signal_group_cd", label: "Group", render: (row) => compactCode(row.signal_group_cd || row.signal_source_cd) },
    { key: "signal_weight_no", label: "Weight", render: (row) => formatNumber(row.signal_weight_no) },
    { key: "signal_value_txt", label: "Value", render: (row) => row.signal_value_txt || "-" },
  ];

  const signalTypeColumns = [
    { key: "signal_code", label: "Code" },
    { key: "signal_name", label: "Signal" },
    { key: "signal_group_cd", label: "Group", render: (row) => compactCode(row.signal_group_cd) },
    { key: "default_weight_no", label: "Weight", render: (row) => formatNumber(row.default_weight_no) },
    { key: "default_rating_cd", label: "Rating", render: (row) => <StatusPill tone={statusTone(row.default_rating_cd)}>{compactCode(row.default_rating_cd)}</StatusPill> },
  ];

  const planColumns = [
    { key: "plan_name", label: "Plan" },
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "priority_cd", label: "Priority", render: (row) => <StatusPill tone={statusTone(row.priority_cd)}>{compactCode(row.priority_cd)}</StatusPill> },
    { key: "target_completion_dt", label: "Target", render: (row) => formatDate(row.target_completion_dt || row.end_dt) },
    { key: "action_count", label: "Actions", render: (row) => formatNumber(row.action_count) },
    { key: "plan_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.plan_state_cd)}>{compactCode(row.plan_state_cd)}</StatusPill> },
  ];

  const actionColumns = [
    { key: "action_no", label: "Action" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "plan_name", label: "Plan", render: (row) => row.plan_name || "-" },
    { key: "action_type_cd", label: "Type", render: (row) => compactCode(row.action_type_cd) },
    { key: "due_dt", label: "Due", render: (row) => formatDate(row.due_dt) },
    { key: "action_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.action_state_cd)}>{compactCode(row.action_state_cd)}</StatusPill> },
  ];

  const auditColumns = [
    { key: "audit_no", label: "Audit" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "finding_count", label: "Findings", render: (row) => formatNumber(row.finding_count) },
    { key: "start_dt", label: "Start", render: (row) => formatDate(row.start_dt) },
    { key: "audit_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.audit_state_cd)}>{compactCode(row.audit_state_cd)}</StatusPill> },
  ];

  const findingColumns = [
    { key: "audit_no", label: "Audit" },
    { key: "finding_type_cd", label: "Finding", render: (row) => compactCode(row.finding_type_cd) },
    { key: "proposed_adjustment_amt", label: "Adjustment", render: (row) => formatMoney(row.proposed_adjustment_amt) },
    { key: "finding_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.finding_state_cd)}>{compactCode(row.finding_state_cd)}</StatusPill> },
  ];

  const infoColumns = [
    { key: "request_no", label: "Request" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "request_type_cd", label: "Type", render: (row) => compactCode(row.request_type_cd) },
    { key: "due_dt", label: "Due", render: (row) => formatDate(row.due_dt) },
    { key: "request_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.request_state_cd)}>{compactCode(row.request_state_cd)}</StatusPill> },
  ];

  const investigationColumns = [
    { key: "investigation_no", label: "Investigation" },
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "investigation_type_cd", label: "Type", render: (row) => compactCode(row.investigation_type_cd) },
    { key: "evidence_count", label: "Evidence", render: (row) => formatNumber(row.evidence_count) },
    { key: "investigation_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.investigation_state_cd)}>{compactCode(row.investigation_state_cd)}</StatusPill> },
  ];

  const evidenceColumns = [
    { key: "evidence_no", label: "Evidence" },
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "investigation_no", label: "Case", render: (row) => row.investigation_no || row.audit_no || "-" },
    { key: "evidence_type_cd", label: "Type", render: (row) => compactCode(row.evidence_type_cd) },
    { key: "file_name_txt", label: "Document", render: (row) => row.file_name_txt || row.content_no || "-" },
  ];

  const disclosureColumns = [
    { key: "disclosure_no", label: "Disclosure" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "estimated_liability_amt", label: "Estimate", render: (row) => formatMoney(row.estimated_liability_amt) },
    { key: "assessed_liability_amt", label: "Assessed", render: (row) => formatMoney(row.assessed_liability_amt) },
    { key: "relief_decision_cd", label: "Relief", render: (row) => compactCode(row.relief_decision_cd) },
    { key: "disclosure_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.disclosure_state_cd)}>{compactCode(row.disclosure_state_cd)}</StatusPill> },
  ];

  const linkColumns = [
    { key: "target_schema_cd", label: "Domain", render: (row) => compactCode(row.target_schema_cd) },
    { key: "target_table_cd", label: "Record", render: (row) => compactCode(row.target_table_cd) },
    { key: "target_role_cd", label: "Role", render: (row) => compactCode(row.target_role_cd) },
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "created_ts", label: "Linked", render: (row) => formatDateTime(row.created_ts) },
  ];

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Compliance and risk" title="Risk, Audit And Investigation Control" status={loading ? "Refreshing" : "Controlled"} tone="success" />

      <div className="metric-grid">
        <MetricTile icon={ShieldCheck} label="Risk profiles" value={formatNumber(overview?.risk_profile_count)} sublabel={`${formatNumber(overview?.average_risk_score_no)} average score`} />
        <MetricTile icon={AlertTriangle} label="Elevated risk" value={formatNumber(overview?.elevated_risk_count)} sublabel={`${formatNumber(overview?.critical_risk_count)} critical`} />
        <MetricTile icon={ClipboardList} label="Open actions" value={formatNumber(overview?.open_action_count)} sublabel={`${formatNumber(overview?.open_information_request_count)} information requests`} />
        <MetricTile icon={FileSearch} label="Open investigations" value={formatNumber(overview?.open_investigation_count)} sublabel={`${formatNumber(overview?.evidence_count)} evidence records`} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "workbench" ? (
        <div className="compliance-workbench-grid">
          <section className="content-band compliance-workbench-grid__main">
            <div className="section-heading">
              <div>
                <span>Calculated risk queue</span>
                <h2>High-Risk Taxpayer Dashboard</h2>
              </div>
              <Radar size={22} />
            </div>
            <form className="compliance-filter-bar" onSubmit={(event) => { event.preventDefault(); void load().catch((loadError) => setError(loadError.message)); }}>
              <Field label="Search">
                <input value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
              </Field>
              <SelectField label="Rating" value={filters.risk_rating_cd} onChange={(value) => setFilters({ ...filters, risk_rating_cd: value })}>
                <option value="">All ratings</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </SelectField>
              <Field label="Minimum score">
                <input type="number" value={filters.min_score} onChange={(event) => setFilters({ ...filters, min_score: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit">Search queue</button>
            </form>
            <DataTable columns={workbenchColumns} rows={workbench} keyField="subject_uid" empty="No taxpayers match the current risk filters" />
          </section>

          <aside className="content-band">
            <div className="section-heading">
              <div>
                <span>Officer flag</span>
                <h2>Manual Risk Profile</h2>
              </div>
              <Flag size={22} />
            </div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/compliance/risk-profiles", {
                ...riskForm,
                subject_uid: riskForm.subject_uid || null,
                revenue_kind_uid: riskForm.revenue_kind_uid || null,
                risk_score_no: Number(riskForm.risk_score_no || 0),
                manual_flag_bool: true,
                signals: riskForm.signal_name ? [{
                  signal_name: riskForm.signal_name,
                  signal_weight_no: Number(riskForm.signal_weight_no || 0),
                  signal_value_txt: riskForm.signal_value_txt || null,
                  signal_source_cd: "OFFICER",
                }] : [],
              }, () => setRiskForm(initialRisk), "Risk profile recorded.");
            }}>
              <SelectField label="Taxpayer" value={riskForm.subject_uid} onChange={(value) => setRiskForm({ ...riskForm, subject_uid: value })}>
                <option value="">No taxpayer context</option>
                {subjectOptions()}
              </SelectField>
              <SelectField label="Revenue kind" value={riskForm.revenue_kind_uid} onChange={(value) => setRiskForm({ ...riskForm, revenue_kind_uid: value })}>
                <option value="">All revenue</option>
                {revenueKindOptions()}
              </SelectField>
              <div className="compact-form">
                <Field label="Score"><input type="number" value={riskForm.risk_score_no} onChange={(event) => setRiskForm({ ...riskForm, risk_score_no: event.target.value })} /></Field>
                <SelectField label="Rating" value={riskForm.risk_rating_cd} onChange={(value) => setRiskForm({ ...riskForm, risk_rating_cd: value, risk_priority_cd: priorityFromRisk(value) })}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </SelectField>
              </div>
              <Field label="Summary"><textarea value={riskForm.risk_summary_txt} onChange={(event) => setRiskForm({ ...riskForm, risk_summary_txt: event.target.value })} /></Field>
              <Field label="Signal"><input value={riskForm.signal_name} onChange={(event) => setRiskForm({ ...riskForm, signal_name: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Record risk</button>
            </form>
            {selectedSubject ? <div className="compliance-subject-note"><UserCheck size={18} /><span>{selectedSubject.subject_no}</span></div> : null}
          </aside>
        </div>
      ) : null}

      {activeTab === "signals" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Signal catalogue</span>
                <h2>Configurable Risk Indicators</h2>
              </div>
              <BookOpenCheck size={22} />
            </div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/compliance/risk-signal-types", signalTypeForm, () => setSignalTypeForm(initialSignalType), "Risk signal type saved.");
            }}>
              <Field label="Signal name"><input required value={signalTypeForm.signal_name} onChange={(event) => setSignalTypeForm({ ...signalTypeForm, signal_name: event.target.value })} /></Field>
              <div className="compact-form">
                <Field label="Group"><input value={signalTypeForm.signal_group_cd} onChange={(event) => setSignalTypeForm({ ...signalTypeForm, signal_group_cd: event.target.value.toUpperCase() })} /></Field>
                <Field label="Weight"><input type="number" value={signalTypeForm.default_weight_no} onChange={(event) => setSignalTypeForm({ ...signalTypeForm, default_weight_no: event.target.value })} /></Field>
              </div>
              <SelectField label="Default rating" value={signalTypeForm.default_rating_cd} onChange={(value) => setSignalTypeForm({ ...signalTypeForm, default_rating_cd: value })}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </SelectField>
              <Field label="Description"><textarea value={signalTypeForm.description_txt} onChange={(event) => setSignalTypeForm({ ...signalTypeForm, description_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Save signal</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={signalTypeColumns} rows={signalTypes} keyField="risk_signal_type_uid" empty="No configured signal types" />
            <br />
            <DataTable columns={riskColumns} rows={riskProfiles} keyField="risk_profile_uid" empty="No risk profiles" />
            <br />
            <DataTable columns={signalColumns} rows={signals} keyField="risk_signal_uid" empty="No risk signals" />
          </section>
        </div>
      ) : null}

      {activeTab === "plans" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading"><div><span>Compliance plans</span><h2>Plan And Officer Actions</h2></div><ClipboardCheck size={22} /></div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/compliance/plans", planForm, () => setPlanForm(initialPlan), "Compliance plan created.");
            }}>
              <SelectField label="Taxpayer" value={planForm.subject_uid} onChange={(value) => setPlanForm({ ...planForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>
                {subjectOptions()}
              </SelectField>
              <SelectField label="Risk profile" value={planForm.risk_profile_uid} onChange={(value) => setPlanForm({ ...planForm, risk_profile_uid: value })}>
                <option value="">No risk profile</option>
                {riskProfiles.filter((profile) => !planForm.subject_uid || profile.subject_uid === planForm.subject_uid).map((profile) => (
                  <option key={profile.risk_profile_uid} value={profile.risk_profile_uid}>{profile.display_name_txt || profile.risk_scope_cd} - {compactCode(profile.risk_rating_cd)}</option>
                ))}
              </SelectField>
              <Field label="Plan name"><input required value={planForm.plan_name} onChange={(event) => setPlanForm({ ...planForm, plan_name: event.target.value })} /></Field>
              <Field label="Objective"><textarea value={planForm.objective_txt} onChange={(event) => setPlanForm({ ...planForm, objective_txt: event.target.value })} /></Field>
              <div className="compact-form">
                <SelectField label="Priority" value={planForm.priority_cd} onChange={(value) => setPlanForm({ ...planForm, priority_cd: value })}>
                  <option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
                </SelectField>
                <Field label="Target date"><input type="date" value={planForm.target_completion_dt} onChange={(event) => setPlanForm({ ...planForm, target_completion_dt: event.target.value })} /></Field>
              </div>
              <SelectField label="Owner" value={planForm.owner_actor_uid || ""} onChange={(value) => setPlanForm({ ...planForm, owner_actor_uid: value })}>
                <option value="">Current officer</option>
                {staffOptions()}
              </SelectField>
              <button className="primary-button" type="submit">Create plan</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/compliance/actions", { ...actionForm, compliance_plan_uid: actionForm.compliance_plan_uid || null, revenue_kind_uid: actionForm.revenue_kind_uid || null }, () => setActionForm(initialAction), "Compliance action opened.");
            }}>
              <SelectField label="Plan" value={actionForm.compliance_plan_uid} onChange={(value) => {
                const plan = plans.find((item) => item.compliance_plan_uid === value);
                setActionForm({ ...actionForm, compliance_plan_uid: value, subject_uid: plan?.subject_uid || actionForm.subject_uid, priority_cd: plan?.priority_cd || actionForm.priority_cd });
              }}>
                <option value="">No plan</option>{plans.map((plan) => <option key={plan.compliance_plan_uid} value={plan.compliance_plan_uid}>{plan.plan_name}</option>)}
              </SelectField>
              <SelectField label="Taxpayer" value={actionForm.subject_uid} onChange={(value) => setActionForm({ ...actionForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>{subjectOptions()}
              </SelectField>
              <div className="compact-form">
                <Field label="Action type"><input value={actionForm.action_type_cd} onChange={(event) => setActionForm({ ...actionForm, action_type_cd: event.target.value.toUpperCase() })} /></Field>
                <Field label="Due date"><input type="date" value={actionForm.due_dt} onChange={(event) => setActionForm({ ...actionForm, due_dt: event.target.value })} /></Field>
              </div>
              <Field label="Action note"><textarea value={actionForm.action_note_txt} onChange={(event) => setActionForm({ ...actionForm, action_note_txt: event.target.value })} /></Field>
              <button className="secondary-button" type="submit">Open action</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={planColumns} rows={plans} keyField="compliance_plan_uid" empty="No compliance plans" />
            <br />
            <DataTable columns={actionColumns} rows={actions} keyField="compliance_action_uid" empty="No compliance actions" />
          </section>
        </div>
      ) : null}

      {activeTab === "audits" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading"><div><span>Audit engagement</span><h2>Audit Cases And Information Requests</h2></div><Scale size={22} /></div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/compliance/audits", { ...auditForm, revenue_kind_uid: auditForm.revenue_kind_uid || null, compliance_action_uid: auditForm.compliance_action_uid || null, risk_profile_uid: auditForm.risk_profile_uid || null }, () => setAuditForm(initialAudit), "Audit engagement opened.");
            }}>
              <SelectField label="Taxpayer" value={auditForm.subject_uid} onChange={(value) => setAuditForm({ ...auditForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>{subjectOptions()}
              </SelectField>
              <SelectField label="Compliance action" value={auditForm.compliance_action_uid} onChange={(value) => setAuditForm({ ...auditForm, compliance_action_uid: value })}>
                <option value="">No action</option>{actions.map((action) => <option key={action.compliance_action_uid} value={action.compliance_action_uid}>{action.action_no} - {action.display_name_txt}</option>)}
              </SelectField>
              <Field label="Scope"><textarea value={auditForm.scope_txt} onChange={(event) => setAuditForm({ ...auditForm, scope_txt: event.target.value })} /></Field>
              <Field label="Objective"><textarea value={auditForm.objective_txt} onChange={(event) => setAuditForm({ ...auditForm, objective_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Open audit</button>
            </form>
            <hr />
            <form className="compact-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/compliance/audit-findings", { ...findingForm, proposed_adjustment_amt: findingForm.proposed_adjustment_amt || null }, () => setFindingForm(initialFinding), "Audit finding recorded.");
            }}>
              <SelectField label="Audit" value={findingForm.audit_engagement_uid} onChange={(value) => setFindingForm({ ...findingForm, audit_engagement_uid: value })}>
                <option value="">Select audit</option>{audits.map((audit) => <option key={audit.audit_engagement_uid} value={audit.audit_engagement_uid}>{audit.audit_no} - {audit.display_name_txt}</option>)}
              </SelectField>
              <Field label="Finding type"><input value={findingForm.finding_type_cd} onChange={(event) => setFindingForm({ ...findingForm, finding_type_cd: event.target.value.toUpperCase() })} /></Field>
              <Field label="Proposed adjustment"><input type="number" value={findingForm.proposed_adjustment_amt} onChange={(event) => setFindingForm({ ...findingForm, proposed_adjustment_amt: event.target.value })} /></Field>
              <Field label="Finding text"><textarea value={findingForm.finding_txt} onChange={(event) => setFindingForm({ ...findingForm, finding_txt: event.target.value })} /></Field>
              <Field label="Recommendation"><textarea value={findingForm.recommendation_txt} onChange={(event) => setFindingForm({ ...findingForm, recommendation_txt: event.target.value })} /></Field>
              <button className="secondary-button full-span" type="submit">Record finding</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/compliance/information-requests", { ...infoForm, audit_engagement_uid: infoForm.audit_engagement_uid || null }, () => setInfoForm(initialInfo), "Information request issued.");
            }}>
              <SelectField label="Taxpayer" value={infoForm.subject_uid} onChange={(value) => setInfoForm({ ...infoForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>{subjectOptions()}
              </SelectField>
              <SelectField label="Audit" value={infoForm.audit_engagement_uid} onChange={(value) => setInfoForm({ ...infoForm, audit_engagement_uid: value })}>
                <option value="">No audit</option>{audits.map((audit) => <option key={audit.audit_engagement_uid} value={audit.audit_engagement_uid}>{audit.audit_no}</option>)}
              </SelectField>
              <Field label="Request text"><textarea value={infoForm.request_txt} onChange={(event) => setInfoForm({ ...infoForm, request_txt: event.target.value })} /></Field>
              <button className="secondary-button" type="submit">Issue request</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={auditColumns} rows={audits} keyField="audit_engagement_uid" empty="No audit engagements" />
            <br />
            <DataTable columns={findingColumns} rows={findings} keyField="audit_finding_uid" empty="No audit findings" />
            <br />
            <DataTable columns={infoColumns} rows={infoRequests} keyField="information_request_uid" empty="No information requests" />
          </section>
        </div>
      ) : null}

      {activeTab === "investigations" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading"><div><span>Investigation file</span><h2>Investigations And Evidence Register</h2></div><FileSearch size={22} /></div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/compliance/investigations", { ...investigationForm, subject_uid: investigationForm.subject_uid || null, risk_profile_uid: investigationForm.risk_profile_uid || null }, () => setInvestigationForm(initialInvestigation), "Investigation opened.");
            }}>
              <SelectField label="Taxpayer" value={investigationForm.subject_uid} onChange={(value) => setInvestigationForm({ ...investigationForm, subject_uid: value })}>
                <option value="">No taxpayer context</option>{subjectOptions()}
              </SelectField>
              <SelectField label="Risk profile" value={investigationForm.risk_profile_uid} onChange={(value) => setInvestigationForm({ ...investigationForm, risk_profile_uid: value })}>
                <option value="">No risk profile</option>{riskProfiles.map((profile) => <option key={profile.risk_profile_uid} value={profile.risk_profile_uid}>{profile.display_name_txt || profile.risk_scope_cd} - {compactCode(profile.risk_rating_cd)}</option>)}
              </SelectField>
              <Field label="Investigation type"><input value={investigationForm.investigation_type_cd} onChange={(event) => setInvestigationForm({ ...investigationForm, investigation_type_cd: event.target.value.toUpperCase() })} /></Field>
              <Field label="Summary"><textarea value={investigationForm.summary_txt} onChange={(event) => setInvestigationForm({ ...investigationForm, summary_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Open investigation</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/compliance/evidence", { ...evidenceForm, investigation_file_uid: evidenceForm.investigation_file_uid || null, audit_engagement_uid: evidenceForm.audit_engagement_uid || null, content_record_uid: evidenceForm.content_record_uid || null, subject_uid: evidenceForm.subject_uid || null }, () => setEvidenceForm(initialEvidence), "Evidence registered.");
            }}>
              <SelectField label="Taxpayer" value={evidenceForm.subject_uid} onChange={(value) => setEvidenceForm({ ...evidenceForm, subject_uid: value })}>
                <option value="">Infer from case</option>{subjectOptions()}
              </SelectField>
              <SelectField label="Investigation" value={evidenceForm.investigation_file_uid} onChange={(value) => setEvidenceForm({ ...evidenceForm, investigation_file_uid: value })}>
                <option value="">No investigation</option>{investigations.map((item) => <option key={item.investigation_file_uid} value={item.investigation_file_uid}>{item.investigation_no}</option>)}
              </SelectField>
              <SelectField label="Audit" value={evidenceForm.audit_engagement_uid} onChange={(value) => setEvidenceForm({ ...evidenceForm, audit_engagement_uid: value })}>
                <option value="">No audit</option>{audits.map((audit) => <option key={audit.audit_engagement_uid} value={audit.audit_engagement_uid}>{audit.audit_no}</option>)}
              </SelectField>
              <SelectField label="Document record" value={evidenceForm.content_record_uid} onChange={(value) => setEvidenceForm({ ...evidenceForm, content_record_uid: value })}>
                <option value="">No document</option>{contentRecords.map((record) => <option key={record.content_record_uid} value={record.content_record_uid}>{record.content_no} - {record.file_name_txt || compactCode(record.content_type_cd)}</option>)}
              </SelectField>
              <Field label="Description"><textarea value={evidenceForm.description_txt} onChange={(event) => setEvidenceForm({ ...evidenceForm, description_txt: event.target.value })} /></Field>
              <button className="secondary-button" type="submit">Register evidence</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={investigationColumns} rows={investigations} keyField="investigation_file_uid" empty="No investigations" />
            <br />
            <DataTable columns={evidenceColumns} rows={evidence} keyField="evidence_uid" empty="No evidence records" />
          </section>
        </div>
      ) : null}

      {activeTab === "disclosures" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading"><div><span>Voluntary disclosure</span><h2>Disclosure Assessment And Record Links</h2></div><Link2 size={22} /></div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/compliance/voluntary-disclosures", {
                ...disclosureForm,
                revenue_kind_uid: disclosureForm.revenue_kind_uid || null,
                declaration_uid: disclosureForm.declaration_uid || null,
                liability_notice_uid: disclosureForm.liability_notice_uid || null,
                approval_request_uid: disclosureForm.approval_request_uid || null,
                estimated_liability_amt: disclosureForm.estimated_liability_amt || null,
                assessed_liability_amt: disclosureForm.assessed_liability_amt || null,
                relief_decision_cd: disclosureForm.relief_decision_cd || null,
              }, () => setDisclosureForm(initialDisclosure), "Voluntary disclosure lodged.");
            }}>
              <SelectField label="Taxpayer" value={disclosureForm.subject_uid} onChange={(value) => setDisclosureForm({ ...disclosureForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>{subjectOptions()}
              </SelectField>
              <SelectField label="Revenue kind" value={disclosureForm.revenue_kind_uid} onChange={(value) => setDisclosureForm({ ...disclosureForm, revenue_kind_uid: value })}>
                <option value="">All revenue</option>{revenueKindOptions()}
              </SelectField>
              <SelectField label="Declaration" value={disclosureForm.declaration_uid} onChange={(value) => setDisclosureForm({ ...disclosureForm, declaration_uid: value })}>
                <option value="">No declaration</option>{declarations.map((item) => <option key={item.declaration_uid} value={item.declaration_uid}>{item.declaration_no} - {item.display_name_txt}</option>)}
              </SelectField>
              <SelectField label="Liability notice" value={disclosureForm.liability_notice_uid} onChange={(value) => setDisclosureForm({ ...disclosureForm, liability_notice_uid: value })}>
                <option value="">No liability notice</option>{liabilityNotices.map((item) => <option key={item.liability_notice_uid} value={item.liability_notice_uid}>{item.liability_notice_no} - {item.display_name_txt}</option>)}
              </SelectField>
              <div className="compact-form">
                <Field label="Estimated liability"><input type="number" value={disclosureForm.estimated_liability_amt} onChange={(event) => setDisclosureForm({ ...disclosureForm, estimated_liability_amt: event.target.value })} /></Field>
                <Field label="Assessed liability"><input type="number" value={disclosureForm.assessed_liability_amt} onChange={(event) => setDisclosureForm({ ...disclosureForm, assessed_liability_amt: event.target.value })} /></Field>
              </div>
              <Field label="Summary"><textarea value={disclosureForm.disclosure_summary_txt} onChange={(event) => setDisclosureForm({ ...disclosureForm, disclosure_summary_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Lodge disclosure</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/compliance/record-links", linkForm, () => setLinkForm(initialLink), "Compliance record linked.");
            }}>
              <SelectField label="Plan" value={linkForm.compliance_plan_uid} onChange={(value) => setLinkForm({ ...linkForm, compliance_plan_uid: value })}>
                <option value="">No plan</option>{plans.map((plan) => <option key={plan.compliance_plan_uid} value={plan.compliance_plan_uid}>{plan.plan_name}</option>)}
              </SelectField>
              <SelectField label="Action" value={linkForm.compliance_action_uid} onChange={(value) => setLinkForm({ ...linkForm, compliance_action_uid: value })}>
                <option value="">No action</option>{actions.map((action) => <option key={action.compliance_action_uid} value={action.compliance_action_uid}>{action.action_no}</option>)}
              </SelectField>
              <SelectField label="Target record" value={linkForm.target_record_uid} onChange={(value) => {
                const content = contentRecords.find((record) => record.content_record_uid === value);
                const receipt = receipts.find((record) => record.receipt_event_uid === value);
                const message = messages.find((record) => record.message_envelope_uid === value);
                setLinkForm({
                  ...linkForm,
                  target_record_uid: value,
                  target_schema_cd: content ? "DOC" : receipt ? "FIN" : message ? "DOC" : linkForm.target_schema_cd,
                  target_table_cd: content ? "doc_content_record" : receipt ? "fin_receipt_event" : message ? "doc_message_envelope" : linkForm.target_table_cd,
                  subject_uid: content?.subject_uid || receipt?.subject_uid || message?.subject_uid || linkForm.subject_uid,
                });
              }}>
                <option value="">Select record</option>
                {contentRecords.map((record) => <option key={record.content_record_uid} value={record.content_record_uid}>{record.content_no} - {record.file_name_txt || "Document"}</option>)}
                {receipts.map((record) => <option key={record.receipt_event_uid} value={record.receipt_event_uid}>{record.receipt_no} - Receipt</option>)}
                {messages.map((record) => <option key={record.message_envelope_uid} value={record.message_envelope_uid}>{record.message_no} - Message</option>)}
              </SelectField>
              <Field label="Link note"><textarea value={linkForm.link_note_txt} onChange={(event) => setLinkForm({ ...linkForm, link_note_txt: event.target.value })} /></Field>
              <button className="secondary-button" type="submit">Link record</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={disclosureColumns} rows={disclosures} keyField="disclosure_uid" empty="No voluntary disclosures" />
            <br />
            <DataTable columns={linkColumns} rows={recordLinks} keyField="compliance_record_link_uid" empty="No linked records" />
          </section>
        </div>
      ) : null}
    </section>
  );
}
