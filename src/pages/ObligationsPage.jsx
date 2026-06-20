import { CalendarClock, CircleDollarSign, Hand, ListChecks } from "lucide-react";
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
  { id: "enrol", label: "Enrolment" },
  { id: "dues", label: "Due Calendar" },
  { id: "controls", label: "Holds And Concessions" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

const initialEnrolment = {
  subject_uid: "",
  revenue_kind_uid: "",
  period_rule_uid: "",
  start_dt: today(),
  registration_source_cd: "OFFICER",
  period_count: 4,
  generate_periods_bool: true,
};
const initialHold = { subject_uid: "", revenue_kind_uid: "", hold_type_cd: "COMPLIANCE", hold_reason_txt: "" };
const initialConcession = { subject_uid: "", revenue_kind_uid: "", concession_type_cd: "RELIEF", effective_from_dt: today(), concession_rule_jsn: {} };

export default function ObligationsPage() {
  const [activeTab, setActiveTab] = useState("enrol");
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [lookups, setLookups] = useState({});
  const [enrolments, setEnrolments] = useState([]);
  const [dues, setDues] = useState([]);
  const [enrolmentForm, setEnrolmentForm] = useState(initialEnrolment);
  const [holdForm, setHoldForm] = useState(initialHold);
  const [concessionForm, setConcessionForm] = useState(initialConcession);
  const [selectedSubjectObligations, setSelectedSubjectObligations] = useState(null);
  const [snapshotSubjectUid, setSnapshotSubjectUid] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const [overviewPayload, subjectsPayload, lookupPayload, enrolmentsPayload, duesPayload] = await Promise.all([
      apiRequest("/api/obligations/overview"),
      apiRequest("/api/registry/subjects?pageSize=80"),
      apiRequest("/api/configuration/lookups"),
      apiRequest("/api/obligations/enrolments?pageSize=50"),
      apiRequest("/api/obligations/dues?pageSize=80&due_state_cd=OPEN"),
    ]);

    setOverview(overviewPayload.overview);
    setSubjects(subjectsPayload.rows || []);
    setLookups(lookupPayload.lookups || {});
    setEnrolments(enrolmentsPayload.rows || []);
    setDues(duesPayload.rows || []);
  }

  useEffect(() => {
    void load().catch((loadError) => setError(loadError.message));
  }, []);

  const periodOptions = useMemo(
    () => (lookups.period_rules || []).filter((rule) => !enrolmentForm.revenue_kind_uid || rule.revenue_kind_uid === enrolmentForm.revenue_kind_uid),
    [enrolmentForm.revenue_kind_uid, lookups.period_rules]
  );

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

  async function loadSubjectObligations(subjectUid) {
    setSnapshotSubjectUid(subjectUid);
    if (!subjectUid) {
      setSelectedSubjectObligations(null);
      return;
    }
    const payload = await apiRequest(`/api/obligations/subjects/${subjectUid}`);
    setSelectedSubjectObligations(payload.obligations);
  }

  const enrolmentColumns = [
    { key: "enrolment_no", label: "Enrolment" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "revenue_kind_name", label: "Revenue kind" },
    { key: "period_rule_code", label: "Period rule" },
    { key: "open_due_count", label: "Open dues", render: (row) => formatNumber(row.open_due_count) },
    {
      key: "enrolment_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={row.enrolment_state_cd === "ACTIVE" ? "success" : "warning"}>{compactCode(row.enrolment_state_cd)}</StatusPill>,
    },
  ];

  const dueColumns = [
    { key: "due_dt", label: "Due date", render: (row) => formatDate(row.due_dt) },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "revenue_kind_name", label: "Revenue kind" },
    { key: "period_label_txt", label: "Period" },
    { key: "due_event_cd", label: "Event", render: (row) => compactCode(row.due_event_cd) },
    { key: "amount_due_amt", label: "Amount", render: (row) => formatMoney(row.amount_due_amt || 0) },
  ];

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Revenue enrolment" title="Obligations And Due Calendar" status="Operational" tone="success" />

      <div className="metric-grid">
        <MetricTile icon={ListChecks} label="Enrolments" value={formatNumber(overview?.enrolment_count)} />
        <MetricTile icon={CalendarClock} label="Period instances" value={formatNumber(overview?.period_instance_count)} />
        <MetricTile icon={CircleDollarSign} label="Open dues" value={formatNumber(overview?.open_due_count)} />
        <MetricTile icon={Hand} label="Active holds" value={formatNumber(overview?.active_hold_count)} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "enrol" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Taxpayer enrolment</span>
                <h2>Create Obligation Stream</h2>
              </div>
            </div>
            <form
              className="action-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit(
                  "/api/obligations/enrolments",
                  { ...enrolmentForm, period_rule_uid: enrolmentForm.period_rule_uid || null },
                  () => setEnrolmentForm(initialEnrolment),
                  "Revenue enrolment created"
                );
              }}
            >
              <SelectField label="Taxpayer" value={enrolmentForm.subject_uid} onChange={(value) => setEnrolmentForm({ ...enrolmentForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_uid} value={subject.subject_uid}>
                    {subject.display_name_txt}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Revenue kind" value={enrolmentForm.revenue_kind_uid} onChange={(value) => setEnrolmentForm({ ...enrolmentForm, revenue_kind_uid: value, period_rule_uid: "" })}>
                <option value="">Select revenue kind</option>
                {(lookups.revenue_kinds || []).map((kind) => (
                  <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>
                    {kind.revenue_kind_name}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Period rule" value={enrolmentForm.period_rule_uid} onChange={(value) => setEnrolmentForm({ ...enrolmentForm, period_rule_uid: value })}>
                <option value="">Use latest rule</option>
                {periodOptions.map((rule) => (
                  <option key={rule.period_rule_uid} value={rule.period_rule_uid}>
                    {rule.period_rule_code} ({compactCode(rule.frequency_cd)})
                  </option>
                ))}
              </SelectField>
              <div className="compact-form">
                <Field label="Start date">
                  <input type="date" value={enrolmentForm.start_dt} onChange={(event) => setEnrolmentForm({ ...enrolmentForm, start_dt: event.target.value })} />
                </Field>
                <Field label="Periods to generate">
                  <input type="number" min="1" max="36" value={enrolmentForm.period_count} onChange={(event) => setEnrolmentForm({ ...enrolmentForm, period_count: Number(event.target.value) })} />
                </Field>
              </div>
              <button className="primary-button" type="submit">Create enrolment</button>
            </form>
          </section>

          <section className="content-band">
            <DataTable columns={enrolmentColumns} rows={enrolments} keyField="enrolment_uid" empty="No enrolments" />
          </section>
        </div>
      ) : null}

      {activeTab === "dues" ? (
        <div className="module-workbench module-workbench--wide">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Open due instances</span>
                <h2>Filing And Payment Calendar</h2>
              </div>
              <StatusPill tone="warning">{formatNumber(dues.length)} visible</StatusPill>
            </div>
            <DataTable columns={dueColumns} rows={dues} keyField="due_instance_uid" empty="No open dues" />
          </section>
        </div>
      ) : null}

      {activeTab === "controls" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Account controls</span>
                <h2>Holds And Concessions</h2>
              </div>
            </div>
            <form
              className="action-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit("/api/obligations/holds", { ...holdForm, revenue_kind_uid: holdForm.revenue_kind_uid || null }, () => setHoldForm(initialHold), "Account hold recorded");
              }}
            >
              <SelectField label="Taxpayer" value={holdForm.subject_uid} onChange={(value) => setHoldForm({ ...holdForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_uid} value={subject.subject_uid}>
                    {subject.display_name_txt}
                  </option>
                ))}
              </SelectField>
              <Field label="Hold type">
                <input value={holdForm.hold_type_cd} onChange={(event) => setHoldForm({ ...holdForm, hold_type_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Hold reason">
                <textarea value={holdForm.hold_reason_txt} onChange={(event) => setHoldForm({ ...holdForm, hold_reason_txt: event.target.value })} />
              </Field>
              <button className="secondary-button" type="submit">Record hold</button>
            </form>
            <hr />
            <form
              className="action-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit("/api/obligations/concessions", { ...concessionForm, revenue_kind_uid: concessionForm.revenue_kind_uid || null }, () => setConcessionForm(initialConcession), "Concession recorded");
              }}
            >
              <SelectField label="Taxpayer" value={concessionForm.subject_uid} onChange={(value) => setConcessionForm({ ...concessionForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_uid} value={subject.subject_uid}>
                    {subject.display_name_txt}
                  </option>
                ))}
              </SelectField>
              <Field label="Concession type">
                <input value={concessionForm.concession_type_cd} onChange={(event) => setConcessionForm({ ...concessionForm, concession_type_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Effective from">
                <input type="date" value={concessionForm.effective_from_dt} onChange={(event) => setConcessionForm({ ...concessionForm, effective_from_dt: event.target.value })} />
              </Field>
              <button className="secondary-button" type="submit">Record concession</button>
            </form>
          </section>

          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Subject obligations</span>
                <h2>Profile Snapshot</h2>
              </div>
            </div>
            <SelectField label="Taxpayer" value={snapshotSubjectUid} onChange={(value) => loadSubjectObligations(value)}>
              <option value="">Select taxpayer</option>
              {subjects.map((subject) => (
                <option key={subject.subject_uid} value={subject.subject_uid}>
                  {subject.display_name_txt}
                </option>
              ))}
            </SelectField>
            <br />
            <ul className="mini-list">
              <li><span>Enrolments</span><small>{formatNumber(selectedSubjectObligations?.enrolments?.length)}</small></li>
              <li><span>Periods</span><small>{formatNumber(selectedSubjectObligations?.periods?.length)}</small></li>
              <li><span>Dues</span><small>{formatNumber(selectedSubjectObligations?.dues?.length)}</small></li>
              <li><span>Holds</span><small>{formatNumber(selectedSubjectObligations?.holds?.length)}</small></li>
              <li><span>Concessions</span><small>{formatNumber(selectedSubjectObligations?.concessions?.length)}</small></li>
            </ul>
          </section>
        </div>
      ) : null}
    </section>
  );
}
