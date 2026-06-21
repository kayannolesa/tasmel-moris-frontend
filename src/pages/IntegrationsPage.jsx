import { AlertTriangle, Database, Plug, Server } from "lucide-react";
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
import AdvancedLifecycleGovernancePanel from "../components/governance/AdvancedLifecycleGovernancePanel.jsx";
import StatusPill from "../components/common/StatusPill.jsx";
import { apiRequest } from "../services/api.js";
import { compactCode, formatDate, formatDateTime, formatNumber } from "../utils/format.js";

const tabs = [
  { id: "partners", label: "Partners" },
  { id: "messages", label: "Messages" },
    { id: "governance", label: "Lifecycle Governance" },
  { id: "exceptions", label: "Exceptions" },
];

function futureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function statusTone(value) {
  const status = String(value || "");
  if (["ACTIVE", "SENT", "RECEIVED", "PROCESSED", "RESOLVED", "ENCRYPTED"].includes(status)) return "success";
  if (["OPEN", "PENDING", "QUEUED"].includes(status)) return "warning";
  if (["FAILED", "SUSPENDED", "ERROR"].includes(status)) return "danger";
  return "neutral";
}

const initialPartner = { partner_name: "", partner_type_cd: "GOVERNMENT", endpoint_txt: "", contact_txt: "", system_state_cd: "ACTIVE" };
const initialContract = { partner_system_uid: "", exchange_direction_cd: "BIDIRECTIONAL", message_type_cd: "TAXPAYER_LOOKUP", transport_cd: "REST", schema_version_txt: "v1", contract_state_cd: "ACTIVE" };
const initialPayload = { storage_uri_txt: "", sha256_hash_txt: "", payload_size_no: "", encryption_state_cd: "ENCRYPTED", retention_until_dt: futureDate(365) };
const initialMessage = { exchange_contract_uid: "", partner_system_uid: "", direction_cd: "OUTBOUND", message_state_cd: "SENT", correlation_reference_txt: "", payload_store_uid: "" };
const initialException = { message_event_uid: "", exception_type_cd: "VALIDATION", exception_txt: "", exception_state_cd: "OPEN" };

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState("partners");
  const [overview, setOverview] = useState(null);
  const [partners, setPartners] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [payloads, setPayloads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [partnerForm, setPartnerForm] = useState(initialPartner);
  const [contractForm, setContractForm] = useState(initialContract);
  const [payloadForm, setPayloadForm] = useState(initialPayload);
  const [messageForm, setMessageForm] = useState(initialMessage);
  const [exceptionForm, setExceptionForm] = useState(initialException);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const [overviewPayload, partnerPayload, contractPayload, payloadPayload, messagePayload, exceptionPayload] = await Promise.all([
      apiRequest("/api/integrations/overview"),
      apiRequest("/api/integrations/partners?pageSize=80"),
      apiRequest("/api/integrations/contracts?pageSize=80"),
      apiRequest("/api/integrations/payloads?pageSize=80"),
      apiRequest("/api/integrations/messages?pageSize=80"),
      apiRequest("/api/integrations/exceptions?pageSize=80"),
    ]);
    setOverview(overviewPayload.overview);
    setPartners(partnerPayload.rows || []);
    setContracts(contractPayload.rows || []);
    setPayloads(payloadPayload.rows || []);
    setMessages(messagePayload.rows || []);
    setExceptions(exceptionPayload.rows || []);
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

  function syncContract(contractUid) {
    const contract = contracts.find((item) => item.exchange_contract_uid === contractUid);
    setMessageForm({
      ...messageForm,
      exchange_contract_uid: contractUid,
      partner_system_uid: contract?.partner_system_uid || messageForm.partner_system_uid,
      direction_cd: contract?.exchange_direction_cd === "INBOUND" ? "INBOUND" : "OUTBOUND",
    });
  }

  const partnerColumns = [
    { key: "partner_code", label: "Code" },
    { key: "partner_name", label: "Partner" },
    { key: "partner_type_cd", label: "Type", render: (row) => compactCode(row.partner_type_cd) },
    { key: "contract_count", label: "Contracts", render: (row) => formatNumber(row.contract_count) },
    { key: "system_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.system_state_cd)}>{compactCode(row.system_state_cd)}</StatusPill> },
  ];
  const contractColumns = [
    { key: "contract_code", label: "Contract" },
    { key: "partner_name", label: "Partner" },
    { key: "exchange_direction_cd", label: "Direction", render: (row) => compactCode(row.exchange_direction_cd) },
    { key: "message_type_cd", label: "Message type", render: (row) => compactCode(row.message_type_cd) },
    { key: "contract_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.contract_state_cd)}>{compactCode(row.contract_state_cd)}</StatusPill> },
  ];
  const payloadColumns = [
    { key: "payload_no", label: "Payload" },
    { key: "payload_size_no", label: "Size", render: (row) => formatNumber(row.payload_size_no) },
    { key: "retention_until_dt", label: "Retention", render: (row) => formatDate(row.retention_until_dt) },
    { key: "encryption_state_cd", label: "Encryption", render: (row) => <StatusPill tone={statusTone(row.encryption_state_cd)}>{compactCode(row.encryption_state_cd)}</StatusPill> },
  ];
  const messageColumns = [
    { key: "message_reference_no", label: "Message" },
    { key: "partner_name", label: "Partner", render: (row) => row.partner_name || "-" },
    { key: "direction_cd", label: "Direction", render: (row) => compactCode(row.direction_cd) },
    { key: "message_type_cd", label: "Type", render: (row) => compactCode(row.message_type_cd) },
    { key: "message_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.message_state_cd)}>{compactCode(row.message_state_cd)}</StatusPill> },
  ];
  const exceptionColumns = [
    { key: "exception_type_cd", label: "Type", render: (row) => compactCode(row.exception_type_cd) },
    { key: "message_reference_no", label: "Message", render: (row) => row.message_reference_no || "-" },
    { key: "partner_name", label: "Partner", render: (row) => row.partner_name || "-" },
    { key: "raised_ts", label: "Raised", render: (row) => formatDateTime(row.raised_ts) },
    { key: "exception_state_cd", label: "State", render: (row) => <StatusPill tone={statusTone(row.exception_state_cd)}>{compactCode(row.exception_state_cd)}</StatusPill> },
  ];

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Integration module" title="Partner Exchanges, Payloads And Exceptions" status="Monitored" tone="success" />

      <div className="metric-grid">
        <MetricTile icon={Plug} label="Partners" value={formatNumber(overview?.partner_system_count)} />
        <MetricTile icon={Server} label="Contracts" value={formatNumber(overview?.exchange_contract_count)} />
        <MetricTile icon={Database} label="Messages" value={formatNumber(overview?.message_count)} />
        <MetricTile icon={AlertTriangle} label="Open exceptions" value={formatNumber(overview?.open_exception_count)} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === "governance" ? <AdvancedLifecycleGovernancePanel moduleKey="integrations" /> : null}

      <FormAlert error={error} success={success} />

      {activeTab === "partners" ? (
        <div className="module-workbench">
          <section className="content-band">
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/integrations/partners", partnerForm, () => setPartnerForm(initialPartner), "Partner system registered");
            }}>
              <Field label="Partner name"><input required value={partnerForm.partner_name} onChange={(event) => setPartnerForm({ ...partnerForm, partner_name: event.target.value })} /></Field>
              <Field label="Partner type"><input value={partnerForm.partner_type_cd} onChange={(event) => setPartnerForm({ ...partnerForm, partner_type_cd: event.target.value.toUpperCase() })} /></Field>
              <Field label="Endpoint"><input value={partnerForm.endpoint_txt} onChange={(event) => setPartnerForm({ ...partnerForm, endpoint_txt: event.target.value })} /></Field>
              <Field label="Contact"><textarea value={partnerForm.contact_txt} onChange={(event) => setPartnerForm({ ...partnerForm, contact_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Register partner</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/integrations/contracts", contractForm, () => setContractForm(initialContract), "Exchange contract created");
            }}>
              <SelectField label="Partner" value={contractForm.partner_system_uid} onChange={(value) => setContractForm({ ...contractForm, partner_system_uid: value })}>
                <option value="">Select partner</option>{partners.map((partner) => <option key={partner.partner_system_uid} value={partner.partner_system_uid}>{partner.partner_name}</option>)}
              </SelectField>
              <div className="compact-form">
                <SelectField label="Direction" value={contractForm.exchange_direction_cd} onChange={(value) => setContractForm({ ...contractForm, exchange_direction_cd: value })}>
                  <option value="INBOUND">Inbound</option><option value="OUTBOUND">Outbound</option><option value="BIDIRECTIONAL">Bidirectional</option>
                </SelectField>
                <Field label="Transport"><input value={contractForm.transport_cd} onChange={(event) => setContractForm({ ...contractForm, transport_cd: event.target.value.toUpperCase() })} /></Field>
              </div>
              <Field label="Message type"><input value={contractForm.message_type_cd} onChange={(event) => setContractForm({ ...contractForm, message_type_cd: event.target.value.toUpperCase() })} /></Field>
              <button className="secondary-button" type="submit">Create contract</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={partnerColumns} rows={partners} keyField="partner_system_uid" empty="No partner systems" />
            <br />
            <DataTable columns={contractColumns} rows={contracts} keyField="exchange_contract_uid" empty="No exchange contracts" />
          </section>
        </div>
      ) : null}

      {activeTab === "messages" ? (
        <div className="module-workbench">
          <section className="content-band">
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/integrations/payloads", { ...payloadForm, payload_size_no: payloadForm.payload_size_no || null, storage_uri_txt: payloadForm.storage_uri_txt || null, sha256_hash_txt: payloadForm.sha256_hash_txt || null }, () => setPayloadForm(initialPayload), "Payload record created");
            }}>
              <Field label="Storage URI"><input value={payloadForm.storage_uri_txt} onChange={(event) => setPayloadForm({ ...payloadForm, storage_uri_txt: event.target.value })} /></Field>
              <div className="compact-form">
                <Field label="Payload size"><input type="number" value={payloadForm.payload_size_no} onChange={(event) => setPayloadForm({ ...payloadForm, payload_size_no: event.target.value })} /></Field>
                <Field label="Retention until"><input type="date" value={payloadForm.retention_until_dt} onChange={(event) => setPayloadForm({ ...payloadForm, retention_until_dt: event.target.value })} /></Field>
              </div>
              <button className="secondary-button" type="submit">Create payload</button>
            </form>
            <hr />
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/integrations/messages", { ...messageForm, exchange_contract_uid: messageForm.exchange_contract_uid || null, partner_system_uid: messageForm.partner_system_uid || null, payload_store_uid: messageForm.payload_store_uid || null, correlation_reference_txt: messageForm.correlation_reference_txt || null }, () => setMessageForm(initialMessage), "Integration message recorded");
            }}>
              <SelectField label="Contract" value={messageForm.exchange_contract_uid} onChange={syncContract}>
                <option value="">No contract</option>{contracts.map((contract) => <option key={contract.exchange_contract_uid} value={contract.exchange_contract_uid}>{contract.contract_code} - {contract.partner_name}</option>)}
              </SelectField>
              <SelectField label="Partner" value={messageForm.partner_system_uid} onChange={(value) => setMessageForm({ ...messageForm, partner_system_uid: value })}>
                <option value="">Select partner</option>{partners.map((partner) => <option key={partner.partner_system_uid} value={partner.partner_system_uid}>{partner.partner_name}</option>)}
              </SelectField>
              <SelectField label="Payload" value={messageForm.payload_store_uid} onChange={(value) => setMessageForm({ ...messageForm, payload_store_uid: value })}>
                <option value="">No payload</option>{payloads.map((payload) => <option key={payload.payload_store_uid} value={payload.payload_store_uid}>{payload.payload_no}</option>)}
              </SelectField>
              <SelectField label="Direction" value={messageForm.direction_cd} onChange={(value) => setMessageForm({ ...messageForm, direction_cd: value })}>
                <option value="INBOUND">Inbound</option><option value="OUTBOUND">Outbound</option>
              </SelectField>
              <button className="primary-button" type="submit">Record message</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={messageColumns} rows={messages} keyField="message_event_uid" empty="No integration messages" />
            <br />
            <DataTable columns={payloadColumns} rows={payloads} keyField="payload_store_uid" empty="No payload records" />
          </section>
        </div>
      ) : null}

      {activeTab === "exceptions" ? (
        <div className="module-workbench">
          <section className="content-band">
            <form className="action-form" onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/integrations/exceptions", { ...exceptionForm, message_event_uid: exceptionForm.message_event_uid || null }, () => setExceptionForm(initialException), "Integration exception recorded");
            }}>
              <SelectField label="Message" value={exceptionForm.message_event_uid} onChange={(value) => setExceptionForm({ ...exceptionForm, message_event_uid: value })}>
                <option value="">No message selected</option>{messages.map((message) => <option key={message.message_event_uid} value={message.message_event_uid}>{message.message_reference_no}</option>)}
              </SelectField>
              <Field label="Exception type"><input value={exceptionForm.exception_type_cd} onChange={(event) => setExceptionForm({ ...exceptionForm, exception_type_cd: event.target.value.toUpperCase() })} /></Field>
              <Field label="Exception detail"><textarea value={exceptionForm.exception_txt} onChange={(event) => setExceptionForm({ ...exceptionForm, exception_txt: event.target.value })} /></Field>
              <button className="primary-button" type="submit">Record exception</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={exceptionColumns} rows={exceptions} keyField="exception_uid" empty="No integration exceptions" />
          </section>
        </div>
      ) : null}
    </section>
  );
}
