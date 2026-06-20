import { BadgeCheck, Building2, CalendarClock, FileCheck2 } from "lucide-react";
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
  { id: "permits", label: "Permits" },
  { id: "controls", label: "Fees And Conditions" },
  { id: "certificates", label: "Clearance" },
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
  if (["ISSUED", "ACTIVE", "APPROVED", "ASSESSED", "SATISFIED"].includes(status)) return "success";
  if (["DRAFT", "OPEN", "PENDING", "RECEIVED"].includes(status)) return "warning";
  if (["REFUSED", "EXPIRED", "CANCELLED"].includes(status)) return "danger";
  return "neutral";
}

const initialPremises = { subject_uid: "", premises_name_txt: "", activity_code: "", address_line1_txt: "", city_txt: "Apia", country_cd: "WS" };
const initialPermit = { subject_uid: "", revenue_kind_uid: "", premises_uid: "", permit_type_cd: "BUSINESS_LICENCE", permit_state_cd: "ISSUED", issue_dt: today(), expiry_dt: futureDate(365) };
const initialFee = { permit_uid: "", fee_amt: "", fee_state_cd: "ASSESSED" };
const initialCondition = { permit_uid: "", condition_type_cd: "OPERATING", condition_txt: "", compliance_state_cd: "PENDING", due_dt: futureDate(30) };
const initialRenewal = { permit_uid: "", renewal_state_cd: "OPEN", window_start_dt: today(), window_end_dt: futureDate(60) };
const initialClearanceRequest = { subject_uid: "", request_type_cd: "LICENCE_CLEARANCE", purpose_txt: "" };
const initialClearanceResult = { clearance_request_uid: "", result_cd: "APPROVED", issued_dt: today(), expiry_dt: futureDate(90), refusal_reason_txt: "" };

export default function LicensingPage() {
  const [activeTab, setActiveTab] = useState("permits");
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [lookups, setLookups] = useState({});
  const [premises, setPremises] = useState([]);
  const [permits, setPermits] = useState([]);
  const [fees, setFees] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [clearanceRequests, setClearanceRequests] = useState([]);
  const [clearanceResults, setClearanceResults] = useState([]);
  const [premisesForm, setPremisesForm] = useState(initialPremises);
  const [permitForm, setPermitForm] = useState(initialPermit);
  const [feeForm, setFeeForm] = useState(initialFee);
  const [conditionForm, setConditionForm] = useState(initialCondition);
  const [renewalForm, setRenewalForm] = useState(initialRenewal);
  const [clearanceRequestForm, setClearanceRequestForm] = useState(initialClearanceRequest);
  const [clearanceResultForm, setClearanceResultForm] = useState(initialClearanceResult);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const [overviewPayload, subjectsPayload, lookupsPayload, premisesPayload, permitsPayload, feesPayload, conditionsPayload, renewalsPayload, requestsPayload, resultsPayload] =
      await Promise.all([
        apiRequest("/api/licensing/overview"),
        apiRequest("/api/registry/subjects?pageSize=100"),
        apiRequest("/api/configuration/lookups"),
        apiRequest("/api/licensing/premises?pageSize=80"),
        apiRequest("/api/licensing/permits?pageSize=80"),
        apiRequest("/api/licensing/fees?pageSize=80"),
        apiRequest("/api/licensing/conditions?pageSize=80"),
        apiRequest("/api/licensing/renewals?pageSize=80"),
        apiRequest("/api/licensing/clearance-requests?pageSize=80"),
        apiRequest("/api/licensing/clearance-results?pageSize=80"),
      ]);
    setOverview(overviewPayload.overview);
    setSubjects(subjectsPayload.rows || []);
    setLookups(lookupsPayload.lookups || {});
    setPremises(premisesPayload.rows || []);
    setPermits(permitsPayload.rows || []);
    setFees(feesPayload.rows || []);
    setConditions(conditionsPayload.rows || []);
    setRenewals(renewalsPayload.rows || []);
    setClearanceRequests(requestsPayload.rows || []);
    setClearanceResults(resultsPayload.rows || []);
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

  function permitOptions() {
    return permits.map((permit) => (
      <option key={permit.permit_uid} value={permit.permit_uid}>
        {permit.permit_no} - {permit.display_name_txt}
      </option>
    ));
  }

  const premisesColumns = [
    { key: "premises_no", label: "Premises" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "premises_name_txt", label: "Name", render: (row) => row.premises_name_txt || "-" },
    { key: "activity_code", label: "Activity", render: (row) => row.activity_code || "-" },
    { key: "city_txt", label: "City", render: (row) => row.city_txt || "-" },
  ];
  const permitColumns = [
    { key: "permit_no", label: "Permit" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "permit_type_cd", label: "Type", render: (row) => compactCode(row.permit_type_cd) },
    { key: "expiry_dt", label: "Expiry", render: (row) => formatDate(row.expiry_dt) },
    { key: "permit_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.permit_state_cd)}>{compactCode(row.permit_state_cd)}</StatusPill> },
  ];
  const feeColumns = [
    { key: "permit_no", label: "Permit" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "fee_amt", label: "Fee", render: (row) => formatMoney(row.fee_amt) },
    { key: "assessment_dt", label: "Assessed", render: (row) => formatDate(row.assessment_dt) },
    { key: "fee_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.fee_state_cd)}>{compactCode(row.fee_state_cd)}</StatusPill> },
  ];
  const conditionColumns = [
    { key: "permit_no", label: "Permit" },
    { key: "condition_type_cd", label: "Type", render: (row) => compactCode(row.condition_type_cd) },
    { key: "condition_txt", label: "Condition" },
    { key: "due_dt", label: "Due", render: (row) => formatDate(row.due_dt) },
    { key: "compliance_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.compliance_state_cd)}>{compactCode(row.compliance_state_cd)}</StatusPill> },
  ];
  const renewalColumns = [
    { key: "renewal_no", label: "Renewal" },
    { key: "permit_no", label: "Permit" },
    { key: "window_start_dt", label: "Window start", render: (row) => formatDate(row.window_start_dt) },
    { key: "window_end_dt", label: "Window end", render: (row) => formatDate(row.window_end_dt) },
    { key: "renewal_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.renewal_state_cd)}>{compactCode(row.renewal_state_cd)}</StatusPill> },
  ];
  const requestColumns = [
    { key: "clearance_request_no", label: "Request" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "request_type_cd", label: "Type", render: (row) => compactCode(row.request_type_cd) },
    { key: "request_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.request_state_cd)}>{compactCode(row.request_state_cd)}</StatusPill> },
  ];
  const resultColumns = [
    { key: "certificate_no", label: "Certificate", render: (row) => row.certificate_no || "-" },
    { key: "clearance_request_no", label: "Request" },
    { key: "result_cd", label: "Result", render: (row) => <StatusPill tone={statusTone(row.result_cd)}>{compactCode(row.result_cd)}</StatusPill> },
    { key: "issued_dt", label: "Issued", render: (row) => formatDate(row.issued_dt) },
    { key: "expiry_dt", label: "Expiry", render: (row) => formatDate(row.expiry_dt) },
  ];

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Licences and certificates" title="Permits, Premises And Clearance Certificates" status="Operational" tone="success" />

      <div className="metric-grid">
        <MetricTile icon={BadgeCheck} label="Permits" value={formatNumber(overview?.permit_count)} />
        <MetricTile icon={Building2} label="Premises" value={formatNumber(overview?.premises_count)} />
        <MetricTile icon={CalendarClock} label="Open renewals" value={formatNumber(overview?.open_renewal_count)} />
        <MetricTile icon={FileCheck2} label="Clearance requests" value={formatNumber(overview?.clearance_request_count)} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "permits" ? (
        <div className="module-workbench">
          <section className="content-band">
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/licensing/premises", premisesForm, () => setPremisesForm(initialPremises), "Premises registered");
            }}>
              <SelectField label="Taxpayer" value={premisesForm.subject_uid} onChange={(value) => setPremisesForm({ ...premisesForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>{subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>)}
              </SelectField>
              <Field label="Premises name"><input value={premisesForm.premises_name_txt} onChange={(event) => setPremisesForm({ ...premisesForm, premises_name_txt: event.target.value })} /></Field>
              <Field label="Address"><input value={premisesForm.address_line1_txt} onChange={(event) => setPremisesForm({ ...premisesForm, address_line1_txt: event.target.value })} /></Field>
              <button className="secondary-button" type="submit">Register premises</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/licensing/permits", { ...permitForm, revenue_kind_uid: permitForm.revenue_kind_uid || null, premises_uid: permitForm.premises_uid || null }, () => setPermitForm(initialPermit), "Permit recorded");
            }}>
              <SelectField label="Taxpayer" value={permitForm.subject_uid} onChange={(value) => setPermitForm({ ...permitForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>{subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>)}
              </SelectField>
              <SelectField label="Premises" value={permitForm.premises_uid} onChange={(value) => setPermitForm({ ...permitForm, premises_uid: value })}>
                <option value="">No premises</option>{premises.map((item) => <option key={item.premises_uid} value={item.premises_uid}>{item.premises_no} - {item.premises_name_txt || item.display_name_txt}</option>)}
              </SelectField>
              <SelectField label="Revenue kind" value={permitForm.revenue_kind_uid} onChange={(value) => setPermitForm({ ...permitForm, revenue_kind_uid: value })}>
                <option value="">No fee revenue</option>{(lookups.revenue_kinds || []).map((kind) => <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>{kind.revenue_kind_name}</option>)}
              </SelectField>
              <div className="compact-form">
                <Field label="Permit type"><input value={permitForm.permit_type_cd} onChange={(event) => setPermitForm({ ...permitForm, permit_type_cd: event.target.value.toUpperCase() })} /></Field>
                <Field label="Expiry"><input type="date" value={permitForm.expiry_dt} onChange={(event) => setPermitForm({ ...permitForm, expiry_dt: event.target.value })} /></Field>
              </div>
              <button className="primary-button" type="submit">Record permit</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={permitColumns} rows={permits} keyField="permit_uid" empty="No permits" />
            <br />
            <DataTable columns={premisesColumns} rows={premises} keyField="premises_uid" empty="No premises" />
          </section>
        </div>
      ) : null}

      {activeTab === "controls" ? (
        <div className="module-workbench">
          <section className="content-band">
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/licensing/fees", { ...feeForm, fee_amt: Number(feeForm.fee_amt) }, () => setFeeForm(initialFee), "Licence fee assessed");
            }}>
              <SelectField label="Permit" value={feeForm.permit_uid} onChange={(value) => setFeeForm({ ...feeForm, permit_uid: value })}>
                <option value="">Select permit</option>{permitOptions()}
              </SelectField>
              <Field label="Fee amount"><input type="number" value={feeForm.fee_amt} onChange={(event) => setFeeForm({ ...feeForm, fee_amt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Assess fee</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/licensing/conditions", conditionForm, () => setConditionForm(initialCondition), "Licence condition recorded");
            }}>
              <SelectField label="Permit" value={conditionForm.permit_uid} onChange={(value) => setConditionForm({ ...conditionForm, permit_uid: value })}>
                <option value="">Select permit</option>{permitOptions()}
              </SelectField>
              <Field label="Condition type"><input value={conditionForm.condition_type_cd} onChange={(event) => setConditionForm({ ...conditionForm, condition_type_cd: event.target.value.toUpperCase() })} /></Field>
              <Field label="Condition"><textarea value={conditionForm.condition_txt} onChange={(event) => setConditionForm({ ...conditionForm, condition_txt: event.target.value })} /></Field>
              <button className="secondary-button" type="submit">Record condition</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/licensing/renewals", renewalForm, () => setRenewalForm(initialRenewal), "Renewal cycle opened");
            }}>
              <SelectField label="Permit" value={renewalForm.permit_uid} onChange={(value) => setRenewalForm({ ...renewalForm, permit_uid: value })}>
                <option value="">Select permit</option>{permitOptions()}
              </SelectField>
              <div className="compact-form">
                <Field label="Window start"><input type="date" value={renewalForm.window_start_dt} onChange={(event) => setRenewalForm({ ...renewalForm, window_start_dt: event.target.value })} /></Field>
                <Field label="Window end"><input type="date" value={renewalForm.window_end_dt} onChange={(event) => setRenewalForm({ ...renewalForm, window_end_dt: event.target.value })} /></Field>
              </div>
              <button className="secondary-button" type="submit">Open renewal</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={feeColumns} rows={fees} keyField="fee_assessment_uid" empty="No licence fees" />
            <br />
            <DataTable columns={conditionColumns} rows={conditions} keyField="condition_uid" empty="No conditions" />
            <br />
            <DataTable columns={renewalColumns} rows={renewals} keyField="renewal_cycle_uid" empty="No renewals" />
          </section>
        </div>
      ) : null}

      {activeTab === "certificates" ? (
        <div className="module-workbench">
          <section className="content-band">
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/licensing/clearance-requests", clearanceRequestForm, () => setClearanceRequestForm(initialClearanceRequest), "Clearance request received");
            }}>
              <SelectField label="Taxpayer" value={clearanceRequestForm.subject_uid} onChange={(value) => setClearanceRequestForm({ ...clearanceRequestForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>{subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>)}
              </SelectField>
              <Field label="Purpose"><textarea value={clearanceRequestForm.purpose_txt} onChange={(event) => setClearanceRequestForm({ ...clearanceRequestForm, purpose_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Receive request</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/licensing/clearance-results", { ...clearanceResultForm, refusal_reason_txt: clearanceResultForm.refusal_reason_txt || null }, () => setClearanceResultForm(initialClearanceResult), "Clearance result issued");
            }}>
              <SelectField label="Clearance request" value={clearanceResultForm.clearance_request_uid} onChange={(value) => setClearanceResultForm({ ...clearanceResultForm, clearance_request_uid: value })}>
                <option value="">Select request</option>{clearanceRequests.map((request) => <option key={request.clearance_request_uid} value={request.clearance_request_uid}>{request.clearance_request_no} - {request.display_name_txt}</option>)}
              </SelectField>
              <SelectField label="Result" value={clearanceResultForm.result_cd} onChange={(value) => setClearanceResultForm({ ...clearanceResultForm, result_cd: value })}>
                <option value="APPROVED">Approved</option><option value="REFUSED">Refused</option>
              </SelectField>
              <button className="secondary-button" type="submit">Issue result</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={requestColumns} rows={clearanceRequests} keyField="clearance_request_uid" empty="No clearance requests" />
            <br />
            <DataTable columns={resultColumns} rows={clearanceResults} keyField="clearance_result_uid" empty="No clearance results" />
          </section>
        </div>
      ) : null}
    </section>
  );
}
