import { BriefcaseBusiness, CalendarClock, FileQuestion, LockKeyhole, MessageSquare, Monitor, ShieldCheck, Star } from "lucide-react";
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
import { compactCode, formatDateTime, formatNumber } from "../utils/format.js";

const tabs = [
  { id: "authorities", label: "Agent Authority" },
  { id: "accounts", label: "Accounts" },
  { id: "requests", label: "Requests" },
  { id: "appointments", label: "Appointments" },
  { id: "feedback", label: "Feedback" },
];

function futureLocalInput(days, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString().slice(0, 16);
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function statusTone(value) {
  const status = String(value || "");
  if (["ACTIVE", "APPROVED", "BOOKED", "CLOSED", "RESOLVED", "RECEIVED"].includes(status)) return "success";
  if (["OPEN", "AVAILABLE", "PENDING", "REQUESTED", "TRIAGED", "IN_PROGRESS"].includes(status)) return "warning";
  if (["SUSPENDED", "CANCELLED", "ESCALATED", "LOCKED", "REVOKED", "EXPIRED", "DISMISSED"].includes(status)) return "danger";
  return "neutral";
}

async function safeRequest(path, fallback) {
  try {
    return await apiRequest(path);
  } catch {
    return fallback;
  }
}

const initialAccount = { subject_uid: "", portal_username_txt: "", email_txt: "", account_state_cd: "ACTIVE", mfa_enabled_bool: true };
const initialRequest = { subject_uid: "", request_type_cd: "GENERAL_ENQUIRY", channel_cd: "PORTAL", due_ts: futureLocalInput(7), summary_txt: "" };
const initialInteraction = { subject_uid: "", service_request_uid: "", interaction_type_cd: "NOTE", channel_cd: "PORTAL", summary_txt: "" };
const initialAppointment = { subject_uid: "", service_site_uid: "", appointment_type_cd: "SERVICE_COUNTER", start_ts: futureLocalInput(3, 9), end_ts: futureLocalInput(3, 10), appointment_state_cd: "BOOKED" };
const initialFeedback = { subject_uid: "", service_request_uid: "", feedback_type_cd: "SERVICE", rating_no: 5, feedback_txt: "" };
const initialAuthority = { principal_subject_uid: "", agent_subject_uid: "", authority_type_cd: "REPRESENTATIVE", revenue_kind_uid: "", effective_from_dt: todayDate(), effective_to_dt: "", scope_note_txt: "", reason_txt: "" };
const initialAuthorityAction = { agent_authority_uid: "", authority_type_cd: "", revenue_kind_uid: "", effective_from_dt: "", effective_to_dt: "", scope_note_txt: "", reason_txt: "" };
const initialAccountGovernance = { portal_account_uid: "", email_txt: "", account_state_cd: "ACTIVE", mfa_enabled_bool: true, reason_txt: "", temporary_password: "" };
const initialRequestGovernance = { service_request_uid: "", request_state_cd: "OPEN", due_ts: "", assigned_actor_uid: "", assigned_unit_uid: "", priority_cd: "NORMAL", response_summary_txt: "", reason_txt: "" };
const initialAppointmentGovernance = { appointment_slot_uid: "", service_site_uid: "", appointment_type_cd: "", start_ts: "", end_ts: "", appointment_state_cd: "BOOKED", appointment_reason_txt: "", reason_txt: "" };
const initialFeedbackGovernance = { feedback_uid: "", feedback_state_cd: "RECEIVED", triage_state_cd: "RECEIVED", assigned_actor_uid: "", triage_notes_txt: "", reason_txt: "" };

export default function PortalServicesPage() {
  const [activeTab, setActiveTab] = useState("authorities");
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [serviceSites, setServiceSites] = useState([]);
  const [staff, setStaff] = useState([]);
  const [agencyUnits, setAgencyUnits] = useState([]);
  const [revenueKinds, setRevenueKinds] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [agentAuthorities, setAgentAuthorities] = useState([]);
  const [accountForm, setAccountForm] = useState(initialAccount);
  const [requestForm, setRequestForm] = useState(initialRequest);
  const [interactionForm, setInteractionForm] = useState(initialInteraction);
  const [appointmentForm, setAppointmentForm] = useState(initialAppointment);
  const [feedbackForm, setFeedbackForm] = useState(initialFeedback);
  const [authorityForm, setAuthorityForm] = useState(initialAuthority);
  const [authorityActionForm, setAuthorityActionForm] = useState(initialAuthorityAction);
  const [accountGovernanceForm, setAccountGovernanceForm] = useState(initialAccountGovernance);
  const [requestGovernanceForm, setRequestGovernanceForm] = useState(initialRequestGovernance);
  const [appointmentGovernanceForm, setAppointmentGovernanceForm] = useState(initialAppointmentGovernance);
  const [feedbackGovernanceForm, setFeedbackGovernanceForm] = useState(initialFeedbackGovernance);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const [overviewPayload, subjectsPayload, sitesPayload, staffPayload, unitsPayload, configPayload, accountPayload, requestPayload, interactionPayload, appointmentPayload, feedbackPayload, authorityPayload] = await Promise.all([
      apiRequest("/api/portal/overview"),
      apiRequest("/api/registry/subjects?pageSize=150"),
      apiRequest("/api/admin/service-sites"),
      safeRequest("/api/admin/staff?pageSize=150", { rows: [] }),
      safeRequest("/api/admin/agency-units", { agency_units: [] }),
      safeRequest("/api/configuration/lookups", { lookups: { revenue_kinds: [] } }),
      apiRequest("/api/portal/accounts?pageSize=120"),
      apiRequest("/api/portal/service-requests?pageSize=120"),
      apiRequest("/api/portal/interactions?pageSize=120"),
      apiRequest("/api/portal/appointments?pageSize=120"),
      apiRequest("/api/portal/feedback?pageSize=120"),
      safeRequest("/api/portal/agent-authorities?pageSize=120", { rows: [] }),
    ]);
    setOverview(overviewPayload.overview);
    setSubjects(subjectsPayload.rows || []);
    setServiceSites(sitesPayload.service_sites || []);
    setStaff(staffPayload.rows || []);
    setAgencyUnits(unitsPayload.agency_units || []);
    setRevenueKinds(configPayload.lookups?.revenue_kinds || []);
    setAccounts(accountPayload.rows || []);
    setRequests(requestPayload.rows || []);
    setInteractions(interactionPayload.rows || []);
    setAppointments(appointmentPayload.rows || []);
    setFeedback(feedbackPayload.rows || []);
    setAgentAuthorities(authorityPayload.rows || []);
  }

  useEffect(() => {
    void load().catch((loadError) => setError(loadError.message));
  }, []);

  async function submit(endpoint, body, reset, message, method = "POST") {
    setError("");
    setSuccess("");
    try {
      await apiRequest(endpoint, { method, body });
      reset?.();
      await load();
      setSuccess(message);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  function selectAuthority(authority) {
    setAuthorityActionForm({
      agent_authority_uid: authority.agent_authority_uid,
      authority_type_cd: authority.authority_type_cd || "REPRESENTATIVE",
      revenue_kind_uid: authority.revenue_kind_uid || "",
      effective_from_dt: authority.effective_from_dt ? String(authority.effective_from_dt).slice(0, 10) : "",
      effective_to_dt: authority.effective_to_dt ? String(authority.effective_to_dt).slice(0, 10) : "",
      scope_note_txt: authority.authority_scope_jsn?.scope_note_txt || "",
      reason_txt: "",
    });
  }

  function selectAccount(account) {
    setAccountGovernanceForm({ portal_account_uid: account.portal_account_uid, email_txt: account.email_txt || "", account_state_cd: account.account_state_cd || "ACTIVE", mfa_enabled_bool: Boolean(account.mfa_enabled_bool), reason_txt: "", temporary_password: "" });
  }

  function selectRequest(request) {
    setRequestGovernanceForm({ service_request_uid: request.service_request_uid, request_state_cd: request.request_state_cd || "OPEN", due_ts: request.due_ts ? new Date(request.due_ts).toISOString().slice(0, 16) : "", assigned_actor_uid: request.assigned_actor_uid || "", assigned_unit_uid: request.assigned_unit_uid || "", priority_cd: request.priority_cd || "NORMAL", response_summary_txt: request.response_summary_txt || "", reason_txt: "" });
  }

  function selectAppointment(appointment) {
    setAppointmentGovernanceForm({ appointment_slot_uid: appointment.appointment_slot_uid, service_site_uid: appointment.service_site_uid || "", appointment_type_cd: appointment.appointment_type_cd || "SERVICE_COUNTER", start_ts: appointment.start_ts ? new Date(appointment.start_ts).toISOString().slice(0, 16) : "", end_ts: appointment.end_ts ? new Date(appointment.end_ts).toISOString().slice(0, 16) : "", appointment_state_cd: appointment.appointment_state_cd || "BOOKED", appointment_reason_txt: appointment.appointment_reason_txt || "", reason_txt: "" });
  }

  function selectFeedback(item) {
    setFeedbackGovernanceForm({ feedback_uid: item.feedback_uid, feedback_state_cd: item.feedback_state_cd || "RECEIVED", triage_state_cd: item.triage_state_cd || item.feedback_state_cd || "RECEIVED", assigned_actor_uid: item.assigned_actor_uid || "", triage_notes_txt: item.triage_notes_txt || "", reason_txt: "" });
  }

  const accountColumns = [
    { key: "portal_username_txt", label: "Portal username" },
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "email_txt", label: "Email", render: (row) => row.email_txt || "-" },
    { key: "mfa_enabled_bool", label: "MFA", render: (row) => <StatusPill tone={row.mfa_enabled_bool ? "success" : "warning"}>{row.mfa_enabled_bool ? "Enabled" : "Not enabled"}</StatusPill> },
    { key: "account_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.account_state_cd)}>{compactCode(row.account_state_cd)}</StatusPill> },
  ];
  const authorityColumns = [
    { key: "principal_display_name_txt", label: "Taxpayer", render: (row) => row.principal_display_name_txt || row.principal_subject_no || "-" },
    { key: "agent_display_name_txt", label: "Agent", render: (row) => row.agent_display_name_txt || row.agent_subject_no || "-" },
    { key: "authority_type_cd", label: "Authority", render: (row) => compactCode(row.authority_type_cd) },
    { key: "revenue_kind_name", label: "Revenue", render: (row) => row.revenue_kind_name || "All revenue types" },
    { key: "authority_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.authority_state_cd)}>{compactCode(row.authority_state_cd)}</StatusPill> },
  ];
  const requestColumns = [
    { key: "service_request_no", label: "Request" },
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "request_type_cd", label: "Type", render: (row) => compactCode(row.request_type_cd) },
    { key: "request_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.request_state_cd)}>{compactCode(row.request_state_cd)}</StatusPill> },
    { key: "due_ts", label: "Due", render: (row) => formatDateTime(row.due_ts) },
  ];
  const interactionColumns = [
    { key: "service_request_no", label: "Request", render: (row) => row.service_request_no || "-" },
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "interaction_type_cd", label: "Type", render: (row) => compactCode(row.interaction_type_cd) },
    { key: "interaction_ts", label: "Time", render: (row) => formatDateTime(row.interaction_ts) },
    { key: "summary_txt", label: "Summary", render: (row) => row.summary_txt || "-" },
  ];
  const appointmentColumns = [
    { key: "appointment_type_cd", label: "Type", render: (row) => compactCode(row.appointment_type_cd) },
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "site_name", label: "Site", render: (row) => row.site_name || "-" },
    { key: "start_ts", label: "Start", render: (row) => formatDateTime(row.start_ts) },
    { key: "appointment_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.appointment_state_cd)}>{compactCode(row.appointment_state_cd)}</StatusPill> },
  ];
  const feedbackColumns = [
    { key: "feedback_type_cd", label: "Type", render: (row) => compactCode(row.feedback_type_cd) },
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "rating_no", label: "Rating", render: (row) => formatNumber(row.rating_no) },
    { key: "feedback_txt", label: "Feedback", render: (row) => row.feedback_txt || "-" },
    { key: "feedback_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.triage_state_cd || row.feedback_state_cd)}>{compactCode(row.triage_state_cd || row.feedback_state_cd)}</StatusPill> },
  ];

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Digital services and portal" title="Portal Governance And Self-Service" status="Citizen service" tone="success" />

      <div className="metric-grid">
        <MetricTile icon={Monitor} label="Portal accounts" value={formatNumber(overview?.portal_account_count)} />
        <MetricTile icon={MessageSquare} label="Open requests" value={formatNumber(overview?.open_service_request_count)} />
        <MetricTile icon={CalendarClock} label="Appointments" value={formatNumber(overview?.appointment_count)} />
        <MetricTile icon={Star} label="Average rating" value={formatNumber(overview?.average_feedback_rating)} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "authorities" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading"><div><span>Authority request</span><h2>Create Scoped Agent Authority</h2></div><BriefcaseBusiness size={21} /></div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/portal/agent-authorities", {
                principal_subject_uid: authorityForm.principal_subject_uid,
                agent_subject_uid: authorityForm.agent_subject_uid,
                authority_type_cd: authorityForm.authority_type_cd,
                revenue_kind_uid: authorityForm.revenue_kind_uid || null,
                effective_from_dt: authorityForm.effective_from_dt || null,
                effective_to_dt: authorityForm.effective_to_dt || null,
                authority_state_cd: "PENDING",
                authority_scope_jsn: { scope_note_txt: authorityForm.scope_note_txt || null },
                reason_txt: authorityForm.reason_txt || "Agent authority created for controlled review.",
              }, () => setAuthorityForm(initialAuthority), "Agent authority created for review.");
            }}>
              <SelectField label="Taxpayer" value={authorityForm.principal_subject_uid} onChange={(value) => setAuthorityForm({ ...authorityForm, principal_subject_uid: value })} required>
                <option value="">Select taxpayer</option>{subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt} ({subject.subject_no})</option>)}
              </SelectField>
              <SelectField label="Agent" value={authorityForm.agent_subject_uid} onChange={(value) => setAuthorityForm({ ...authorityForm, agent_subject_uid: value })} required>
                <option value="">Select agent</option>{subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt} ({subject.subject_no})</option>)}
              </SelectField>
              <div className="compact-form full-span">
                <Field label="Authority type"><input value={authorityForm.authority_type_cd} onChange={(event) => setAuthorityForm({ ...authorityForm, authority_type_cd: event.target.value.toUpperCase() })} /></Field>
                <SelectField label="Revenue scope" value={authorityForm.revenue_kind_uid} onChange={(value) => setAuthorityForm({ ...authorityForm, revenue_kind_uid: value })}><option value="">All revenue types</option>{revenueKinds.map((kind) => <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>{kind.revenue_kind_name}</option>)}</SelectField>
                <Field label="Effective from"><input type="date" value={authorityForm.effective_from_dt} onChange={(event) => setAuthorityForm({ ...authorityForm, effective_from_dt: event.target.value })} /></Field>
                <Field label="Effective to"><input type="date" value={authorityForm.effective_to_dt} onChange={(event) => setAuthorityForm({ ...authorityForm, effective_to_dt: event.target.value })} /></Field>
              </div>
              <Field label="Scope notes"><textarea value={authorityForm.scope_note_txt} onChange={(event) => setAuthorityForm({ ...authorityForm, scope_note_txt: event.target.value })} /></Field>
              <Field label="Creation reason"><textarea required value={authorityForm.reason_txt} onChange={(event) => setAuthorityForm({ ...authorityForm, reason_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Create authority</button>
            </form>
          </section>
          <section className="content-band">
            <div className="section-heading"><div><span>Authority lifecycle</span><h2>Approve, Revoke Or Expire</h2></div><ShieldCheck size={21} /></div>
            <DataTable columns={authorityColumns} rows={agentAuthorities} keyField="agent_authority_uid" selectedKey={authorityActionForm.agent_authority_uid} onRowClick={selectAuthority} empty="No agent authorities" />
            <form className="stacked-form" onSubmit={(event) => {
              event.preventDefault();
              if (!authorityActionForm.agent_authority_uid) return setError("Select an agent authority before saving changes.");
              void submit(`/api/portal/agent-authorities/${authorityActionForm.agent_authority_uid}`, {
                authority_type_cd: authorityActionForm.authority_type_cd,
                revenue_kind_uid: authorityActionForm.revenue_kind_uid || null,
                effective_from_dt: authorityActionForm.effective_from_dt || null,
                effective_to_dt: authorityActionForm.effective_to_dt || null,
                authority_scope_jsn: { scope_note_txt: authorityActionForm.scope_note_txt || null },
                reason_txt: authorityActionForm.reason_txt,
              }, null, "Agent authority updated.", "PATCH");
            }}>
              <div className="compact-form">
                <Field label="Authority type"><input value={authorityActionForm.authority_type_cd} onChange={(event) => setAuthorityActionForm({ ...authorityActionForm, authority_type_cd: event.target.value.toUpperCase() })} /></Field>
                <SelectField label="Revenue scope" value={authorityActionForm.revenue_kind_uid} onChange={(value) => setAuthorityActionForm({ ...authorityActionForm, revenue_kind_uid: value })}><option value="">All revenue types</option>{revenueKinds.map((kind) => <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>{kind.revenue_kind_name}</option>)}</SelectField>
              </div>
              <Field label="Lifecycle reason"><textarea required value={authorityActionForm.reason_txt} onChange={(event) => setAuthorityActionForm({ ...authorityActionForm, reason_txt: event.target.value })} /></Field>
              <div className="button-row">
                <button className="secondary-button" type="submit">Save scope</button>
                <button className="primary-button" type="button" onClick={() => authorityActionForm.agent_authority_uid && submit(`/api/portal/agent-authorities/${authorityActionForm.agent_authority_uid}/approve`, { ...authorityActionForm, reason_txt: authorityActionForm.reason_txt }, null, "Agent authority approved.")}>Approve</button>
                <button className="secondary-button" type="button" onClick={() => authorityActionForm.agent_authority_uid && submit(`/api/portal/agent-authorities/${authorityActionForm.agent_authority_uid}/expire`, { ...authorityActionForm, reason_txt: authorityActionForm.reason_txt }, null, "Agent authority expired.")}>Expire</button>
                <button className="secondary-button" type="button" onClick={() => authorityActionForm.agent_authority_uid && submit(`/api/portal/agent-authorities/${authorityActionForm.agent_authority_uid}/revoke`, { ...authorityActionForm, reason_txt: authorityActionForm.reason_txt }, null, "Agent authority revoked.")}>Revoke</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {activeTab === "accounts" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading"><div><span>Account setup</span><h2>Create Portal Account</h2></div><Monitor size={21} /></div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/portal/accounts", { ...accountForm, subject_uid: accountForm.subject_uid || null, email_txt: accountForm.email_txt || null }, () => setAccountForm(initialAccount), "Portal account created");
            }}>
              <SelectField label="Taxpayer" value={accountForm.subject_uid} onChange={(value) => setAccountForm({ ...accountForm, subject_uid: value })}>
                <option value="">No taxpayer linked</option>{subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>)}
              </SelectField>
              <Field label="Portal username"><input value={accountForm.portal_username_txt} onChange={(event) => setAccountForm({ ...accountForm, portal_username_txt: event.target.value })} /></Field>
              <Field label="Email"><input type="email" value={accountForm.email_txt} onChange={(event) => setAccountForm({ ...accountForm, email_txt: event.target.value })} /></Field>
              <label className="check-row"><span>MFA enabled</span><input type="checkbox" checked={accountForm.mfa_enabled_bool} onChange={(event) => setAccountForm({ ...accountForm, mfa_enabled_bool: event.target.checked })} /></label>
              <button className="primary-button" type="submit">Create account</button>
            </form>
          </section>
          <section className="content-band">
            <div className="section-heading"><div><span>Security administration</span><h2>Lock, Unlock, Reset Or Manage MFA</h2></div><LockKeyhole size={21} /></div>
            <DataTable columns={accountColumns} rows={accounts} keyField="portal_account_uid" selectedKey={accountGovernanceForm.portal_account_uid} onRowClick={selectAccount} empty="No portal accounts" />
            <form className="stacked-form" onSubmit={(event) => {
              event.preventDefault();
              if (!accountGovernanceForm.portal_account_uid) return setError("Select a portal account before saving changes.");
              void submit(`/api/portal/accounts/${accountGovernanceForm.portal_account_uid}`, {
                email_txt: accountGovernanceForm.email_txt || null,
                account_state_cd: accountGovernanceForm.account_state_cd,
                mfa_enabled_bool: accountGovernanceForm.mfa_enabled_bool,
                reason_txt: accountGovernanceForm.reason_txt,
              }, null, "Portal account updated.", "PATCH");
            }}>
              <div className="compact-form">
                <Field label="Email"><input type="email" value={accountGovernanceForm.email_txt} onChange={(event) => setAccountGovernanceForm({ ...accountGovernanceForm, email_txt: event.target.value })} /></Field>
                <SelectField label="Account state" value={accountGovernanceForm.account_state_cd} onChange={(value) => setAccountGovernanceForm({ ...accountGovernanceForm, account_state_cd: value })}><option value="ACTIVE">Active</option><option value="LOCKED">Locked</option><option value="SUSPENDED">Suspended</option><option value="INACTIVE">Inactive</option></SelectField>
              </div>
              <label className="check-row"><span>MFA enabled</span><input type="checkbox" checked={accountGovernanceForm.mfa_enabled_bool} onChange={(event) => setAccountGovernanceForm({ ...accountGovernanceForm, mfa_enabled_bool: event.target.checked })} /></label>
              <Field label="Reason"><textarea required value={accountGovernanceForm.reason_txt} onChange={(event) => setAccountGovernanceForm({ ...accountGovernanceForm, reason_txt: event.target.value })} /></Field>
              <div className="button-row"><button className="primary-button" type="submit">Save account</button></div>
            </form>
            <form className="stacked-form" onSubmit={(event) => {
              event.preventDefault();
              if (!accountGovernanceForm.portal_account_uid) return setError("Select a portal account before resetting password.");
              void submit(`/api/portal/accounts/${accountGovernanceForm.portal_account_uid}/reset-password`, {
                temporary_password: accountGovernanceForm.temporary_password,
                reason_txt: accountGovernanceForm.reason_txt,
              }, () => setAccountGovernanceForm({ ...accountGovernanceForm, temporary_password: "" }), "Temporary password issued. The portal user must change it on next login.");
            }}>
              <Field label="Temporary password"><input type="password" minLength="12" value={accountGovernanceForm.temporary_password} onChange={(event) => setAccountGovernanceForm({ ...accountGovernanceForm, temporary_password: event.target.value })} /></Field>
              <button className="secondary-button" type="submit">Issue temporary password</button>
            </form>
          </section>
        </div>
      ) : null}

      {activeTab === "requests" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading"><div><span>Service desk</span><h2>Open Request Or Log Interaction</h2></div><FileQuestion size={21} /></div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/portal/service-requests", { ...requestForm, subject_uid: requestForm.subject_uid || null, due_ts: toIso(requestForm.due_ts) }, () => setRequestForm(initialRequest), "Service request opened");
            }}>
              <SelectField label="Taxpayer" value={requestForm.subject_uid} onChange={(value) => setRequestForm({ ...requestForm, subject_uid: value })}>
                <option value="">No taxpayer context</option>{subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>)}
              </SelectField>
              <div className="compact-form full-span">
                <Field label="Request type"><input value={requestForm.request_type_cd} onChange={(event) => setRequestForm({ ...requestForm, request_type_cd: event.target.value.toUpperCase() })} /></Field>
                <Field label="Due"><input type="datetime-local" value={requestForm.due_ts} onChange={(event) => setRequestForm({ ...requestForm, due_ts: event.target.value })} /></Field>
              </div>
              <Field label="Summary"><textarea value={requestForm.summary_txt} onChange={(event) => setRequestForm({ ...requestForm, summary_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Open request</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/portal/interactions", { ...interactionForm, subject_uid: interactionForm.subject_uid || null, service_request_uid: interactionForm.service_request_uid || null }, () => setInteractionForm(initialInteraction), "Interaction logged");
            }}>
              <SelectField label="Service request" value={interactionForm.service_request_uid} onChange={(value) => {
                const request = requests.find((item) => item.service_request_uid === value);
                setInteractionForm({ ...interactionForm, service_request_uid: value, subject_uid: request?.subject_uid || interactionForm.subject_uid });
              }}>
                <option value="">No request</option>{requests.map((request) => <option key={request.service_request_uid} value={request.service_request_uid}>{request.service_request_no} - {request.display_name_txt || compactCode(request.request_type_cd)}</option>)}
              </SelectField>
              <Field label="Interaction summary"><textarea value={interactionForm.summary_txt} onChange={(event) => setInteractionForm({ ...interactionForm, summary_txt: event.target.value })} /></Field>
              <button className="secondary-button" type="submit">Log interaction</button>
            </form>
          </section>
          <section className="content-band">
            <div className="section-heading"><div><span>Request triage</span><h2>Assign, Reassign Or Close</h2></div><MessageSquare size={21} /></div>
            <DataTable columns={requestColumns} rows={requests} keyField="service_request_uid" selectedKey={requestGovernanceForm.service_request_uid} onRowClick={selectRequest} empty="No service requests" />
            <form className="stacked-form" onSubmit={(event) => {
              event.preventDefault();
              if (!requestGovernanceForm.service_request_uid) return setError("Select a service request before saving triage changes.");
              void submit(`/api/portal/service-requests/${requestGovernanceForm.service_request_uid}`, {
                request_state_cd: requestGovernanceForm.request_state_cd,
                due_ts: toIso(requestGovernanceForm.due_ts),
                assigned_actor_uid: requestGovernanceForm.assigned_actor_uid || null,
                assigned_unit_uid: requestGovernanceForm.assigned_unit_uid || null,
                priority_cd: requestGovernanceForm.priority_cd,
                response_summary_txt: requestGovernanceForm.response_summary_txt || null,
                reason_txt: requestGovernanceForm.reason_txt,
              }, null, "Service request updated.", "PATCH");
            }}>
              <div className="compact-form">
                <SelectField label="State" value={requestGovernanceForm.request_state_cd} onChange={(value) => setRequestGovernanceForm({ ...requestGovernanceForm, request_state_cd: value })}><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="ESCALATED">Escalated</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option><option value="CANCELLED">Cancelled</option></SelectField>
                <Field label="Priority"><input value={requestGovernanceForm.priority_cd} onChange={(event) => setRequestGovernanceForm({ ...requestGovernanceForm, priority_cd: event.target.value.toUpperCase() })} /></Field>
                <SelectField label="Assigned officer" value={requestGovernanceForm.assigned_actor_uid} onChange={(value) => setRequestGovernanceForm({ ...requestGovernanceForm, assigned_actor_uid: value })}><option value="">No officer</option>{staff.map((member) => <option key={member.actor_uid} value={member.actor_uid}>{member.full_name_txt || member.display_name_txt || member.username_txt}</option>)}</SelectField>
                <SelectField label="Assigned unit" value={requestGovernanceForm.assigned_unit_uid} onChange={(value) => setRequestGovernanceForm({ ...requestGovernanceForm, assigned_unit_uid: value })}><option value="">No unit</option>{agencyUnits.map((unit) => <option key={unit.agency_unit_uid} value={unit.agency_unit_uid}>{unit.unit_name}</option>)}</SelectField>
              </div>
              <Field label="Response summary"><textarea value={requestGovernanceForm.response_summary_txt} onChange={(event) => setRequestGovernanceForm({ ...requestGovernanceForm, response_summary_txt: event.target.value })} /></Field>
              <Field label="Reason"><textarea required value={requestGovernanceForm.reason_txt} onChange={(event) => setRequestGovernanceForm({ ...requestGovernanceForm, reason_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Save request</button>
            </form>
            <DataTable columns={interactionColumns} rows={interactions} keyField="interaction_uid" empty="No interaction logs" />
          </section>
        </div>
      ) : null}

      {activeTab === "appointments" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading"><div><span>Booking desk</span><h2>Book Appointment</h2></div><CalendarClock size={21} /></div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/portal/appointments", { ...appointmentForm, subject_uid: appointmentForm.subject_uid || null, service_site_uid: appointmentForm.service_site_uid || null, start_ts: toIso(appointmentForm.start_ts), end_ts: toIso(appointmentForm.end_ts) }, () => setAppointmentForm(initialAppointment), "Appointment booked");
            }}>
              <SelectField label="Taxpayer" value={appointmentForm.subject_uid} onChange={(value) => setAppointmentForm({ ...appointmentForm, subject_uid: value })}>
                <option value="">No taxpayer context</option>{subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>)}
              </SelectField>
              <SelectField label="Service site" value={appointmentForm.service_site_uid} onChange={(value) => setAppointmentForm({ ...appointmentForm, service_site_uid: value })}>
                <option value="">No site selected</option>{serviceSites.map((site) => <option key={site.service_site_uid} value={site.service_site_uid}>{site.site_name}</option>)}
              </SelectField>
              <div className="compact-form full-span">
                <Field label="Start"><input type="datetime-local" value={appointmentForm.start_ts} onChange={(event) => setAppointmentForm({ ...appointmentForm, start_ts: event.target.value })} /></Field>
                <Field label="End"><input type="datetime-local" value={appointmentForm.end_ts} onChange={(event) => setAppointmentForm({ ...appointmentForm, end_ts: event.target.value })} /></Field>
              </div>
              <button className="primary-button" type="submit">Book appointment</button>
            </form>
          </section>
          <section className="content-band">
            <div className="section-heading"><div><span>Appointment lifecycle</span><h2>Confirm, Reschedule Or Cancel</h2></div><CalendarClock size={21} /></div>
            <DataTable columns={appointmentColumns} rows={appointments} keyField="appointment_slot_uid" selectedKey={appointmentGovernanceForm.appointment_slot_uid} onRowClick={selectAppointment} empty="No appointments" />
            <form className="stacked-form" onSubmit={(event) => {
              event.preventDefault();
              if (!appointmentGovernanceForm.appointment_slot_uid) return setError("Select an appointment before saving changes.");
              void submit(`/api/portal/appointments/${appointmentGovernanceForm.appointment_slot_uid}`, {
                service_site_uid: appointmentGovernanceForm.service_site_uid || null,
                appointment_type_cd: appointmentGovernanceForm.appointment_type_cd,
                start_ts: toIso(appointmentGovernanceForm.start_ts),
                end_ts: toIso(appointmentGovernanceForm.end_ts),
                appointment_state_cd: appointmentGovernanceForm.appointment_state_cd,
                appointment_reason_txt: appointmentGovernanceForm.appointment_reason_txt || null,
                reason_txt: appointmentGovernanceForm.reason_txt,
              }, null, "Appointment updated.", "PATCH");
            }}>
              <div className="compact-form">
                <SelectField label="State" value={appointmentGovernanceForm.appointment_state_cd} onChange={(value) => setAppointmentGovernanceForm({ ...appointmentGovernanceForm, appointment_state_cd: value })}><option value="REQUESTED">Requested</option><option value="BOOKED">Booked</option><option value="CONFIRMED">Confirmed</option><option value="RESCHEDULED">Rescheduled</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></SelectField>
                <SelectField label="Service site" value={appointmentGovernanceForm.service_site_uid} onChange={(value) => setAppointmentGovernanceForm({ ...appointmentGovernanceForm, service_site_uid: value })}><option value="">No site</option>{serviceSites.map((site) => <option key={site.service_site_uid} value={site.service_site_uid}>{site.site_name}</option>)}</SelectField>
                <Field label="Start"><input type="datetime-local" value={appointmentGovernanceForm.start_ts} onChange={(event) => setAppointmentGovernanceForm({ ...appointmentGovernanceForm, start_ts: event.target.value })} /></Field>
                <Field label="End"><input type="datetime-local" value={appointmentGovernanceForm.end_ts} onChange={(event) => setAppointmentGovernanceForm({ ...appointmentGovernanceForm, end_ts: event.target.value })} /></Field>
              </div>
              <Field label="Appointment note"><textarea value={appointmentGovernanceForm.appointment_reason_txt} onChange={(event) => setAppointmentGovernanceForm({ ...appointmentGovernanceForm, appointment_reason_txt: event.target.value })} /></Field>
              <Field label="Reason"><textarea required value={appointmentGovernanceForm.reason_txt} onChange={(event) => setAppointmentGovernanceForm({ ...appointmentGovernanceForm, reason_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Save appointment</button>
            </form>
          </section>
        </div>
      ) : null}

      {activeTab === "feedback" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading"><div><span>Feedback capture</span><h2>Record Feedback</h2></div><Star size={21} /></div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/portal/feedback", { ...feedbackForm, subject_uid: feedbackForm.subject_uid || null, service_request_uid: feedbackForm.service_request_uid || null, rating_no: Number(feedbackForm.rating_no) }, () => setFeedbackForm(initialFeedback), "Feedback received");
            }}>
              <SelectField label="Service request" value={feedbackForm.service_request_uid} onChange={(value) => {
                const request = requests.find((item) => item.service_request_uid === value);
                setFeedbackForm({ ...feedbackForm, service_request_uid: value, subject_uid: request?.subject_uid || feedbackForm.subject_uid });
              }}>
                <option value="">No request</option>{requests.map((request) => <option key={request.service_request_uid} value={request.service_request_uid}>{request.service_request_no}</option>)}
              </SelectField>
              <Field label="Rating"><input type="number" min="1" max="5" value={feedbackForm.rating_no} onChange={(event) => setFeedbackForm({ ...feedbackForm, rating_no: event.target.value })} /></Field>
              <Field label="Feedback"><textarea value={feedbackForm.feedback_txt} onChange={(event) => setFeedbackForm({ ...feedbackForm, feedback_txt: event.target.value })} /></Field>
              <button className="secondary-button" type="submit">Record feedback</button>
            </form>
          </section>
          <section className="content-band">
            <div className="section-heading"><div><span>Feedback triage</span><h2>Assign, Resolve Or Close</h2></div><MessageSquare size={21} /></div>
            <DataTable columns={feedbackColumns} rows={feedback} keyField="feedback_uid" selectedKey={feedbackGovernanceForm.feedback_uid} onRowClick={selectFeedback} empty="No feedback" />
            <form className="stacked-form" onSubmit={(event) => {
              event.preventDefault();
              if (!feedbackGovernanceForm.feedback_uid) return setError("Select a feedback record before saving triage changes.");
              void submit(`/api/portal/feedback/${feedbackGovernanceForm.feedback_uid}`, {
                feedback_state_cd: feedbackGovernanceForm.feedback_state_cd,
                triage_state_cd: feedbackGovernanceForm.triage_state_cd,
                assigned_actor_uid: feedbackGovernanceForm.assigned_actor_uid || null,
                triage_notes_txt: feedbackGovernanceForm.triage_notes_txt || null,
                reason_txt: feedbackGovernanceForm.reason_txt,
              }, null, "Feedback triage updated.", "PATCH");
            }}>
              <div className="compact-form">
                <SelectField label="Feedback state" value={feedbackGovernanceForm.feedback_state_cd} onChange={(value) => setFeedbackGovernanceForm({ ...feedbackGovernanceForm, feedback_state_cd: value })}><option value="RECEIVED">Received</option><option value="ACKNOWLEDGED">Acknowledged</option><option value="CLOSED">Closed</option></SelectField>
                <SelectField label="Triage state" value={feedbackGovernanceForm.triage_state_cd} onChange={(value) => setFeedbackGovernanceForm({ ...feedbackGovernanceForm, triage_state_cd: value })}><option value="RECEIVED">Received</option><option value="TRIAGED">Triaged</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option><option value="DISMISSED">Dismissed</option><option value="CLOSED">Closed</option></SelectField>
                <SelectField label="Assigned officer" value={feedbackGovernanceForm.assigned_actor_uid} onChange={(value) => setFeedbackGovernanceForm({ ...feedbackGovernanceForm, assigned_actor_uid: value })}><option value="">No officer</option>{staff.map((member) => <option key={member.actor_uid} value={member.actor_uid}>{member.full_name_txt || member.display_name_txt || member.username_txt}</option>)}</SelectField>
              </div>
              <Field label="Triage notes"><textarea value={feedbackGovernanceForm.triage_notes_txt} onChange={(event) => setFeedbackGovernanceForm({ ...feedbackGovernanceForm, triage_notes_txt: event.target.value })} /></Field>
              <Field label="Reason"><textarea required value={feedbackGovernanceForm.reason_txt} onChange={(event) => setFeedbackGovernanceForm({ ...feedbackGovernanceForm, reason_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Save feedback triage</button>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
