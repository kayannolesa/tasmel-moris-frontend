import { KeyRound, Lock, ShieldCheck, UserRoundCheck } from "lucide-react";
import { useEffect, useState } from "react";
import StatusPill from "../components/common/StatusPill.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest } from "../services/api.js";

export default function SecurityPage() {
  const auth = useAuth();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    void apiRequest("/api/system/security-summary").then((payload) => setSummary(payload.summary));
  }, []);

  const stats = [
    { label: "Actors", value: summary?.actor_count ?? "-", icon: UserRoundCheck },
    { label: "Roles", value: summary?.role_count ?? "-", icon: ShieldCheck },
    { label: "Grants", value: summary?.grant_count ?? "-", icon: KeyRound },
    { label: "Sessions", value: summary?.active_session_count ?? "-", icon: Lock },
  ];

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <span>Access control</span>
          <h1>Security Command</h1>
        </div>
        <StatusPill tone="success">RBAC enforced</StatusPill>
      </div>

      <div className="metric-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article className="metric-tile" key={stat.label}>
              <Icon size={22} />
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </article>
          );
        })}
      </div>

      <section className="content-band">
        <div className="section-heading">
          <span>Assigned roles</span>
          <h2>{auth.actor?.roles?.length || 0} active</h2>
        </div>
        <div className="role-list">
          {auth.actor?.roles?.map((role) => (
            <div className="role-row" key={role.role_bundle_uid}>
              <ShieldCheck size={18} />
              <strong>{role.role_name}</strong>
              <span>{role.role_code}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
