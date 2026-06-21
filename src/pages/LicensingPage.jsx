import {
  BadgeCheck,
  Banknote,
  BookOpenCheck,
  Building2,
  CalendarClock,
  FileCheck2,
  FileText,
  History,
  Landmark,
  Link2,
  RefreshCw,
  ShieldAlert,
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
import AdvancedLifecycleGovernancePanel from "../components/governance/AdvancedLifecycleGovernancePanel.jsx";
import StatusPill from "../components/common/StatusPill.jsx";
import { apiRequest } from "../services/api.js";
import { compactCode, formatDate, formatDateTime, formatMoney, formatNumber } from "../utils/format.js";

const tabs = [
  { id: "workbench", label: "Workbench" },
  { id: "types", label: "Licence Types" },
  { id: "registry", label: "Registry" },
  { id: "fees", label: "Fees" },
  { id: "conditions", label: "Conditions" },
  { id: "renewals", label: "Renewals" },
  { id: "clearance", label: "Clearance" },
  { id: "governance", label: "Lifecycle Governance" },
  { id: "history", label: "Lifecycle" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function futureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function stripEmpty(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== "" && value !== null && value !== undefined));
}

function statusTone(value) {
  const status = String(value || "");
  if (["ISSUED", "ACTIVE", "APPROVED", "ASSESSED", "SATISFIED", "PAID", "CLEAR", "CONDITIONAL", "COMPLETED", "NOTICE_ISSUED"].includes(status)) return "success";
  if (["DRAFT", "SUBMITTED", "OPEN", "PENDING", "RECEIVED", "UNDER_REVIEW", "BILLED", "UNPAID"].includes(status)) return "warning";
  if (["REFUSED", "NOT_CLEAR", "EXPIRED", "CANCELLED", "SUSPENDED", "BREACHED", "REJECTED"].includes(status)) return "danger";
  return "neutral";
}

async function safeRequest(path, fallback) {
  try {
    return await apiRequest(path);
  } catch {
    return fallback;
  }
}

const initialFilters = { q: "", permit_state_cd: "", permit_category_cd: "", expiry_to_dt: "" };
const initialType = {
  licence_type_cd: "",
  licence_type_name: "",
  licence_category_cd: "GENERAL",
  revenue_kind_uid: "",
  revenue_component_uid: "",
  default_fee_amt: "",
  validity_days_no: 365,
  renewal_window_days_no: 60,
  approval_required_bool: true,
  clearance_required_bool: true,
  portal_enabled_bool: true,
};
const initialPremises = { subject_uid: "", premises_name_txt: "", activity_code: "", address_line1_txt: "", city_txt: "Apia", country_cd: "WS" };
const initialPermit = {
  subject_uid: "",
  revenue_kind_uid: "",
  premises_uid: "",
  permit_type_cd: "BUSINESS_LICENCE",
  permit_category_cd: "BUSINESS",
  licence_title_txt: "",
  application_reference_no: "",
  permit_state_cd: "DRAFT",
  issue_dt: today(),
  expiry_dt: futureDate(365),
  state_reason_txt: "",
};
const initialPermitState = { permit_uid: "", permit_state_cd: "APPROVED", state_reason_txt: "", override_hold_block_bool: false };
const initialFee = {
  permit_uid: "",
  revenue_kind_uid: "",
  revenue_component_uid: "",
  fee_basis_cd: "FIXED",
  quantity_no: 1,
  unit_fee_amt: "",
  discount_amt: "",
  tax_amt: "",
  fee_amt: "",
  due_dt: futureDate(30),
  fee_state_cd: "ASSESSED",
  payment_status_cd: "UNPAID",
};
const initialCondition = {
  permit_uid: "",
  condition_type_cd: "OPERATING",
  condition_txt: "",
  restriction_bool: false,
  compliance_state_cd: "PENDING",
  due_dt: futureDate(30),
};
const initialRenewal = {
  permit_uid: "",
  renewal_state_cd: "OPEN",
  window_start_dt: today(),
  window_end_dt: futureDate(60),
  renewal_application_dt: "",
  reassessed_fee_amt: "",
  renewal_notes_txt: "",
  override_hold_block_bool: false,
};
const initialClearanceRequest = { subject_uid: "", permit_uid: "", request_type_cd: "LICENCE_CLEARANCE", purpose_txt: "", requested_channel_cd: "STAFF" };
const initialClearanceResult = {
  clearance_request_uid: "",
  result_cd: "",
  issued_dt: today(),
  expiry_dt: futureDate(90),
  refusal_reason_txt: "",
  override_clearance_bool: false,
};

export default function LicensingPage() {
  const [activeTab, setActiveTab] = useState("workbench");
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [lookups, setLookups] = useState({});
  const [licenceTypes, setLicenceTypes] = useState([]);
  const [premises, setPremises] = useState([]);
  const [permits, setPermits] = useState([]);
  const [fees, setFees] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [clearanceRequests, setClearanceRequests] = useState([]);
  const [clearanceResults, setClearanceResults] = useState([]);
  const [lifecycleEvents, setLifecycleEvents] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [typeForm, setTypeForm] = useState(initialType);
  const [premisesForm, setPremisesForm] = useState(initialPremises);
  const [permitForm, setPermitForm] = useState(initialPermit);
  const [permitStateForm, setPermitStateForm] = useState(initialPermitState);
  const [feeForm, setFeeForm] = useState(initialFee);
  const [conditionForm, setConditionForm] = useState(initialCondition);
  const [renewalForm, setRenewalForm] = useState(initialRenewal);
  const [clearanceRequestForm, setClearanceRequestForm] = useState(initialClearanceRequest);
  const [clearanceResultForm, setClearanceResultForm] = useState(initialClearanceResult);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const revenueComponents = useMemo(
    () => (lookups.revenue_components || []).filter((component) => !typeForm.revenue_kind_uid || component.revenue_kind_uid === typeForm.revenue_kind_uid),
    [lookups.revenue_components, typeForm.revenue_kind_uid]
  );

  function filterQuery(extra = {}) {
    const params = new URLSearchParams(stripEmpty({ ...filters, ...extra }));
    params.set("pageSize", "150");
    return params.toString();
  }

  async function load() {
    setLoading(true);
    try {
      const [
        overviewPayload,
        subjectsPayload,
        lookupsPayload,
        typesPayload,
        premisesPayload,
        permitsPayload,
        feesPayload,
        conditionsPayload,
        renewalsPayload,
        requestsPayload,
        resultsPayload,
        lifecyclePayload,
      ] = await Promise.all([
        apiRequest("/api/licensing/overview"),
        apiRequest("/api/registry/subjects?pageSize=150"),
        apiRequest("/api/configuration/lookups"),
        apiRequest("/api/licensing/licence-types?pageSize=150"),
        apiRequest("/api/licensing/premises?pageSize=150"),
        apiRequest(`/api/licensing/permits?${filterQuery()}`),
        apiRequest("/api/licensing/fees?pageSize=150"),
        apiRequest("/api/licensing/conditions?pageSize=150"),
        apiRequest("/api/licensing/renewals?pageSize=150"),
        apiRequest("/api/licensing/clearance-requests?pageSize=150"),
        apiRequest("/api/licensing/clearance-results?pageSize=150"),
        safeRequest("/api/licensing/lifecycle-events?pageSize=150", { rows: [] }),
      ]);
      setOverview(overviewPayload.overview);
      setSubjects(subjectsPayload.rows || []);
      setLookups(lookupsPayload.lookups || {});
      setLicenceTypes(typesPayload.rows || []);
      setPremises(premisesPayload.rows || []);
      setPermits(permitsPayload.rows || []);
      setFees(feesPayload.rows || []);
      setConditions(conditionsPayload.rows || []);
      setRenewals(renewalsPayload.rows || []);
      setClearanceRequests(requestsPayload.rows || []);
      setClearanceResults(resultsPayload.rows || []);
      setLifecycleEvents(lifecyclePayload.rows || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load().catch((loadError) => setError(loadError.message));
  }, []);

  function subjectOptions() {
    return subjects.map((subject) => (
      <option key={subject.subject_uid} value={subject.subject_uid}>
        {subject.subject_no} - {subject.display_name_txt}
      </option>
    ));
  }

  function permitOptions() {
    return permits.map((permit) => (
      <option key={permit.permit_uid} value={permit.permit_uid}>
        {permit.permit_no} - {permit.display_name_txt}
      </option>
    ));
  }

  function revenueOptions() {
    return (lookups.revenue_kinds || []).map((kind) => <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>{kind.revenue_kind_name}</option>);
  }

  function syncLicenceType(licenceTypeCd) {
    const config = licenceTypes.find((item) => item.licence_type_cd === licenceTypeCd);
    setPermitForm({
      ...permitForm,
      permit_type_cd: licenceTypeCd,
      permit_category_cd: config?.licence_category_cd || permitForm.permit_category_cd,
      revenue_kind_uid: config?.revenue_kind_uid || permitForm.revenue_kind_uid,
      licence_title_txt: config?.licence_type_name || permitForm.licence_title_txt,
      expiry_dt: futureDate(config?.validity_days_no || 365),
    });
    setFeeForm({
      ...feeForm,
      revenue_kind_uid: config?.revenue_kind_uid || feeForm.revenue_kind_uid,
      revenue_component_uid: config?.revenue_component_uid || feeForm.revenue_component_uid,
      unit_fee_amt: config?.default_fee_amt || feeForm.unit_fee_amt,
      fee_amt: config?.default_fee_amt || feeForm.fee_amt,
    });
  }

  function syncPermit(permitUid, setter, current) {
    const permit = permits.find((item) => item.permit_uid === permitUid);
    setter({
      ...current,
      permit_uid: permitUid,
      revenue_kind_uid: permit?.revenue_kind_uid || current.revenue_kind_uid,
      subject_uid: permit?.subject_uid || current.subject_uid,
      fee_amt: current.fee_amt || permit?.default_fee_amt || "",
      unit_fee_amt: current.unit_fee_amt || permit?.default_fee_amt || "",
    });
  }

  async function submit(endpoint, body, reset, message, method = "POST") {
    setError("");
    setSuccess("");
    try {
      await apiRequest(endpoint, { method, body: stripEmpty(body) });
      reset?.();
      await load();
      setSuccess(message);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function action(endpoint, body, message, method = "POST") {
    setError("");
    setSuccess("");
    try {
      await apiRequest(endpoint, { method, body: stripEmpty(body || {}) });
      await load();
      setSuccess(message);
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  function seedPermit(row) {
    setPermitStateForm({ ...initialPermitState, permit_uid: row.permit_uid, permit_state_cd: row.permit_state_cd === "DRAFT" ? "SUBMITTED" : "ACTIVE" });
    setFeeForm({ ...initialFee, permit_uid: row.permit_uid, revenue_kind_uid: row.revenue_kind_uid || "", fee_amt: row.default_fee_amt || "", unit_fee_amt: row.default_fee_amt || "" });
    setConditionForm({ ...initialCondition, permit_uid: row.permit_uid });
    setRenewalForm({ ...initialRenewal, permit_uid: row.permit_uid, window_end_dt: row.expiry_dt || initialRenewal.window_end_dt });
    setClearanceRequestForm({ ...initialClearanceRequest, subject_uid: row.subject_uid, permit_uid: row.permit_uid, purpose_txt: `${row.permit_no} clearance check` });
    setActiveTab("fees");
  }

  const permitColumns = [
    { key: "permit_no", label: "Permit" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "licence_type_name", label: "Type", render: (row) => row.licence_type_name || compactCode(row.permit_type_cd) },
    { key: "premises_name_txt", label: "Premises", render: (row) => row.premises_name_txt || "-" },
    { key: "expiry_dt", label: "Expiry", render: (row) => formatDate(row.expiry_dt) },
    { key: "unpaid_fee_amt", label: "Unpaid", render: (row) => formatMoney(row.unpaid_fee_amt) },
    { key: "restriction_count", label: "Restrictions", render: (row) => formatNumber(row.restriction_count) },
    { key: "permit_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.permit_state_cd)}>{compactCode(row.permit_state_cd)}</StatusPill> },
    {
      key: "actions",
      label: "Action",
      render: (row) => <button className="secondary-button secondary-button--compact" type="button" onClick={() => seedPermit(row)}>Open</button>,
    },
  ];

  const typeColumns = [
    { key: "licence_type_cd", label: "Code" },
    { key: "licence_type_name", label: "Name" },
    { key: "licence_category_cd", label: "Category", render: (row) => compactCode(row.licence_category_cd) },
    { key: "default_fee_amt", label: "Default fee", render: (row) => formatMoney(row.default_fee_amt) },
    { key: "validity_days_no", label: "Validity", render: (row) => `${formatNumber(row.validity_days_no)} days` },
    { key: "portal_enabled_bool", label: "Portal", render: (row) => row.portal_enabled_bool ? "Enabled" : "Internal" },
  ];

  const premisesColumns = [
    { key: "premises_no", label: "Premises" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "premises_name_txt", label: "Name", render: (row) => row.premises_name_txt || "-" },
    { key: "activity_code", label: "Activity", render: (row) => row.activity_code || "-" },
    { key: "city_txt", label: "City", render: (row) => row.city_txt || "-" },
  ];

  const feeColumns = [
    { key: "permit_no", label: "Permit" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "component_name", label: "Component", render: (row) => row.component_name || "-" },
    { key: "fee_amt", label: "Fee", render: (row) => formatMoney(row.fee_amt) },
    { key: "liability_notice_no", label: "Notice", render: (row) => row.liability_notice_no || "-" },
    { key: "payment_status_cd", label: "Payment", render: (row) => <StatusPill tone={statusTone(row.payment_status_cd)}>{compactCode(row.payment_status_cd)}</StatusPill> },
    {
      key: "bill",
      label: "Bill",
      render: (row) => (
        <button className="table-action-button" type="button" disabled={Boolean(row.liability_notice_uid)} onClick={() => action(`/api/licensing/fees/${row.fee_assessment_uid}/create-liability`, { workflow_action_cd: "ISSUE" }, `Liability notice created for ${row.permit_no}.`)}>
          <Banknote size={15} /> Bill
        </button>
      ),
    },
  ];

  const conditionColumns = [
    { key: "permit_no", label: "Permit" },
    { key: "condition_type_cd", label: "Type", render: (row) => compactCode(row.condition_type_cd) },
    { key: "condition_txt", label: "Condition" },
    { key: "restriction_bool", label: "Restriction", render: (row) => row.restriction_bool ? "Yes" : "No" },
    { key: "due_dt", label: "Due", render: (row) => formatDate(row.due_dt) },
    { key: "compliance_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.compliance_state_cd)}>{compactCode(row.compliance_state_cd)}</StatusPill> },
  ];

  const renewalColumns = [
    { key: "renewal_no", label: "Renewal" },
    { key: "permit_no", label: "Permit" },
    { key: "window_end_dt", label: "Window end", render: (row) => formatDate(row.window_end_dt) },
    { key: "reassessed_fee_amt", label: "Fee", render: (row) => formatMoney(row.reassessed_fee_amt) },
    { key: "approval_request_no", label: "Approval", render: (row) => row.approval_request_no || "-" },
    { key: "renewal_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.renewal_state_cd)}>{compactCode(row.renewal_state_cd)}</StatusPill> },
    {
      key: "approval",
      label: "Request",
      render: (row) => (
        <button className="table-action-button" type="button" disabled={Boolean(row.approval_request_uid)} onClick={() => action(`/api/licensing/renewals/${row.renewal_cycle_uid}/request-approval`, {}, `Renewal approval requested for ${row.permit_no}.`)}>
          <ShieldCheck size={15} /> Approval
        </button>
      ),
    },
  ];

  const requestColumns = [
    { key: "clearance_request_no", label: "Request" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "permit_no", label: "Permit", render: (row) => row.permit_no || "-" },
    { key: "request_type_cd", label: "Type", render: (row) => compactCode(row.request_type_cd) },
    { key: "request_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.request_state_cd)}>{compactCode(row.request_state_cd)}</StatusPill> },
  ];

  const resultColumns = [
    { key: "certificate_no", label: "Certificate", render: (row) => row.certificate_no || "-" },
    { key: "clearance_request_no", label: "Request" },
    { key: "result_cd", label: "Result", render: (row) => <StatusPill tone={statusTone(row.result_cd)}>{compactCode(row.result_cd)}</StatusPill> },
    { key: "issued_dt", label: "Issued", render: (row) => formatDate(row.issued_dt) },
    { key: "content_no", label: "Document", render: (row) => row.content_no || "-" },
    {
      key: "generate",
      label: "Generate",
      render: (row) => (
        <button className="table-action-button" type="button" disabled={Boolean(row.content_record_uid) || row.result_cd === "NOT_CLEAR"} onClick={() => action(`/api/licensing/clearance-results/${row.clearance_result_uid}/generate-certificate`, {}, `Certificate generated for ${row.clearance_request_no}.`)}>
          <FileCheck2 size={15} /> Certificate
        </button>
      ),
    },
  ];

  const lifecycleColumns = [
    { key: "event_ts", label: "Time", render: (row) => formatDateTime(row.event_ts) },
    { key: "permit_no", label: "Permit" },
    { key: "event_type_cd", label: "Event", render: (row) => compactCode(row.event_type_cd) },
    { key: "from_permit_state_cd", label: "From", render: (row) => compactCode(row.from_permit_state_cd) },
    { key: "to_permit_state_cd", label: "To", render: (row) => compactCode(row.to_permit_state_cd) },
    { key: "created_by_name_txt", label: "Officer", render: (row) => row.created_by_name_txt || "-" },
  ];

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Licences and certificates" title="Permit, Renewal And Clearance Control" status={loading ? "Refreshing" : "Operational"} tone="success" />

      <div className="metric-grid">
        <MetricTile icon={BadgeCheck} label="Permits" value={formatNumber(overview?.permit_count)} sublabel={`${formatNumber(overview?.active_permit_count)} active`} />
        <MetricTile icon={Building2} label="Premises" value={formatNumber(overview?.premises_count)} sublabel={`${formatNumber(overview?.licence_type_count)} configured types`} />
        <MetricTile icon={Banknote} label="Unpaid fees" value={formatMoney(overview?.unpaid_fee_total_amt)} sublabel={`${formatNumber(overview?.pending_condition_count)} pending conditions`} />
        <MetricTile icon={FileCheck2} label="Clearance" value={formatNumber(overview?.open_clearance_request_count)} sublabel={`${formatNumber(overview?.issued_certificate_count)} certificates`} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === "governance" ? <AdvancedLifecycleGovernancePanel moduleKey="licensing" /> : null}

      <FormAlert error={error} success={success} />

      {activeTab === "workbench" ? (
        <div className="module-workbench module-workbench--wide">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Permit queue</span>
                <h2>Search Permits, Expiry, Fees And Restrictions</h2>
              </div>
              <RefreshCw size={22} />
            </div>
            <form className="compliance-filter-bar" onSubmit={(event) => { event.preventDefault(); void load().catch((loadError) => setError(loadError.message)); }}>
              <Field label="Search"><input value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} /></Field>
              <SelectField label="State" value={filters.permit_state_cd} onChange={(value) => setFilters({ ...filters, permit_state_cd: value })}>
                <option value="">All states</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="APPROVED">Approved</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
              </SelectField>
              <Field label="Expiry by"><input type="date" value={filters.expiry_to_dt} onChange={(event) => setFilters({ ...filters, expiry_to_dt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Search permits</button>
            </form>
            <DataTable columns={permitColumns} rows={permits} keyField="permit_uid" empty="No permits match the current filters" />
          </section>
        </div>
      ) : null}

      {activeTab === "types" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading"><div><span>Configuration</span><h2>Licence Type And Fee Rules</h2></div><Landmark size={22} /></div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/licensing/licence-types", {
                ...typeForm,
                default_fee_amt: typeForm.default_fee_amt || 0,
                validity_days_no: Number(typeForm.validity_days_no || 365),
                renewal_window_days_no: Number(typeForm.renewal_window_days_no || 60),
              }, () => setTypeForm(initialType), "Licence type saved.");
            }}>
              <div className="compact-form">
                <Field label="Code"><input required value={typeForm.licence_type_cd} onChange={(event) => setTypeForm({ ...typeForm, licence_type_cd: event.target.value.toUpperCase() })} /></Field>
                <Field label="Name"><input required value={typeForm.licence_type_name} onChange={(event) => setTypeForm({ ...typeForm, licence_type_name: event.target.value })} /></Field>
              </div>
              <div className="compact-form">
                <Field label="Category"><input value={typeForm.licence_category_cd} onChange={(event) => setTypeForm({ ...typeForm, licence_category_cd: event.target.value.toUpperCase() })} /></Field>
                <Field label="Default fee"><input type="number" value={typeForm.default_fee_amt} onChange={(event) => setTypeForm({ ...typeForm, default_fee_amt: event.target.value })} /></Field>
              </div>
              <SelectField label="Revenue kind" value={typeForm.revenue_kind_uid} onChange={(value) => setTypeForm({ ...typeForm, revenue_kind_uid: value, revenue_component_uid: "" })}>
                <option value="">No revenue mapping</option>{revenueOptions()}
              </SelectField>
              <SelectField label="Revenue component" value={typeForm.revenue_component_uid} onChange={(value) => setTypeForm({ ...typeForm, revenue_component_uid: value })}>
                <option value="">No component</option>{revenueComponents.map((component) => <option key={component.revenue_component_uid} value={component.revenue_component_uid}>{component.component_name}</option>)}
              </SelectField>
              <div className="compact-form">
                <Field label="Validity days"><input type="number" value={typeForm.validity_days_no} onChange={(event) => setTypeForm({ ...typeForm, validity_days_no: event.target.value })} /></Field>
                <Field label="Renewal window"><input type="number" value={typeForm.renewal_window_days_no} onChange={(event) => setTypeForm({ ...typeForm, renewal_window_days_no: event.target.value })} /></Field>
              </div>
              <button className="primary-button" type="submit">Save type</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={typeColumns} rows={licenceTypes} keyField="licence_type_config_uid" empty="No licence types configured" />
          </section>
        </div>
      ) : null}

      {activeTab === "registry" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading"><div><span>Registry</span><h2>Premises And Permit Registration</h2></div><BookOpenCheck size={22} /></div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/licensing/premises", premisesForm, () => setPremisesForm(initialPremises), "Premises registered.");
            }}>
              <SelectField label="Taxpayer" required value={premisesForm.subject_uid} onChange={(value) => setPremisesForm({ ...premisesForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>{subjectOptions()}
              </SelectField>
              <Field label="Premises name"><input value={premisesForm.premises_name_txt} onChange={(event) => setPremisesForm({ ...premisesForm, premises_name_txt: event.target.value })} /></Field>
              <Field label="Address"><input value={premisesForm.address_line1_txt} onChange={(event) => setPremisesForm({ ...premisesForm, address_line1_txt: event.target.value })} /></Field>
              <button className="secondary-button" type="submit">Register premises</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/licensing/permits", permitForm, () => setPermitForm(initialPermit), "Permit recorded.");
            }}>
              <SelectField label="Taxpayer" required value={permitForm.subject_uid} onChange={(value) => setPermitForm({ ...permitForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>{subjectOptions()}
              </SelectField>
              <SelectField label="Licence type" value={permitForm.permit_type_cd} onChange={syncLicenceType}>
                {licenceTypes.map((type) => <option key={type.licence_type_cd} value={type.licence_type_cd}>{type.licence_type_name}</option>)}
              </SelectField>
              <SelectField label="Premises" value={permitForm.premises_uid} onChange={(value) => setPermitForm({ ...permitForm, premises_uid: value })}>
                <option value="">No premises</option>{premises.map((item) => <option key={item.premises_uid} value={item.premises_uid}>{item.premises_no} - {item.premises_name_txt || item.display_name_txt}</option>)}
              </SelectField>
              <div className="compact-form">
                <SelectField label="State" value={permitForm.permit_state_cd} onChange={(value) => setPermitForm({ ...permitForm, permit_state_cd: value })}>
                  <option value="DRAFT">Draft</option><option value="SUBMITTED">Submitted</option><option value="APPROVED">Approved</option><option value="ACTIVE">Active</option>
                </SelectField>
                <Field label="Expiry"><input type="date" value={permitForm.expiry_dt} onChange={(event) => setPermitForm({ ...permitForm, expiry_dt: event.target.value })} /></Field>
              </div>
              <Field label="Title"><input value={permitForm.licence_title_txt} onChange={(event) => setPermitForm({ ...permitForm, licence_title_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Record permit</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={permitColumns} rows={permits} keyField="permit_uid" empty="No permits recorded" />
            <DataTable columns={premisesColumns} rows={premises} keyField="premises_uid" empty="No premises recorded" />
          </section>
        </div>
      ) : null}

      {activeTab === "fees" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading"><div><span>Financial control</span><h2>Assess Fees And Create Liability Notices</h2></div><Banknote size={22} /></div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/licensing/fees", {
                ...feeForm,
                quantity_no: Number(feeForm.quantity_no || 1),
                unit_fee_amt: feeForm.unit_fee_amt || null,
                discount_amt: feeForm.discount_amt || 0,
                tax_amt: feeForm.tax_amt || 0,
                fee_amt: feeForm.fee_amt || null,
              }, () => setFeeForm(initialFee), "Licence fee assessed.");
            }}>
              <SelectField label="Permit" required value={feeForm.permit_uid} onChange={(value) => syncPermit(value, setFeeForm, feeForm)}>
                <option value="">Select permit</option>{permitOptions()}
              </SelectField>
              <SelectField label="Revenue kind" value={feeForm.revenue_kind_uid} onChange={(value) => setFeeForm({ ...feeForm, revenue_kind_uid: value })}>
                <option value="">Permit default</option>{revenueOptions()}
              </SelectField>
              <div className="compact-form">
                <Field label="Unit fee"><input type="number" value={feeForm.unit_fee_amt} onChange={(event) => setFeeForm({ ...feeForm, unit_fee_amt: event.target.value, fee_amt: event.target.value })} /></Field>
                <Field label="Total fee"><input type="number" value={feeForm.fee_amt} onChange={(event) => setFeeForm({ ...feeForm, fee_amt: event.target.value })} /></Field>
              </div>
              <Field label="Due date"><input type="date" value={feeForm.due_dt} onChange={(event) => setFeeForm({ ...feeForm, due_dt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Assess fee</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              if (!permitStateForm.permit_uid) return;
              void submit(`/api/licensing/permits/${permitStateForm.permit_uid}/state`, permitStateForm, () => setPermitStateForm(initialPermitState), "Permit state updated.", "PATCH");
            }}>
              <SelectField label="Permit" required value={permitStateForm.permit_uid} onChange={(value) => setPermitStateForm({ ...permitStateForm, permit_uid: value })}>
                <option value="">Select permit</option>{permitOptions()}
              </SelectField>
              <SelectField label="New state" value={permitStateForm.permit_state_cd} onChange={(value) => setPermitStateForm({ ...permitStateForm, permit_state_cd: value })}>
                <option value="SUBMITTED">Submitted</option><option value="APPROVED">Approved</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="EXPIRED">Expired</option><option value="CANCELLED">Cancelled</option>
              </SelectField>
              <Field label="Reason"><textarea value={permitStateForm.state_reason_txt} onChange={(event) => setPermitStateForm({ ...permitStateForm, state_reason_txt: event.target.value })} /></Field>
              <button className="secondary-button" type="submit">Update permit state</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={feeColumns} rows={fees} keyField="fee_assessment_uid" empty="No licence fees assessed" />
          </section>
        </div>
      ) : null}

      {activeTab === "conditions" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading"><div><span>Restrictions</span><h2>Conditions, Holds And Enforcement Links</h2></div><ShieldAlert size={22} /></div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/licensing/conditions", conditionForm, () => setConditionForm(initialCondition), "Licence condition recorded.");
            }}>
              <SelectField label="Permit" required value={conditionForm.permit_uid} onChange={(value) => setConditionForm({ ...conditionForm, permit_uid: value })}>
                <option value="">Select permit</option>{permitOptions()}
              </SelectField>
              <div className="compact-form">
                <Field label="Type"><input value={conditionForm.condition_type_cd} onChange={(event) => setConditionForm({ ...conditionForm, condition_type_cd: event.target.value.toUpperCase() })} /></Field>
                <SelectField label="State" value={conditionForm.compliance_state_cd} onChange={(value) => setConditionForm({ ...conditionForm, compliance_state_cd: value })}>
                  <option value="PENDING">Pending</option><option value="DUE">Due</option><option value="SATISFIED">Satisfied</option><option value="BREACHED">Breached</option>
                </SelectField>
              </div>
              <label className="check-control"><input type="checkbox" checked={conditionForm.restriction_bool} onChange={(event) => setConditionForm({ ...conditionForm, restriction_bool: event.target.checked })} /><span>Blocks or restricts licence activity</span></label>
              <Field label="Condition"><textarea required value={conditionForm.condition_txt} onChange={(event) => setConditionForm({ ...conditionForm, condition_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Record condition</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={conditionColumns} rows={conditions} keyField="condition_uid" empty="No licence conditions recorded" />
          </section>
        </div>
      ) : null}

      {activeTab === "renewals" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading"><div><span>Renewals</span><h2>Renewal Applications And Approval Routing</h2></div><CalendarClock size={22} /></div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/licensing/renewals", { ...renewalForm, reassessed_fee_amt: renewalForm.reassessed_fee_amt || 0 }, () => setRenewalForm(initialRenewal), "Renewal cycle opened.");
            }}>
              <SelectField label="Permit" required value={renewalForm.permit_uid} onChange={(value) => syncPermit(value, setRenewalForm, renewalForm)}>
                <option value="">Select permit</option>{permitOptions()}
              </SelectField>
              <div className="compact-form">
                <Field label="Window start"><input type="date" value={renewalForm.window_start_dt} onChange={(event) => setRenewalForm({ ...renewalForm, window_start_dt: event.target.value })} /></Field>
                <Field label="Window end"><input type="date" value={renewalForm.window_end_dt} onChange={(event) => setRenewalForm({ ...renewalForm, window_end_dt: event.target.value })} /></Field>
              </div>
              <Field label="Reassessed fee"><input type="number" value={renewalForm.reassessed_fee_amt} onChange={(event) => setRenewalForm({ ...renewalForm, reassessed_fee_amt: event.target.value })} /></Field>
              <Field label="Notes"><textarea value={renewalForm.renewal_notes_txt} onChange={(event) => setRenewalForm({ ...renewalForm, renewal_notes_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Open renewal</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={renewalColumns} rows={renewals} keyField="renewal_cycle_uid" empty="No renewal cycles recorded" />
          </section>
        </div>
      ) : null}

      {activeTab === "clearance" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading"><div><span>Clearance</span><h2>Automatic Checks And Certificate Issue</h2></div><FileCheck2 size={22} /></div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/licensing/clearance-requests", clearanceRequestForm, () => setClearanceRequestForm(initialClearanceRequest), "Clearance request received.");
            }}>
              <SelectField label="Taxpayer" value={clearanceRequestForm.subject_uid} onChange={(value) => setClearanceRequestForm({ ...clearanceRequestForm, subject_uid: value })}>
                <option value="">Use selected permit taxpayer</option>{subjectOptions()}
              </SelectField>
              <SelectField label="Permit" value={clearanceRequestForm.permit_uid} onChange={(value) => syncPermit(value, setClearanceRequestForm, clearanceRequestForm)}>
                <option value="">No permit context</option>{permitOptions()}
              </SelectField>
              <Field label="Purpose"><textarea value={clearanceRequestForm.purpose_txt} onChange={(event) => setClearanceRequestForm({ ...clearanceRequestForm, purpose_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Receive request</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/licensing/clearance-results", clearanceResultForm, () => setClearanceResultForm(initialClearanceResult), "Clearance checks completed.");
            }}>
              <SelectField label="Clearance request" required value={clearanceResultForm.clearance_request_uid} onChange={(value) => setClearanceResultForm({ ...clearanceResultForm, clearance_request_uid: value })}>
                <option value="">Select request</option>{clearanceRequests.map((request) => <option key={request.clearance_request_uid} value={request.clearance_request_uid}>{request.clearance_request_no} - {request.display_name_txt}</option>)}
              </SelectField>
              <SelectField label="Manual result" value={clearanceResultForm.result_cd} onChange={(value) => setClearanceResultForm({ ...clearanceResultForm, result_cd: value })}>
                <option value="">Use automatic checks</option><option value="CLEAR">Clear</option><option value="CONDITIONAL">Conditional</option><option value="NOT_CLEAR">Not clear</option>
              </SelectField>
              <Field label="Reason or refusal notes"><textarea value={clearanceResultForm.refusal_reason_txt} onChange={(event) => setClearanceResultForm({ ...clearanceResultForm, refusal_reason_txt: event.target.value })} /></Field>
              <button className="secondary-button" type="submit">Complete checks</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={requestColumns} rows={clearanceRequests} keyField="clearance_request_uid" empty="No clearance requests" />
            <DataTable columns={resultColumns} rows={clearanceResults} keyField="clearance_result_uid" empty="No clearance results" />
          </section>
        </div>
      ) : null}

      {activeTab === "history" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading"><div><span>Approval and lifecycle</span><h2>Licence Decision Trail</h2></div><History size={22} /></div>
            <DataTable columns={lifecycleColumns} rows={lifecycleEvents} keyField="licence_lifecycle_event_uid" empty="No licence lifecycle events recorded" />
          </section>
          <section className="content-band">
            <div className="section-heading"><div><span>Certificates</span><h2>Generated Permit And Clearance Documents</h2></div><FileText size={22} /></div>
            <DataTable columns={resultColumns} rows={clearanceResults} keyField="clearance_result_uid" empty="No generated clearance certificates" />
            <DataTable
              columns={[
                { key: "permit_no", label: "Permit" },
                { key: "display_name_txt", label: "Taxpayer" },
                { key: "certificate_no", label: "Document", render: (row) => row.certificate_no || "-" },
                {
                  key: "generate",
                  label: "Generate",
                  render: (row) => (
                    <button className="table-action-button" type="button" disabled={Boolean(row.certificate_content_uid)} onClick={() => action(`/api/licensing/permits/${row.permit_uid}/generate-certificate`, {}, `Permit certificate generated for ${row.permit_no}.`)}>
                      <Link2 size={15} /> Certificate
                    </button>
                  ),
                },
              ]}
              rows={permits}
              keyField="permit_uid"
              empty="No permit certificate records"
            />
          </section>
        </div>
      ) : null}
    </section>
  );
}
