import { KeyRound, UserCircle } from "lucide-react";
import { useState } from "react";
import StatusPill from "../components/common/StatusPill.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function AccountPage() {
  const auth = useAuth();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      await auth.changePassword(form);
      setForm({ currentPassword: "", newPassword: "" });
      setMessage("Password updated.");
    } catch (submitError) {
      setError(submitError.message || "Password update failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <span>Account</span>
          <h1>{auth.actor?.display_name_txt}</h1>
        </div>
        <StatusPill tone="success">Active</StatusPill>
      </div>

      <section className="content-band">
        <div className="account-summary">
          <UserCircle size={42} />
          <div>
            <span>{auth.actor?.actor_no}</span>
            <strong>{auth.actor?.email_txt || auth.actor?.username_txt}</strong>
          </div>
        </div>
      </section>

      <form className="content-band account-form" onSubmit={handleSubmit}>
        <div className="section-heading">
          <span>Credential</span>
          <h2>Password</h2>
        </div>
        <label className="field">
          <span>Current password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))}
            required
          />
        </label>
        <label className="field">
          <span>New password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
            required
          />
        </label>
        {error ? <div className="form-alert">{error}</div> : null}
        {message ? <div className="form-success">{message}</div> : null}
        <button className="primary-button account-form__button" type="submit" disabled={saving}>
          <KeyRound size={18} />
          <span>{saving ? "Saving" : "Update password"}</span>
        </button>
      </form>
    </section>
  );
}
