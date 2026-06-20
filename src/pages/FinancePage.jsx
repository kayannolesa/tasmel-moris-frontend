import { BadgeDollarSign, Banknote, BookOpenCheck, ClipboardList } from "lucide-react";
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
  { id: "receipts", label: "Receipting" },
  { id: "ledger", label: "Accounts And Journals" },
  { id: "controls", label: "Refunds And Controls" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

function statusTone(value) {
  const status = String(value || "");
  if (["RECEIVED", "ALLOCATED", "POSTED", "CLOSED", "APPROVED"].includes(status)) return "success";
  if (["OPEN", "REQUESTED", "PENDING"].includes(status)) return "warning";
  if (["REJECTED", "VOID", "FAILED"].includes(status)) return "danger";
  return "neutral";
}

const initialReceipt = {
  subject_uid: "",
  liability_notice_uid: "",
  service_site_uid: "",
  total_received_amt: "",
  payer_name_txt: "",
  channel_cd: "COUNTER",
  tender_type_cd: "CASH",
  tender_reference_txt: "",
  create_suspense_bool: false,
  suspense_reason_txt: "",
};

const initialRefund = { subject_uid: "", revenue_kind_uid: "", requested_amt: "", request_reason_txt: "" };
const initialReconciliation = {
  reconciliation_type_cd: "CASHIERING",
  period_start_dt: firstDayOfMonth(),
  period_end_dt: today(),
  variance_amt: 0,
};
const initialClose = {
  close_period_cd: new Date().toISOString().slice(0, 7),
  period_start_dt: firstDayOfMonth(),
  period_end_dt: today(),
  close_state_cd: "OPEN",
  lock_financial_posting_bool: false,
};

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState("receipts");
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [lookups, setLookups] = useState({});
  const [serviceSites, setServiceSites] = useState([]);
  const [notices, setNotices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [journals, setJournals] = useState([]);
  const [suspense, setSuspense] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [periodCloses, setPeriodCloses] = useState([]);
  const [receiptForm, setReceiptForm] = useState(initialReceipt);
  const [refundForm, setRefundForm] = useState(initialRefund);
  const [reconciliationForm, setReconciliationForm] = useState(initialReconciliation);
  const [closeForm, setCloseForm] = useState(initialClose);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const [
      overviewPayload,
      subjectsPayload,
      lookupPayload,
      sitesPayload,
      noticesPayload,
      receiptsPayload,
      accountsPayload,
      journalsPayload,
      suspensePayload,
      refundsPayload,
      reconciliationsPayload,
      closesPayload,
    ] = await Promise.all([
      apiRequest("/api/finance/overview"),
      apiRequest("/api/registry/subjects?pageSize=100"),
      apiRequest("/api/configuration/lookups"),
      apiRequest("/api/admin/service-sites"),
      apiRequest("/api/assessment/liability-notices?pageSize=100&liability_state_cd=POSTED"),
      apiRequest("/api/finance/receipts?pageSize=80"),
      apiRequest("/api/finance/account-summaries?pageSize=80"),
      apiRequest("/api/finance/journal-batches?pageSize=80"),
      apiRequest("/api/finance/suspense-items?pageSize=80"),
      apiRequest("/api/finance/refunds?pageSize=80"),
      apiRequest("/api/finance/reconciliations?pageSize=80"),
      apiRequest("/api/finance/period-closes?pageSize=80"),
    ]);

    setOverview(overviewPayload.overview);
    setSubjects(subjectsPayload.rows || []);
    setLookups(lookupPayload.lookups || {});
    setServiceSites(sitesPayload.service_sites || []);
    setNotices(noticesPayload.rows || []);
    setReceipts(receiptsPayload.rows || []);
    setAccounts(accountsPayload.rows || []);
    setJournals(journalsPayload.rows || []);
    setSuspense(suspensePayload.rows || []);
    setRefunds(refundsPayload.rows || []);
    setReconciliations(reconciliationsPayload.rows || []);
    setPeriodCloses(closesPayload.rows || []);
  }

  useEffect(() => {
    void load().catch((loadError) => setError(loadError.message));
  }, []);

  function syncNotice(liabilityNoticeUid) {
    const notice = notices.find((item) => item.liability_notice_uid === liabilityNoticeUid);
    setReceiptForm({
      ...receiptForm,
      liability_notice_uid: liabilityNoticeUid,
      subject_uid: notice?.subject_uid || receiptForm.subject_uid,
      payer_name_txt: notice?.display_name_txt || receiptForm.payer_name_txt,
      total_received_amt: notice?.net_liability_amt ?? receiptForm.total_received_amt,
    });
  }

  async function submitReceipt(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      const selectedNotice = notices.find((notice) => notice.liability_notice_uid === receiptForm.liability_notice_uid);
      const amount = Number(receiptForm.total_received_amt);
      const allocation =
        receiptForm.subject_uid && !receiptForm.create_suspense_bool
          ? [
              {
                subject_uid: receiptForm.subject_uid,
                revenue_kind_uid: selectedNotice?.revenue_kind_uid || null,
                liability_notice_uid: receiptForm.liability_notice_uid || null,
                allocated_amt: amount,
              },
            ]
          : [];
      await apiRequest("/api/finance/receipts", {
        method: "POST",
        body: {
          subject_uid: receiptForm.subject_uid || null,
          service_site_uid: receiptForm.service_site_uid || null,
          total_received_amt: amount,
          payer_name_txt: receiptForm.payer_name_txt || null,
          channel_cd: receiptForm.channel_cd,
          tenders: [
            {
              tender_type_cd: receiptForm.tender_type_cd,
              tender_reference_txt: receiptForm.tender_reference_txt || null,
              tender_amt: amount,
            },
          ],
          allocations: allocation,
          create_suspense_bool: receiptForm.create_suspense_bool,
          suspense_reason_txt: receiptForm.suspense_reason_txt || null,
        },
      });
      setReceiptForm(initialReceipt);
      await load();
      setSuccess("Receipt posted and ledger updated");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function submitRefund(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      await apiRequest("/api/finance/refunds", {
        method: "POST",
        body: {
          ...refundForm,
          revenue_kind_uid: refundForm.revenue_kind_uid || null,
          requested_amt: Number(refundForm.requested_amt),
          request_reason_txt: refundForm.request_reason_txt || null,
        },
      });
      setRefundForm(initialRefund);
      await load();
      setSuccess("Refund request lodged");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function submitReconciliation(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      await apiRequest("/api/finance/reconciliations", {
        method: "POST",
        body: { ...reconciliationForm, variance_amt: Number(reconciliationForm.variance_amt || 0) },
      });
      setReconciliationForm(initialReconciliation);
      await load();
      setSuccess("Reconciliation session opened");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function submitPeriodClose(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      await apiRequest("/api/finance/period-closes", { method: "POST", body: closeForm });
      setCloseForm(initialClose);
      await load();
      setSuccess("Financial period control recorded");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  const receiptColumns = [
    { key: "receipt_no", label: "Receipt" },
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || row.payer_name_txt || "-" },
    { key: "received_ts", label: "Received", render: (row) => formatDateTime(row.received_ts) },
    { key: "total_received_amt", label: "Amount", render: (row) => formatMoney(row.total_received_amt) },
    { key: "receipt_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.receipt_state_cd)}>{compactCode(row.receipt_state_cd)}</StatusPill> },
  ];

  const accountColumns = [
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "revenue_kind_name", label: "Revenue kind", render: (row) => row.revenue_kind_name || "All revenue" },
    { key: "component_name", label: "Component", render: (row) => row.component_name || "-" },
    { key: "debit_total_amt", label: "Debit", render: (row) => formatMoney(row.debit_total_amt) },
    { key: "credit_total_amt", label: "Credit", render: (row) => formatMoney(row.credit_total_amt) },
    { key: "balance_amt", label: "Balance", render: (row) => formatMoney(row.balance_amt) },
  ];

  const journalColumns = [
    { key: "journal_batch_no", label: "Batch" },
    { key: "batch_type_cd", label: "Type", render: (row) => compactCode(row.batch_type_cd) },
    { key: "posting_dt", label: "Posting date", render: (row) => formatDate(row.posting_dt) },
    { key: "line_count", label: "Lines", render: (row) => formatNumber(row.line_count) },
    { key: "posting_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.posting_state_cd)}>{compactCode(row.posting_state_cd)}</StatusPill> },
  ];

  const suspenseColumns = [
    { key: "suspense_no", label: "Suspense" },
    { key: "suspense_amt", label: "Amount", render: (row) => formatMoney(row.suspense_amt) },
    { key: "suspense_reason_txt", label: "Reason" },
    { key: "suspense_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.suspense_state_cd)}>{compactCode(row.suspense_state_cd)}</StatusPill> },
  ];

  const refundColumns = [
    { key: "refund_request_no", label: "Refund" },
    { key: "subject_uid", label: "Subject UID" },
    { key: "requested_amt", label: "Amount", render: (row) => formatMoney(row.requested_amt) },
    { key: "refund_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.refund_state_cd)}>{compactCode(row.refund_state_cd)}</StatusPill> },
  ];

  const reconciliationColumns = [
    { key: "session_no", label: "Session" },
    { key: "reconciliation_type_cd", label: "Type", render: (row) => compactCode(row.reconciliation_type_cd) },
    { key: "period_start_dt", label: "Start", render: (row) => formatDate(row.period_start_dt) },
    { key: "period_end_dt", label: "End", render: (row) => formatDate(row.period_end_dt) },
    { key: "variance_amt", label: "Variance", render: (row) => formatMoney(row.variance_amt) },
  ];

  const closeColumns = [
    { key: "close_period_cd", label: "Period" },
    { key: "period_start_dt", label: "Start", render: (row) => formatDate(row.period_start_dt) },
    { key: "period_end_dt", label: "End", render: (row) => formatDate(row.period_end_dt) },
    { key: "close_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.close_state_cd)}>{compactCode(row.close_state_cd)}</StatusPill> },
  ];

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Finance, receipting and accounting" title="Receipts, Ledger And Financial Controls" status="Posting enabled" tone="success" />

      <div className="metric-grid">
        <MetricTile icon={Banknote} label="Receipts" value={formatNumber(overview?.receipt_count)} sublabel={formatMoney(overview?.receipt_total_amt)} />
        <MetricTile icon={BadgeDollarSign} label="Account balance" value={formatMoney(overview?.account_balance_amt)} />
        <MetricTile icon={BookOpenCheck} label="Journal batches" value={formatNumber(overview?.journal_batch_count)} />
        <MetricTile icon={ClipboardList} label="Open suspense" value={formatNumber(overview?.open_suspense_count)} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "receipts" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Counter receipt</span>
                <h2>Receive Payment</h2>
              </div>
            </div>
            <form className="action-form" onSubmit={submitReceipt}>
              <SelectField label="Posted liability" value={receiptForm.liability_notice_uid} onChange={syncNotice}>
                <option value="">No liability selected</option>
                {notices.map((notice) => (
                  <option key={notice.liability_notice_uid} value={notice.liability_notice_uid}>
                    {notice.liability_notice_no} - {notice.display_name_txt}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Taxpayer" value={receiptForm.subject_uid} onChange={(value) => setReceiptForm({ ...receiptForm, subject_uid: value })}>
                <option value="">Unidentified payer</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_uid} value={subject.subject_uid}>
                    {subject.display_name_txt}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Service site" value={receiptForm.service_site_uid} onChange={(value) => setReceiptForm({ ...receiptForm, service_site_uid: value })}>
                <option value="">Current office</option>
                {serviceSites.map((site) => (
                  <option key={site.service_site_uid} value={site.service_site_uid}>
                    {site.site_name}
                  </option>
                ))}
              </SelectField>
              <Field label="Payer name">
                <input value={receiptForm.payer_name_txt} onChange={(event) => setReceiptForm({ ...receiptForm, payer_name_txt: event.target.value })} />
              </Field>
              <div className="compact-form">
                <Field label="Amount received">
                  <input type="number" required value={receiptForm.total_received_amt} onChange={(event) => setReceiptForm({ ...receiptForm, total_received_amt: event.target.value })} />
                </Field>
                <Field label="Tender type">
                  <input value={receiptForm.tender_type_cd} onChange={(event) => setReceiptForm({ ...receiptForm, tender_type_cd: event.target.value.toUpperCase() })} />
                </Field>
              </div>
              <div className="compact-form">
                <Field label="Channel">
                  <input value={receiptForm.channel_cd} onChange={(event) => setReceiptForm({ ...receiptForm, channel_cd: event.target.value.toUpperCase() })} />
                </Field>
                <Field label="Tender reference">
                  <input value={receiptForm.tender_reference_txt} onChange={(event) => setReceiptForm({ ...receiptForm, tender_reference_txt: event.target.value })} />
                </Field>
              </div>
              <label className="check-row">
                <span>Hold receipt in suspense</span>
                <input type="checkbox" checked={receiptForm.create_suspense_bool} onChange={(event) => setReceiptForm({ ...receiptForm, create_suspense_bool: event.target.checked })} />
              </label>
              {receiptForm.create_suspense_bool ? (
                <Field label="Suspense reason">
                  <textarea value={receiptForm.suspense_reason_txt} onChange={(event) => setReceiptForm({ ...receiptForm, suspense_reason_txt: event.target.value })} />
                </Field>
              ) : null}
              <button className="primary-button" type="submit">Post receipt</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={receiptColumns} rows={receipts} keyField="receipt_event_uid" empty="No receipts" />
          </section>
        </div>
      ) : null}

      {activeTab === "ledger" ? (
        <div className="module-workbench module-workbench--wide">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Taxpayer balances</span>
                <h2>Account Summaries</h2>
              </div>
            </div>
            <DataTable columns={accountColumns} rows={accounts} keyField="account_summary_uid" empty="No account balances" />
          </section>
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Accounting postings</span>
                <h2>Journal Batches</h2>
              </div>
            </div>
            <DataTable columns={journalColumns} rows={journals} keyField="journal_batch_uid" empty="No journal batches" />
            <br />
            <DataTable columns={suspenseColumns} rows={suspense} keyField="suspense_item_uid" empty="No suspense items" />
          </section>
        </div>
      ) : null}

      {activeTab === "controls" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Refund control</span>
                <h2>Request Refund</h2>
              </div>
            </div>
            <form className="action-form" onSubmit={submitRefund}>
              <SelectField label="Taxpayer" value={refundForm.subject_uid} onChange={(value) => setRefundForm({ ...refundForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_uid} value={subject.subject_uid}>
                    {subject.display_name_txt}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Revenue kind" value={refundForm.revenue_kind_uid} onChange={(value) => setRefundForm({ ...refundForm, revenue_kind_uid: value })}>
                <option value="">Any revenue kind</option>
                {(lookups.revenue_kinds || []).map((kind) => (
                  <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>
                    {kind.revenue_kind_name}
                  </option>
                ))}
              </SelectField>
              <Field label="Refund amount">
                <input type="number" required value={refundForm.requested_amt} onChange={(event) => setRefundForm({ ...refundForm, requested_amt: event.target.value })} />
              </Field>
              <Field label="Reason">
                <textarea value={refundForm.request_reason_txt} onChange={(event) => setRefundForm({ ...refundForm, request_reason_txt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit">Lodge refund</button>
            </form>
            <hr />
            <form className="compact-form" onSubmit={submitReconciliation}>
              <Field label="Reconciliation type">
                <input value={reconciliationForm.reconciliation_type_cd} onChange={(event) => setReconciliationForm({ ...reconciliationForm, reconciliation_type_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Variance">
                <input type="number" value={reconciliationForm.variance_amt} onChange={(event) => setReconciliationForm({ ...reconciliationForm, variance_amt: event.target.value })} />
              </Field>
              <Field label="Start">
                <input type="date" value={reconciliationForm.period_start_dt} onChange={(event) => setReconciliationForm({ ...reconciliationForm, period_start_dt: event.target.value })} />
              </Field>
              <Field label="End">
                <input type="date" value={reconciliationForm.period_end_dt} onChange={(event) => setReconciliationForm({ ...reconciliationForm, period_end_dt: event.target.value })} />
              </Field>
              <button className="secondary-button full-span" type="submit">Open reconciliation</button>
            </form>
            <hr />
            <form className="compact-form" onSubmit={submitPeriodClose}>
              <Field label="Period code">
                <input value={closeForm.close_period_cd} onChange={(event) => setCloseForm({ ...closeForm, close_period_cd: event.target.value.toUpperCase() })} />
              </Field>
              <SelectField label="Close state" value={closeForm.close_state_cd} onChange={(value) => setCloseForm({ ...closeForm, close_state_cd: value })}>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </SelectField>
              <Field label="Start">
                <input type="date" value={closeForm.period_start_dt} onChange={(event) => setCloseForm({ ...closeForm, period_start_dt: event.target.value })} />
              </Field>
              <Field label="End">
                <input type="date" value={closeForm.period_end_dt} onChange={(event) => setCloseForm({ ...closeForm, period_end_dt: event.target.value })} />
              </Field>
              <label className="check-row full-span">
                <span>Lock financial posting</span>
                <input type="checkbox" checked={closeForm.lock_financial_posting_bool} onChange={(event) => setCloseForm({ ...closeForm, lock_financial_posting_bool: event.target.checked })} />
              </label>
              <button className="secondary-button full-span" type="submit">Record period control</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={refundColumns} rows={refunds} keyField="refund_request_uid" empty="No refund requests" />
            <br />
            <DataTable columns={reconciliationColumns} rows={reconciliations} keyField="reconciliation_session_uid" empty="No reconciliation sessions" />
            <br />
            <DataTable columns={closeColumns} rows={periodCloses} keyField="period_close_uid" empty="No period close controls" />
          </section>
        </div>
      ) : null}
    </section>
  );
}
