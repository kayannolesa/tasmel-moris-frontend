import { ClipboardCheck, FilePenLine, HandCoins, ListChecks } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api.js";
import { DataTable, Field, GovernanceShell, ReasonField, SelectField, StatePill, commonColumns, compactCode, optionLabel, runMutation, today } from "./GovernanceShared.jsx";

export default function CollectionsGovernancePanel() {
  const [matters, setMatters] = useState([]);
  const [actions, setActions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [plan, setPlan] = useState({ instalment_plan_uid: "", plan_state_cd: "ACTIVE", start_dt: "", end_dt: "", frequency_cd: "MONTHLY", arrangement_terms_txt: "", approval_state_cd: "PENDING", reason_txt: "" });
  const [line, setLine] = useState({ instalment_plan_uid: "", instalment_line_uid: "", sequence_no: "", due_dt: today(), expected_amt: "", paid_amt: "", line_state_cd: "PENDING", line_notes_txt: "", reason_txt: "" });
  const [retireLine, setRetireLine] = useState({ instalment_line_uid: "", reason_txt: "" });
  const [review, setReview] = useState({ collectability_review_uid: "", review_dt: today(), collectability_cd: "MEDIUM", provision_percent: "", likelihood_score_no: "", recommended_action_cd: "CONTINUE_RECOVERY", recommendation_txt: "", review_notes_txt: "", approval_state_cd: "PENDING", reason_txt: "" });
  const [retireAction, setRetireAction] = useState({ recovery_action_uid: "", reason_txt: "" });

  async function load() {
    setLoading(true);
    const [matterPayload, actionPayload, planPayload, reviewPayload] = await Promise.all([
      apiRequest("/api/collections/recovery-matters?pageSize=140"),
      apiRequest("/api/collections/actions?pageSize=140"),
      apiRequest("/api/collections/instalment-plans?pageSize=140"),
      apiRequest("/api/collections/collectability-reviews?pageSize=140"),
    ]);
    setMatters(matterPayload.rows || []); setActions(actionPayload.rows || []); setPlans(planPayload.rows || []); setReviews(reviewPayload.rows || []); setLoading(false);
  }

  async function loadMatter(uid) {
    if (!uid) return setDetail(null);
    const payload = await apiRequest(`/api/collections/recovery-matters/${uid}`);
    setDetail(payload || null);
  }

  useEffect(() => { void load().catch((loadError) => { setError(loadError.message); setLoading(false); }); }, []);
  async function mutate(endpoint, method, body, message) { await runMutation({ endpoint, method, body, setError, setSuccess, setSaving, successMessage: message, reload: async () => { await load(); if (detail?.matter?.recovery_matter_uid) await loadMatter(detail.matter.recovery_matter_uid); } }); }

  function syncPlan(uid) {
    const row = plans.find((entry) => entry.instalment_plan_uid === uid);
    setPlan({ instalment_plan_uid: uid, plan_state_cd: row?.plan_state_cd || "ACTIVE", start_dt: row?.start_dt?.slice(0, 10) || "", end_dt: row?.end_dt?.slice(0, 10) || "", frequency_cd: row?.frequency_cd || "MONTHLY", arrangement_terms_txt: row?.arrangement_terms_txt || "", approval_state_cd: row?.approval_state_cd || "PENDING", reason_txt: "" });
    setLine({ instalment_plan_uid: uid, instalment_line_uid: "", sequence_no: "", due_dt: today(), expected_amt: "", paid_amt: "", line_state_cd: "PENDING", line_notes_txt: "", reason_txt: "" });
  }
  function syncLine(uid) {
    const row = detail?.instalment_lines?.find((entry) => entry.instalment_line_uid === uid);
    setLine({ instalment_plan_uid: row?.instalment_plan_uid || line.instalment_plan_uid, instalment_line_uid: uid, sequence_no: row?.sequence_no || "", due_dt: row?.due_dt?.slice(0, 10) || today(), expected_amt: row?.expected_amt ?? "", paid_amt: row?.paid_amt ?? "", line_state_cd: row?.line_state_cd || "PENDING", line_notes_txt: row?.line_notes_txt || "", reason_txt: "" });
    setRetireLine({ instalment_line_uid: uid, reason_txt: "" });
  }
  function syncReview(uid) {
    const row = reviews.find((entry) => entry.collectability_review_uid === uid);
    setReview({ collectability_review_uid: uid, review_dt: row?.review_dt?.slice(0, 10) || today(), collectability_cd: row?.collectability_cd || "MEDIUM", provision_percent: row?.provision_percent ?? "", likelihood_score_no: row?.likelihood_score_no ?? "", recommended_action_cd: row?.recommended_action_cd || "CONTINUE_RECOVERY", recommendation_txt: row?.recommendation_txt || "", review_notes_txt: row?.review_notes_txt || "", approval_state_cd: row?.approval_state_cd || "PENDING", reason_txt: "" });
  }

  const matterColumns = [{ key: "matter_no", label: "Matter" }, { key: "taxpayer", label: "Taxpayer", render: (row) => row.display_name_txt || "-" }, commonColumns.money("balance_amt", "Balance"), commonColumns.state("matter_state_cd", "State")];
  const planColumns = [{ key: "plan_no", label: "Plan" }, { key: "taxpayer", label: "Taxpayer", render: (row) => row.display_name_txt || "-" }, commonColumns.money("total_plan_amt", "Total"), commonColumns.state("plan_state_cd", "State")];
  const lineColumns = [{ key: "sequence_no", label: "No." }, commonColumns.date("due_dt", "Due"), commonColumns.money("expected_amt", "Expected"), commonColumns.money("paid_amt", "Paid"), commonColumns.state("line_state_cd", "State")];
  const actionColumns = [{ key: "action_type_cd", label: "Action", render: (row) => compactCode(row.action_type_cd) }, commonColumns.date("scheduled_dt", "Scheduled"), commonColumns.state("action_state_cd", "State")];
  const reviewColumns = [{ key: "collectability_cd", label: "Collectability", render: (row) => <StatePill value={row.collectability_cd} /> }, { key: "recommended_action_cd", label: "Recommendation", render: (row) => compactCode(row.recommended_action_cd) }, commonColumns.state("approval_state_cd", "Approval")];

  return (
    <GovernanceShell error={error} success={success}>
      <section className="content-band">
        <div className="section-heading"><div><span>Matter context</span><h2>Recovery Record Selection</h2></div><ClipboardCheck size={22} /></div>
        <DataTable columns={matterColumns} rows={matters} keyField="recovery_matter_uid" onRowClick={(row) => void loadMatter(row.recovery_matter_uid)} selectedKey={detail?.matter?.recovery_matter_uid} empty={loading ? "Loading matters" : "No recovery matters"} />
      </section>

      <section className="content-band">
        <div className="section-heading"><div><span>Instalment plans</span><h2>Edit Plans And Lines</h2></div><HandCoins size={22} /></div>
        <DataTable columns={planColumns} rows={plans} keyField="instalment_plan_uid" onRowClick={(row) => syncPlan(row.instalment_plan_uid)} selectedKey={plan.instalment_plan_uid} empty="No instalment plans" />
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/collections/instalment-plans/${plan.instalment_plan_uid}`, "PATCH", plan, "Instalment plan updated."); }}>
          <div className="compact-form"><SelectField label="Plan state" value={plan.plan_state_cd} onChange={(value) => setPlan({ ...plan, plan_state_cd: value })}><option value="PROPOSED">Proposed</option><option value="ACTIVE">Active</option><option value="DEFAULTED">Defaulted</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></SelectField><Field label="Start"><input type="date" value={plan.start_dt} onChange={(event) => setPlan({ ...plan, start_dt: event.target.value })} /></Field><Field label="End"><input type="date" value={plan.end_dt} onChange={(event) => setPlan({ ...plan, end_dt: event.target.value })} /></Field></div>
          <Field label="Terms"><textarea value={plan.arrangement_terms_txt} onChange={(event) => setPlan({ ...plan, arrangement_terms_txt: event.target.value })} /></Field>
          <ReasonField value={plan.reason_txt} onChange={(value) => setPlan({ ...plan, reason_txt: value })} />
          <button className="secondary-button" type="submit" disabled={saving || !plan.instalment_plan_uid}>Update plan</button>
        </form>
        <DataTable columns={lineColumns} rows={detail?.instalment_lines || []} keyField="instalment_line_uid" onRowClick={(row) => syncLine(row.instalment_line_uid)} selectedKey={line.instalment_line_uid} empty="Select a matter to view instalment lines" />
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); if (line.instalment_line_uid) void mutate(`/api/collections/instalment-lines/${line.instalment_line_uid}`, "PATCH", line, "Instalment line corrected."); else void mutate(`/api/collections/instalment-plans/${line.instalment_plan_uid}/lines`, "POST", line, "Instalment line added."); }}>
          <div className="compact-form"><Field label="Sequence"><input type="number" min="1" value={line.sequence_no} onChange={(event) => setLine({ ...line, sequence_no: event.target.value })} /></Field><Field label="Due"><input type="date" value={line.due_dt} onChange={(event) => setLine({ ...line, due_dt: event.target.value })} /></Field><Field label="Expected"><input type="number" step="0.01" value={line.expected_amt} onChange={(event) => setLine({ ...line, expected_amt: event.target.value })} /></Field><Field label="Paid"><input type="number" step="0.01" value={line.paid_amt} onChange={(event) => setLine({ ...line, paid_amt: event.target.value })} /></Field></div>
          <SelectField label="Line state" value={line.line_state_cd} onChange={(value) => setLine({ ...line, line_state_cd: value })}><option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="MISSED">Missed</option><option value="CANCELLED">Cancelled</option><option value="RETIRED">Retired</option></SelectField>
          <Field label="Notes"><textarea value={line.line_notes_txt} onChange={(event) => setLine({ ...line, line_notes_txt: event.target.value })} /></Field>
          <ReasonField value={line.reason_txt} onChange={(value) => setLine({ ...line, reason_txt: value })} />
          <button className="secondary-button" type="submit" disabled={saving || !line.instalment_plan_uid}>Save instalment line</button>
        </form>
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/collections/instalment-lines/${retireLine.instalment_line_uid}/retire`, "PATCH", retireLine, "Instalment line retired."); }}>
          <ReasonField label="Retirement reason" value={retireLine.reason_txt} onChange={(value) => setRetireLine({ ...retireLine, reason_txt: value })} />
          <button className="danger-button" type="submit" disabled={saving || !retireLine.instalment_line_uid}>Retire line</button>
        </form>
      </section>

      <section className="content-band">
        <div className="section-heading"><div><span>Collectability</span><h2>Review Updates And Approval State</h2></div><ListChecks size={22} /></div>
        <DataTable columns={reviewColumns} rows={reviews} keyField="collectability_review_uid" onRowClick={(row) => syncReview(row.collectability_review_uid)} selectedKey={review.collectability_review_uid} empty="No collectability reviews" />
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/collections/collectability-reviews/${review.collectability_review_uid}`, "PATCH", review, "Collectability review updated."); }}>
          <div className="compact-form"><SelectField label="Collectability" value={review.collectability_cd} onChange={(value) => setReview({ ...review, collectability_cd: value })}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="UNRECOVERABLE">Unrecoverable</option></SelectField><Field label="Likelihood score"><input type="number" value={review.likelihood_score_no} onChange={(event) => setReview({ ...review, likelihood_score_no: event.target.value })} /></Field><Field label="Provision percent"><input type="number" step="0.01" value={review.provision_percent} onChange={(event) => setReview({ ...review, provision_percent: event.target.value })} /></Field></div>
          <div className="compact-form"><Field label="Recommendation"><input value={review.recommended_action_cd} onChange={(event) => setReview({ ...review, recommended_action_cd: event.target.value.toUpperCase() })} /></Field><SelectField label="Approval" value={review.approval_state_cd} onChange={(value) => setReview({ ...review, approval_state_cd: value })}><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="RETURNED">Returned</option></SelectField></div>
          <Field label="Recommendation text"><textarea value={review.recommendation_txt} onChange={(event) => setReview({ ...review, recommendation_txt: event.target.value })} /></Field>
          <Field label="Review notes"><textarea value={review.review_notes_txt} onChange={(event) => setReview({ ...review, review_notes_txt: event.target.value })} /></Field>
          <ReasonField value={review.reason_txt} onChange={(value) => setReview({ ...review, reason_txt: value })} />
          <button className="secondary-button" type="submit" disabled={saving || !review.collectability_review_uid}>Update review</button>
        </form>
      </section>

      <section className="content-band">
        <div className="section-heading"><div><span>Recovery actions</span><h2>Retire Incorrect Records</h2></div><FilePenLine size={22} /></div>
        <DataTable columns={actionColumns} rows={actions} keyField="recovery_action_uid" onRowClick={(row) => setRetireAction({ recovery_action_uid: row.recovery_action_uid, reason_txt: "" })} selectedKey={retireAction.recovery_action_uid} empty="No recovery actions" />
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/collections/actions/${retireAction.recovery_action_uid}/retire`, "PATCH", retireAction, "Recovery action retired."); }}>
          <ReasonField label="Retirement reason" value={retireAction.reason_txt} onChange={(value) => setRetireAction({ ...retireAction, reason_txt: value })} />
          <button className="danger-button" type="submit" disabled={saving || !retireAction.recovery_action_uid}>Retire action</button>
        </form>
      </section>
    </GovernanceShell>
  );
}
