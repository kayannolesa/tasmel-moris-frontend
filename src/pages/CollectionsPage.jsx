import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  Gavel,
  HandCoins,
  Landmark,
  Scale,
  Search,
  ShieldAlert,
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
  { id: "workbench", label: "Collections Workbench" },
  { id: "matters", label: "Recovery Matters" },
  { id: "plans", label: "Actions And Plans" },
  { id: "enforcement", label: "Enforcement And Legal" },
  { id: "review", label: "Collectability Review" },
];

const matterStates = ["OPEN", "UNDER_REVIEW", "INSTALMENT", "ENFORCEMENT", "LEGAL", "CLOSED"];
const priorities = ["NORMAL", "MEDIUM", "HIGH", "CRITICAL"];
const actionTypes = ["CALL", "REMINDER", "DEMAND_NOTICE", "VISIT", "PAYMENT_ARRANGEMENT", "ENFORCEMENT_REFERRAL"];
const enforcementTypes = ["ACCOUNT_RESTRICTION", "LICENCE_CERTIFICATE_HOLD", "GARNISHEE_NOTICE", "LIEN_PLACEHOLDER", "SEIZURE_PLACEHOLDER"];

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
  if (["APPROVED", "ACTIVE", "COMPLETED", "CLOSED", "LOW", "PAID", "RELEASED"].includes(status)) return "success";
  if (["REFERRED", "PENDING", "OPEN", "PROPOSED", "MEDIUM", "UNDER_REVIEW", "INSTALMENT"].includes(status)) return "warning";
  if (["FAILED", "HIGH", "CRITICAL", "LEGAL", "CANCELLED", "MISSED", "DEFAULTED", "ENFORCEMENT"].includes(status)) return "danger";
  return "neutral";
}

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, value);
  });
  return search.toString();
}

function safeRows(payload, key = "rows") {
  return payload?.[key] || [];
}

const initialCandidateFilters = {
  q: "",
  overdue_only_bool: "true",
  unassigned_only_bool: "false",
  high_value_only_bool: "false",
  min_outstanding_amt: "",
};

const initialMatterFilters = {
  q: "",
  matter_state_cd: "",
  priority_cd: "",
  overdue_only_bool: "false",
};

const initialMatterIntake = {
  liability_notice_uid: "",
  subject_uid: "",
  balance_amt: "",
  priority_cd: "MEDIUM",
  owner_actor_uid: "",
  assigned_unit_uid: "",
  next_action_dt: futureDate(7),
  case_reason_txt: "",
};

const initialMatterState = {
  matter_state_cd: "UNDER_REVIEW",
  priority_cd: "MEDIUM",
  owner_actor_uid: "",
  assigned_unit_uid: "",
  next_action_dt: futureDate(7),
  state_reason_txt: "",
  closed_reason_txt: "",
};

const initialAction = {
  recovery_matter_uid: "",
  action_type_cd: "CALL",
  contact_method_cd: "PHONE",
  scheduled_dt: today(),
  due_dt: futureDate(7),
  assigned_actor_uid: "",
  notes_txt: "",
};

const initialPlan = {
  recovery_matter_uid: "",
  subject_uid: "",
  total_plan_amt: "",
  plan_state_cd: "PROPOSED",
  frequency_cd: "MONTHLY",
  instalment_count_no: 3,
  start_dt: today(),
  first_due_dt: futureDate(30),
  arrangement_terms_txt: "",
};

const initialEnforcement = {
  recovery_matter_uid: "",
  measure_type_cd: "ACCOUNT_RESTRICTION",
  restriction_scope_cd: "TAXPAYER_ACCOUNT",
  approval_state_cd: "PENDING",
  start_dt: today(),
  amount_secured_amt: "",
  legal_reference_txt: "",
};

const initialReferral = {
  recovery_matter_uid: "",
  referred_to_txt: "",
  referral_dt: today(),
  legal_case_reference_txt: "",
  court_name_txt: "",
  solicitor_reference_txt: "",
  next_hearing_dt: "",
  outcome_txt: "",
};

const initialReview = {
  recovery_matter_uid: "",
  collectability_cd: "MEDIUM",
  likelihood_score_no: "",
  provision_percent: "",
  recommended_action_cd: "CONTINUE_RECOVERY",
  recommendation_txt: "",
  review_notes_txt: "",
};

export default function CollectionsPage() {
  const [activeTab, setActiveTab] = useState("workbench");
  const [overview, setOverview] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [lookups, setLookups] = useState({});
  const [staff, setStaff] = useState([]);
  const [agencyUnits, setAgencyUnits] = useState([]);
  const [matters, setMatters] = useState([]);
  const [actions, setActions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [enforcements, setEnforcements] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedMatter, setSelectedMatter] = useState(null);
  const [selectedMatterDetail, setSelectedMatterDetail] = useState(null);
  const [candidateFilters, setCandidateFilters] = useState(initialCandidateFilters);
  const [matterFilters, setMatterFilters] = useState(initialMatterFilters);
  const [matterForm, setMatterForm] = useState(initialMatterIntake);
  const [matterStateForm, setMatterStateForm] = useState(initialMatterState);
  const [actionForm, setActionForm] = useState(initialAction);
  const [planForm, setPlanForm] = useState(initialPlan);
  const [enforcementForm, setEnforcementForm] = useState(initialEnforcement);
  const [referralForm, setReferralForm] = useState(initialReferral);
  const [reviewForm, setReviewForm] = useState(initialReview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const revenueKinds = lookups.revenue_kinds || [];
  const activeMatters = matters.filter((matter) => ["OPEN", "UNDER_REVIEW", "INSTALMENT", "ENFORCEMENT", "LEGAL"].includes(matter.matter_state_cd));
  const selectedMatterUid = selectedMatter?.recovery_matter_uid || selectedMatterDetail?.matter?.recovery_matter_uid || "";
  const selectedMatterRecord = useMemo(
    () => matters.find((matter) => matter.recovery_matter_uid === selectedMatterUid) || selectedMatterDetail?.matter || null,
    [matters, selectedMatterDetail, selectedMatterUid]
  );

  async function safeRequest(endpoint, fallback) {
    try {
      return await apiRequest(endpoint);
    } catch {
      return fallback;
    }
  }

  async function load(nextCandidateFilters = candidateFilters, nextMatterFilters = matterFilters, nextSelectedMatterUid = selectedMatterUid) {
    const candidateQuery = buildQuery({ ...nextCandidateFilters, pageSize: 100 });
    const matterQuery = buildQuery({ ...nextMatterFilters, pageSize: 100 });
    const [
      overviewPayload,
      candidatePayload,
      subjectsPayload,
      lookupPayload,
      staffPayload,
      unitsPayload,
      mattersPayload,
      actionsPayload,
      plansPayload,
      enforcementPayload,
      referralPayload,
      reviewPayload,
    ] = await Promise.all([
      apiRequest("/api/collections/overview"),
      apiRequest(`/api/collections/candidates?${candidateQuery}`),
      apiRequest("/api/registry/subjects?pageSize=150"),
      apiRequest("/api/configuration/lookups"),
      safeRequest("/api/admin/staff?pageSize=150", { rows: [] }),
      safeRequest("/api/admin/agency-units", { agency_units: [] }),
      apiRequest(`/api/collections/recovery-matters?${matterQuery}`),
      apiRequest("/api/collections/actions?pageSize=100"),
      apiRequest("/api/collections/instalment-plans?pageSize=100"),
      apiRequest("/api/collections/enforcement-measures?pageSize=100"),
      apiRequest("/api/collections/legal-referrals?pageSize=100"),
      apiRequest("/api/collections/collectability-reviews?pageSize=100"),
    ]);

    setOverview(overviewPayload.overview);
    setCandidates(candidatePayload.rows || []);
    setSubjects(subjectsPayload.rows || []);
    setLookups(lookupPayload.lookups || {});
    setStaff(safeRows(staffPayload));
    setAgencyUnits(safeRows(unitsPayload, "agency_units"));
    setMatters(mattersPayload.rows || []);
    setActions(actionsPayload.rows || []);
    setPlans(plansPayload.rows || []);
    setEnforcements(enforcementPayload.rows || []);
    setReferrals(referralPayload.rows || []);
    setReviews(reviewPayload.rows || []);

    if (nextSelectedMatterUid) {
      const detailPayload = await apiRequest(`/api/collections/recovery-matters/${nextSelectedMatterUid}`);
      setSelectedMatterDetail(detailPayload);
    }
  }

  useEffect(() => {
    void load().catch((loadError) => setError(loadError.message)).finally(() => setLoading(false));
  }, []);

  function selectCandidate(candidate) {
    setSelectedCandidate(candidate);
    setMatterForm({
      ...initialMatterIntake,
      liability_notice_uid: candidate.liability_notice_uid,
      subject_uid: candidate.subject_uid,
      balance_amt: candidate.outstanding_amt,
      priority_cd: candidate.priority_cd || "MEDIUM",
      case_reason_txt: `Posted liability ${candidate.liability_notice_no} is ${formatNumber(candidate.overdue_days_no)} days overdue.`,
      next_action_dt: futureDate(candidate.priority_cd === "CRITICAL" || candidate.priority_cd === "HIGH" ? 2 : 7),
    });
  }

  function syncMatter(recoveryMatterUid) {
    const matter = matters.find((item) => item.recovery_matter_uid === recoveryMatterUid);
    setSelectedMatter(matter || null);
    if (matter) {
      setMatterStateForm({
        ...initialMatterState,
        matter_state_cd: matter.matter_state_cd,
        priority_cd: matter.priority_cd || "MEDIUM",
        owner_actor_uid: matter.owner_actor_uid || "",
        assigned_unit_uid: matter.assigned_unit_uid || "",
        next_action_dt: matter.next_action_dt || futureDate(7),
      });
      setActionForm({ ...actionForm, recovery_matter_uid: recoveryMatterUid, assigned_actor_uid: matter.owner_actor_uid || actionForm.assigned_actor_uid });
      setPlanForm({
        ...planForm,
        recovery_matter_uid: recoveryMatterUid,
        subject_uid: matter.subject_uid,
        total_plan_amt: matter.balance_amt || planForm.total_plan_amt,
      });
      setEnforcementForm({ ...enforcementForm, recovery_matter_uid: recoveryMatterUid, amount_secured_amt: matter.balance_amt || enforcementForm.amount_secured_amt });
      setReferralForm({ ...referralForm, recovery_matter_uid: recoveryMatterUid });
      setReviewForm({ ...reviewForm, recovery_matter_uid: recoveryMatterUid });
      void loadMatterDetail(recoveryMatterUid);
    }
  }

  async function loadMatterDetail(recoveryMatterUid) {
    setError("");
    try {
      const payload = await apiRequest(`/api/collections/recovery-matters/${recoveryMatterUid}`);
      setSelectedMatterDetail(payload);
    } catch (detailError) {
      setError(detailError.message);
    }
  }

  async function submit(endpoint, body, reset, message, options = {}) {
    setError("");
    setSuccess("");
    try {
      await apiRequest(endpoint, { method: options.method || "POST", body });
      reset?.();
      await load(candidateFilters, matterFilters, options.keepMatterUid || selectedMatterUid);
      setSuccess(message);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function runCandidateSearch(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    await load(candidateFilters, matterFilters).catch((searchError) => setError(searchError.message));
  }

  async function runMatterSearch(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    await load(candidateFilters, matterFilters).catch((searchError) => setError(searchError.message));
  }

  function matterOptionLabel(matter) {
    return `${matter.recovery_matter_no} - ${matter.display_name_txt}`;
  }

  function staffOptions() {
    return staff.map((member) => (
      <option key={member.actor_uid} value={member.actor_uid}>
        {member.full_name_txt || member.display_name_txt || member.username_txt}
      </option>
    ));
  }

  function matterOptions() {
    return matters.map((matter) => (
      <option key={matter.recovery_matter_uid} value={matter.recovery_matter_uid}>
        {matterOptionLabel(matter)}
      </option>
    ));
  }

  const candidateColumns = [
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "liability_notice_no", label: "Notice" },
    { key: "revenue_kind_name", label: "Revenue" },
    { key: "due_dt", label: "Due", render: (row) => formatDate(row.due_dt) },
    { key: "overdue_days_no", label: "Overdue", render: (row) => `${formatNumber(row.overdue_days_no)} days` },
    { key: "outstanding_amt", label: "Outstanding", render: (row) => formatMoney(row.outstanding_amt) },
    { key: "priority_cd", label: "Priority", render: (row) => <StatusPill tone={statusTone(row.priority_cd)}>{compactCode(row.priority_cd)}</StatusPill> },
    {
      key: "existing_recovery_matter_no",
      label: "Recovery",
      render: (row) => row.existing_recovery_matter_no ? <StatusPill tone="warning">{row.existing_recovery_matter_no}</StatusPill> : <button className="table-action-button" type="button" onClick={() => selectCandidate(row)}>Select</button>,
    },
  ];

  const matterColumns = [
    { key: "recovery_matter_no", label: "Matter" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "balance_amt", label: "Balance", render: (row) => formatMoney(row.balance_amt) },
    { key: "overdue_days_no", label: "Overdue", render: (row) => `${formatNumber(row.overdue_days_no)} days` },
    { key: "priority_cd", label: "Priority", render: (row) => <StatusPill tone={statusTone(row.priority_cd)}>{compactCode(row.priority_cd)}</StatusPill> },
    { key: "matter_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.matter_state_cd)}>{compactCode(row.matter_state_cd)}</StatusPill> },
    { key: "next_action_dt", label: "Next action", render: (row) => formatDate(row.next_action_dt) },
  ];

  const actionColumns = [
    { key: "recovery_matter_no", label: "Matter" },
    { key: "action_type_cd", label: "Action", render: (row) => compactCode(row.action_type_cd) },
    { key: "scheduled_dt", label: "Scheduled", render: (row) => formatDate(row.scheduled_dt) },
    { key: "assigned_name", label: "Officer", render: (row) => row.assigned_name || "-" },
    { key: "outcome_cd", label: "Outcome", render: (row) => row.outcome_cd ? compactCode(row.outcome_cd) : "-" },
    { key: "action_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.action_state_cd)}>{compactCode(row.action_state_cd)}</StatusPill> },
    {
      key: "complete",
      label: "",
      render: (row) => row.action_state_cd === "OPEN" ? (
        <button
          className="table-action-button"
          type="button"
          onClick={() => submit(`/api/collections/actions/${row.recovery_action_uid}/state`, { action_state_cd: "COMPLETED", completed_dt: today(), outcome_cd: "CONTACTED" }, null, "Recovery action completed.", { method: "PATCH", keepMatterUid: row.recovery_matter_uid })}
        >
          Complete
        </button>
      ) : "-",
    },
  ];

  const planColumns = [
    { key: "plan_no", label: "Plan" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "total_plan_amt", label: "Amount", render: (row) => formatMoney(row.total_plan_amt) },
    { key: "next_due_dt", label: "Next due", render: (row) => formatDate(row.next_due_dt) },
    { key: "missed_line_count", label: "Missed", render: (row) => formatNumber(row.missed_line_count || row.missed_instalment_count_no) },
    { key: "plan_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.plan_state_cd)}>{compactCode(row.plan_state_cd)}</StatusPill> },
  ];

  const lineColumns = [
    { key: "plan_no", label: "Plan" },
    { key: "sequence_no", label: "No." },
    { key: "due_dt", label: "Due", render: (row) => formatDate(row.due_dt) },
    { key: "expected_amt", label: "Expected", render: (row) => formatMoney(row.expected_amt) },
    { key: "paid_amt", label: "Paid", render: (row) => formatMoney(row.paid_amt) },
    { key: "line_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.line_state_cd)}>{compactCode(row.line_state_cd)}</StatusPill> },
    {
      key: "line_actions",
      label: "",
      render: (row) => row.line_state_cd === "OPEN" ? (
        <div className="table-button-row">
          <button className="table-action-button" type="button" onClick={() => submit(`/api/collections/instalment-lines/${row.instalment_line_uid}/state`, { line_state_cd: "PAID", paid_amt: row.expected_amt }, null, "Instalment marked paid.", { method: "PATCH", keepMatterUid: selectedMatterUid })}>Paid</button>
          <button className="table-action-button table-action-button--danger" type="button" onClick={() => submit(`/api/collections/instalment-lines/${row.instalment_line_uid}/state`, { line_state_cd: "MISSED" }, null, "Instalment marked missed.", { method: "PATCH", keepMatterUid: selectedMatterUid })}>Missed</button>
        </div>
      ) : "-",
    },
  ];

  const enforcementColumns = [
    { key: "recovery_matter_no", label: "Matter" },
    { key: "measure_type_cd", label: "Measure", render: (row) => compactCode(row.measure_type_cd) },
    { key: "restriction_scope_cd", label: "Scope", render: (row) => row.restriction_scope_cd ? compactCode(row.restriction_scope_cd) : "-" },
    { key: "amount_secured_amt", label: "Secured", render: (row) => formatMoney(row.amount_secured_amt) },
    { key: "approval_state_cd", label: "Approval", render: (row) => <StatusPill tone={statusTone(row.approval_state_cd)}>{compactCode(row.approval_state_cd)}</StatusPill> },
    { key: "measure_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.measure_state_cd)}>{compactCode(row.measure_state_cd)}</StatusPill> },
  ];

  const referralColumns = [
    { key: "referral_no", label: "Referral" },
    { key: "recovery_matter_no", label: "Matter" },
    { key: "referred_to_txt", label: "Referred to" },
    { key: "legal_case_reference_txt", label: "Reference", render: (row) => row.legal_case_reference_txt || row.solicitor_reference_txt || "-" },
    { key: "next_hearing_dt", label: "Next hearing", render: (row) => formatDate(row.next_hearing_dt) },
    { key: "referral_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.referral_state_cd)}>{compactCode(row.referral_state_cd)}</StatusPill> },
  ];

  const reviewColumns = [
    { key: "recovery_matter_no", label: "Matter" },
    { key: "review_dt", label: "Review", render: (row) => formatDate(row.review_dt) },
    { key: "collectability_cd", label: "Collectability", render: (row) => <StatusPill tone={statusTone(row.collectability_cd)}>{compactCode(row.collectability_cd)}</StatusPill> },
    { key: "likelihood_score_no", label: "Likelihood", render: (row) => row.likelihood_score_no ?? "-" },
    { key: "recommended_action_cd", label: "Recommendation", render: (row) => row.recommended_action_cd ? compactCode(row.recommended_action_cd) : "-" },
    { key: "approval_state_cd", label: "Approval", render: (row) => <StatusPill tone={statusTone(row.approval_state_cd)}>{compactCode(row.approval_state_cd)}</StatusPill> },
  ];

  const lifecycleColumns = [
    { key: "event_ts", label: "When", render: (row) => formatDateTime(row.event_ts) },
    { key: "event_type_cd", label: "Event", render: (row) => compactCode(row.event_type_cd) },
    { key: "to_matter_state_cd", label: "State", render: (row) => row.to_matter_state_cd ? compactCode(row.to_matter_state_cd) : "-" },
    { key: "created_by_name_txt", label: "Officer", render: (row) => row.created_by_name_txt || "-" },
  ];

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Collections and enforcement" title="Recovery, Instalments And Legal Escalation" status="Operational" tone="success" />

      <div className="metric-grid">
        <MetricTile icon={HandCoins} label="Open matters" value={formatNumber(overview?.open_matter_count)} />
        <MetricTile icon={BadgeDollarSign} label="Open recovery value" value={formatMoney(overview?.open_balance_amt)} />
        <MetricTile icon={FileWarning} label="Overdue candidates" value={formatNumber(overview?.overdue_candidate_count)} />
        <MetricTile icon={AlertTriangle} label="High-risk queue" value={formatNumber(overview?.high_risk_candidate_count)} />
        <MetricTile icon={CalendarClock} label="Instalment plans" value={formatNumber(overview?.instalment_plan_count)} />
        <MetricTile icon={Gavel} label="Legal referrals" value={formatNumber(overview?.legal_referral_count)} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {loading ? <div className="form-success">Loading collections workspace...</div> : null}

      {activeTab === "workbench" ? (
        <div className="collections-workbench-grid">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Candidate queue</span>
                <h2>Overdue Posted Liabilities</h2>
              </div>
              <Search size={21} />
            </div>
            <form className="collections-filter-form" onSubmit={runCandidateSearch}>
              <Field label="Search">
                <input value={candidateFilters.q} onChange={(event) => setCandidateFilters({ ...candidateFilters, q: event.target.value })} />
              </Field>
              <Field label="Minimum outstanding">
                <input type="number" value={candidateFilters.min_outstanding_amt} onChange={(event) => setCandidateFilters({ ...candidateFilters, min_outstanding_amt: event.target.value })} />
              </Field>
              <label className="check-control">
                <input type="checkbox" checked={candidateFilters.overdue_only_bool === "true"} onChange={(event) => setCandidateFilters({ ...candidateFilters, overdue_only_bool: String(event.target.checked) })} />
                <span>Only overdue liabilities</span>
              </label>
              <label className="check-control">
                <input type="checkbox" checked={candidateFilters.high_value_only_bool === "true"} onChange={(event) => setCandidateFilters({ ...candidateFilters, high_value_only_bool: String(event.target.checked) })} />
                <span>High-value or long-overdue only</span>
              </label>
              <label className="check-control">
                <input type="checkbox" checked={candidateFilters.unassigned_only_bool === "true"} onChange={(event) => setCandidateFilters({ ...candidateFilters, unassigned_only_bool: String(event.target.checked) })} />
                <span>Hide liabilities already in recovery</span>
              </label>
              <button className="secondary-button" type="submit">Search queue</button>
            </form>
            <DataTable columns={candidateColumns} rows={candidates} keyField="liability_notice_uid" empty="No recovery candidates found" />
          </section>

          <aside className="content-band collections-sticky-panel">
            <div className="section-heading">
              <div>
                <span>Open matter</span>
                <h2>Assignment And Priority</h2>
              </div>
              <UserCheck size={21} />
            </div>
            {selectedCandidate ? (
              <div className="collections-candidate-card">
                <span>{selectedCandidate.subject_no}</span>
                <strong>{selectedCandidate.display_name_txt}</strong>
                <small>{selectedCandidate.liability_notice_no} - {formatMoney(selectedCandidate.outstanding_amt)}</small>
              </div>
            ) : (
              <div className="empty-panel">
                <div>
                  <strong>No liability selected</strong>
                  <span>Select a candidate to open a controlled recovery matter.</span>
                </div>
              </div>
            )}
            <form className="stacked-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/collections/recovery-matters",
                {
                  ...matterForm,
                  owner_actor_uid: matterForm.owner_actor_uid || null,
                  assigned_unit_uid: matterForm.assigned_unit_uid || null,
                  balance_amt: matterForm.balance_amt ? Number(matterForm.balance_amt) : undefined,
                },
                () => {
                  setSelectedCandidate(null);
                  setMatterForm(initialMatterIntake);
                },
                "Recovery matter opened."
              );
            }}>
              <SelectField label="Priority" value={matterForm.priority_cd} onChange={(value) => setMatterForm({ ...matterForm, priority_cd: value })}>
                {priorities.map((priority) => <option key={priority} value={priority}>{compactCode(priority)}</option>)}
              </SelectField>
              <SelectField label="Owner" value={matterForm.owner_actor_uid} onChange={(value) => setMatterForm({ ...matterForm, owner_actor_uid: value })}>
                <option value="">Current officer</option>
                {staffOptions()}
              </SelectField>
              <SelectField label="Unit" value={matterForm.assigned_unit_uid} onChange={(value) => setMatterForm({ ...matterForm, assigned_unit_uid: value })}>
                <option value="">No assigned unit</option>
                {agencyUnits.map((unit) => <option key={unit.agency_unit_uid} value={unit.agency_unit_uid}>{unit.unit_name}</option>)}
              </SelectField>
              <Field label="Next action date">
                <input type="date" value={matterForm.next_action_dt} onChange={(event) => setMatterForm({ ...matterForm, next_action_dt: event.target.value })} />
              </Field>
              <Field label="Reason">
                <textarea value={matterForm.case_reason_txt} onChange={(event) => setMatterForm({ ...matterForm, case_reason_txt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit" disabled={!matterForm.liability_notice_uid && !matterForm.subject_uid}>Open recovery matter</button>
            </form>
          </aside>
        </div>
      ) : null}

      {activeTab === "matters" ? (
        <div className="collections-matter-grid">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Case register</span>
                <h2>Recovery Matter Search</h2>
              </div>
              <ClipboardList size={21} />
            </div>
            <form className="collections-filter-form" onSubmit={runMatterSearch}>
              <Field label="Search">
                <input value={matterFilters.q} onChange={(event) => setMatterFilters({ ...matterFilters, q: event.target.value })} />
              </Field>
              <SelectField label="State" value={matterFilters.matter_state_cd} onChange={(value) => setMatterFilters({ ...matterFilters, matter_state_cd: value })}>
                <option value="">All states</option>
                {matterStates.map((state) => <option key={state} value={state}>{compactCode(state)}</option>)}
              </SelectField>
              <SelectField label="Priority" value={matterFilters.priority_cd} onChange={(value) => setMatterFilters({ ...matterFilters, priority_cd: value })}>
                <option value="">All priorities</option>
                {priorities.map((priority) => <option key={priority} value={priority}>{compactCode(priority)}</option>)}
              </SelectField>
              <label className="check-control">
                <input type="checkbox" checked={matterFilters.overdue_only_bool === "true"} onChange={(event) => setMatterFilters({ ...matterFilters, overdue_only_bool: String(event.target.checked) })} />
                <span>Only overdue matters</span>
              </label>
              <button className="secondary-button" type="submit">Search matters</button>
            </form>
            <DataTable columns={matterColumns} rows={matters} keyField="recovery_matter_uid" empty="No recovery matters found" selectedKey={selectedMatterUid} onRowClick={(row) => syncMatter(row.recovery_matter_uid)} />
          </section>

          <aside className="content-band collections-sticky-panel">
            <div className="section-heading">
              <div>
                <span>Matter control</span>
                <h2>{selectedMatterRecord?.recovery_matter_no || "Select a matter"}</h2>
              </div>
              {selectedMatterRecord ? <StatusPill tone={statusTone(selectedMatterRecord.matter_state_cd)}>{compactCode(selectedMatterRecord.matter_state_cd)}</StatusPill> : null}
            </div>
            {selectedMatterRecord ? (
              <>
                <div className="collections-summary-strip">
                  <div><span>Taxpayer</span><strong>{selectedMatterRecord.display_name_txt}</strong></div>
                  <div><span>Balance</span><strong>{formatMoney(selectedMatterRecord.balance_amt)}</strong></div>
                  <div><span>Overdue</span><strong>{formatNumber(selectedMatterRecord.overdue_days_no)} days</strong></div>
                  <div><span>Open actions</span><strong>{formatNumber(selectedMatterRecord.open_action_count)}</strong></div>
                </div>
                <form className="stacked-form" onSubmit={(event) => {
                  event.preventDefault();
                  void submit(
                    `/api/collections/recovery-matters/${selectedMatterRecord.recovery_matter_uid}/state`,
                    {
                      ...matterStateForm,
                      owner_actor_uid: matterStateForm.owner_actor_uid || null,
                      assigned_unit_uid: matterStateForm.assigned_unit_uid || null,
                      closed_reason_txt: matterStateForm.closed_reason_txt || null,
                    },
                    null,
                    "Recovery matter updated.",
                    { method: "PATCH", keepMatterUid: selectedMatterRecord.recovery_matter_uid }
                  );
                }}>
                  <SelectField label="State" value={matterStateForm.matter_state_cd} onChange={(value) => setMatterStateForm({ ...matterStateForm, matter_state_cd: value })}>
                    {matterStates.map((state) => <option key={state} value={state}>{compactCode(state)}</option>)}
                  </SelectField>
                  <SelectField label="Priority" value={matterStateForm.priority_cd} onChange={(value) => setMatterStateForm({ ...matterStateForm, priority_cd: value })}>
                    {priorities.map((priority) => <option key={priority} value={priority}>{compactCode(priority)}</option>)}
                  </SelectField>
                  <SelectField label="Owner" value={matterStateForm.owner_actor_uid} onChange={(value) => setMatterStateForm({ ...matterStateForm, owner_actor_uid: value })}>
                    <option value="">Keep current owner</option>
                    {staffOptions()}
                  </SelectField>
                  <SelectField label="Unit" value={matterStateForm.assigned_unit_uid} onChange={(value) => setMatterStateForm({ ...matterStateForm, assigned_unit_uid: value })}>
                    <option value="">Keep current unit</option>
                    {agencyUnits.map((unit) => <option key={unit.agency_unit_uid} value={unit.agency_unit_uid}>{unit.unit_name}</option>)}
                  </SelectField>
                  <Field label="Next action date">
                    <input type="date" value={matterStateForm.next_action_dt} onChange={(event) => setMatterStateForm({ ...matterStateForm, next_action_dt: event.target.value })} />
                  </Field>
                  <Field label="Decision reason">
                    <textarea value={matterStateForm.state_reason_txt} onChange={(event) => setMatterStateForm({ ...matterStateForm, state_reason_txt: event.target.value })} />
                  </Field>
                  {matterStateForm.matter_state_cd === "CLOSED" ? (
                    <Field label="Closure reason">
                      <textarea value={matterStateForm.closed_reason_txt} onChange={(event) => setMatterStateForm({ ...matterStateForm, closed_reason_txt: event.target.value })} />
                    </Field>
                  ) : null}
                  <button className="primary-button" type="submit">Update matter</button>
                </form>
              </>
            ) : (
              <div className="empty-panel">
                <div>
                  <strong>No matter selected</strong>
                  <span>Select a matter from the register to manage state, owner, and recovery activity.</span>
                </div>
              </div>
            )}
          </aside>

          {selectedMatterDetail ? (
            <section className="content-band collections-matter-grid__detail">
              <div className="section-heading">
                <div>
                  <span>Case file</span>
                  <h2>Actions, Instalments And History</h2>
                </div>
                <Scale size={21} />
              </div>
              <div className="collections-detail-stack">
                <DataTable columns={actionColumns.slice(0, 6)} rows={selectedMatterDetail.actions || []} keyField="recovery_action_uid" empty="No actions recorded for this matter" />
                <DataTable columns={lineColumns} rows={selectedMatterDetail.instalment_lines || []} keyField="instalment_line_uid" empty="No instalment schedule recorded" />
                <DataTable columns={lifecycleColumns} rows={selectedMatterDetail.lifecycle_events || []} keyField="lifecycle_event_uid" empty="No lifecycle events recorded" />
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {activeTab === "plans" ? (
        <div className="collections-ops-grid">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Recovery action</span>
                <h2>Schedule Officer Activity</h2>
              </div>
              <CheckCircle2 size={21} />
            </div>
            <form className="collections-two-column-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/collections/actions",
                {
                  ...actionForm,
                  assigned_actor_uid: actionForm.assigned_actor_uid || null,
                  notes_txt: actionForm.notes_txt || null,
                },
                () => setActionForm(initialAction),
                "Recovery action scheduled.",
                { keepMatterUid: actionForm.recovery_matter_uid }
              );
            }}>
              <SelectField label="Matter" required value={actionForm.recovery_matter_uid} onChange={(value) => setActionForm({ ...actionForm, recovery_matter_uid: value })}>
                <option value="">Select matter</option>
                {matterOptions()}
              </SelectField>
              <SelectField label="Action type" value={actionForm.action_type_cd} onChange={(value) => setActionForm({ ...actionForm, action_type_cd: value })}>
                {actionTypes.map((type) => <option key={type} value={type}>{compactCode(type)}</option>)}
              </SelectField>
              <SelectField label="Contact method" value={actionForm.contact_method_cd} onChange={(value) => setActionForm({ ...actionForm, contact_method_cd: value })}>
                <option value="PHONE">Phone</option>
                <option value="EMAIL">Email</option>
                <option value="COUNTER">Counter</option>
                <option value="FIELD_VISIT">Field visit</option>
                <option value="LETTER">Letter</option>
              </SelectField>
              <SelectField label="Assigned officer" value={actionForm.assigned_actor_uid} onChange={(value) => setActionForm({ ...actionForm, assigned_actor_uid: value })}>
                <option value="">Current officer</option>
                {staffOptions()}
              </SelectField>
              <Field label="Scheduled date">
                <input type="date" value={actionForm.scheduled_dt} onChange={(event) => setActionForm({ ...actionForm, scheduled_dt: event.target.value })} />
              </Field>
              <Field label="Due date">
                <input type="date" value={actionForm.due_dt} onChange={(event) => setActionForm({ ...actionForm, due_dt: event.target.value })} />
              </Field>
              <Field label="Notes">
                <textarea value={actionForm.notes_txt} onChange={(event) => setActionForm({ ...actionForm, notes_txt: event.target.value })} />
              </Field>
              <button className="secondary-button" type="submit">Schedule action</button>
            </form>
          </section>

          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Payment arrangement</span>
                <h2>Instalment Plan</h2>
              </div>
              <CalendarClock size={21} />
            </div>
            <form className="collections-two-column-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/collections/instalment-plans",
                {
                  ...planForm,
                  recovery_matter_uid: planForm.recovery_matter_uid || null,
                  subject_uid: planForm.subject_uid || null,
                  total_plan_amt: Number(planForm.total_plan_amt),
                  instalment_count_no: Number(planForm.instalment_count_no),
                  arrangement_terms_txt: planForm.arrangement_terms_txt || null,
                },
                () => setPlanForm(initialPlan),
                "Instalment plan recorded.",
                { keepMatterUid: planForm.recovery_matter_uid }
              );
            }}>
              <SelectField label="Matter" required value={planForm.recovery_matter_uid} onChange={(value) => {
                const matter = matters.find((item) => item.recovery_matter_uid === value);
                setPlanForm({ ...planForm, recovery_matter_uid: value, subject_uid: matter?.subject_uid || "", total_plan_amt: matter?.balance_amt || planForm.total_plan_amt });
              }}>
                <option value="">Select matter</option>
                {matterOptions()}
              </SelectField>
              <Field label="Total plan amount">
                <input type="number" required value={planForm.total_plan_amt} onChange={(event) => setPlanForm({ ...planForm, total_plan_amt: event.target.value })} />
              </Field>
              <SelectField label="Plan state" value={planForm.plan_state_cd} onChange={(value) => setPlanForm({ ...planForm, plan_state_cd: value })}>
                <option value="PROPOSED">Proposed</option>
                <option value="APPROVED">Approved</option>
                <option value="ACTIVE">Active</option>
              </SelectField>
              <SelectField label="Frequency" value={planForm.frequency_cd} onChange={(value) => setPlanForm({ ...planForm, frequency_cd: value })}>
                <option value="MONTHLY">Monthly</option>
                <option value="FORTNIGHTLY">Fortnightly</option>
              </SelectField>
              <Field label="Instalments">
                <input type="number" min="1" max="36" value={planForm.instalment_count_no} onChange={(event) => setPlanForm({ ...planForm, instalment_count_no: event.target.value })} />
              </Field>
              <Field label="First due date">
                <input type="date" value={planForm.first_due_dt} onChange={(event) => setPlanForm({ ...planForm, first_due_dt: event.target.value })} />
              </Field>
              <Field label="Terms">
                <textarea value={planForm.arrangement_terms_txt} onChange={(event) => setPlanForm({ ...planForm, arrangement_terms_txt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit">Record plan</button>
            </form>
          </section>

          <section className="content-band collections-ops-grid__tables">
            <DataTable columns={actionColumns} rows={actions} keyField="recovery_action_uid" empty="No recovery actions recorded" />
            <DataTable columns={planColumns} rows={plans} keyField="instalment_plan_uid" empty="No instalment plans recorded" />
          </section>
        </div>
      ) : null}

      {activeTab === "enforcement" ? (
        <div className="collections-enforcement-grid">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Restriction control</span>
                <h2>Enforcement Measure</h2>
              </div>
              <ShieldAlert size={21} />
            </div>
            <form className="collections-two-column-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/collections/enforcement-measures",
                {
                  ...enforcementForm,
                  amount_secured_amt: enforcementForm.amount_secured_amt || null,
                  legal_reference_txt: enforcementForm.legal_reference_txt || null,
                },
                () => setEnforcementForm(initialEnforcement),
                "Enforcement measure recorded.",
                { keepMatterUid: enforcementForm.recovery_matter_uid }
              );
            }}>
              <SelectField label="Matter" required value={enforcementForm.recovery_matter_uid} onChange={(value) => setEnforcementForm({ ...enforcementForm, recovery_matter_uid: value })}>
                <option value="">Select matter</option>
                {matterOptions()}
              </SelectField>
              <SelectField label="Measure" value={enforcementForm.measure_type_cd} onChange={(value) => setEnforcementForm({ ...enforcementForm, measure_type_cd: value })}>
                {enforcementTypes.map((type) => <option key={type} value={type}>{compactCode(type)}</option>)}
              </SelectField>
              <SelectField label="Approval" value={enforcementForm.approval_state_cd} onChange={(value) => setEnforcementForm({ ...enforcementForm, approval_state_cd: value })}>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
              </SelectField>
              <Field label="Restriction scope">
                <input value={enforcementForm.restriction_scope_cd} onChange={(event) => setEnforcementForm({ ...enforcementForm, restriction_scope_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Start date">
                <input type="date" value={enforcementForm.start_dt} onChange={(event) => setEnforcementForm({ ...enforcementForm, start_dt: event.target.value })} />
              </Field>
              <Field label="Amount secured">
                <input type="number" value={enforcementForm.amount_secured_amt} onChange={(event) => setEnforcementForm({ ...enforcementForm, amount_secured_amt: event.target.value })} />
              </Field>
              <Field label="Legal reference">
                <textarea value={enforcementForm.legal_reference_txt} onChange={(event) => setEnforcementForm({ ...enforcementForm, legal_reference_txt: event.target.value })} />
              </Field>
              <button className="secondary-button" type="submit">Record enforcement</button>
            </form>
          </section>

          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Legal escalation</span>
                <h2>Referral Record</h2>
              </div>
              <Gavel size={21} />
            </div>
            <form className="collections-two-column-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/collections/legal-referrals",
                {
                  ...referralForm,
                  legal_case_reference_txt: referralForm.legal_case_reference_txt || null,
                  court_name_txt: referralForm.court_name_txt || null,
                  solicitor_reference_txt: referralForm.solicitor_reference_txt || null,
                  next_hearing_dt: referralForm.next_hearing_dt || null,
                  outcome_txt: referralForm.outcome_txt || null,
                },
                () => setReferralForm(initialReferral),
                "Legal referral recorded.",
                { keepMatterUid: referralForm.recovery_matter_uid }
              );
            }}>
              <SelectField label="Matter" required value={referralForm.recovery_matter_uid} onChange={(value) => setReferralForm({ ...referralForm, recovery_matter_uid: value })}>
                <option value="">Select matter</option>
                {matterOptions()}
              </SelectField>
              <Field label="Referred to">
                <input required value={referralForm.referred_to_txt} onChange={(event) => setReferralForm({ ...referralForm, referred_to_txt: event.target.value })} />
              </Field>
              <Field label="Case reference">
                <input value={referralForm.legal_case_reference_txt} onChange={(event) => setReferralForm({ ...referralForm, legal_case_reference_txt: event.target.value })} />
              </Field>
              <Field label="Court or forum">
                <input value={referralForm.court_name_txt} onChange={(event) => setReferralForm({ ...referralForm, court_name_txt: event.target.value })} />
              </Field>
              <Field label="Solicitor reference">
                <input value={referralForm.solicitor_reference_txt} onChange={(event) => setReferralForm({ ...referralForm, solicitor_reference_txt: event.target.value })} />
              </Field>
              <Field label="Next hearing">
                <input type="date" value={referralForm.next_hearing_dt} onChange={(event) => setReferralForm({ ...referralForm, next_hearing_dt: event.target.value })} />
              </Field>
              <Field label="Outcome notes">
                <textarea value={referralForm.outcome_txt} onChange={(event) => setReferralForm({ ...referralForm, outcome_txt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit">Record referral</button>
            </form>
          </section>

          <section className="content-band collections-enforcement-grid__tables">
            <DataTable columns={enforcementColumns} rows={enforcements} keyField="enforcement_measure_uid" empty="No enforcement measures recorded" />
            <DataTable columns={referralColumns} rows={referrals} keyField="legal_referral_uid" empty="No legal referrals recorded" />
          </section>
        </div>
      ) : null}

      {activeTab === "review" ? (
        <div className="collections-review-grid">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Recoverability</span>
                <h2>Collectability Assessment</h2>
              </div>
              <Landmark size={21} />
            </div>
            <form className="collections-two-column-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/collections/collectability-reviews",
                {
                  ...reviewForm,
                  likelihood_score_no: reviewForm.likelihood_score_no || null,
                  provision_percent: reviewForm.provision_percent || null,
                  recommendation_txt: reviewForm.recommendation_txt || null,
                  review_notes_txt: reviewForm.review_notes_txt || null,
                },
                () => setReviewForm(initialReview),
                "Collectability review recorded.",
                { keepMatterUid: reviewForm.recovery_matter_uid }
              );
            }}>
              <SelectField label="Matter" required value={reviewForm.recovery_matter_uid} onChange={(value) => setReviewForm({ ...reviewForm, recovery_matter_uid: value })}>
                <option value="">Select matter</option>
                {matterOptions()}
              </SelectField>
              <SelectField label="Collectability" value={reviewForm.collectability_cd} onChange={(value) => setReviewForm({ ...reviewForm, collectability_cd: value })}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="UNRECOVERABLE">Unrecoverable</option>
              </SelectField>
              <SelectField label="Recommended action" value={reviewForm.recommended_action_cd} onChange={(value) => setReviewForm({ ...reviewForm, recommended_action_cd: value })}>
                <option value="CONTINUE_RECOVERY">Continue recovery</option>
                <option value="SUSPEND">Suspend</option>
                <option value="WRITE_OFF_REVIEW">Write-off review</option>
                <option value="LEGAL_ESCALATION">Legal escalation</option>
              </SelectField>
              <Field label="Likelihood score">
                <input type="number" value={reviewForm.likelihood_score_no} onChange={(event) => setReviewForm({ ...reviewForm, likelihood_score_no: event.target.value })} />
              </Field>
              <Field label="Provision percent">
                <input type="number" value={reviewForm.provision_percent} onChange={(event) => setReviewForm({ ...reviewForm, provision_percent: event.target.value })} />
              </Field>
              <Field label="Recommendation">
                <textarea value={reviewForm.recommendation_txt} onChange={(event) => setReviewForm({ ...reviewForm, recommendation_txt: event.target.value })} />
              </Field>
              <Field label="Review notes">
                <textarea value={reviewForm.review_notes_txt} onChange={(event) => setReviewForm({ ...reviewForm, review_notes_txt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit">Record review</button>
            </form>
          </section>

          <section className="content-band">
            <DataTable columns={reviewColumns} rows={reviews} keyField="collectability_review_uid" empty="No collectability reviews recorded" />
          </section>
        </div>
      ) : null}
    </section>
  );
}
