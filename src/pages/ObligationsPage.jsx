import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CircleDollarSign,
  FileClock,
  Hand,
  Landmark,
  ListChecks,
  PauseCircle,
  RefreshCw,
  ShieldCheck,
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
import ObligationGovernancePanel from "../components/governance/ObligationGovernancePanel.jsx";
import { apiRequest } from "../services/api.js";
import { compactCode, formatDate, formatDateTime, formatMoney, formatNumber } from "../utils/format.js";

const tabs = [
  { id: "workbench", label: "Obligation Workbench" },
  { id: "enrolment", label: "Revenue Enrolment" },
  { id: "controls", label: "Holds And Concessions" },
  { id: "corrections", label: "Correction Governance" },
  { id: "snapshot", label: "Taxpayer Snapshot" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysFromToday() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

const initialDueFilters = {
  q: "",
  subject_uid: "",
  revenue_kind_uid: "",
  due_state_cd: "",
  due_event_cd: "",
  due_from_dt: "",
  due_to_dt: "",
  period_label_txt: "",
};

const initialEnrolment = {
  subject_uid: "",
  revenue_kind_uid: "",
  period_rule_uid: "",
  agency_unit_uid: "",
  service_site_uid: "",
  start_dt: today(),
  registration_source_cd: "OFFICER",
  period_count: 4,
  generate_periods_bool: true,
  initial_amount_due_amt: "",
};

const initialHold = {
  subject_uid: "",
  revenue_kind_uid: "",
  hold_type_cd: "COMPLIANCE",
  hold_reason_txt: "",
};

const initialConcession = {
  subject_uid: "",
  revenue_kind_uid: "",
  revenue_component_uid: "",
  concession_type_cd: "RELIEF",
  effective_from_dt: today(),
  effective_to_dt: "",
  rule_note_txt: "",
};

const initialDueUpdate = {
  due_state_cd: "NOTIFIED",
  amount_due_amt: "",
  reason_txt: "",
};

function stripEmpty(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== "" && value !== undefined && value !== null));
}

function buildQuery(record) {
  const params = new URLSearchParams();
  Object.entries(stripEmpty(record)).forEach(([key, value]) => params.set(key, value));
  return params.toString();
}

function dueTone(state) {
  if (state === "PAID" || state === "FILED" || state === "ASSESSED") return "success";
  if (state === "OVERDUE") return "danger";
  if (state === "NOTIFIED") return "warning";
  if (state === "CANCELLED") return "neutral";
  return "neutral";
}

function holdTone(state) {
  if (state === "ACTIVE") return "danger";
  if (state === "RELEASED") return "success";
  return "neutral";
}

export default function ObligationsPage() {
  const [activeTab, setActiveTab] = useState("workbench");
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [lookups, setLookups] = useState({});
  const [enrolments, setEnrolments] = useState([]);
  const [dues, setDues] = useState([]);
  const [duePage, setDuePage] = useState(null);
  const [dueFilters, setDueFilters] = useState(initialDueFilters);
  const [enrolmentForm, setEnrolmentForm] = useState(initialEnrolment);
  const [holdForm, setHoldForm] = useState(initialHold);
  const [concessionForm, setConcessionForm] = useState(initialConcession);
  const [selectedDue, setSelectedDue] = useState(null);
  const [dueUpdateForm, setDueUpdateForm] = useState(initialDueUpdate);
  const [selectedSubjectObligations, setSelectedSubjectObligations] = useState(null);
  const [snapshotSubjectUid, setSnapshotSubjectUid] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const periodOptions = useMemo(
    () => (lookups.period_rules || []).filter((rule) => !enrolmentForm.revenue_kind_uid || rule.revenue_kind_uid === enrolmentForm.revenue_kind_uid),
    [enrolmentForm.revenue_kind_uid, lookups.period_rules]
  );

  const serviceSiteOptions = useMemo(
    () => (lookups.service_sites || []).filter((site) => !enrolmentForm.agency_unit_uid || site.agency_unit_uid === enrolmentForm.agency_unit_uid),
    [enrolmentForm.agency_unit_uid, lookups.service_sites]
  );

  const componentOptions = useMemo(
    () => (lookups.revenue_components || []).filter((component) => !concessionForm.revenue_kind_uid || component.revenue_kind_uid === concessionForm.revenue_kind_uid),
    [concessionForm.revenue_kind_uid, lookups.revenue_components]
  );

  async function load(nextFilters = dueFilters) {
    setLoading(true);
    const dueQuery = buildQuery({ ...nextFilters, pageSize: 100 });
    const [overviewPayload, subjectsPayload, lookupPayload, enrolmentsPayload, duesPayload] = await Promise.all([
      apiRequest("/api/obligations/overview"),
      apiRequest("/api/registry/subjects?pageSize=120"),
      apiRequest("/api/configuration/lookups"),
      apiRequest("/api/obligations/enrolments?pageSize=80"),
      apiRequest(`/api/obligations/dues?${dueQuery}`),
    ]);

    setOverview(overviewPayload.overview);
    setSubjects(subjectsPayload.rows || []);
    setLookups(lookupPayload.lookups || {});
    setEnrolments(enrolmentsPayload.rows || []);
    setDues(duesPayload.rows || []);
    setDuePage(duesPayload.page || null);
    const nextSelectedDue = (duesPayload.rows || []).find((row) => row.due_instance_uid === selectedDue?.due_instance_uid) || (duesPayload.rows || [])[0] || null;
    setSelectedDue(nextSelectedDue);
    setDueUpdateForm(
      nextSelectedDue
        ? {
            due_state_cd: nextSelectedDue.due_state_cd === "OPEN" ? "NOTIFIED" : nextSelectedDue.due_state_cd,
            amount_due_amt: nextSelectedDue.amount_due_amt ?? "",
            reason_txt: "",
          }
        : initialDueUpdate
    );
    setLoading(false);
  }

  useEffect(() => {
    void load().catch((loadError) => {
      setError(loadError.message);
      setLoading(false);
    });
  }, []);

  async function loadSubjectObligations(subjectUid) {
    setSnapshotSubjectUid(subjectUid);
    if (!subjectUid) {
      setSelectedSubjectObligations(null);
      return;
    }
    const payload = await apiRequest(`/api/obligations/subjects/${subjectUid}`);
    setSelectedSubjectObligations(payload.obligations);
  }

  async function submit(endpoint, body, reset, message) {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await apiRequest(endpoint, { method: "POST", body });
      reset();
      await load();
      if (snapshotSubjectUid) await loadSubjectObligations(snapshotSubjectUid);
      setSuccess(message);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateDueStatus(event) {
    event.preventDefault();
    if (!selectedDue) return;
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await apiRequest(`/api/obligations/dues/${selectedDue.due_instance_uid}/status`, {
        method: "PATCH",
        body: stripEmpty(dueUpdateForm),
      });
      setDueUpdateForm(initialDueUpdate);
      await load();
      if (snapshotSubjectUid) await loadSubjectObligations(snapshotSubjectUid);
      setSuccess("Due lifecycle updated.");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  async function releaseHold(hold) {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await apiRequest(`/api/obligations/holds/${hold.account_hold_uid}/release`, {
        method: "PATCH",
        body: { release_reason_txt: "Released from officer workbench." },
      });
      await load();
      if (snapshotSubjectUid) await loadSubjectObligations(snapshotSubjectUid);
      setSuccess("Account hold released.");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  const dueColumns = [
    { key: "due_dt", label: "Due date", render: (row) => formatDate(row.due_dt) },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "revenue_kind_name", label: "Revenue type" },
    { key: "period_label_txt", label: "Period", render: (row) => row.period_label_txt || "-" },
    { key: "due_event_cd", label: "Event", render: (row) => compactCode(row.due_event_cd) },
    { key: "amount_due_amt", label: "Amount", render: (row) => formatMoney(row.amount_due_amt || 0) },
    {
      key: "due_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={dueTone(row.due_state_cd)}>{compactCode(row.due_state_cd)}</StatusPill>,
    },
    {
      key: "blocked_by_hold_bool",
      label: "Hold",
      render: (row) => row.blocked_by_hold_bool ? <StatusPill tone="danger">Blocked</StatusPill> : <StatusPill tone="success">Clear</StatusPill>,
    },
  ];

  const enrolmentColumns = [
    { key: "enrolment_no", label: "Enrolment" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "revenue_kind_name", label: "Revenue type" },
    { key: "period_rule_code", label: "Period rule", render: (row) => row.period_rule_code || "-" },
    { key: "service_site_name", label: "Service site", render: (row) => row.service_site_name || "-" },
    { key: "open_due_count", label: "Open dues", render: (row) => formatNumber(row.open_due_count) },
    {
      key: "enrolment_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={row.enrolment_state_cd === "ACTIVE" ? "success" : "warning"}>{compactCode(row.enrolment_state_cd)}</StatusPill>,
    },
  ];

  const holdColumns = [
    { key: "hold_type_cd", label: "Type", render: (row) => compactCode(row.hold_type_cd) },
    { key: "revenue_kind_name", label: "Revenue type", render: (row) => row.revenue_kind_name || "All revenue" },
    { key: "hold_reason_txt", label: "Reason", render: (row) => row.hold_reason_txt || "-" },
    {
      key: "hold_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={holdTone(row.hold_state_cd)}>{compactCode(row.hold_state_cd)}</StatusPill>,
    },
    {
      key: "release",
      label: "Action",
      render: (row) =>
        row.hold_state_cd === "ACTIVE" ? (
          <button className="table-action-button" type="button" onClick={() => releaseHold(row)} disabled={saving}>
            Release
          </button>
        ) : (
          row.released_by_name_txt || "-"
        ),
    },
  ];

  const concessionColumns = [
    { key: "concession_reference_no", label: "Reference" },
    { key: "concession_type_cd", label: "Type", render: (row) => compactCode(row.concession_type_cd) },
    { key: "revenue_kind_name", label: "Revenue type", render: (row) => row.revenue_kind_name || "All revenue" },
    { key: "component_name", label: "Component", render: (row) => row.component_name || "-" },
    { key: "effective_from_dt", label: "From", render: (row) => formatDate(row.effective_from_dt) },
  ];

  const lifecycleColumns = [
    { key: "event_ts", label: "Time", render: (row) => formatDateTime(row.event_ts) },
    { key: "event_type_cd", label: "Event", render: (row) => compactCode(row.event_type_cd) },
    { key: "event_reason_txt", label: "Reason", render: (row) => row.event_reason_txt || "-" },
    { key: "created_by_name_txt", label: "Officer", render: (row) => row.created_by_name_txt || "-" },
  ];

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Revenue enrolment"
        title="Obligations And Due Calendar"
        status={loading ? "Loading" : "Operational"}
        tone={loading ? "warning" : "success"}
      />

      <div className="metric-grid">
        <MetricTile icon={ListChecks} label="Enrolments" value={formatNumber(overview?.enrolment_count)} />
        <MetricTile icon={CalendarClock} label="Open dues" value={formatNumber(overview?.open_due_count)} sublabel={`${formatMoney(overview?.open_due_amt || 0)} outstanding`} />
        <MetricTile icon={AlertTriangle} label="Overdue" value={formatNumber(overview?.overdue_due_count)} />
        <MetricTile icon={Hand} label="Active holds" value={formatNumber(overview?.active_hold_count)} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "workbench" ? (
        <div className="obligation-workbench-grid">
          <section className="content-band obligation-workbench-grid__filters">
            <div className="section-heading">
              <div>
                <span>Officer workbench</span>
                <h2>Due Search</h2>
              </div>
              <FileClock size={22} />
            </div>
            <form
              className="obligation-filter-form"
              onSubmit={(event) => {
                event.preventDefault();
                void load(dueFilters).catch((submitError) => setError(submitError.message));
              }}
            >
              <Field label="Keyword">
                <input value={dueFilters.q} onChange={(event) => setDueFilters({ ...dueFilters, q: event.target.value })} />
              </Field>
              <SelectField label="Taxpayer" value={dueFilters.subject_uid} onChange={(value) => setDueFilters({ ...dueFilters, subject_uid: value })}>
                <option value="">All taxpayers</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>
                ))}
              </SelectField>
              <SelectField label="Revenue type" value={dueFilters.revenue_kind_uid} onChange={(value) => setDueFilters({ ...dueFilters, revenue_kind_uid: value })}>
                <option value="">All revenue</option>
                {(lookups.revenue_kinds || []).map((kind) => (
                  <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>{kind.revenue_kind_name}</option>
                ))}
              </SelectField>
              <SelectField label="Due state" value={dueFilters.due_state_cd} onChange={(value) => setDueFilters({ ...dueFilters, due_state_cd: value })}>
                <option value="">All states</option>
                <option value="OPEN">Open</option>
                <option value="NOTIFIED">Notified</option>
                <option value="OVERDUE">Overdue</option>
                <option value="FILED">Filed</option>
                <option value="ASSESSED">Assessed</option>
                <option value="PAID">Paid</option>
                <option value="CANCELLED">Cancelled</option>
              </SelectField>
              <Field label="Period">
                <input value={dueFilters.period_label_txt} onChange={(event) => setDueFilters({ ...dueFilters, period_label_txt: event.target.value })} />
              </Field>
              <Field label="Event">
                <input value={dueFilters.due_event_cd} onChange={(event) => setDueFilters({ ...dueFilters, due_event_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Due from">
                <input type="date" value={dueFilters.due_from_dt} onChange={(event) => setDueFilters({ ...dueFilters, due_from_dt: event.target.value })} />
              </Field>
              <Field label="Due to">
                <input type="date" value={dueFilters.due_to_dt} onChange={(event) => setDueFilters({ ...dueFilters, due_to_dt: event.target.value })} />
              </Field>
              <div className="form-actions full-span">
                <button className="primary-button" type="submit">Search dues</button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    const next = { ...initialDueFilters, due_from_dt: today(), due_to_dt: thirtyDaysFromToday() };
                    setDueFilters(next);
                    void load(next).catch((submitError) => setError(submitError.message));
                  }}
                >
                  Next 30 days
                </button>
              </div>
            </form>
          </section>

          <section className="content-band obligation-workbench-grid__results">
            <div className="section-heading">
              <div>
                <span>{formatNumber(duePage?.total)} result{duePage?.total === 1 ? "" : "s"}</span>
                <h2>Filing And Payment Due Calendar</h2>
              </div>
              <StatusPill tone="warning">{formatNumber(dues.length)} visible</StatusPill>
            </div>
            <DataTable
              columns={dueColumns}
              rows={dues}
              keyField="due_instance_uid"
              selectedKey={selectedDue?.due_instance_uid}
              onRowClick={(row) => {
                setSelectedDue(row);
                setDueUpdateForm({ due_state_cd: row.due_state_cd === "OPEN" ? "NOTIFIED" : row.due_state_cd, amount_due_amt: row.amount_due_amt ?? "", reason_txt: "" });
              }}
              empty="No due instances match the current filters"
            />
          </section>

          <aside className="content-band obligation-workbench-grid__action">
            <div className="section-heading">
              <div>
                <span>Lifecycle action</span>
                <h2>{selectedDue?.display_name_txt || "Select a due"}</h2>
              </div>
              {selectedDue ? <StatusPill tone={dueTone(selectedDue.due_state_cd)}>{compactCode(selectedDue.due_state_cd)}</StatusPill> : null}
            </div>
            {selectedDue ? (
              <form className="stacked-form" onSubmit={updateDueStatus}>
                {selectedDue.blocked_by_hold_bool ? (
                  <div className="security-callout">
                    <PauseCircle size={18} />
                    <span>An active account hold may block due lifecycle updates until released.</span>
                  </div>
                ) : null}
                <SelectField label="Next state" value={dueUpdateForm.due_state_cd} onChange={(value) => setDueUpdateForm({ ...dueUpdateForm, due_state_cd: value })}>
                  <option value="OPEN">Open</option>
                  <option value="NOTIFIED">Notified</option>
                  <option value="FILED">Filed</option>
                  <option value="ASSESSED">Assessed</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="CANCELLED">Cancelled</option>
                </SelectField>
                <Field label="Amount due">
                  <input type="number" step="0.01" value={dueUpdateForm.amount_due_amt} onChange={(event) => setDueUpdateForm({ ...dueUpdateForm, amount_due_amt: event.target.value })} />
                </Field>
                <Field label="Reason">
                  <textarea value={dueUpdateForm.reason_txt} onChange={(event) => setDueUpdateForm({ ...dueUpdateForm, reason_txt: event.target.value })} />
                </Field>
                <button className="primary-button" type="submit" disabled={saving}>Update due lifecycle</button>
              </form>
            ) : (
              <div className="empty-panel"><div><strong>No due selected</strong><span>Select a due instance to update lifecycle.</span></div></div>
            )}
          </aside>
        </div>
      ) : null}

      {activeTab === "enrolment" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Taxpayer enrolment</span>
                <h2>Create Obligation Stream</h2>
              </div>
              <Landmark size={22} />
            </div>
            <form
              className="action-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit(
                  "/api/obligations/enrolments",
                  {
                    ...stripEmpty(enrolmentForm),
                    period_rule_uid: enrolmentForm.period_rule_uid || null,
                    agency_unit_uid: enrolmentForm.agency_unit_uid || null,
                    service_site_uid: enrolmentForm.service_site_uid || null,
                  },
                  () => setEnrolmentForm(initialEnrolment),
                  "Revenue enrolment created and due periods generated."
                );
              }}
            >
              <SelectField label="Taxpayer" required value={enrolmentForm.subject_uid} onChange={(value) => setEnrolmentForm({ ...enrolmentForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>
                ))}
              </SelectField>
              <SelectField label="Revenue type" required value={enrolmentForm.revenue_kind_uid} onChange={(value) => setEnrolmentForm({ ...enrolmentForm, revenue_kind_uid: value, period_rule_uid: "" })}>
                <option value="">Select revenue type</option>
                {(lookups.revenue_kinds || []).map((kind) => (
                  <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>{kind.revenue_kind_name}</option>
                ))}
              </SelectField>
              <SelectField label="Period rule" value={enrolmentForm.period_rule_uid} onChange={(value) => setEnrolmentForm({ ...enrolmentForm, period_rule_uid: value })}>
                <option value="">Use latest rule</option>
                {periodOptions.map((rule) => (
                  <option key={rule.period_rule_uid} value={rule.period_rule_uid}>{rule.period_rule_code} ({compactCode(rule.frequency_cd)})</option>
                ))}
              </SelectField>
              <SelectField label="Agency unit" value={enrolmentForm.agency_unit_uid} onChange={(value) => setEnrolmentForm({ ...enrolmentForm, agency_unit_uid: value, service_site_uid: "" })}>
                <option value="">Unassigned</option>
                {(lookups.agency_units || []).map((unit) => (
                  <option key={unit.agency_unit_uid} value={unit.agency_unit_uid}>{unit.unit_name}</option>
                ))}
              </SelectField>
              <SelectField label="Service site" value={enrolmentForm.service_site_uid} onChange={(value) => setEnrolmentForm({ ...enrolmentForm, service_site_uid: value })}>
                <option value="">Unassigned</option>
                {serviceSiteOptions.map((site) => (
                  <option key={site.service_site_uid} value={site.service_site_uid}>{site.site_name}</option>
                ))}
              </SelectField>
              <div className="compact-form">
                <Field label="Start date">
                  <input type="date" required value={enrolmentForm.start_dt} onChange={(event) => setEnrolmentForm({ ...enrolmentForm, start_dt: event.target.value })} />
                </Field>
                <Field label="Periods to generate">
                  <input type="number" min="1" max="36" value={enrolmentForm.period_count} onChange={(event) => setEnrolmentForm({ ...enrolmentForm, period_count: Number(event.target.value) })} />
                </Field>
              </div>
              <Field label="Initial amount due">
                <input type="number" step="0.01" value={enrolmentForm.initial_amount_due_amt} onChange={(event) => setEnrolmentForm({ ...enrolmentForm, initial_amount_due_amt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit" disabled={saving}>Create enrolment</button>
            </form>
          </section>

          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Active streams</span>
                <h2>Revenue Enrolments</h2>
              </div>
              <RefreshCw size={22} />
            </div>
            <DataTable columns={enrolmentColumns} rows={enrolments} keyField="enrolment_uid" empty="No enrolments" />
          </section>
        </div>
      ) : null}

      {activeTab === "controls" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Restrictions</span>
                <h2>Account Holds</h2>
              </div>
              <Hand size={22} />
            </div>
            <form
              className="action-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit("/api/obligations/holds", { ...stripEmpty(holdForm), revenue_kind_uid: holdForm.revenue_kind_uid || null }, () => setHoldForm(initialHold), "Account hold recorded.");
              }}
            >
              <SelectField label="Taxpayer" required value={holdForm.subject_uid} onChange={(value) => setHoldForm({ ...holdForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>
                ))}
              </SelectField>
              <SelectField label="Revenue type" value={holdForm.revenue_kind_uid} onChange={(value) => setHoldForm({ ...holdForm, revenue_kind_uid: value })}>
                <option value="">All revenue</option>
                {(lookups.revenue_kinds || []).map((kind) => (
                  <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>{kind.revenue_kind_name}</option>
                ))}
              </SelectField>
              <SelectField label="Hold type" value={holdForm.hold_type_cd} onChange={(value) => setHoldForm({ ...holdForm, hold_type_cd: value })}>
                <option value="COMPLIANCE">Compliance</option>
                <option value="COLLECTIONS">Collections</option>
                <option value="ENROLMENT_BLOCK">Enrolment block</option>
                <option value="FILING_BLOCK">Filing block</option>
                <option value="PAYMENT_BLOCK">Payment block</option>
                <option value="SERVICE_RESTRICTION">Service restriction</option>
                <option value="INFORMATION_ONLY">Information only</option>
              </SelectField>
              <Field label="Reason">
                <textarea value={holdForm.hold_reason_txt} onChange={(event) => setHoldForm({ ...holdForm, hold_reason_txt: event.target.value })} />
              </Field>
              <button className="secondary-button" type="submit" disabled={saving}>Record hold</button>
            </form>
          </section>

          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Relief and exemptions</span>
                <h2>Concessions</h2>
              </div>
              <ShieldCheck size={22} />
            </div>
            <form
              className="action-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit(
                  "/api/obligations/concessions",
                  {
                    ...stripEmpty(concessionForm),
                    revenue_kind_uid: concessionForm.revenue_kind_uid || null,
                    revenue_component_uid: concessionForm.revenue_component_uid || null,
                    concession_rule_jsn: concessionForm.rule_note_txt ? { note: concessionForm.rule_note_txt } : {},
                    rule_note_txt: undefined,
                  },
                  () => setConcessionForm(initialConcession),
                  "Concession recorded."
                );
              }}
            >
              <SelectField label="Taxpayer" required value={concessionForm.subject_uid} onChange={(value) => setConcessionForm({ ...concessionForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>
                ))}
              </SelectField>
              <SelectField label="Revenue type" value={concessionForm.revenue_kind_uid} onChange={(value) => setConcessionForm({ ...concessionForm, revenue_kind_uid: value, revenue_component_uid: "" })}>
                <option value="">All revenue</option>
                {(lookups.revenue_kinds || []).map((kind) => (
                  <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>{kind.revenue_kind_name}</option>
                ))}
              </SelectField>
              <SelectField label="Component" value={concessionForm.revenue_component_uid} onChange={(value) => setConcessionForm({ ...concessionForm, revenue_component_uid: value })}>
                <option value="">All components</option>
                {componentOptions.map((component) => (
                  <option key={component.revenue_component_uid} value={component.revenue_component_uid}>{component.component_name}</option>
                ))}
              </SelectField>
              <Field label="Concession type">
                <input value={concessionForm.concession_type_cd} onChange={(event) => setConcessionForm({ ...concessionForm, concession_type_cd: event.target.value.toUpperCase() })} />
              </Field>
              <div className="compact-form">
                <Field label="Effective from">
                  <input type="date" value={concessionForm.effective_from_dt} onChange={(event) => setConcessionForm({ ...concessionForm, effective_from_dt: event.target.value })} />
                </Field>
                <Field label="Effective to">
                  <input type="date" value={concessionForm.effective_to_dt} onChange={(event) => setConcessionForm({ ...concessionForm, effective_to_dt: event.target.value })} />
                </Field>
              </div>
              <Field label="Rule note">
                <textarea value={concessionForm.rule_note_txt} onChange={(event) => setConcessionForm({ ...concessionForm, rule_note_txt: event.target.value })} />
              </Field>
              <button className="secondary-button" type="submit" disabled={saving}>Record concession</button>
            </form>
          </section>
        </div>
      ) : null}

      {activeTab === "corrections" ? <ObligationGovernancePanel /> : null}

      {activeTab === "snapshot" ? (
        <div className="obligation-snapshot-grid">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Taxpayer profile integration</span>
                <h2>Operational Snapshot</h2>
              </div>
              <BadgeCheck size={22} />
            </div>
            <SelectField label="Taxpayer" value={snapshotSubjectUid} onChange={(value) => loadSubjectObligations(value)}>
              <option value="">Select taxpayer</option>
              {subjects.map((subject) => (
                <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>
              ))}
            </SelectField>
            <div className="obligation-snapshot-cards">
              <MetricTile icon={ListChecks} label="Enrolments" value={formatNumber(selectedSubjectObligations?.enrolments?.length)} />
              <MetricTile icon={CalendarClock} label="Periods" value={formatNumber(selectedSubjectObligations?.periods?.length)} />
              <MetricTile icon={CircleDollarSign} label="Dues" value={formatNumber(selectedSubjectObligations?.dues?.length)} />
              <MetricTile icon={Hand} label="Holds" value={formatNumber(selectedSubjectObligations?.holds?.length)} />
            </div>
          </section>

          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Enrolments</span>
                <h2>Revenue Streams</h2>
              </div>
            </div>
            <DataTable columns={enrolmentColumns} rows={selectedSubjectObligations?.enrolments || []} keyField="enrolment_uid" empty="No enrolments for selected taxpayer" />
          </section>

          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Dues</span>
                <h2>Filing And Payment Responsibilities</h2>
              </div>
            </div>
            <DataTable columns={dueColumns} rows={selectedSubjectObligations?.dues || []} keyField="due_instance_uid" empty="No due instances for selected taxpayer" />
          </section>

          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Controls</span>
                <h2>Holds And Concessions</h2>
              </div>
            </div>
            <DataTable columns={holdColumns} rows={selectedSubjectObligations?.holds || []} keyField="account_hold_uid" empty="No account holds" />
            <br />
            <DataTable columns={concessionColumns} rows={selectedSubjectObligations?.concessions || []} keyField="concession_uid" empty="No concessions" />
          </section>

          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Lifecycle</span>
                <h2>Operational History</h2>
              </div>
            </div>
            <DataTable columns={lifecycleColumns} rows={selectedSubjectObligations?.lifecycle_events || []} keyField="lifecycle_event_uid" empty="No obligation lifecycle events" />
          </section>
        </div>
      ) : null}
    </section>
  );
}
