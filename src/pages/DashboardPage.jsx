import { BadgeDollarSign, Building2, FileCheck2, FolderArchive, Gavel, GitPullRequestArrow, ListChecks, Scale, Settings2, ShieldCheck, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { MetricTile, PageHeader } from "../components/common/WorkspacePrimitives.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest } from "../services/api.js";
import { formatDate, formatMoney, formatNumber } from "../utils/format.js";

export default function DashboardPage() {
  const auth = useAuth();
  const [data, setData] = useState({
    admin: null,
    configuration: null,
    assessment: null,
    collections: null,
    documents: null,
    finance: null,
    obligations: null,
    filing: null,
    registry: null,
    workflow: null,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const [admin, configuration, obligations, filing, registry, assessment, finance, workflow, documents, collections] = await Promise.allSettled([
        apiRequest("/api/admin/overview"),
        apiRequest("/api/configuration/overview"),
        apiRequest("/api/obligations/overview"),
        apiRequest("/api/filing/overview"),
        apiRequest("/api/registry/subjects?pageSize=1"),
        apiRequest("/api/assessment/overview"),
        apiRequest("/api/finance/overview"),
        apiRequest("/api/workflow/overview"),
        apiRequest("/api/documents/overview"),
        apiRequest("/api/collections/overview"),
      ]);

      if (!active) return;
      setData({
        admin: admin.status === "fulfilled" ? admin.value.overview : null,
        configuration: configuration.status === "fulfilled" ? configuration.value.overview : null,
        assessment: assessment.status === "fulfilled" ? assessment.value.overview : null,
        collections: collections.status === "fulfilled" ? collections.value.overview : null,
        documents: documents.status === "fulfilled" ? documents.value.overview : null,
        finance: finance.status === "fulfilled" ? finance.value.overview : null,
        obligations: obligations.status === "fulfilled" ? obligations.value.overview : null,
        filing: filing.status === "fulfilled" ? filing.value.overview : null,
        registry: registry.status === "fulfilled" ? registry.value.page : null,
        workflow: workflow.status === "fulfilled" ? workflow.value.overview : null,
      });
      setReady(true);
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const roleNames = auth.actor?.roles?.map((role) => role.role_name).join(", ") || "No assigned role";

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Operations command"
        title="Revenue Administration Workspace"
        status={ready ? "Live" : "Loading"}
        tone={ready ? "success" : "warning"}
      />

      <div className="metric-grid">
        <MetricTile icon={UsersRound} label="Taxpayer records" value={formatNumber(data.registry?.total)} />
        <MetricTile icon={Settings2} label="Revenue kinds" value={formatNumber(data.configuration?.revenue_kind_count)} />
        <MetricTile icon={ListChecks} label="Open dues" value={formatNumber(data.obligations?.open_due_count)} sublabel={data.obligations?.next_due_dt ? `Next due ${formatDate(data.obligations.next_due_dt)}` : ""} />
        <MetricTile icon={FileCheck2} label="Declarations" value={formatNumber(data.filing?.declaration_count)} />
      </div>

      <div className="metric-grid">
        <MetricTile icon={Scale} label="Assessment notices" value={formatNumber(data.assessment?.liability_notice_count)} sublabel={formatMoney(data.assessment?.assessed_total_amt)} />
        <MetricTile icon={BadgeDollarSign} label="Receipts" value={formatNumber(data.finance?.receipt_count)} sublabel={formatMoney(data.finance?.account_balance_amt)} />
        <MetricTile icon={GitPullRequestArrow} label="Pending approvals" value={formatNumber(data.workflow?.pending_approval_count)} />
        <MetricTile icon={Gavel} label="Open recovery" value={formatNumber(data.collections?.open_matter_count)} />
      </div>

      <section className="content-band">
        <div className="section-heading">
          <div>
            <span>Current officer</span>
            <h2>{auth.actor?.display_name_txt}</h2>
          </div>
        </div>
        <div className="identity-grid">
          <div>
            <span>Account</span>
            <strong>{auth.actor?.email_txt || auth.actor?.username_txt}</strong>
          </div>
          <div>
            <span>Role coverage</span>
            <strong>{roleNames}</strong>
          </div>
          <div>
            <span>Administration scope</span>
            <strong>{formatNumber(data.admin?.agency_unit_count)} agency units, {formatNumber(data.admin?.service_site_count)} service sites</strong>
          </div>
        </div>
      </section>

      <div className="metric-grid">
        <MetricTile icon={Building2} label="Staff profiles" value={formatNumber(data.admin?.staff_count)} />
        <MetricTile icon={ShieldCheck} label="Role memberships" value={formatNumber(data.admin?.role_membership_count)} />
        <MetricTile icon={FolderArchive} label="Document records" value={formatNumber(data.documents?.content_count)} />
        <MetricTile icon={FileCheck2} label="Validation items" value={formatNumber(data.filing?.unresolved_validation_count)} />
      </div>
    </section>
  );
}
