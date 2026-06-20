import { CalendarClock, MessageSquare, Monitor, Star } from "lucide-react";
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
  { id: "accounts", label: "Accounts" },
  { id: "requests", label: "Requests" },
  { id: "appointments", label: "Appointments" },
];

function futureLocalInput(days, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString().slice(0, 16);
}

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function statusTone(value) {
  const status = String(value || "");
  if (["ACTIVE", "BOOKED", "CLOSED", "RESOLVED", "RECEIVED"].includes(status)) return "success";
  if (["OPEN", "AVAILABLE", "PENDING"].includes(status)) return "warning";
  if (["SUSPENDED", "CANCELLED", "ESCALATED"].includes(status)) return "danger";
  return "neutral";
}

const initialAccount = { subject_uid: "", portal_username_txt: "", email_txt: "", account_state_cd: "ACTIVE", mfa_enabled_bool: true };
const initialRequest = { subject_uid: "", request_type_cd: "GENERAL_ENQUIRY", channel_cd: "PORTAL", due_ts: futureLocalInput(7), summary_txt: "" };
const initialInteraction = { subject_uid: "", service_request_uid: "", interaction_type_cd: "NOTE", channel_cd: "PORTAL", summary_txt: "" };
const initialAppointment = { subject_uid: "", service_site_uid: "", appointment_type_cd: "SERVICE_COUNTER", start_ts: futureLocalInput(3, 9), end_ts: futureLocalInput(3, 10), appointment_state_cd: "BOOKED" };
const initialFeedback = { subject_uid: "", service_request_uid: "", feedback_type_cd: "SERVICE", rating_no: 5, feedback_txt: "" };

export default function PortalServicesPage() {
  const [activeTab, setActiveTab] = useState("accounts");
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [serviceSites, setServiceSites] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [accountForm, setAccountForm] = useState(initialAccount);
  const [requestForm, setRequestForm] = useState(initialRequest);
  const [interactionForm, setInteractionForm] = useState(initialInteraction);
  const [appointmentForm, setAppointmentForm] = useState(initialAppointment);
  const [feedbackForm, setFeedbackForm] = useState(initialFeedback);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const [overviewPayload, subjectsPayload, sitesPayload, accountPayload, requestPayload, interactionPayload, appointmentPayload, feedbackPayload] =
      await Promise.all([
        apiRequest("/api/portal/overview"),
        apiRequest("/api/registry/subjects?pageSize=100"),
        apiRequest("/api/admin/service-sites"),
        apiRequest("/api/portal/accounts?pageSize=80"),
        apiRequest("/api/portal/service-requests?pageSize=80"),
        apiRequest("/api/portal/interactions?pageSize=80"),
        apiRequest("/api/portal/appointments?pageSize=80"),
        apiRequest("/api/portal/feedback?pageSize=80"),
      ]);
    setOverview(overviewPayload.overview);
    setSubjects(subjectsPayload.rows || []);
    setServiceSites(sitesPayload.service_sites || []);
    setAccounts(accountPayload.rows || []);
    setRequests(requestPayload.rows || []);
    setInteractions(interactionPayload.rows || []);
    setAppointments(appointmentPayload.rows || []);
    setFeedback(feedbackPayload.rows || []);
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

  const accountColumns = [
    { key: "portal_username_txt", label: "Portal username" },
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "email_txt", label: "Email", render: (row) => row.email_txt || "-" },
    { key: "mfa_enabled_bool", label: "MFA", render: (row) => <StatusPill tone={row.mfa_enabled_bool ? "success" : "warning"}>{row.mfa_enabled_bool ? "Enabled" : "Not enabled"}</StatusPill> },
    { key: "account_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.account_state_cd)}>{compactCode(row.account_state_cd)}</StatusPill> },
  ];
  const requestColumns = [
    { key: "service_request_no", label: "Request" },
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "request_type_cd", label: "Type", render: (row) => compactCode(row.request_type_cd) },
    { key: "channel_cd", label: "Channel", render: (row) => compactCode(row.channel_cd) },
    { key: "request_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.request_state_cd)}>{compactCode(row.request_state_cd)}</StatusPill> },
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
    { key: "feedback_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.feedback_state_cd)}>{compactCode(row.feedback_state_cd)}</StatusPill> },
  ];

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Digital services and portal" title="Portal Accounts, Requests And Appointments" status="Citizen service" tone="success" />

      <div className="metric-grid">
        <MetricTile icon={Monitor} label="Portal accounts" value={formatNumber(overview?.portal_account_count)} />
        <MetricTile icon={MessageSquare} label="Open requests" value={formatNumber(overview?.open_service_request_count)} />
        <MetricTile icon={CalendarClock} label="Appointments" value={formatNumber(overview?.appointment_count)} />
        <MetricTile icon={Star} label="Average rating" value={formatNumber(overview?.average_feedback_rating)} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "accounts" ? (
        <div className="module-workbench">
          <section className="content-band">
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
            <DataTable columns={accountColumns} rows={accounts} keyField="portal_account_uid" empty="No portal accounts" />
          </section>
        </div>
      ) : null}

      {activeTab === "requests" ? (
        <div className="module-workbench">
          <section className="content-band">
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/portal/service-requests", { ...requestForm, subject_uid: requestForm.subject_uid || null, due_ts: toIso(requestForm.due_ts) }, () => setRequestForm(initialRequest), "Service request opened");
            }}>
              <SelectField label="Taxpayer" value={requestForm.subject_uid} onChange={(value) => setRequestForm({ ...requestForm, subject_uid: value })}>
                <option value="">No taxpayer context</option>{subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>)}
              </SelectField>
              <div className="compact-form">
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
            <DataTable columns={requestColumns} rows={requests} keyField="service_request_uid" empty="No service requests" />
            <br />
            <DataTable columns={interactionColumns} rows={interactions} keyField="interaction_uid" empty="No interaction logs" />
          </section>
        </div>
      ) : null}

      {activeTab === "appointments" ? (
        <div className="module-workbench">
          <section className="content-band">
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
              <div className="compact-form">
                <Field label="Start"><input type="datetime-local" value={appointmentForm.start_ts} onChange={(event) => setAppointmentForm({ ...appointmentForm, start_ts: event.target.value })} /></Field>
                <Field label="End"><input type="datetime-local" value={appointmentForm.end_ts} onChange={(event) => setAppointmentForm({ ...appointmentForm, end_ts: event.target.value })} /></Field>
              </div>
              <button className="primary-button" type="submit">Book appointment</button>
            </form>
            <hr />
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
            <DataTable columns={appointmentColumns} rows={appointments} keyField="appointment_slot_uid" empty="No appointments" />
            <br />
            <DataTable columns={feedbackColumns} rows={feedback} keyField="feedback_uid" empty="No feedback" />
          </section>
        </div>
      ) : null}
    </section>
  );
}
