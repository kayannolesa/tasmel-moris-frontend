import { Banknote, FilePenLine, ReceiptText, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api.js";
import { DataTable, Field, GovernanceShell, ReasonField, SelectField, StatePill, commonColumns, compactCode, optionLabel, runMutation, today } from "./GovernanceShared.jsx";

export default function FinanceGovernancePanel() {
  const [subjects, setSubjects] = useState([]);
  const [lookups, setLookups] = useState({});
  const [sites, setSites] = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [lodgements, setLodgements] = useState([]);
  const [statements, setStatements] = useState([]);
  const [charges, setCharges] = useState([]);
  const [credits, setCredits] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [refundDecisions, setRefundDecisions] = useState([]);
  const [writeoffs, setWriteoffs] = useState([]);
  const [periodCloses, setPeriodCloses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [draftReceipt, setDraftReceipt] = useState({ receipt_event_uid: "", payer_name_txt: "", total_received_amt: "", channel_cd: "COUNTER", replace_tenders_bool: false, tender_type_cd: "CASH", tender_amt: "", tender_reference_txt: "", replace_allocations_bool: false, liability_notice_uid: "", allocated_amt: "", reason_txt: "" });
  const [lodgement, setLodgement] = useState({ bank_lodgement_uid: "", service_site_uid: "", lodgement_dt: today(), total_lodged_amt: "", lodgement_state_cd: "DRAFT", bank_reference_txt: "", reason_txt: "" });
  const [statementImport, setStatementImport] = useState({ import_batch_txt: "", statement_reference_no: "", statement_dt: today(), credit_amt: "", debit_amt: "", narrative_txt: "", external_reference_txt: "", reason_txt: "" });
  const [charge, setCharge] = useState({ charge_item_uid: "", subject_uid: "", revenue_kind_uid: "", charge_type_cd: "MANUAL_CHARGE", charge_amt: "", charge_state_cd: "PENDING", reason_txt: "" });
  const [credit, setCredit] = useState({ credit_movement_uid: "", from_subject_uid: "", to_subject_uid: "", movement_amt: "", movement_state_cd: "PENDING", reason_txt: "" });
  const [refundDecision, setRefundDecision] = useState({ refund_request_uid: "", decision_cd: "APPROVED", decision_dt: today(), approved_amt: "", offset_amt: "", rejected_amt: "", reason_txt: "" });
  const [writeoff, setWriteoff] = useState({ writeoff_request_uid: "", subject_uid: "", revenue_kind_uid: "", liability_notice_uid: "", requested_amt: "", writeoff_state_cd: "REQUESTED", reason_txt: "" });
  const [periodClose, setPeriodClose] = useState({ period_close_uid: "", close_state_cd: "OPEN", lock_financial_posting_bool: false, reason_txt: "" });

  async function load() {
    setLoading(true);
    const [subjectPayload, lookupPayload, sitePayload, liabilityPayload, receiptPayload, lodgementPayload, statementPayload, chargePayload, creditPayload, refundPayload, decisionPayload, writeoffPayload, closePayload] = await Promise.all([
      apiRequest("/api/registry/subjects?pageSize=160"), apiRequest("/api/configuration/lookups"), apiRequest("/api/admin/service-sites"), apiRequest("/api/finance/liability-balances?pageSize=160&open_only_bool=true"), apiRequest("/api/finance/receipts?pageSize=140"), apiRequest("/api/finance/bank-lodgements?pageSize=120"), apiRequest("/api/finance/bank-statement-items?pageSize=120"), apiRequest("/api/finance/charge-items?pageSize=120"), apiRequest("/api/finance/credit-movements?pageSize=120"), apiRequest("/api/finance/refunds?pageSize=120"), apiRequest("/api/finance/refund-decisions?pageSize=120"), apiRequest("/api/finance/writeoff-requests?pageSize=120"), apiRequest("/api/finance/period-closes?pageSize=120"),
    ]);
    setSubjects(subjectPayload.rows || []); setLookups(lookupPayload.lookups || {}); setSites(sitePayload.service_sites || []); setLiabilities(liabilityPayload.rows || []); setReceipts(receiptPayload.rows || []); setLodgements(lodgementPayload.rows || []); setStatements(statementPayload.rows || []); setCharges(chargePayload.rows || []); setCredits(creditPayload.rows || []); setRefunds(refundPayload.rows || []); setRefundDecisions(decisionPayload.rows || []); setWriteoffs(writeoffPayload.rows || []); setPeriodCloses(closePayload.rows || []);
    setLoading(false);
  }

  useEffect(() => { void load().catch((loadError) => { setError(loadError.message); setLoading(false); }); }, []);
  async function mutate(endpoint, method, body, message) { await runMutation({ endpoint, method, body, setError, setSuccess, setSaving, successMessage: message, reload: load }); }

  function syncReceipt(uid) {
    const row = receipts.find((entry) => entry.receipt_event_uid === uid);
    setDraftReceipt({ receipt_event_uid: uid, payer_name_txt: row?.payer_name_txt || "", total_received_amt: row?.total_received_amt ?? "", channel_cd: row?.channel_cd || "COUNTER", replace_tenders_bool: false, tender_type_cd: "CASH", tender_amt: "", tender_reference_txt: "", replace_allocations_bool: false, liability_notice_uid: "", allocated_amt: "", reason_txt: "" });
  }
  function syncLodgement(uid) {
    const row = lodgements.find((entry) => entry.bank_lodgement_uid === uid);
    setLodgement({ bank_lodgement_uid: uid, service_site_uid: row?.service_site_uid || "", lodgement_dt: row?.lodgement_dt?.slice(0, 10) || today(), total_lodged_amt: row?.total_lodged_amt ?? "", lodgement_state_cd: row?.lodgement_state_cd || "DRAFT", bank_reference_txt: row?.bank_reference_txt || "", reason_txt: "" });
  }
  function syncCharge(uid) {
    const row = charges.find((entry) => entry.charge_item_uid === uid);
    setCharge({ charge_item_uid: uid, subject_uid: row?.subject_uid || "", revenue_kind_uid: row?.revenue_kind_uid || "", charge_type_cd: row?.charge_type_cd || "MANUAL_CHARGE", charge_amt: row?.charge_amt ?? "", charge_state_cd: row?.charge_state_cd || "PENDING", reason_txt: "" });
  }
  function syncCredit(uid) {
    const row = credits.find((entry) => entry.credit_movement_uid === uid);
    setCredit({ credit_movement_uid: uid, from_subject_uid: row?.from_subject_uid || "", to_subject_uid: row?.to_subject_uid || "", movement_amt: row?.movement_amt ?? "", movement_state_cd: row?.movement_state_cd || "PENDING", reason_txt: "" });
  }
  function syncWriteoff(uid) {
    const row = writeoffs.find((entry) => entry.writeoff_request_uid === uid);
    setWriteoff({ writeoff_request_uid: uid, subject_uid: row?.subject_uid || "", revenue_kind_uid: row?.revenue_kind_uid || "", liability_notice_uid: row?.liability_notice_uid || "", requested_amt: row?.requested_amt ?? "", writeoff_state_cd: row?.writeoff_state_cd || "REQUESTED", reason_txt: "" });
  }

  const receiptColumns = [{ key: "receipt_no", label: "Receipt" }, { key: "payer", label: "Payer", render: (row) => row.payer_name_txt || row.display_name_txt || "-" }, commonColumns.money("total_received_amt", "Total"), commonColumns.state("receipt_state_cd", "State")];
  const lodgementColumns = [{ key: "bank_lodgement_no", label: "Lodgement" }, commonColumns.date("lodgement_dt", "Date"), commonColumns.money("total_lodged_amt", "Total"), commonColumns.state("lodgement_state_cd", "State")];
  const statementColumns = [{ key: "statement_reference_no", label: "Reference" }, commonColumns.date("statement_dt", "Date"), commonColumns.money("credit_amt", "Credit"), commonColumns.state("match_state_cd", "Match")];
  const chargeColumns = [{ key: "taxpayer", label: "Taxpayer", render: (row) => row.display_name_txt || "-" }, { key: "charge_type_cd", label: "Type", render: (row) => compactCode(row.charge_type_cd) }, commonColumns.money("charge_amt", "Amount"), commonColumns.state("charge_state_cd", "State")];
  const creditColumns = [{ key: "credit_movement_no", label: "Movement" }, commonColumns.money("movement_amt", "Amount"), commonColumns.state("movement_state_cd", "State")];
  const writeoffColumns = [{ key: "writeoff_request_no", label: "Write-off" }, { key: "taxpayer", label: "Taxpayer", render: (row) => row.display_name_txt || "-" }, commonColumns.money("requested_amt", "Amount"), commonColumns.state("writeoff_state_cd", "State")];

  return (
    <GovernanceShell error={error} success={success}>
      <section className="content-band">
        <div className="section-heading"><div><span>Receipting</span><h2>Draft Receipt Correction</h2></div><ReceiptText size={22} /></div>
        <DataTable columns={receiptColumns} rows={receipts} keyField="receipt_event_uid" onRowClick={(row) => syncReceipt(row.receipt_event_uid)} selectedKey={draftReceipt.receipt_event_uid} empty={loading ? "Loading receipts" : "No receipts"} />
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); const body = { payer_name_txt: draftReceipt.payer_name_txt, total_received_amt: draftReceipt.total_received_amt, channel_cd: draftReceipt.channel_cd, replace_tenders_bool: draftReceipt.replace_tenders_bool, replace_allocations_bool: draftReceipt.replace_allocations_bool, tenders: draftReceipt.replace_tenders_bool ? [{ tender_type_cd: draftReceipt.tender_type_cd, tender_amt: draftReceipt.tender_amt || draftReceipt.total_received_amt, tender_reference_txt: draftReceipt.tender_reference_txt }] : undefined, allocations: draftReceipt.replace_allocations_bool ? [{ liability_notice_uid: draftReceipt.liability_notice_uid, allocated_amt: draftReceipt.allocated_amt || draftReceipt.total_received_amt, allocation_method_cd: "MANUAL_CORRECTION" }] : undefined, reason_txt: draftReceipt.reason_txt }; void mutate(`/api/finance/receipts/${draftReceipt.receipt_event_uid}/draft`, "PATCH", body, "Draft receipt corrected."); }}>
          <div className="compact-form"><Field label="Payer"><input value={draftReceipt.payer_name_txt} onChange={(event) => setDraftReceipt({ ...draftReceipt, payer_name_txt: event.target.value })} /></Field><Field label="Total"><input type="number" step="0.01" value={draftReceipt.total_received_amt} onChange={(event) => setDraftReceipt({ ...draftReceipt, total_received_amt: event.target.value })} /></Field><Field label="Channel"><input value={draftReceipt.channel_cd} onChange={(event) => setDraftReceipt({ ...draftReceipt, channel_cd: event.target.value.toUpperCase() })} /></Field></div>
          <Field label="Replace tenders"><input type="checkbox" checked={draftReceipt.replace_tenders_bool} onChange={(event) => setDraftReceipt({ ...draftReceipt, replace_tenders_bool: event.target.checked })} /></Field>
          <div className="compact-form"><Field label="Tender type"><input value={draftReceipt.tender_type_cd} onChange={(event) => setDraftReceipt({ ...draftReceipt, tender_type_cd: event.target.value.toUpperCase() })} /></Field><Field label="Tender reference"><input value={draftReceipt.tender_reference_txt} onChange={(event) => setDraftReceipt({ ...draftReceipt, tender_reference_txt: event.target.value })} /></Field></div>
          <Field label="Replace allocations"><input type="checkbox" checked={draftReceipt.replace_allocations_bool} onChange={(event) => setDraftReceipt({ ...draftReceipt, replace_allocations_bool: event.target.checked })} /></Field>
          <SelectField label="Liability" value={draftReceipt.liability_notice_uid} onChange={(value) => setDraftReceipt({ ...draftReceipt, liability_notice_uid: value })}><option value="">Select liability for allocation</option>{liabilities.map((row) => <option key={row.liability_notice_uid} value={row.liability_notice_uid}>{optionLabel(row.liability_notice_no, row.display_name_txt, row.outstanding_amt)}</option>)}</SelectField>
          <ReasonField value={draftReceipt.reason_txt} onChange={(value) => setDraftReceipt({ ...draftReceipt, reason_txt: value })} />
          <button className="secondary-button" type="submit" disabled={saving || !draftReceipt.receipt_event_uid}>Save draft receipt</button>
        </form>
      </section>

      <section className="content-band">
        <div className="section-heading"><div><span>Banking</span><h2>Lodgements And Statement Import</h2></div><Banknote size={22} /></div>
        <DataTable columns={lodgementColumns} rows={lodgements} keyField="bank_lodgement_uid" onRowClick={(row) => syncLodgement(row.bank_lodgement_uid)} selectedKey={lodgement.bank_lodgement_uid} empty="No bank lodgements" />
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); const endpoint = lodgement.bank_lodgement_uid ? `/api/finance/bank-lodgements/${lodgement.bank_lodgement_uid}` : "/api/finance/bank-lodgements"; void mutate(endpoint, lodgement.bank_lodgement_uid ? "PATCH" : "POST", lodgement, lodgement.bank_lodgement_uid ? "Bank lodgement updated." : "Bank lodgement created."); }}>
          <SelectField label="Service site" value={lodgement.service_site_uid} onChange={(value) => setLodgement({ ...lodgement, service_site_uid: value })}><option value="">No service site</option>{sites.map((site) => <option key={site.service_site_uid} value={site.service_site_uid}>{site.site_name_txt || site.service_site_name || site.site_code}</option>)}</SelectField>
          <div className="compact-form"><Field label="Date"><input type="date" value={lodgement.lodgement_dt} onChange={(event) => setLodgement({ ...lodgement, lodgement_dt: event.target.value })} /></Field><Field label="Total"><input type="number" step="0.01" value={lodgement.total_lodged_amt} onChange={(event) => setLodgement({ ...lodgement, total_lodged_amt: event.target.value })} /></Field><SelectField label="State" value={lodgement.lodgement_state_cd} onChange={(value) => setLodgement({ ...lodgement, lodgement_state_cd: value })}><option value="DRAFT">Draft</option><option value="LODGED">Lodged</option><option value="RECONCILED">Reconciled</option><option value="CANCELLED">Cancelled</option></SelectField></div>
          <Field label="Bank reference"><input value={lodgement.bank_reference_txt} onChange={(event) => setLodgement({ ...lodgement, bank_reference_txt: event.target.value })} /></Field>
          <ReasonField value={lodgement.reason_txt} onChange={(value) => setLodgement({ ...lodgement, reason_txt: value })} />
          <button className="secondary-button" type="submit" disabled={saving}>Save lodgement</button>
        </form>
        <DataTable columns={statementColumns} rows={statements} keyField="bank_statement_item_uid" empty="No bank statement imports" />
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); const body = { import_batch_txt: statementImport.import_batch_txt, reason_txt: statementImport.reason_txt, items: [{ statement_reference_no: statementImport.statement_reference_no, statement_dt: statementImport.statement_dt, credit_amt: statementImport.credit_amt, debit_amt: statementImport.debit_amt, narrative_txt: statementImport.narrative_txt, external_reference_txt: statementImport.external_reference_txt }] }; void mutate("/api/finance/bank-statement-items/import", "POST", body, "Bank statement item imported."); }}>
          <div className="compact-form"><Field label="Reference"><input required value={statementImport.statement_reference_no} onChange={(event) => setStatementImport({ ...statementImport, statement_reference_no: event.target.value })} /></Field><Field label="Date"><input type="date" value={statementImport.statement_dt} onChange={(event) => setStatementImport({ ...statementImport, statement_dt: event.target.value })} /></Field><Field label="Credit"><input type="number" step="0.01" value={statementImport.credit_amt} onChange={(event) => setStatementImport({ ...statementImport, credit_amt: event.target.value })} /></Field><Field label="Debit"><input type="number" step="0.01" value={statementImport.debit_amt} onChange={(event) => setStatementImport({ ...statementImport, debit_amt: event.target.value })} /></Field></div>
          <Field label="Narrative"><textarea value={statementImport.narrative_txt} onChange={(event) => setStatementImport({ ...statementImport, narrative_txt: event.target.value })} /></Field>
          <Field label="Import batch"><input value={statementImport.import_batch_txt} onChange={(event) => setStatementImport({ ...statementImport, import_batch_txt: event.target.value })} /></Field>
          <Field label="Reason"><textarea value={statementImport.reason_txt} onChange={(event) => setStatementImport({ ...statementImport, reason_txt: event.target.value })} /></Field>
          <button className="secondary-button" type="submit" disabled={saving}>Import statement item</button>
        </form>
      </section>

      <section className="content-band">
        <div className="section-heading"><div><span>Charges and credits</span><h2>Controlled Account Movements</h2></div><WalletCards size={22} /></div>
        <DataTable columns={chargeColumns} rows={charges} keyField="charge_item_uid" onRowClick={(row) => syncCharge(row.charge_item_uid)} selectedKey={charge.charge_item_uid} empty="No charge items" />
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); if (charge.charge_item_uid) void mutate(`/api/finance/charge-items/${charge.charge_item_uid}/state`, "PATCH", { charge_state_cd: charge.charge_state_cd, charge_amt: charge.charge_amt, reason_txt: charge.reason_txt }, "Charge item state updated."); else void mutate("/api/finance/charge-items", "POST", charge, "Charge item created."); }}>
          <SelectField label="Taxpayer" required value={charge.subject_uid} onChange={(value) => setCharge({ ...charge, subject_uid: value })}><option value="">Select taxpayer</option>{subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>)}</SelectField>
          <SelectField label="Revenue" value={charge.revenue_kind_uid} onChange={(value) => setCharge({ ...charge, revenue_kind_uid: value })}><option value="">No revenue type</option>{(lookups.revenue_kinds || []).map((kind) => <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>{kind.revenue_kind_name}</option>)}</SelectField>
          <div className="compact-form"><Field label="Type"><input value={charge.charge_type_cd} onChange={(event) => setCharge({ ...charge, charge_type_cd: event.target.value.toUpperCase() })} /></Field><Field label="Amount"><input type="number" step="0.01" required value={charge.charge_amt} onChange={(event) => setCharge({ ...charge, charge_amt: event.target.value })} /></Field><SelectField label="State" value={charge.charge_state_cd} onChange={(value) => setCharge({ ...charge, charge_state_cd: value })}><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="POSTED">Posted</option><option value="CANCELLED">Cancelled</option></SelectField></div>
          <ReasonField value={charge.reason_txt} onChange={(value) => setCharge({ ...charge, reason_txt: value })} />
          <button className="secondary-button" type="submit" disabled={saving}>Save charge</button>
        </form>
        <DataTable columns={creditColumns} rows={credits} keyField="credit_movement_uid" onRowClick={(row) => syncCredit(row.credit_movement_uid)} selectedKey={credit.credit_movement_uid} empty="No credit movements" />
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); if (credit.credit_movement_uid) void mutate(`/api/finance/credit-movements/${credit.credit_movement_uid}/state`, "PATCH", { movement_state_cd: credit.movement_state_cd, reason_txt: credit.reason_txt }, "Credit movement state updated."); else void mutate("/api/finance/credit-movements", "POST", credit, "Credit movement created."); }}>
          <div className="compact-form"><SelectField label="From taxpayer" value={credit.from_subject_uid} onChange={(value) => setCredit({ ...credit, from_subject_uid: value })}><option value="">Suspense or system source</option>{subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>)}</SelectField><SelectField label="To taxpayer" value={credit.to_subject_uid} onChange={(value) => setCredit({ ...credit, to_subject_uid: value })}><option value="">Select receiving taxpayer</option>{subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>)}</SelectField></div>
          <div className="compact-form"><Field label="Amount"><input type="number" step="0.01" required value={credit.movement_amt} onChange={(event) => setCredit({ ...credit, movement_amt: event.target.value })} /></Field><SelectField label="State" value={credit.movement_state_cd} onChange={(value) => setCredit({ ...credit, movement_state_cd: value })}><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="POSTED">Posted</option><option value="REJECTED">Rejected</option><option value="CANCELLED">Cancelled</option></SelectField></div>
          <ReasonField value={credit.reason_txt} onChange={(value) => setCredit({ ...credit, reason_txt: value })} />
          <button className="secondary-button" type="submit" disabled={saving}>Save credit movement</button>
        </form>
      </section>

      <section className="content-band">
        <div className="section-heading"><div><span>Refunds and write-offs</span><h2>Decision Records</h2></div><FilePenLine size={22} /></div>
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/finance/refunds/${refundDecision.refund_request_uid}/decisions`, "POST", refundDecision, "Refund decision recorded."); }}>
          <SelectField label="Refund request" required value={refundDecision.refund_request_uid} onChange={(value) => setRefundDecision({ ...refundDecision, refund_request_uid: value })}><option value="">Select refund</option>{refunds.map((row) => <option key={row.refund_request_uid} value={row.refund_request_uid}>{optionLabel(row.refund_request_no, row.display_name_txt, row.requested_amt)}</option>)}</SelectField>
          <div className="compact-form"><SelectField label="Decision" value={refundDecision.decision_cd} onChange={(value) => setRefundDecision({ ...refundDecision, decision_cd: value })}><option value="APPROVED">Approved</option><option value="PARTIAL">Partial</option><option value="OFFSET">Offset</option><option value="REJECTED">Rejected</option></SelectField><Field label="Decision date"><input type="date" value={refundDecision.decision_dt} onChange={(event) => setRefundDecision({ ...refundDecision, decision_dt: event.target.value })} /></Field><Field label="Approved"><input type="number" step="0.01" value={refundDecision.approved_amt} onChange={(event) => setRefundDecision({ ...refundDecision, approved_amt: event.target.value })} /></Field><Field label="Rejected"><input type="number" step="0.01" value={refundDecision.rejected_amt} onChange={(event) => setRefundDecision({ ...refundDecision, rejected_amt: event.target.value })} /></Field></div>
          <Field label="Reason"><textarea value={refundDecision.reason_txt} onChange={(event) => setRefundDecision({ ...refundDecision, reason_txt: event.target.value })} /></Field>
          <button className="secondary-button" type="submit" disabled={saving || !refundDecision.refund_request_uid}>Record refund decision</button>
        </form>
        <DataTable columns={[{ key: "decision_cd", label: "Decision", render: (row) => compactCode(row.decision_cd) }, commonColumns.money("approved_amt", "Approved"), commonColumns.date("decision_dt", "Date")]} rows={refundDecisions} keyField="refund_decision_uid" empty="No refund decisions" />
        <DataTable columns={writeoffColumns} rows={writeoffs} keyField="writeoff_request_uid" onRowClick={(row) => syncWriteoff(row.writeoff_request_uid)} selectedKey={writeoff.writeoff_request_uid} empty="No write-off requests" />
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); if (writeoff.writeoff_request_uid) void mutate(`/api/finance/writeoff-requests/${writeoff.writeoff_request_uid}/state`, "PATCH", { writeoff_state_cd: writeoff.writeoff_state_cd, requested_amt: writeoff.requested_amt, reason_txt: writeoff.reason_txt }, "Write-off state updated."); else void mutate("/api/finance/writeoff-requests", "POST", writeoff, "Write-off request created."); }}>
          <SelectField label="Taxpayer" required value={writeoff.subject_uid} onChange={(value) => setWriteoff({ ...writeoff, subject_uid: value })}><option value="">Select taxpayer</option>{subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>)}</SelectField>
          <SelectField label="Liability" value={writeoff.liability_notice_uid} onChange={(value) => setWriteoff({ ...writeoff, liability_notice_uid: value })}><option value="">No linked liability</option>{liabilities.map((row) => <option key={row.liability_notice_uid} value={row.liability_notice_uid}>{optionLabel(row.liability_notice_no, row.display_name_txt, row.outstanding_amt)}</option>)}</SelectField>
          <div className="compact-form"><Field label="Amount"><input type="number" step="0.01" required value={writeoff.requested_amt} onChange={(event) => setWriteoff({ ...writeoff, requested_amt: event.target.value })} /></Field><SelectField label="State" value={writeoff.writeoff_state_cd} onChange={(value) => setWriteoff({ ...writeoff, writeoff_state_cd: value })}><option value="REQUESTED">Requested</option><option value="UNDER_REVIEW">Under review</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="POSTED">Posted</option><option value="CANCELLED">Cancelled</option></SelectField></div>
          <ReasonField value={writeoff.reason_txt} onChange={(value) => setWriteoff({ ...writeoff, reason_txt: value })} />
          <button className="secondary-button" type="submit" disabled={saving}>Save write-off</button>
        </form>
      </section>

      <section className="content-band">
        <div className="section-heading"><div><span>Accounting periods</span><h2>Reopen Or Unlock</h2></div><WalletCards size={22} /></div>
        <DataTable columns={[{ key: "close_period_cd", label: "Period" }, commonColumns.date("period_start_dt", "Start"), commonColumns.date("period_end_dt", "End"), commonColumns.state("close_state_cd", "State")]} rows={periodCloses} keyField="period_close_uid" onRowClick={(row) => setPeriodClose({ period_close_uid: row.period_close_uid, close_state_cd: row.close_state_cd === "CLOSED" ? "OPEN" : row.close_state_cd || "OPEN", lock_financial_posting_bool: Boolean(row.lock_financial_posting_bool), reason_txt: "" })} selectedKey={periodClose.period_close_uid} empty="No period close records" />
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/finance/period-closes/${periodClose.period_close_uid}/state`, "PATCH", periodClose, "Accounting period state updated."); }}>
          <div className="compact-form"><SelectField label="State" value={periodClose.close_state_cd} onChange={(value) => setPeriodClose({ ...periodClose, close_state_cd: value })}><option value="OPEN">Open</option><option value="CLOSED">Closed</option><option value="REOPENED">Reopened</option></SelectField><Field label="Lock posting"><input type="checkbox" checked={periodClose.lock_financial_posting_bool} onChange={(event) => setPeriodClose({ ...periodClose, lock_financial_posting_bool: event.target.checked })} /></Field></div>
          <ReasonField value={periodClose.reason_txt} onChange={(value) => setPeriodClose({ ...periodClose, reason_txt: value })} />
          <button className="danger-button" type="submit" disabled={saving || !periodClose.period_close_uid}>Update period state</button>
        </form>
      </section>
    </GovernanceShell>
  );
}
