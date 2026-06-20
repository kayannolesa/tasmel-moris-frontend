import { Database, FileCheck2, ListChecks, ShieldCheck } from "lucide-react";
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
import { compactCode, formatDate, formatDateTime, formatMoney, formatNumber } from "../utils/format.js";

const tabs = [
  { id: "sources", label: "Sources" },
  { id: "mapping", label: "Crosswalks" },
  { id: "quality", label: "Quality" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function statusTone(value) {
  const status = String(value || "");
  if (["REGISTERED", "PROFILED", "MAPPED", "RESOLVED", "SIGNED", "HIGH"].includes(status)) return "success";
  if (["UNMAPPED", "OPEN", "MEDIUM", "DRAFT"].includes(status)) return "warning";
  if (["CRITICAL", "FAILED", "BLOCKED"].includes(status)) return "danger";
  return "neutral";
}

const initialSource = { source_name: "", source_type_cd: "LEGACY_SYSTEM", owner_txt: "", extraction_dt: today(), source_state_cd: "REGISTERED" };
const initialProfile = { source_register_uid: "", entity_name_txt: "", row_count_no: "", field_count_no: "", mapping_state_cd: "UNMAPPED", quality_score_no: "" };
const initialCrosswalk = { source_register_uid: "", source_entity_name_txt: "", source_record_key_txt: "", target_schema_cd: "prt", target_table_cd: "prt_subject", confidence_cd: "HIGH" };
const initialIssue = { source_register_uid: "", source_entity_profile_uid: "", issue_severity_cd: "HIGH", issue_txt: "", issue_state_cd: "OPEN" };
const initialReconciliation = { source_register_uid: "", target_table_cd: "prt.prt_subject", source_count_no: "", target_count_no: "", source_total_amt: "", target_total_amt: "", variance_txt: "" };

export default function MigrationQualityPage() {
  const [activeTab, setActiveTab] = useState("sources");
  const [overview, setOverview] = useState(null);
  const [sources, setSources] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [crosswalks, setCrosswalks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [sourceForm, setSourceForm] = useState(initialSource);
  const [profileForm, setProfileForm] = useState(initialProfile);
  const [crosswalkForm, setCrosswalkForm] = useState(initialCrosswalk);
  const [issueForm, setIssueForm] = useState(initialIssue);
  const [reconciliationForm, setReconciliationForm] = useState(initialReconciliation);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const [overviewPayload, sourcesPayload, profilesPayload, crosswalksPayload, issuesPayload, reconciliationsPayload] = await Promise.all([
      apiRequest("/api/migration/overview"),
      apiRequest("/api/migration/sources?pageSize=80"),
      apiRequest("/api/migration/entity-profiles?pageSize=80"),
      apiRequest("/api/migration/crosswalks?pageSize=80"),
      apiRequest("/api/migration/quality-issues?pageSize=80"),
      apiRequest("/api/migration/reconciliations?pageSize=80"),
    ]);
    setOverview(overviewPayload.overview);
    setSources(sourcesPayload.rows || []);
    setProfiles(profilesPayload.rows || []);
    setCrosswalks(crosswalksPayload.rows || []);
    setIssues(issuesPayload.rows || []);
    setReconciliations(reconciliationsPayload.rows || []);
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

  function syncProfileSource(sourceRegisterUid) {
    setIssueForm({
      ...issueForm,
      source_entity_profile_uid: "",
      source_register_uid: sourceRegisterUid,
    });
  }

  const sourceColumns = [
    { key: "source_code", label: "Source" },
    { key: "source_name", label: "Name" },
    { key: "source_type_cd", label: "Type", render: (row) => compactCode(row.source_type_cd) },
    { key: "entity_profile_count", label: "Entities", render: (row) => formatNumber(row.entity_profile_count) },
    { key: "source_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.source_state_cd)}>{compactCode(row.source_state_cd)}</StatusPill> },
  ];
  const profileColumns = [
    { key: "source_name", label: "Source" },
    { key: "entity_name_txt", label: "Entity" },
    { key: "row_count_no", label: "Rows", render: (row) => formatNumber(row.row_count_no) },
    { key: "field_count_no", label: "Fields", render: (row) => formatNumber(row.field_count_no) },
    { key: "mapping_state_cd", label: "Mapping", render: (row) => <StatusPill tone={statusTone(row.mapping_state_cd)}>{compactCode(row.mapping_state_cd)}</StatusPill> },
  ];
  const crosswalkColumns = [
    { key: "source_name", label: "Source" },
    { key: "source_entity_name_txt", label: "Entity" },
    { key: "source_record_key_txt", label: "Source key" },
    { key: "target_table_cd", label: "Target table" },
    { key: "confidence_cd", label: "Confidence", render: (row) => <StatusPill tone={statusTone(row.confidence_cd)}>{compactCode(row.confidence_cd)}</StatusPill> },
  ];
  const issueColumns = [
    { key: "source_name", label: "Source", render: (row) => row.source_name || "-" },
    { key: "entity_name_txt", label: "Entity", render: (row) => row.entity_name_txt || "-" },
    { key: "issue_code", label: "Issue" },
    { key: "detected_ts", label: "Detected", render: (row) => formatDateTime(row.detected_ts) },
    { key: "issue_severity_cd", label: "Severity", render: (row) => <StatusPill tone={statusTone(row.issue_severity_cd)}>{compactCode(row.issue_severity_cd)}</StatusPill> },
  ];
  const reconciliationColumns = [
    { key: "reconciliation_code", label: "Run" },
    { key: "source_name", label: "Source" },
    { key: "target_table_cd", label: "Target" },
    { key: "source_count_no", label: "Source rows", render: (row) => formatNumber(row.source_count_no) },
    { key: "target_count_no", label: "Target rows", render: (row) => formatNumber(row.target_count_no) },
    { key: "target_total_amt", label: "Target total", render: (row) => formatMoney(row.target_total_amt) },
  ];

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Migration and data quality" title="Source Registers, Crosswalks And Reconciliation" status="Controlled" tone="success" />

      <div className="metric-grid">
        <MetricTile icon={Database} label="Source registers" value={formatNumber(overview?.source_register_count)} />
        <MetricTile icon={ListChecks} label="Entity profiles" value={formatNumber(overview?.source_entity_profile_count)} />
        <MetricTile icon={ShieldCheck} label="Open quality issues" value={formatNumber(overview?.open_quality_issue_count)} sublabel={`${formatNumber(overview?.severe_quality_issue_count)} severe`} />
        <MetricTile icon={FileCheck2} label="Reconciliations" value={formatNumber(overview?.reconciliation_result_count)} sublabel={`${formatNumber(overview?.signed_reconciliation_count)} signed`} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "sources" ? (
        <div className="module-workbench">
          <section className="content-band">
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/migration/sources", sourceForm, () => setSourceForm(initialSource), "Source register captured");
            }}>
              <Field label="Source name"><input required value={sourceForm.source_name} onChange={(event) => setSourceForm({ ...sourceForm, source_name: event.target.value })} /></Field>
              <div className="compact-form">
                <SelectField label="Type" value={sourceForm.source_type_cd} onChange={(value) => setSourceForm({ ...sourceForm, source_type_cd: value })}>
                  <option value="LEGACY_SYSTEM">Legacy system</option><option value="SPREADSHEET">Spreadsheet</option><option value="DATABASE">Database</option><option value="DOCUMENT_ARCHIVE">Document archive</option>
                </SelectField>
                <Field label="Extraction date"><input type="date" value={sourceForm.extraction_dt} onChange={(event) => setSourceForm({ ...sourceForm, extraction_dt: event.target.value })} /></Field>
              </div>
              <Field label="Owner"><input value={sourceForm.owner_txt} onChange={(event) => setSourceForm({ ...sourceForm, owner_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Register source</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/migration/entity-profiles",
                {
                  ...profileForm,
                  row_count_no: profileForm.row_count_no || null,
                  field_count_no: profileForm.field_count_no || null,
                  profiling_summary_jsn: { quality_score_no: profileForm.quality_score_no || null },
                },
                () => setProfileForm(initialProfile),
                "Source entity profile recorded"
              );
            }}>
              <SelectField label="Source" value={profileForm.source_register_uid} onChange={(value) => setProfileForm({ ...profileForm, source_register_uid: value })} required>
                <option value="">Select source</option>{sources.map((source) => <option key={source.source_register_uid} value={source.source_register_uid}>{source.source_name}</option>)}
              </SelectField>
              <Field label="Entity name"><input required value={profileForm.entity_name_txt} onChange={(event) => setProfileForm({ ...profileForm, entity_name_txt: event.target.value })} /></Field>
              <div className="compact-form">
                <Field label="Rows"><input type="number" value={profileForm.row_count_no} onChange={(event) => setProfileForm({ ...profileForm, row_count_no: event.target.value })} /></Field>
                <Field label="Fields"><input type="number" value={profileForm.field_count_no} onChange={(event) => setProfileForm({ ...profileForm, field_count_no: event.target.value })} /></Field>
              </div>
              <button className="secondary-button" type="submit">Profile entity</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={sourceColumns} rows={sources} keyField="source_register_uid" empty="No source registers" />
            <br />
            <DataTable columns={profileColumns} rows={profiles} keyField="source_entity_profile_uid" empty="No source entity profiles" />
          </section>
        </div>
      ) : null}

      {activeTab === "mapping" ? (
        <div className="module-workbench">
          <section className="content-band">
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/migration/crosswalks", crosswalkForm, () => setCrosswalkForm(initialCrosswalk), "Crosswalk created");
            }}>
              <SelectField label="Source" value={crosswalkForm.source_register_uid} onChange={(value) => setCrosswalkForm({ ...crosswalkForm, source_register_uid: value })} required>
                <option value="">Select source</option>{sources.map((source) => <option key={source.source_register_uid} value={source.source_register_uid}>{source.source_name}</option>)}
              </SelectField>
              <Field label="Source entity"><input required value={crosswalkForm.source_entity_name_txt} onChange={(event) => setCrosswalkForm({ ...crosswalkForm, source_entity_name_txt: event.target.value })} /></Field>
              <Field label="Source record key"><input required value={crosswalkForm.source_record_key_txt} onChange={(event) => setCrosswalkForm({ ...crosswalkForm, source_record_key_txt: event.target.value })} /></Field>
              <div className="compact-form">
                <Field label="Target schema"><input required value={crosswalkForm.target_schema_cd} onChange={(event) => setCrosswalkForm({ ...crosswalkForm, target_schema_cd: event.target.value })} /></Field>
                <Field label="Target table"><input required value={crosswalkForm.target_table_cd} onChange={(event) => setCrosswalkForm({ ...crosswalkForm, target_table_cd: event.target.value })} /></Field>
              </div>
              <SelectField label="Confidence" value={crosswalkForm.confidence_cd} onChange={(value) => setCrosswalkForm({ ...crosswalkForm, confidence_cd: value })}>
                <option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
              </SelectField>
              <button className="primary-button" type="submit">Create crosswalk</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={crosswalkColumns} rows={crosswalks} keyField="crosswalk_uid" empty="No crosswalks created" />
          </section>
        </div>
      ) : null}

      {activeTab === "quality" ? (
        <div className="module-workbench">
          <section className="content-band">
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/migration/quality-issues",
                {
                  ...issueForm,
                  source_register_uid: issueForm.source_register_uid || null,
                  source_entity_profile_uid: issueForm.source_entity_profile_uid || null,
                },
                () => setIssueForm(initialIssue),
                "Quality issue logged"
              );
            }}>
              <SelectField label="Source" value={issueForm.source_register_uid} onChange={syncProfileSource}>
                <option value="">No source selected</option>{sources.map((source) => <option key={source.source_register_uid} value={source.source_register_uid}>{source.source_name}</option>)}
              </SelectField>
              <SelectField label="Entity" value={issueForm.source_entity_profile_uid} onChange={(value) => setIssueForm({ ...issueForm, source_entity_profile_uid: value })}>
                <option value="">No entity selected</option>{profiles.filter((profile) => !issueForm.source_register_uid || profile.source_register_uid === issueForm.source_register_uid).map((profile) => <option key={profile.source_entity_profile_uid} value={profile.source_entity_profile_uid}>{profile.entity_name_txt}</option>)}
              </SelectField>
              <SelectField label="Severity" value={issueForm.issue_severity_cd} onChange={(value) => setIssueForm({ ...issueForm, issue_severity_cd: value })}>
                <option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
              </SelectField>
              <Field label="Issue"><textarea required value={issueForm.issue_txt} onChange={(event) => setIssueForm({ ...issueForm, issue_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Log issue</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/migration/reconciliations",
                {
                  ...reconciliationForm,
                  source_count_no: reconciliationForm.source_count_no || null,
                  target_count_no: reconciliationForm.target_count_no || null,
                  source_total_amt: reconciliationForm.source_total_amt || null,
                  target_total_amt: reconciliationForm.target_total_amt || null,
                },
                () => setReconciliationForm(initialReconciliation),
                "Reconciliation result recorded"
              );
            }}>
              <SelectField label="Source" value={reconciliationForm.source_register_uid} onChange={(value) => setReconciliationForm({ ...reconciliationForm, source_register_uid: value })} required>
                <option value="">Select source</option>{sources.map((source) => <option key={source.source_register_uid} value={source.source_register_uid}>{source.source_name}</option>)}
              </SelectField>
              <Field label="Target table"><input required value={reconciliationForm.target_table_cd} onChange={(event) => setReconciliationForm({ ...reconciliationForm, target_table_cd: event.target.value })} /></Field>
              <div className="compact-form">
                <Field label="Source rows"><input type="number" value={reconciliationForm.source_count_no} onChange={(event) => setReconciliationForm({ ...reconciliationForm, source_count_no: event.target.value })} /></Field>
                <Field label="Target rows"><input type="number" value={reconciliationForm.target_count_no} onChange={(event) => setReconciliationForm({ ...reconciliationForm, target_count_no: event.target.value })} /></Field>
              </div>
              <Field label="Variance"><textarea value={reconciliationForm.variance_txt} onChange={(event) => setReconciliationForm({ ...reconciliationForm, variance_txt: event.target.value })} /></Field>
              <button className="secondary-button" type="submit">Record reconciliation</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={issueColumns} rows={issues} keyField="quality_issue_uid" empty="No data quality issues" />
            <br />
            <DataTable columns={reconciliationColumns} rows={reconciliations} keyField="reconciliation_result_uid" empty="No reconciliation results" />
          </section>
        </div>
      ) : null}
    </section>
  );
}
