import {
  BadgeDollarSign,
  Banknote,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
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
import StatusPill from "../components/common/StatusPill.jsx";
import { apiRequest } from "../services/api.js";
import { compactCode, formatDate, formatDateTime, formatMoney, formatNumber } from "../utils/format.js";

const tabs = [
  { id: "receipts", label: "Receipt Workbench" },
  { id: "allocation", label: "Allocation And Suspense" },
  { id: "ledger", label: "Accounts And Journals" },
  { id: "refunds", label: "Refunds" },
  { id: "controls", label: "Reconciliation And Close" },
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
  if (["ALLOCATED", "POSTED", "CLOSED", "APPROVED", "PAID", "RESOLVED", "COMPLETED"].includes(status)) return "success";
  if (["OPEN", "REQUESTED", "PENDING", "DRAFT"].includes(status)) return "warning";
  if (["REJECTED", "VOID", "FAILED", "REVERSED", "CANCELLED"].includes(status)) return "danger";
  return "neutral";
}

const initialFilters = {
  q: "",
  receipt_state_cd: "",
  received_from_dt: "",
  received_to_dt: "",
};

const initialReceipt = {
  subject_uid: "",
  liability_notice_uid: "",
  service_site_uid: "",
  total_received_amt: "",
  payer_name_txt: "",
  channel_cd: "COUNTER",
  allocation_strategy_cd: "AUTO_OLDEST",
  save_as_draft_bool: false,
  tender_type_cd: "CASH",
  tender_reference_txt: "",
  bank_name_txt: "",
  bank_account_txt: "",
  payment_provider_cd: "",
  settlement_dt: today(),
  suspense_reason_txt: "",
};

const initialSuspenseAllocation = {
  suspense_item_uid: "",
  liability_notice_uid: "",
  subject_uid: "",
  allocated_amt: "",
  resolution_txt: "",
};

const initialRefund = { subject_uid: "", revenue_kind_uid: "", requested_amt: "", request_reason_txt: "" };

const initialReconciliation = {
  reconciliation_type_cd: "CASHIERING",
  period_start_dt: firstDayOfMonth(),
  period_end_dt: today(),
  counted_receipt_amt: "",
  notes_txt: "",
};

const initialClose = {
  close_period_cd: new Date().toISOString().slice(0, 7),
  period_start_dt: firstDayOfMonth(),
  period_end_dt: today(),
  close_state_cd: "OPEN",
  lock_financial_posting_bool: false,
  close_reason_txt: "",
};

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, value);
  });
  return search.toString();
}

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState("receipts");
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [lookups, setLookups] = useState({});
  const [serviceSites, setServiceSites] = useState([]);
  const [liabilityBalances, setLiabilityBalances] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [journals, setJournals] = useState([]);
  const [suspense, setSuspense] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [periodCloses, setPeriodCloses] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [receiptForm, setReceiptForm] = useState(initialReceipt);
  const [suspenseForm, setSuspenseForm] = useState(initialSuspenseAllocation);
  const [refundForm, setRefundForm] = useState(initialRefund);
  const [reconciliationForm, setReconciliationForm] = useState(initialReconciliation);
  const [closeForm, setCloseForm] = useState(initialClose);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const openSuspense = suspense.filter((item) => item.suspense_state_cd === "OPEN");
  const openLiabilities = liabilityBalances.filter((item) => Number(item.outstanding_amt || 0) > 0);
  const selectedLiability = useMemo(
    () => liabilityBalances.find((item) => item.liability_notice_uid === receiptForm.liability_notice_uid),
    [liabilityBalances, receiptForm.liability_notice_uid]
  );

  async function load(nextFilters = filters) {
    const receiptQuery = buildQuery({ ...nextFilters, pageSize: 100 });
    const [
      overviewPayload,
      subjectsPayload,
      lookupPayload,
      sitesPayload,
      liabilityPayload,
      receiptsPayload,
      accountsPayload,
      journalsPayload,
      suspensePayload,
      refundsPayload,
      reconciliationsPayload,
      closesPayload,
    ] = await Promise.all([
      apiRequest("/api/finance/overview"),
      apiRequest("/api/registry/subjects?pageSize=150"),
      apiRequest("/api/configuration/lookups"),
      apiRequest("/api/admin/service-sites"),
      apiRequest("/api/finance/liability-balances?pageSize=150&open_only_bool=true"),
      apiRequest(`/api/finance/receipts?${receiptQuery}`),
      apiRequest("/api/finance/account-summaries?pageSize=100"),
      apiRequest("/api/finance/journal-batches?pageSize=100"),
      apiRequest("/api/finance/suspense-items?pageSize=100"),
      apiRequest("/api/finance/refunds?pageSize=100"),
      apiRequest("/api/finance/reconciliations?pageSize=100"),
      apiRequest("/api/finance/period-closes?pageSize=100"),
    ]);

    setOverview(overviewPayload.overview);
    setSubjects(subjectsPayload.rows || []);
    setLookups(lookupPayload.lookups || {});
    setServiceSites(sitesPayload.service_sites || []);
    setLiabilityBalances(liabilityPayload.rows || []);
    setReceipts(receiptsPayload.rows || []);
    setAccounts(accountsPayload.rows || []);
    setJournals(journalsPayload.rows || []);
    setSuspense(suspensePayload.rows || []);
    setRefunds(refundsPayload.rows || []);
    setReconciliations(reconciliationsPayload.rows || []);
    setPeriodCloses(closesPayload.rows || []);
  }

  useEffect(() => {
    void load().catch((loadError) => setError(loadError.message)).finally(() => setLoading(false));
  }, []);

  function syncReceiptLiability(liabilityNoticeUid) {
    const notice = liabilityBalances.find((item) => item.liability_notice_uid === liabilityNoticeUid);
    setReceiptForm({
      ...receiptForm,
      liability_notice_uid: liabilityNoticeUid,
      subject_uid: notice?.subject_uid || receiptForm.subject_uid,
      payer_name_txt: notice?.display_name_txt || receiptForm.payer_name_txt,
      total_received_amt: notice?.outstanding_amt ?? receiptForm.total_received_amt,
      allocation_strategy_cd: liabilityNoticeUid ? "SELECTED_LIABILITY" : receiptForm.allocation_strategy_cd,
    });
  }

  function syncSuspenseItem(suspenseItemUid) {
    const item = suspense.find((entry) => entry.suspense_item_uid === suspenseItemUid);
    setSuspenseForm({
      ...suspenseForm,
      suspense_item_uid: suspenseItemUid,
      subject_uid: item?.subject_uid || suspenseForm.subject_uid,
      allocated_amt: item ? Number(item.suspense_amt || 0) - Number(item.allocated_amt || 0) : suspenseForm.allocated_amt,
    });
  }

  async function loadReceiptDetail(receiptEventUid) {
    setError("");
    setSuccess("");
    const payload = await apiRequest(`/api/finance/receipts/${receiptEventUid}`);
    setSelectedReceipt(payload.receipt);
  }

  async function runReceiptSearch(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      await load(filters);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function submitReceipt(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      const amount = Number(receiptForm.total_received_amt);
      const strategy = receiptForm.save_as_draft_bool ? "DRAFT" : receiptForm.allocation_strategy_cd;
      const allocations =
        strategy === "SELECTED_LIABILITY" && selectedLiability
          ? [
              {
                subject_uid: selectedLiability.subject_uid,
                revenue_kind_uid: selectedLiability.revenue_kind_uid,
                liability_notice_uid: selectedLiability.liability_notice_uid,
                period_instance_uid: selectedLiability.period_instance_uid,
                allocated_amt: amount,
                allocation_method_cd: "MANUAL",
                allocation_reason_txt: "Officer selected liability during receipt capture.",
              },
            ]
          : undefined;

      const payload = await apiRequest("/api/finance/receipts", {
        method: "POST",
        body: {
          subject_uid: receiptForm.subject_uid || null,
          service_site_uid: receiptForm.service_site_uid || null,
          receipt_state_cd: receiptForm.save_as_draft_bool ? "DRAFT" : undefined,
          save_as_draft_bool: receiptForm.save_as_draft_bool,
          total_received_amt: amount,
          payer_name_txt: receiptForm.payer_name_txt || null,
          channel_cd: receiptForm.channel_cd,
          auto_allocate_bool: strategy === "AUTO_OLDEST",
          create_suspense_bool: strategy === "SUSPENSE",
          suspense_reason_txt: receiptForm.suspense_reason_txt || null,
          allocations,
          tenders: [
            {
              tender_type_cd: receiptForm.tender_type_cd,
              tender_reference_txt: receiptForm.tender_reference_txt || null,
              tender_amt: amount,
              bank_name_txt: receiptForm.bank_name_txt || null,
              bank_account_txt: receiptForm.bank_account_txt || null,
              payment_provider_cd: receiptForm.payment_provider_cd || null,
              settlement_dt: receiptForm.settlement_dt || null,
            },
          ],
        },
      });
      setReceiptForm(initialReceipt);
      setSelectedReceipt(payload.receipt);
      await load();
      setSuccess("Receipt recorded with tender, allocation, suspense, and journal controls.");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function reverseReceipt(receiptEventUid) {
    setError("");
    setSuccess("");
    try {
      const payload = await apiRequest(`/api/finance/receipts/${receiptEventUid}/state`, {
        method: "PATCH",
        body: { workflow_action_cd: "REVERSE", reason_txt: "Receipt reversed from Finance Workbench." },
      });
      setSelectedReceipt(payload.receipt);
      await load();
      setSuccess("Receipt reversed with controlled journal and account summary reversal.");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function allocateSuspense(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/finance/suspense-items/${suspenseForm.suspense_item_uid}/allocate`, {
        method: "POST",
        body: {
          subject_uid: suspenseForm.subject_uid || null,
          liability_notice_uid: suspenseForm.liability_notice_uid || null,
          allocated_amt: suspenseForm.allocated_amt ? Number(suspenseForm.allocated_amt) : undefined,
          resolution_txt: suspenseForm.resolution_txt || null,
        },
      });
      setSuspenseForm(initialSuspenseAllocation);
      await load();
      setSuccess("Suspense item allocated and released to taxpayer receivables.");
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
      setSuccess("Refund request lodged for approval.");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function updateRefund(refundRequestUid, workflowActionCd, row = null) {
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/finance/refunds/${refundRequestUid}/state`, {
        method: "PATCH",
        body: {
          workflow_action_cd: workflowActionCd,
          approved_amt: workflowActionCd === "APPROVE" ? Number(row?.requested_amt || 0) : undefined,
          reason_txt: "Refund decision recorded from Finance Workbench.",
        },
      });
      await load();
      setSuccess(`Refund ${compactCode(workflowActionCd).toLowerCase()} action completed.`);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function postRefund(refundRequestUid) {
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/finance/refunds/${refundRequestUid}/post`, { method: "POST" });
      await load();
      setSuccess("Approved refund posted to finance.");
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
        body: {
          ...reconciliationForm,
          counted_receipt_amt: reconciliationForm.counted_receipt_amt === "" ? undefined : Number(reconciliationForm.counted_receipt_amt),
          notes_txt: reconciliationForm.notes_txt || null,
        },
      });
      setReconciliationForm(initialReconciliation);
      await load();
      setSuccess("Reconciliation session opened with calculated tender and journal totals.");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function completeReconciliation(reconciliationSessionUid) {
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/finance/reconciliations/${reconciliationSessionUid}/state`, {
        method: "PATCH",
        body: { workflow_action_cd: "COMPLETE" },
      });
      await load();
      setSuccess("Reconciliation session completed.");
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
      setSuccess("Financial period control recorded.");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  const receiptColumns = [
    { key: "receipt_no", label: "Receipt" },
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || row.payer_name_txt || "Unidentified payer" },
    { key: "received_ts", label: "Received", render: (row) => formatDateTime(row.received_ts) },
    { key: "total_received_amt", label: "Amount", render: (row) => formatMoney(row.total_received_amt) },
    { key: "allocated_amt", label: "Allocated", render: (row) => formatMoney(row.allocated_amt || 0) },
    { key: "suspense_amt", label: "Suspense", render: (row) => formatMoney(row.suspense_amt || 0) },
    {
      key: "receipt_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={statusTone(row.receipt_state_cd)}>{compactCode(row.receipt_state_cd)}</StatusPill>,
    },
    {
      key: "actions",
      label: "Action",
      render: (row) => (
        <div className="table-button-row">
          <button className="table-action-button" type="button" onClick={() => loadReceiptDetail(row.receipt_event_uid)}>View</button>
          <button className="table-action-button" type="button" onClick={() => reverseReceipt(row.receipt_event_uid)} disabled={["REVERSED", "DRAFT"].includes(row.receipt_state_cd)}>
            Reverse
          </button>
        </div>
      ),
    },
  ];

  const liabilityColumns = [
    { key: "liability_notice_no", label: "Notice" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "revenue_kind_name", label: "Revenue type" },
    { key: "due_dt", label: "Due", render: (row) => formatDate(row.due_dt) },
    { key: "net_liability_amt", label: "Assessed", render: (row) => formatMoney(row.net_liability_amt) },
    { key: "allocated_amt", label: "Paid", render: (row) => formatMoney(row.allocated_amt || 0) },
    { key: "outstanding_amt", label: "Outstanding", render: (row) => formatMoney(row.outstanding_amt || 0) },
  ];

  const accountColumns = [
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "revenue_kind_name", label: "Revenue type", render: (row) => row.revenue_kind_name || "All revenue" },
    { key: "component_name", label: "Component", render: (row) => row.component_name || "-" },
    { key: "debit_total_amt", label: "Debit", render: (row) => formatMoney(row.debit_total_amt) },
    { key: "credit_total_amt", label: "Credit", render: (row) => formatMoney(row.credit_total_amt) },
    { key: "balance_amt", label: "Balance", render: (row) => formatMoney(row.balance_amt) },
  ];

  const journalColumns = [
    { key: "journal_batch_no", label: "Batch" },
    { key: "batch_type_cd", label: "Type", render: (row) => compactCode(row.batch_type_cd) },
    { key: "posting_dt", label: "Posting date", render: (row) => formatDate(row.posting_dt) },
    { key: "debit_total_amt", label: "Debit", render: (row) => formatMoney(row.debit_total_amt) },
    { key: "credit_total_amt", label: "Credit", render: (row) => formatMoney(row.credit_total_amt) },
    {
      key: "posting_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={statusTone(row.posting_state_cd)}>{compactCode(row.posting_state_cd)}</StatusPill>,
    },
  ];

  const suspenseColumns = [
    { key: "suspense_no", label: "Suspense" },
    { key: "receipt_no", label: "Receipt", render: (row) => row.receipt_no || "-" },
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "suspense_amt", label: "Amount", render: (row) => formatMoney(row.suspense_amt) },
    { key: "allocated_amt", label: "Allocated", render: (row) => formatMoney(row.allocated_amt || 0) },
    { key: "suspense_reason_txt", label: "Reason", render: (row) => row.suspense_reason_txt || "-" },
    {
      key: "suspense_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={statusTone(row.suspense_state_cd)}>{compactCode(row.suspense_state_cd)}</StatusPill>,
    },
  ];

  const refundColumns = [
    { key: "refund_request_no", label: "Refund" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "requested_amt", label: "Requested", render: (row) => formatMoney(row.requested_amt) },
    { key: "approved_amt", label: "Approved", render: (row) => formatMoney(row.approved_amt || 0) },
    {
      key: "refund_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={statusTone(row.refund_state_cd)}>{compactCode(row.refund_state_cd)}</StatusPill>,
    },
    {
      key: "actions",
      label: "Decision",
      render: (row) => (
        <div className="table-button-row">
          <button className="table-action-button" type="button" onClick={() => updateRefund(row.refund_request_uid, "APPROVE", row)} disabled={row.refund_state_cd !== "REQUESTED"}>Approve</button>
          <button className="table-action-button" type="button" onClick={() => updateRefund(row.refund_request_uid, "REJECT", row)} disabled={row.refund_state_cd !== "REQUESTED"}>Reject</button>
          <button className="table-action-button" type="button" onClick={() => postRefund(row.refund_request_uid)} disabled={row.refund_state_cd !== "APPROVED"}>Post</button>
        </div>
      ),
    },
  ];

  const reconciliationColumns = [
    { key: "session_no", label: "Session" },
    { key: "reconciliation_type_cd", label: "Type", render: (row) => compactCode(row.reconciliation_type_cd) },
    { key: "period_start_dt", label: "Start", render: (row) => formatDate(row.period_start_dt) },
    { key: "period_end_dt", label: "End", render: (row) => formatDate(row.period_end_dt) },
    { key: "expected_receipt_amt", label: "Expected", render: (row) => formatMoney(row.expected_receipt_amt) },
    { key: "counted_receipt_amt", label: "Counted", render: (row) => formatMoney(row.counted_receipt_amt) },
    { key: "variance_amt", label: "Variance", render: (row) => formatMoney(row.variance_amt) },
    {
      key: "reconciliation_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={statusTone(row.reconciliation_state_cd)}>{compactCode(row.reconciliation_state_cd)}</StatusPill>,
    },
    {
      key: "actions",
      label: "Action",
      render: (row) => (
        <button className="table-action-button" type="button" onClick={() => completeReconciliation(row.reconciliation_session_uid)} disabled={row.reconciliation_state_cd !== "OPEN"}>
          Complete
        </button>
      ),
    },
  ];

  const closeColumns = [
    { key: "close_period_cd", label: "Period" },
    { key: "period_start_dt", label: "Start", render: (row) => formatDate(row.period_start_dt) },
    { key: "period_end_dt", label: "End", render: (row) => formatDate(row.period_end_dt) },
    {
      key: "close_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={statusTone(row.close_state_cd)}>{compactCode(row.close_state_cd)}</StatusPill>,
    },
    {
      key: "lock_financial_posting_bool",
      label: "Posting",
      render: (row) => <StatusPill tone={row.lock_financial_posting_bool ? "danger" : "success"}>{row.lock_financial_posting_bool ? "Locked" : "Open"}</StatusPill>,
    },
  ];

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Finance, receipting and accounting"
        title="Finance Workbench"
        status={loading ? "Loading" : "Controlled posting"}
        tone={loading ? "warning" : "success"}
      />

      <div className="metric-grid">
        <MetricTile icon={Banknote} label="Receipts" value={formatNumber(overview?.receipt_count)} sublabel={formatMoney(overview?.receipt_total_amt)} />
        <MetricTile icon={BadgeDollarSign} label="Account balance" value={formatMoney(overview?.account_balance_amt)} />
        <MetricTile icon={WalletCards} label="Open suspense" value={formatNumber(overview?.open_suspense_count)} sublabel={formatMoney(overview?.open_suspense_amt)} />
        <MetricTile icon={CalendarClock} label="Locked periods" value={formatNumber(overview?.locked_period_count)} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "receipts" ? (
        <div className="finance-receipt-grid">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Cashier entry</span>
                <h2>Create Receipt</h2>
              </div>
              <ReceiptText size={22} />
            </div>
            <form className="finance-receipt-form" onSubmit={submitReceipt}>
              <SelectField label="Allocation mode" value={receiptForm.allocation_strategy_cd} onChange={(value) => setReceiptForm({ ...receiptForm, allocation_strategy_cd: value, liability_notice_uid: value === "SELECTED_LIABILITY" ? receiptForm.liability_notice_uid : "" })}>
                <option value="AUTO_OLDEST">Auto allocate oldest liability</option>
                <option value="SELECTED_LIABILITY">Allocate selected liability</option>
                <option value="SUSPENSE">Hold in suspense</option>
              </SelectField>
              <SelectField label="Posted liability" value={receiptForm.liability_notice_uid} onChange={syncReceiptLiability}>
                <option value="">No liability selected</option>
                {openLiabilities.map((notice) => (
                  <option key={notice.liability_notice_uid} value={notice.liability_notice_uid}>
                    {notice.liability_notice_no} - {notice.display_name_txt} - {formatMoney(notice.outstanding_amt)}
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
              <Field label="Amount received">
                <input type="number" min="0.01" step="0.01" required value={receiptForm.total_received_amt} onChange={(event) => setReceiptForm({ ...receiptForm, total_received_amt: event.target.value })} />
              </Field>
              <SelectField label="Tender type" value={receiptForm.tender_type_cd} onChange={(value) => setReceiptForm({ ...receiptForm, tender_type_cd: value })}>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CARD">Card</option>
                <option value="MOBILE_MONEY">Mobile money</option>
              </SelectField>
              <Field label="Tender reference">
                <input value={receiptForm.tender_reference_txt} onChange={(event) => setReceiptForm({ ...receiptForm, tender_reference_txt: event.target.value })} />
              </Field>
              <Field label="Bank / provider">
                <input value={receiptForm.bank_name_txt} onChange={(event) => setReceiptForm({ ...receiptForm, bank_name_txt: event.target.value })} />
              </Field>
              <Field label="Account / merchant">
                <input value={receiptForm.bank_account_txt} onChange={(event) => setReceiptForm({ ...receiptForm, bank_account_txt: event.target.value })} />
              </Field>
              <Field label="Payment provider">
                <input value={receiptForm.payment_provider_cd} onChange={(event) => setReceiptForm({ ...receiptForm, payment_provider_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Settlement date">
                <input type="date" value={receiptForm.settlement_dt} onChange={(event) => setReceiptForm({ ...receiptForm, settlement_dt: event.target.value })} />
              </Field>
              {receiptForm.allocation_strategy_cd === "SUSPENSE" ? (
                <Field label="Suspense reason">
                  <textarea value={receiptForm.suspense_reason_txt} onChange={(event) => setReceiptForm({ ...receiptForm, suspense_reason_txt: event.target.value })} />
                </Field>
              ) : null}
              <label className="check-row full-span">
                <span>Save receipt as draft without posting</span>
                <input type="checkbox" checked={receiptForm.save_as_draft_bool} onChange={(event) => setReceiptForm({ ...receiptForm, save_as_draft_bool: event.target.checked })} />
              </label>
              <button className="primary-button full-span" type="submit">Record receipt</button>
            </form>
          </section>

          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Receipt register</span>
                <h2>Search Receipts</h2>
              </div>
              <FileSearch size={22} />
            </div>
            <form className="finance-filter-form" onSubmit={runReceiptSearch}>
              <Field label="Keyword">
                <input value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
              </Field>
              <SelectField label="State" value={filters.receipt_state_cd} onChange={(value) => setFilters({ ...filters, receipt_state_cd: value })}>
                <option value="">All states</option>
                <option value="DRAFT">Draft</option>
                <option value="PAID">Paid</option>
                <option value="ALLOCATED">Allocated</option>
                <option value="REVERSED">Reversed</option>
              </SelectField>
              <Field label="Received from">
                <input type="date" value={filters.received_from_dt} onChange={(event) => setFilters({ ...filters, received_from_dt: event.target.value })} />
              </Field>
              <Field label="Received to">
                <input type="date" value={filters.received_to_dt} onChange={(event) => setFilters({ ...filters, received_to_dt: event.target.value })} />
              </Field>
              <button className="secondary-button full-span" type="submit">Search receipts</button>
            </form>
            <DataTable columns={receiptColumns} rows={receipts} keyField="receipt_event_uid" selectedKey={selectedReceipt?.receipt?.receipt_event_uid} empty="No receipts recorded" />
            {selectedReceipt ? (
              <div className="finance-detail-panel">
                <div className="section-heading section-heading--compact">
                  <div>
                    <span>Receipt detail</span>
                    <h2>{selectedReceipt.receipt.receipt_no}</h2>
                  </div>
                  <StatusPill tone={statusTone(selectedReceipt.receipt.receipt_state_cd)}>{compactCode(selectedReceipt.receipt.receipt_state_cd)}</StatusPill>
                </div>
                <div className="finance-summary-strip">
                  <div><span>Tenders</span><strong>{formatNumber(selectedReceipt.tenders?.length)}</strong></div>
                  <div><span>Allocations</span><strong>{formatNumber(selectedReceipt.allocations?.length)}</strong></div>
                  <div><span>Journal lines</span><strong>{formatNumber(selectedReceipt.journal_lines?.length)}</strong></div>
                  <div><span>Suspense</span><strong>{formatNumber(selectedReceipt.suspense_items?.length)}</strong></div>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {activeTab === "allocation" ? (
        <div className="finance-allocation-grid">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Open liabilities</span>
                <h2>Payment Allocation</h2>
              </div>
              <BadgeDollarSign size={22} />
            </div>
            <DataTable columns={liabilityColumns} rows={liabilityBalances} keyField="liability_notice_uid" empty="No posted liabilities are awaiting payment" />
          </section>
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Unmatched receipts</span>
                <h2>Suspense Resolution</h2>
              </div>
              <WalletCards size={22} />
            </div>
            <form className="action-form" onSubmit={allocateSuspense}>
              <SelectField label="Suspense item" value={suspenseForm.suspense_item_uid} onChange={syncSuspenseItem}>
                <option value="">Select suspense item</option>
                {openSuspense.map((item) => (
                  <option key={item.suspense_item_uid} value={item.suspense_item_uid}>
                    {item.suspense_no} - {formatMoney(Number(item.suspense_amt || 0) - Number(item.allocated_amt || 0))}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Target liability" value={suspenseForm.liability_notice_uid} onChange={(value) => {
                const liability = liabilityBalances.find((item) => item.liability_notice_uid === value);
                setSuspenseForm({ ...suspenseForm, liability_notice_uid: value, subject_uid: liability?.subject_uid || suspenseForm.subject_uid });
              }}>
                <option value="">Allocate to taxpayer account only</option>
                {openLiabilities.map((notice) => (
                  <option key={notice.liability_notice_uid} value={notice.liability_notice_uid}>
                    {notice.liability_notice_no} - {notice.display_name_txt}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Taxpayer" value={suspenseForm.subject_uid} onChange={(value) => setSuspenseForm({ ...suspenseForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>
                ))}
              </SelectField>
              <Field label="Allocation amount">
                <input type="number" min="0.01" step="0.01" value={suspenseForm.allocated_amt} onChange={(event) => setSuspenseForm({ ...suspenseForm, allocated_amt: event.target.value })} />
              </Field>
              <Field label="Resolution note">
                <textarea value={suspenseForm.resolution_txt} onChange={(event) => setSuspenseForm({ ...suspenseForm, resolution_txt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit" disabled={!suspenseForm.suspense_item_uid}>Allocate suspense</button>
            </form>
            <DataTable columns={suspenseColumns} rows={suspense} keyField="suspense_item_uid" empty="No suspense items recorded" />
          </section>
        </div>
      ) : null}

      {activeTab === "ledger" ? (
        <div className="finance-ledger-grid">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Taxpayer balances</span>
                <h2>Account Summaries</h2>
              </div>
              <BookOpenCheck size={22} />
            </div>
            <DataTable columns={accountColumns} rows={accounts} keyField="account_summary_uid" empty="No account balances recorded" />
          </section>
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Accounting postings</span>
                <h2>Journal Batches</h2>
              </div>
              <ClipboardList size={22} />
            </div>
            <DataTable columns={journalColumns} rows={journals} keyField="journal_batch_uid" empty="No journal batches recorded" />
          </section>
        </div>
      ) : null}

      {activeTab === "refunds" ? (
        <div className="finance-refund-grid">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Refund request</span>
                <h2>Controlled Refund</h2>
              </div>
              <RotateCcw size={22} />
            </div>
            <form className="action-form" onSubmit={submitRefund}>
              <SelectField label="Taxpayer" value={refundForm.subject_uid} onChange={(value) => setRefundForm({ ...refundForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>
                ))}
              </SelectField>
              <SelectField label="Revenue type" value={refundForm.revenue_kind_uid} onChange={(value) => setRefundForm({ ...refundForm, revenue_kind_uid: value })}>
                <option value="">Any revenue type</option>
                {(lookups.revenue_kinds || []).map((kind) => (
                  <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>{kind.revenue_kind_name}</option>
                ))}
              </SelectField>
              <Field label="Requested amount">
                <input type="number" min="0.01" step="0.01" required value={refundForm.requested_amt} onChange={(event) => setRefundForm({ ...refundForm, requested_amt: event.target.value })} />
              </Field>
              <Field label="Reason">
                <textarea value={refundForm.request_reason_txt} onChange={(event) => setRefundForm({ ...refundForm, request_reason_txt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit">Lodge refund request</button>
            </form>
          </section>
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Refund register</span>
                <h2>Approval And Posting</h2>
              </div>
              <CheckCircle2 size={22} />
            </div>
            <DataTable columns={refundColumns} rows={refunds} keyField="refund_request_uid" empty="No refund requests recorded" />
          </section>
        </div>
      ) : null}

      {activeTab === "controls" ? (
        <div className="finance-control-grid">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Daily control</span>
                <h2>Reconciliation</h2>
              </div>
              <ShieldCheck size={22} />
            </div>
            <form className="finance-control-form" onSubmit={submitReconciliation}>
              <Field label="Type">
                <input value={reconciliationForm.reconciliation_type_cd} onChange={(event) => setReconciliationForm({ ...reconciliationForm, reconciliation_type_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Counted amount">
                <input type="number" step="0.01" value={reconciliationForm.counted_receipt_amt} onChange={(event) => setReconciliationForm({ ...reconciliationForm, counted_receipt_amt: event.target.value })} />
              </Field>
              <Field label="Start">
                <input type="date" value={reconciliationForm.period_start_dt} onChange={(event) => setReconciliationForm({ ...reconciliationForm, period_start_dt: event.target.value })} />
              </Field>
              <Field label="End">
                <input type="date" value={reconciliationForm.period_end_dt} onChange={(event) => setReconciliationForm({ ...reconciliationForm, period_end_dt: event.target.value })} />
              </Field>
              <Field label="Notes">
                <textarea value={reconciliationForm.notes_txt} onChange={(event) => setReconciliationForm({ ...reconciliationForm, notes_txt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit">Open reconciliation</button>
            </form>
            <DataTable columns={reconciliationColumns} rows={reconciliations} keyField="reconciliation_session_uid" empty="No reconciliation sessions recorded" />
          </section>
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Posting lock</span>
                <h2>Period Close</h2>
              </div>
              <CalendarClock size={22} />
            </div>
            <form className="finance-control-form" onSubmit={submitPeriodClose}>
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
              <Field label="Reason">
                <textarea value={closeForm.close_reason_txt} onChange={(event) => setCloseForm({ ...closeForm, close_reason_txt: event.target.value })} />
              </Field>
              <label className="check-row">
                <span>Lock financial posting</span>
                <input type="checkbox" checked={closeForm.lock_financial_posting_bool} onChange={(event) => setCloseForm({ ...closeForm, lock_financial_posting_bool: event.target.checked })} />
              </label>
              <button className="primary-button" type="submit">Record period control</button>
            </form>
            <DataTable columns={closeColumns} rows={periodCloses} keyField="period_close_uid" empty="No period close controls recorded" />
          </section>
        </div>
      ) : null}
    </section>
  );
}
