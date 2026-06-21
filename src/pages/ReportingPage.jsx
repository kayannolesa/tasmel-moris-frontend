import { BadgeDollarSign, Database, FileCheck2, ListChecks } from "lucide-react";
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
  { id: "reports", label: "Reports" },
  { id: "metrics", label: "KPIs" },
    { id: "governance", label: "Lifecycle Governance" },
  { id: "marts", label: "Data Marts" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function statusTone(value) {
  const status = String(value || "");
  if (["PUBLISHED", "COMPLETED", "ACTIVE", "CERTIFIED"].includes(status)) return "success";
  if (["DRAFT", "REQUESTED", "RUNNING", "SCHEDULED"].includes(status)) return "warning";
  if (["FAILED", "RETIRED"].includes(status)) return "danger";
  return "neutral";
}

const initialReport = {
  report_name: "",
  report_type_cd: "OPERATIONAL",
  security_scope_cd: "OFFICIAL",
  report_state_cd: "PUBLISHED",
  domain_cd: "REVENUE",
  cadence_cd: "MONTHLY",
};
const initialRun = { report_definition_uid: "", run_state_cd: "REQUESTED", period_cd: "CURRENT_MONTH", export_format_cd: "PDF" };
const initialMetric = {
  metric_name: "",
  metric_type_cd: "KPI",
  metric_state_cd: "ACTIVE",
  calculation_basis_cd: "SYSTEM",
  target_txt: "",
};
const initialSnapshot = { metric_definition_uid: "", snapshot_dt: today(), metric_value_num: "", metric_value_amt: "", dimension_cd: "NATIONAL" };
const initialMart = {
  mart_name: "",
  source_tables_txt: "fin.fin_receipt, asm.asm_liability_notice",
  refresh_frequency_cd: "DAILY",
  mart_state_cd: "PUBLISHED",
};

export default function ReportingPage() {
  const [activeTab, setActiveTab] = useState("reports");
  const [overview, setOverview] = useState(null);
  const [reports, setReports] = useState([]);
  const [runs, setRuns] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [dataMarts, setDataMarts] = useState([]);
  const [reportForm, setReportForm] = useState(initialReport);
  const [runForm, setRunForm] = useState(initialRun);
  const [metricForm, setMetricForm] = useState(initialMetric);
  const [snapshotForm, setSnapshotForm] = useState(initialSnapshot);
  const [martForm, setMartForm] = useState(initialMart);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const [overviewPayload, reportsPayload, runsPayload, metricsPayload, snapshotsPayload, martsPayload] = await Promise.all([
      apiRequest("/api/reporting/overview"),
      apiRequest("/api/reporting/reports?pageSize=80"),
      apiRequest("/api/reporting/runs?pageSize=80"),
      apiRequest("/api/reporting/metrics?pageSize=80"),
      apiRequest("/api/reporting/snapshots?pageSize=80"),
      apiRequest("/api/reporting/data-marts?pageSize=80"),
    ]);
    setOverview(overviewPayload.overview);
    setReports(reportsPayload.rows || []);
    setRuns(runsPayload.rows || []);
    setMetrics(metricsPayload.rows || []);
    setSnapshots(snapshotsPayload.rows || []);
    setDataMarts(martsPayload.rows || []);
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

  const latestSnapshot = useMemo(() => snapshots[0], [snapshots]);

  const reportColumns = [
    { key: "report_code", label: "Report" },
    { key: "report_name", label: "Name" },
    { key: "report_type_cd", label: "Type", render: (row) => compactCode(row.report_type_cd) },
    { key: "run_count", label: "Runs", render: (row) => formatNumber(row.run_count) },
    { key: "report_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.report_state_cd)}>{compactCode(row.report_state_cd)}</StatusPill> },
  ];
  const runColumns = [
    { key: "run_no", label: "Run" },
    { key: "report_name", label: "Report" },
    { key: "requested_ts", label: "Requested", render: (row) => formatDateTime(row.requested_ts) },
    { key: "completed_ts", label: "Completed", render: (row) => row.completed_ts ? formatDateTime(row.completed_ts) : "-" },
    { key: "run_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.run_state_cd)}>{compactCode(row.run_state_cd)}</StatusPill> },
  ];
  const metricColumns = [
    { key: "metric_code", label: "KPI" },
    { key: "metric_name", label: "Name" },
    { key: "metric_type_cd", label: "Type", render: (row) => compactCode(row.metric_type_cd) },
    { key: "snapshot_count", label: "Snapshots", render: (row) => formatNumber(row.snapshot_count) },
    { key: "metric_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.metric_state_cd)}>{compactCode(row.metric_state_cd)}</StatusPill> },
  ];
  const snapshotColumns = [
    { key: "metric_name", label: "Metric" },
    { key: "snapshot_dt", label: "Date", render: (row) => formatDate(row.snapshot_dt) },
    { key: "metric_value_num", label: "Value", render: (row) => row.metric_value_num ?? "-" },
    { key: "metric_value_amt", label: "Amount", render: (row) => formatMoney(row.metric_value_amt) },
    { key: "dimension_jsn", label: "Scope", render: (row) => compactCode(row.dimension_jsn?.dimension_cd || "NATIONAL") },
  ];
  const martColumns = [
    { key: "mart_code", label: "Mart" },
    { key: "mart_name", label: "Name" },
    { key: "refresh_frequency_cd", label: "Refresh", render: (row) => compactCode(row.refresh_frequency_cd) },
    { key: "last_refresh_ts", label: "Last refresh", render: (row) => row.last_refresh_ts ? formatDateTime(row.last_refresh_ts) : "-" },
    { key: "mart_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.mart_state_cd)}>{compactCode(row.mart_state_cd)}</StatusPill> },
  ];

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Reporting and analytics" title="Executive Reports, KPIs And Data Marts" status="Governed" tone="success" />

      <div className="metric-grid">
        <MetricTile icon={BadgeDollarSign} label="Revenue received" value={formatMoney(overview?.received_revenue_amt)} />
        <MetricTile icon={ListChecks} label="Open obligations" value={formatNumber(overview?.open_obligation_count)} />
        <MetricTile icon={FileCheck2} label="Report runs" value={formatNumber(overview?.report_run_count)} sublabel={`${formatNumber(overview?.active_report_run_count)} active`} />
        <MetricTile icon={Database} label="Data marts" value={formatNumber(overview?.data_mart_count)} sublabel={`${formatNumber(overview?.published_data_mart_count)} published`} />
      </div>

      <section className="content-band">
        <div className="section-heading">
          <div>
            <span>Operational intelligence</span>
            <h2>Revenue, risk, service and integration indicators</h2>
          </div>
        </div>
        <div className="identity-grid">
          <div><span>Elevated risk profiles</span><strong>{formatNumber(overview?.elevated_risk_count)}</strong></div>
          <div><span>Open service requests</span><strong>{formatNumber(overview?.open_service_request_count)}</strong></div>
          <div><span>Open integration exceptions</span><strong>{formatNumber(overview?.open_integration_exception_count)}</strong></div>
          <div><span>Latest KPI snapshot</span><strong>{latestSnapshot ? formatDate(latestSnapshot.snapshot_dt) : "No snapshot"}</strong></div>
        </div>
      </section>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === "governance" ? <AdvancedLifecycleGovernancePanel moduleKey="reporting" /> : null}

      <FormAlert error={error} success={success} />

      {activeTab === "reports" ? (
        <div className="module-workbench">
          <section className="content-band">
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/reporting/reports",
                {
                  report_name: reportForm.report_name,
                  report_type_cd: reportForm.report_type_cd,
                  security_scope_cd: reportForm.security_scope_cd,
                  report_state_cd: reportForm.report_state_cd,
                  definition_jsn: {
                    domain_cd: reportForm.domain_cd,
                    cadence_cd: reportForm.cadence_cd,
                    governance_cd: "MORIS_CONTROLLED",
                  },
                },
                () => setReportForm(initialReport),
                "Operational report registered"
              );
            }}>
              <Field label="Report name"><input required value={reportForm.report_name} onChange={(event) => setReportForm({ ...reportForm, report_name: event.target.value })} /></Field>
              <div className="compact-form">
                <SelectField label="Type" value={reportForm.report_type_cd} onChange={(value) => setReportForm({ ...reportForm, report_type_cd: value })}>
                  <option value="OPERATIONAL">Operational</option><option value="EXECUTIVE">Executive</option><option value="STATUTORY">Statutory</option>
                </SelectField>
                <SelectField label="Cadence" value={reportForm.cadence_cd} onChange={(value) => setReportForm({ ...reportForm, cadence_cd: value })}>
                  <option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option>
                </SelectField>
              </div>
              <SelectField label="Domain" value={reportForm.domain_cd} onChange={(value) => setReportForm({ ...reportForm, domain_cd: value })}>
                <option value="REVENUE">Revenue</option><option value="COMPLIANCE">Compliance</option><option value="SERVICE">Digital Service</option><option value="WHOLE_SYSTEM">Whole System</option>
              </SelectField>
              <button className="primary-button" type="submit">Register report</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/reporting/runs",
                {
                  report_definition_uid: runForm.report_definition_uid,
                  run_state_cd: runForm.run_state_cd,
                  parameter_jsn: {
                    period_cd: runForm.period_cd,
                    export_format_cd: runForm.export_format_cd,
                  },
                },
                () => setRunForm(initialRun),
                "Report run queued"
              );
            }}>
              <SelectField label="Report" value={runForm.report_definition_uid} onChange={(value) => setRunForm({ ...runForm, report_definition_uid: value })} required>
                <option value="">Select report</option>{reports.map((report) => <option key={report.report_definition_uid} value={report.report_definition_uid}>{report.report_name}</option>)}
              </SelectField>
              <div className="compact-form">
                <SelectField label="Period" value={runForm.period_cd} onChange={(value) => setRunForm({ ...runForm, period_cd: value })}>
                  <option value="CURRENT_MONTH">Current month</option><option value="LAST_MONTH">Last month</option><option value="CURRENT_QUARTER">Current quarter</option>
                </SelectField>
                <SelectField label="Output" value={runForm.export_format_cd} onChange={(value) => setRunForm({ ...runForm, export_format_cd: value })}>
                  <option value="PDF">PDF</option><option value="XLSX">XLSX</option><option value="DASHBOARD">Dashboard</option>
                </SelectField>
              </div>
              <button className="secondary-button" type="submit">Queue run</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={reportColumns} rows={reports} keyField="report_definition_uid" empty="No reports registered" />
            <br />
            <DataTable columns={runColumns} rows={runs} keyField="report_run_uid" empty="No report runs" />
          </section>
        </div>
      ) : null}

      {activeTab === "metrics" ? (
        <div className="module-workbench">
          <section className="content-band">
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/reporting/metrics",
                {
                  metric_name: metricForm.metric_name,
                  metric_type_cd: metricForm.metric_type_cd,
                  metric_state_cd: metricForm.metric_state_cd,
                  calculation_rule_jsn: {
                    calculation_basis_cd: metricForm.calculation_basis_cd,
                    target_txt: metricForm.target_txt || null,
                  },
                },
                () => setMetricForm(initialMetric),
                "KPI definition created"
              );
            }}>
              <Field label="KPI name"><input required value={metricForm.metric_name} onChange={(event) => setMetricForm({ ...metricForm, metric_name: event.target.value })} /></Field>
              <div className="compact-form">
                <SelectField label="Type" value={metricForm.metric_type_cd} onChange={(value) => setMetricForm({ ...metricForm, metric_type_cd: value })}>
                  <option value="KPI">KPI</option><option value="RISK">Risk</option><option value="SERVICE_LEVEL">Service level</option><option value="FINANCIAL">Financial</option>
                </SelectField>
                <Field label="Target"><input value={metricForm.target_txt} onChange={(event) => setMetricForm({ ...metricForm, target_txt: event.target.value })} /></Field>
              </div>
              <button className="primary-button" type="submit">Create KPI</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/reporting/snapshots",
                {
                  metric_definition_uid: snapshotForm.metric_definition_uid,
                  snapshot_dt: snapshotForm.snapshot_dt,
                  metric_value_num: snapshotForm.metric_value_num || null,
                  metric_value_amt: snapshotForm.metric_value_amt || null,
                  dimension_jsn: { dimension_cd: snapshotForm.dimension_cd },
                },
                () => setSnapshotForm(initialSnapshot),
                "KPI snapshot captured"
              );
            }}>
              <SelectField label="KPI" value={snapshotForm.metric_definition_uid} onChange={(value) => setSnapshotForm({ ...snapshotForm, metric_definition_uid: value })} required>
                <option value="">Select KPI</option>{metrics.map((metric) => <option key={metric.metric_definition_uid} value={metric.metric_definition_uid}>{metric.metric_name}</option>)}
              </SelectField>
              <div className="compact-form">
                <Field label="Date"><input type="date" required value={snapshotForm.snapshot_dt} onChange={(event) => setSnapshotForm({ ...snapshotForm, snapshot_dt: event.target.value })} /></Field>
                <Field label="Numeric value"><input type="number" step="0.01" value={snapshotForm.metric_value_num} onChange={(event) => setSnapshotForm({ ...snapshotForm, metric_value_num: event.target.value })} /></Field>
              </div>
              <Field label="Amount value"><input type="number" step="0.01" value={snapshotForm.metric_value_amt} onChange={(event) => setSnapshotForm({ ...snapshotForm, metric_value_amt: event.target.value })} /></Field>
              <button className="secondary-button" type="submit">Capture snapshot</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={metricColumns} rows={metrics} keyField="metric_definition_uid" empty="No KPI definitions" />
            <br />
            <DataTable columns={snapshotColumns} rows={snapshots} keyField="metric_snapshot_uid" empty="No KPI snapshots" />
          </section>
        </div>
      ) : null}

      {activeTab === "marts" ? (
        <div className="module-workbench">
          <section className="content-band">
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/reporting/data-marts",
                {
                  mart_name: martForm.mart_name,
                  source_tables_jsn: martForm.source_tables_txt.split(",").map((item) => item.trim()).filter(Boolean),
                  refresh_frequency_cd: martForm.refresh_frequency_cd,
                  mart_state_cd: martForm.mart_state_cd,
                },
                () => setMartForm(initialMart),
                "Dashboard data mart registered"
              );
            }}>
              <Field label="Data mart name"><input required value={martForm.mart_name} onChange={(event) => setMartForm({ ...martForm, mart_name: event.target.value })} /></Field>
              <Field label="Source tables"><textarea required value={martForm.source_tables_txt} onChange={(event) => setMartForm({ ...martForm, source_tables_txt: event.target.value })} /></Field>
              <SelectField label="Refresh frequency" value={martForm.refresh_frequency_cd} onChange={(value) => setMartForm({ ...martForm, refresh_frequency_cd: value })}>
                <option value="HOURLY">Hourly</option><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option>
              </SelectField>
              <button className="primary-button" type="submit">Register data mart</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={martColumns} rows={dataMarts} keyField="data_mart_uid" empty="No data marts registered" />
          </section>
        </div>
      ) : null}
    </section>
  );
}
