import { FileText, Gavel, Scale, ShieldCheck } from "lucide-react";
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
import { compactCode, formatDate, formatMoney, formatNumber } from "../utils/format.js";

const tabs = [
  { id: "reviews", label: "Review Files" },
  { id: "decisions", label: "Decisions" },
  { id: "appeals", label: "Appeals" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function futureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function statusTone(value) {
  const status = String(value || "");
  if (["DECIDED", "ALLOWED", "RESOLVED", "CLOSED"].includes(status)) return "success";
  if (["LODGED", "IN_REVIEW", "OPEN", "FILED"].includes(status)) return "warning";
  if (["REJECTED", "DISMISSED", "APPEALED"].includes(status)) return "danger";
  return "neutral";
}

const initialReview = {
  subject_uid: "",
  revenue_kind_uid: "",
  liability_notice_uid: "",
  review_type_cd: "OBJECTION",
  lodged_dt: today(),
  decision_due_dt: futureDate(30),
};
const initialIssue = {
  review_file_uid: "",
  issue_type_cd: "LIABILITY_AMOUNT",
  disputed_amt: "",
  issue_txt: "",
};
const initialDecision = {
  review_file_uid: "",
  decision_cd: "VARIED",
  decision_dt: today(),
  amount_upheld_amt: "",
  amount_varied_amt: "",
  decision_txt: "",
};
const initialAppeal = {
  review_file_uid: "",
  appeal_body_txt: "",
  filed_dt: today(),
  hearing_dt: "",
  appeal_state_cd: "FILED",
  outcome_txt: "",
};

export default function DisputesPage() {
  const [activeTab, setActiveTab] = useState("reviews");
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [lookups, setLookups] = useState({});
  const [notices, setNotices] = useState([]);
  const [reviewFiles, setReviewFiles] = useState([]);
  const [issues, setIssues] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [reviewForm, setReviewForm] = useState(initialReview);
  const [issueForm, setIssueForm] = useState(initialIssue);
  const [decisionForm, setDecisionForm] = useState(initialDecision);
  const [appealForm, setAppealForm] = useState(initialAppeal);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const [overviewPayload, subjectsPayload, lookupsPayload, noticesPayload, reviewsPayload, issuesPayload, decisionsPayload, appealsPayload] =
      await Promise.all([
        apiRequest("/api/disputes/overview"),
        apiRequest("/api/registry/subjects?pageSize=100"),
        apiRequest("/api/configuration/lookups"),
        apiRequest("/api/assessment/liability-notices?pageSize=100"),
        apiRequest("/api/disputes/review-files?pageSize=80"),
        apiRequest("/api/disputes/issues?pageSize=80"),
        apiRequest("/api/disputes/decisions?pageSize=80"),
        apiRequest("/api/disputes/appeals?pageSize=80"),
      ]);
    setOverview(overviewPayload.overview);
    setSubjects(subjectsPayload.rows || []);
    setLookups(lookupsPayload.lookups || {});
    setNotices(noticesPayload.rows || []);
    setReviewFiles(reviewsPayload.rows || []);
    setIssues(issuesPayload.rows || []);
    setDecisions(decisionsPayload.rows || []);
    setAppeals(appealsPayload.rows || []);
  }

  useEffect(() => {
    void load().catch((loadError) => setError(loadError.message));
  }, []);

  function syncNotice(noticeUid) {
    const notice = notices.find((item) => item.liability_notice_uid === noticeUid);
    setReviewForm({
      ...reviewForm,
      liability_notice_uid: noticeUid,
      subject_uid: notice?.subject_uid || reviewForm.subject_uid,
      revenue_kind_uid: notice?.revenue_kind_uid || reviewForm.revenue_kind_uid,
    });
  }

  async function submit(endpoint, body, reset, message) {
    setError("");
    setSuccess("");
    try {
      await apiRequest(endpoint, { method: "POST", body });
      reset();
      await load();
      setSuccess(message);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  const reviewColumns = [
    { key: "review_file_no", label: "Review" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "liability_notice_no", label: "Notice", render: (row) => row.liability_notice_no || "-" },
    { key: "disputed_amt", label: "Disputed", render: (row) => formatMoney(row.disputed_amt) },
    { key: "issue_count", label: "Issues", render: (row) => formatNumber(row.issue_count) },
    { key: "review_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.review_state_cd)}>{compactCode(row.review_state_cd)}</StatusPill> },
  ];
  const issueColumns = [
    { key: "review_file_no", label: "Review" },
    { key: "issue_type_cd", label: "Issue", render: (row) => compactCode(row.issue_type_cd) },
    { key: "disputed_amt", label: "Disputed", render: (row) => formatMoney(row.disputed_amt) },
    { key: "issue_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.issue_state_cd)}>{compactCode(row.issue_state_cd)}</StatusPill> },
  ];
  const decisionColumns = [
    { key: "review_file_no", label: "Review" },
    { key: "decision_cd", label: "Decision", render: (row) => <StatusPill tone={statusTone(row.decision_cd)}>{compactCode(row.decision_cd)}</StatusPill> },
    { key: "decision_dt", label: "Date", render: (row) => formatDate(row.decision_dt) },
    { key: "amount_upheld_amt", label: "Upheld", render: (row) => formatMoney(row.amount_upheld_amt) },
    { key: "amount_varied_amt", label: "Varied", render: (row) => formatMoney(row.amount_varied_amt) },
  ];
  const appealColumns = [
    { key: "appeal_no", label: "Appeal" },
    { key: "review_file_no", label: "Review" },
    { key: "appeal_body_txt", label: "Body", render: (row) => row.appeal_body_txt || "-" },
    { key: "filed_dt", label: "Filed", render: (row) => formatDate(row.filed_dt) },
    { key: "appeal_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.appeal_state_cd)}>{compactCode(row.appeal_state_cd)}</StatusPill> },
  ];

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Disputes, reviews and appeals" title="Review Files, Decisions And External Appeals" status="Governed" tone="success" />

      <div className="metric-grid">
        <MetricTile icon={FileText} label="Review files" value={formatNumber(overview?.review_file_count)} />
        <MetricTile icon={Scale} label="Disputed value" value={formatMoney(overview?.disputed_total_amt)} />
        <MetricTile icon={ShieldCheck} label="Decisions" value={formatNumber(overview?.decision_count)} />
        <MetricTile icon={Gavel} label="External appeals" value={formatNumber(overview?.external_appeal_count)} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "reviews" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading"><div><span>Objection intake</span><h2>Create Review File</h2></div></div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/disputes/review-files", {
                ...reviewForm,
                revenue_kind_uid: reviewForm.revenue_kind_uid || null,
                liability_notice_uid: reviewForm.liability_notice_uid || null,
              }, () => setReviewForm(initialReview), "Review file created");
            }}>
              <SelectField label="Liability notice" value={reviewForm.liability_notice_uid} onChange={syncNotice}>
                <option value="">No notice selected</option>
                {notices.map((notice) => <option key={notice.liability_notice_uid} value={notice.liability_notice_uid}>{notice.liability_notice_no} - {notice.display_name_txt}</option>)}
              </SelectField>
              <SelectField label="Taxpayer" value={reviewForm.subject_uid} onChange={(value) => setReviewForm({ ...reviewForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>
                {subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>)}
              </SelectField>
              <SelectField label="Revenue kind" value={reviewForm.revenue_kind_uid} onChange={(value) => setReviewForm({ ...reviewForm, revenue_kind_uid: value })}>
                <option value="">All revenue</option>
                {(lookups.revenue_kinds || []).map((kind) => <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>{kind.revenue_kind_name}</option>)}
              </SelectField>
              <div className="compact-form">
                <Field label="Review type"><input value={reviewForm.review_type_cd} onChange={(event) => setReviewForm({ ...reviewForm, review_type_cd: event.target.value.toUpperCase() })} /></Field>
                <Field label="Decision due"><input type="date" value={reviewForm.decision_due_dt} onChange={(event) => setReviewForm({ ...reviewForm, decision_due_dt: event.target.value })} /></Field>
              </div>
              <button className="primary-button" type="submit">Create review</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/disputes/issues", { ...issueForm, disputed_amt: issueForm.disputed_amt || null }, () => setIssueForm(initialIssue), "Review issue recorded");
            }}>
              <SelectField label="Review file" value={issueForm.review_file_uid} onChange={(value) => setIssueForm({ ...issueForm, review_file_uid: value })}>
                <option value="">Select review</option>
                {reviewFiles.map((review) => <option key={review.review_file_uid} value={review.review_file_uid}>{review.review_file_no} - {review.display_name_txt}</option>)}
              </SelectField>
              <div className="compact-form">
                <Field label="Issue type"><input value={issueForm.issue_type_cd} onChange={(event) => setIssueForm({ ...issueForm, issue_type_cd: event.target.value.toUpperCase() })} /></Field>
                <Field label="Disputed amount"><input type="number" value={issueForm.disputed_amt} onChange={(event) => setIssueForm({ ...issueForm, disputed_amt: event.target.value })} /></Field>
              </div>
              <Field label="Issue text"><textarea value={issueForm.issue_txt} onChange={(event) => setIssueForm({ ...issueForm, issue_txt: event.target.value })} /></Field>
              <button className="secondary-button" type="submit">Record issue</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={reviewColumns} rows={reviewFiles} keyField="review_file_uid" empty="No review files" />
            <br />
            <DataTable columns={issueColumns} rows={issues} keyField="review_issue_uid" empty="No review issues" />
          </section>
        </div>
      ) : null}

      {activeTab === "decisions" ? (
        <div className="module-workbench">
          <section className="content-band">
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/disputes/decisions", {
                ...decisionForm,
                amount_upheld_amt: decisionForm.amount_upheld_amt || null,
                amount_varied_amt: decisionForm.amount_varied_amt || null,
              }, () => setDecisionForm(initialDecision), "Review decision recorded");
            }}>
              <SelectField label="Review file" value={decisionForm.review_file_uid} onChange={(value) => setDecisionForm({ ...decisionForm, review_file_uid: value })}>
                <option value="">Select review</option>
                {reviewFiles.map((review) => <option key={review.review_file_uid} value={review.review_file_uid}>{review.review_file_no} - {review.display_name_txt}</option>)}
              </SelectField>
              <div className="compact-form">
                <Field label="Decision"><input value={decisionForm.decision_cd} onChange={(event) => setDecisionForm({ ...decisionForm, decision_cd: event.target.value.toUpperCase() })} /></Field>
                <Field label="Decision date"><input type="date" value={decisionForm.decision_dt} onChange={(event) => setDecisionForm({ ...decisionForm, decision_dt: event.target.value })} /></Field>
              </div>
              <div className="compact-form">
                <Field label="Amount upheld"><input type="number" value={decisionForm.amount_upheld_amt} onChange={(event) => setDecisionForm({ ...decisionForm, amount_upheld_amt: event.target.value })} /></Field>
                <Field label="Amount varied"><input type="number" value={decisionForm.amount_varied_amt} onChange={(event) => setDecisionForm({ ...decisionForm, amount_varied_amt: event.target.value })} /></Field>
              </div>
              <Field label="Decision text"><textarea value={decisionForm.decision_txt} onChange={(event) => setDecisionForm({ ...decisionForm, decision_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Record decision</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={decisionColumns} rows={decisions} keyField="decision_outcome_uid" empty="No decisions" />
          </section>
        </div>
      ) : null}

      {activeTab === "appeals" ? (
        <div className="module-workbench">
          <section className="content-band">
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/disputes/appeals", { ...appealForm, hearing_dt: appealForm.hearing_dt || null, outcome_txt: appealForm.outcome_txt || null }, () => setAppealForm(initialAppeal), "External appeal filed");
            }}>
              <SelectField label="Review file" value={appealForm.review_file_uid} onChange={(value) => setAppealForm({ ...appealForm, review_file_uid: value })}>
                <option value="">Select review</option>
                {reviewFiles.map((review) => <option key={review.review_file_uid} value={review.review_file_uid}>{review.review_file_no} - {review.display_name_txt}</option>)}
              </SelectField>
              <Field label="Appeal body"><input value={appealForm.appeal_body_txt} onChange={(event) => setAppealForm({ ...appealForm, appeal_body_txt: event.target.value })} /></Field>
              <div className="compact-form">
                <Field label="Filed date"><input type="date" value={appealForm.filed_dt} onChange={(event) => setAppealForm({ ...appealForm, filed_dt: event.target.value })} /></Field>
                <Field label="Hearing date"><input type="date" value={appealForm.hearing_dt} onChange={(event) => setAppealForm({ ...appealForm, hearing_dt: event.target.value })} /></Field>
              </div>
              <button className="primary-button" type="submit">File appeal</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={appealColumns} rows={appeals} keyField="external_appeal_uid" empty="No external appeals" />
          </section>
        </div>
      ) : null}
    </section>
  );
}
