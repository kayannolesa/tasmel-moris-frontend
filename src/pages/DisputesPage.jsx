import {
  AlertTriangle,
  BookOpenCheck,
  Clock3,
  FileText,
  Gavel,
  History,
  Link2,
  Scale,
  Search,
  Send,
  ShieldCheck,
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
import AdvancedLifecycleGovernancePanel from "../components/governance/AdvancedLifecycleGovernancePanel.jsx";
import StatusPill from "../components/common/StatusPill.jsx";
import { apiRequest } from "../services/api.js";
import { compactCode, formatDate, formatDateTime, formatMoney, formatNumber } from "../utils/format.js";

const tabs = [
  { id: "workbench", label: "Review Workbench" },
  { id: "intake", label: "Create Review" },
  { id: "issues", label: "Issues" },
  { id: "decisions", label: "Decisions" },
  { id: "appeals", label: "External Appeals" },
  { id: "governance", label: "Lifecycle Governance" },
  { id: "links", label: "Evidence And Audit" },
];

const targetConfig = {
  DOCUMENT: { label: "Document", schema: "DOC", table: "doc_content_record" },
  LIABILITY_NOTICE: { label: "Liability notice", schema: "ASM", table: "asm_liability_notice" },
  DECLARATION: { label: "Declaration", schema: "FIL", table: "fil_declaration_record" },
  RECEIPT: { label: "Receipt", schema: "FIN", table: "fin_receipt_event" },
  APPROVAL: { label: "Approval request", schema: "OPS", table: "ops_approval_request" },
  LEGAL_REFERRAL: { label: "Legal referral", schema: "COL", table: "col_legal_referral" },
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function futureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function stripEmpty(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== "" && value !== null && value !== undefined));
}

function statusTone(value) {
  const status = String(value || "");
  if (["DECIDED", "ALLOWED", "RESOLVED", "CLOSED", "NOTICE_ISSUED", "UPHELD", "VARIED", "WITHDRAWN"].includes(status)) return "success";
  if (["LODGED", "UNDER_REVIEW", "IN_REVIEW", "OPEN", "FILED", "AWAITING_INFORMATION", "PENDING", "APPROVAL_REQUIRED"].includes(status)) return "warning";
  if (["REJECTED", "DISMISSED", "APPEALED", "ESCALATED", "DECISION_DUE", "CANCELLED", "OVERDUE"].includes(status)) return "danger";
  return "neutral";
}

async function safeRequest(path, fallback) {
  try {
    return await apiRequest(path);
  } catch {
    return fallback;
  }
}

const initialFilters = {
  q: "",
  queue_state_cd: "",
  review_state_cd: "",
  owner_actor_uid: "",
  revenue_kind_uid: "",
  decision_due_to_dt: "",
};

const initialReview = {
  subject_uid: "",
  revenue_kind_uid: "",
  liability_notice_uid: "",
  declaration_uid: "",
  receipt_event_uid: "",
  content_record_uid: "",
  approval_request_uid: "",
  review_type_cd: "OBJECTION",
  review_state_cd: "LODGED",
  queue_state_cd: "LODGED",
  priority_cd: "NORMAL",
  lodged_dt: today(),
  decision_due_dt: futureDate(30),
  owner_actor_uid: "",
  grounds_txt: "",
  received_channel_cd: "STAFF",
};

const initialIssue = {
  review_file_uid: "",
  issue_type_cd: "LIABILITY_AMOUNT",
  disputed_amt: "",
  issue_summary_txt: "",
  issue_txt: "",
  position_txt: "",
  content_record_uid: "",
  issue_state_cd: "OPEN",
};

const initialDecision = {
  review_file_uid: "",
  decision_cd: "VARIED",
  decision_reason_cd: "MERITS_REVIEW",
  decision_dt: today(),
  amount_upheld_amt: "",
  amount_varied_amt: "",
  financial_impact_amt: "",
  implementation_state_cd: "PENDING",
  approval_request_uid: "",
  decision_summary_txt: "",
  decision_txt: "",
};

const initialAppeal = {
  review_file_uid: "",
  decision_outcome_uid: "",
  legal_referral_uid: "",
  external_reference_no: "",
  appeal_body_txt: "",
  court_or_tribunal_txt: "",
  filed_dt: today(),
  hearing_dt: "",
  next_action_dt: "",
  appeal_state_cd: "FILED",
  outcome_txt: "",
};

const initialLink = {
  review_file_uid: "",
  review_issue_uid: "",
  decision_outcome_uid: "",
  external_appeal_uid: "",
  target_type: "DOCUMENT",
  target_record_uid: "",
  target_role_cd: "RELATED_RECORD",
  link_note_txt: "",
};

export default function DisputesPage() {
  const [activeTab, setActiveTab] = useState("workbench");
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [staff, setStaff] = useState([]);
  const [lookups, setLookups] = useState({});
  const [notices, setNotices] = useState([]);
  const [declarations, setDeclarations] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [contentRecords, setContentRecords] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [legalReferrals, setLegalReferrals] = useState([]);
  const [reviewFiles, setReviewFiles] = useState([]);
  const [issues, setIssues] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [recordLinks, setRecordLinks] = useState([]);
  const [lifecycleEvents, setLifecycleEvents] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [reviewForm, setReviewForm] = useState(initialReview);
  const [issueForm, setIssueForm] = useState(initialIssue);
  const [decisionForm, setDecisionForm] = useState(initialDecision);
  const [appealForm, setAppealForm] = useState(initialAppeal);
  const [linkForm, setLinkForm] = useState(initialLink);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function filterQuery(extra = {}) {
    const params = new URLSearchParams(stripEmpty({ ...filters, ...extra }));
    params.set("pageSize", "150");
    return params.toString();
  }

  async function load() {
    setLoading(true);
    try {
      const [
        overviewPayload,
        subjectsPayload,
        staffPayload,
        lookupsPayload,
        noticesPayload,
        declarationsPayload,
        receiptsPayload,
        contentPayload,
        approvalsPayload,
        legalPayload,
        reviewsPayload,
        issuesPayload,
        decisionsPayload,
        appealsPayload,
        linksPayload,
        lifecyclePayload,
      ] = await Promise.all([
        apiRequest("/api/disputes/overview"),
        apiRequest("/api/registry/subjects?pageSize=150"),
        safeRequest("/api/admin/staff?pageSize=150", { rows: [] }),
        apiRequest("/api/configuration/lookups"),
        safeRequest("/api/assessment/liability-notices?pageSize=150", { rows: [] }),
        safeRequest("/api/filing/declarations?pageSize=150", { rows: [] }),
        safeRequest("/api/finance/receipts?pageSize=150", { rows: [] }),
        safeRequest("/api/documents/content-records?pageSize=150", { rows: [] }),
        safeRequest("/api/workflow/approvals?pageSize=150", { rows: [] }),
        safeRequest("/api/collections/legal-referrals?pageSize=150", { rows: [] }),
        apiRequest(`/api/disputes/review-files?${filterQuery()}`),
        apiRequest("/api/disputes/issues?pageSize=150"),
        apiRequest("/api/disputes/decisions?pageSize=150"),
        apiRequest("/api/disputes/appeals?pageSize=150"),
        apiRequest("/api/disputes/record-links?pageSize=150"),
        apiRequest("/api/disputes/lifecycle-events?pageSize=150"),
      ]);
      setOverview(overviewPayload.overview);
      setSubjects(subjectsPayload.rows || []);
      setStaff(staffPayload.rows || []);
      setLookups(lookupsPayload.lookups || {});
      setNotices(noticesPayload.rows || []);
      setDeclarations(declarationsPayload.rows || []);
      setReceipts(receiptsPayload.rows || []);
      setContentRecords(contentPayload.rows || []);
      setApprovals(approvalsPayload.rows || []);
      setLegalReferrals(legalPayload.rows || []);
      setReviewFiles(reviewsPayload.rows || []);
      setIssues(issuesPayload.rows || []);
      setDecisions(decisionsPayload.rows || []);
      setAppeals(appealsPayload.rows || []);
      setRecordLinks(linksPayload.rows || []);
      setLifecycleEvents(lifecyclePayload.rows || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load().catch((loadError) => setError(loadError.message));
  }, []);

  function subjectOptions() {
    return subjects.map((subject) => (
      <option key={subject.subject_uid} value={subject.subject_uid}>
        {subject.subject_no} - {subject.display_name_txt}
      </option>
    ));
  }

  function staffOptions() {
    return staff.map((user) => (
      <option key={user.actor_uid} value={user.actor_uid}>
        {user.display_name_txt || user.full_name_txt || user.email_txt}
      </option>
    ));
  }

  function revenueOptions() {
    return (lookups.revenue_kinds || []).map((kind) => (
      <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>
        {kind.revenue_kind_name}
      </option>
    ));
  }

  function reviewOptions() {
    return reviewFiles.map((review) => (
      <option key={review.review_file_uid} value={review.review_file_uid}>
        {review.review_file_no} - {review.display_name_txt}
      </option>
    ));
  }

  const filteredIssues = useMemo(
    () => issues.filter((issue) => !linkForm.review_file_uid || issue.review_file_uid === linkForm.review_file_uid),
    [issues, linkForm.review_file_uid]
  );

  const filteredDecisions = useMemo(
    () => decisions.filter((decision) => !appealForm.review_file_uid || decision.review_file_uid === appealForm.review_file_uid),
    [appealForm.review_file_uid, decisions]
  );

  const linkTargets = useMemo(() => {
    if (linkForm.target_type === "DOCUMENT") return contentRecords.map((record) => ({ value: record.content_record_uid, label: `${record.content_no} - ${record.document_title_txt || record.file_name_txt || "Document"}` }));
    if (linkForm.target_type === "LIABILITY_NOTICE") return notices.map((notice) => ({ value: notice.liability_notice_uid, label: `${notice.liability_notice_no} - ${notice.display_name_txt}` }));
    if (linkForm.target_type === "DECLARATION") return declarations.map((declaration) => ({ value: declaration.declaration_uid, label: `${declaration.declaration_no} - ${declaration.display_name_txt}` }));
    if (linkForm.target_type === "RECEIPT") return receipts.map((receipt) => ({ value: receipt.receipt_event_uid, label: `${receipt.receipt_no} - ${receipt.display_name_txt || receipt.payer_name_txt || "Receipt"}` }));
    if (linkForm.target_type === "APPROVAL") return approvals.map((approval) => ({ value: approval.approval_request_uid, label: `${approval.approval_request_no} - ${approval.request_title_txt || compactCode(approval.requested_action_cd)}` }));
    return legalReferrals.map((referral) => ({ value: referral.legal_referral_uid, label: `${referral.referral_no} - ${referral.referred_to_txt || referral.legal_case_reference_txt || "Legal referral"}` }));
  }, [approvals, contentRecords, declarations, legalReferrals, linkForm.target_type, notices, receipts]);

  function syncNotice(noticeUid) {
    const notice = notices.find((item) => item.liability_notice_uid === noticeUid);
    setReviewForm({
      ...reviewForm,
      liability_notice_uid: noticeUid,
      subject_uid: notice?.subject_uid || reviewForm.subject_uid,
      revenue_kind_uid: notice?.revenue_kind_uid || reviewForm.revenue_kind_uid,
    });
  }

  function seedFromReview(row) {
    setIssueForm({ ...initialIssue, review_file_uid: row.review_file_uid });
    setDecisionForm({ ...initialDecision, review_file_uid: row.review_file_uid });
    setAppealForm({ ...initialAppeal, review_file_uid: row.review_file_uid });
    setLinkForm({ ...initialLink, review_file_uid: row.review_file_uid });
    setActiveTab("issues");
  }

  async function submit(endpoint, body, reset, message) {
    setError("");
    setSuccess("");
    try {
      await apiRequest(endpoint, { method: "POST", body: stripEmpty(body) });
      reset();
      await load();
      setSuccess(message);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function generateDecisionNotice(decision) {
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/disputes/decisions/${decision.decision_outcome_uid}/generate-notice`, { method: "POST", body: {} });
      await load();
      setSuccess(`Decision notice generated for ${decision.review_file_no}.`);
    } catch (noticeError) {
      setError(noticeError.message);
    }
  }

  const reviewColumns = [
    { key: "review_file_no", label: "Review" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "liability_notice_no", label: "Notice", render: (row) => row.liability_notice_no || "-" },
    { key: "revenue_kind_name", label: "Revenue", render: (row) => row.revenue_kind_name || "All revenue" },
    { key: "decision_due_dt", label: "Due", render: (row) => formatDate(row.decision_due_dt) },
    { key: "disputed_amt", label: "Disputed", render: (row) => formatMoney(row.disputed_amt) },
    { key: "queue_state_cd", label: "Queue", render: (row) => <StatusPill tone={statusTone(row.queue_state_cd)}>{compactCode(row.queue_state_cd)}</StatusPill> },
    {
      key: "actions",
      label: "Action",
      render: (row) => (
        <button className="secondary-button secondary-button--compact" type="button" onClick={() => seedFromReview(row)}>
          Open
        </button>
      ),
    },
  ];

  const issueColumns = [
    { key: "review_file_no", label: "Review" },
    { key: "issue_no", label: "No.", render: (row) => formatNumber(row.issue_no) },
    { key: "issue_type_cd", label: "Issue", render: (row) => compactCode(row.issue_type_cd) },
    { key: "disputed_amt", label: "Disputed", render: (row) => formatMoney(row.disputed_amt) },
    { key: "content_no", label: "Evidence", render: (row) => row.content_no || row.file_name_txt || "-" },
    { key: "issue_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.issue_state_cd)}>{compactCode(row.issue_state_cd)}</StatusPill> },
  ];

  const decisionColumns = [
    { key: "review_file_no", label: "Review" },
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "decision_cd", label: "Decision", render: (row) => <StatusPill tone={statusTone(row.decision_cd)}>{compactCode(row.decision_cd)}</StatusPill> },
    { key: "decision_dt", label: "Date", render: (row) => formatDate(row.decision_dt) },
    { key: "financial_impact_amt", label: "Impact", render: (row) => formatMoney(row.financial_impact_amt) },
    { key: "implementation_state_cd", label: "Implementation", render: (row) => <StatusPill tone={statusTone(row.implementation_state_cd)}>{compactCode(row.implementation_state_cd)}</StatusPill> },
    { key: "decision_notice_no", label: "Notice", render: (row) => row.decision_notice_no || "-" },
    {
      key: "generate",
      label: "Generate",
      render: (row) => (
        <button className="table-action-button" type="button" disabled={Boolean(row.decision_notice_content_uid)} onClick={() => generateDecisionNotice(row)}>
          <Send size={15} /> Notice
        </button>
      ),
    },
  ];

  const appealColumns = [
    { key: "appeal_no", label: "Appeal" },
    { key: "review_file_no", label: "Review" },
    { key: "external_reference_no", label: "External ref", render: (row) => row.external_reference_no || "-" },
    { key: "court_or_tribunal_txt", label: "Body", render: (row) => row.court_or_tribunal_txt || row.appeal_body_txt || "-" },
    { key: "filed_dt", label: "Filed", render: (row) => formatDate(row.filed_dt) },
    { key: "hearing_dt", label: "Hearing", render: (row) => formatDate(row.hearing_dt) },
    { key: "appeal_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.appeal_state_cd)}>{compactCode(row.appeal_state_cd)}</StatusPill> },
  ];

  const linkColumns = [
    { key: "review_file_no", label: "Review", render: (row) => row.review_file_no || "-" },
    { key: "target_schema_cd", label: "Domain", render: (row) => compactCode(row.target_schema_cd) },
    { key: "target_table_cd", label: "Record", render: (row) => compactCode(row.target_table_cd) },
    { key: "target_role_cd", label: "Role", render: (row) => compactCode(row.target_role_cd) },
    { key: "created_ts", label: "Linked", render: (row) => formatDateTime(row.created_ts) },
  ];

  const lifecycleColumns = [
    { key: "event_ts", label: "Time", render: (row) => formatDateTime(row.event_ts) },
    { key: "review_file_no", label: "Review" },
    { key: "event_type_cd", label: "Event", render: (row) => compactCode(row.event_type_cd) },
    { key: "from_review_state_cd", label: "From", render: (row) => compactCode(row.from_review_state_cd) },
    { key: "to_review_state_cd", label: "To", render: (row) => compactCode(row.to_review_state_cd) },
    { key: "created_by_name_txt", label: "Officer", render: (row) => row.created_by_name_txt || "-" },
  ];

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Disputes, reviews and appeals" title="Review File Control" status={loading ? "Refreshing" : "Governed"} tone="success" />

      <div className="metric-grid">
        <MetricTile icon={BookOpenCheck} label="Review files" value={formatNumber(overview?.review_file_count)} sublabel={`${formatNumber(overview?.open_review_count)} open`} />
        <MetricTile icon={Clock3} label="Decision due" value={formatNumber(overview?.decision_due_count)} sublabel={`${formatNumber(overview?.escalated_count)} escalated`} />
        <MetricTile icon={Scale} label="Disputed value" value={formatMoney(overview?.disputed_total_amt)} sublabel={`${formatNumber(overview?.open_issue_count)} open issues`} />
        <MetricTile icon={Gavel} label="External appeals" value={formatNumber(overview?.external_appeal_count)} sublabel={`${formatNumber(overview?.open_external_appeal_count)} active`} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === "governance" ? <AdvancedLifecycleGovernancePanel moduleKey="disputes" /> : null}

      <FormAlert error={error} success={success} />

      {activeTab === "workbench" ? (
        <div className="module-workbench module-workbench--wide">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Review queues</span>
                <h2>Lodged, Awaiting Information, Decision Due And Escalated</h2>
              </div>
              <Search size={22} />
            </div>
            <form className="compliance-filter-bar" onSubmit={(event) => { event.preventDefault(); void load().catch((loadError) => setError(loadError.message)); }}>
              <Field label="Search">
                <input value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
              </Field>
              <SelectField label="Queue" value={filters.queue_state_cd} onChange={(value) => setFilters({ ...filters, queue_state_cd: value })}>
                <option value="">All queues</option>
                <option value="LODGED">Lodged</option>
                <option value="UNDER_REVIEW">Under review</option>
                <option value="AWAITING_INFORMATION">Awaiting information</option>
                <option value="DECISION_DUE">Decision due</option>
                <option value="ESCALATED">Escalated</option>
                <option value="APPEALED">Appealed</option>
              </SelectField>
              <SelectField label="Owner" value={filters.owner_actor_uid} onChange={(value) => setFilters({ ...filters, owner_actor_uid: value })}>
                <option value="">Any owner</option>
                {staffOptions()}
              </SelectField>
              <Field label="Due by">
                <input type="date" value={filters.decision_due_to_dt} onChange={(event) => setFilters({ ...filters, decision_due_to_dt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit">Search reviews</button>
            </form>
            <DataTable columns={reviewColumns} rows={reviewFiles} keyField="review_file_uid" empty="No review files match the current filters" />
          </section>
        </div>
      ) : null}

      {activeTab === "intake" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Intake</span>
                <h2>Create Review File</h2>
              </div>
              <FileText size={22} />
            </div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/disputes/review-files", reviewForm, () => setReviewForm(initialReview), "Review file created.");
            }}>
              <SelectField label="Liability notice" value={reviewForm.liability_notice_uid} onChange={syncNotice}>
                <option value="">No notice selected</option>
                {notices.map((notice) => <option key={notice.liability_notice_uid} value={notice.liability_notice_uid}>{notice.liability_notice_no} - {notice.display_name_txt}</option>)}
              </SelectField>
              <SelectField label="Taxpayer" required value={reviewForm.subject_uid} onChange={(value) => setReviewForm({ ...reviewForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>
                {subjectOptions()}
              </SelectField>
              <SelectField label="Revenue kind" value={reviewForm.revenue_kind_uid} onChange={(value) => setReviewForm({ ...reviewForm, revenue_kind_uid: value })}>
                <option value="">All revenue</option>
                {revenueOptions()}
              </SelectField>
              <div className="compact-form">
                <Field label="Review type"><input required value={reviewForm.review_type_cd} onChange={(event) => setReviewForm({ ...reviewForm, review_type_cd: event.target.value.toUpperCase() })} /></Field>
                <SelectField label="Priority" value={reviewForm.priority_cd} onChange={(value) => setReviewForm({ ...reviewForm, priority_cd: value })}>
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </SelectField>
              </div>
              <div className="compact-form">
                <Field label="Lodged"><input type="date" value={reviewForm.lodged_dt} onChange={(event) => setReviewForm({ ...reviewForm, lodged_dt: event.target.value })} /></Field>
                <Field label="Decision due"><input type="date" value={reviewForm.decision_due_dt} onChange={(event) => setReviewForm({ ...reviewForm, decision_due_dt: event.target.value })} /></Field>
              </div>
              <SelectField label="Owner" value={reviewForm.owner_actor_uid} onChange={(value) => setReviewForm({ ...reviewForm, owner_actor_uid: value })}>
                <option value="">Current officer</option>
                {staffOptions()}
              </SelectField>
              <Field label="Grounds"><textarea value={reviewForm.grounds_txt} onChange={(event) => setReviewForm({ ...reviewForm, grounds_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Create review</button>
            </form>
          </section>

          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Optional links</span>
                <h2>Declarations, Receipts, Documents And Approvals</h2>
              </div>
              <Link2 size={22} />
            </div>
            <form className="action-form">
              <SelectField label="Declaration" value={reviewForm.declaration_uid} onChange={(value) => setReviewForm({ ...reviewForm, declaration_uid: value })}>
                <option value="">No declaration</option>
                {declarations.map((declaration) => <option key={declaration.declaration_uid} value={declaration.declaration_uid}>{declaration.declaration_no} - {declaration.display_name_txt}</option>)}
              </SelectField>
              <SelectField label="Receipt" value={reviewForm.receipt_event_uid} onChange={(value) => setReviewForm({ ...reviewForm, receipt_event_uid: value })}>
                <option value="">No receipt</option>
                {receipts.map((receipt) => <option key={receipt.receipt_event_uid} value={receipt.receipt_event_uid}>{receipt.receipt_no} - {receipt.display_name_txt || receipt.payer_name_txt || "Receipt"}</option>)}
              </SelectField>
              <SelectField label="Document evidence" value={reviewForm.content_record_uid} onChange={(value) => setReviewForm({ ...reviewForm, content_record_uid: value })}>
                <option value="">No document</option>
                {contentRecords.map((record) => <option key={record.content_record_uid} value={record.content_record_uid}>{record.content_no} - {record.document_title_txt || record.file_name_txt}</option>)}
              </SelectField>
              <SelectField label="Approval request" value={reviewForm.approval_request_uid} onChange={(value) => setReviewForm({ ...reviewForm, approval_request_uid: value })}>
                <option value="">No approval</option>
                {approvals.map((approval) => <option key={approval.approval_request_uid} value={approval.approval_request_uid}>{approval.approval_request_no} - {approval.request_title_txt || compactCode(approval.requested_action_cd)}</option>)}
              </SelectField>
            </form>
            <DataTable columns={reviewColumns.slice(0, 7)} rows={reviewFiles.slice(0, 8)} keyField="review_file_uid" empty="No review files recorded" />
          </section>
        </div>
      ) : null}

      {activeTab === "issues" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Review issues</span>
                <h2>Disputed Amounts, Grounds And Evidence</h2>
              </div>
              <AlertTriangle size={22} />
            </div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/disputes/issues", issueForm, () => setIssueForm(initialIssue), "Review issue recorded.");
            }}>
              <SelectField label="Review file" required value={issueForm.review_file_uid} onChange={(value) => setIssueForm({ ...issueForm, review_file_uid: value })}>
                <option value="">Select review</option>
                {reviewOptions()}
              </SelectField>
              <div className="compact-form">
                <Field label="Issue type"><input required value={issueForm.issue_type_cd} onChange={(event) => setIssueForm({ ...issueForm, issue_type_cd: event.target.value.toUpperCase() })} /></Field>
                <Field label="Disputed amount"><input type="number" value={issueForm.disputed_amt} onChange={(event) => setIssueForm({ ...issueForm, disputed_amt: event.target.value })} /></Field>
              </div>
              <Field label="Summary"><input value={issueForm.issue_summary_txt} onChange={(event) => setIssueForm({ ...issueForm, issue_summary_txt: event.target.value })} /></Field>
              <Field label="Issue text"><textarea required value={issueForm.issue_txt} onChange={(event) => setIssueForm({ ...issueForm, issue_txt: event.target.value })} /></Field>
              <Field label="Officer position"><textarea value={issueForm.position_txt} onChange={(event) => setIssueForm({ ...issueForm, position_txt: event.target.value })} /></Field>
              <SelectField label="Evidence document" value={issueForm.content_record_uid} onChange={(value) => setIssueForm({ ...issueForm, content_record_uid: value })}>
                <option value="">No evidence selected</option>
                {contentRecords.map((record) => <option key={record.content_record_uid} value={record.content_record_uid}>{record.content_no} - {record.document_title_txt || record.file_name_txt}</option>)}
              </SelectField>
              <button className="primary-button" type="submit">Record issue</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={issueColumns} rows={issues} keyField="review_issue_uid" empty="No review issues recorded" />
          </section>
        </div>
      ) : null}

      {activeTab === "decisions" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Decision outcome</span>
                <h2>Outcome, Financial Impact And Notice Generation</h2>
              </div>
              <ShieldCheck size={22} />
            </div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/disputes/decisions", decisionForm, () => setDecisionForm(initialDecision), "Review decision recorded.");
            }}>
              <SelectField label="Review file" required value={decisionForm.review_file_uid} onChange={(value) => setDecisionForm({ ...decisionForm, review_file_uid: value })}>
                <option value="">Select review</option>
                {reviewOptions()}
              </SelectField>
              <div className="compact-form">
                <SelectField label="Decision" value={decisionForm.decision_cd} onChange={(value) => setDecisionForm({ ...decisionForm, decision_cd: value })}>
                  <option value="UPHOLD">Uphold</option>
                  <option value="VARY">Vary</option>
                  <option value="WITHDRAW">Withdraw</option>
                  <option value="REMIT">Remit</option>
                  <option value="CANCEL">Cancel</option>
                  <option value="REFER">Refer</option>
                </SelectField>
                <Field label="Decision date"><input type="date" value={decisionForm.decision_dt} onChange={(event) => setDecisionForm({ ...decisionForm, decision_dt: event.target.value })} /></Field>
              </div>
              <div className="compact-form">
                <Field label="Amount upheld"><input type="number" value={decisionForm.amount_upheld_amt} onChange={(event) => setDecisionForm({ ...decisionForm, amount_upheld_amt: event.target.value })} /></Field>
                <Field label="Amount varied"><input type="number" value={decisionForm.amount_varied_amt} onChange={(event) => setDecisionForm({ ...decisionForm, amount_varied_amt: event.target.value })} /></Field>
              </div>
              <div className="compact-form">
                <Field label="Financial impact"><input type="number" value={decisionForm.financial_impact_amt} onChange={(event) => setDecisionForm({ ...decisionForm, financial_impact_amt: event.target.value })} /></Field>
                <SelectField label="Approval" value={decisionForm.approval_request_uid} onChange={(value) => setDecisionForm({ ...decisionForm, approval_request_uid: value })}>
                  <option value="">No approval linked</option>
                  {approvals.map((approval) => <option key={approval.approval_request_uid} value={approval.approval_request_uid}>{approval.approval_request_no} - {approval.request_title_txt || compactCode(approval.requested_action_cd)}</option>)}
                </SelectField>
              </div>
              <Field label="Summary"><input value={decisionForm.decision_summary_txt} onChange={(event) => setDecisionForm({ ...decisionForm, decision_summary_txt: event.target.value })} /></Field>
              <Field label="Decision text"><textarea value={decisionForm.decision_txt} onChange={(event) => setDecisionForm({ ...decisionForm, decision_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Record decision</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={decisionColumns} rows={decisions} keyField="decision_outcome_uid" empty="No decisions recorded" />
          </section>
        </div>
      ) : null}

      {activeTab === "appeals" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>External appeal</span>
                <h2>Tribunal, Court Or External Body Tracking</h2>
              </div>
              <Gavel size={22} />
            </div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/disputes/appeals", appealForm, () => setAppealForm(initialAppeal), "External appeal recorded.");
            }}>
              <SelectField label="Review file" required value={appealForm.review_file_uid} onChange={(value) => setAppealForm({ ...appealForm, review_file_uid: value, decision_outcome_uid: "" })}>
                <option value="">Select review</option>
                {reviewOptions()}
              </SelectField>
              <SelectField label="Decision outcome" value={appealForm.decision_outcome_uid} onChange={(value) => setAppealForm({ ...appealForm, decision_outcome_uid: value })}>
                <option value="">No decision linked</option>
                {filteredDecisions.map((decision) => <option key={decision.decision_outcome_uid} value={decision.decision_outcome_uid}>{decision.review_file_no} - {compactCode(decision.decision_cd)}</option>)}
              </SelectField>
              <SelectField label="Legal referral" value={appealForm.legal_referral_uid} onChange={(value) => setAppealForm({ ...appealForm, legal_referral_uid: value })}>
                <option value="">No legal referral</option>
                {legalReferrals.map((referral) => <option key={referral.legal_referral_uid} value={referral.legal_referral_uid}>{referral.referral_no} - {referral.referred_to_txt || referral.legal_case_reference_txt}</option>)}
              </SelectField>
              <div className="compact-form">
                <Field label="External reference"><input value={appealForm.external_reference_no} onChange={(event) => setAppealForm({ ...appealForm, external_reference_no: event.target.value })} /></Field>
                <Field label="Body"><input value={appealForm.court_or_tribunal_txt} onChange={(event) => setAppealForm({ ...appealForm, court_or_tribunal_txt: event.target.value })} /></Field>
              </div>
              <div className="compact-form">
                <Field label="Filed"><input type="date" value={appealForm.filed_dt} onChange={(event) => setAppealForm({ ...appealForm, filed_dt: event.target.value })} /></Field>
                <Field label="Hearing"><input type="date" value={appealForm.hearing_dt} onChange={(event) => setAppealForm({ ...appealForm, hearing_dt: event.target.value })} /></Field>
              </div>
              <Field label="Appeal notes"><textarea value={appealForm.appeal_body_txt} onChange={(event) => setAppealForm({ ...appealForm, appeal_body_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Record appeal</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={appealColumns} rows={appeals} keyField="external_appeal_uid" empty="No external appeals recorded" />
          </section>
        </div>
      ) : null}

      {activeTab === "links" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Linked records</span>
                <h2>Evidence, Documents And Related Business Records</h2>
              </div>
              <Link2 size={22} />
            </div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              const target = targetConfig[linkForm.target_type];
              void submit("/api/disputes/record-links", {
                ...linkForm,
                target_schema_cd: target.schema,
                target_table_cd: target.table,
              }, () => setLinkForm(initialLink), "Record linked to review file.");
            }}>
              <SelectField label="Review file" value={linkForm.review_file_uid} onChange={(value) => setLinkForm({ ...linkForm, review_file_uid: value, review_issue_uid: "" })}>
                <option value="">Select review</option>
                {reviewOptions()}
              </SelectField>
              <SelectField label="Review issue" value={linkForm.review_issue_uid} onChange={(value) => setLinkForm({ ...linkForm, review_issue_uid: value })}>
                <option value="">Whole review file</option>
                {filteredIssues.map((issue) => <option key={issue.review_issue_uid} value={issue.review_issue_uid}>Issue {issue.issue_no} - {compactCode(issue.issue_type_cd)}</option>)}
              </SelectField>
              <div className="compact-form">
                <SelectField label="Target type" value={linkForm.target_type} onChange={(value) => setLinkForm({ ...linkForm, target_type: value, target_record_uid: "" })}>
                  {Object.entries(targetConfig).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}
                </SelectField>
                <SelectField label="Target record" required value={linkForm.target_record_uid} onChange={(value) => setLinkForm({ ...linkForm, target_record_uid: value })}>
                  <option value="">Select record</option>
                  {linkTargets.map((target) => <option key={target.value} value={target.value}>{target.label}</option>)}
                </SelectField>
              </div>
              <Field label="Link role"><input value={linkForm.target_role_cd} onChange={(event) => setLinkForm({ ...linkForm, target_role_cd: event.target.value.toUpperCase() })} /></Field>
              <Field label="Link note"><textarea value={linkForm.link_note_txt} onChange={(event) => setLinkForm({ ...linkForm, link_note_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Link record</button>
            </form>
          </section>
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Audit history</span>
                <h2>Review Lifecycle Trail</h2>
              </div>
              <History size={22} />
            </div>
            <DataTable columns={linkColumns} rows={recordLinks} keyField="review_record_link_uid" empty="No linked records" />
            <DataTable columns={lifecycleColumns} rows={lifecycleEvents} keyField="lifecycle_event_uid" empty="No lifecycle events recorded" />
          </section>
        </div>
      ) : null}
    </section>
  );
}
