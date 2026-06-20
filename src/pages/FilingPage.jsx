import { FileCheck2, FilePlus2, GitBranch, ShieldAlert } from "lucide-react";
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
  { id: "lodge", label: "Lodgement" },
  { id: "declarations", label: "Declarations" },
  { id: "amend", label: "Amendments" },
];

const initialLodgement = {
  subject_uid: "",
  revenue_kind_uid: "",
  period_instance_uid: "",
  form_blueprint_uid: "",
  lodgement_channel_cd: "COUNTER",
  declared_total_amt: "",
};
const initialItems = [
  { item_code: "GROSS_AMOUNT", item_value_num: "", item_value_txt: "" },
  { item_code: "TAX_PAYABLE", item_value_num: "", item_value_txt: "" },
];
const initialAmendment = { amendment_reason_cd: "CORRECTION", amendment_reason_txt: "", declared_total_amt: "" };

export default function FilingPage() {
  const [activeTab, setActiveTab] = useState("lodge");
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [lookups, setLookups] = useState({});
  const [dues, setDues] = useState([]);
  const [formItems, setFormItems] = useState([]);
  const [lodgements, setLodgements] = useState([]);
  const [declarations, setDeclarations] = useState([]);
  const [selectedDeclaration, setSelectedDeclaration] = useState(null);
  const [lodgementForm, setLodgementForm] = useState(initialLodgement);
  const [items, setItems] = useState(initialItems);
  const [amendmentForm, setAmendmentForm] = useState(initialAmendment);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const [overviewPayload, subjectsPayload, lookupPayload, duesPayload, itemsPayload, lodgementPayload, declarationPayload] = await Promise.all([
      apiRequest("/api/filing/overview"),
      apiRequest("/api/registry/subjects?pageSize=80"),
      apiRequest("/api/configuration/lookups"),
      apiRequest("/api/obligations/dues?pageSize=100&due_state_cd=OPEN"),
      apiRequest("/api/configuration/form-items"),
      apiRequest("/api/filing/lodgements?pageSize=60"),
      apiRequest("/api/filing/declarations?pageSize=60"),
    ]);

    setOverview(overviewPayload.overview);
    setSubjects(subjectsPayload.rows || []);
    setLookups(lookupPayload.lookups || {});
    setDues(duesPayload.rows || []);
    setFormItems(itemsPayload.form_items || []);
    setLodgements(lodgementPayload.rows || []);
    setDeclarations(declarationPayload.rows || []);
  }

  useEffect(() => {
    void load().catch((loadError) => setError(loadError.message));
  }, []);

  const filteredDues = useMemo(
    () => dues.filter((due) => !lodgementForm.subject_uid || due.subject_uid === lodgementForm.subject_uid),
    [dues, lodgementForm.subject_uid]
  );

  const selectedFormItems = useMemo(
    () => formItems.filter((item) => item.form_blueprint_uid === lodgementForm.form_blueprint_uid),
    [formItems, lodgementForm.form_blueprint_uid]
  );

  function updateItem(index, patch) {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  async function submitLodgement(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      const body = {
        ...lodgementForm,
        period_instance_uid: lodgementForm.period_instance_uid || null,
        form_blueprint_uid: lodgementForm.form_blueprint_uid || null,
        declared_total_amt: lodgementForm.declared_total_amt || null,
        items: items
          .filter((item) => item.item_code)
          .map((item) => ({
            ...item,
            item_value_num: item.item_value_num === "" ? null : Number(item.item_value_num),
            item_value_txt: item.item_value_txt || null,
          })),
      };
      const payload = await apiRequest("/api/filing/lodgements", { method: "POST", body });
      setLodgementForm(initialLodgement);
      setItems(initialItems);
      setSelectedDeclaration({ declaration: payload.result.declaration, items: payload.result.items, validation_outcomes: payload.result.validation_outcomes });
      await load();
      setActiveTab("declarations");
      setSuccess("Lodgement received");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function loadDeclaration(declarationUid) {
    const payload = await apiRequest(`/api/filing/declarations/${declarationUid}`);
    setSelectedDeclaration(payload.declaration);
    setActiveTab("declarations");
  }

  async function submitAmendment(event) {
    event.preventDefault();
    if (!selectedDeclaration?.declaration?.declaration_uid) return;
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/filing/declarations/${selectedDeclaration.declaration.declaration_uid}/amendments`, {
        method: "POST",
        body: {
          ...amendmentForm,
          declared_total_amt: amendmentForm.declared_total_amt || null,
        },
      });
      setAmendmentForm(initialAmendment);
      await loadDeclaration(selectedDeclaration.declaration.declaration_uid);
      await load();
      setSuccess("Amendment created");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  const lodgementColumns = [
    { key: "lodgement_no", label: "Lodgement" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "revenue_kind_name", label: "Revenue kind" },
    { key: "period_label_txt", label: "Period" },
    { key: "received_ts", label: "Received", render: (row) => formatDateTime(row.received_ts) },
    { key: "declaration_state_cd", label: "Declaration", render: (row) => <StatusPill tone={row.declaration_state_cd === "ACCEPTED" ? "success" : "warning"}>{compactCode(row.declaration_state_cd)}</StatusPill> },
  ];

  const declarationColumns = [
    { key: "declaration_no", label: "Declaration" },
    { key: "display_name_txt", label: "Taxpayer" },
    { key: "revenue_kind_name", label: "Revenue kind" },
    { key: "period_label_txt", label: "Period" },
    { key: "declared_total_amt", label: "Declared total", render: (row) => formatMoney(row.declared_total_amt || 0) },
    { key: "declaration_state_cd", label: "State", render: (row) => <StatusPill tone={row.declaration_state_cd === "ACCEPTED" ? "success" : "warning"}>{compactCode(row.declaration_state_cd)}</StatusPill> },
  ];

  const itemColumns = [
    { key: "item_code", label: "Item" },
    { key: "item_value_txt", label: "Text value", render: (row) => row.item_value_txt || "-" },
    { key: "item_value_num", label: "Numeric value", render: (row) => row.item_value_num ?? "-" },
    { key: "validation_state_cd", label: "Validation", render: (row) => compactCode(row.validation_state_cd) },
  ];

  const outcomeColumns = [
    { key: "outcome_level_cd", label: "Level", render: (row) => compactCode(row.outcome_level_cd) },
    { key: "outcome_code", label: "Code", render: (row) => compactCode(row.outcome_code) },
    { key: "outcome_message_txt", label: "Message" },
  ];

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Filing and declarations" title="Lodgement, Validation And Amendment" status="Operational" tone="success" />

      <div className="metric-grid">
        <MetricTile icon={FilePlus2} label="Lodgements" value={formatNumber(overview?.lodgement_count)} />
        <MetricTile icon={FileCheck2} label="Declarations" value={formatNumber(overview?.declaration_count)} />
        <MetricTile icon={ShieldAlert} label="Validation open" value={formatNumber(overview?.unresolved_validation_count)} />
        <MetricTile icon={GitBranch} label="Amendments" value={formatNumber(overview?.amendment_count)} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "lodge" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>New lodgement</span>
                <h2>Receive Declaration</h2>
              </div>
            </div>
            <form className="action-form" onSubmit={submitLodgement}>
              <SelectField label="Taxpayer" value={lodgementForm.subject_uid} onChange={(value) => setLodgementForm({ ...lodgementForm, subject_uid: value })}>
                <option value="">Select taxpayer</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_uid} value={subject.subject_uid}>
                    {subject.display_name_txt}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Revenue kind" value={lodgementForm.revenue_kind_uid} onChange={(value) => setLodgementForm({ ...lodgementForm, revenue_kind_uid: value })}>
                <option value="">Select revenue kind</option>
                {(lookups.revenue_kinds || []).map((kind) => (
                  <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>
                    {kind.revenue_kind_name}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Period due" value={lodgementForm.period_instance_uid} onChange={(value) => setLodgementForm({ ...lodgementForm, period_instance_uid: value })}>
                <option value="">No period selected</option>
                {filteredDues.map((due) => (
                  <option key={due.due_instance_uid} value={due.period_instance_uid || ""}>
                    {due.period_label_txt} - {compactCode(due.due_event_cd)}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Form" value={lodgementForm.form_blueprint_uid} onChange={(value) => setLodgementForm({ ...lodgementForm, form_blueprint_uid: value })}>
                <option value="">No form</option>
                {(lookups.form_blueprints || []).map((form) => (
                  <option key={form.form_blueprint_uid} value={form.form_blueprint_uid}>
                    {form.form_code} - {form.form_name}
                  </option>
                ))}
              </SelectField>
              <Field label="Declared total">
                <input type="number" value={lodgementForm.declared_total_amt} onChange={(event) => setLodgementForm({ ...lodgementForm, declared_total_amt: event.target.value })} />
              </Field>

              {selectedFormItems.length ? (
                <ul className="mini-list">
                  {selectedFormItems.slice(0, 6).map((item) => (
                    <li key={item.form_item_uid}>
                      <span>{item.item_label_txt}</span>
                      <small>{compactCode(item.item_type_cd)}</small>
                    </li>
                  ))}
                </ul>
              ) : null}

              {items.map((item, index) => (
                <div className="compact-form" key={index}>
                  <Field label={`Item ${index + 1} code`}>
                    <input value={item.item_code} onChange={(event) => updateItem(index, { item_code: event.target.value.toUpperCase() })} />
                  </Field>
                  <Field label="Numeric value">
                    <input type="number" value={item.item_value_num} onChange={(event) => updateItem(index, { item_value_num: event.target.value })} />
                  </Field>
                  <Field label="Text value">
                    <input value={item.item_value_txt} onChange={(event) => updateItem(index, { item_value_txt: event.target.value })} />
                  </Field>
                </div>
              ))}
              <div className="form-actions">
                <button className="secondary-button" type="button" onClick={() => setItems([...items, { item_code: "", item_value_num: "", item_value_txt: "" }])}>Add item</button>
                <button className="primary-button" type="submit">Receive lodgement</button>
              </div>
            </form>
          </section>

          <section className="content-band">
            <DataTable columns={lodgementColumns} rows={lodgements} keyField="lodgement_package_uid" empty="No lodgements" />
          </section>
        </div>
      ) : null}

      {activeTab === "declarations" ? (
        <div className="module-workbench">
          <section className="content-band">
            <DataTable columns={declarationColumns} rows={declarations} keyField="declaration_uid" onRowClick={(row) => loadDeclaration(row.declaration_uid)} empty="No declarations" selectedKey={selectedDeclaration?.declaration?.declaration_uid} />
          </section>
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Declaration detail</span>
                <h2>{selectedDeclaration?.declaration?.declaration_no || "Select declaration"}</h2>
              </div>
              {selectedDeclaration?.declaration ? <StatusPill tone="success">{compactCode(selectedDeclaration.declaration.declaration_state_cd)}</StatusPill> : null}
            </div>
            <DataTable columns={itemColumns} rows={selectedDeclaration?.items || []} keyField="declaration_item_uid" empty="No declaration items" />
            <br />
            <DataTable columns={outcomeColumns} rows={selectedDeclaration?.validation_outcomes || []} keyField="validation_outcome_uid" empty="No validation outcomes" />
          </section>
        </div>
      ) : null}

      {activeTab === "amend" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Selected declaration</span>
                <h2>{selectedDeclaration?.declaration?.declaration_no || "No declaration selected"}</h2>
              </div>
            </div>
            <DataTable columns={declarationColumns} rows={declarations} keyField="declaration_uid" onRowClick={(row) => loadDeclaration(row.declaration_uid)} empty="No declarations" selectedKey={selectedDeclaration?.declaration?.declaration_uid} />
          </section>
          <section className="content-band">
            <form className="action-form" onSubmit={submitAmendment}>
              <Field label="Amendment reason">
                <input value={amendmentForm.amendment_reason_cd} onChange={(event) => setAmendmentForm({ ...amendmentForm, amendment_reason_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Declared total">
                <input type="number" value={amendmentForm.declared_total_amt} onChange={(event) => setAmendmentForm({ ...amendmentForm, declared_total_amt: event.target.value })} />
              </Field>
              <Field label="Reason text">
                <textarea value={amendmentForm.amendment_reason_txt} onChange={(event) => setAmendmentForm({ ...amendmentForm, amendment_reason_txt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit" disabled={!selectedDeclaration?.declaration?.declaration_uid}>Create amendment</button>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
