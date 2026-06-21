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

const initialProfileForm = {
  staff_no: "",
  full_name_txt: "",
  work_email_txt: "",
  job_title_txt: "",
  agency_unit_uid: "",
  primary_service_site_uid: "",
  employment_state_cd: "ACTIVE",
  start_dt: "",
  end_dt: "",
  reason_txt: "",
};

const initialAssignmentForm = {
  agency_unit_uid: "",
  role_bundle_uid: "",
  assignment_type_cd: "PRIMARY",
  delegation_level_cd: "",
  workload_weight_no: "",
  effective_from_dt: "",
  effective_to_dt: "",
  reason_txt: "",
};

const initialRoleForm = {
  role_code: "",
  role_name: "",
  role_type_cd: "BUSINESS",
  description_txt: "",
  reason_txt: "",
};

const initialGrantForm = {
  resource_cd: "",
  action_cd: "read",
  data_scope_cd: "UNIT",
  is_allowed_bool: true,
  reason_txt: "",
};

const initialMembershipForm = {
  actor_uid: "",
  role_bundle_uid: "",
  agency_unit_uid: "",
  subject_uid: "",
  effective_from_dt: "",
  effective_to_dt: "",
  reason_txt: "",
};

const initialSegregationForm = {
  rule_code: "",
  rule_name: "",
  restricted_role_uid: "",
  conflicting_role_uid: "",
  restricted_action_cd: "approve",
  reason_txt: "",
};

const initialReferenceSetForm = {
  class_set_code: "",
  class_set_name: "",
  owner_schema_code: "ref",
  description_txt: "",
  effective_from_dt: "",
  effective_to_dt: "",
};

const initialReferenceRegistryForm = {
  currency_cd: "",
  currency_name: "",
  language_cd: "",
  language_name: "",
  geo_type_cd: "",
  geo_code: "",
  geo_name: "",
  iso_code: "",
  reason_txt: "",
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
  const [roleMemberships, setRoleMemberships] = useState([]);
  const [staffAssignments, setStaffAssignments] = useState([]);
  const [segregationRules, setSegregationRules] = useState([]);
  const [units, setUnits] = useState([]);
  const [sites, setSites] = useState([]);
  const [referenceSets, setReferenceSets] = useState([]);
  const [referenceValues, setReferenceValues] = useState([]);
  const [referenceRegistries, setReferenceRegistries] = useState({ currencies: [], languages: [], geographies: [] });
  const [auditEvents, setAuditEvents] = useState([]);
  const [accessEvents, setAccessEvents] = useState([]);
  const [staffForm, setStaffForm] = useState(initialStaff);
  const [unitForm, setUnitForm] = useState(initialUnit);
  const [siteForm, setSiteForm] = useState(initialSite);
  const [referenceForm, setReferenceForm] = useState(initialReference);
  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [assignmentForm, setAssignmentForm] = useState(initialAssignmentForm);
  const [roleForm, setRoleForm] = useState(initialRoleForm);
  const [grantForm, setGrantForm] = useState(initialGrantForm);
  const [membershipForm, setMembershipForm] = useState(initialMembershipForm);
  const [segregationForm, setSegregationForm] = useState(initialSegregationForm);
  const [referenceSetForm, setReferenceSetForm] = useState(initialReferenceSetForm);
  const [referenceRegistryForm, setReferenceRegistryForm] = useState(initialReferenceRegistryForm);
  const [selectedMembershipUid, setSelectedMembershipUid] = useState("");
  const [selectedAssignmentUid, setSelectedAssignmentUid] = useState("");
  const [selectedUnitUid, setSelectedUnitUid] = useState("");
  const [selectedSiteUid, setSelectedSiteUid] = useState("");
  const [selectedReferenceValueUid, setSelectedReferenceValueUid] = useState("");
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

  const selectedMembership = useMemo(
    () => roleMemberships.find((item) => item.role_membership_uid === selectedMembershipUid) || roleMemberships[0] || null,
    [roleMemberships, selectedMembershipUid]
  );

  const selectedAssignment = useMemo(
    () => staffAssignments.find((item) => item.staff_assignment_uid === selectedAssignmentUid) || staffAssignments[0] || null,
    [staffAssignments, selectedAssignmentUid]
  );

  const selectedUnit = useMemo(
    () => units.find((item) => item.agency_unit_uid === selectedUnitUid) || units[0] || null,
    [units, selectedUnitUid]
  );

  const selectedSite = useMemo(
    () => sites.find((item) => item.service_site_uid === selectedSiteUid) || sites[0] || null,
    [sites, selectedSiteUid]
  );

  const selectedReferenceValue = useMemo(
    () => referenceValues.find((item) => item.class_value_uid === selectedReferenceValueUid) || referenceValues[0] || null,
    [referenceValues, selectedReferenceValueUid]
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
    setProfileForm({
      staff_no: selectedStaff.staff_no || "",
      full_name_txt: selectedStaff.full_name_txt || "",
      work_email_txt: selectedStaff.work_email_txt || selectedStaff.email_txt || "",
      job_title_txt: selectedStaff.job_title_txt || "",
      agency_unit_uid: selectedStaff.agency_unit_uid || "",
      primary_service_site_uid: selectedStaff.service_site_uid || "",
      employment_state_cd: selectedStaff.employment_state_cd || "ACTIVE",
      start_dt: selectedStaff.start_dt || "",
      end_dt: selectedStaff.end_dt || "",
      reason_txt: "",
    });
    setMembershipForm((current) => ({ ...current, actor_uid: selectedStaff.actor_uid }));
    setResetForm({ temporary_password: "", confirm_password: "" });
  }, [selectedStaff?.actor_uid]);

  useEffect(() => {
    if (!selectedRole) return;
    setRoleForm({
      role_code: selectedRole.role_code || "",
      role_name: selectedRole.role_name || "",
      role_type_cd: selectedRole.role_type_cd || "BUSINESS",
      description_txt: selectedRole.description_txt || "",
      reason_txt: "",
    });
    setGrantForm((current) => ({ ...current, resource_cd: "", reason_txt: "" }));
    setMembershipForm((current) => ({ ...current, role_bundle_uid: selectedRole.role_bundle_uid }));
  }, [selectedRole?.role_bundle_uid]);

  useEffect(() => {
    if (!selectedUnit) return;
    setSelectedUnitUid(selectedUnit.agency_unit_uid);
    setUnitForm({
      unit_name: selectedUnit.unit_name || "",
      unit_code: selectedUnit.unit_code || "",
      unit_type_cd: selectedUnit.unit_type_cd || "DIVISION",
      parent_agency_unit_uid: selectedUnit.parent_agency_unit_uid || "",
      manager_staff_uid: selectedUnit.manager_staff_uid || "",
      effective_to_dt: selectedUnit.effective_to_dt || "",
      reason_txt: "",
    });
  }, [selectedUnit?.agency_unit_uid]);

  useEffect(() => {
    if (!selectedSite) return;
    setSelectedSiteUid(selectedSite.service_site_uid);
    setSiteForm({
      site_name: selectedSite.site_name || "",
      site_code: selectedSite.site_code || "",
      site_type_cd: selectedSite.site_type_cd || "OFFICE",
      agency_unit_uid: selectedSite.agency_unit_uid || "",
      address_txt: selectedSite.address_txt || "",
      contact_txt: selectedSite.contact_txt || "",
      cashiering_enabled_bool: Boolean(selectedSite.cashiering_enabled_bool),
      reason_txt: "",
    });
  }, [selectedSite?.service_site_uid]);

  useEffect(() => {
    if (!selectedReferenceValue) return;
    setSelectedReferenceValueUid(selectedReferenceValue.class_value_uid);
    setReferenceForm({
      class_set_uid: selectedReferenceValue.class_set_uid || "",
      class_value_name: selectedReferenceValue.class_value_name || "",
      class_value_cd: selectedReferenceValue.class_value_cd || "",
      display_order_no: selectedReferenceValue.display_order_no || 0,
      effective_to_dt: selectedReferenceValue.effective_to_dt || "",
      reason_txt: "",
    });
  }, [selectedReferenceValue?.class_value_uid]);

  async function load(searchTerm = staffSearch) {
    setLoading(true);
    const staffQuery = searchTerm.trim() ? `&q=${encodeURIComponent(searchTerm.trim())}` : "";
    const [
      overviewPayload,
      staffPayload,
      rolesPayload,
      rolePermissionsPayload,
      membershipsPayload,
      assignmentsPayload,
      segregationPayload,
      unitsPayload,
      sitesPayload,
      setsPayload,
      valuesPayload,
      registriesPayload,
      auditPayload,
      accessPayload,
    ] = await Promise.all([
      apiRequest("/api/admin/overview"),
      apiRequest(`/api/admin/staff?pageSize=100${staffQuery}`),
      apiRequest("/api/admin/roles"),
      apiRequest("/api/admin/role-permissions"),
      apiRequest("/api/admin/role-memberships?pageSize=250"),
      apiRequest("/api/admin/staff-assignments?pageSize=250"),
      apiRequest("/api/admin/segregation-rules"),
      apiRequest("/api/admin/agency-units"),
      apiRequest("/api/admin/service-sites"),
      apiRequest("/api/admin/reference-sets"),
      apiRequest("/api/admin/reference-values"),
      apiRequest("/api/admin/reference-registries"),
      apiRequest("/api/admin/audit-events?pageSize=40"),
      apiRequest("/api/admin/access-events?pageSize=40"),
    ]);

    const nextStaff = staffPayload.rows || [];
    const nextRolePermissions = rolePermissionsPayload.roles || [];
    setOverview(overviewPayload.overview);
    setStaff(nextStaff);
    setRoles(rolesPayload.roles || []);
    setRolePermissions(nextRolePermissions);
    setRoleMemberships(membershipsPayload.rows || []);
    setStaffAssignments(assignmentsPayload.rows || []);
    setSegregationRules(segregationPayload.segregation_rules || []);
    setUnits(unitsPayload.agency_units || []);
    setSites(sitesPayload.service_sites || []);
    setReferenceSets(setsPayload.reference_sets || []);
    setReferenceValues(valuesPayload.reference_values || []);
    setReferenceRegistries({
      currencies: registriesPayload.currencies || [],
      languages: registriesPayload.languages || [],
      geographies: registriesPayload.geographies || [],
    });
    setAuditEvents(auditPayload.rows || []);
    setAccessEvents(accessPayload.rows || []);
    setSelectedStaffActorUid((current) => current || nextStaff[0]?.actor_uid || "");
    setSelectedRoleUid((current) => current || nextRolePermissions[0]?.role_bundle_uid || "");
    setSelectedMembershipUid((current) => current || membershipsPayload.rows?.[0]?.role_membership_uid || "");
    setSelectedAssignmentUid((current) => current || assignmentsPayload.rows?.[0]?.staff_assignment_uid || "");
    setSelectedUnitUid((current) => current || unitsPayload.agency_units?.[0]?.agency_unit_uid || "");
    setSelectedSiteUid((current) => current || sitesPayload.service_sites?.[0]?.service_site_uid || "");
    setSelectedReferenceValueUid((current) => current || valuesPayload.reference_values?.[0]?.class_value_uid || "");
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

  async function mutate(endpoint, method, body, message, afterSuccess) {
    setError("");
    setSuccess("");
    try {
      await apiRequest(endpoint, { method, body });
      if (afterSuccess) afterSuccess();
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

  function cleanBody(body) {
    return Object.fromEntries(
      Object.entries(body).map(([key, value]) => [key, value === "" ? null : value])
    );
  }

  async function updateSelectedProfile(event) {
    event.preventDefault();
    if (!selectedStaff) return;
    await mutate(
      `/api/admin/staff/${selectedStaff.actor_uid}/profile`,
      "PATCH",
      cleanBody(profileForm),
      "Staff profile updated with an audit reason."
    );
  }

  async function createSelectedAssignment(event) {
    event.preventDefault();
    if (!selectedStaff) return;
    await mutate(
      `/api/admin/staff/${selectedStaff.actor_uid}/assignments`,
      "POST",
      cleanBody(assignmentForm),
      "Staff assignment recorded.",
      () => setAssignmentForm(initialAssignmentForm)
    );
  }

  async function endSelectedAssignment() {
    if (!selectedAssignment || !assignmentForm.reason_txt) {
      setError("Select an assignment and enter a reason before ending it.");
      return;
    }
    await mutate(
      `/api/admin/staff-assignments/${selectedAssignment.staff_assignment_uid}/end`,
      "PATCH",
      cleanBody({ effective_to_dt: assignmentForm.effective_to_dt, reason_txt: assignmentForm.reason_txt }),
      "Staff assignment ended safely."
    );
  }

  async function saveSelectedRole(event) {
    event.preventDefault();
    if (!selectedRole) return;
    await mutate(`/api/admin/roles/${selectedRole.role_bundle_uid}`, "PATCH", cleanBody(roleForm), "Role bundle updated.");
  }

  async function createRole(event) {
    event.preventDefault();
    await mutate("/api/admin/roles", "POST", cleanBody(roleForm), "Role bundle created.", () => setRoleForm(initialRoleForm));
  }

  async function retireSelectedRole() {
    if (!selectedRole || !roleForm.reason_txt) {
      setError("Select a role and enter a reason before retiring it.");
      return;
    }
    await mutate(`/api/admin/roles/${selectedRole.role_bundle_uid}/retire`, "PATCH", { reason_txt: roleForm.reason_txt }, "Role bundle retired and active memberships expired.");
  }

  async function createGrant(event) {
    event.preventDefault();
    if (!selectedRole) return;
    await mutate(`/api/admin/roles/${selectedRole.role_bundle_uid}/grants`, "POST", cleanBody(grantForm), "Permission grant assigned.", () => setGrantForm(initialGrantForm));
  }

  async function retireGrant(grantUid) {
    if (!grantForm.reason_txt) {
      setError("Enter a reason in the permission grant form before revoking a grant.");
      return;
    }
    await mutate(`/api/admin/access-grants/${grantUid}/retire`, "PATCH", { reason_txt: grantForm.reason_txt }, "Permission grant revoked.");
  }

  async function assignRoleMembership(event) {
    event.preventDefault();
    await mutate("/api/admin/role-memberships", "POST", cleanBody(membershipForm), "Role membership assigned.", () => setMembershipForm(initialMembershipForm));
  }

  async function expireSelectedMembership() {
    if (!selectedMembership || !membershipForm.reason_txt) {
      setError("Select a membership and enter a reason before expiring it.");
      return;
    }
    await mutate(
      `/api/admin/role-memberships/${selectedMembership.role_membership_uid}/expire`,
      "PATCH",
      cleanBody({ effective_to_dt: membershipForm.effective_to_dt, reason_txt: membershipForm.reason_txt }),
      "Role membership expired."
    );
  }
  async function transferSelectedMembership() {
    if (!selectedMembership || !membershipForm.actor_uid || !membershipForm.reason_txt) {
      setError("Select a membership, target staff member, and reason before transferring it.");
      return;
    }
    await mutate(
      `/api/admin/role-memberships/${selectedMembership.role_membership_uid}/transfer`,
      "POST",
      cleanBody({
        target_actor_uid: membershipForm.actor_uid,
        role_bundle_uid: membershipForm.role_bundle_uid,
        agency_unit_uid: membershipForm.agency_unit_uid,
        subject_uid: membershipForm.subject_uid,
        transfer_dt: membershipForm.effective_from_dt,
        effective_to_dt: membershipForm.effective_to_dt,
        reason_txt: membershipForm.reason_txt,
      }),
      "Role membership transferred to the selected officer."
    );
  }

  async function createSegregationRule(event) {
    event.preventDefault();
    await mutate("/api/admin/segregation-rules", "POST", cleanBody(segregationForm), "Segregation-of-duty rule created.", () => setSegregationForm(initialSegregationForm));
  }

  async function updateSelectedUnit(event) {
    event.preventDefault();
    if (!selectedUnit) return;
    await mutate(`/api/admin/agency-units/${selectedUnit.agency_unit_uid}`, "PATCH", cleanBody(unitForm), "Agency unit corrected.");
  }

  async function deactivateSelectedUnit() {
    if (!selectedUnit || !unitForm.reason_txt) {
      setError("Select a unit and enter a reason before deactivating it.");
      return;
    }
    await mutate(
      `/api/admin/agency-units/${selectedUnit.agency_unit_uid}/deactivate`,
      "PATCH",
      cleanBody({ effective_to_dt: unitForm.effective_to_dt, reason_txt: unitForm.reason_txt }),
      "Agency unit deactivated."
    );
  }

  async function updateSelectedSite(event) {
    event.preventDefault();
    if (!selectedSite) return;
    await mutate(`/api/admin/service-sites/${selectedSite.service_site_uid}`, "PATCH", cleanBody(siteForm), "Service site corrected.");
  }

  async function deactivateSelectedSite() {
    if (!selectedSite || !siteForm.reason_txt) {
      setError("Select a site and enter a reason before deactivating it.");
      return;
    }
    await mutate(`/api/admin/service-sites/${selectedSite.service_site_uid}/deactivate`, "PATCH", { reason_txt: siteForm.reason_txt }, "Service site deactivated.");
  }

  async function createReferenceSet(event) {
    event.preventDefault();
    await mutate("/api/admin/reference-sets", "POST", cleanBody(referenceSetForm), "Reference set created.", () => setReferenceSetForm(initialReferenceSetForm));
  }

  async function updateSelectedReferenceValue(event) {
    event.preventDefault();
    if (!selectedReferenceValue) return;
    await mutate(`/api/admin/reference-values/${selectedReferenceValue.class_value_uid}`, "PATCH", cleanBody(referenceForm), "Reference value corrected.");
  }

  async function retireSelectedReferenceValue() {
    if (!selectedReferenceValue || !referenceForm.reason_txt) {
      setError("Select a reference value and enter a reason before retiring it.");
      return;
    }
    await mutate(
      `/api/admin/reference-values/${selectedReferenceValue.class_value_uid}/retire`,
      "PATCH",
      cleanBody({ effective_to_dt: referenceForm.effective_to_dt, reason_txt: referenceForm.reason_txt }),
      "Reference value retired."
    );
  }

  async function createCurrencyRegistry() {
    await mutate(
      "/api/admin/reference-registries/currencies",
      "POST",
      cleanBody({
        currency_cd: referenceRegistryForm.currency_cd,
        currency_name: referenceRegistryForm.currency_name,
      }),
      "Currency created.",
      () => setReferenceRegistryForm(initialReferenceRegistryForm)
    );
  }

  async function createLanguageRegistry() {
    await mutate(
      "/api/admin/reference-registries/languages",
      "POST",
      cleanBody({
        language_cd: referenceRegistryForm.language_cd,
        language_name: referenceRegistryForm.language_name,
      }),
      "Language created.",
      () => setReferenceRegistryForm(initialReferenceRegistryForm)
    );
  }

  async function createGeographyRegistry() {
    await mutate(
      "/api/admin/reference-registries/geographies",
      "POST",
      cleanBody({
        geo_type_cd: referenceRegistryForm.geo_type_cd,
        geo_code: referenceRegistryForm.geo_code,
        geo_name: referenceRegistryForm.geo_name,
        iso_code: referenceRegistryForm.iso_code,
      }),
      "Geography node created.",
      () => setReferenceRegistryForm(initialReferenceRegistryForm)
    );
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

                <form className="stacked-form" onSubmit={updateSelectedProfile}>
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Staff profile</span>
                      <h2>Official Assignment Details</h2>
                    </div>
                    <UserCog size={20} />
                  </div>
                  <div className="form-grid form-grid--two">
                    <Field label="Staff number">
                      <input value={profileForm.staff_no} onChange={(event) => setProfileForm((current) => ({ ...current, staff_no: event.target.value }))} />
                    </Field>
                    <Field label="Full name">
                      <input value={profileForm.full_name_txt} onChange={(event) => setProfileForm((current) => ({ ...current, full_name_txt: event.target.value }))} />
                    </Field>
                    <Field label="Work email">
                      <input type="email" value={profileForm.work_email_txt} onChange={(event) => setProfileForm((current) => ({ ...current, work_email_txt: event.target.value }))} />
                    </Field>
                    <Field label="Job title">
                      <input value={profileForm.job_title_txt} onChange={(event) => setProfileForm((current) => ({ ...current, job_title_txt: event.target.value }))} />
                    </Field>
                    <SelectField label="Unit" value={profileForm.agency_unit_uid} onChange={(value) => setProfileForm((current) => ({ ...current, agency_unit_uid: value }))}>
                      <option value="">Unassigned</option>
                      {units.map((unit) => <option value={unit.agency_unit_uid} key={unit.agency_unit_uid}>{unit.unit_name}</option>)}
                    </SelectField>
                    <SelectField label="Service site" value={profileForm.primary_service_site_uid} onChange={(value) => setProfileForm((current) => ({ ...current, primary_service_site_uid: value }))}>
                      <option value="">Unassigned</option>
                      {sites.map((site) => <option value={site.service_site_uid} key={site.service_site_uid}>{site.site_name}</option>)}
                    </SelectField>
                    <SelectField label="Employment state" value={profileForm.employment_state_cd} onChange={(value) => setProfileForm((current) => ({ ...current, employment_state_cd: value }))}>
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="LEAVE">Leave</option>
                      <option value="SECONDMENT">Secondment</option>
                      <option value="ENDED">Ended</option>
                    </SelectField>
                    <Field label="End date">
                      <input type="date" value={profileForm.end_dt || ""} onChange={(event) => setProfileForm((current) => ({ ...current, end_dt: event.target.value }))} />
                    </Field>
                  </div>
                  <Field label="Reason for profile change">
                    <textarea required value={profileForm.reason_txt} onChange={(event) => setProfileForm((current) => ({ ...current, reason_txt: event.target.value }))} />
                  </Field>
                  <button className="primary-button" type="submit">Save staff profile</button>
                </form>

                <form className="stacked-form" onSubmit={createSelectedAssignment}>
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Assignment history</span>
                      <h2>Delegation And Workload</h2>
                    </div>
                    <ClipboardList size={20} />
                  </div>
                  <SelectField label="Current assignment" value={selectedAssignmentUid} onChange={setSelectedAssignmentUid}>
                    <option value="">Select assignment</option>
                    {staffAssignments.filter((assignment) => assignment.actor_uid === selectedStaff.actor_uid).map((assignment) => (
                      <option value={assignment.staff_assignment_uid} key={assignment.staff_assignment_uid}>
                        {assignment.unit_name} - {compactCode(assignment.assignment_type_cd)}
                      </option>
                    ))}
                  </SelectField>
                  <div className="form-grid form-grid--two">
                    <SelectField required label="Unit" value={assignmentForm.agency_unit_uid} onChange={(value) => setAssignmentForm((current) => ({ ...current, agency_unit_uid: value }))}>
                      <option value="">Select unit</option>
                      {units.map((unit) => <option value={unit.agency_unit_uid} key={unit.agency_unit_uid}>{unit.unit_name}</option>)}
                    </SelectField>
                    <SelectField label="Role link" value={assignmentForm.role_bundle_uid} onChange={(value) => setAssignmentForm((current) => ({ ...current, role_bundle_uid: value }))}>
                      <option value="">No role link</option>
                      {roles.map((role) => <option value={role.role_bundle_uid} key={role.role_bundle_uid}>{role.role_name}</option>)}
                    </SelectField>
                    <Field label="Assignment type">
                      <input value={assignmentForm.assignment_type_cd} onChange={(event) => setAssignmentForm((current) => ({ ...current, assignment_type_cd: event.target.value.toUpperCase() }))} />
                    </Field>
                    <Field label="Delegation level">
                      <input value={assignmentForm.delegation_level_cd} onChange={(event) => setAssignmentForm((current) => ({ ...current, delegation_level_cd: event.target.value.toUpperCase() }))} />
                    </Field>
                    <Field label="Workload weight">
                      <input type="number" min="0" value={assignmentForm.workload_weight_no} onChange={(event) => setAssignmentForm((current) => ({ ...current, workload_weight_no: event.target.value }))} />
                    </Field>
                    <Field label="End date">
                      <input type="date" value={assignmentForm.effective_to_dt} onChange={(event) => setAssignmentForm((current) => ({ ...current, effective_to_dt: event.target.value }))} />
                    </Field>
                  </div>
                  <Field label="Reason for assignment change">
                    <textarea required value={assignmentForm.reason_txt} onChange={(event) => setAssignmentForm((current) => ({ ...current, reason_txt: event.target.value }))} />
                  </Field>
                  <div className="button-row">
                    <button className="primary-button" type="submit">Add assignment</button>
                    <button className="secondary-button" type="button" onClick={endSelectedAssignment}>End selected</button>
                  </div>
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
                <form className="stacked-form" onSubmit={saveSelectedRole}>
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Role bundle</span>
                      <h2>Create Or Correct Role</h2>
                    </div>
                    <ShieldCheck size={20} />
                  </div>
                  <div className="form-grid form-grid--two">
                    <Field label="Role code">
                      <input value={roleForm.role_code} onChange={(event) => setRoleForm((current) => ({ ...current, role_code: event.target.value.toUpperCase() }))} />
                    </Field>
                    <Field label="Role name">
                      <input value={roleForm.role_name} onChange={(event) => setRoleForm((current) => ({ ...current, role_name: event.target.value }))} />
                    </Field>
                    <Field label="Role type">
                      <input value={roleForm.role_type_cd} onChange={(event) => setRoleForm((current) => ({ ...current, role_type_cd: event.target.value.toUpperCase() }))} />
                    </Field>
                    <Field label="Reason">
                      <input required value={roleForm.reason_txt} onChange={(event) => setRoleForm((current) => ({ ...current, reason_txt: event.target.value }))} />
                    </Field>
                  </div>
                  <Field label="Description">
                    <textarea value={roleForm.description_txt} onChange={(event) => setRoleForm((current) => ({ ...current, description_txt: event.target.value }))} />
                  </Field>
                  <div className="button-row">
                    <button className="primary-button" type="submit">Save selected role</button>
                    <button className="secondary-button" type="button" onClick={createRole}>Create as new role</button>
                    <button className="secondary-button" type="button" onClick={retireSelectedRole}>Retire role</button>
                  </div>
                </form>

                <form className="stacked-form" onSubmit={createGrant}>
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Permission grant</span>
                      <h2>Assign Permission</h2>
                    </div>
                    <KeyRound size={20} />
                  </div>
                  <div className="form-grid form-grid--two">
                    <Field label="Resource">
                      <input required value={grantForm.resource_cd} onChange={(event) => setGrantForm((current) => ({ ...current, resource_cd: event.target.value.toLowerCase() }))} placeholder="subject, finance, workflow" />
                    </Field>
                    <Field label="Action">
                      <input required value={grantForm.action_cd} onChange={(event) => setGrantForm((current) => ({ ...current, action_cd: event.target.value.toLowerCase() }))} placeholder="read, create, update, approve" />
                    </Field>
                    <SelectField label="Data scope" value={grantForm.data_scope_cd} onChange={(value) => setGrantForm((current) => ({ ...current, data_scope_cd: value }))}>
                      <option value="GLOBAL">Global</option>
                      <option value="UNIT">Unit</option>
                      <option value="SITE">Site</option>
                      <option value="SUBJECT">Taxpayer</option>
                      <option value="SELF">Self</option>
                    </SelectField>
                    <Field label="Grant reason">
                      <input required value={grantForm.reason_txt} onChange={(event) => setGrantForm((current) => ({ ...current, reason_txt: event.target.value }))} />
                    </Field>
                  </div>
                  <button className="primary-button" type="submit">Assign grant</button>
                </form>

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
                <div className="permission-module-list">
                  {selectedRole.grants?.map((grant) => (
                    <article className="permission-module-card" key={grant.access_grant_uid}>
                      <div>
                        <span>Grant</span>
                        <strong>{grant.resource_cd}:{grant.action_cd}</strong>
                      </div>
                      <div>
                        <span>Scope</span>
                        <StatusPill tone={grant.data_scope_cd === "GLOBAL" ? "warning" : "neutral"}>{compactCode(grant.data_scope_cd)}</StatusPill>
                      </div>
                      <button className="secondary-button" type="button" onClick={() => retireGrant(grant.access_grant_uid)}>Revoke</button>
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
                <span>Role membership</span>
                <h2>Officer Role Scope</h2>
              </div>
            </div>
            <form className="action-form" onSubmit={assignRoleMembership}>
              <SelectField label="Staff member" required value={membershipForm.actor_uid} onChange={(value) => setMembershipForm((current) => ({ ...current, actor_uid: value }))}>
                <option value="">Select staff</option>
                {staff.map((item) => <option value={item.actor_uid} key={item.actor_uid}>{item.full_name_txt}</option>)}
              </SelectField>
              <SelectField label="Role" required value={membershipForm.role_bundle_uid} onChange={(value) => setMembershipForm((current) => ({ ...current, role_bundle_uid: value }))}>
                <option value="">Select role</option>
                {roles.map((role) => <option value={role.role_bundle_uid} key={role.role_bundle_uid}>{role.role_name}</option>)}
              </SelectField>
              <SelectField label="Unit scope" value={membershipForm.agency_unit_uid} onChange={(value) => setMembershipForm((current) => ({ ...current, agency_unit_uid: value }))}>
                <option value="">No unit scope</option>
                {units.map((unit) => <option value={unit.agency_unit_uid} key={unit.agency_unit_uid}>{unit.unit_name}</option>)}
              </SelectField>
              <Field label="Taxpayer scope UID">
                <input value={membershipForm.subject_uid} onChange={(event) => setMembershipForm((current) => ({ ...current, subject_uid: event.target.value }))} />
              </Field>
              <Field label="Effective from">
                <input type="date" value={membershipForm.effective_from_dt} onChange={(event) => setMembershipForm((current) => ({ ...current, effective_from_dt: event.target.value }))} />
              </Field>
              <Field label="Effective to">
                <input type="date" value={membershipForm.effective_to_dt} onChange={(event) => setMembershipForm((current) => ({ ...current, effective_to_dt: event.target.value }))} />
              </Field>
              <Field label="Reason">
                <textarea required value={membershipForm.reason_txt} onChange={(event) => setMembershipForm((current) => ({ ...current, reason_txt: event.target.value }))} />
              </Field>
              <div className="button-row">
                <button className="primary-button" type="submit">Assign role</button>
                <button className="secondary-button" type="button" onClick={transferSelectedMembership}>Transfer selected</button>
                <button className="secondary-button" type="button" onClick={expireSelectedMembership}>Expire selected</button>
              </div>
            </form>
            <DataTable
              columns={[
                { key: "display_name_txt", label: "Staff" },
                { key: "role_name", label: "Role" },
                { key: "unit_name", label: "Scope" },
                { key: "membership_state_cd", label: "State", render: (row) => <StatusPill tone={row.membership_state_cd === "ACTIVE" ? "success" : "warning"}>{compactCode(row.membership_state_cd)}</StatusPill> },
              ]}
              rows={roleMemberships}
              keyField="role_membership_uid"
              empty="No role memberships"
              selectedKey={selectedMembership?.role_membership_uid}
              onRowClick={(row) => setSelectedMembershipUid(row.role_membership_uid)}
            />
            <hr />
            <form className="action-form" onSubmit={createSegregationRule}>
              <div className="section-heading section-heading--compact">
                <div>
                  <span>Segregation of duty</span>
                  <h2>Conflict Rule</h2>
                </div>
              </div>
              <Field label="Rule name">
                <input required value={segregationForm.rule_name} onChange={(event) => setSegregationForm((current) => ({ ...current, rule_name: event.target.value }))} />
              </Field>
              <SelectField label="Restricted role" value={segregationForm.restricted_role_uid} onChange={(value) => setSegregationForm((current) => ({ ...current, restricted_role_uid: value }))}>
                <option value="">Any role</option>
                {roles.map((role) => <option value={role.role_bundle_uid} key={role.role_bundle_uid}>{role.role_name}</option>)}
              </SelectField>
              <SelectField label="Conflicting role" value={segregationForm.conflicting_role_uid} onChange={(value) => setSegregationForm((current) => ({ ...current, conflicting_role_uid: value }))}>
                <option value="">No role conflict</option>
                {roles.map((role) => <option value={role.role_bundle_uid} key={role.role_bundle_uid}>{role.role_name}</option>)}
              </SelectField>
              <Field label="Restricted action">
                <input value={segregationForm.restricted_action_cd} onChange={(event) => setSegregationForm((current) => ({ ...current, restricted_action_cd: event.target.value.toLowerCase() }))} />
              </Field>
              <Field label="Reason">
                <textarea required value={segregationForm.reason_txt} onChange={(event) => setSegregationForm((current) => ({ ...current, reason_txt: event.target.value }))} />
              </Field>
              <button className="primary-button" type="submit">Create rule</button>
            </form>
            <DataTable
              columns={[
                { key: "rule_name", label: "Rule" },
                { key: "restricted_role_name", label: "Restricted role" },
                { key: "conflicting_role_name", label: "Conflicting role" },
                { key: "restricted_action_cd", label: "Action", render: (row) => compactCode(row.restricted_action_cd) },
              ]}
              rows={segregationRules}
              keyField="segregation_rule_uid"
              empty="No segregation rules"
            />
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
                <h2>Create Or Correct Unit</h2>
              </div>
              <Building2 size={22} />
            </div>
            <form
              className="action-form"
              onSubmit={updateSelectedUnit}
            >
              <SelectField label="Selected unit" value={selectedUnitUid} onChange={setSelectedUnitUid}>
                <option value="">Select unit</option>
                {units.map((unit) => (
                  <option key={unit.agency_unit_uid} value={unit.agency_unit_uid}>{unit.unit_name}</option>
                ))}
              </SelectField>
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
              <SelectField label="Manager" value={unitForm.manager_staff_uid || ""} onChange={(value) => setUnitForm({ ...unitForm, manager_staff_uid: value })}>
                <option value="">No manager set</option>
                {staff.map((item) => <option key={item.staff_uid} value={item.staff_uid}>{item.full_name_txt}</option>)}
              </SelectField>
              <Field label="Effective to">
                <input type="date" value={unitForm.effective_to_dt || ""} onChange={(event) => setUnitForm({ ...unitForm, effective_to_dt: event.target.value })} />
              </Field>
              <Field label="Reason">
                <textarea required value={unitForm.reason_txt || ""} onChange={(event) => setUnitForm({ ...unitForm, reason_txt: event.target.value })} />
              </Field>
              <div className="button-row">
                <button className="primary-button" type="submit">Save unit</button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void submit(
                    "/api/admin/agency-units",
                    { ...unitForm, parent_agency_unit_uid: unitForm.parent_agency_unit_uid || null, reason_txt: undefined, manager_staff_uid: undefined, effective_to_dt: undefined },
                    () => setUnitForm(initialUnit),
                    "Agency unit created."
                  )}
                >
                  Create new
                </button>
                <button className="secondary-button" type="button" onClick={deactivateSelectedUnit}>Deactivate</button>
              </div>
            </form>

            <hr />

            <form
              className="action-form"
              onSubmit={updateSelectedSite}
            >
              <SelectField label="Selected site" value={selectedSiteUid} onChange={setSelectedSiteUid}>
                <option value="">Select site</option>
                {sites.map((site) => (
                  <option key={site.service_site_uid} value={site.service_site_uid}>{site.site_name}</option>
                ))}
              </SelectField>
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
              <Field label="Contact">
                <input value={siteForm.contact_txt || ""} onChange={(event) => setSiteForm({ ...siteForm, contact_txt: event.target.value })} />
              </Field>
              <Field label="Reason">
                <textarea required value={siteForm.reason_txt || ""} onChange={(event) => setSiteForm({ ...siteForm, reason_txt: event.target.value })} />
              </Field>
              <div className="button-row">
                <button className="primary-button" type="submit">Save site</button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void submit(
                    "/api/admin/service-sites",
                    { ...siteForm, agency_unit_uid: siteForm.agency_unit_uid || null, reason_txt: undefined },
                    () => setSiteForm(initialSite),
                    "Service site created."
                  )}
                >
                  Create new
                </button>
                <button className="secondary-button" type="button" onClick={deactivateSelectedSite}>Deactivate</button>
              </div>
            </form>
          </section>

          <section className="content-band">
            <DataTable
              columns={unitColumns}
              rows={units}
              keyField="agency_unit_uid"
              empty="No agency units"
              selectedKey={selectedUnit?.agency_unit_uid}
              onRowClick={(row) => setSelectedUnitUid(row.agency_unit_uid)}
            />
            <br />
            <DataTable
              columns={siteColumns}
              rows={sites}
              keyField="service_site_uid"
              empty="No service sites"
              selectedKey={selectedSite?.service_site_uid}
              onRowClick={(row) => setSelectedSiteUid(row.service_site_uid)}
            />
          </section>
        </div>
      ) : null}

      {activeTab === "reference" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Reference set</span>
                <h2>{selectedReferenceSet?.class_set_name || "Reference Maintenance"}</h2>
              </div>
            </div>
            <form className="action-form" onSubmit={createReferenceSet}>
              <Field label="Set name">
                <input required value={referenceSetForm.class_set_name} onChange={(event) => setReferenceSetForm({ ...referenceSetForm, class_set_name: event.target.value })} />
              </Field>
              <Field label="Set code">
                <input value={referenceSetForm.class_set_code} onChange={(event) => setReferenceSetForm({ ...referenceSetForm, class_set_code: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Owner schema">
                <input value={referenceSetForm.owner_schema_code} onChange={(event) => setReferenceSetForm({ ...referenceSetForm, owner_schema_code: event.target.value.toLowerCase() })} />
              </Field>
              <Field label="Description">
                <textarea value={referenceSetForm.description_txt} onChange={(event) => setReferenceSetForm({ ...referenceSetForm, description_txt: event.target.value })} />
              </Field>
              <button className="primary-button" type="submit">Create reference set</button>
            </form>
            <hr />
            <form
              className="action-form"
              onSubmit={updateSelectedReferenceValue}
            >
              <SelectField label="Selected value" value={selectedReferenceValueUid} onChange={setSelectedReferenceValueUid}>
                <option value="">Select value</option>
                {referenceValues.map((value) => (
                  <option key={value.class_value_uid} value={value.class_value_uid}>
                    {value.class_set_code} - {value.class_value_name}
                  </option>
                ))}
              </SelectField>
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
              <Field label="Effective to">
                <input type="date" value={referenceForm.effective_to_dt || ""} onChange={(event) => setReferenceForm({ ...referenceForm, effective_to_dt: event.target.value })} />
              </Field>
              <Field label="Reason">
                <textarea required value={referenceForm.reason_txt || ""} onChange={(event) => setReferenceForm({ ...referenceForm, reason_txt: event.target.value })} />
              </Field>
              <div className="button-row">
                <button className="primary-button" type="submit">Save value</button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void submit(
                    "/api/admin/reference-values",
                    { ...referenceForm, reason_txt: undefined, effective_to_dt: undefined },
                    () => setReferenceForm(initialReference),
                    "Reference value created."
                  )}
                >
                  Create new
                </button>
                <button className="secondary-button" type="button" onClick={retireSelectedReferenceValue}>Retire</button>
              </div>
            </form>
          </section>
          <section className="content-band">
            <DataTable
              columns={referenceColumns}
              rows={referenceValues}
              keyField="class_value_uid"
              empty="No reference values"
              selectedKey={selectedReferenceValue?.class_value_uid}
              onRowClick={(row) => setSelectedReferenceValueUid(row.class_value_uid)}
            />
            <hr />
            <div className="section-heading section-heading--compact">
              <div>
                <span>Global reference registries</span>
                <h2>Currencies, Languages And Geography</h2>
              </div>
            </div>
            <div className="form-grid form-grid--two">
              <Field label="Currency code">
                <input value={referenceRegistryForm.currency_cd} onChange={(event) => setReferenceRegistryForm((current) => ({ ...current, currency_cd: event.target.value.toUpperCase() }))} />
              </Field>
              <Field label="Currency name">
                <input value={referenceRegistryForm.currency_name} onChange={(event) => setReferenceRegistryForm((current) => ({ ...current, currency_name: event.target.value }))} />
              </Field>
              <button className="secondary-button" type="button" onClick={createCurrencyRegistry}>Create currency</button>
              <span />
              <Field label="Language code">
                <input value={referenceRegistryForm.language_cd} onChange={(event) => setReferenceRegistryForm((current) => ({ ...current, language_cd: event.target.value.toUpperCase() }))} />
              </Field>
              <Field label="Language name">
                <input value={referenceRegistryForm.language_name} onChange={(event) => setReferenceRegistryForm((current) => ({ ...current, language_name: event.target.value }))} />
              </Field>
              <button className="secondary-button" type="button" onClick={createLanguageRegistry}>Create language</button>
              <span />
              <Field label="Geography type">
                <input value={referenceRegistryForm.geo_type_cd} onChange={(event) => setReferenceRegistryForm((current) => ({ ...current, geo_type_cd: event.target.value.toUpperCase() }))} />
              </Field>
              <Field label="Geography name">
                <input value={referenceRegistryForm.geo_name} onChange={(event) => setReferenceRegistryForm((current) => ({ ...current, geo_name: event.target.value }))} />
              </Field>
              <Field label="Geography code">
                <input value={referenceRegistryForm.geo_code} onChange={(event) => setReferenceRegistryForm((current) => ({ ...current, geo_code: event.target.value.toUpperCase() }))} />
              </Field>
              <Field label="ISO code">
                <input value={referenceRegistryForm.iso_code} onChange={(event) => setReferenceRegistryForm((current) => ({ ...current, iso_code: event.target.value.toUpperCase() }))} />
              </Field>
              <button className="secondary-button" type="button" onClick={createGeographyRegistry}>Create geography</button>
            </div>
            <div className="reference-registry-summary">
              <StatusPill tone="neutral">{formatNumber(referenceRegistries.currencies.length)} currencies</StatusPill>
              <StatusPill tone="neutral">{formatNumber(referenceRegistries.languages.length)} languages</StatusPill>
              <StatusPill tone="neutral">{formatNumber(referenceRegistries.geographies.length)} geography nodes</StatusPill>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
