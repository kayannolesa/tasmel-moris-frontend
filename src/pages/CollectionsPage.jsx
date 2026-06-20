import { CalendarClock, FileWarning, Gavel, HandCoins } from "lucide-react";
import { useEffect, useState } from "react";
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
  { id: "matters", label: "Recovery Matters" },
  { id: "plans", label: "Plans And Actions" },
  { id: "enforcement", label: "Enforcement And Legal" },
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
  if (["APPROVED", "ACTIVE", "COMPLETED", "CLOSED", "LOW"].includes(status)) return "success";
  if (["REFERRED", "PENDING", "OPEN", "PROPOSED", "MEDIUM"].includes(status)) return "warning";
  if (["FAILED", "HIGH", "LEGAL", "CANCELLED"].includes(status)) return "danger";
  return "neutral";
}

const initialMatter = {
  subject_uid: "",
  revenue_kind_uid: "",
  balance_amt: "",
  priority_cd: "NORMAL",
  opened_dt: today(),
};
const initialAction = {
  recovery_matter_uid: "",
  action_type_cd: "CALL",
  scheduled_dt: futureDate(2),
  notes_txt: "",
};
const initialPlan = {
  recovery_matter_uid: "",
  subject_uid: "",
  total_plan_amt: "",
  plan_state_cd: "PROPOSED",
  start_dt: today(),
  end_dt: futureDate(60),
  line_one_due_dt: futureDate(30),
  line_one_amt: "",
  line_two_due_dt: futureDate(60),
  line_two_amt: "",
};
const initialEnforcement = {
  recovery_matter_uid: "",
  measure_type_cd: "GARNISHEE_NOTICE",
  legal_reference_txt: "",
  start_dt: today(),
  amount_secured_amt: "",
};
const initialReferral = {
  recovery_matter_uid: "",
  referred_to_txt: "",
  referral_dt: today(),
  legal_case_reference_txt: "",
  outcome_txt: "",
};
const initialReview = {
  recovery_matter_uid: "",
  collectability_cd: "MEDIUM",
  provision_percent: "",
  recommendation_txt: "",
};

export default function CollectionsPage() {
  const [activeTab, setActiveTab] = useState("matters");
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [lookups, setLookups] = useState({});
  const [matters, setMatters] = useState([]);
  const [actions, setActions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [enforcements, setEnforcements] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [matterForm, setMatterForm] = useState(initialMatter);
  const [actionForm, setActionForm] = useState(initialAction);
  const [planForm, setPlanForm] = useState(initialPlan);
  const [enforcementForm, setEnforcementForm] = useState(initialEnforcement);
  const [referralForm, setReferralForm] = useState(initialReferral);
  const [reviewForm, setReviewForm] = useState(initialReview);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const [overviewPayload, subjectsPayload, lookupPayload, mattersPayload, actionsPayload, plansPayload, enforcementPayload, referralPayload, reviewPayload] =
      await Promise.all([
        apiRequest("/api/collections/overview"),
        apiRequest("/api/registry/subjects?pageSize=100"),
        apiRequest("/api/configuration/lookups"),
        apiRequest("/api/collections/recovery-matters?pageSize=80"),
        apiRequest("/api/collections/actions?pageSize=80"),
        apiRequest("/api/collections/instalment-plans?pageSize=80"),
        apiRequest("/api/collections/enforcement-measures?pageSize=80"),
        apiRequest("/api/collections/legal-referrals?pageSize=80"),
        apiRequest("/api/collections/collectability-reviews?pageSize=80"),
      ]);

    setOverview(overviewPayload.overview);
    setSubjects(subjectsPayload.rows || []);
    setLookups(lookupPayload.lookups || {});
    setMatters(mattersPayload.rows || []);
    setActions(actionsPayload.rows || []);
    setPlans(plansPayload.rows || []);
    setEnforcements(enforcementPayload.rows || []);
    setReferrals(referralPayload.rows || []);
    setReviews(reviewPayload.rows || []);
  }

  useEffect(() => {
    void load().catch((loadError) => setError(loadError.message));
  }, []);

  async function submit(endpoint, body, reset, message) {
    setError("");
    setSuccess("");
    try {
      await apiRequest(endpoint, { method: "POST", body });
      reset();
      await load();
      setSuccess(message);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  function syncMatterForPlan(recoveryMatterUid) {
    const matter = matters.find((item) => item.recovery_matter_uid === recoveryMatterUid);
    setPlanForm({
      ...planForm,
      recovery_matter_uid: recoveryMatterUid,
      subject_uid: matter?.subject_uid || planForm.subject_uid,
      total_plan_amt: matter?.balance_amt ?? planForm.total_plan_amt,
      line_one_amt: matter?.balance_amt ? Number(matter.balance_amt) / 2 : planForm.line_one_amt,
      line_two_amt: matter?.balance_amt ? Number(matter.balance_amt) / 2 : planForm.line_two_amt,
    });
  }

  const matterColumns = [
    { key: "recovery_matter_no", label: "Matter" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "revenue_kind_name", label: "Revenue kind", render: (row) => row.revenue_kind_name || "All revenue" },
    { key: "balance_amt", label: "Balance", render: (row) => formatMoney(row.balance_amt) },
    { key: "open_action_count", label: "Open actions", render: (row) => formatNumber(row.open_action_count) },
    { key: "matter_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.matter_state_cd)}>{compactCode(row.matter_state_cd)}</StatusPill> },
  ];

  const actionColumns = [
    { key: "action_type_cd", label: "Action", render: (row) => compactCode(row.action_type_cd) },
    { key: "scheduled_dt", label: "Scheduled", render: (row) => formatDate(row.scheduled_dt) },
    { key: "notes_txt", label: "Notes", render: (row) => row.notes_txt || "-" },
    { key: "action_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.action_state_cd)}>{compactCode(row.action_state_cd)}</StatusPill> },
  ];

  const planColumns = [
    { key: "plan_no", label: "Plan" },
    { key: "total_plan_amt", label: "Amount", render: (row) => formatMoney(row.total_plan_amt) },
    { key: "start_dt", label: "Start", render: (row) => formatDate(row.start_dt) },
    { key: "end_dt", label: "End", render: (row) => formatDate(row.end_dt) },
    { key: "plan_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.plan_state_cd)}>{compactCode(row.plan_state_cd)}</StatusPill> },
  ];

  const enforcementColumns = [
    { key: "measure_type_cd", label: "Measure", render: (row) => compactCode(row.measure_type_cd) },
    { key: "start_dt", label: "Start", render: (row) => formatDate(row.start_dt) },
    { key: "amount_secured_amt", label: "Secured", render: (row) => formatMoney(row.amount_secured_amt) },
    { key: "measure_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.measure_state_cd)}>{compactCode(row.measure_state_cd)}</StatusPill> },
  ];

  const referralColumns = [
    { key: "referral_no", label: "Referral" },
    { key: "referred_to_txt", label: "Referred to" },
    { key: "referral_dt", label: "Date", render: (row) => formatDate(row.referral_dt) },
    { key: "legal_case_reference_txt", label: "Case reference", render: (row) => row.legal_case_reference_txt || "-" },
    { key: "referral_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.referral_state_cd)}>{compactCode(row.referral_state_cd)}</StatusPill> },
  ];

  const reviewColumns = [
    { key: "review_dt", label: "Review", render: (row) => formatDate(row.review_dt) },
    { key: "collectability_cd", label: "Collectability", render: (row) => <StatusPill tone={statusTone(row.collectability_cd)}>{compactCode(row.collectability_cd)}</StatusPill> },
    { key: "provision_percent", label: "Provision %", render: (row) => row.provision_percent ?? "-" },
    { key: "recommendation_txt", label: "Recommendation", render: (row) => row.recommendation_txt || "-" },
  ];

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Collections and enforcement" title="Recovery, Instalments And Legal Escalation" status="Active recovery" tone="success" />

      <div className="metric-grid">
        <MetricTile icon={HandCoins} label="Recovery matters" value={formatNumber(overview?.recovery_matter_count)} />
        <MetricTile icon={FileWarning} label="Open balance" value={formatMoney(overview?.open_balance_amt)} />
        <MetricTile icon={CalendarClock} label="Instalment plans" value={formatNumber(overview?.instalment_plan_count)} />
        <MetricTile icon={Gavel} label="Legal referrals" value={formatNumber(overview?.legal_referral_count)} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "matters" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Recovery case</span>
                <h2>Open Recovery Matter</h2>
              </div>
            </div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/collections/recovery-matters",
                {
                  ...matterForm,
                  revenue_kind_uid: matterForm.revenue_kind_uid || null,
                  balance_amt: matterForm.balance_amt || 0,
                },
                () => setMatterForm(initialMatter),
                "Recovery matter opened"
              );
            }}>
              <SelectField label="Taxpayer" value={matterForm.subject_uid} onChange={(value) => setMatterForm({ ...matterForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_uid} value={subject.subject_uid}>
                    {subject.display_name_txt}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Revenue kind" value={matterForm.revenue_kind_uid} onChange={(value) => setMatterForm({ ...matterForm, revenue_kind_uid: value })}>
                <option value="">All revenue</option>
                {(lookups.revenue_kinds || []).map((kind) => (
                  <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>
                    {kind.revenue_kind_name}
                  </option>
                ))}
              </SelectField>
              <div className="compact-form">
                <Field label="Balance">
                  <input type="number" value={matterForm.balance_amt} onChange={(event) => setMatterForm({ ...matterForm, balance_amt: event.target.value })} />
                </Field>
                <Field label="Priority">
                  <input value={matterForm.priority_cd} onChange={(event) => setMatterForm({ ...matterForm, priority_cd: event.target.value.toUpperCase() })} />
                </Field>
              </div>
              <Field label="Opened date">
                <input type="date" value={matterForm.opened_dt} onChange={(event) => setMatterForm({ ...matterForm, opened_dt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit">Open matter</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={matterColumns} rows={matters} keyField="recovery_matter_uid" empty="No recovery matters" />
          </section>
        </div>
      ) : null}

      {activeTab === "plans" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Recovery follow-up</span>
                <h2>Actions And Instalment Plans</h2>
              </div>
            </div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/collections/actions",
                {
                  ...actionForm,
                  notes_txt: actionForm.notes_txt || null,
                },
                () => setActionForm(initialAction),
                "Recovery action scheduled"
              );
            }}>
              <SelectField label="Matter" value={actionForm.recovery_matter_uid} onChange={(value) => setActionForm({ ...actionForm, recovery_matter_uid: value })}>
                <option value="">Select matter</option>
                {matters.map((matter) => (
                  <option key={matter.recovery_matter_uid} value={matter.recovery_matter_uid}>
                    {matter.recovery_matter_no} - {matter.display_name_txt}
                  </option>
                ))}
              </SelectField>
              <div className="compact-form">
                <Field label="Action type">
                  <input value={actionForm.action_type_cd} onChange={(event) => setActionForm({ ...actionForm, action_type_cd: event.target.value.toUpperCase() })} />
                </Field>
                <Field label="Scheduled date">
                  <input type="date" value={actionForm.scheduled_dt} onChange={(event) => setActionForm({ ...actionForm, scheduled_dt: event.target.value })} />
                </Field>
              </div>
              <Field label="Notes">
                <textarea value={actionForm.notes_txt} onChange={(event) => setActionForm({ ...actionForm, notes_txt: event.target.value })} />
              </Field>
              <button className="secondary-button" type="submit">Schedule action</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              const lines = [
                planForm.line_one_due_dt && planForm.line_one_amt
                  ? { sequence_no: 1, due_dt: planForm.line_one_due_dt, expected_amt: Number(planForm.line_one_amt) }
                  : null,
                planForm.line_two_due_dt && planForm.line_two_amt
                  ? { sequence_no: 2, due_dt: planForm.line_two_due_dt, expected_amt: Number(planForm.line_two_amt) }
                  : null,
              ].filter(Boolean);
              void submit(
                "/api/collections/instalment-plans",
                {
                  recovery_matter_uid: planForm.recovery_matter_uid || null,
                  subject_uid: planForm.subject_uid,
                  total_plan_amt: Number(planForm.total_plan_amt),
                  plan_state_cd: planForm.plan_state_cd,
                  start_dt: planForm.start_dt,
                  end_dt: planForm.end_dt || null,
                  lines,
                },
                () => setPlanForm(initialPlan),
                "Instalment plan recorded"
              );
            }}>
              <SelectField label="Matter" value={planForm.recovery_matter_uid} onChange={syncMatterForPlan}>
                <option value="">No recovery matter</option>
                {matters.map((matter) => (
                  <option key={matter.recovery_matter_uid} value={matter.recovery_matter_uid}>
                    {matter.recovery_matter_no} - {matter.display_name_txt}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Taxpayer" value={planForm.subject_uid} onChange={(value) => setPlanForm({ ...planForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_uid} value={subject.subject_uid}>
                    {subject.display_name_txt}
                  </option>
                ))}
              </SelectField>
              <div className="compact-form">
                <Field label="Total amount">
                  <input type="number" required value={planForm.total_plan_amt} onChange={(event) => setPlanForm({ ...planForm, total_plan_amt: event.target.value })} />
                </Field>
                <SelectField label="Plan state" value={planForm.plan_state_cd} onChange={(value) => setPlanForm({ ...planForm, plan_state_cd: value })}>
                  <option value="PROPOSED">Proposed</option>
                  <option value="APPROVED">Approved</option>
                </SelectField>
              </div>
              <div className="compact-form">
                <Field label="First due date">
                  <input type="date" value={planForm.line_one_due_dt} onChange={(event) => setPlanForm({ ...planForm, line_one_due_dt: event.target.value })} />
                </Field>
                <Field label="First amount">
                  <input type="number" value={planForm.line_one_amt} onChange={(event) => setPlanForm({ ...planForm, line_one_amt: event.target.value })} />
                </Field>
                <Field label="Second due date">
                  <input type="date" value={planForm.line_two_due_dt} onChange={(event) => setPlanForm({ ...planForm, line_two_due_dt: event.target.value })} />
                </Field>
                <Field label="Second amount">
                  <input type="number" value={planForm.line_two_amt} onChange={(event) => setPlanForm({ ...planForm, line_two_amt: event.target.value })} />
                </Field>
              </div>
              <button className="primary-button" type="submit">Record plan</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={actionColumns} rows={actions} keyField="recovery_action_uid" empty="No recovery actions" />
            <br />
            <DataTable columns={planColumns} rows={plans} keyField="instalment_plan_uid" empty="No instalment plans" />
          </section>
        </div>
      ) : null}

      {activeTab === "enforcement" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Escalation control</span>
                <h2>Enforcement, Legal And Review</h2>
              </div>
            </div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/collections/enforcement-measures",
                {
                  ...enforcementForm,
                  legal_reference_txt: enforcementForm.legal_reference_txt || null,
                  amount_secured_amt: enforcementForm.amount_secured_amt || null,
                },
                () => setEnforcementForm(initialEnforcement),
                "Enforcement measure recorded"
              );
            }}>
              <SelectField label="Matter" value={enforcementForm.recovery_matter_uid} onChange={(value) => setEnforcementForm({ ...enforcementForm, recovery_matter_uid: value })}>
                <option value="">Select matter</option>
                {matters.map((matter) => (
                  <option key={matter.recovery_matter_uid} value={matter.recovery_matter_uid}>
                    {matter.recovery_matter_no} - {matter.display_name_txt}
                  </option>
                ))}
              </SelectField>
              <div className="compact-form">
                <Field label="Measure type">
                  <input value={enforcementForm.measure_type_cd} onChange={(event) => setEnforcementForm({ ...enforcementForm, measure_type_cd: event.target.value.toUpperCase() })} />
                </Field>
                <Field label="Amount secured">
                  <input type="number" value={enforcementForm.amount_secured_amt} onChange={(event) => setEnforcementForm({ ...enforcementForm, amount_secured_amt: event.target.value })} />
                </Field>
              </div>
              <Field label="Legal reference">
                <textarea value={enforcementForm.legal_reference_txt} onChange={(event) => setEnforcementForm({ ...enforcementForm, legal_reference_txt: event.target.value })} />
              </Field>
              <button className="secondary-button" type="submit">Record enforcement</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/collections/legal-referrals",
                {
                  ...referralForm,
                  legal_case_reference_txt: referralForm.legal_case_reference_txt || null,
                  outcome_txt: referralForm.outcome_txt || null,
                },
                () => setReferralForm(initialReferral),
                "Legal referral recorded"
              );
            }}>
              <SelectField label="Matter" value={referralForm.recovery_matter_uid} onChange={(value) => setReferralForm({ ...referralForm, recovery_matter_uid: value })}>
                <option value="">Select matter</option>
                {matters.map((matter) => (
                  <option key={matter.recovery_matter_uid} value={matter.recovery_matter_uid}>
                    {matter.recovery_matter_no} - {matter.display_name_txt}
                  </option>
                ))}
              </SelectField>
              <Field label="Referred to">
                <input required value={referralForm.referred_to_txt} onChange={(event) => setReferralForm({ ...referralForm, referred_to_txt: event.target.value })} />
              </Field>
              <Field label="Legal case reference">
                <input value={referralForm.legal_case_reference_txt} onChange={(event) => setReferralForm({ ...referralForm, legal_case_reference_txt: event.target.value })} />
              </Field>
              <button className="secondary-button" type="submit">Record referral</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/collections/collectability-reviews",
                {
                  ...reviewForm,
                  provision_percent: reviewForm.provision_percent || null,
                  recommendation_txt: reviewForm.recommendation_txt || null,
                },
                () => setReviewForm(initialReview),
                "Collectability review recorded"
              );
            }}>
              <SelectField label="Matter" value={reviewForm.recovery_matter_uid} onChange={(value) => setReviewForm({ ...reviewForm, recovery_matter_uid: value })}>
                <option value="">Select matter</option>
                {matters.map((matter) => (
                  <option key={matter.recovery_matter_uid} value={matter.recovery_matter_uid}>
                    {matter.recovery_matter_no} - {matter.display_name_txt}
                  </option>
                ))}
              </SelectField>
              <div className="compact-form">
                <Field label="Collectability">
                  <input value={reviewForm.collectability_cd} onChange={(event) => setReviewForm({ ...reviewForm, collectability_cd: event.target.value.toUpperCase() })} />
                </Field>
                <Field label="Provision percent">
                  <input type="number" value={reviewForm.provision_percent} onChange={(event) => setReviewForm({ ...reviewForm, provision_percent: event.target.value })} />
                </Field>
              </div>
              <Field label="Recommendation">
                <textarea value={reviewForm.recommendation_txt} onChange={(event) => setReviewForm({ ...reviewForm, recommendation_txt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit">Record review</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={enforcementColumns} rows={enforcements} keyField="enforcement_measure_uid" empty="No enforcement measures" />
            <br />
            <DataTable columns={referralColumns} rows={referrals} keyField="legal_referral_uid" empty="No legal referrals" />
            <br />
            <DataTable columns={reviewColumns} rows={reviews} keyField="collectability_review_uid" empty="No collectability reviews" />
          </section>
        </div>
      ) : null}
    </section>
  );
}
