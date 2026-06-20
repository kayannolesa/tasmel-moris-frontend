import { FileText, FolderArchive, Link2, Send } from "lucide-react";
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
import { compactCode, formatDate, formatDateTime, formatNumber } from "../utils/format.js";

const tabs = [
  { id: "records", label: "Document Records" },
  { id: "messages", label: "Messaging" },
  { id: "templates", label: "Templates" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function statusTone(value) {
  const status = String(value || "");
  if (["STORED", "SENT", "DELIVERED", "APPROVED"].includes(status)) return "success";
  if (["DRAFT", "PENDING", "OPEN"].includes(status)) return "warning";
  if (["FAILED", "REJECTED"].includes(status)) return "danger";
  return "neutral";
}

async function safeRequest(path, fallback) {
  try {
    return await apiRequest(path);
  } catch {
    return fallback;
  }
}

const initialContent = {
  content_type_cd: "NOTICE",
  file_name_txt: "",
  mime_type_txt: "application/pdf",
  file_size_no: "",
  sha256_hash_txt: "",
  object_uri_txt: "",
};
const initialLink = { content_record_uid: "", target_type: "LIABILITY_NOTICE", business_record_uid: "", link_role_cd: "SUPPORTING_DOCUMENT" };
const initialMessage = {
  subject_uid: "",
  content_record_uid: "",
  delivery_channel_cd: "EMAIL",
  message_state_cd: "DRAFT",
  subject_txt: "",
  recipient_txt: "",
  provider_reference_txt: "",
};
const initialDelivery = { message_envelope_uid: "", event_type_cd: "DELIVERED", provider_reference_txt: "" };
const initialTemplate = {
  template_name_txt: "",
  template_body_txt: "",
  version_no: 1,
  effective_from_dt: today(),
};

const targetConfig = {
  LIABILITY_NOTICE: { label: "Liability notice", schema: "asm", table: "asm_liability_notice" },
  DECLARATION: { label: "Declaration", schema: "fil", table: "fil_declaration_record" },
  WORK_MATTER: { label: "Work matter", schema: "ops", table: "ops_work_matter" },
  RECOVERY_MATTER: { label: "Recovery matter", schema: "col", table: "col_recovery_matter" },
};

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState("records");
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [contentRecords, setContentRecords] = useState([]);
  const [links, setLinks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [deliveryEvents, setDeliveryEvents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [notices, setNotices] = useState([]);
  const [declarations, setDeclarations] = useState([]);
  const [workMatters, setWorkMatters] = useState([]);
  const [recoveryMatters, setRecoveryMatters] = useState([]);
  const [contentForm, setContentForm] = useState(initialContent);
  const [linkForm, setLinkForm] = useState(initialLink);
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
      noticesPayload,
      declarationsPayload,
      workPayload,
      recoveryPayload,
    ] = await Promise.all([
      apiRequest("/api/documents/overview"),
      apiRequest("/api/registry/subjects?pageSize=100"),
      apiRequest("/api/documents/content-records?pageSize=80"),
      apiRequest("/api/documents/content-links?pageSize=80"),
      apiRequest("/api/documents/messages?pageSize=80"),
      apiRequest("/api/documents/delivery-events?pageSize=80"),
      apiRequest("/api/documents/templates?pageSize=80"),
      safeRequest("/api/assessment/liability-notices?pageSize=80", { rows: [] }),
      safeRequest("/api/filing/declarations?pageSize=80", { rows: [] }),
      safeRequest("/api/workflow/matters?pageSize=80", { rows: [] }),
      safeRequest("/api/collections/recovery-matters?pageSize=80", { rows: [] }),
    ]);

    setOverview(overviewPayload.overview);
    setSubjects(subjectsPayload.rows || []);
    setContentRecords(contentPayload.rows || []);
    setLinks(linksPayload.rows || []);
    setMessages(messagesPayload.rows || []);
    setDeliveryEvents(deliveriesPayload.rows || []);
    setTemplates(templatesPayload.rows || []);
    setNotices(noticesPayload.rows || []);
    setDeclarations(declarationsPayload.rows || []);
    setWorkMatters(workPayload.rows || []);
    setRecoveryMatters(recoveryPayload.rows || []);
  }

  useEffect(() => {
    void load().catch((loadError) => setError(loadError.message));
  }, []);

  const linkTargets = useMemo(() => {
    if (linkForm.target_type === "LIABILITY_NOTICE") {
      return notices.map((notice) => ({ value: notice.liability_notice_uid, label: `${notice.liability_notice_no} - ${notice.display_name_txt}` }));
    }
    if (linkForm.target_type === "DECLARATION") {
      return declarations.map((declaration) => ({ value: declaration.declaration_uid, label: `${declaration.declaration_no} - ${declaration.display_name_txt}` }));
    }
    if (linkForm.target_type === "WORK_MATTER") {
      return workMatters.map((matter) => ({ value: matter.work_matter_uid, label: matter.work_matter_no }));
    }
    return recoveryMatters.map((matter) => ({ value: matter.recovery_matter_uid, label: `${matter.recovery_matter_no} - ${matter.display_name_txt}` }));
  }, [declarations, linkForm.target_type, notices, recoveryMatters, workMatters]);

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

  const contentColumns = [
    { key: "content_no", label: "Record" },
    { key: "content_type_cd", label: "Type", render: (row) => compactCode(row.content_type_cd) },
    { key: "file_name_txt", label: "File name", render: (row) => row.file_name_txt || "-" },
    { key: "mime_type_txt", label: "MIME", render: (row) => row.mime_type_txt || "-" },
    { key: "storage_state_cd", label: "Storage", render: (row) => <StatusPill tone={statusTone(row.storage_state_cd)}>{compactCode(row.storage_state_cd)}</StatusPill> },
  ];

  const linkColumns = [
    { key: "content_no", label: "Document" },
    { key: "business_schema_cd", label: "Domain" },
    { key: "business_table_cd", label: "Record type" },
    { key: "link_role_cd", label: "Role", render: (row) => compactCode(row.link_role_cd) },
  ];

  const messageColumns = [
    { key: "message_no", label: "Message" },
    { key: "display_name_txt", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "delivery_channel_cd", label: "Channel", render: (row) => compactCode(row.delivery_channel_cd) },
    { key: "recipient_txt", label: "Recipient", render: (row) => row.recipient_txt || "-" },
    { key: "message_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.message_state_cd)}>{compactCode(row.message_state_cd)}</StatusPill> },
  ];

  const deliveryColumns = [
    { key: "message_no", label: "Message" },
    { key: "event_type_cd", label: "Event", render: (row) => compactCode(row.event_type_cd) },
    { key: "event_ts", label: "Event time", render: (row) => formatDateTime(row.event_ts) },
    { key: "provider_reference_txt", label: "Provider reference", render: (row) => row.provider_reference_txt || "-" },
  ];

  const templateColumns = [
    { key: "template_name_txt", label: "Template" },
    { key: "version_no", label: "Version", render: (row) => formatNumber(row.version_no) },
    { key: "effective_from_dt", label: "Effective", render: (row) => formatDate(row.effective_from_dt) },
    { key: "approved_by_name", label: "Approved by", render: (row) => row.approved_by_name || "-" },
  ];

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Documents and messaging" title="Records, Delivery And Template Control" status={overview?.storage?.configured ? "Object storage ready" : "Metadata ready"} tone={overview?.storage?.configured ? "success" : "warning"} />

      <div className="metric-grid">
        <MetricTile icon={FolderArchive} label="Document records" value={formatNumber(overview?.content_count)} />
        <MetricTile icon={Link2} label="Record links" value={formatNumber(overview?.content_link_count)} />
        <MetricTile icon={Send} label="Messages" value={formatNumber(overview?.message_count)} />
        <MetricTile icon={FileText} label="Templates" value={formatNumber(overview?.template_version_count)} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "records" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Document metadata</span>
                <h2>Register Document Record</h2>
              </div>
              <StatusPill tone={overview?.storage?.configured ? "success" : "warning"}>
                {overview?.storage?.configured ? "Storage configured" : "Metadata only"}
              </StatusPill>
            </div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/documents/content-records",
                {
                  ...contentForm,
                  object_uri_txt: contentForm.object_uri_txt || null,
                  file_name_txt: contentForm.file_name_txt || null,
                  mime_type_txt: contentForm.mime_type_txt || null,
                  file_size_no: contentForm.file_size_no || null,
                  sha256_hash_txt: contentForm.sha256_hash_txt || null,
                },
                () => setContentForm(initialContent),
                "Document record registered"
              );
            }}>
              <div className="compact-form">
                <Field label="Content type">
                  <input value={contentForm.content_type_cd} onChange={(event) => setContentForm({ ...contentForm, content_type_cd: event.target.value.toUpperCase() })} />
                </Field>
                <Field label="File name">
                  <input value={contentForm.file_name_txt} onChange={(event) => setContentForm({ ...contentForm, file_name_txt: event.target.value })} />
                </Field>
              </div>
              <div className="compact-form">
                <Field label="MIME type">
                  <input value={contentForm.mime_type_txt} onChange={(event) => setContentForm({ ...contentForm, mime_type_txt: event.target.value })} />
                </Field>
                <Field label="File size bytes">
                  <input type="number" value={contentForm.file_size_no} onChange={(event) => setContentForm({ ...contentForm, file_size_no: event.target.value })} />
                </Field>
              </div>
              <Field label="Object URI">
                <input value={contentForm.object_uri_txt} onChange={(event) => setContentForm({ ...contentForm, object_uri_txt: event.target.value })} />
              </Field>
              <Field label="SHA-256 hash">
                <input value={contentForm.sha256_hash_txt} onChange={(event) => setContentForm({ ...contentForm, sha256_hash_txt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit">Register record</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              const target = targetConfig[linkForm.target_type];
              void submit(
                "/api/documents/content-links",
                {
                  content_record_uid: linkForm.content_record_uid,
                  business_schema_cd: target.schema,
                  business_table_cd: target.table,
                  business_record_uid: linkForm.business_record_uid,
                  link_role_cd: linkForm.link_role_cd,
                },
                () => setLinkForm(initialLink),
                "Document linked to business record"
              );
            }}>
              <SelectField label="Document" value={linkForm.content_record_uid} onChange={(value) => setLinkForm({ ...linkForm, content_record_uid: value })}>
                <option value="">Select document</option>
                {contentRecords.map((record) => (
                  <option key={record.content_record_uid} value={record.content_record_uid}>
                    {record.content_no} - {record.file_name_txt || compactCode(record.content_type_cd)}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Record type" value={linkForm.target_type} onChange={(value) => setLinkForm({ ...linkForm, target_type: value, business_record_uid: "" })}>
                {Object.entries(targetConfig).map(([value, config]) => (
                  <option key={value} value={value}>
                    {config.label}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Business record" value={linkForm.business_record_uid} onChange={(value) => setLinkForm({ ...linkForm, business_record_uid: value })}>
                <option value="">Select record</option>
                {linkTargets.map((target) => (
                  <option key={target.value} value={target.value}>
                    {target.label}
                  </option>
                ))}
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

      {activeTab === "messages" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Outbound correspondence</span>
                <h2>Create Message Envelope</h2>
              </div>
            </div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/documents/messages",
                {
                  ...messageForm,
                  subject_uid: messageForm.subject_uid || null,
                  content_record_uid: messageForm.content_record_uid || null,
                  recipient_txt: messageForm.recipient_txt || null,
                  subject_txt: messageForm.subject_txt || null,
                  provider_reference_txt: messageForm.provider_reference_txt || null,
                },
                () => setMessageForm(initialMessage),
                "Message envelope created"
              );
            }}>
              <SelectField label="Taxpayer" value={messageForm.subject_uid} onChange={(value) => setMessageForm({ ...messageForm, subject_uid: value })}>
                <option value="">No taxpayer context</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_uid} value={subject.subject_uid}>
                    {subject.display_name_txt}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Document" value={messageForm.content_record_uid} onChange={(value) => setMessageForm({ ...messageForm, content_record_uid: value })}>
                <option value="">No attached record</option>
                {contentRecords.map((record) => (
                  <option key={record.content_record_uid} value={record.content_record_uid}>
                    {record.content_no} - {record.file_name_txt || compactCode(record.content_type_cd)}
                  </option>
                ))}
              </SelectField>
              <div className="compact-form">
                <Field label="Channel">
                  <input value={messageForm.delivery_channel_cd} onChange={(event) => setMessageForm({ ...messageForm, delivery_channel_cd: event.target.value.toUpperCase() })} />
                </Field>
                <SelectField label="State" value={messageForm.message_state_cd} onChange={(value) => setMessageForm({ ...messageForm, message_state_cd: value })}>
                  <option value="DRAFT">Draft</option>
                  <option value="SENT">Sent</option>
                </SelectField>
              </div>
              <Field label="Message subject">
                <input value={messageForm.subject_txt} onChange={(event) => setMessageForm({ ...messageForm, subject_txt: event.target.value })} />
              </Field>
              <Field label="Recipient">
                <input value={messageForm.recipient_txt} onChange={(event) => setMessageForm({ ...messageForm, recipient_txt: event.target.value })} />
              </Field>
              <Field label="Provider reference">
                <input value={messageForm.provider_reference_txt} onChange={(event) => setMessageForm({ ...messageForm, provider_reference_txt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit">Create message</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/documents/delivery-events",
                {
                  message_envelope_uid: deliveryForm.message_envelope_uid,
                  event_type_cd: deliveryForm.event_type_cd,
                  provider_reference_txt: deliveryForm.provider_reference_txt || null,
                  event_payload_jsn: {},
                },
                () => setDeliveryForm(initialDelivery),
                "Delivery event recorded"
              );
            }}>
              <SelectField label="Message" value={deliveryForm.message_envelope_uid} onChange={(value) => setDeliveryForm({ ...deliveryForm, message_envelope_uid: value })}>
                <option value="">Select message</option>
                {messages.map((message) => (
                  <option key={message.message_envelope_uid} value={message.message_envelope_uid}>
                    {message.message_no} - {message.subject_txt || compactCode(message.delivery_channel_cd)}
                  </option>
                ))}
              </SelectField>
              <Field label="Event type">
                <input value={deliveryForm.event_type_cd} onChange={(event) => setDeliveryForm({ ...deliveryForm, event_type_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Provider reference">
                <input value={deliveryForm.provider_reference_txt} onChange={(event) => setDeliveryForm({ ...deliveryForm, provider_reference_txt: event.target.value })} />
              </Field>
              <button className="secondary-button" type="submit">Record delivery event</button>
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
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Controlled text</span>
                <h2>Create Template Version</h2>
              </div>
            </div>
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit(
                "/api/documents/templates",
                {
                  ...templateForm,
                  version_no: Number(templateForm.version_no),
                },
                () => setTemplateForm(initialTemplate),
                "Template version created"
              );
            }}>
              <Field label="Template name">
                <input required value={templateForm.template_name_txt} onChange={(event) => setTemplateForm({ ...templateForm, template_name_txt: event.target.value })} />
              </Field>
              <div className="compact-form">
                <Field label="Version">
                  <input type="number" min="1" value={templateForm.version_no} onChange={(event) => setTemplateForm({ ...templateForm, version_no: event.target.value })} />
                </Field>
                <Field label="Effective from">
                  <input type="date" value={templateForm.effective_from_dt} onChange={(event) => setTemplateForm({ ...templateForm, effective_from_dt: event.target.value })} />
                </Field>
              </div>
              <Field label="Template body">
                <textarea required value={templateForm.template_body_txt} onChange={(event) => setTemplateForm({ ...templateForm, template_body_txt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit">Create template</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={templateColumns} rows={templates} keyField="template_version_uid" empty="No template versions" />
          </section>
        </div>
      ) : null}
    </section>
  );
}
