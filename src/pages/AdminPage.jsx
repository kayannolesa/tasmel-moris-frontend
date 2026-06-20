import { Building2, ClipboardList, KeyRound, ShieldCheck, UsersRound } from "lucide-react";
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
import { compactCode, formatDateTime, formatNumber } from "../utils/format.js";

const tabs = [
  { id: "staff", label: "Staff Access" },
  { id: "organisation", label: "Agency Structure" },
  { id: "reference", label: "Reference Values" },
  { id: "audit", label: "Audit Access" },
];

const initialStaff = {
  full_name_txt: "",
  email_txt: "",
  job_title_txt: "",
  agency_unit_uid: "",
  primary_service_site_uid: "",
  role_bundle_uid: "",
};

const initialUnit = {
  unit_name: "",
  unit_code: "",
  unit_type_cd: "DIVISION",
  parent_agency_unit_uid: "",
};

const initialSite = {
  site_name: "",
  site_code: "",
  site_type_cd: "OFFICE",
  agency_unit_uid: "",
  address_txt: "",
  contact_txt: "",
  cashiering_enabled_bool: false,
};

const initialReference = {
  class_set_uid: "",
  class_value_name: "",
  class_value_cd: "",
  display_order_no: 0,
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("staff");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [overview, setOverview] = useState(null);
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [units, setUnits] = useState([]);
  const [sites, setSites] = useState([]);
  const [referenceSets, setReferenceSets] = useState([]);
  const [referenceValues, setReferenceValues] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [accessEvents, setAccessEvents] = useState([]);
  const [staffForm, setStaffForm] = useState(initialStaff);
  const [unitForm, setUnitForm] = useState(initialUnit);
  const [siteForm, setSiteForm] = useState(initialSite);
  const [referenceForm, setReferenceForm] = useState(initialReference);

  const selectedReferenceSet = useMemo(
    () => referenceSets.find((set) => set.class_set_uid === referenceForm.class_set_uid),
    [referenceForm.class_set_uid, referenceSets]
  );

  async function load() {
    setLoading(true);
    const [overviewPayload, staffPayload, rolesPayload, unitsPayload, sitesPayload, setsPayload, valuesPayload, auditPayload, accessPayload] =
      await Promise.all([
        apiRequest("/api/admin/overview"),
        apiRequest("/api/admin/staff?pageSize=40"),
        apiRequest("/api/admin/roles"),
        apiRequest("/api/admin/agency-units"),
        apiRequest("/api/admin/service-sites"),
        apiRequest("/api/admin/reference-sets"),
        apiRequest("/api/admin/reference-values"),
        apiRequest("/api/admin/audit-events?pageSize=30"),
        apiRequest("/api/admin/access-events?pageSize=30"),
      ]);

    setOverview(overviewPayload.overview);
    setStaff(staffPayload.rows || []);
    setRoles(rolesPayload.roles || []);
    setUnits(unitsPayload.agency_units || []);
    setSites(sitesPayload.service_sites || []);
    setReferenceSets(setsPayload.reference_sets || []);
    setReferenceValues(valuesPayload.reference_values || []);
    setAuditEvents(auditPayload.rows || []);
    setAccessEvents(accessPayload.rows || []);
    setLoading(false);
  }

  useEffect(() => {
    void load().catch((loadError) => {
      setError(loadError.message);
      setLoading(false);
    });
  }, []);

  async function submit(endpoint, body, reset, message) {
    setError("");
    setSuccess("");
    try {
      const payload = await apiRequest(endpoint, { method: "POST", body });
      reset();
      await load();
      const temporaryPassword = payload.staff_user?.temporary_password;
      setSuccess(temporaryPassword ? `${message}. Temporary password: ${temporaryPassword}` : message);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  const staffColumns = [
    { key: "full_name_txt", label: "Name" },
    { key: "work_email_txt", label: "Email" },
    { key: "job_title_txt", label: "Position" },
    { key: "unit_name", label: "Unit" },
    {
      key: "roles",
      label: "Roles",
      render: (row) => row.roles?.map((role) => role.role_name).join(", ") || "-",
    },
    {
      key: "account_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={row.account_state_cd === "ACTIVE" ? "success" : "warning"}>{compactCode(row.account_state_cd)}</StatusPill>,
    },
  ];

  const roleColumns = [
    { key: "role_name", label: "Role" },
    { key: "role_type_cd", label: "Type", render: (row) => compactCode(row.role_type_cd) },
    { key: "member_count", label: "Members", render: (row) => formatNumber(row.member_count) },
    { key: "grant_count", label: "Grants", render: (row) => formatNumber(row.grant_count) },
  ];

  const unitColumns = [
    { key: "unit_name", label: "Unit" },
    { key: "unit_code", label: "Code" },
    { key: "unit_type_cd", label: "Type", render: (row) => compactCode(row.unit_type_cd) },
    { key: "staff_count", label: "Staff", render: (row) => formatNumber(row.staff_count) },
    { key: "service_site_count", label: "Sites", render: (row) => formatNumber(row.service_site_count) },
  ];

  const siteColumns = [
    { key: "site_name", label: "Site" },
    { key: "site_type_cd", label: "Type", render: (row) => compactCode(row.site_type_cd) },
    { key: "unit_name", label: "Unit" },
    { key: "contact_txt", label: "Contact" },
  ];

  const referenceColumns = [
    { key: "class_set_code", label: "Set" },
    { key: "class_value_cd", label: "Code" },
    { key: "class_value_name", label: "Value" },
    { key: "display_order_no", label: "Order" },
  ];

  const auditColumns = [
    { key: "event_ts", label: "Time", render: (row) => formatDateTime(row.event_ts) },
    { key: "event_type_cd", label: "Event", render: (row) => compactCode(row.event_type_cd) },
    { key: "business_table_cd", label: "Record" },
    { key: "display_name_txt", label: "Officer" },
  ];

  const accessColumns = [
    { key: "event_ts", label: "Time", render: (row) => formatDateTime(row.event_ts) },
    { key: "event_type_cd", label: "Event", render: (row) => compactCode(row.event_type_cd) },
    {
      key: "success_bool",
      label: "Result",
      render: (row) => <StatusPill tone={row.success_bool ? "success" : "danger"}>{row.success_bool ? "Success" : "Failed"}</StatusPill>,
    },
    { key: "display_name_txt", label: "Officer" },
  ];

  return (
    <section className="page-stack">
      <PageHeader eyebrow="System administration" title="Access, Structure And Audit" status={loading ? "Loading" : "Active"} tone={loading ? "warning" : "success"} />

      <div className="metric-grid">
        <MetricTile icon={UsersRound} label="Staff users" value={formatNumber(overview?.staff_count)} />
        <MetricTile icon={ShieldCheck} label="Roles" value={formatNumber(overview?.role_count)} />
        <MetricTile icon={Building2} label="Agency units" value={formatNumber(overview?.agency_unit_count)} />
        <MetricTile icon={ClipboardList} label="Audit events 7d" value={formatNumber(overview?.audit_events_7d)} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "staff" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Staff user</span>
                <h2>Create Access</h2>
              </div>
              <KeyRound size={22} />
            </div>
            <form
              className="action-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit(
                  "/api/admin/staff",
                  {
                    ...staffForm,
                    agency_unit_uid: staffForm.agency_unit_uid || null,
                    primary_service_site_uid: staffForm.primary_service_site_uid || null,
                    role_bundle_uid: staffForm.role_bundle_uid || null,
                  },
                  () => setStaffForm(initialStaff),
                  "Staff account created"
                );
              }}
            >
              <Field label="Full name">
                <input required value={staffForm.full_name_txt} onChange={(event) => setStaffForm({ ...staffForm, full_name_txt: event.target.value })} />
              </Field>
              <Field label="Work email">
                <input required type="email" value={staffForm.email_txt} onChange={(event) => setStaffForm({ ...staffForm, email_txt: event.target.value })} />
              </Field>
              <Field label="Position">
                <input value={staffForm.job_title_txt} onChange={(event) => setStaffForm({ ...staffForm, job_title_txt: event.target.value })} />
              </Field>
              <SelectField label="Agency unit" value={staffForm.agency_unit_uid} onChange={(value) => setStaffForm({ ...staffForm, agency_unit_uid: value })}>
                <option value="">Unassigned</option>
                {units.map((unit) => (
                  <option key={unit.agency_unit_uid} value={unit.agency_unit_uid}>
                    {unit.unit_name}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Service site" value={staffForm.primary_service_site_uid} onChange={(value) => setStaffForm({ ...staffForm, primary_service_site_uid: value })}>
                <option value="">Unassigned</option>
                {sites.map((site) => (
                  <option key={site.service_site_uid} value={site.service_site_uid}>
                    {site.site_name}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Role" value={staffForm.role_bundle_uid} onChange={(value) => setStaffForm({ ...staffForm, role_bundle_uid: value })}>
                <option value="">No role</option>
                {roles.map((role) => (
                  <option key={role.role_bundle_uid} value={role.role_bundle_uid}>
                    {role.role_name}
                  </option>
                ))}
              </SelectField>
              <button className="primary-button" type="submit">Create staff account</button>
            </form>
          </section>

          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Directory</span>
                <h2>Staff And Roles</h2>
              </div>
            </div>
            <div className="split-list">
              <DataTable columns={staffColumns} rows={staff} keyField="staff_uid" empty="No staff records" />
              <DataTable columns={roleColumns} rows={roles} keyField="role_bundle_uid" empty="No roles" />
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "organisation" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Agency unit</span>
                <h2>Create Unit</h2>
              </div>
            </div>
            <form
              className="action-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit(
                  "/api/admin/agency-units",
                  { ...unitForm, parent_agency_unit_uid: unitForm.parent_agency_unit_uid || null },
                  () => setUnitForm(initialUnit),
                  "Agency unit created"
                );
              }}
            >
              <Field label="Unit name">
                <input required value={unitForm.unit_name} onChange={(event) => setUnitForm({ ...unitForm, unit_name: event.target.value })} />
              </Field>
              <Field label="Unit code">
                <input value={unitForm.unit_code} onChange={(event) => setUnitForm({ ...unitForm, unit_code: event.target.value })} />
              </Field>
              <Field label="Unit type">
                <input required value={unitForm.unit_type_cd} onChange={(event) => setUnitForm({ ...unitForm, unit_type_cd: event.target.value.toUpperCase() })} />
              </Field>
              <SelectField label="Parent unit" value={unitForm.parent_agency_unit_uid} onChange={(value) => setUnitForm({ ...unitForm, parent_agency_unit_uid: value })}>
                <option value="">Root</option>
                {units.map((unit) => (
                  <option key={unit.agency_unit_uid} value={unit.agency_unit_uid}>
                    {unit.unit_name}
                  </option>
                ))}
              </SelectField>
              <button className="primary-button" type="submit">Create unit</button>
            </form>

            <hr />

            <form
              className="action-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit(
                  "/api/admin/service-sites",
                  { ...siteForm, agency_unit_uid: siteForm.agency_unit_uid || null },
                  () => setSiteForm(initialSite),
                  "Service site created"
                );
              }}
            >
              <Field label="Site name">
                <input required value={siteForm.site_name} onChange={(event) => setSiteForm({ ...siteForm, site_name: event.target.value })} />
              </Field>
              <Field label="Site code">
                <input value={siteForm.site_code} onChange={(event) => setSiteForm({ ...siteForm, site_code: event.target.value })} />
              </Field>
              <Field label="Site type">
                <input required value={siteForm.site_type_cd} onChange={(event) => setSiteForm({ ...siteForm, site_type_cd: event.target.value.toUpperCase() })} />
              </Field>
              <SelectField label="Agency unit" value={siteForm.agency_unit_uid} onChange={(value) => setSiteForm({ ...siteForm, agency_unit_uid: value })}>
                <option value="">Unassigned</option>
                {units.map((unit) => (
                  <option key={unit.agency_unit_uid} value={unit.agency_unit_uid}>
                    {unit.unit_name}
                  </option>
                ))}
              </SelectField>
              <Field label="Address">
                <textarea value={siteForm.address_txt} onChange={(event) => setSiteForm({ ...siteForm, address_txt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit">Create service site</button>
            </form>
          </section>

          <section className="content-band">
            <DataTable columns={unitColumns} rows={units} keyField="agency_unit_uid" empty="No agency units" />
            <br />
            <DataTable columns={siteColumns} rows={sites} keyField="service_site_uid" empty="No service sites" />
          </section>
        </div>
      ) : null}

      {activeTab === "reference" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Reference set</span>
                <h2>{selectedReferenceSet?.class_set_name || "Create Value"}</h2>
              </div>
            </div>
            <form
              className="action-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit("/api/admin/reference-values", referenceForm, () => setReferenceForm(initialReference), "Reference value created");
              }}
            >
              <SelectField label="Set" required value={referenceForm.class_set_uid} onChange={(value) => setReferenceForm({ ...referenceForm, class_set_uid: value })}>
                <option value="">Select set</option>
                {referenceSets.map((set) => (
                  <option key={set.class_set_uid} value={set.class_set_uid}>
                    {set.class_set_code}
                  </option>
                ))}
              </SelectField>
              <Field label="Value name">
                <input required value={referenceForm.class_value_name} onChange={(event) => setReferenceForm({ ...referenceForm, class_value_name: event.target.value })} />
              </Field>
              <Field label="Value code">
                <input value={referenceForm.class_value_cd} onChange={(event) => setReferenceForm({ ...referenceForm, class_value_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Display order">
                <input type="number" value={referenceForm.display_order_no} onChange={(event) => setReferenceForm({ ...referenceForm, display_order_no: Number(event.target.value) })} />
              </Field>
              <button className="primary-button" type="submit">Create reference value</button>
            </form>
          </section>
          <section className="content-band">
            <DataTable columns={referenceColumns} rows={referenceValues} keyField="class_value_uid" empty="No reference values" />
          </section>
        </div>
      ) : null}

      {activeTab === "audit" ? (
        <div className="module-workbench module-workbench--wide">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Audit events</span>
                <h2>Business Record Activity</h2>
              </div>
            </div>
            <DataTable columns={auditColumns} rows={auditEvents} keyField="audit_event_uid" empty="No audit events" />
          </section>
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Access events</span>
                <h2>Session Activity</h2>
              </div>
            </div>
            <DataTable columns={accessColumns} rows={accessEvents} keyField="access_event_uid" empty="No access events" />
          </section>
        </div>
      ) : null}
    </section>
  );
}
