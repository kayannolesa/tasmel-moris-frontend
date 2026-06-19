import { Activity, BadgeCheck, Database, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import StatusPill from "../components/common/StatusPill.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest } from "../services/api.js";

export default function DashboardPage() {
  const auth = useAuth();
  const [status, setStatus] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    void apiRequest("/api/system/status", { auth: false }).then(setStatus).catch(() => setStatus(null));
    void apiRequest("/api/system/security-summary").then((payload) => setSummary(payload.summary)).catch(() => setSummary(null));
  }, []);

  const roleNames = auth.actor?.roles?.map((role) => role.role_name).join(", ") || "No roles assigned";

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <span>Command overview</span>
          <h1>MORIS Core Platform</h1>
        </div>
        <StatusPill tone={status?.ok ? "success" : "warning"}>{status?.ok ? "Operational" : "Checking"}</StatusPill>
      </div>

      <div className="metric-grid">
        <article className="metric-tile">
          <Activity size={22} />
          <span>Stage</span>
          <strong>{status?.stage || "core-platform"}</strong>
        </article>
        <article className="metric-tile">
          <Database size={22} />
          <span>Database</span>
          <strong>{status?.database?.status || "checking"}</strong>
        </article>
        <article className="metric-tile">
          <ShieldCheck size={22} />
          <span>Active sessions</span>
          <strong>{summary?.active_session_count ?? "-"}</strong>
        </article>
        <article className="metric-tile">
          <BadgeCheck size={22} />
          <span>Role grants</span>
          <strong>{summary?.grant_count ?? auth.actor?.grants?.length ?? "-"}</strong>
        </article>
      </div>

      <section className="content-band">
        <div className="section-heading">
          <span>Current principal</span>
          <h2>{auth.actor?.display_name_txt}</h2>
        </div>
        <div className="identity-grid">
          <div>
            <span>Account</span>
            <strong>{auth.actor?.email_txt || auth.actor?.username_txt}</strong>
          </div>
          <div>
            <span>Actor number</span>
            <strong>{auth.actor?.actor_no}</strong>
          </div>
          <div>
            <span>Roles</span>
            <strong>{roleNames}</strong>
          </div>
        </div>
      </section>
    </section>
  );
}
