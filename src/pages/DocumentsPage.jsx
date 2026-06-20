import {
  BookTemplate,
  Download,
  FileCheck2,
  FileText,
  FolderArchive,
  History,
  Link2,
  Send,
  Upload,
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
import { apiRequest, downloadBlob } from "../services/api.js";
import { compactCode, formatDate, formatDateTime, formatNumber } from "../utils/format.js";

const tabs = [
  { id: "repository", label: "Repository" },
  { id: "generation", label: "Official Generation" },
  { id: "messages", label: "Messaging" },
  { id: "templates", label: "Templates" },
  { id: "audit", label: "Audit Trail" },
];

const documentTypes = [
  ["LIABILITY_NOTICE", "Liability notice"],
  ["RECEIPT", "Official receipt"],
  ["REFUND_DECISION", "Refund decision notice"],
  ["DEMAND_NOTICE", "Demand notice"],
  ["APPROVAL_DECISION", "Approval decision notice"],
  ["TAXPAYER_REGISTRATION_SUMMARY", "Taxpayer registration summary"],
];

const targetConfig = {
  SUBJECT: { label: "Taxpayer profile", schema: "prt", table: "prt_subject" },
  LIABILITY_NOTICE: { label: "Liability notice", schema: "asm", table: "asm_liability_notice" },
  RECEIPT: { label: "Receipt", schema: "fin", table: "fin_receipt_event" },
  REFUND: { label: "Refund request", schema: "fin", table: "fin_refund_request" },
  DECLARATION: { label: "Declaration", schema: "fil", table: "fil_declaration_record" },
  RECOVERY_MATTER: { label: "Recovery matter", schema: "col", table: "col_recovery_matter" },
  WORK_MATTER: { label: "Work matter", schema: "ops", table: "ops_work_matter" },
  APPROVAL: { label: "Approval request", schema: "ops", table: "ops_approval_request" },
};

const initialUpload = {
  content_type_cd: "SUPPORTING_DOCUMENT",
  document_category_cd: "SUPPORTING_DOCUMENT",
  document_title_txt: "",
  document_summary_txt: "",
  confidentiality_cd: "OFFICIAL",
  subject_uid: "",
  file_name_txt: "",
  mime_type_txt: "",
  file_size_no: "",
  sha256_hash_txt: "",
  file_base64_txt: "",
};
const initialLink = { content_record_uid: "", target_type: "SUBJECT", business_record_uid: "", subject_uid: "", link_role_cd: "SUPPORTING_DOCUMENT", visibility_cd: "INTERNAL" };
const initialGenerate = { document_type_cd: "LIABILITY_NOTICE", source_record_uid: "", document_title_txt: "", confidentiality_cd: "OFFICIAL", reason_txt: "" };
const initialMessage = {
  subject_uid: "",
  content_record_uid: "",
  template_version_uid: "",
  delivery_channel_cd: "PORTAL",
  message_state_cd: "SENT",
  priority_cd: "NORMAL",
  subject_txt: "",
  message_body_txt: "",
  recipient_txt: "",
  portal_visible_bool: true,
};
const initialDelivery = { message_envelope_uid: "", event_type_cd: "DELIVERED", provider_reference_txt: "" };
const initialTemplate = {
  template_code: "GENERAL_NOTICE",
  template_type_cd: "GENERAL",
  template_name_txt: "",
  template_body_txt: "",
  active_bool: false,
  locked_bool: false,
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function statusTone(value) {
  const status = String(value || "");
  if (["STORED", "SENT", "DELIVERED", "READ", "APPROVED", "ACTIVE", "ISSUED", "REGISTERED"].includes(status)) return "success";
  if (["DRAFT", "PENDING", "OPEN", "QUEUED"].includes(status)) return "warning";
  if (["FAILED", "REJECTED", "CANCELLED", "RETIRED"].includes(status)) return "danger";
  return "neutral";
}

async function safeRequest(path, fallback) {
  try {
    return await apiRequest(path);
  } catch {
    return fallback;
  }
}

function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function sha256File(file) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState("repository");
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [contentRecords, setContentRecords] = useState([]);
  const [links, setLinks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [deliveryEvents, setDeliveryEvents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [notices, setNotices] = useState([]);
  const [declarations, setDeclarations] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [workMatters, setWorkMatters] = useState([]);
  const [recoveryMatters, setRecoveryMatters] = useState([]);
  const [uploadForm, setUploadForm] = useState(initialUpload);
  const [linkForm, setLinkForm] = useState(initialLink);
  const [generateForm, setGenerateForm] = useState(initialGenerate);
  const [messageForm, setMessageForm] = useState(initialMessage);
  const [deliveryForm, setDeliveryForm] = useState(initialDelivery);
  const [templateForm, setTemplateForm] = useState(initialTemplate);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const [
      overviewPayload,
      subjectsPayload,
      contentPayload,
      linksPayload,
      messagesPayload,
      deliveriesPayload,
      templatesPayload,
      auditPayload,
      noticesPayload,
      declarationsPayload,
      receiptsPayload,
      refundsPayload,
      approvalsPayload,
      workPayload,
      recoveryPayload,
    ] = await Promise.all([
      apiRequest("/api/documents/overview"),
      apiRequest("/api/registry/subjects?pageSize=150"),
      apiRequest("/api/documents/content-records?pageSize=120"),
      apiRequest("/api/documents/content-links?pageSize=120"),
      apiRequest("/api/documents/messages?pageSize=120"),
      apiRequest("/api/documents/delivery-events?pageSize=120"),
      apiRequest("/api/documents/templates?pageSize=120"),
      apiRequest("/api/documents/audit-events?pageSize=120"),
      safeRequest("/api/assessment/liability-notices?pageSize=120", { rows: [] }),
      safeRequest("/api/filing/declarations?pageSize=120", { rows: [] }),
      safeRequest("/api/finance/receipts?pageSize=120", { rows: [] }),
      safeRequest("/api/finance/refunds?pageSize=120", { rows: [] }),
      safeRequest("/api/workflow/approvals?pageSize=120", { rows: [] }),
      safeRequest("/api/workflow/matters?pageSize=120", { rows: [] }),
      safeRequest("/api/collections/recovery-matters?pageSize=120", { rows: [] }),
    ]);

    setOverview(overviewPayload.overview);
    setSubjects(subjectsPayload.rows || []);
    setContentRecords(contentPayload.rows || []);
    setLinks(linksPayload.rows || []);
    setMessages(messagesPayload.rows || []);
    setDeliveryEvents(deliveriesPayload.rows || []);
    setTemplates(templatesPayload.rows || []);
    setAuditEvents(auditPayload.rows || []);
    setNotices(noticesPayload.rows || []);
    setDeclarations(declarationsPayload.rows || []);
    setReceipts(receiptsPayload.rows || []);
    setRefunds(refundsPayload.rows || []);
    setApprovals(approvalsPayload.rows || []);
    setWorkMatters(workPayload.rows || []);
    setRecoveryMatters(recoveryPayload.rows || []);
  }

  useEffect(() => {
    void load().catch((loadError) => setError(loadError.message));
  }, []);

  const linkTargets = useMemo(() => {
    if (linkForm.target_type === "SUBJECT") return subjects.map((subject) => ({ value: subject.subject_uid, label: `${subject.subject_no} - ${subject.display_name_txt}`, subject_uid: subject.subject_uid }));
    if (linkForm.target_type === "LIABILITY_NOTICE") return notices.map((notice) => ({ value: notice.liability_notice_uid, label: `${notice.liability_notice_no} - ${notice.display_name_txt}`, subject_uid: notice.subject_uid }));
    if (linkForm.target_type === "RECEIPT") return receipts.map((receipt) => ({ value: receipt.receipt_event_uid, label: `${receipt.receipt_no} - ${receipt.display_name_txt || receipt.payer_name_txt || "Receipt"}`, subject_uid: receipt.subject_uid }));
    if (linkForm.target_type === "REFUND") return refunds.map((refund) => ({ value: refund.refund_request_uid, label: `${refund.refund_request_no} - ${refund.display_name_txt || "Refund"}`, subject_uid: refund.subject_uid }));
    if (linkForm.target_type === "DECLARATION") return declarations.map((declaration) => ({ value: declaration.declaration_uid, label: `${declaration.declaration_no} - ${declaration.display_name_txt}`, subject_uid: declaration.subject_uid }));
    if (linkForm.target_type === "WORK_MATTER") return workMatters.map((matter) => ({ value: matter.work_matter_uid, label: `${matter.work_matter_no} - ${matter.matter_title_txt || compactCode(matter.work_type_cd)}`, subject_uid: matter.subject_uid }));
    if (linkForm.target_type === "APPROVAL") return approvals.map((approval) => ({ value: approval.approval_request_uid, label: `${approval.approval_request_no} - ${approval.request_title_txt || compactCode(approval.requested_action_cd)}`, subject_uid: approval.subject_uid }));
    return recoveryMatters.map((matter) => ({ value: matter.recovery_matter_uid, label: `${matter.recovery_matter_no} - ${matter.display_name_txt}`, subject_uid: matter.subject_uid }));
  }, [approvals, declarations, linkForm.target_type, notices, receipts, recoveryMatters, refunds, subjects, workMatters]);

  const generationTargets = useMemo(() => {
    if (generateForm.document_type_cd === "LIABILITY_NOTICE") return notices.map((notice) => ({ value: notice.liability_notice_uid, label: `${notice.liability_notice_no} - ${notice.display_name_txt}` }));
    if (generateForm.document_type_cd === "RECEIPT") return receipts.map((receipt) => ({ value: receipt.receipt_event_uid, label: `${receipt.receipt_no} - ${receipt.payer_name_txt || receipt.display_name_txt || "Receipt"}` }));
    if (generateForm.document_type_cd === "REFUND_DECISION") return refunds.map((refund) => ({ value: refund.refund_request_uid, label: `${refund.refund_request_no} - ${compactCode(refund.refund_state_cd)}` }));
    if (generateForm.document_type_cd === "DEMAND_NOTICE") return recoveryMatters.map((matter) => ({ value: matter.recovery_matter_uid, label: `${matter.recovery_matter_no} - ${matter.display_name_txt}` }));
    if (generateForm.document_type_cd === "APPROVAL_DECISION") return approvals.map((approval) => ({ value: approval.approval_request_uid, label: `${approval.approval_request_no} - ${approval.request_title_txt || compactCode(approval.requested_action_cd)}` }));
    return subjects.map((subject) => ({ value: subject.subject_uid, label: `${subject.subject_no} - ${subject.display_name_txt}` }));
  }, [approvals, generateForm.document_type_cd, notices, receipts, recoveryMatters, refunds, subjects]);

  async function submit(endpoint, body, reset, message, method = "POST") {
    setError("");
    setSuccess("");
    try {
      await apiRequest(endpoint, { method, body });
      reset?.();
      await load();
      setSuccess(message);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function handleFileUpload(file) {
    if (!file) return;
    setError("");
    try {
      const [fileBase64, hash] = await Promise.all([fileToBase64(file), sha256File(file)]);
      setUploadForm((current) => ({
        ...current,
        file_name_txt: file.name,
        mime_type_txt: file.type || "application/octet-stream",
        file_size_no: file.size,
        sha256_hash_txt: hash,
        file_base64_txt: fileBase64,
        document_title_txt: current.document_title_txt || file.name,
      }));
    } catch (fileError) {
      setError(fileError.message || "Unable to prepare the selected file.");
    }
  }

  async function downloadRecord(record) {
    setError("");
    try {
      const payload = await downloadBlob(`/api/documents/content-records/${record.content_record_uid}/download`);
      triggerDownload(payload.blob, payload.fileName);
    } catch (downloadError) {
      setError(downloadError.message);
    }
  }

  const contentColumns = [
    { key: "content_no", label: "Record" },
    { key: "document_title_txt", label: "Title", render: (row) => row.document_title_txt || row.file_name_txt || "-" },
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "document_category_cd", label: "Category", render: (row) => compactCode(row.document_category_cd || row.content_type_cd) },
    { key: "storage_backend_cd", label: "Storage", render: (row) => <StatusPill tone={statusTone(row.document_state_cd || row.storage_state_cd)}>{compactCode(row.storage_backend_cd || row.storage_state_cd)}</StatusPill> },
    { key: "generated_bool", label: "Source", render: (row) => row.generated_bool ? "Generated" : "Uploaded" },
    { key: "download", label: "", render: (row) => <button className="icon-inline-button" type="button" onClick={() => downloadRecord(row)} aria-label="Download document"><Download size={16} /></button> },
  ];

  const linkColumns = [
    { key: "content_no", label: "Document" },
    { key: "business_schema_cd", label: "Domain" },
    { key: "business_table_cd", label: "Record type" },
    { key: "visibility_cd", label: "Visibility", render: (row) => <StatusPill tone={row.visibility_cd === "PORTAL" ? "success" : "neutral"}>{compactCode(row.visibility_cd)}</StatusPill> },
    { key: "link_role_cd", label: "Role", render: (row) => compactCode(row.link_role_cd) },
  ];

  const messageColumns = [
    { key: "message_no", label: "Message" },
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "subject_txt", label: "Subject", render: (row) => row.subject_txt || "-" },
    { key: "delivery_channel_cd", label: "Channel", render: (row) => compactCode(row.delivery_channel_cd) },
    { key: "portal_visible_bool", label: "Portal", render: (row) => row.portal_visible_bool ? "Visible" : "Internal" },
    { key: "message_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.message_state_cd)}>{compactCode(row.message_state_cd)}</StatusPill> },
  ];

  const deliveryColumns = [
    { key: "message_no", label: "Message" },
    { key: "event_type_cd", label: "Event", render: (row) => compactCode(row.event_type_cd) },
    { key: "event_ts", label: "Event time", render: (row) => formatDateTime(row.event_ts) },
    { key: "provider_reference_txt", label: "Provider reference", render: (row) => row.provider_reference_txt || "-" },
  ];

  const templateColumns = [
    { key: "template_code", label: "Code" },
    { key: "template_name_txt", label: "Template" },
    { key: "version_no", label: "Version", render: (row) => formatNumber(row.version_no) },
    { key: "template_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.template_state_cd)}>{compactCode(row.template_state_cd)}</StatusPill> },
    { key: "active_bool", label: "Active", render: (row) => row.active_bool ? "Active" : "Inactive" },
    { key: "effective_from_dt", label: "Effective", render: (row) => formatDate(row.effective_from_dt) },
  ];

  const auditColumns = [
    { key: "event_ts", label: "Time", render: (row) => formatDateTime(row.event_ts) },
    { key: "event_type_cd", label: "Event", render: (row) => compactCode(row.event_type_cd) },
    { key: "business_table_cd", label: "Record", render: (row) => row.business_table_cd || "-" },
    { key: "action_cd", label: "Action", render: (row) => row.action_cd || "-" },
    { key: "actor_name", label: "Officer", render: (row) => row.actor_name || "-" },
  ];

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Documents and messaging"
        title="Official Records, Templates And Delivery"
        status={overview?.storage?.configured ? "Object storage ready" : "Database fallback"}
        tone={overview?.storage?.configured ? "success" : "warning"}
      />

      <div className="metric-grid">
        <MetricTile icon={FolderArchive} label="Document records" value={formatNumber(overview?.content_count)} sublabel={`${formatNumber(overview?.generated_count)} generated`} />
        <MetricTile icon={Link2} label="Record links" value={formatNumber(overview?.content_link_count)} />
        <MetricTile icon={Send} label="Messages" value={formatNumber(overview?.message_count)} sublabel={`${formatNumber(overview?.unread_portal_message_count)} unread portal`} />
        <MetricTile icon={BookTemplate} label="Templates" value={formatNumber(overview?.template_version_count)} sublabel={`${formatNumber(overview?.active_template_count)} active`} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "repository" ? (
        <div className="document-repository-grid">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Repository intake</span>
                <h2>Upload Or Register Record</h2>
              </div>
              <Upload size={21} />
            </div>
            <form className="document-two-column-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/documents/content-records",
                { ...uploadForm, subject_uid: uploadForm.subject_uid || null, file_size_no: uploadForm.file_size_no || null },
                () => setUploadForm(initialUpload),
                "Document record registered."
              );
            }}>
              <Field label="File">
                <input type="file" onChange={(event) => handleFileUpload(event.target.files?.[0])} />
              </Field>
              <SelectField label="Taxpayer" value={uploadForm.subject_uid} onChange={(value) => setUploadForm({ ...uploadForm, subject_uid: value })}>
                <option value="">No taxpayer context</option>
                {subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.subject_no} - {subject.display_name_txt}</option>)}
              </SelectField>
              <Field label="Content type">
                <input value={uploadForm.content_type_cd} onChange={(event) => setUploadForm({ ...uploadForm, content_type_cd: event.target.value.toUpperCase(), document_category_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Title">
                <input required value={uploadForm.document_title_txt} onChange={(event) => setUploadForm({ ...uploadForm, document_title_txt: event.target.value })} />
              </Field>
              <SelectField label="Confidentiality" value={uploadForm.confidentiality_cd} onChange={(value) => setUploadForm({ ...uploadForm, confidentiality_cd: value })}>
                <option value="OFFICIAL">Official</option>
                <option value="OFFICIAL_SENSITIVE">Official sensitive</option>
                <option value="CONFIDENTIAL">Confidential</option>
              </SelectField>
              <Field label="SHA-256">
                <input value={uploadForm.sha256_hash_txt} onChange={(event) => setUploadForm({ ...uploadForm, sha256_hash_txt: event.target.value })} />
              </Field>
              <Field label="Summary">
                <textarea value={uploadForm.document_summary_txt} onChange={(event) => setUploadForm({ ...uploadForm, document_summary_txt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit">Register document</button>
            </form>
            <hr />
            <form className="document-two-column-form" onSubmit={(event) => {
              event.preventDefault();
              const target = targetConfig[linkForm.target_type];
              const selectedTarget = linkTargets.find((item) => item.value === linkForm.business_record_uid);
              void submit(
                "/api/documents/content-links",
                {
                  content_record_uid: linkForm.content_record_uid,
                  subject_uid: linkForm.subject_uid || selectedTarget?.subject_uid || null,
                  business_schema_cd: target.schema,
                  business_table_cd: target.table,
                  business_record_uid: linkForm.business_record_uid,
                  link_role_cd: linkForm.link_role_cd,
                  visibility_cd: linkForm.visibility_cd,
                },
                () => setLinkForm(initialLink),
                "Document linked to business record."
              );
            }}>
              <SelectField label="Document" value={linkForm.content_record_uid} onChange={(value) => setLinkForm({ ...linkForm, content_record_uid: value })}>
                <option value="">Select document</option>
                {contentRecords.map((record) => <option key={record.content_record_uid} value={record.content_record_uid}>{record.content_no} - {record.document_title_txt || record.file_name_txt}</option>)}
              </SelectField>
              <SelectField label="Record type" value={linkForm.target_type} onChange={(value) => setLinkForm({ ...linkForm, target_type: value, business_record_uid: "" })}>
                {Object.entries(targetConfig).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}
              </SelectField>
              <SelectField label="Business record" value={linkForm.business_record_uid} onChange={(value) => setLinkForm({ ...linkForm, business_record_uid: value })}>
                <option value="">Select record</option>
                {linkTargets.map((target) => <option key={target.value} value={target.value}>{target.label}</option>)}
              </SelectField>
              <SelectField label="Visibility" value={linkForm.visibility_cd} onChange={(value) => setLinkForm({ ...linkForm, visibility_cd: value })}>
                <option value="INTERNAL">Internal</option>
                <option value="PORTAL">Taxpayer portal</option>
              </SelectField>
              <Field label="Link role">
                <input value={linkForm.link_role_cd} onChange={(event) => setLinkForm({ ...linkForm, link_role_cd: event.target.value.toUpperCase() })} />
              </Field>
              <button className="secondary-button" type="submit">Link document</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={contentColumns} rows={contentRecords} keyField="content_record_uid" empty="No document records" />
            <br />
            <DataTable columns={linkColumns} rows={links} keyField="content_link_uid" empty="No document links" />
          </section>
        </div>
      ) : null}

      {activeTab === "generation" ? (
        <div className="document-generation-grid">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Official document generation</span>
                <h2>Create Ministry PDF Record</h2>
              </div>
              <FileCheck2 size={21} />
            </div>
            <form className="document-two-column-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/documents/generate", generateForm, () => setGenerateForm(initialGenerate), "Official document generated.");
            }}>
              <SelectField label="Document type" value={generateForm.document_type_cd} onChange={(value) => setGenerateForm({ ...generateForm, document_type_cd: value, source_record_uid: "" })}>
                {documentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </SelectField>
              <SelectField label="Source record" value={generateForm.source_record_uid} onChange={(value) => setGenerateForm({ ...generateForm, source_record_uid: value })}>
                <option value="">Select source record</option>
                {generationTargets.map((target) => <option key={target.value} value={target.value}>{target.label}</option>)}
              </SelectField>
              <Field label="Document title">
                <input value={generateForm.document_title_txt} onChange={(event) => setGenerateForm({ ...generateForm, document_title_txt: event.target.value })} />
              </Field>
              <SelectField label="Confidentiality" value={generateForm.confidentiality_cd} onChange={(value) => setGenerateForm({ ...generateForm, confidentiality_cd: value })}>
                <option value="OFFICIAL">Official</option>
                <option value="OFFICIAL_SENSITIVE">Official sensitive</option>
                <option value="CONFIDENTIAL">Confidential</option>
              </SelectField>
              <Field label="Generation reason">
                <textarea value={generateForm.reason_txt} onChange={(event) => setGenerateForm({ ...generateForm, reason_txt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit">Generate official PDF</button>
            </form>
          </section>
          <section className="content-band">
            <div className="document-generation-panel">
              <FileText size={28} />
              <strong>Generated records are immutable evidence.</strong>
              <span>Each generated PDF receives a document number, issue date, source link, checksum, storage location, and audit event. Portal-visible links and messages can then publish the record to taxpayers or agents.</span>
            </div>
            <DataTable columns={contentColumns} rows={contentRecords.filter((record) => record.generated_bool)} keyField="content_record_uid" empty="No generated official documents" />
          </section>
        </div>
      ) : null}

      {activeTab === "messages" ? (
        <div className="document-message-grid">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Correspondence</span>
                <h2>Create Message Envelope</h2>
              </div>
              <Send size={21} />
            </div>
            <form className="document-two-column-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/documents/messages",
                { ...messageForm, subject_uid: messageForm.subject_uid || null, content_record_uid: messageForm.content_record_uid || null, template_version_uid: messageForm.template_version_uid || null },
                () => setMessageForm(initialMessage),
                "Message envelope created."
              );
            }}>
              <SelectField label="Taxpayer" value={messageForm.subject_uid} onChange={(value) => setMessageForm({ ...messageForm, subject_uid: value })}>
                <option value="">No taxpayer context</option>
                {subjects.map((subject) => <option key={subject.subject_uid} value={subject.subject_uid}>{subject.subject_no} - {subject.display_name_txt}</option>)}
              </SelectField>
              <SelectField label="Document attachment" value={messageForm.content_record_uid} onChange={(value) => setMessageForm({ ...messageForm, content_record_uid: value })}>
                <option value="">No attachment</option>
                {contentRecords.map((record) => <option key={record.content_record_uid} value={record.content_record_uid}>{record.content_no} - {record.document_title_txt || record.file_name_txt}</option>)}
              </SelectField>
              <SelectField label="Template version" value={messageForm.template_version_uid} onChange={(value) => setMessageForm({ ...messageForm, template_version_uid: value })}>
                <option value="">No template</option>
                {templates.map((template) => <option key={template.template_version_uid} value={template.template_version_uid}>{template.template_code} v{template.version_no} - {template.template_name_txt}</option>)}
              </SelectField>
              <SelectField label="State" value={messageForm.message_state_cd} onChange={(value) => setMessageForm({ ...messageForm, message_state_cd: value })}>
                <option value="DRAFT">Draft</option>
                <option value="QUEUED">Queued</option>
                <option value="SENT">Sent</option>
              </SelectField>
              <Field label="Channel">
                <input value={messageForm.delivery_channel_cd} onChange={(event) => setMessageForm({ ...messageForm, delivery_channel_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Priority">
                <input value={messageForm.priority_cd} onChange={(event) => setMessageForm({ ...messageForm, priority_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Subject">
                <input required value={messageForm.subject_txt} onChange={(event) => setMessageForm({ ...messageForm, subject_txt: event.target.value })} />
              </Field>
              <Field label="Recipient">
                <input value={messageForm.recipient_txt} onChange={(event) => setMessageForm({ ...messageForm, recipient_txt: event.target.value })} />
              </Field>
              <label className="check-control">
                <input type="checkbox" checked={messageForm.portal_visible_bool} onChange={(event) => setMessageForm({ ...messageForm, portal_visible_bool: event.target.checked })} />
                <span>Show in taxpayer/agent portal inbox</span>
              </label>
              <Field label="Message body">
                <textarea value={messageForm.message_body_txt} onChange={(event) => setMessageForm({ ...messageForm, message_body_txt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit">Create message</button>
            </form>
            <hr />
            <form className="document-two-column-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/documents/delivery-events", deliveryForm, () => setDeliveryForm(initialDelivery), "Delivery event recorded.");
            }}>
              <SelectField label="Message" value={deliveryForm.message_envelope_uid} onChange={(value) => setDeliveryForm({ ...deliveryForm, message_envelope_uid: value })}>
                <option value="">Select message</option>
                {messages.map((message) => <option key={message.message_envelope_uid} value={message.message_envelope_uid}>{message.message_no} - {message.subject_txt || compactCode(message.delivery_channel_cd)}</option>)}
              </SelectField>
              <Field label="Event type">
                <input value={deliveryForm.event_type_cd} onChange={(event) => setDeliveryForm({ ...deliveryForm, event_type_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Provider reference">
                <input value={deliveryForm.provider_reference_txt} onChange={(event) => setDeliveryForm({ ...deliveryForm, provider_reference_txt: event.target.value })} />
              </Field>
              <button className="secondary-button" type="submit">Record event</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={messageColumns} rows={messages} keyField="message_envelope_uid" empty="No messages" />
            <br />
            <DataTable columns={deliveryColumns} rows={deliveryEvents} keyField="delivery_event_uid" empty="No delivery events" />
          </section>
        </div>
      ) : null}

      {activeTab === "templates" ? (
        <div className="document-template-grid">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Template versioning</span>
                <h2>Create Controlled Template</h2>
              </div>
              <BookTemplate size={21} />
            </div>
            <form className="document-two-column-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/documents/templates", templateForm, () => setTemplateForm(initialTemplate), "Template version created.");
            }}>
              <Field label="Template code">
                <input value={templateForm.template_code} onChange={(event) => setTemplateForm({ ...templateForm, template_code: event.target.value.toUpperCase() })} />
              </Field>
              <SelectField label="Template type" value={templateForm.template_type_cd} onChange={(value) => setTemplateForm({ ...templateForm, template_type_cd: value })}>
                {documentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                <option value="GENERAL">General</option>
              </SelectField>
              <Field label="Template name">
                <input required value={templateForm.template_name_txt} onChange={(event) => setTemplateForm({ ...templateForm, template_name_txt: event.target.value })} />
              </Field>
              <Field label="Effective from">
                <input type="date" defaultValue={today()} />
              </Field>
              <label className="check-control">
                <input type="checkbox" checked={templateForm.active_bool} onChange={(event) => setTemplateForm({ ...templateForm, active_bool: event.target.checked })} />
                <span>Activate this version immediately</span>
              </label>
              <label className="check-control">
                <input type="checkbox" checked={templateForm.locked_bool} onChange={(event) => setTemplateForm({ ...templateForm, locked_bool: event.target.checked })} />
                <span>Lock version after creation</span>
              </label>
              <Field label="Template body">
                <textarea required value={templateForm.template_body_txt} onChange={(event) => setTemplateForm({ ...templateForm, template_body_txt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit">Create template version</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={templateColumns} rows={templates} keyField="template_version_uid" empty="No template versions" />
          </section>
        </div>
      ) : null}

      {activeTab === "audit" ? (
        <section className="content-band">
          <div className="section-heading">
            <div>
              <span>Document compliance</span>
              <h2>Audit Trail</h2>
            </div>
            <History size={21} />
          </div>
          <DataTable columns={auditColumns} rows={auditEvents} keyField="audit_event_uid" empty="No document audit events" />
        </section>
      ) : null}
    </section>
  );
}
