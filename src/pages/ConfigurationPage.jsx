import { Calculator, FileCog, Landmark, Settings2 } from "lucide-react";
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
import { compactCode, formatNumber } from "../utils/format.js";

const tabs = [
  { id: "revenue", label: "Revenue Kinds" },
  { id: "rules", label: "Rules" },
  { id: "forms", label: "Forms" },
  { id: "rates", label: "Rates And GL" },
];

const initialKind = {
  revenue_kind_name: "",
  revenue_kind_code: "",
  revenue_family_cd: "DIRECT_TAX",
  default_currency_uid: "",
  owning_agency_unit_uid: "",
  registration_required_bool: true,
  filing_required_bool: true,
  payment_required_bool: true,
};

const initialComponent = { revenue_kind_uid: "", component_name: "", component_code: "", component_category_cd: "PRINCIPAL", natural_balance_cd: "DEBIT", display_order_no: 0 };
const initialPeriod = { revenue_kind_uid: "", period_rule_code: "", frequency_cd: "MONTHLY", period_length_months_no: 1, generation_lead_days_no: 30 };
const initialDue = { revenue_kind_uid: "", period_rule_uid: "", due_rule_code: "", due_event_cd: "FILING", base_event_cd: "PERIOD_END", offset_days_no: 20, grace_days_no: 0 };
const initialForm = { revenue_kind_uid: "", form_name: "", form_code: "", form_purpose_cd: "RETURN", version_no: 1, is_published_bool: false };
const initialItem = { form_blueprint_uid: "", item_label_txt: "", item_code: "", item_type_cd: "NUMERIC", display_order_no: 0, required_bool: false };
const initialRate = { revenue_kind_uid: "", schedule_name: "", schedule_code: "", currency_uid: "", approved_bool: true };
const initialBand = { rate_schedule_uid: "", band_seq_no: 1, lower_threshold_amt: "", upper_threshold_amt: "", rate_percent: "", fixed_amt: "" };
const initialCharge = { revenue_kind_uid: "", revenue_component_uid: "", charge_name: "", charge_code: "", charge_type_cd: "PENALTY", calculation_method_cd: "PERCENTAGE", rate_percent: "", fixed_amt: "", cap_amt: "" };
const initialGl = { revenue_kind_uid: "", revenue_component_uid: "", event_type_cd: "LIABILITY_POSTED", debit_gl_code: "", credit_gl_code: "", cost_center_code: "", fund_code: "" };

export default function ConfigurationPage() {
  const [activeTab, setActiveTab] = useState("revenue");
  const [overview, setOverview] = useState(null);
  const [lookups, setLookups] = useState({});
  const [revenueKinds, setRevenueKinds] = useState([]);
  const [components, setComponents] = useState([]);
  const [periodRules, setPeriodRules] = useState([]);
  const [dueRules, setDueRules] = useState([]);
  const [forms, setForms] = useState([]);
  const [formItems, setFormItems] = useState([]);
  const [rateSchedules, setRateSchedules] = useState([]);
  const [charges, setCharges] = useState([]);
  const [glMappings, setGlMappings] = useState([]);
  const [kindForm, setKindForm] = useState(initialKind);
  const [componentForm, setComponentForm] = useState(initialComponent);
  const [periodForm, setPeriodForm] = useState(initialPeriod);
  const [dueForm, setDueForm] = useState(initialDue);
  const [formForm, setFormForm] = useState(initialForm);
  const [itemForm, setItemForm] = useState(initialItem);
  const [rateForm, setRateForm] = useState(initialRate);
  const [bandForm, setBandForm] = useState(initialBand);
  const [chargeForm, setChargeForm] = useState(initialCharge);
  const [glForm, setGlForm] = useState(initialGl);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const [overviewPayload, lookupPayload, kindsPayload, componentsPayload, periodsPayload, duesPayload, formsPayload, itemsPayload, ratesPayload, chargesPayload, glPayload] =
      await Promise.all([
        apiRequest("/api/configuration/overview"),
        apiRequest("/api/configuration/lookups"),
        apiRequest("/api/configuration/revenue-kinds"),
        apiRequest("/api/configuration/components"),
        apiRequest("/api/configuration/period-rules"),
        apiRequest("/api/configuration/due-rules"),
        apiRequest("/api/configuration/forms"),
        apiRequest("/api/configuration/form-items"),
        apiRequest("/api/configuration/rate-schedules"),
        apiRequest("/api/configuration/charges"),
        apiRequest("/api/configuration/gl-mappings"),
      ]);

    setOverview(overviewPayload.overview);
    setLookups(lookupPayload.lookups || {});
    setRevenueKinds(kindsPayload.revenue_kinds || []);
    setComponents(componentsPayload.components || []);
    setPeriodRules(periodsPayload.period_rules || []);
    setDueRules(duesPayload.due_rules || []);
    setForms(formsPayload.forms || []);
    setFormItems(itemsPayload.form_items || []);
    setRateSchedules(ratesPayload.rate_schedules || []);
    setCharges(chargesPayload.charges || []);
    setGlMappings(glPayload.gl_mappings || []);
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

  function revenueSelect(value, onChange, required = true) {
    return (
      <SelectField label="Revenue kind" value={value} onChange={onChange} required={required}>
        <option value="">Select revenue kind</option>
        {revenueKinds.map((kind) => (
          <option key={kind.revenue_kind_uid} value={kind.revenue_kind_uid}>
            {kind.revenue_kind_name}
          </option>
        ))}
      </SelectField>
    );
  }

  const kindColumns = [
    { key: "revenue_kind_name", label: "Revenue kind" },
    { key: "revenue_family_cd", label: "Family", render: (row) => compactCode(row.revenue_family_cd) },
    { key: "currency_cd", label: "Currency" },
    { key: "component_count", label: "Components", render: (row) => formatNumber(row.component_count) },
    {
      key: "filing_required_bool",
      label: "Filing",
      render: (row) => <StatusPill tone={row.filing_required_bool ? "success" : "neutral"}>{row.filing_required_bool ? "Required" : "No filing"}</StatusPill>,
    },
  ];

  const componentColumns = [
    { key: "revenue_kind_name", label: "Revenue kind" },
    { key: "component_name", label: "Component" },
    { key: "component_category_cd", label: "Category", render: (row) => compactCode(row.component_category_cd) },
    { key: "natural_balance_cd", label: "Balance", render: (row) => compactCode(row.natural_balance_cd) },
  ];

  const ruleColumns = [
    { key: "revenue_kind_name", label: "Revenue kind" },
    { key: "period_rule_code", label: "Period" },
    { key: "frequency_cd", label: "Frequency", render: (row) => compactCode(row.frequency_cd) },
    { key: "period_length_months_no", label: "Months" },
  ];

  const dueColumns = [
    { key: "revenue_kind_name", label: "Revenue kind" },
    { key: "due_event_cd", label: "Event", render: (row) => compactCode(row.due_event_cd) },
    { key: "base_event_cd", label: "Base", render: (row) => compactCode(row.base_event_cd) },
    { key: "offset_days_no", label: "Offset days" },
  ];

  const formColumns = [
    { key: "form_code", label: "Code" },
    { key: "form_name", label: "Form" },
    { key: "form_purpose_cd", label: "Purpose", render: (row) => compactCode(row.form_purpose_cd) },
    { key: "item_count", label: "Items", render: (row) => formatNumber(row.item_count) },
  ];

  const itemColumns = [
    { key: "form_code", label: "Form" },
    { key: "item_code", label: "Item" },
    { key: "item_label_txt", label: "Label" },
    { key: "item_type_cd", label: "Type", render: (row) => compactCode(row.item_type_cd) },
  ];

  const rateColumns = [
    { key: "schedule_name", label: "Schedule" },
    { key: "revenue_kind_name", label: "Revenue kind" },
    { key: "currency_cd", label: "Currency" },
    { key: "band_count", label: "Bands", render: (row) => formatNumber(row.band_count) },
  ];

  const glColumns = [
    { key: "event_type_cd", label: "Event", render: (row) => compactCode(row.event_type_cd) },
    { key: "revenue_kind_name", label: "Revenue kind" },
    { key: "component_name", label: "Component" },
    { key: "debit_gl_code", label: "Debit GL" },
    { key: "credit_gl_code", label: "Credit GL" },
  ];

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Revenue configuration" title="Policy, Rates And Accounting Setup" status="Configured" tone="success" />

      <div className="metric-grid">
        <MetricTile icon={Landmark} label="Revenue kinds" value={formatNumber(overview?.revenue_kind_count)} />
        <MetricTile icon={Settings2} label="Period rules" value={formatNumber(overview?.period_rule_count)} />
        <MetricTile icon={FileCog} label="Forms" value={formatNumber(overview?.form_count)} />
        <MetricTile icon={Calculator} label="GL mappings" value={formatNumber(overview?.gl_mapping_count)} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "revenue" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Revenue kind</span>
                <h2>Create Revenue Kind</h2>
              </div>
            </div>
            <form
              className="action-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit(
                  "/api/configuration/revenue-kinds",
                  { ...kindForm, default_currency_uid: kindForm.default_currency_uid || null, owning_agency_unit_uid: kindForm.owning_agency_unit_uid || null },
                  () => setKindForm(initialKind),
                  "Revenue kind created"
                );
              }}
            >
              <Field label="Revenue kind name">
                <input required value={kindForm.revenue_kind_name} onChange={(event) => setKindForm({ ...kindForm, revenue_kind_name: event.target.value })} />
              </Field>
              <Field label="Revenue code">
                <input value={kindForm.revenue_kind_code} onChange={(event) => setKindForm({ ...kindForm, revenue_kind_code: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Revenue family">
                <input required value={kindForm.revenue_family_cd} onChange={(event) => setKindForm({ ...kindForm, revenue_family_cd: event.target.value.toUpperCase() })} />
              </Field>
              <SelectField label="Default currency" value={kindForm.default_currency_uid} onChange={(value) => setKindForm({ ...kindForm, default_currency_uid: value })}>
                <option value="">Default</option>
                {(lookups.currencies || []).map((currency) => (
                  <option key={currency.currency_uid} value={currency.currency_uid}>
                    {currency.currency_cd}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Owning unit" value={kindForm.owning_agency_unit_uid} onChange={(value) => setKindForm({ ...kindForm, owning_agency_unit_uid: value })}>
                <option value="">Unassigned</option>
                {(lookups.agency_units || []).map((unit) => (
                  <option key={unit.agency_unit_uid} value={unit.agency_unit_uid}>
                    {unit.unit_name}
                  </option>
                ))}
              </SelectField>
              <button className="primary-button" type="submit">Create revenue kind</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={kindColumns} rows={revenueKinds} keyField="revenue_kind_uid" empty="No revenue kinds" />
          </section>
        </div>
      ) : null}

      {activeTab === "rules" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Components and due dates</span>
                <h2>Rule Setup</h2>
              </div>
            </div>
            <form
              className="compact-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit("/api/configuration/components", componentForm, () => setComponentForm(initialComponent), "Component created");
              }}
            >
              {revenueSelect(componentForm.revenue_kind_uid, (value) => setComponentForm({ ...componentForm, revenue_kind_uid: value }))}
              <Field label="Component">
                <input required value={componentForm.component_name} onChange={(event) => setComponentForm({ ...componentForm, component_name: event.target.value })} />
              </Field>
              <Field label="Category">
                <input value={componentForm.component_category_cd} onChange={(event) => setComponentForm({ ...componentForm, component_category_cd: event.target.value.toUpperCase() })} />
              </Field>
              <button className="secondary-button" type="submit">Create component</button>
            </form>
            <hr />
            <form
              className="compact-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit("/api/configuration/period-rules", periodForm, () => setPeriodForm(initialPeriod), "Period rule created");
              }}
            >
              {revenueSelect(periodForm.revenue_kind_uid, (value) => setPeriodForm({ ...periodForm, revenue_kind_uid: value }))}
              <Field label="Frequency">
                <input required value={periodForm.frequency_cd} onChange={(event) => setPeriodForm({ ...periodForm, frequency_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Months">
                <input type="number" value={periodForm.period_length_months_no} onChange={(event) => setPeriodForm({ ...periodForm, period_length_months_no: Number(event.target.value) })} />
              </Field>
              <button className="secondary-button" type="submit">Create period rule</button>
            </form>
            <hr />
            <form
              className="compact-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit("/api/configuration/due-rules", { ...dueForm, period_rule_uid: dueForm.period_rule_uid || null }, () => setDueForm(initialDue), "Due rule created");
              }}
            >
              {revenueSelect(dueForm.revenue_kind_uid, (value) => setDueForm({ ...dueForm, revenue_kind_uid: value }))}
              <SelectField label="Period rule" value={dueForm.period_rule_uid} onChange={(value) => setDueForm({ ...dueForm, period_rule_uid: value })}>
                <option value="">Any period</option>
                {periodRules.map((rule) => (
                  <option key={rule.period_rule_uid} value={rule.period_rule_uid}>
                    {rule.period_rule_code}
                  </option>
                ))}
              </SelectField>
              <Field label="Due event">
                <input value={dueForm.due_event_cd} onChange={(event) => setDueForm({ ...dueForm, due_event_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Offset days">
                <input type="number" value={dueForm.offset_days_no} onChange={(event) => setDueForm({ ...dueForm, offset_days_no: Number(event.target.value) })} />
              </Field>
              <button className="secondary-button" type="submit">Create due rule</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={componentColumns} rows={components} keyField="revenue_component_uid" empty="No components" />
            <br />
            <DataTable columns={ruleColumns} rows={periodRules} keyField="period_rule_uid" empty="No period rules" />
            <br />
            <DataTable columns={dueColumns} rows={dueRules} keyField="due_rule_uid" empty="No due rules" />
          </section>
        </div>
      ) : null}

      {activeTab === "forms" ? (
        <div className="module-workbench">
          <section className="content-band">
            <form
              className="action-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit("/api/configuration/forms", { ...formForm, revenue_kind_uid: formForm.revenue_kind_uid || null }, () => setFormForm(initialForm), "Form created");
              }}
            >
              {revenueSelect(formForm.revenue_kind_uid, (value) => setFormForm({ ...formForm, revenue_kind_uid: value }), false)}
              <Field label="Form name">
                <input required value={formForm.form_name} onChange={(event) => setFormForm({ ...formForm, form_name: event.target.value })} />
              </Field>
              <Field label="Form code">
                <input value={formForm.form_code} onChange={(event) => setFormForm({ ...formForm, form_code: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Purpose">
                <input value={formForm.form_purpose_cd} onChange={(event) => setFormForm({ ...formForm, form_purpose_cd: event.target.value.toUpperCase() })} />
              </Field>
              <button className="primary-button" type="submit">Create form</button>
            </form>
            <hr />
            <form
              className="action-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit("/api/configuration/form-items", itemForm, () => setItemForm(initialItem), "Form item created");
              }}
            >
              <SelectField label="Form" required value={itemForm.form_blueprint_uid} onChange={(value) => setItemForm({ ...itemForm, form_blueprint_uid: value })}>
                <option value="">Select form</option>
                {forms.map((form) => (
                  <option key={form.form_blueprint_uid} value={form.form_blueprint_uid}>
                    {form.form_code} - {form.form_name}
                  </option>
                ))}
              </SelectField>
              <Field label="Item label">
                <input required value={itemForm.item_label_txt} onChange={(event) => setItemForm({ ...itemForm, item_label_txt: event.target.value })} />
              </Field>
              <Field label="Item code">
                <input value={itemForm.item_code} onChange={(event) => setItemForm({ ...itemForm, item_code: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Item type">
                <input value={itemForm.item_type_cd} onChange={(event) => setItemForm({ ...itemForm, item_type_cd: event.target.value.toUpperCase() })} />
              </Field>
              <button className="primary-button" type="submit">Create form item</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={formColumns} rows={forms} keyField="form_blueprint_uid" empty="No forms" />
            <br />
            <DataTable columns={itemColumns} rows={formItems} keyField="form_item_uid" empty="No form items" />
          </section>
        </div>
      ) : null}

      {activeTab === "rates" ? (
        <div className="module-workbench">
          <section className="content-band">
            <form
              className="compact-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit("/api/configuration/rate-schedules", { ...rateForm, currency_uid: rateForm.currency_uid || null }, () => setRateForm(initialRate), "Rate schedule created");
              }}
            >
              {revenueSelect(rateForm.revenue_kind_uid, (value) => setRateForm({ ...rateForm, revenue_kind_uid: value }))}
              <Field label="Schedule name">
                <input required value={rateForm.schedule_name} onChange={(event) => setRateForm({ ...rateForm, schedule_name: event.target.value })} />
              </Field>
              <SelectField label="Currency" value={rateForm.currency_uid} onChange={(value) => setRateForm({ ...rateForm, currency_uid: value })}>
                <option value="">Default</option>
                {(lookups.currencies || []).map((currency) => (
                  <option key={currency.currency_uid} value={currency.currency_uid}>
                    {currency.currency_cd}
                  </option>
                ))}
              </SelectField>
              <button className="secondary-button" type="submit">Create schedule</button>
            </form>
            <hr />
            <form
              className="compact-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit("/api/configuration/rate-bands", bandForm, () => setBandForm(initialBand), "Rate band created");
              }}
            >
              <SelectField label="Rate schedule" value={bandForm.rate_schedule_uid} onChange={(value) => setBandForm({ ...bandForm, rate_schedule_uid: value })}>
                <option value="">Select schedule</option>
                {rateSchedules.map((rate) => (
                  <option key={rate.rate_schedule_uid} value={rate.rate_schedule_uid}>
                    {rate.schedule_name}
                  </option>
                ))}
              </SelectField>
              <Field label="Band no.">
                <input type="number" value={bandForm.band_seq_no} onChange={(event) => setBandForm({ ...bandForm, band_seq_no: Number(event.target.value) })} />
              </Field>
              <Field label="Rate percent">
                <input type="number" value={bandForm.rate_percent} onChange={(event) => setBandForm({ ...bandForm, rate_percent: event.target.value })} />
              </Field>
              <Field label="Fixed amount">
                <input type="number" value={bandForm.fixed_amt} onChange={(event) => setBandForm({ ...bandForm, fixed_amt: event.target.value })} />
              </Field>
              <button className="secondary-button" type="submit">Create band</button>
            </form>
            <hr />
            <form
              className="compact-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit("/api/configuration/charges", { ...chargeForm, revenue_component_uid: chargeForm.revenue_component_uid || null }, () => setChargeForm(initialCharge), "Charge created");
              }}
            >
              {revenueSelect(chargeForm.revenue_kind_uid, (value) => setChargeForm({ ...chargeForm, revenue_kind_uid: value }))}
              <Field label="Charge name">
                <input required value={chargeForm.charge_name} onChange={(event) => setChargeForm({ ...chargeForm, charge_name: event.target.value })} />
              </Field>
              <Field label="Method">
                <input value={chargeForm.calculation_method_cd} onChange={(event) => setChargeForm({ ...chargeForm, calculation_method_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Rate percent">
                <input type="number" value={chargeForm.rate_percent} onChange={(event) => setChargeForm({ ...chargeForm, rate_percent: event.target.value })} />
              </Field>
              <button className="secondary-button" type="submit">Create charge</button>
            </form>
            <hr />
            <form
              className="compact-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit("/api/configuration/gl-mappings", { ...glForm, revenue_kind_uid: glForm.revenue_kind_uid || null, revenue_component_uid: glForm.revenue_component_uid || null }, () => setGlForm(initialGl), "GL mapping created");
              }}
            >
              {revenueSelect(glForm.revenue_kind_uid, (value) => setGlForm({ ...glForm, revenue_kind_uid: value }), false)}
              <Field label="Event type">
                <input value={glForm.event_type_cd} onChange={(event) => setGlForm({ ...glForm, event_type_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Debit GL">
                <input required value={glForm.debit_gl_code} onChange={(event) => setGlForm({ ...glForm, debit_gl_code: event.target.value })} />
              </Field>
              <Field label="Credit GL">
                <input required value={glForm.credit_gl_code} onChange={(event) => setGlForm({ ...glForm, credit_gl_code: event.target.value })} />
              </Field>
              <button className="secondary-button" type="submit">Create GL mapping</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={rateColumns} rows={rateSchedules} keyField="rate_schedule_uid" empty="No rate schedules" />
            <br />
            <DataTable columns={glColumns} rows={glMappings} keyField="gl_mapping_uid" empty="No GL mappings" />
          </section>
        </div>
      ) : null}
    </section>
  );
}
