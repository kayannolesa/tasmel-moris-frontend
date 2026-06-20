import { ArrowRight, CheckCircle2, LockKeyhole, ServerCog, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import StatusPill from "../components/common/StatusPill.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest, getApiBaseUrl } from "../services/api.js";

export default function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ login: "", password: "" });
  const [status, setStatus] = useState(null);
  const [systemStatus, setSystemStatus] = useState({ state: "checking", label: "Checking" });
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest("/api/system/status", { auth: false, retry: false })
      .then((payload) => {
        if (!active) return;
        setSystemStatus({
          state: payload.ok ? "online" : "degraded",
          label: payload.ok ? "Online" : "Degraded",
        });
      })
      .catch(() => {
        if (!active) return;
        setSystemStatus({ state: "offline", label: "Offline" });
      });
    return () => {
      active = false;
    };
  }, []);

  if (auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setStatus("submitting");
    try {
      await auth.login(form);
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (submitError) {
      setError(submitError.message || "Sign in failed.");
    } finally {
      setStatus(null);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-panel__mast">
          <div className="brand-lockup">
            <div className="brand-lockup__seal">
              <img src="/mor-logo.png" alt="Ministry of Revenue logo" />
            </div>
            <div>
              <span>Ministry of Revenue</span>
              <strong>MORIS</strong>
            </div>
          </div>
          <div className="login-panel__statement">
            <h1>Ministry of Revenue Integrated System</h1>
            <p>Secure staff access for revenue administration, taxpayer services, finance, compliance, and executive oversight.</p>
          </div>
          <div className="login-assurance">
            <span><ShieldCheck size={16} /> Role controlled</span>
            <span><ServerCog size={16} /> Render live</span>
            <span><CheckCircle2 size={16} /> PostgreSQL connected</span>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-form__header">
            <div>
              <span>Staff sign in</span>
              <h2>Welcome back</h2>
            </div>
            <StatusPill tone={systemStatus.state === "online" ? "success" : systemStatus.state === "offline" ? "danger" : "warning"}>
              {systemStatus.label}
            </StatusPill>
          </div>

          <label className="field">
            <span>Email or username</span>
            <input
              autoComplete="username"
              value={form.login}
              onChange={(event) => setForm((current) => ({ ...current, login: event.target.value }))}
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </label>

          {error ? <div className="form-alert">{error}</div> : null}

          <button className="primary-button" type="submit" disabled={status === "submitting"}>
            <LockKeyhole size={18} />
            <span>{status === "submitting" ? "Signing in" : "Sign in"}</span>
            <ArrowRight size={18} />
          </button>

          <div className="login-form__meta">
            <span>API</span>
            <strong>{getApiBaseUrl() || "Not configured"}</strong>
          </div>
        </form>
      </section>
    </main>
  );
}
