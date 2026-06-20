import {
  CheckCircle2,
  ClipboardCheck,
  FileClock,
  GitPullRequestArrow,
  Inbox,
  ListChecks,
  RotateCcw,
  ShieldCheck,
  UserRoundCheck,
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
import { compactCode, formatDateTime, formatMoney, formatNumber } from "../utils/format.js";

const tabs = [
  { id: "supervisor", label: "Supervisor Queue" },
  { id: "tasks", label: "My Tasks" },
  { id: "approvals", label: "Approval Engine" },
  { id: "matters", label: "Matters And Queues" },
];

const domains = ["ASSESSMENT", "FINANCE", "COLLECTIONS", "COMPLIANCE", "REGISTRY", "SYSTEM"];
const approvalStates = ["", "DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "RETURNED", "CANCELLED"];

function tomorrowLocalInput() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(16, 0, 0, 0);
  return date.toISOString().slice(0, 16);
}

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function statusTone(value) {
  const status = String(value || "");
  if (["APPROVED", "CLOSED", "COMPLETED", "DONE"].includes(status)) return "success";
  if (["REJECTED", "CANCELLED", "OVERDUE"].includes(status)) return "danger";
  if (["OPEN", "SUBMITTED", "UNDER_REVIEW", "PENDING", "RETURNED", "IN_PROGRESS"].includes(status)) return "warning";
  return "neutral";
}

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, value);
  });
  return search.toString();
}

const initialQueue = { queue_name: "", business_domain_cd: "ASSESSMENT", agency_unit_uid: "" };
const initialMatter = {
  subject_uid: "",
  business_domain_cd: "ASSESSMENT",
  work_type_cd: "OFFICER_REVIEW",
  priority_cd: "NORMAL",
  matter_title_txt: "",
  matter_summary_txt: "",
  assigned_unit_uid: "",
  assigned_queue_uid: "",
  assigned_actor_uid: "",
  due_ts: tomorrowLocalInput(),
};
const initialTask = {
  work_matter_uid: "",
  task_type_cd: "REVIEW",
  task_title_txt: "",
  task_description_txt: "",
  priority_cd: "NORMAL",
  assigned_queue_uid: "",
  assigned_actor_uid: "",
  due_ts: tomorrowLocalInput(),
};
const initialApproval = {
  work_matter_uid: "",
  business_domain_cd: "ASSESSMENT",
  source_schema_cd: "",
  source_table_cd: "",
  source_record_uid: "",
  requested_action_cd: "APPROVE_LIABILITY_NOTICE",
  request_title_txt: "",
  request_reason_txt: "",
  module_reference_txt: "",
  requested_amt: "",
  approval_state_cd: "SUBMITTED",
  threshold_cd: "STANDARD",
  approver_actor_uid: "",
  approver_role_uid: "",
  assigned_queue_uid: "",
  due_ts: tomorrowLocalInput(),
  second_step_bool: false,
  second_approver_role_uid: "",
};
const initialDecision = { approval_step_uid: "", decision_cd: "APPROVE", comments_txt: "" };
const initialTaskReassign = { work_task_uid: "", assigned_queue_uid: "", assigned_actor_uid: "", due_ts: "" };
const initialFilters = { q: "", approval_state_cd: "", business_domain_cd: "" };

async function safeRequest(path, fallback) {
  try {
    return await apiRequest(path);
  } catch {
    return fallback;
  }
}

export default function WorkflowPage() {
  const [activeTab, setActiveTab] = useState("supervisor");
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [agencyUnits, setAgencyUnits] = useState([]);
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [queues, setQueues] = useState([]);
  const [matters, setMatters] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [supervisorQueue, setSupervisorQueue] = useState([]);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [approvalFilters, setApprovalFilters] = useState(initialFilters);
  const [queueForm, setQueueForm] = useState(initialQueue);
  const [matterForm, setMatterForm] = useState(initialMatter);
  const [taskForm, setTaskForm] = useState(initialTask);
  const [approvalForm, setApprovalForm] = useState(initialApproval);
  const [decisionForm, setDecisionForm] = useState(initialDecision);
  const [taskReassignForm, setTaskReassignForm] = useState(initialTaskReassign);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const supervisorPending = supervisorQueue.filter((item) => ["SUBMITTED", "UNDER_REVIEW"].includes(item.approval_state_cd));
  const overdueTasks = myTasks.filter((task) => task.due_ts && new Date(task.due_ts).getTime() < Date.now() && ["OPEN", "IN_PROGRESS", "RETURNED"].includes(task.task_state_cd));
  const selectedApprovalRecord = selectedApproval?.approval || null;
  const pendingStep = useMemo(() => selectedApproval?.steps?.find((step) => !step.decision_cd) || null, [selectedApproval]);

  async function load(nextFilters = approvalFilters, keepApprovalUid = selectedApprovalRecord?.approval_request_uid) {
    const approvalQuery = buildQuery({ ...nextFilters, pageSize: 120 });
    const [
      overviewPayload,
      subjectsPayload,
      unitsPayload,
      staffPayload,
      rolesPayload,
      queuesPayload,
      mattersPayload,
      tasksPayload,
      myTasksPayload,
      approvalsPayload,
      supervisorPayload,
    ] = await Promise.all([
      apiRequest("/api/workflow/overview"),
      apiRequest("/api/registry/subjects?pageSize=150"),
      safeRequest("/api/admin/agency-units", { agency_units: [] }),
      safeRequest("/api/admin/staff?pageSize=150", { rows: [] }),
      safeRequest("/api/admin/roles", { roles: [] }),
      apiRequest("/api/workflow/queues"),
      apiRequest("/api/workflow/matters?pageSize=120"),
      apiRequest("/api/workflow/tasks?pageSize=120"),
      apiRequest("/api/workflow/tasks/my?pageSize=120"),
      apiRequest(`/api/workflow/approvals?${approvalQuery}`),
      apiRequest("/api/workflow/approvals/supervisor-queue?pageSize=120"),
    ]);

    setOverview(overviewPayload.overview);
    setSubjects(subjectsPayload.rows || []);
    setAgencyUnits(unitsPayload.agency_units || []);
    setStaff(staffPayload.rows || []);
    setRoles(rolesPayload.roles || []);
    setQueues(queuesPayload.queues || []);
    setMatters(mattersPayload.rows || []);
    setTasks(tasksPayload.rows || []);
    setMyTasks(myTasksPayload.rows || []);
    setApprovals(approvalsPayload.rows || []);
    setSupervisorQueue(supervisorPayload.rows || []);

    if (keepApprovalUid) {
      await loadApproval(keepApprovalUid, false);
    }
  }

  useEffect(() => {
    void load().catch((loadError) => setError(loadError.message));
  }, []);

  async function submit(endpoint, body, reset, message, options = {}) {
    setError("");
    setSuccess("");
    try {
      await apiRequest(endpoint, { method: options.method || "POST", body });
      reset?.();
      await load(approvalFilters, options.keepApprovalUid);
      setSuccess(message);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function loadApproval(approvalRequestUid, clearMessages = true) {
    if (clearMessages) {
      setError("");
      setSuccess("");
    }
    const payload = await apiRequest(`/api/workflow/approvals/${approvalRequestUid}`);
    setSelectedApproval(payload.approval);
    const nextPendingStep = payload.approval.steps?.find((step) => !step.decision_cd);
    setDecisionForm({ ...initialDecision, approval_step_uid: nextPendingStep?.approval_step_uid || "" });
  }

  function selectTask(task) {
    setSelectedTask(task);
    setTaskReassignForm({
      work_task_uid: task.work_task_uid,
      assigned_queue_uid: task.assigned_queue_uid || "",
      assigned_actor_uid: task.assigned_actor_uid || "",
      due_ts: task.due_ts ? new Date(task.due_ts).toISOString().slice(0, 16) : "",
    });
  }

  async function submitDecision(event) {
    event.preventDefault();
    if (!decisionForm.approval_step_uid) return;
    await submit(
      `/api/workflow/approval-steps/${decisionForm.approval_step_uid}/decision`,
      {
        decision_cd: decisionForm.decision_cd,
        comments_txt: decisionForm.comments_txt,
      },
      () => setDecisionForm(initialDecision),
      "Supervisor decision recorded.",
      { keepApprovalUid: selectedApprovalRecord?.approval_request_uid }
    );
  }

  function approvalPayload() {
    const steps = [
      {
        step_no: 1,
        step_name_txt: "Supervisor decision",
        approver_actor_uid: approvalForm.approver_actor_uid || null,
        approver_role_uid: approvalForm.approver_role_uid || null,
        assigned_queue_uid: approvalForm.assigned_queue_uid || null,
        due_ts: toIso(approvalForm.due_ts),
      },
    ];
    if (approvalForm.second_step_bool) {
      steps.push({
        step_no: 2,
        step_name_txt: "Executive confirmation",
        approver_role_uid: approvalForm.second_approver_role_uid || approvalForm.approver_role_uid || null,
        assigned_queue_uid: approvalForm.assigned_queue_uid || null,
      });
    }
    return {
      ...approvalForm,
      work_matter_uid: approvalForm.work_matter_uid || null,
      source_schema_cd: approvalForm.source_schema_cd || null,
      source_table_cd: approvalForm.source_table_cd || null,
      source_record_uid: approvalForm.source_record_uid || null,
      requested_amt: approvalForm.requested_amt || null,
      approver_actor_uid: approvalForm.approver_actor_uid || null,
      approver_role_uid: approvalForm.approver_role_uid || null,
      assigned_queue_uid: approvalForm.assigned_queue_uid || null,
      due_ts: toIso(approvalForm.due_ts),
      steps,
    };
  }

  async function runApprovalSearch(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    await load(approvalFilters).catch((searchError) => setError(searchError.message));
  }

  const queueColumns = [
    { key: "queue_name", label: "Queue" },
    { key: "business_domain_cd", label: "Domain", render: (row) => compactCode(row.business_domain_cd) },
    { key: "unit_name", label: "Agency unit", render: (row) => row.unit_name || "-" },
    { key: "open_task_count", label: "Open tasks", render: (row) => formatNumber(row.open_task_count) },
    { key: "pending_approval_count", label: "Approvals", render: (row) => formatNumber(row.pending_approval_count) },
    { key: "queue_state_cd", label: "State", render: (row) => <StatusPill tone="success">{compactCode(row.queue_state_cd)}</StatusPill> },
  ];

  const approvalColumns = [
    { key: "approval_request_no", label: "Approval" },
    { key: "request_title_txt", label: "Request", render: (row) => row.request_title_txt || "-" },
    { key: "business_domain_cd", label: "Domain", render: (row) => compactCode(row.business_domain_cd) },
    { key: "module_reference_txt", label: "Reference", render: (row) => row.module_reference_txt || row.work_matter_no || "-" },
    { key: "requested_amt", label: "Amount", render: (row) => formatMoney(row.requested_amt) },
    { key: "current_approver_role_name", label: "Current approver", render: (row) => row.current_approver_name || row.current_approver_role_name || "Supervisor" },
    { key: "approval_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.approval_state_cd)}>{compactCode(row.approval_state_cd)}</StatusPill> },
  ];

  const stepColumns = [
    { key: "step_no", label: "Step" },
    { key: "step_name_txt", label: "Name", render: (row) => row.step_name_txt || `Step ${row.step_no}` },
    { key: "approver_name", label: "Approver", render: (row) => row.approver_name || row.approver_role_name || row.queue_name || "Supervisor" },
    { key: "step_state_cd", label: "Step state", render: (row) => <StatusPill tone={statusTone(row.step_state_cd)}>{compactCode(row.step_state_cd)}</StatusPill> },
    { key: "decision_cd", label: "Decision", render: (row) => row.decision_cd ? <StatusPill tone={statusTone(row.decision_cd)}>{compactCode(row.decision_cd)}</StatusPill> : "Pending" },
    { key: "decision_ts", label: "Decided", render: (row) => formatDateTime(row.decision_ts) },
    { key: "comments_txt", label: "Notes", render: (row) => row.comments_txt || "-" },
  ];

  const eventColumns = [
    { key: "event_ts", label: "Time", render: (row) => formatDateTime(row.event_ts) },
    { key: "event_type_cd", label: "Event", render: (row) => compactCode(row.event_type_cd) },
    { key: "to_approval_state_cd", label: "State", render: (row) => row.to_approval_state_cd ? compactCode(row.to_approval_state_cd) : "-" },
    { key: "created_by_name_txt", label: "Officer", render: (row) => row.created_by_name_txt || "-" },
    { key: "event_reason_txt", label: "Reason", render: (row) => row.event_reason_txt || "-" },
  ];

  const taskColumns = [
    { key: "work_matter_no", label: "Matter" },
    { key: "task_title_txt", label: "Task", render: (row) => row.task_title_txt || compactCode(row.task_type_cd) },
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "queue_name", label: "Queue", render: (row) => row.queue_name || "-" },
    { key: "assigned_actor_name", label: "Officer", render: (row) => row.assigned_actor_name || "-" },
    { key: "due_ts", label: "Due", render: (row) => formatDateTime(row.due_ts) },
    { key: "task_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.task_state_cd)}>{compactCode(row.task_state_cd)}</StatusPill> },
  ];

  const matterColumns = [
    { key: "work_matter_no", label: "Matter" },
    { key: "matter_title_txt", label: "Title", render: (row) => row.matter_title_txt || compactCode(row.work_type_cd) },
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "business_domain_cd", label: "Domain", render: (row) => compactCode(row.business_domain_cd) },
    { key: "open_task_count", label: "Tasks", render: (row) => formatNumber(row.open_task_count) },
    { key: "pending_approval_count", label: "Approvals", render: (row) => formatNumber(row.pending_approval_count) },
    { key: "work_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.work_state_cd)}>{compactCode(row.work_state_cd)}</StatusPill> },
  ];

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Workflow and approvals" title="Supervisor Decisions And Officer Work" status="Governed" tone="success" />

      <div className="metric-grid">
        <MetricTile icon={Inbox} label="Queues" value={formatNumber(overview?.queue_count)} />
        <MetricTile icon={GitPullRequestArrow} label="Open matters" value={formatNumber(overview?.open_matter_count)} />
        <MetricTile icon={ListChecks} label="Open tasks" value={formatNumber(overview?.open_task_count)} sublabel={`${formatNumber(overview?.overdue_task_count)} overdue`} />
        <MetricTile icon={ShieldCheck} label="Pending approvals" value={formatNumber(overview?.pending_approval_count)} />
        <MetricTile icon={RotateCcw} label="Returned" value={formatNumber(overview?.returned_approval_count)} />
        <MetricTile icon={CheckCircle2} label="Approved" value={formatNumber(overview?.approved_approval_count)} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "supervisor" ? (
        <div className="workflow-decision-grid">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Supervisor queue</span>
                <h2>Pending Decisions</h2>
              </div>
              <ShieldCheck size={21} />
            </div>
            <DataTable columns={approvalColumns} rows={supervisorPending} keyField="approval_request_uid" selectedKey={selectedApprovalRecord?.approval_request_uid} onRowClick={(row) => loadApproval(row.approval_request_uid)} empty="No pending supervisor approvals" />
          </section>

          <aside className="content-band workflow-sticky-panel">
            <div className="section-heading">
              <div>
                <span>Decision panel</span>
                <h2>{selectedApprovalRecord?.approval_request_no || "Select an approval"}</h2>
              </div>
              {selectedApprovalRecord ? <StatusPill tone={statusTone(selectedApprovalRecord.approval_state_cd)}>{compactCode(selectedApprovalRecord.approval_state_cd)}</StatusPill> : null}
            </div>
            {selectedApprovalRecord ? (
              <>
                <div className="workflow-approval-card">
                  <span>{selectedApprovalRecord.business_domain_cd}</span>
                  <strong>{selectedApprovalRecord.request_title_txt}</strong>
                  <small>{selectedApprovalRecord.request_reason_txt || "No request notes supplied."}</small>
                </div>
                <div className="workflow-summary-strip">
                  <div><span>Amount</span><strong>{formatMoney(selectedApprovalRecord.requested_amt)}</strong></div>
                  <div><span>Action</span><strong>{compactCode(selectedApprovalRecord.requested_action_cd)}</strong></div>
                  <div><span>Reference</span><strong>{selectedApprovalRecord.module_reference_txt || "-"}</strong></div>
                  <div><span>Linked state</span><strong>{selectedApproval?.linked_record?.state_cd ? compactCode(selectedApproval.linked_record.state_cd) : "-"}</strong></div>
                </div>
                <form className="stacked-form" onSubmit={submitDecision}>
                  <SelectField label="Pending step" value={decisionForm.approval_step_uid} onChange={(value) => setDecisionForm({ ...decisionForm, approval_step_uid: value })}>
                    <option value="">Select pending step</option>
                    {(selectedApproval?.steps || []).filter((step) => !step.decision_cd).map((step) => (
                      <option key={step.approval_step_uid} value={step.approval_step_uid}>
                        Step {step.step_no} - {step.step_name_txt || "Approval"}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField label="Decision" value={decisionForm.decision_cd} onChange={(value) => setDecisionForm({ ...decisionForm, decision_cd: value })}>
                    <option value="APPROVE">Approve</option>
                    <option value="REJECT">Reject</option>
                    <option value="RETURN">Return for correction</option>
                  </SelectField>
                  <Field label="Decision notes">
                    <textarea required value={decisionForm.comments_txt} onChange={(event) => setDecisionForm({ ...decisionForm, comments_txt: event.target.value })} />
                  </Field>
                  <div className="workflow-decision-actions">
                    <button className="primary-button" type="submit" disabled={!pendingStep}>Record decision</button>
                    <button className="secondary-button" type="button" disabled={!selectedApprovalRecord || !["DRAFT", "SUBMITTED", "UNDER_REVIEW", "RETURNED"].includes(selectedApprovalRecord.approval_state_cd)} onClick={() => submit(`/api/workflow/approvals/${selectedApprovalRecord.approval_request_uid}/cancel`, { reason_txt: "Cancelled from supervisor decision panel." }, null, "Approval cancelled.")}>Cancel request</button>
                  </div>
                </form>
              </>
            ) : (
              <div className="empty-panel">
                <div>
                  <strong>No approval selected</strong>
                  <span>Select a pending request to review the linked record and record a decision.</span>
                </div>
              </div>
            )}
          </aside>

          {selectedApproval ? (
            <section className="content-band workflow-decision-grid__detail">
              <div className="section-heading">
                <div>
                  <span>Approval trail</span>
                  <h2>Steps And Compliance Timeline</h2>
                </div>
                <ClipboardCheck size={21} />
              </div>
              <div className="workflow-detail-stack">
                <DataTable columns={stepColumns} rows={selectedApproval.steps || []} keyField="approval_step_uid" empty="No approval steps" />
                <DataTable columns={eventColumns} rows={selectedApproval.events || []} keyField="approval_event_uid" empty="No approval events" />
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {activeTab === "tasks" ? (
        <div className="workflow-task-grid">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Officer work</span>
                <h2>My Tasks</h2>
              </div>
              <UserRoundCheck size={21} />
            </div>
            <DataTable columns={taskColumns} rows={myTasks} keyField="work_task_uid" selectedKey={selectedTask?.work_task_uid} onRowClick={selectTask} empty="No assigned tasks" />
          </section>

          <aside className="content-band workflow-sticky-panel">
            <div className="section-heading">
              <div>
                <span>Task control</span>
                <h2>{selectedTask?.task_title_txt || "Select a task"}</h2>
              </div>
              {selectedTask ? <StatusPill tone={statusTone(selectedTask.task_state_cd)}>{compactCode(selectedTask.task_state_cd)}</StatusPill> : null}
            </div>
            {selectedTask ? (
              <>
                <div className="workflow-summary-strip">
                  <div><span>Matter</span><strong>{selectedTask.work_matter_no}</strong></div>
                  <div><span>Due</span><strong>{formatDateTime(selectedTask.due_ts)}</strong></div>
                  <div><span>Queue</span><strong>{selectedTask.queue_name || "-"}</strong></div>
                  <div><span>Taxpayer</span><strong>{selectedTask.display_name_txt || "-"}</strong></div>
                </div>
                <div className="workflow-decision-actions">
                  <button className="secondary-button" type="button" onClick={() => submit(`/api/workflow/tasks/${selectedTask.work_task_uid}/state`, { task_state_cd: "IN_PROGRESS" }, null, "Task started.", { method: "PATCH" })}>Start</button>
                  <button className="primary-button" type="button" onClick={() => submit(`/api/workflow/tasks/${selectedTask.work_task_uid}/state`, { task_state_cd: "COMPLETED", outcome_cd: "DONE" }, null, "Task completed.", { method: "PATCH" })}>Complete</button>
                </div>
                <form className="stacked-form" onSubmit={(event) => {
                  event.preventDefault();
                  void submit(
                    `/api/workflow/tasks/${selectedTask.work_task_uid}/reassign`,
                    {
                      assigned_queue_uid: taskReassignForm.assigned_queue_uid || null,
                      assigned_actor_uid: taskReassignForm.assigned_actor_uid || null,
                      due_ts: toIso(taskReassignForm.due_ts),
                    },
                    null,
                    "Task reassigned.",
                    { method: "PATCH" }
                  );
                }}>
                  <SelectField label="Queue" value={taskReassignForm.assigned_queue_uid} onChange={(value) => setTaskReassignForm({ ...taskReassignForm, assigned_queue_uid: value })}>
                    <option value="">No queue</option>
                    {queues.map((queue) => <option key={queue.work_queue_uid} value={queue.work_queue_uid}>{queue.queue_name}</option>)}
                  </SelectField>
                  <SelectField label="Officer" value={taskReassignForm.assigned_actor_uid} onChange={(value) => setTaskReassignForm({ ...taskReassignForm, assigned_actor_uid: value })}>
                    <option value="">No officer</option>
                    {staff.map((member) => <option key={member.actor_uid} value={member.actor_uid}>{member.full_name_txt || member.display_name_txt || member.username_txt}</option>)}
                  </SelectField>
                  <Field label="Due">
                    <input type="datetime-local" value={taskReassignForm.due_ts} onChange={(event) => setTaskReassignForm({ ...taskReassignForm, due_ts: event.target.value })} />
                  </Field>
                  <button className="secondary-button" type="submit">Reassign task</button>
                </form>
              </>
            ) : (
              <div className="empty-panel">
                <div>
                  <strong>No task selected</strong>
                  <span>Select a task to start, complete, or reassign it.</span>
                </div>
              </div>
            )}
          </aside>

          <section className="content-band workflow-task-grid__all">
            <div className="section-heading">
              <div>
                <span>Workload</span>
                <h2>All Open Tasks</h2>
              </div>
              <FileClock size={21} />
            </div>
            <DataTable columns={taskColumns} rows={tasks} keyField="work_task_uid" onRowClick={selectTask} empty="No workflow tasks" />
          </section>
        </div>
      ) : null}

      {activeTab === "approvals" ? (
        <div className="workflow-engine-grid">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Approval request</span>
                <h2>Create Controlled Request</h2>
              </div>
              <GitPullRequestArrow size={21} />
            </div>
            <form className="workflow-two-column-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/workflow/approvals",
                approvalPayload(),
                () => setApprovalForm(initialApproval),
                "Approval request created."
              );
            }}>
              <SelectField label="Matter" value={approvalForm.work_matter_uid} onChange={(value) => {
                const matter = matters.find((item) => item.work_matter_uid === value);
                setApprovalForm({
                  ...approvalForm,
                  work_matter_uid: value,
                  business_domain_cd: matter?.business_domain_cd || approvalForm.business_domain_cd,
                  request_title_txt: matter?.matter_title_txt || approvalForm.request_title_txt,
                });
              }}>
                <option value="">No work matter</option>
                {matters.map((matter) => <option key={matter.work_matter_uid} value={matter.work_matter_uid}>{matter.work_matter_no} - {matter.matter_title_txt || compactCode(matter.work_type_cd)}</option>)}
              </SelectField>
              <SelectField label="Domain" value={approvalForm.business_domain_cd} onChange={(value) => setApprovalForm({ ...approvalForm, business_domain_cd: value })}>
                {domains.map((domain) => <option key={domain} value={domain}>{compactCode(domain)}</option>)}
              </SelectField>
              <Field label="Request title">
                <input required value={approvalForm.request_title_txt} onChange={(event) => setApprovalForm({ ...approvalForm, request_title_txt: event.target.value })} />
              </Field>
              <Field label="Requested action">
                <input value={approvalForm.requested_action_cd} onChange={(event) => setApprovalForm({ ...approvalForm, requested_action_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Source schema">
                <input value={approvalForm.source_schema_cd} onChange={(event) => setApprovalForm({ ...approvalForm, source_schema_cd: event.target.value.toLowerCase() })} />
              </Field>
              <Field label="Source table">
                <input value={approvalForm.source_table_cd} onChange={(event) => setApprovalForm({ ...approvalForm, source_table_cd: event.target.value })} />
              </Field>
              <Field label="Source record UID">
                <input value={approvalForm.source_record_uid} onChange={(event) => setApprovalForm({ ...approvalForm, source_record_uid: event.target.value })} />
              </Field>
              <Field label="Module reference">
                <input value={approvalForm.module_reference_txt} onChange={(event) => setApprovalForm({ ...approvalForm, module_reference_txt: event.target.value })} />
              </Field>
              <Field label="Requested amount">
                <input type="number" value={approvalForm.requested_amt} onChange={(event) => setApprovalForm({ ...approvalForm, requested_amt: event.target.value })} />
              </Field>
              <SelectField label="Initial state" value={approvalForm.approval_state_cd} onChange={(value) => setApprovalForm({ ...approvalForm, approval_state_cd: value })}>
                <option value="SUBMITTED">Submitted</option>
                <option value="DRAFT">Draft</option>
              </SelectField>
              <SelectField label="Approver" value={approvalForm.approver_actor_uid} onChange={(value) => setApprovalForm({ ...approvalForm, approver_actor_uid: value })}>
                <option value="">By role or queue</option>
                {staff.map((member) => <option key={member.actor_uid} value={member.actor_uid}>{member.full_name_txt || member.display_name_txt || member.username_txt}</option>)}
              </SelectField>
              <SelectField label="Approver role" value={approvalForm.approver_role_uid} onChange={(value) => setApprovalForm({ ...approvalForm, approver_role_uid: value })}>
                <option value="">Default supervisor role</option>
                {roles.map((role) => <option key={role.role_bundle_uid} value={role.role_bundle_uid}>{role.role_name}</option>)}
              </SelectField>
              <SelectField label="Approval queue" value={approvalForm.assigned_queue_uid} onChange={(value) => setApprovalForm({ ...approvalForm, assigned_queue_uid: value })}>
                <option value="">Default queue</option>
                {queues.map((queue) => <option key={queue.work_queue_uid} value={queue.work_queue_uid}>{queue.queue_name}</option>)}
              </SelectField>
              <Field label="Due">
                <input type="datetime-local" value={approvalForm.due_ts} onChange={(event) => setApprovalForm({ ...approvalForm, due_ts: event.target.value })} />
              </Field>
              <label className="check-control">
                <input type="checkbox" checked={approvalForm.second_step_bool} onChange={(event) => setApprovalForm({ ...approvalForm, second_step_bool: event.target.checked })} />
                <span>Add second approval step</span>
              </label>
              <Field label="Reason">
                <textarea required value={approvalForm.request_reason_txt} onChange={(event) => setApprovalForm({ ...approvalForm, request_reason_txt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit">Create approval request</button>
            </form>
          </section>

          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Approval register</span>
                <h2>Search Requests</h2>
              </div>
              <ClipboardCheck size={21} />
            </div>
            <form className="workflow-filter-form" onSubmit={runApprovalSearch}>
              <Field label="Search">
                <input value={approvalFilters.q} onChange={(event) => setApprovalFilters({ ...approvalFilters, q: event.target.value })} />
              </Field>
              <SelectField label="State" value={approvalFilters.approval_state_cd} onChange={(value) => setApprovalFilters({ ...approvalFilters, approval_state_cd: value })}>
                {approvalStates.map((state) => <option key={state || "all"} value={state}>{state ? compactCode(state) : "All states"}</option>)}
              </SelectField>
              <SelectField label="Domain" value={approvalFilters.business_domain_cd} onChange={(value) => setApprovalFilters({ ...approvalFilters, business_domain_cd: value })}>
                <option value="">All domains</option>
                {domains.map((domain) => <option key={domain} value={domain}>{compactCode(domain)}</option>)}
              </SelectField>
              <button className="secondary-button" type="submit">Search approvals</button>
            </form>
            <DataTable columns={approvalColumns} rows={approvals} keyField="approval_request_uid" selectedKey={selectedApprovalRecord?.approval_request_uid} onRowClick={(row) => loadApproval(row.approval_request_uid)} empty="No approval requests" />
          </section>
        </div>
      ) : null}

      {activeTab === "matters" ? (
        <div className="workflow-admin-grid">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Routing control</span>
                <h2>Queues</h2>
              </div>
              <Inbox size={21} />
            </div>
            <form className="workflow-two-column-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/workflow/queues",
                { ...queueForm, agency_unit_uid: queueForm.agency_unit_uid || null },
                () => setQueueForm(initialQueue),
                "Work queue created."
              );
            }}>
              <Field label="Queue name">
                <input required value={queueForm.queue_name} onChange={(event) => setQueueForm({ ...queueForm, queue_name: event.target.value })} />
              </Field>
              <SelectField label="Domain" value={queueForm.business_domain_cd} onChange={(value) => setQueueForm({ ...queueForm, business_domain_cd: value })}>
                {domains.map((domain) => <option key={domain} value={domain}>{compactCode(domain)}</option>)}
              </SelectField>
              <SelectField label="Agency unit" value={queueForm.agency_unit_uid} onChange={(value) => setQueueForm({ ...queueForm, agency_unit_uid: value })}>
                <option value="">All units</option>
                {agencyUnits.map((unit) => <option key={unit.agency_unit_uid} value={unit.agency_unit_uid}>{unit.unit_name}</option>)}
              </SelectField>
              <button className="secondary-button" type="submit">Create queue</button>
            </form>
            <DataTable columns={queueColumns} rows={queues} keyField="work_queue_uid" empty="No work queues" />
          </section>

          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Casework</span>
                <h2>Open Work Matter</h2>
              </div>
              <GitPullRequestArrow size={21} />
            </div>
            <form className="workflow-two-column-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/workflow/matters",
                {
                  ...matterForm,
                  subject_uid: matterForm.subject_uid || null,
                  assigned_unit_uid: matterForm.assigned_unit_uid || null,
                  assigned_queue_uid: matterForm.assigned_queue_uid || null,
                  assigned_actor_uid: matterForm.assigned_actor_uid || null,
                  due_ts: toIso(matterForm.due_ts),
                  create_initial_task_bool: true,
                  initial_task_type_cd: "REVIEW",
                  initial_task_title_txt: "Initial review",
                },
                () => setMatterForm(initialMatter),
                "Work matter opened."
              );
            }}>
              <SelectField label="Taxpayer" value={matterForm.subject_uid} onChange={(value) => setMatterForm({ ...matterForm, subject_uid: value })}>
                <option value="">No taxpayer context</option>
                {subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.display_name_txt}</option>)}
              </SelectField>
              <SelectField label="Domain" value={matterForm.business_domain_cd} onChange={(value) => setMatterForm({ ...matterForm, business_domain_cd: value })}>
                {domains.map((domain) => <option key={domain} value={domain}>{compactCode(domain)}</option>)}
              </SelectField>
              <Field label="Work type">
                <input value={matterForm.work_type_cd} onChange={(event) => setMatterForm({ ...matterForm, work_type_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Title">
                <input value={matterForm.matter_title_txt} onChange={(event) => setMatterForm({ ...matterForm, matter_title_txt: event.target.value })} />
              </Field>
              <Field label="Priority">
                <input value={matterForm.priority_cd} onChange={(event) => setMatterForm({ ...matterForm, priority_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Due">
                <input type="datetime-local" value={matterForm.due_ts} onChange={(event) => setMatterForm({ ...matterForm, due_ts: event.target.value })} />
              </Field>
              <SelectField label="Queue" value={matterForm.assigned_queue_uid} onChange={(value) => setMatterForm({ ...matterForm, assigned_queue_uid: value })}>
                <option value="">Officer owned</option>
                {queues.map((queue) => <option key={queue.work_queue_uid} value={queue.work_queue_uid}>{queue.queue_name}</option>)}
              </SelectField>
              <SelectField label="Officer" value={matterForm.assigned_actor_uid} onChange={(value) => setMatterForm({ ...matterForm, assigned_actor_uid: value })}>
                <option value="">Current officer</option>
                {staff.map((member) => <option key={member.actor_uid} value={member.actor_uid}>{member.full_name_txt || member.display_name_txt || member.username_txt}</option>)}
              </SelectField>
              <Field label="Summary">
                <textarea value={matterForm.matter_summary_txt} onChange={(event) => setMatterForm({ ...matterForm, matter_summary_txt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit">Open matter</button>
            </form>
          </section>

          <section className="content-band workflow-admin-grid__table">
            <DataTable columns={matterColumns} rows={matters} keyField="work_matter_uid" empty="No work matters" />
          </section>
        </div>
      ) : null}
    </section>
  );
}
