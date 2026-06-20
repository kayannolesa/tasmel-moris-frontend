import { ArrowRight, CheckCircle2, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import StatusPill from "../components/common/StatusPill.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function passwordChecks(value) {
  return [
    { label: "At least 12 characters", passed: value.length >= 12 },
    { label: "Uppercase and lowercase letters", passed: /[A-Z]/.test(value) && /[a-z]/.test(value) },
    { label: "At least one number", passed: /[0-9]/.test(value) },
  ];
}

export default function ActivateAccountPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const checks = useMemo(() => passwordChecks(form.newPassword), [form.newPassword]);
  const checksPassed = checks.every((check) => check.passed);
  const passwordsMatch = form.newPassword && form.newPassword === form.confirmPassword;

  if (!auth.requiresPasswordChange) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!checksPassed || !passwordsMatch) {
      setError("Choose a password that meets every rule and confirm it exactly.");
      return;
    }

    setSaving(true);
    try {
      await auth.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      navigate("/", { replace: true });
    } catch (submitError) {
      setError(submitError.message || "Account activation failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="activation-page">
      <section className="activation-panel">
        <div className="activation-panel__mast">
          <div className="brand-lockup">
            <div className="brand-lockup__seal">
              <img src="/mor-logo.png" alt="Ministry of Revenue logo" />
            </div>
            <div>
              <span>Ministry of Revenue</span>
              <strong>MORIS</strong>
            </div>
          </div>

          <div className="activation-statement">
            <StatusPill tone="warning">Activation required</StatusPill>
            <h1>Secure Your Staff Account</h1>
            <p>
              Your account is using a temporary password. Create a permanent password before accessing Ministry of Revenue
              records and operational workspaces.
            </p>
          </div>

          <div className="activation-summary">
            <ShieldCheck size={20} />
            <div>
              <span>{auth.actor?.username_txt}</span>
              <strong>{auth.actor?.display_name_txt}</strong>
            </div>
          </div>
        </div>

        <form className="activation-form" onSubmit={handleSubmit}>
          <div className="login-form__header">
            <div>
              <span>First login</span>
              <h2>Change Password</h2>
            </div>
            <KeyRound size={24} />
          </div>

          <label className="field">
            <span>Temporary password</span>
            <input
              autoComplete="current-password"
              type="password"
              value={form.currentPassword}
              onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))}
              required
            />
          </label>

          <label className="field">
            <span>New password</span>
            <input
              autoComplete="new-password"
              type="password"
              value={form.newPassword}
              onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
              required
            />
          </label>

          <label className="field">
            <span>Confirm new password</span>
            <input
              autoComplete="new-password"
              type="password"
              value={form.confirmPassword}
              onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
              required
            />
          </label>

          <div className="password-checks" aria-label="Password rules">
            {checks.map((check) => (
              <span className={check.passed ? "is-passed" : ""} key={check.label}>
                <CheckCircle2 size={15} />
                {check.label}
              </span>
            ))}
            <span className={passwordsMatch ? "is-passed" : ""}>
              <CheckCircle2 size={15} />
              Confirmation matches
            </span>
          </div>

          {error ? <div className="form-alert">{error}</div> : null}

          <button className="primary-button" type="submit" disabled={saving}>
            <span>{saving ? "Activating" : "Activate account"}</span>
            <ArrowRight size={18} />
          </button>

          <button className="secondary-button" type="button" onClick={auth.logout}>
            <LogOut size={17} />
            <span>Sign out</span>
          </button>
        </form>
      </section>
    </main>
  );
}
