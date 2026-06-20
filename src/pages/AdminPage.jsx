import {
  Activity,
  AlertTriangle,
  AtSign,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Eye,
  KeyRound,
  MailCheck,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  UsersRound,
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
import { compactCode, formatDateTime, formatNumber } from "../utils/format.js";

const tabs = [
  { id: "activation", label: "Staff Activation" },
  { id: "roles", label: "Role Verification" },
  { id: "audit", label: "Security Audit" },
  { id: "organisation", label: "Agency Structure" },
  { id: "reference", label: "Reference Values" },
];

const initialStaff = {
  full_name_txt: "",
  email_txt: "",
  job_title_txt: "",
  agency_unit_uid: "",
  primary_service_site_uid: "",
  role_bundle_uid: "",
  temporary_password: "",
  confirm_password: "",
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

function renderRoles(row) {
  const roles = row.roles || [];
  if (!roles.length) return "-";

  return (
    <div className="chip-list">
      {roles.slice(0, 3).map((role) => (
        <span className="soft-chip" key={role.role_membership_uid || role.role_bundle_uid}>
          {role.role_name}
        </span>
      ))}
      {roles.length > 3 ? <span className="soft-chip">+{roles.length - 3}</span> : null}
    </div>
  );
}

function passwordRulesMet(value) {
  return value.length >= 12 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value);
}

function getRiskTone(flag) {
  if (flag.tone === "danger") return "danger";
  if (flag.tone === "warning") return "warning";
  return "neutral";
}

function RoleRiskFlags({ flags = [] }) {
  if (!flags.length) {
    return <StatusPill tone="success">Balanced</StatusPill>;
  }

  return (
    <div className="chip-list">
      {flags.map((flag) => (
        <StatusPill tone={getRiskTone(flag)} key={flag.code}>
          {flag.label}
        </StatusPill>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("activation");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [overview, setOverview] = useState(null);
  const [staff, setStaff] = useState([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [selectedStaffActorUid, setSelectedStaffActorUid] = useState("");
  const [roles, setRoles] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [roleSearch, setRoleSearch] = useState("");
  const [selectedRoleUid, setSelectedRoleUid] = useState("");
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
  const [accountForm, setAccountForm] = useState({ email_txt: "", account_state_cd: "ACTIVE" });
  const [resetForm, setResetForm] = useState({ temporary_password: "", confirm_password: "" });

  const selectedStaff = useMemo(
    () => staff.find((item) => item.actor_uid === selectedStaffActorUid) || staff[0] || null,
    [selectedStaffActorUid, staff]
  );

  const selectedReferenceSet = useMemo(
    () => referenceSets.find((set) => set.class_set_uid === referenceForm.class_set_uid),
    [referenceForm.class_set_uid, referenceSets]
  );

  const filteredRolePermissions = useMemo(() => {
    const term = roleSearch.trim().toLowerCase();
    if (!term) return rolePermissions;
    return rolePermissions.filter((role) =>
      [role.role_name, role.role_code, role.role_type_cd, role.source_channel_cd].some((value) =>
        String(value || "").toLowerCase().includes(term)
      )
    );
  }, [rolePermissions, roleSearch]);

  const selectedRole = useMemo(
    () =>
      rolePermissions.find((role) => role.role_bundle_uid === selectedRoleUid) ||
      filteredRolePermissions[0] ||
      rolePermissions[0] ||
      null,
    [filteredRolePermissions, rolePermissions, selectedRoleUid]
  );

  useEffect(() => {
    if (!selectedStaff) return;
    setSelectedStaffActorUid(selectedStaff.actor_uid);
    setAccountForm({
      email_txt: selectedStaff.email_txt || selectedStaff.work_email_txt || "",
      account_state_cd: selectedStaff.account_state_cd || "ACTIVE",
    });
    setResetForm({ temporary_password: "", confirm_password: "" });
  }, [selectedStaff?.actor_uid]);

  async function load(searchTerm = staffSearch) {
    setLoading(true);
    const staffQuery = searchTerm.trim() ? `&q=${encodeURIComponent(searchTerm.trim())}` : "";
    const [
      overviewPayload,
      staffPayload,
      rolesPayload,
      rolePermissionsPayload,
      unitsPayload,
      sitesPayload,
      setsPayload,
      valuesPayload,
      auditPayload,
      accessPayload,
    ] = await Promise.all([
      apiRequest("/api/admin/overview"),
      apiRequest(`/api/admin/staff?pageSize=100${staffQuery}`),
      apiRequest("/api/admin/roles"),
      apiRequest("/api/admin/role-permissions"),
      apiRequest("/api/admin/agency-units"),
      apiRequest("/api/admin/service-sites"),
      apiRequest("/api/admin/reference-sets"),
      apiRequest("/api/admin/reference-values"),
      apiRequest("/api/admin/audit-events?pageSize=40"),
      apiRequest("/api/admin/access-events?pageSize=40"),
    ]);

    const nextStaff = staffPayload.rows || [];
    const nextRolePermissions = rolePermissionsPayload.roles || [];
    setOverview(overviewPayload.overview);
    setStaff(nextStaff);
    setRoles(rolesPayload.roles || []);
    setRolePermissions(nextRolePermissions);
    setUnits(unitsPayload.agency_units || []);
    setSites(sitesPayload.service_sites || []);
    setReferenceSets(setsPayload.reference_sets || []);
    setReferenceValues(valuesPayload.reference_values || []);
    setAuditEvents(auditPayload.rows || []);
    setAccessEvents(accessPayload.rows || []);
    setSelectedStaffActorUid((current) => current || nextStaff[0]?.actor_uid || "");
    setSelectedRoleUid((current) => current || nextRolePermissions[0]?.role_bundle_uid || "");
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
      await apiRequest(endpoint, { method: "POST", body });
      reset();
      await load();
      setSuccess(message);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function createStaffAccount(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (staffForm.temporary_password !== staffForm.confirm_password || !passwordRulesMet(staffForm.temporary_password)) {
      setError("Temporary password must match and contain 12 characters, uppercase, lowercase, and a number.");
      return;
    }

    await submit(
      "/api/admin/staff",
      {
        ...staffForm,
        agency_unit_uid: staffForm.agency_unit_uid || null,
        primary_service_site_uid: staffForm.primary_service_site_uid || null,
        role_bundle_uid: staffForm.role_bundle_uid || null,
        confirm_password: undefined,
      },
      () => setStaffForm(initialStaff),
      "Staff account created and marked for first-login activation."
    );
  }

  async function updateSelectedAccount(event) {
    event.preventDefault();
    if (!selectedStaff) return;

    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/admin/staff/${selectedStaff.actor_uid}/account`, {
        method: "PATCH",
        body: accountForm,
      });
      await load();
      setSuccess("Staff account details updated.");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function resetSelectedPassword(event) {
    event.preventDefault();
    if (!selectedStaff) return;

    setError("");
    setSuccess("");
    if (resetForm.temporary_password !== resetForm.confirm_password || !passwordRulesMet(resetForm.temporary_password)) {
      setError("Temporary password must match and contain 12 characters, uppercase, lowercase, and a number.");
      return;
    }

    try {
      await apiRequest(`/api/admin/staff/${selectedStaff.actor_uid}/reset-password`, {
        method: "POST",
        body: { temporary_password: resetForm.temporary_password },
      });
      setResetForm({ temporary_password: "", confirm_password: "" });
      await load();
      setSuccess("Temporary password recorded. The staff member must change it on next login.");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  const staffColumns = [
    { key: "username_txt", label: "Username" },
    { key: "full_name_txt", label: "Full name" },
    {
      key: "roles",
      label: "Role memberships",
      render: renderRoles,
    },
    {
      key: "account_state_cd",
      label: "Status",
      render: (row) => <StatusPill tone={row.account_state_cd === "ACTIVE" ? "success" : "warning"}>{compactCode(row.account_state_cd)}</StatusPill>,
    },
    {
      key: "last_login_ts",
      label: "Last login",
      render: (row) => (row.last_login_ts ? formatDateTime(row.last_login_ts) : "Not yet"),
    },
    {
      key: "password_reset_required_bool",
      label: "Password reset",
      render: (row) => (
        <StatusPill tone={row.password_reset_required_bool ? "warning" : "success"}>
          {row.password_reset_required_bool ? "Required" : "Complete"}
        </StatusPill>
      ),
    },
  ];

  const roleColumns = [
    { key: "role_name", label: "Role" },
    { key: "role_type_cd", label: "Type", render: (row) => compactCode(row.role_type_cd) },
    { key: "member_count", label: "Members", render: (row) => formatNumber(row.member_count) },
    {
      key: "grant_count",
      label: "Grants",
      render: (row) => (
        <span className={row.wildcard_grant_count > 0 || row.grant_count >= 40 ? "risk-number" : ""}>
          {formatNumber(row.grant_count)}
        </span>
      ),
    },
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
    { key: "action_cd", label: "Action", render: (row) => compactCode(row.action_cd) },
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
    { key: "ip_address_txt", label: "IP address" },
  ];

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="System administration"
        title="Access Governance"
        status={loading ? "Loading" : "Controlled"}
        tone={loading ? "warning" : "success"}
      />

      <div className="metric-grid">
        <MetricTile icon={UsersRound} label="Staff users" value={formatNumber(overview?.staff_count)} />
        <MetricTile icon={KeyRound} label="Password resets" value={formatNumber(overview?.password_reset_required_count)} />
        <MetricTile icon={AtSign} label="Email capture" value={formatNumber(overview?.placeholder_email_count)} sublabel="placeholder addresses" />
        <MetricTile icon={ShieldCheck} label="Roles" value={formatNumber(overview?.role_count)} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "activation" ? (
        <div className="security-grid">
          <section className="content-band security-grid__directory">
            <div className="section-heading">
              <div>
                <span>Activation queue</span>
                <h2>Staff Accounts</h2>
              </div>
              <UserCog size={22} />
            </div>

            <form
              className="toolbar-form"
              onSubmit={(event) => {
                event.preventDefault();
                void load(staffSearch).catch((loadError) => setError(loadError.message));
              }}
            >
              <Field label="Search staff">
                <input
                  value={staffSearch}
                  onChange={(event) => setStaffSearch(event.target.value)}
                  placeholder="Name, username, email or staff number"
                />
              </Field>
              <button className="secondary-button" type="submit">
                <Eye size={17} />
                <span>Review</span>
              </button>
            </form>

            <DataTable
              columns={staffColumns}
              rows={staff}
              keyField="staff_uid"
              empty="No staff accounts"
              selectedKey={selectedStaff?.staff_uid}
              onRowClick={(row) => setSelectedStaffActorUid(row.actor_uid)}
            />
          </section>

          <aside className="content-band security-grid__detail">
            <div className="section-heading">
              <div>
                <span>Selected account</span>
                <h2>{selectedStaff?.full_name_txt || "No staff selected"}</h2>
              </div>
              {selectedStaff?.password_reset_required_bool ? (
                <StatusPill tone="warning">Activation pending</StatusPill>
              ) : (
                <StatusPill tone="success">Activated</StatusPill>
              )}
            </div>

            {selectedStaff ? (
              <>
                <div className="account-governance-card">
                  <div>
                    <span>Username</span>
                    <strong>{selectedStaff.username_txt}</strong>
                  </div>
                  <div>
                    <span>Official email</span>
                    <strong>{selectedStaff.email_is_placeholder_bool ? "Capture required" : selectedStaff.email_txt}</strong>
                  </div>
                  <div>
                    <span>Roles</span>
                    <strong>{selectedStaff.roles?.length || 0} active</strong>
                  </div>
                  <div>
                    <span>Last login</span>
                    <strong>{selectedStaff.last_login_ts ? formatDateTime(selectedStaff.last_login_ts) : "Not yet"}</strong>
                  </div>
                </div>

                {selectedStaff.email_is_placeholder_bool ? (
                  <div className="security-callout">
                    <AlertTriangle size={18} />
                    <span>Replace the imported placeholder email before enabling email verification or MFA notifications.</span>
                  </div>
                ) : null}

                <form className="stacked-form" onSubmit={updateSelectedAccount}>
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Email and status</span>
                      <h2>Account Details</h2>
                    </div>
                    <MailCheck size={20} />
                  </div>
                  <Field label="Official email">
                    <input
                      type="email"
                      value={accountForm.email_txt}
                      onChange={(event) => setAccountForm((current) => ({ ...current, email_txt: event.target.value }))}
                      required
                    />
                  </Field>
                  <SelectField
                    label="Account status"
                    value={accountForm.account_state_cd}
                    onChange={(value) => setAccountForm((current) => ({ ...current, account_state_cd: value }))}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="LOCKED">Locked</option>
                    <option value="INACTIVE">Inactive</option>
                  </SelectField>
                  <button className="primary-button" type="submit">Update account</button>
                </form>

                <form className="stacked-form" onSubmit={resetSelectedPassword}>
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Credential control</span>
                      <h2>Issue Temporary Password</h2>
                    </div>
                    <RotateCw size={20} />
                  </div>
                  <Field label="Temporary password">
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={resetForm.temporary_password}
                      onChange={(event) => setResetForm((current) => ({ ...current, temporary_password: event.target.value }))}
                      required
                    />
                  </Field>
                  <Field label="Confirm temporary password">
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={resetForm.confirm_password}
                      onChange={(event) => setResetForm((current) => ({ ...current, confirm_password: event.target.value }))}
                      required
                    />
                  </Field>
                  <p className="form-note">The value is never displayed back by MORIS. The user must change it after signing in.</p>
                  <button className="primary-button" type="submit">Force password change</button>
                </form>
              </>
            ) : (
              <div className="empty-panel">Select a staff account to review activation controls.</div>
            )}
          </aside>

          <section className="content-band security-grid__create">
            <div className="section-heading">
              <div>
                <span>Staff user</span>
                <h2>Create Access</h2>
              </div>
              <KeyRound size={22} />
            </div>
            <form className="action-form" onSubmit={createStaffAccount}>
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
              <Field label="Temporary password">
                <input
                  type="password"
                  autoComplete="new-password"
                  value={staffForm.temporary_password}
                  onChange={(event) => setStaffForm({ ...staffForm, temporary_password: event.target.value })}
                  required
                />
              </Field>
              <Field label="Confirm temporary password">
                <input
                  type="password"
                  autoComplete="new-password"
                  value={staffForm.confirm_password}
                  onChange={(event) => setStaffForm({ ...staffForm, confirm_password: event.target.value })}
                  required
                />
              </Field>
              <button className="primary-button" type="submit">Create staff account</button>
            </form>
          </section>
        </div>
      ) : null}

      {activeTab === "roles" ? (
        <div className="role-verification-grid">
          <section className="content-band role-verification-grid__list">
            <div className="section-heading">
              <div>
                <span>Role catalogue</span>
                <h2>Permission Review</h2>
              </div>
              <ShieldAlert size={22} />
            </div>
            <Field label="Filter roles">
              <input value={roleSearch} onChange={(event) => setRoleSearch(event.target.value)} placeholder="Role, source, type" />
            </Field>
            <div className="role-review-list">
              {filteredRolePermissions.map((role) => (
                <button
                  className={selectedRole?.role_bundle_uid === role.role_bundle_uid ? "role-review-card is-active" : "role-review-card"}
                  key={role.role_bundle_uid}
                  type="button"
                  onClick={() => setSelectedRoleUid(role.role_bundle_uid)}
                >
                  <span>{compactCode(role.role_type_cd)}</span>
                  <strong>{role.role_name}</strong>
                  <small>{formatNumber(role.grants?.length)} grants | {formatNumber(role.member_count)} members</small>
                  <RoleRiskFlags flags={role.risk_flags} />
                </button>
              ))}
            </div>
          </section>

          <section className="content-band role-verification-grid__detail">
            {selectedRole ? (
              <>
                <div className="section-heading">
                  <div>
                    <span>{selectedRole.role_code}</span>
                    <h2>{selectedRole.role_name}</h2>
                  </div>
                  <RoleRiskFlags flags={selectedRole.risk_flags} />
                </div>
                <div className="permission-summary-grid">
                  <MetricTile icon={UsersRound} label="Members" value={formatNumber(selectedRole.member_count)} />
                  <MetricTile icon={KeyRound} label="Grants" value={formatNumber(selectedRole.grants?.length)} />
                  <MetricTile icon={Activity} label="Modules" value={formatNumber(selectedRole.module_summary?.length)} />
                </div>
                <div className="permission-module-list">
                  {selectedRole.module_summary?.map((module) => (
                    <article className="permission-module-card" key={module.resource_cd}>
                      <div>
                        <span>Resource</span>
                        <strong>{module.resource_cd === "*" ? "All system resources" : compactCode(module.resource_cd)}</strong>
                      </div>
                      <div>
                        <span>Actions</span>
                        <div className="chip-list">
                          {module.actions.map((action) => (
                            <span className="soft-chip" key={action}>{action === "*" ? "All actions" : compactCode(action)}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span>Scope</span>
                        <div className="chip-list">
                          {module.scopes.map((scope) => (
                            <span className="soft-chip" key={scope}>{compactCode(scope)}</span>
                          ))}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-panel">No role permissions are available.</div>
            )}
          </section>

          <section className="content-band role-verification-grid__table">
            <div className="section-heading">
              <div>
                <span>All roles</span>
                <h2>Grant Density</h2>
              </div>
            </div>
            <DataTable columns={roleColumns} rows={roles} keyField="role_bundle_uid" empty="No roles" />
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
              <ClipboardList size={22} />
            </div>
            <DataTable columns={auditColumns} rows={auditEvents} keyField="audit_event_uid" empty="No audit events" />
          </section>
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Access events</span>
                <h2>Authentication Activity</h2>
              </div>
              <Clock3 size={22} />
            </div>
            <DataTable columns={accessColumns} rows={accessEvents} keyField="access_event_uid" empty="No access events" />
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
              <Building2 size={22} />
            </div>
            <form
              className="action-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit(
                  "/api/admin/agency-units",
                  { ...unitForm, parent_agency_unit_uid: unitForm.parent_agency_unit_uid || null },
                  () => setUnitForm(initialUnit),
                  "Agency unit created."
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
                  "Service site created."
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
                void submit("/api/admin/reference-values", referenceForm, () => setReferenceForm(initialReference), "Reference value created.");
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
    </section>
  );
}
