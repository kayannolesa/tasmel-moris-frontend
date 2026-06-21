import { ShieldCheck } from "lucide-react";
import { DataTable, Field, FormAlert, SelectField } from "../common/WorkspacePrimitives.jsx";
import StatusPill from "../common/StatusPill.jsx";
import { apiRequest } from "../../services/api.js";
import { compactCode, formatDate, formatMoney } from "../../utils/format.js";

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function futureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function stripEmpty(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== "" && value !== undefined && value !== null));
}

export function statusTone(value) {
  const state = String(value || "").toUpperCase();
  if (["ACTIVE", "APPROVED", "ACCEPTED", "VALIDATED", "CLEAR", "PAID", "ALLOCATED", "CLOSED", "POSTED", "ISSUED", "COMPLETED", "MATCHED"].includes(state)) return "success";
  if (["DRAFT", "OPEN", "PENDING", "NOTIFIED", "REVIEWED", "UNDER_REVIEW", "PROPOSED", "IMPORTED", "UNMATCHED"].includes(state)) return "warning";
  if (["CANCELLED", "REVOKED", "RETIRED", "REJECTED", "OVERDUE", "FAILED", "VOID", "REVERSED", "NOT_CLEAR", "DEFAULTED"].includes(state)) return "danger";
  return "neutral";
}

export function optionLabel(...parts) {
  return parts.filter(Boolean).join(" - ");
}

export function safeJson(text, fallback = {}) {
  if (!text || !String(text).trim()) return fallback;
  return JSON.parse(text);
}

export function GovernanceShell({ error, success, children }) {
  return (
    <div className="module-workbench">
      <section className="content-band full-span">
        <div className="section-heading">
          <div>
            <span>Controlled maintenance</span>
            <h2>Correction Governance</h2>
          </div>
          <ShieldCheck size={22} />
        </div>
        <FormAlert error={error} success={success} />
      </section>
      {children}
    </div>
  );
}

export function StatePill({ value }) {
  return <StatusPill tone={statusTone(value)}>{compactCode(value)}</StatusPill>;
}

export function ReasonField({ value, onChange, label = "Mandatory reason" }) {
  return (
    <Field label={label}>
      <textarea required value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

export async function runMutation({ endpoint, method = "POST", body, setError, setSuccess, setSaving, successMessage, reload }) {
  setError("");
  setSuccess("");
  setSaving(true);
  try {
    await apiRequest(endpoint, { method, body: stripEmpty(body) });
    if (reload) await reload();
    setSuccess(successMessage);
  } catch (error) {
    setError(error.message);
  } finally {
    setSaving(false);
  }
}

export const commonColumns = {
  money: (key, label = "Amount") => ({ key, label, render: (row) => formatMoney(row[key] || 0) }),
  date: (key, label = "Date") => ({ key, label, render: (row) => formatDate(row[key]) }),
  state: (key, label = "State") => ({ key, label, render: (row) => <StatePill value={row[key]} /> }),
};

export { DataTable, Field, SelectField, compactCode, formatDate, formatMoney };
