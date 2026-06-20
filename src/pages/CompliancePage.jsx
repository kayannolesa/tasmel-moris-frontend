import { AlertTriangle, ClipboardList, FileSearch, ShieldCheck } from "lucide-react";
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
  { id: "risk", label: "Risk" },
  { id: "plans", label: "Plans" },
  { id: "audits", label: "Audit" },
  { id: "investigations", label: "Investigations" },
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
  if (["LOW", "CLOSED", "COMPLETE", "SATISFIED", "ACCEPTED"].includes(status)) return "success";
  if (["MEDIUM", "OPEN", "DRAFT", "PLANNED", "ISSUED", "LODGED"].includes(status)) return "warning";
  if (["HIGH", "CRITICAL", "RESTRICTED", "ESCALATED"].includes(status)) return "danger";
  return "neutral";
}

const initialRisk = {
  subject_uid: "",
  revenue_kind_uid: "",
  risk_scope_cd: "TAXPAYER",
  risk_score_no: 65,
  risk_rating_cd: "MEDIUM",
  model_version_txt: "OFFICER_ASSESSMENT_V1",
  signal_name: "Officer risk indicator",
  signal_weight_no: 1,
  signal_value_txt: "",
};
const initialPlan = { plan_name: "", plan_type_cd: "TARGETED_COMPLIANCE", start_dt: today(), end_dt: futureDate(90), plan_state_cd: "ACTIVE" };
const initialAction = { compliance_plan_uid: "", subject_uid: "", revenue_kind_uid: "", action_type_cd: "REVIEW", opened_dt: today() };
const initialAudit = { subject_uid: "", revenue_kind_uid: "", compliance_action_uid: "", scope_txt: "", audit_state_cd: "PLANNED", start_dt: today() };
const initialFinding = { audit_engagement_uid: "", finding_type_cd: "UNDER_DECLARATION", finding_txt: "", proposed_adjustment_amt: "" };
const initialInfo = { subject_uid: "", audit_engagement_uid: "", request_type_cd: "DOCUMENTS", request_txt: "", issued_dt: today(), due_dt: futureDate(14), request_state_cd: "ISSUED" };
const initialInvestigation = { subject_uid: "", investigation_type_cd: "COMPLIANCE", restriction_level_cd: "RESTRICTED", summary_txt: "" };
const initialEvidence = { investigation_file_uid: "", audit_engagement_uid: "", content_record_uid: "", evidence_type_cd: "DOCUMENT", description_txt: "" };
const initialDisclosure = { subject_uid: "", revenue_kind_uid: "", disclosure_summary_txt: "", estimated_liability_amt: "", relief_decision_cd: "" };

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState("risk");
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [lookups, setLookups] = useState({});
  const [contentRecords, setContentRecords] = useState([]);
  const [riskProfiles, setRiskProfiles] = useState([]);
  const [signals, setSignals] = useState([]);
  const [plans, setPlans] = useState([]);
  const [actions, setActions] = useState([]);
  const [audits, setAudits] = useState([]);
  const [findings, setFindings] = useState([]);
  const [infoRequests, setInfoRequests] = useState([]);
  const [investigations, setInvestigations] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [disclosures, setDisclosures] = useState([]);
  const [riskForm, setRiskForm] = useState(initialRisk);
  const [planForm, setPlanForm] = useState(initialPlan);
  const [actionForm, setActionForm] = useState(initialAction);
  const [auditForm, setAuditForm] = useState(initialAudit);
  const [findingForm, setFindingForm] = useState(initialFinding);
  const [infoForm, setInfoForm] = useState(initialInfo);
  const [investigationForm, setInvestigationForm] = useState(initialInvestigation);
  const [evidenceForm, setEvidenceForm] = useState(initialEvidence);
  const [disclosureForm, setDisclosureForm] = useState(initialDisclosure);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const [
      overviewPayload,
      subjectsPayload,
      lookupsPayload,
      contentPayload,
      riskPayload,
      signalPayload,
      planPayload,
      actionPayload,
      auditPayload,
      findingPayload,
      infoPayload,
      investigationPayload,
      evidencePayload,
      disclosurePayload,
    ] = await Promise.all([
      apiRequest("/api/compliance/overview"),
      apiRequest("/api/registry/subjects?pageSize=100"),
      apiRequest("/api/configuration/lookups"),
      apiRequest("/api/documents/content-records?pageSize=100"),
      apiRequest("/api/compliance/risk-profiles?pageSize=80"),
      apiRequest("/api/compliance/risk-signals?pageSize=80"),
      apiRequest("/api/compliance/plans?pageSize=80"),
      apiRequest("/api/compliance/actions?pageSize=80"),
      apiRequest("/api/compliance/audits?pageSize=80"),
      apiRequest("/api/compliance/audit-findings?pageSize=80"),
      apiRequest("/api/compliance/information-requests?pageSize=80"),
      apiRequest("/api/compliance/investigations?pageSize=80"),
      apiRequest("/api/compliance/evidence?pageSize=80"),
      apiRequest("/api/compliance/voluntary-disclosures?pageSize=80"),
    ]);

    setOverview(overviewPayload.overview);
    setSubjects(subjectsPayload.rows || []);
    setLookups(lookupsPayload.lookups || {});
    setContentRecords(contentPayload.rows || []);
    setRiskProfiles(riskPayload.rows || []);
    setSignals(signalPayload.rows || []);
    setPlans(planPayload.rows || []);
    setActions(actionPayload.rows || []);
    setAudits(auditPayload.rows || []);
    setFindings(findingPayload.rows || []);
    setInfoRequests(infoPayload.rows || []);
    setInvestigations(investigationPayload.rows || []);
    setEvidence(evidencePayload.rows || []);
    setDisclosures(disclosurePayload.rows || []);
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

  const riskColumns = [
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "risk_scope_cd", label: "Scope", render: (row) => compactCode(row.risk_scope_cd) },
    { key: "risk_score_no", label: "Score", render: (row) => formatNumber(row.risk_score_no) },
    { key: "signal_count", label: "Signals", render: (row) => formatNumber(row.signal_count) },
    { key: "risk_rating_cd", label: "Rating", render: (row) => <StatusPill tone={statusTone(row.risk_rating_cd)}>{compactCode(row.risk_rating_cd)}</StatusPill> },
  ];
  const signalColumns = [
    { key: "signal_name", label: "Signal" },
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "signal_weight_no", label: "Weight", render: (row) => formatNumber(row.signal_weight_no) },
    { key: "signal_value_txt", label: "Value", render: (row) => row.signal_value_txt || "-" },
  ];
  const planColumns = [
    { key: "plan_name", label: "Plan" },
    { key: "plan_type_cd", label: "Type", render: (row) => compactCode(row.plan_type_cd) },
    { key: "action_count", label: "Actions", render: (row) => formatNumber(row.action_count) },
    { key: "plan_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.plan_state_cd)}>{compactCode(row.plan_state_cd)}</StatusPill> },
  ];
  const actionColumns = [
    { key: "action_no", label: "Action" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "plan_name", label: "Plan", render: (row) => row.plan_name || "-" },
    { key: "action_type_cd", label: "Type", render: (row) => compactCode(row.action_type_cd) },
    { key: "action_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.action_state_cd)}>{compactCode(row.action_state_cd)}</StatusPill> },
  ];
  const auditColumns = [
    { key: "audit_no", label: "Audit" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "finding_count", label: "Findings", render: (row) => formatNumber(row.finding_count) },
    { key: "start_dt", label: "Start", render: (row) => formatDate(row.start_dt) },
    { key: "audit_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.audit_state_cd)}>{compactCode(row.audit_state_cd)}</StatusPill> },
  ];
  const findingColumns = [
    { key: "audit_no", label: "Audit" },
    { key: "finding_type_cd", label: "Finding", render: (row) => compactCode(row.finding_type_cd) },
    { key: "proposed_adjustment_amt", label: "Adjustment", render: (row) => formatMoney(row.proposed_adjustment_amt) },
    { key: "finding_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.finding_state_cd)}>{compactCode(row.finding_state_cd)}</StatusPill> },
  ];
  const infoColumns = [
    { key: "request_no", label: "Request" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "request_type_cd", label: "Type", render: (row) => compactCode(row.request_type_cd) },
    { key: "due_dt", label: "Due", render: (row) => formatDate(row.due_dt) },
    { key: "request_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.request_state_cd)}>{compactCode(row.request_state_cd)}</StatusPill> },
  ];
  const investigationColumns = [
    { key: "investigation_no", label: "Investigation" },
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "investigation_type_cd", label: "Type", render: (row) => compactCode(row.investigation_type_cd) },
    { key: "evidence_count", label: "Evidence", render: (row) => formatNumber(row.evidence_count) },
    { key: "investigation_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.investigation_state_cd)}>{compactCode(row.investigation_state_cd)}</StatusPill> },
  ];
  const evidenceColumns = [
    { key: "evidence_no", label: "Evidence" },
    { key: "investigation_no", label: "Investigation", render: (row) => row.investigation_no || row.audit_no || "-" },
    { key: "evidence_type_cd", label: "Type", render: (row) => compactCode(row.evidence_type_cd) },
    { key: "file_name_txt", label: "Document", render: (row) => row.file_name_txt || row.content_no || "-" },
    { key: "custody_state_cd", label: "Custody", render: (row) => <StatusPill tone={statusTone(row.custody_state_cd)}>{compactCode(row.custody_state_cd)}</StatusPill> },
  ];
  const disclosureColumns = [
    { key: "disclosure_no", label: "Disclosure" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "estimated_liability_amt", label: "Estimate", render: (row) => formatMoney(row.estimated_liability_amt) },
    { key: "relief_decision_cd", label: "Relief", render: (row) => compactCode(row.relief_decision_cd) },
    { key: "disclosure_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.disclosure_state_cd)}>{compactCode(row.disclosure_state_cd)}</StatusPill> },
  ];

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Compliance and risk" title="Risk, Audit And Investigation Control" status="Controlled" tone="success" />

      <div className="metric-grid">
        <MetricTile icon={ShieldCheck} label="Risk profiles" value={formatNumber(overview?.risk_profile_count)} />
        <MetricTile icon={AlertTriangle} label="Elevated risk" value={formatNumber(overview?.elevated_risk_count)} />
        <MetricTile icon={ClipboardList} label="Open actions" value={formatNumber(overview?.open_action_count)} />
        <MetricTile icon={FileSearch} label="Open investigations" value={formatNumber(overview?.open_investigation_count)} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "risk" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading"><div><span>Risk assessment</span><h2>Create Risk Profile</h2></div></div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/compliance/risk-profiles", {
                subject_uid: riskForm.subject_uid || null,
                revenue_kind_uid: riskForm.revenue_kind_uid || null,
                risk_scope_cd: riskForm.risk_scope_cd,
                risk_score_no: Number(riskForm.risk_score_no || 0),
                risk_rating_cd: riskForm.risk_rating_cd,
                model_version_txt: riskForm.model_version_txt || null,
                signals: riskForm.signal_name ? [{
                  signal_name: riskForm.signal_name,
                  signal_weight_no: Number(riskForm.signal_weight_no || 0),
                  signal_value_txt: riskForm.signal_value_txt || null,
                }] : [],
              }, () => setRiskForm(initialRisk), "Risk profile recorded");
            }}>
              <SelectField label="Taxpayer" value={riskForm.subject_uid} onChange={(value) => setRiskForm({ ...riskForm, subject_uid: value })}>
                <option value="">No taxpayer context</option>
                {subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>)}
              </SelectField>
              <SelectField label="Revenue kind" value={riskForm.revenue_kind_uid} onChange={(value) => setRiskForm({ ...riskForm, revenue_kind_uid: value })}>
                <option value="">All revenue</option>
                {(lookups.revenue_kinds || []).map((kind) => <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>{kind.revenue_kind_name}</option>)}
              </SelectField>
              <div className="compact-form">
                <Field label="Risk score"><input type="number" value={riskForm.risk_score_no} onChange={(event) => setRiskForm({ ...riskForm, risk_score_no: event.target.value })} /></Field>
                <SelectField label="Risk rating" value={riskForm.risk_rating_cd} onChange={(value) => setRiskForm({ ...riskForm, risk_rating_cd: value })}>
                  <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option>
                </SelectField>
              </div>
              <Field label="Signal name"><input value={riskForm.signal_name} onChange={(event) => setRiskForm({ ...riskForm, signal_name: event.target.value })} /></Field>
              <Field label="Signal value"><input value={riskForm.signal_value_txt} onChange={(event) => setRiskForm({ ...riskForm, signal_value_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Record risk</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/compliance/voluntary-disclosures", {
                ...disclosureForm,
                revenue_kind_uid: disclosureForm.revenue_kind_uid || null,
                estimated_liability_amt: disclosureForm.estimated_liability_amt || null,
                relief_decision_cd: disclosureForm.relief_decision_cd || null,
              }, () => setDisclosureForm(initialDisclosure), "Voluntary disclosure lodged");
            }}>
              <SelectField label="Disclosure taxpayer" value={disclosureForm.subject_uid} onChange={(value) => setDisclosureForm({ ...disclosureForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>
                {subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>)}
              </SelectField>
              <Field label="Estimated liability"><input type="number" value={disclosureForm.estimated_liability_amt} onChange={(event) => setDisclosureForm({ ...disclosureForm, estimated_liability_amt: event.target.value })} /></Field>
              <Field label="Disclosure summary"><textarea value={disclosureForm.disclosure_summary_txt} onChange={(event) => setDisclosureForm({ ...disclosureForm, disclosure_summary_txt: event.target.value })} /></Field>
              <button className="secondary-button" type="submit">Lodge disclosure</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={riskColumns} rows={riskProfiles} keyField="risk_profile_uid" empty="No risk profiles" />
            <br />
            <DataTable columns={signalColumns} rows={signals} keyField="risk_signal_uid" empty="No risk signals" />
            <br />
            <DataTable columns={disclosureColumns} rows={disclosures} keyField="disclosure_uid" empty="No voluntary disclosures" />
          </section>
        </div>
      ) : null}

      {activeTab === "plans" ? (
        <div className="module-workbench">
          <section className="content-band">
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/compliance/plans", planForm, () => setPlanForm(initialPlan), "Compliance plan created");
            }}>
              <Field label="Plan name"><input required value={planForm.plan_name} onChange={(event) => setPlanForm({ ...planForm, plan_name: event.target.value })} /></Field>
              <div className="compact-form">
                <Field label="Plan type"><input value={planForm.plan_type_cd} onChange={(event) => setPlanForm({ ...planForm, plan_type_cd: event.target.value.toUpperCase() })} /></Field>
                <SelectField label="State" value={planForm.plan_state_cd} onChange={(value) => setPlanForm({ ...planForm, plan_state_cd: value })}><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option></SelectField>
              </div>
              <button className="primary-button" type="submit">Create plan</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/compliance/actions", { ...actionForm, compliance_plan_uid: actionForm.compliance_plan_uid || null, revenue_kind_uid: actionForm.revenue_kind_uid || null }, () => setActionForm(initialAction), "Compliance action opened");
            }}>
              <SelectField label="Plan" value={actionForm.compliance_plan_uid} onChange={(value) => setActionForm({ ...actionForm, compliance_plan_uid: value })}>
                <option value="">No plan</option>{plans.map((plan) => <option key={plan.compliance_plan_uid} value={plan.compliance_plan_uid}>{plan.plan_name}</option>)}
              </SelectField>
              <SelectField label="Taxpayer" value={actionForm.subject_uid} onChange={(value) => setActionForm({ ...actionForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>{subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>)}
              </SelectField>
              <Field label="Action type"><input value={actionForm.action_type_cd} onChange={(event) => setActionForm({ ...actionForm, action_type_cd: event.target.value.toUpperCase() })} /></Field>
              <button className="secondary-button" type="submit">Open action</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={planColumns} rows={plans} keyField="compliance_plan_uid" empty="No compliance plans" />
            <br />
            <DataTable columns={actionColumns} rows={actions} keyField="compliance_action_uid" empty="No compliance actions" />
          </section>
        </div>
      ) : null}

      {activeTab === "audits" ? (
        <div className="module-workbench">
          <section className="content-band">
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/compliance/audits", { ...auditForm, revenue_kind_uid: auditForm.revenue_kind_uid || null, compliance_action_uid: auditForm.compliance_action_uid || null }, () => setAuditForm(initialAudit), "Audit engagement opened");
            }}>
              <SelectField label="Taxpayer" value={auditForm.subject_uid} onChange={(value) => setAuditForm({ ...auditForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>{subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>)}
              </SelectField>
              <Field label="Scope"><textarea value={auditForm.scope_txt} onChange={(event) => setAuditForm({ ...auditForm, scope_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Open audit</button>
            </form>
            <hr />
            <form className="compact-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/compliance/audit-findings", { ...findingForm, proposed_adjustment_amt: findingForm.proposed_adjustment_amt || null }, () => setFindingForm(initialFinding), "Audit finding recorded");
            }}>
              <SelectField label="Audit" value={findingForm.audit_engagement_uid} onChange={(value) => setFindingForm({ ...findingForm, audit_engagement_uid: value })}>
                <option value="">Select audit</option>{audits.map((audit) => <option key={audit.audit_engagement_uid} value={audit.audit_engagement_uid}>{audit.audit_no}</option>)}
              </SelectField>
              <Field label="Finding type"><input value={findingForm.finding_type_cd} onChange={(event) => setFindingForm({ ...findingForm, finding_type_cd: event.target.value.toUpperCase() })} /></Field>
              <Field label="Proposed adjustment"><input type="number" value={findingForm.proposed_adjustment_amt} onChange={(event) => setFindingForm({ ...findingForm, proposed_adjustment_amt: event.target.value })} /></Field>
              <Field label="Finding text"><textarea value={findingForm.finding_txt} onChange={(event) => setFindingForm({ ...findingForm, finding_txt: event.target.value })} /></Field>
              <button className="secondary-button full-span" type="submit">Record finding</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/compliance/information-requests", { ...infoForm, audit_engagement_uid: infoForm.audit_engagement_uid || null }, () => setInfoForm(initialInfo), "Information request issued");
            }}>
              <SelectField label="Taxpayer" value={infoForm.subject_uid} onChange={(value) => setInfoForm({ ...infoForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>{subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>)}
              </SelectField>
              <Field label="Request text"><textarea value={infoForm.request_txt} onChange={(event) => setInfoForm({ ...infoForm, request_txt: event.target.value })} /></Field>
              <button className="secondary-button" type="submit">Issue request</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={auditColumns} rows={audits} keyField="audit_engagement_uid" empty="No audit engagements" />
            <br />
            <DataTable columns={findingColumns} rows={findings} keyField="audit_finding_uid" empty="No audit findings" />
            <br />
            <DataTable columns={infoColumns} rows={infoRequests} keyField="information_request_uid" empty="No information requests" />
          </section>
        </div>
      ) : null}

      {activeTab === "investigations" ? (
        <div className="module-workbench">
          <section className="content-band">
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/compliance/investigations", { ...investigationForm, subject_uid: investigationForm.subject_uid || null }, () => setInvestigationForm(initialInvestigation), "Investigation opened");
            }}>
              <SelectField label="Taxpayer" value={investigationForm.subject_uid} onChange={(value) => setInvestigationForm({ ...investigationForm, subject_uid: value })}>
                <option value="">No taxpayer context</option>{subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>)}
              </SelectField>
              <Field label="Investigation type"><input value={investigationForm.investigation_type_cd} onChange={(event) => setInvestigationForm({ ...investigationForm, investigation_type_cd: event.target.value.toUpperCase() })} /></Field>
              <Field label="Summary"><textarea value={investigationForm.summary_txt} onChange={(event) => setInvestigationForm({ ...investigationForm, summary_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Open investigation</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/compliance/evidence", { ...evidenceForm, investigation_file_uid: evidenceForm.investigation_file_uid || null, audit_engagement_uid: evidenceForm.audit_engagement_uid || null, content_record_uid: evidenceForm.content_record_uid || null }, () => setEvidenceForm(initialEvidence), "Evidence registered");
            }}>
              <SelectField label="Investigation" value={evidenceForm.investigation_file_uid} onChange={(value) => setEvidenceForm({ ...evidenceForm, investigation_file_uid: value })}>
                <option value="">No investigation</option>{investigations.map((item) => <option key={item.investigation_file_uid} value={item.investigation_file_uid}>{item.investigation_no}</option>)}
              </SelectField>
              <SelectField label="Document record" value={evidenceForm.content_record_uid} onChange={(value) => setEvidenceForm({ ...evidenceForm, content_record_uid: value })}>
                <option value="">No document</option>{contentRecords.map((record) => <option key={record.content_record_uid} value={record.content_record_uid}>{record.content_no} - {record.file_name_txt || compactCode(record.content_type_cd)}</option>)}
              </SelectField>
              <Field label="Evidence type"><input value={evidenceForm.evidence_type_cd} onChange={(event) => setEvidenceForm({ ...evidenceForm, evidence_type_cd: event.target.value.toUpperCase() })} /></Field>
              <Field label="Description"><textarea value={evidenceForm.description_txt} onChange={(event) => setEvidenceForm({ ...evidenceForm, description_txt: event.target.value })} /></Field>
              <button className="secondary-button" type="submit">Register evidence</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={investigationColumns} rows={investigations} keyField="investigation_file_uid" empty="No investigations" />
            <br />
            <DataTable columns={evidenceColumns} rows={evidence} keyField="evidence_uid" empty="No evidence records" />
          </section>
        </div>
      ) : null}
    </section>
  );
}
