import { AlertTriangle, CalendarClock, ListChecks, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../services/api.js";
import { DataTable, Field, GovernanceShell, ReasonField, SelectField, StatePill, commonColumns, compactCode, formatDate, formatMoney, futureDate, optionLabel, runMutation, today } from "./GovernanceShared.jsx";

export default function ObligationGovernancePanel() {
  const [subjects, setSubjects] = useState([]);
  const [lookups, setLookups] = useState({});
  const [enrolments, setEnrolments] = useState([]);
  const [dues, setDues] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [subjectUid, setSubjectUid] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [edit, setEdit] = useState({ enrolment_uid: "", start_dt: "", end_dt: "", registration_source_cd: "", reason_txt: "" });
  const [stateForm, setStateForm] = useState({ enrolment_uid: "", enrolment_state_cd: "ENDED", end_dt: today(), reason_txt: "" });
  const [regen, setRegen] = useState({ enrolment_uid: "", from_start_dt: today(), period_count: 4, initial_amount_due_amt: "", supersede_existing_bool: true, reason_txt: "" });
  const [period, setPeriod] = useState({ period_instance_uid: "", period_label_txt: "", period_start_dt: "", period_end_dt: "", filing_state_cd: "", payment_state_cd: "", reason_txt: "" });
  const [due, setDue] = useState({ due_instance_uid: "", due_dt: "", due_state_cd: "", amount_due_amt: "", reason_txt: "" });
  const [holiday, setHoliday] = useState({ subject_uid: "", revenue_kind_uid: "", holiday_type_cd: "FILING_HOLIDAY", start_dt: today(), end_dt: futureDate(7), condition_txt: "", reason_txt: "" });
  const [holidayState, setHolidayState] = useState({ holiday_window_uid: "", holiday_state_cd: "REVOKED", reason_txt: "" });
  const [concession, setConcession] = useState({ concession_uid: "", concession_state_cd: "APPROVED", effective_to_dt: "", reason_txt: "" });

  const periods = snapshot?.periods || [];
  const concessions = snapshot?.concessions || [];
  const selectedEnrolmentUid = edit.enrolment_uid || stateForm.enrolment_uid || regen.enrolment_uid;

  async function load() {
    setLoading(true);
    const [subjectPayload, lookupPayload, enrolmentPayload, duePayload, holidayPayload] = await Promise.all([
      apiRequest("/api/registry/subjects?pageSize=160"),
      apiRequest("/api/configuration/lookups"),
      apiRequest("/api/obligations/enrolments?pageSize=140"),
      apiRequest("/api/obligations/dues?pageSize=160"),
      apiRequest("/api/obligations/holiday-windows?pageSize=120"),
    ]);
    setSubjects(subjectPayload.rows || []);
    setLookups(lookupPayload.lookups || {});
    setEnrolments(enrolmentPayload.rows || []);
    setDues(duePayload.rows || []);
    setHolidays(holidayPayload.rows || []);
    setLoading(false);
  }

  async function loadSubject(nextUid) {
    setSubjectUid(nextUid);
    if (!nextUid) return setSnapshot(null);
    const payload = await apiRequest(`/api/obligations/subjects/${nextUid}`);
    setSnapshot(payload.obligations || null);
  }

  useEffect(() => {
    void load().catch((loadError) => { setError(loadError.message); setLoading(false); });
  }, []);

  async function mutate(endpoint, method, body, message) {
    await runMutation({ endpoint, method, body, setError, setSuccess, setSaving, successMessage: message, reload: async () => { await load(); if (subjectUid) await loadSubject(subjectUid); } });
  }

  function syncEnrolment(uid) {
    const row = enrolments.find((item) => item.enrolment_uid === uid);
    setEdit({ enrolment_uid: uid, start_dt: row?.start_dt?.slice(0, 10) || "", end_dt: row?.end_dt?.slice(0, 10) || "", registration_source_cd: row?.registration_source_cd || "", reason_txt: "" });
    setStateForm({ enrolment_uid: uid, enrolment_state_cd: row?.enrolment_state_cd === "ACTIVE" ? "ENDED" : "ACTIVE", end_dt: row?.end_dt?.slice(0, 10) || today(), reason_txt: "" });
    setRegen({ enrolment_uid: uid, from_start_dt: today(), period_count: 4, initial_amount_due_amt: "", supersede_existing_bool: true, reason_txt: "" });
  }

  function syncPeriod(uid) {
    const row = periods.find((item) => item.period_instance_uid === uid);
    setPeriod({ period_instance_uid: uid, period_label_txt: row?.period_label_txt || "", period_start_dt: row?.period_start_dt?.slice(0, 10) || "", period_end_dt: row?.period_end_dt?.slice(0, 10) || "", filing_state_cd: row?.filing_state_cd || "", payment_state_cd: row?.payment_state_cd || "", reason_txt: "" });
  }

  function syncDue(uid) {
    const row = dues.find((item) => item.due_instance_uid === uid) || snapshot?.dues?.find((item) => item.due_instance_uid === uid);
    setDue({ due_instance_uid: uid, due_dt: row?.due_dt?.slice(0, 10) || "", due_state_cd: row?.due_state_cd || "", amount_due_amt: row?.amount_due_amt ?? "", reason_txt: "" });
  }

  const enrolmentColumns = [
    { key: "taxpayer", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "revenue", label: "Revenue", render: (row) => row.revenue_kind_name || "-" },
    { key: "state", label: "State", render: (row) => <StatePill value={row.enrolment_state_cd} /> },
    { key: "dates", label: "Dates", render: (row) => `${formatDate(row.start_dt)} to ${row.end_dt ? formatDate(row.end_dt) : "current"}` },
  ];
  const dueColumns = [
    { key: "taxpayer", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "period", label: "Period", render: (row) => row.period_label_txt || "-" },
    commonColumns.date("due_dt", "Due"),
    commonColumns.money("amount_due_amt", "Amount"),
    commonColumns.state("due_state_cd", "State"),
  ];
  const periodColumns = [
    { key: "period_label_txt", label: "Period" },
    { key: "range", label: "Range", render: (row) => `${formatDate(row.period_start_dt)} to ${formatDate(row.period_end_dt)}` },
    { key: "filing", label: "Filing", render: (row) => compactCode(row.filing_state_cd) },
    { key: "payment", label: "Payment", render: (row) => compactCode(row.payment_state_cd) },
  ];
  const holidayColumns = [
    { key: "scope", label: "Scope", render: (row) => row.display_name_txt || row.revenue_kind_name || "General" },
    { key: "holiday_type_cd", label: "Type", render: (row) => compactCode(row.holiday_type_cd) },
    { key: "window", label: "Window", render: (row) => `${formatDate(row.start_dt)} to ${formatDate(row.end_dt)}` },
    commonColumns.state("holiday_state_cd", "State"),
  ];

  return (
    <GovernanceShell error={error} success={success}>
      <section className="content-band">
        <div className="section-heading"><div><span>Enrolments</span><h2>Edit, End Or Cancel</h2></div><CalendarClock size={22} /></div>
        <DataTable columns={enrolmentColumns} rows={enrolments} keyField="enrolment_uid" onRowClick={(row) => syncEnrolment(row.enrolment_uid)} selectedKey={selectedEnrolmentUid} empty={loading ? "Loading enrolments" : "No enrolments available"} />
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/obligations/enrolments/${edit.enrolment_uid}`, "PATCH", edit, "Enrolment details corrected."); }}>
          <SelectField label="Enrolment" required value={edit.enrolment_uid} onChange={syncEnrolment}>
            <option value="">Select enrolment</option>
            {enrolments.map((item) => <option key={item.enrolment_uid} value={item.enrolment_uid}>{optionLabel(item.display_name_txt, item.revenue_kind_name, compactCode(item.enrolment_state_cd))}</option>)}
          </SelectField>
          <div className="compact-form"><Field label="Start date"><input type="date" value={edit.start_dt} onChange={(event) => setEdit({ ...edit, start_dt: event.target.value })} /></Field><Field label="End date"><input type="date" value={edit.end_dt} onChange={(event) => setEdit({ ...edit, end_dt: event.target.value })} /></Field></div>
          <Field label="Registration source"><input value={edit.registration_source_cd} onChange={(event) => setEdit({ ...edit, registration_source_cd: event.target.value.toUpperCase() })} /></Field>
          <ReasonField value={edit.reason_txt} onChange={(value) => setEdit({ ...edit, reason_txt: value })} />
          <button className="secondary-button" type="submit" disabled={saving || !edit.enrolment_uid}>Save correction</button>
        </form>
      </section>

      <section className="content-band">
        <div className="section-heading"><div><span>Lifecycle</span><h2>State And Regeneration</h2></div><RotateCcw size={22} /></div>
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/obligations/enrolments/${stateForm.enrolment_uid}/state`, "PATCH", stateForm, "Enrolment state updated."); }}>
          <SelectField label="Enrolment" required value={stateForm.enrolment_uid} onChange={syncEnrolment}>
            <option value="">Select enrolment</option>
            {enrolments.map((item) => <option key={item.enrolment_uid} value={item.enrolment_uid}>{optionLabel(item.display_name_txt, item.revenue_kind_name)}</option>)}
          </SelectField>
          <div className="compact-form"><SelectField label="New state" value={stateForm.enrolment_state_cd} onChange={(value) => setStateForm({ ...stateForm, enrolment_state_cd: value })}><option value="ACTIVE">Active</option><option value="PENDING">Pending</option><option value="SUSPENDED">Suspended</option><option value="ENDED">Ended</option><option value="CANCELLED">Cancelled</option></SelectField><Field label="End date"><input type="date" value={stateForm.end_dt} onChange={(event) => setStateForm({ ...stateForm, end_dt: event.target.value })} /></Field></div>
          <ReasonField value={stateForm.reason_txt} onChange={(value) => setStateForm({ ...stateForm, reason_txt: value })} />
          <button className="danger-button" type="submit" disabled={saving || !stateForm.enrolment_uid}>Apply state change</button>
        </form>
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/obligations/enrolments/${regen.enrolment_uid}/regenerate-periods`, "POST", regen, "Obligation periods regenerated."); }}>
          <div className="compact-form"><Field label="From date"><input type="date" value={regen.from_start_dt} onChange={(event) => setRegen({ ...regen, from_start_dt: event.target.value })} /></Field><Field label="Periods"><input type="number" min="1" max="36" value={regen.period_count} onChange={(event) => setRegen({ ...regen, period_count: event.target.value })} /></Field><Field label="Initial amount"><input type="number" step="0.01" value={regen.initial_amount_due_amt} onChange={(event) => setRegen({ ...regen, initial_amount_due_amt: event.target.value })} /></Field></div>
          <Field label="Supersede existing periods"><input type="checkbox" checked={regen.supersede_existing_bool} onChange={(event) => setRegen({ ...regen, supersede_existing_bool: event.target.checked })} /></Field>
          <ReasonField value={regen.reason_txt} onChange={(value) => setRegen({ ...regen, reason_txt: value })} />
          <button className="primary-button" type="submit" disabled={saving || !regen.enrolment_uid}>Regenerate periods</button>
        </form>
      </section>

      <section className="content-band">
        <div className="section-heading"><div><span>Period and due records</span><h2>Manual Corrections</h2></div><ListChecks size={22} /></div>
        <SelectField label="Taxpayer context" value={subjectUid} onChange={(value) => void loadSubject(value)}>
          <option value="">Select taxpayer for periods and concessions</option>
          {subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>)}
        </SelectField>
        <DataTable columns={periodColumns} rows={periods} keyField="period_instance_uid" onRowClick={(row) => syncPeriod(row.period_instance_uid)} selectedKey={period.period_instance_uid} empty="Select a taxpayer to view period instances" />
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/obligations/periods/${period.period_instance_uid}`, "PATCH", period, "Period instance corrected."); }}>
          <div className="compact-form"><Field label="Label"><input value={period.period_label_txt} onChange={(event) => setPeriod({ ...period, period_label_txt: event.target.value })} /></Field><Field label="Start"><input type="date" value={period.period_start_dt} onChange={(event) => setPeriod({ ...period, period_start_dt: event.target.value })} /></Field><Field label="End"><input type="date" value={period.period_end_dt} onChange={(event) => setPeriod({ ...period, period_end_dt: event.target.value })} /></Field></div>
          <div className="compact-form"><Field label="Filing state"><input value={period.filing_state_cd} onChange={(event) => setPeriod({ ...period, filing_state_cd: event.target.value.toUpperCase() })} /></Field><Field label="Payment state"><input value={period.payment_state_cd} onChange={(event) => setPeriod({ ...period, payment_state_cd: event.target.value.toUpperCase() })} /></Field></div>
          <ReasonField value={period.reason_txt} onChange={(value) => setPeriod({ ...period, reason_txt: value })} />
          <button className="secondary-button" type="submit" disabled={saving || !period.period_instance_uid}>Correct period</button>
        </form>
        <DataTable columns={dueColumns} rows={dues} keyField="due_instance_uid" onRowClick={(row) => syncDue(row.due_instance_uid)} selectedKey={due.due_instance_uid} empty="No due instances available" />
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/obligations/dues/${due.due_instance_uid}`, "PATCH", due, "Due instance corrected."); }}>
          <div className="compact-form"><Field label="Due date"><input type="date" value={due.due_dt} onChange={(event) => setDue({ ...due, due_dt: event.target.value })} /></Field><SelectField label="State" value={due.due_state_cd} onChange={(value) => setDue({ ...due, due_state_cd: value })}><option value="">Keep current</option><option value="OPEN">Open</option><option value="NOTIFIED">Notified</option><option value="FILED">Filed</option><option value="ASSESSED">Assessed</option><option value="PAID">Paid</option><option value="OVERDUE">Overdue</option><option value="CANCELLED">Cancelled</option></SelectField><Field label="Amount"><input type="number" step="0.01" value={due.amount_due_amt} onChange={(event) => setDue({ ...due, amount_due_amt: event.target.value })} /></Field></div>
          <ReasonField value={due.reason_txt} onChange={(value) => setDue({ ...due, reason_txt: value })} />
          <button className="secondary-button" type="submit" disabled={saving || !due.due_instance_uid}>Correct due</button>
        </form>
      </section>

      <section className="content-band">
        <div className="section-heading"><div><span>Relief governance</span><h2>Holidays And Concessions</h2></div><AlertTriangle size={22} /></div>
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); void mutate("/api/obligations/holiday-windows", "POST", holiday, "Holiday window recorded."); }}>
          <SelectField label="Taxpayer scope" value={holiday.subject_uid} onChange={(value) => setHoliday({ ...holiday, subject_uid: value })}><option value="">General or revenue-wide</option>{subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>)}</SelectField>
          <SelectField label="Revenue type" value={holiday.revenue_kind_uid} onChange={(value) => setHoliday({ ...holiday, revenue_kind_uid: value })}><option value="">All revenue types</option>{(lookups.revenue_kinds || []).map((kind) => <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>{kind.revenue_kind_name}</option>)}</SelectField>
          <div className="compact-form"><Field label="Type"><input value={holiday.holiday_type_cd} onChange={(event) => setHoliday({ ...holiday, holiday_type_cd: event.target.value.toUpperCase() })} /></Field><Field label="Start"><input type="date" value={holiday.start_dt} onChange={(event) => setHoliday({ ...holiday, start_dt: event.target.value })} /></Field><Field label="End"><input type="date" value={holiday.end_dt} onChange={(event) => setHoliday({ ...holiday, end_dt: event.target.value })} /></Field></div>
          <Field label="Conditions"><textarea value={holiday.condition_txt} onChange={(event) => setHoliday({ ...holiday, condition_txt: event.target.value })} /></Field>
          <Field label="Reason"><textarea value={holiday.reason_txt} onChange={(event) => setHoliday({ ...holiday, reason_txt: event.target.value })} /></Field>
          <button className="secondary-button" type="submit" disabled={saving}>Record holiday window</button>
        </form>
        <DataTable columns={holidayColumns} rows={holidays} keyField="holiday_window_uid" onRowClick={(row) => setHolidayState({ holiday_window_uid: row.holiday_window_uid, holiday_state_cd: row.holiday_state_cd === "ACTIVE" ? "REVOKED" : "ACTIVE", reason_txt: "" })} selectedKey={holidayState.holiday_window_uid} empty="No holiday windows" />
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/obligations/holiday-windows/${holidayState.holiday_window_uid}`, "PATCH", holidayState, "Holiday window state updated."); }}>
          <SelectField label="Holiday state" value={holidayState.holiday_state_cd} onChange={(value) => setHolidayState({ ...holidayState, holiday_state_cd: value })}><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="REVOKED">Revoked</option><option value="EXPIRED">Expired</option></SelectField>
          <ReasonField value={holidayState.reason_txt} onChange={(value) => setHolidayState({ ...holidayState, reason_txt: value })} />
          <button className="danger-button" type="submit" disabled={saving || !holidayState.holiday_window_uid}>Update holiday state</button>
        </form>
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/obligations/concessions/${concession.concession_uid}/state`, "PATCH", concession, "Concession state updated."); }}>
          <SelectField label="Concession" required value={concession.concession_uid} onChange={(value) => setConcession({ ...concession, concession_uid: value })}><option value="">Select concession from taxpayer context</option>{concessions.map((item) => <option key={item.concession_uid} value={item.concession_uid}>{optionLabel(compactCode(item.concession_type_cd), compactCode(item.concession_state_cd), formatDate(item.effective_from_dt))}</option>)}</SelectField>
          <div className="compact-form"><SelectField label="State" value={concession.concession_state_cd} onChange={(value) => setConcession({ ...concession, concession_state_cd: value })}><option value="APPROVED">Approved</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="REVOKED">Revoked</option><option value="EXPIRED">Expired</option><option value="CANCELLED">Cancelled</option></SelectField><Field label="Effective to"><input type="date" value={concession.effective_to_dt} onChange={(event) => setConcession({ ...concession, effective_to_dt: event.target.value })} /></Field></div>
          <ReasonField value={concession.reason_txt} onChange={(value) => setConcession({ ...concession, reason_txt: value })} />
          <button className="secondary-button" type="submit" disabled={saving || !concession.concession_uid}>Update concession</button>
        </form>
      </section>
    </GovernanceShell>
  );
}
