import { GitPullRequestArrow, Inbox, ListChecks, ShieldCheck } from "lucide-react";
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
import { compactCode, formatDateTime, formatMoney, formatNumber } from "../utils/format.js";

const tabs = [
  { id: "queues", label: "Queues" },
  { id: "matters", label: "Matters And Tasks" },
  { id: "approvals", label: "Approvals" },
];

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
  if (["APPROVED", "CLOSED", "COMPLETE", "DONE"].includes(status)) return "success";
  if (["REJECTED", "CANCELLED", "OVERDUE"].includes(status)) return "danger";
  if (["OPEN", "REQUESTED", "PENDING", "REQUEST_INFO"].includes(status)) return "warning";
  return "neutral";
}

const initialQueue = { queue_name: "", business_domain_cd: "ASSESSMENT", agency_unit_uid: "" };
const initialMatter = {
  subject_uid: "",
  business_domain_cd: "ASSESSMENT",
  work_type_cd: "OFFICER_REVIEW",
  priority_cd: "NORMAL",
  assigned_queue_uid: "",
  due_ts: tomorrowLocalInput(),
};
const initialTask = { work_matter_uid: "", task_type_cd: "REVIEW", assigned_queue_uid: "", due_ts: tomorrowLocalInput() };
const initialApproval = {
  work_matter_uid: "",
  business_domain_cd: "ASSESSMENT",
  requested_amt: "",
  threshold_cd: "STANDARD",
  approver_actor_uid: "",
  approver_role_uid: "",
};
const initialDecision = { approval_step_uid: "", decision_cd: "APPROVE", comments_txt: "" };

async function safeRequest(path, fallback) {
  try {
    return await apiRequest(path);
  } catch {
    return fallback;
  }
}

export default function WorkflowPage() {
  const [activeTab, setActiveTab] = useState("queues");
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [agencyUnits, setAgencyUnits] = useState([]);
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [queues, setQueues] = useState([]);
  const [matters, setMatters] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [queueForm, setQueueForm] = useState(initialQueue);
  const [matterForm, setMatterForm] = useState(initialMatter);
  const [taskForm, setTaskForm] = useState(initialTask);
  const [approvalForm, setApprovalForm] = useState(initialApproval);
  const [decisionForm, setDecisionForm] = useState(initialDecision);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const [overviewPayload, subjectsPayload, unitsPayload, staffPayload, rolesPayload, queuesPayload, mattersPayload, tasksPayload, approvalsPayload] =
      await Promise.all([
        apiRequest("/api/workflow/overview"),
        apiRequest("/api/registry/subjects?pageSize=100"),
        safeRequest("/api/admin/agency-units", { agency_units: [] }),
        safeRequest("/api/admin/staff?pageSize=100", { rows: [] }),
        safeRequest("/api/admin/roles", { roles: [] }),
        apiRequest("/api/workflow/queues"),
        apiRequest("/api/workflow/matters?pageSize=80"),
        apiRequest("/api/workflow/tasks?pageSize=80"),
        apiRequest("/api/workflow/approvals?pageSize=80"),
      ]);

    setOverview(overviewPayload.overview);
    setSubjects(subjectsPayload.rows || []);
    setAgencyUnits(unitsPayload.agency_units || []);
    setStaff(staffPayload.rows || []);
    setRoles(rolesPayload.roles || []);
    setQueues(queuesPayload.queues || []);
    setMatters(mattersPayload.rows || []);
    setTasks(tasksPayload.rows || []);
    setApprovals(approvalsPayload.rows || []);
  }

  useEffect(() => {
    void load().catch((loadError) => setError(loadError.message));
  }, []);

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

  async function loadApproval(approvalRequestUid) {
    const payload = await apiRequest(`/api/workflow/approvals/${approvalRequestUid}`);
    setSelectedApproval(payload.approval);
    const pendingStep = payload.approval.steps?.find((step) => !step.decision_cd);
    setDecisionForm({ ...decisionForm, approval_step_uid: pendingStep?.approval_step_uid || "" });
  }

  async function submitDecision(event) {
    event.preventDefault();
    if (!decisionForm.approval_step_uid) return;
    setError("");
    setSuccess("");
    try {
      const payload = await apiRequest(`/api/workflow/approval-steps/${decisionForm.approval_step_uid}/decision`, {
        method: "POST",
        body: {
          decision_cd: decisionForm.decision_cd,
          comments_txt: decisionForm.comments_txt || null,
        },
      });
      setSelectedApproval(payload.approval);
      setDecisionForm(initialDecision);
      await load();
      setSuccess("Supervisor decision recorded");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  const queueColumns = [
    { key: "queue_name", label: "Queue" },
    { key: "business_domain_cd", label: "Domain", render: (row) => compactCode(row.business_domain_cd) },
    { key: "unit_name", label: "Agency unit", render: (row) => row.unit_name || "-" },
    { key: "open_task_count", label: "Open tasks", render: (row) => formatNumber(row.open_task_count) },
    { key: "queue_state_cd", label: "State", render: (row) => <StatusPill tone="success">{compactCode(row.queue_state_cd)}</StatusPill> },
  ];

  const matterColumns = [
    { key: "work_matter_no", label: "Matter" },
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "business_domain_cd", label: "Domain", render: (row) => compactCode(row.business_domain_cd) },
    { key: "work_type_cd", label: "Type", render: (row) => compactCode(row.work_type_cd) },
    { key: "open_task_count", label: "Open tasks", render: (row) => formatNumber(row.open_task_count) },
    { key: "work_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.work_state_cd)}>{compactCode(row.work_state_cd)}</StatusPill> },
  ];

  const taskColumns = [
    { key: "work_matter_no", label: "Matter" },
    { key: "task_no", label: "Task" },
    { key: "task_type_cd", label: "Type", render: (row) => compactCode(row.task_type_cd) },
    { key: "queue_name", label: "Queue", render: (row) => row.queue_name || "-" },
    { key: "due_ts", label: "Due", render: (row) => formatDateTime(row.due_ts) },
    { key: "task_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.task_state_cd)}>{compactCode(row.task_state_cd)}</StatusPill> },
  ];

  const approvalColumns = [
    { key: "approval_request_no", label: "Approval" },
    { key: "work_matter_no", label: "Matter", render: (row) => row.work_matter_no || "-" },
    { key: "business_domain_cd", label: "Domain", render: (row) => compactCode(row.business_domain_cd) },
    { key: "requested_amt", label: "Amount", render: (row) => formatMoney(row.requested_amt) },
    { key: "decided_step_count", label: "Decided", render: (row) => `${formatNumber(row.decided_step_count)} / ${formatNumber(row.step_count)}` },
    { key: "approval_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.approval_state_cd)}>{compactCode(row.approval_state_cd)}</StatusPill> },
  ];

  const stepColumns = [
    { key: "step_no", label: "Step" },
    { key: "approver_name", label: "Approver", render: (row) => row.approver_name || row.approver_role_name || "Supervisor" },
    { key: "decision_cd", label: "Decision", render: (row) => row.decision_cd ? <StatusPill tone={statusTone(row.decision_cd)}>{compactCode(row.decision_cd)}</StatusPill> : "Pending" },
    { key: "decision_ts", label: "Decided", render: (row) => formatDateTime(row.decision_ts) },
    { key: "comments_txt", label: "Comments", render: (row) => row.comments_txt || "-" },
  ];

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Workflow and approvals" title="Work Queues, Matters And Supervisor Decisions" status="Governed" tone="success" />

      <div className="metric-grid">
        <MetricTile icon={Inbox} label="Queues" value={formatNumber(overview?.queue_count)} />
        <MetricTile icon={GitPullRequestArrow} label="Open matters" value={formatNumber(overview?.open_matter_count)} />
        <MetricTile icon={ListChecks} label="Open tasks" value={formatNumber(overview?.open_task_count)} />
        <MetricTile icon={ShieldCheck} label="Pending approvals" value={formatNumber(overview?.pending_approval_count)} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "queues" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Routing control</span>
                <h2>Create Work Queue</h2>
              </div>
            </div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/workflow/queues",
                { ...queueForm, agency_unit_uid: queueForm.agency_unit_uid || null },
                () => setQueueForm(initialQueue),
                "Work queue created"
              );
            }}>
              <Field label="Queue name">
                <input required value={queueForm.queue_name} onChange={(event) => setQueueForm({ ...queueForm, queue_name: event.target.value })} />
              </Field>
              <Field label="Business domain">
                <input value={queueForm.business_domain_cd} onChange={(event) => setQueueForm({ ...queueForm, business_domain_cd: event.target.value.toUpperCase() })} />
              </Field>
              <SelectField label="Agency unit" value={queueForm.agency_unit_uid} onChange={(value) => setQueueForm({ ...queueForm, agency_unit_uid: value })}>
                <option value="">All units</option>
                {agencyUnits.map((unit) => (
                  <option key={unit.agency_unit_uid} value={unit.agency_unit_uid}>
                    {unit.unit_name}
                  </option>
                ))}
              </SelectField>
              <button className="primary-button" type="submit">Create queue</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={queueColumns} rows={queues} keyField="work_queue_uid" empty="No work queues" />
          </section>
        </div>
      ) : null}

      {activeTab === "matters" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Casework</span>
                <h2>Create Matter And Task</h2>
              </div>
            </div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/workflow/matters",
                {
                  ...matterForm,
                  subject_uid: matterForm.subject_uid || null,
                  assigned_queue_uid: matterForm.assigned_queue_uid || null,
                  due_ts: toIso(matterForm.due_ts),
                  create_initial_task_bool: true,
                  initial_task_type_cd: "REVIEW",
                },
                () => setMatterForm(initialMatter),
                "Work matter opened"
              );
            }}>
              <SelectField label="Taxpayer" value={matterForm.subject_uid} onChange={(value) => setMatterForm({ ...matterForm, subject_uid: value })}>
                <option value="">No taxpayer context</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_uid} value={subject.subject_uid}>
                    {subject.display_name_txt}
                  </option>
                ))}
              </SelectField>
              <div className="compact-form">
                <Field label="Business domain">
                  <input value={matterForm.business_domain_cd} onChange={(event) => setMatterForm({ ...matterForm, business_domain_cd: event.target.value.toUpperCase() })} />
                </Field>
                <Field label="Work type">
                  <input value={matterForm.work_type_cd} onChange={(event) => setMatterForm({ ...matterForm, work_type_cd: event.target.value.toUpperCase() })} />
                </Field>
              </div>
              <div className="compact-form">
                <Field label="Priority">
                  <input value={matterForm.priority_cd} onChange={(event) => setMatterForm({ ...matterForm, priority_cd: event.target.value.toUpperCase() })} />
                </Field>
                <Field label="Task due">
                  <input type="datetime-local" value={matterForm.due_ts} onChange={(event) => setMatterForm({ ...matterForm, due_ts: event.target.value })} />
                </Field>
              </div>
              <SelectField label="Assigned queue" value={matterForm.assigned_queue_uid} onChange={(value) => setMatterForm({ ...matterForm, assigned_queue_uid: value })}>
                <option value="">Officer owned</option>
                {queues.map((queue) => (
                  <option key={queue.work_queue_uid} value={queue.work_queue_uid}>
                    {queue.queue_name}
                  </option>
                ))}
              </SelectField>
              <button className="primary-button" type="submit">Open matter</button>
            </form>
            <hr />
            <form className="compact-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/workflow/tasks",
                {
                  ...taskForm,
                  assigned_queue_uid: taskForm.assigned_queue_uid || null,
                  due_ts: toIso(taskForm.due_ts),
                },
                () => setTaskForm(initialTask),
                "Task added"
              );
            }}>
              <SelectField label="Matter" value={taskForm.work_matter_uid} onChange={(value) => setTaskForm({ ...taskForm, work_matter_uid: value })}>
                <option value="">Select matter</option>
                {matters.map((matter) => (
                  <option key={matter.work_matter_uid} value={matter.work_matter_uid}>
                    {matter.work_matter_no}
                  </option>
                ))}
              </SelectField>
              <Field label="Task type">
                <input value={taskForm.task_type_cd} onChange={(event) => setTaskForm({ ...taskForm, task_type_cd: event.target.value.toUpperCase() })} />
              </Field>
              <SelectField label="Queue" value={taskForm.assigned_queue_uid} onChange={(value) => setTaskForm({ ...taskForm, assigned_queue_uid: value })}>
                <option value="">Officer owned</option>
                {queues.map((queue) => (
                  <option key={queue.work_queue_uid} value={queue.work_queue_uid}>
                    {queue.queue_name}
                  </option>
                ))}
              </SelectField>
              <Field label="Due">
                <input type="datetime-local" value={taskForm.due_ts} onChange={(event) => setTaskForm({ ...taskForm, due_ts: event.target.value })} />
              </Field>
              <button className="secondary-button full-span" type="submit">Add task</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={matterColumns} rows={matters} keyField="work_matter_uid" empty="No work matters" />
            <br />
            <DataTable columns={taskColumns} rows={tasks} keyField="work_task_uid" empty="No work tasks" />
          </section>
        </div>
      ) : null}

      {activeTab === "approvals" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Decision control</span>
                <h2>Create Approval Request</h2>
              </div>
            </div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/workflow/approvals",
                {
                  ...approvalForm,
                  work_matter_uid: approvalForm.work_matter_uid || null,
                  source_record_uid: null,
                  requested_amt: approvalForm.requested_amt || null,
                  approver_actor_uid: approvalForm.approver_actor_uid || null,
                  approver_role_uid: approvalForm.approver_role_uid || null,
                },
                () => setApprovalForm(initialApproval),
                "Approval request created"
              );
            }}>
              <SelectField label="Matter" value={approvalForm.work_matter_uid} onChange={(value) => {
                const matter = matters.find((item) => item.work_matter_uid === value);
                setApprovalForm({
                  ...approvalForm,
                  work_matter_uid: value,
                  business_domain_cd: matter?.business_domain_cd || approvalForm.business_domain_cd,
                });
              }}>
                <option value="">No matter selected</option>
                {matters.map((matter) => (
                  <option key={matter.work_matter_uid} value={matter.work_matter_uid}>
                    {matter.work_matter_no}
                  </option>
                ))}
              </SelectField>
              <div className="compact-form">
                <Field label="Business domain">
                  <input value={approvalForm.business_domain_cd} onChange={(event) => setApprovalForm({ ...approvalForm, business_domain_cd: event.target.value.toUpperCase() })} />
                </Field>
                <Field label="Requested amount">
                  <input type="number" value={approvalForm.requested_amt} onChange={(event) => setApprovalForm({ ...approvalForm, requested_amt: event.target.value })} />
                </Field>
              </div>
              <SelectField label="Approver" value={approvalForm.approver_actor_uid} onChange={(value) => setApprovalForm({ ...approvalForm, approver_actor_uid: value })}>
                <option value="">Supervisor by role</option>
                {staff.map((member) => (
                  <option key={member.actor_uid} value={member.actor_uid}>
                    {member.display_name_txt || member.full_name_txt}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Approver role" value={approvalForm.approver_role_uid} onChange={(value) => setApprovalForm({ ...approvalForm, approver_role_uid: value })}>
                <option value="">Any supervisor</option>
                {roles.map((role) => (
                  <option key={role.role_bundle_uid} value={role.role_bundle_uid}>
                    {role.role_name}
                  </option>
                ))}
              </SelectField>
              <Field label="Threshold">
                <input value={approvalForm.threshold_cd} onChange={(event) => setApprovalForm({ ...approvalForm, threshold_cd: event.target.value.toUpperCase() })} />
              </Field>
              <button className="primary-button" type="submit">Create approval</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={submitDecision}>
              <SelectField label="Approval step" value={decisionForm.approval_step_uid} onChange={(value) => setDecisionForm({ ...decisionForm, approval_step_uid: value })}>
                <option value="">Select pending step</option>
                {(selectedApproval?.steps || []).filter((step) => !step.decision_cd).map((step) => (
                  <option key={step.approval_step_uid} value={step.approval_step_uid}>
                    Step {step.step_no}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Decision" value={decisionForm.decision_cd} onChange={(value) => setDecisionForm({ ...decisionForm, decision_cd: value })}>
                <option value="APPROVE">Approve</option>
                <option value="REJECT">Reject</option>
                <option value="REQUEST_INFO">Request information</option>
              </SelectField>
              <Field label="Decision comments">
                <textarea value={decisionForm.comments_txt} onChange={(event) => setDecisionForm({ ...decisionForm, comments_txt: event.target.value })} />
              </Field>
              <button className="secondary-button" type="submit" disabled={!decisionForm.approval_step_uid}>Record decision</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={approvalColumns} rows={approvals} keyField="approval_request_uid" onRowClick={(row) => loadApproval(row.approval_request_uid)} selectedKey={selectedApproval?.approval?.approval_request_uid} empty="No approval requests" />
            <br />
            <div className="section-heading">
              <div>
                <span>Approval detail</span>
                <h2>{selectedApproval?.approval?.approval_request_no || "Select an approval"}</h2>
              </div>
              {selectedApproval?.approval ? <StatusPill tone={statusTone(selectedApproval.approval.approval_state_cd)}>{compactCode(selectedApproval.approval.approval_state_cd)}</StatusPill> : null}
            </div>
            <DataTable columns={stepColumns} rows={selectedApproval?.steps || []} keyField="approval_step_uid" empty="No approval steps" />
          </section>
        </div>
      ) : null}
    </section>
  );
}
