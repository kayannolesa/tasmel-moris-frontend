import { Archive, RefreshCw, RotateCcw, Save, Search, ShieldCheck, Unlink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../services/api.js";
import { formatDateTime } from "../../utils/format.js";
import { DataTable, Field, GovernanceShell, ReasonField, SelectField, StatePill, compactCode, formatDate, formatMoney, safeJson, stripEmpty } from "./GovernanceShared.jsx";

const stateOptions = {
  record_state_cd: ["ACTIVE", "INACTIVE", "ARCHIVED", "SUPERSEDED", "LOCKED"],
  document_state_cd: ["DRAFT", "ACTIVE", "ISSUED", "SUPERSEDED", "RETIRED", "CANCELLED"],
  message_state_cd: ["DRAFT", "QUEUED", "SENT", "DELIVERED", "FAILED", "READ", "CANCELLED"],
  template_state_cd: ["DRAFT", "ACTIVE", "INACTIVE", "SUPERSEDED", "RETIRED"],
  requirement_state_cd: ["ACTIVE", "INACTIVE", "RETIRED"],
  queue_state_cd: ["OPEN", "ASSIGNED", "UNDER_REVIEW", "CLOSED"],
  plan_state_cd: ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"],
  action_state_cd: ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
  audit_state_cd: ["OPEN", "IN_PROGRESS", "CLOSED", "CANCELLED"],
  finding_state_cd: ["OPEN", "RESOLVED", "CANCELLED"],
  request_state_cd: ["REQUESTED", "ASSIGNED", "UNDER_REVIEW", "APPROVED", "REJECTED", "CLOSED", "CANCELLED"],
  investigation_state_cd: ["OPEN", "ACTIVE", "CLOSED", "CANCELLED"],
  custody_state_cd: ["ACTIVE", "RETURNED", "ARCHIVED"],
  disclosure_state_cd: ["LODGED", "ACCEPTED", "REJECTED", "ASSESSED", "CLOSED"],
  review_state_cd: ["LODGED", "UNDER_REVIEW", "AWAITING_INFORMATION", "DECISION_DUE", "DECIDED", "CLOSED", "CANCELLED"],
  issue_state_cd: ["OPEN", "RESOLVED", "WAIVED", "SIGNED_OFF", "CANCELLED"],
  implementation_state_cd: ["PENDING", "IMPLEMENTED", "NOT_REQUIRED", "CANCELLED"],
  appeal_state_cd: ["FILED", "HEARING_SET", "DECIDED", "WITHDRAWN", "CLOSED"],
  premises_state_cd: ["ACTIVE", "INACTIVE", "CLOSED"],
  permit_state_cd: ["DRAFT", "SUBMITTED", "APPROVED", "ACTIVE", "SUSPENDED", "EXPIRED", "CANCELLED", "RETIRED"],
  compliance_state_cd: ["ACTIVE", "SATISFIED", "REVOKED", "EXPIRED"],
  renewal_state_cd: ["DUE", "SUBMITTED", "APPROVED", "REJECTED", "CANCELLED", "COMPLETED"],
  result_cd: ["CLEAR", "NOT_CLEAR", "CONDITIONAL", "REVOKED"],
  system_state_cd: ["ACTIVE", "SUSPENDED", "INACTIVE", "RETIRED"],
  contract_state_cd: ["ACTIVE", "SUSPENDED", "INACTIVE", "RETIRED"],
  exception_state_cd: ["OPEN", "RETRYING", "RESOLVED", "CLOSED"],
  report_state_cd: ["DRAFT", "PUBLISHED", "RETIRED"],
  run_state_cd: ["REQUESTED", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"],
  metric_state_cd: ["ACTIVE", "INACTIVE", "RETIRED"],
  mart_state_cd: ["PUBLISHED", "REFRESHING", "RETIRED"],
  source_state_cd: ["IMPORTED", "ACTIVE", "SIGNED_OFF", "RETIRED"],
  mapping_state_cd: ["DRAFT", "MAPPED", "VALIDATED", "RETIRED"],
  reconciliation_state_cd: ["DRAFT", "MATCHED", "VARIANCE", "SIGNED_OFF", "CLOSED"],
};

const labels = {
  content: "Document metadata", link: "Linked records", message: "Messages", template: "Templates", requirement: "Document requirements", notificationTemplate: "Notification catalogue",
  riskSignalType: "Risk signal types", riskProfile: "Risk profiles", riskSignal: "Risk signals", plan: "Compliance plans", action: "Compliance actions", audit: "Audit engagements", finding: "Audit findings", informationRequest: "Information requests", investigation: "Investigations", evidence: "Evidence register", disclosure: "Voluntary disclosures",
  reviewFile: "Review files", issue: "Issues", decision: "Decisions", appeal: "External appeals", licenceType: "Licence type configuration", premises: "Premises", permit: "Permits", condition: "Conditions", renewal: "Renewals", clearanceRequest: "Clearance requests", clearanceResult: "Clearance results",
  partner: "Partner systems", contract: "Exchange contracts", report: "Report definitions", run: "Report runs", metric: "KPI definitions", mart: "Data marts", source: "Source registers", entity: "Entity profiles", crosswalk: "Crosswalks", reconciliation: "Reconciliations",
};

function r(id, idField, stateField, labelFields, fields, options = {}) {
  return { id, label: labels[id] || id, idField, stateField, labelFields, fields, reasonField: options.reasonField || "state_reason_txt", ...options };
}

const moduleConfig = {
  documents: { endpoint: "documents", title: "Document and Messaging Governance", resources: [
    r("content", "content_record_uid", "document_state_cd", ["document_title_txt", "content_no", "file_name_txt"], ["document_title_txt", "document_summary_txt", "document_category_cd", "confidentiality_cd", "document_state_cd", "issue_dt", "retention_until_dt", "document_metadata_jsn", "superseded_by_content_record_uid"], { reasonField: "governance_reason_txt", archiveLabel: "Archive or supersede" }),
    r("link", "content_link_uid", "record_state_cd", ["link_role_cd", "business_record_uid", "content_record_uid"], ["visibility_cd", "link_role_cd", "link_note_txt", "subject_uid"], { reasonField: "unlink_reason_txt", archiveLabel: "Unlink document", archiveIcon: "unlink" }),
    r("message", "message_envelope_uid", "message_state_cd", ["subject_txt", "recipient_txt", "message_state_cd"], ["message_state_cd", "recipient_txt", "subject_txt", "message_body_txt", "priority_cd", "portal_visible_bool", "message_payload_jsn"], { canDocumentRetry: true }),
    r("template", "template_version_uid", "template_state_cd", ["template_name_txt", "template_code", "template_type_cd"], ["template_name_txt", "template_code", "template_type_cd", "template_state_cd", "active_bool", "locked_bool", "template_body_txt", "variable_schema_jsn", "effective_from_dt", "effective_to_dt"]),
    r("requirement", "document_requirement_uid", "requirement_state_cd", ["requirement_name", "requirement_code", "business_domain_cd"], ["requirement_name", "requirement_code", "business_domain_cd", "document_type_cd", "mandatory_bool", "requirement_rule_jsn", "effective_from_dt", "effective_to_dt", "requirement_state_cd"]),
    r("notificationTemplate", "template_uid", "template_state_cd", ["template_name", "template_code", "delivery_channel_cd"], ["template_name", "template_code", "delivery_channel_cd", "subject_template_txt", "body_template_txt", "template_state_cd", "active_bool", "version_no"]),
  ] },
  compliance: { endpoint: "compliance", title: "Compliance Lifecycle Governance", resources: [
    r("riskSignalType", "risk_signal_type_uid", "record_state_cd", ["signal_name", "signal_code", "signal_group_cd"], ["signal_name", "signal_code", "signal_group_cd", "default_weight_no", "default_rating_cd", "active_bool", "description_txt", "record_state_cd"]),
    r("riskProfile", "risk_profile_uid", "queue_state_cd", ["risk_rating_cd", "risk_priority_cd", "subject_uid"], ["risk_score_no", "risk_rating_cd", "risk_priority_cd", "queue_state_cd", "assigned_actor_uid", "manual_flag_bool", "last_review_dt", "next_review_dt", "risk_summary_txt", "risk_payload_jsn"]),
    r("riskSignal", "risk_signal_uid", "record_state_cd", ["signal_name", "signal_value_txt", "subject_uid"], ["signal_name", "signal_weight_no", "signal_value_txt", "record_state_cd", "resolved_ts", "resolution_note_txt", "signal_payload_jsn"]),
    r("plan", "compliance_plan_uid", "plan_state_cd", ["plan_name", "priority_cd", "plan_state_cd"], ["plan_name", "plan_type_cd", "plan_state_cd", "priority_cd", "owner_actor_uid", "start_dt", "end_dt", "target_completion_dt", "objective_txt", "outcome_cd", "outcome_txt"]),
    r("action", "compliance_action_uid", "action_state_cd", ["action_type_cd", "priority_cd", "action_state_cd"], ["action_state_cd", "assigned_actor_uid", "priority_cd", "due_dt", "closed_dt", "outcome_cd", "outcome_txt", "action_note_txt"]),
    r("audit", "audit_engagement_uid", "audit_state_cd", ["audit_type_cd", "audit_state_cd", "subject_uid"], ["audit_state_cd", "lead_actor_uid", "start_dt", "end_dt", "outcome_cd", "scope_txt", "objective_txt", "recommendation_txt", "closure_summary_txt"]),
    r("finding", "audit_finding_uid", "finding_state_cd", ["finding_type_cd", "finding_state_cd", "audit_engagement_uid"], ["finding_type_cd", "finding_txt", "proposed_adjustment_amt", "finding_state_cd", "recommendation_txt", "evidence_summary_txt", "resolved_ts"]),
    r("informationRequest", "information_request_uid", "request_state_cd", ["request_type_cd", "request_state_cd", "due_dt"], ["request_type_cd", "request_txt", "issued_dt", "due_dt", "response_received_ts", "response_summary_txt", "response_document_uid", "request_state_cd"]),
    r("investigation", "investigation_file_uid", "investigation_state_cd", ["investigation_type_cd", "investigation_state_cd", "subject_uid"], ["investigation_type_cd", "restriction_level_cd", "opened_dt", "closed_dt", "investigation_state_cd", "lead_actor_uid", "summary_txt", "outcome_cd", "outcome_txt", "recommendation_txt"]),
    r("evidence", "evidence_uid", "custody_state_cd", ["evidence_type_cd", "custody_state_cd", "source_record_uid"], ["custody_state_cd", "description_txt", "source_schema_cd", "source_table_cd", "source_record_uid"]),
    r("disclosure", "disclosure_uid", "disclosure_state_cd", ["disclosure_state_cd", "subject_uid", "estimated_liability_amt"], ["disclosure_state_cd", "disclosure_summary_txt", "estimated_liability_amt", "assessed_liability_amt", "relief_decision_cd", "decision_txt", "assigned_actor_uid"]),
    r("link", "compliance_record_link_uid", "record_state_cd", ["target_role_cd", "target_record_uid", "compliance_plan_uid"], ["target_role_cd", "link_note_txt"], { reasonField: "unlink_reason_txt", archiveLabel: "Unlink record", archiveIcon: "unlink" }),
  ] },
  disputes: { endpoint: "disputes", title: "Reviews and Appeals Governance", resources: [
    r("reviewFile", "review_file_uid", "review_state_cd", ["review_file_no", "review_state_cd", "subject_uid"], ["review_state_cd", "queue_state_cd", "priority_cd", "decision_due_dt", "owner_actor_uid", "grounds_txt", "closure_reason_txt"]),
    r("issue", "review_issue_uid", "issue_state_cd", ["issue_type_cd", "issue_state_cd", "disputed_amt"], ["issue_type_cd", "disputed_amt", "issue_txt", "issue_summary_txt", "position_txt", "resolution_txt", "issue_state_cd", "resolved_ts"]),
    r("decision", "decision_outcome_uid", "implementation_state_cd", ["decision_cd", "implementation_state_cd", "financial_impact_amt"], ["decision_cd", "decision_reason_cd", "decision_dt", "decision_txt", "decision_summary_txt", "amount_upheld_amt", "amount_varied_amt", "financial_impact_amt", "implementation_state_cd"], { reasonField: "implementation_reason_txt" }),
    r("appeal", "external_appeal_uid", "appeal_state_cd", ["external_reference_no", "court_or_tribunal_txt", "appeal_state_cd"], ["external_reference_no", "court_or_tribunal_txt", "filed_dt", "hearing_dt", "next_action_dt", "appeal_state_cd", "outcome_txt"]),
    r("link", "review_record_link_uid", "record_state_cd", ["target_role_cd", "target_record_uid", "review_file_uid"], ["target_role_cd", "link_note_txt"], { reasonField: "unlink_reason_txt", archiveLabel: "Unlink evidence", archiveIcon: "unlink" }),
  ] },
  licensing: { endpoint: "licensing", title: "Licensing and Certificate Governance", resources: [
    r("licenceType", "licence_type_config_uid", "record_state_cd", ["licence_type_name", "licence_category_cd", "default_fee_amt"], ["licence_type_name", "licence_category_cd", "revenue_kind_uid", "revenue_component_uid", "default_fee_amt", "validity_days_no", "renewal_window_days_no", "approval_required_bool", "clearance_required_bool", "portal_enabled_bool", "condition_template_jsn", "record_state_cd"]),
    r("premises", "premises_uid", "premises_state_cd", ["premises_name_txt", "city_txt", "premises_state_cd"], ["premises_name_txt", "activity_code", "address_line1_txt", "address_line2_txt", "city_txt", "country_cd", "geo_node_uid", "premises_state_cd"]),
    r("permit", "permit_uid", "permit_state_cd", ["licence_title_txt", "permit_no", "permit_state_cd"], ["premises_uid", "permit_type_cd", "permit_category_cd", "licence_title_txt", "application_reference_no", "permit_state_cd", "issue_dt", "expiry_dt", "renewal_due_dt", "registration_source_cd", "permit_metadata_jsn"], { reasonField: "correction_reason_txt" }),
    r("condition", "condition_uid", "compliance_state_cd", ["condition_type_cd", "compliance_state_cd", "condition_txt"], ["condition_type_cd", "condition_txt", "restriction_bool", "compliance_state_cd", "effective_from_dt", "effective_to_dt", "due_dt", "satisfied_dt", "condition_metadata_jsn"]),
    r("renewal", "renewal_cycle_uid", "renewal_state_cd", ["renewal_state_cd", "decision_cd", "reassessed_fee_amt"], ["renewal_state_cd", "window_start_dt", "window_end_dt", "renewal_application_dt", "reassessed_fee_amt", "decision_dt", "decision_cd", "renewal_notes_txt", "renewal_payload_jsn"]),
    r("clearanceRequest", "clearance_request_uid", "request_state_cd", ["purpose_txt", "request_state_cd", "subject_uid"], ["purpose_txt", "request_state_cd", "requested_channel_cd", "assigned_actor_uid", "portal_visible_bool", "request_metadata_jsn"]),
    r("clearanceResult", "clearance_result_uid", "result_cd", ["certificate_no", "result_cd", "expiry_dt"], ["result_cd", "result_reason_cd", "issued_dt", "expiry_dt", "certificate_no", "refusal_reason_txt", "override_clearance_bool"]),
  ] },
  integrations: { endpoint: "integrations", title: "Integration Governance", resources: [
    r("partner", "partner_system_uid", "system_state_cd", ["partner_name", "partner_type_cd", "system_state_cd"], ["partner_name", "partner_type_cd", "endpoint_txt", "contact_txt", "system_state_cd", "endpoint_security_jsn"], { canRotateCredential: true }),
    r("contract", "exchange_contract_uid", "contract_state_cd", ["message_type_cd", "exchange_direction_cd", "contract_state_cd"], ["exchange_direction_cd", "message_type_cd", "transport_cd", "schema_version_txt", "contract_state_cd", "endpoint_security_jsn"], { canRotateCredential: true }),
    r("message", "message_event_uid", "message_state_cd", ["correlation_reference_txt", "message_state_cd", "direction_cd"], ["message_state_cd", "received_ts", "sent_ts", "correlation_reference_txt"], { canReplay: true }),
    r("exception", "exception_uid", "exception_state_cd", ["exception_type_cd", "exception_state_cd", "exception_txt"], ["exception_type_cd", "exception_state_cd", "exception_txt", "resolved_ts", "resolution_note_txt"], { canRetry: true }),
  ] },
  reporting: { endpoint: "reporting", title: "Reporting and Analytics Governance", resources: [
    r("report", "report_definition_uid", "report_state_cd", ["report_name", "report_type_cd", "report_state_cd"], ["report_name", "report_type_cd", "owner_actor_uid", "security_scope_cd", "definition_jsn", "report_state_cd", "schedule_enabled_bool", "schedule_cron_txt", "next_run_ts"]),
    r("run", "report_run_uid", "run_state_cd", ["run_state_cd", "period_cd", "completed_ts"], ["completed_ts", "run_state_cd", "parameter_jsn", "output_content_uid"]),
    r("metric", "metric_definition_uid", "metric_state_cd", ["metric_name", "metric_type_cd", "metric_state_cd"], ["metric_name", "metric_type_cd", "calculation_rule_jsn", "owner_actor_uid", "metric_state_cd"]),
    r("mart", "data_mart_uid", "mart_state_cd", ["mart_name", "refresh_frequency_cd", "mart_state_cd"], ["mart_name", "source_tables_jsn", "refresh_frequency_cd", "mart_state_cd", "last_refresh_ts", "refresh_reason_txt"]),
  ] },
  migration: { endpoint: "migration", title: "Migration Quality Governance", resources: [
    r("source", "source_register_uid", "source_state_cd", ["source_name", "source_type_cd", "source_state_cd"], ["source_name", "source_type_cd", "owner_txt", "extraction_dt", "source_state_cd"]),
    r("entity", "source_entity_profile_uid", "mapping_state_cd", ["entity_name_txt", "mapping_state_cd", "row_count_no"], ["entity_name_txt", "row_count_no", "field_count_no", "profiling_summary_jsn", "mapping_state_cd"]),
    r("crosswalk", "crosswalk_uid", "record_state_cd", ["source_entity_name_txt", "target_table_cd", "confidence_cd"], ["source_entity_name_txt", "source_record_key_txt", "target_schema_cd", "target_table_cd", "target_record_uid", "confidence_cd", "record_state_cd"]),
    r("issue", "quality_issue_uid", "issue_state_cd", ["issue_severity_cd", "issue_state_cd", "issue_txt"], ["issue_severity_cd", "issue_txt", "issue_state_cd", "resolved_ts", "resolution_txt", "signoff_actor_uid"]),
    r("reconciliation", "reconciliation_result_uid", "reconciliation_state_cd", ["target_table_cd", "reconciliation_state_cd", "variance_txt"], ["target_table_cd", "source_count_no", "target_count_no", "source_total_amt", "target_total_amt", "variance_txt", "signoff_actor_uid", "reconciliation_state_cd"]),
  ] },
};

function labelize(name) {
  return name.replace(/_uid$/, " UID").replace(/_cd$/, "").replace(/_txt$/, "").replace(/_jsn$/, "").replace(/_bool$/, "").replace(/_dt$/, " date").replace(/_ts$/, " time").replace(/_amt$/, " amount").replace(/_no$/, " number").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function inferType(name) {
  if (stateOptions[name]) return "select";
  if (/_bool$/.test(name)) return "boolean";
  if (/_jsn$/.test(name)) return "json";
  if (/_ts$/.test(name)) return "datetime-local";
  if (/_dt$/.test(name)) return "date";
  if (/_amt$|_no$|_num$/.test(name)) return "number";
  if (/body|summary|note|description|objective|recommendation|outcome|resolution|reason|text|txt$/.test(name)) return "textarea";
  return "text";
}

function asField(name) {
  return { name, label: labelize(name), type: inferType(name), options: stateOptions[name] || [] };
}

function normaliseValue(value, type) {
  if (type === "boolean") return Boolean(value);
  if (type === "json") return value ? JSON.stringify(value, null, 2) : "";
  if (value === null || value === undefined) return "";
  if (type === "datetime-local") return String(value).slice(0, 16);
  return value;
}

function buildInitialForm(resource, row = {}) {
  const next = { reason_txt: "" };
  resource.fields.map(asField).forEach((item) => { next[item.name] = normaliseValue(row[item.name], item.type); });
  return next;
}

function displayValue(row, names = []) {
  for (const name of names) {
    const value = row?.[name];
    if (value !== null && value !== undefined && String(value).trim()) return value;
  }
  return row ? "Selected record" : "No record selected";
}

function renderFieldValue(row, item) {
  const value = row?.[item.name];
  if (value === null || value === undefined || value === "") return "-";
  if (item.type === "boolean") return value ? "Yes" : "No";
  if (item.type === "date") return formatDate(value);
  if (item.type === "datetime-local") return formatDateTime(value);
  if (item.name.endsWith("_amt")) return formatMoney(value);
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function buildPayload(resource, form) {
  const payload = { reason_txt: form.reason_txt };
  resource.fields.map(asField).forEach((item) => {
    const value = form[item.name];
    if (item.type === "json") {
      if (String(value || "").trim()) payload[item.name] = safeJson(value);
      return;
    }
    payload[item.name] = value;
  });
  return stripEmpty(payload);
}

function GovernanceInput({ item, value, onChange }) {
  if (item.type === "select") {
    return <SelectField label={item.label} value={value ?? ""} onChange={onChange}><option value="">Keep current</option>{item.options.map((option) => <option key={option} value={option}>{compactCode(option)}</option>)}</SelectField>;
  }
  if (item.type === "boolean") {
    return <Field label={item.label}><label className="inline-check"><input checked={Boolean(value)} type="checkbox" onChange={(event) => onChange(event.target.checked)} /> Enabled</label></Field>;
  }
  if (item.type === "textarea" || item.type === "json") {
    return <Field label={item.label}><textarea value={value ?? ""} onChange={(event) => onChange(event.target.value)} /></Field>;
  }
  return <Field label={item.label}><input type={item.type || "text"} value={value ?? ""} onChange={(event) => onChange(event.target.value)} /></Field>;
}

export default function AdvancedLifecycleGovernancePanel({ moduleKey }) {
  const module = moduleConfig[moduleKey];
  const [resourceId, setResourceId] = useState(module?.resources?.[0]?.id || "");
  const resource = useMemo(() => module?.resources.find((item) => item.id === resourceId), [module, resourceId]);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(() => buildInitialForm(resource || { fields: [] }));
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    if (!module || !resource) return;
    setLoading(true);
    try {
      const search = query.trim() ? `&q=${encodeURIComponent(query.trim())}` : "";
      const payload = await apiRequest(`/api/${module.endpoint}/governance/${resource.id}?pageSize=80${search}`);
      setRows(payload.rows || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSelected(null);
    setForm(buildInitialForm(resource || { fields: [] }));
    void load();
  }, [resourceId]);

  function selectRow(row) {
    setSelected(row);
    setForm(buildInitialForm(resource, row));
    setError("");
    setSuccess("");
  }

  async function mutate(endpoint, method, body, message) {
    if (!selected || !resource) return;
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await apiRequest(endpoint, { method, body });
      await load();
      setSelected(null);
      setForm(buildInitialForm(resource));
      setSuccess(message);
    } catch (mutationError) {
      setError(mutationError.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateRecord(event) {
    event.preventDefault();
    const uid = selected?.[resource.idField];
    if (uid) await mutate(`/api/${module.endpoint}/governance/${resource.id}/${uid}`, "PATCH", buildPayload(resource, form), "Governance update recorded.");
  }

  async function archiveRecord() {
    const uid = selected?.[resource.idField];
    if (uid) await mutate(`/api/${module.endpoint}/governance/${resource.id}/${uid}/archive`, "POST", { reason_txt: form.reason_txt }, resource.archiveIcon === "unlink" ? "Record unlinked with audit trail." : "Record archived or retired with audit trail.");
  }

  async function retryDocumentMessage() {
    const uid = selected?.[resource.idField];
    if (uid) await mutate(`/api/documents/messages/${uid}/retry`, "POST", { reason_txt: form.reason_txt, recipient_txt: form.recipient_txt }, "Message retry queued.");
  }

  async function specialPatch(extraBody, message) {
    const uid = selected?.[resource.idField];
    if (uid) await mutate(`/api/${module.endpoint}/governance/${resource.id}/${uid}`, "PATCH", { ...extraBody, reason_txt: form.reason_txt }, message);
  }

  if (!module || !resource) return null;
  const ArchiveIcon = resource.archiveIcon === "unlink" ? Unlink : Archive;
  const fields = resource.fields.map(asField);
  const columns = [
    { key: "record", label: resource.label, render: (row) => <strong>{displayValue(row, resource.labelFields)}</strong> },
    { key: "state", label: "State", render: (row) => <StatePill value={row[resource.stateField] || row.record_state_cd} /> },
    ...fields.filter((item) => !["json", "textarea"].includes(item.type)).slice(0, 3).map((item) => ({ key: item.name, label: item.label, render: (row) => renderFieldValue(row, item) })),
    { key: "updated_ts", label: "Updated", render: (row) => formatDateTime(row.updated_ts) },
  ];

  return (
    <GovernanceShell error={error} success={success}>
      <section className="content-band full-span governance-command-band">
        <div className="section-heading"><div><span>{module.title}</span><h2>{resource.label}</h2></div><ShieldCheck size={22} /></div>
        <div className="governance-toolbar">
          <SelectField label="Controlled record" value={resourceId} onChange={setResourceId}>{module.resources.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</SelectField>
          <Field label="Search"><div className="inline-input-action"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void load(); }} /></div></Field>
          <button className="secondary-button icon-button-text" disabled={loading} type="button" onClick={() => void load()}><RefreshCw size={16} /> Refresh</button>
        </div>
      </section>

      <section className="content-band governance-list-band">
        <div className="section-heading"><div><span>Records</span><h2>{loading ? "Loading" : `${rows.length} available`}</h2></div></div>
        <DataTable columns={columns} rows={rows} keyField={resource.idField} selectedKey={selected?.[resource.idField]} onRowClick={selectRow} empty="No active records available" />
      </section>

      <section className="content-band governance-detail-band">
        <div className="section-heading"><div><span>Selected record</span><h2>{displayValue(selected, resource.labelFields)}</h2></div>{selected ? <code className="record-code">{String(selected[resource.idField]).slice(0, 8)}</code> : null}</div>
        {selected ? (
          <form onSubmit={updateRecord}>
            <div className="form-grid form-grid--two">{fields.map((item) => <GovernanceInput key={item.name} item={item} value={form[item.name]} onChange={(value) => setForm((current) => ({ ...current, [item.name]: value }))} />)}</div>
            <ReasonField value={form.reason_txt} onChange={(value) => setForm((current) => ({ ...current, reason_txt: value }))} />
            <div className="button-row governance-actions">
              <button className="primary-button icon-button-text" disabled={saving} type="submit"><Save size={16} /> Save change</button>
              <button className="secondary-button icon-button-text" disabled={saving} type="button" onClick={archiveRecord}><ArchiveIcon size={16} /> {resource.archiveLabel || "Archive or retire"}</button>
              {resource.canDocumentRetry ? <button className="secondary-button icon-button-text" disabled={saving} type="button" onClick={retryDocumentMessage}><RotateCcw size={16} /> Retry message</button> : null}
              {resource.canReplay ? <button className="secondary-button icon-button-text" disabled={saving} type="button" onClick={() => specialPatch({ message_state_cd: "QUEUED", replay_bool: true }, "Integration message replay queued.")}><RotateCcw size={16} /> Replay</button> : null}
              {resource.canRetry ? <button className="secondary-button icon-button-text" disabled={saving} type="button" onClick={() => specialPatch({ exception_state_cd: "RETRYING", retry_bool: true }, "Exception retry recorded.")}><RotateCcw size={16} /> Retry exception</button> : null}
              {resource.canRotateCredential ? <button className="secondary-button icon-button-text" disabled={saving} type="button" onClick={() => specialPatch({ rotate_credential_bool: true }, "Credential rotation recorded.")}><RefreshCw size={16} /> Rotate credential</button> : null}
            </div>
          </form>
        ) : <div className="empty-governance-state">Select a record to perform a controlled correction.</div>}
      </section>
    </GovernanceShell>
  );
}
