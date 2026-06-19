import { Database, Globe2, HardDrive, Lock, ServerCog } from "lucide-react";
import { useEffect, useState } from "react";
import StatusPill from "../components/common/StatusPill.jsx";
import { apiRequest } from "../services/api.js";

export default function SystemPage() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    void apiRequest("/api/system/status", { auth: false }).then(setStatus);
  }, []);

  const checks = [
    { label: "Backend service", value: status?.service || "tasmel-moris-backend", icon: ServerCog, ok: status?.ok },
    { label: "PostgreSQL", value: status?.database?.status || "checking", icon: Database, ok: status?.database?.ok },
    { label: "CORS", value: status?.deployment?.cors_locked ? "Locked" : "Open for local", icon: Lock, ok: status?.deployment?.cors_locked },
    { label: "Storage", value: status?.deployment?.managed_file_storage_backend || "not configured", icon: HardDrive, ok: true },
    { label: "Frontend URL", value: status?.deployment?.frontend_url_configured ? "Configured" : "Missing", icon: Globe2, ok: status?.deployment?.frontend_url_configured },
  ];

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <span>Deployment</span>
          <h1>System Readiness</h1>
        </div>
        <StatusPill tone={status?.ok ? "success" : "warning"}>{status?.ok ? "Ready" : "Checking"}</StatusPill>
      </div>

      <div className="check-grid">
        {checks.map((check) => {
          const Icon = check.icon;
          return (
            <article className="check-row" key={check.label}>
              <Icon size={21} />
              <div>
                <span>{check.label}</span>
                <strong>{check.value}</strong>
              </div>
              <StatusPill tone={check.ok ? "success" : "warning"}>{check.ok ? "OK" : "Review"}</StatusPill>
            </article>
          );
        })}
      </div>
    </section>
  );
}
