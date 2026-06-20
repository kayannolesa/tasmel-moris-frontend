import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  BadgeCheck,
  BookOpenCheck,
  Building2,
  CalendarClock,
  ContactRound,
  FileCheck2,
  Fingerprint,
  History,
  Hand,
  Landmark,
  Link2,
  MapPin,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Scale,
  UserRound,
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
import { compactCode, formatDate, formatDateTime, formatMoney, formatNumber } from "../utils/format.js";

const tabs = [
  { id: "search", label: "Advanced Search" },
  { id: "register", label: "Register Taxpayer" },
  { id: "profile", label: "Taxpayer Profile" },
];

const initialSearch = {
  q: "",
  subject_class_cd: "",
  registry_state_cd: "",
  identifier_type_cd: "",
  identifier_value_txt: "",
  contact_value_txt: "",
  activity_code: "",
  sector_cd: "",
  registered_from_dt: "",
  registered_to_dt: "",
};

const initialSubject = {
  subject_class_cd: "ORGANISATION",
  legal_name_txt: "",
  trading_name_txt: "",
  first_name_txt: "",
  middle_name_txt: "",
  last_name_txt: "",
  birth_dt: "",
  incorporation_dt: "",
  tax_residency_cd: "WS",
  confidential_profile_bool: false,
  identifier_type_cd: "TIN",
  identifier_value_txt: "",
  issuing_country_cd: "WS",
  verification_state_cd: "UNVERIFIED",
  contact_type_cd: "EMAIL",
  usage_role_cd: "PRIMARY",
  contact_value_txt: "",
  address_role_cd: "REGISTERED",
  line1_txt: "",
  suburb_txt: "",
  city_txt: "Apia",
  region_txt: "",
  postal_code_txt: "",
  country_cd: "WS",
  activity_code: "",
  activity_description_txt: "",
  sector_cd: "",
  turnover_band_cd: "",
  activity_start_dt: "",
};

const initialName = {
  name_role_cd: "LEGAL",
  legal_name_txt: "",
  trading_name_txt: "",
  first_name_txt: "",
  middle_name_txt: "",
  last_name_txt: "",
  is_preferred_bool: true,
};

const initialIdentifier = {
  identifier_type_cd: "TIN",
  identifier_value_txt: "",
  issuing_country_cd: "WS",
  verification_state_cd: "UNVERIFIED",
  expiry_dt: "",
};

const initialContact = {
  contact_type_cd: "EMAIL",
  usage_role_cd: "PRIMARY",
  contact_value_txt: "",
  verified_bool: false,
  preferred_bool: true,
};

const initialAddress = {
  address_role_cd: "REGISTERED",
  line1_txt: "",
  line2_txt: "",
  suburb_txt: "",
  city_txt: "Apia",
  region_txt: "",
  postal_code_txt: "",
  country_cd: "WS",
  preferred_bool: true,
};

const initialActivity = {
  activity_code: "",
  activity_description_txt: "",
  sector_cd: "",
  turnover_band_cd: "",
  start_dt: "",
  end_dt: "",
  primary_bool: true,
};

const initialRelationship = {
  related_subject_uid: "",
  relationship_type_cd: "DIRECTOR",
  ownership_percent: "",
  effective_from_dt: "",
  effective_to_dt: "",
};

const initialStatus = {
  registry_state_cd: "ACTIVE",
  reason_txt: "",
};

function stripEmpty(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== "" && value !== undefined && value !== null)
  );
}

function buildQuery(record) {
  const params = new URLSearchParams();
  Object.entries(stripEmpty(record)).forEach(([key, value]) => params.set(key, value));
  return params.toString();
}

function registryTone(state) {
  if (state === "ACTIVE") return "success";
  if (state === "SUSPENDED" || state === "DEREGISTERED") return "danger";
  if (state === "PENDING_REVIEW") return "warning";
  return "neutral";
}

function dueTone(state) {
  if (state === "PAID" || state === "FILED" || state === "ASSESSED") return "success";
  if (state === "OVERDUE") return "danger";
  if (state === "NOTIFIED") return "warning";
  return "neutral";
}

function holdTone(state) {
  if (state === "ACTIVE") return "danger";
  if (state === "RELEASED") return "success";
  return "neutral";
}

function declarationTone(state) {
  if (state === "ACCEPTED" || state === "VALIDATED") return "success";
  if (state === "REQUIRES_REVIEW" || state === "SUBMITTED") return "warning";
  if (state === "REJECTED") return "danger";
  return "neutral";
}

function liabilityTone(state) {
  if (state === "POSTED" || state === "ISSUED" || state === "APPROVED") return "success";
  if (state === "CANCELLED") return "danger";
  if (state === "DRAFT" || state === "REVIEWED") return "warning";
  return "neutral";
}

function clearanceTone(state) {
  if (state === "CLEAR") return "success";
  if (state === "NOT_CLEAR") return "danger";
  return "neutral";
}

function DuplicatePanel({ candidates, acknowledged, onAcknowledged }) {
  if (!candidates?.length) {
    return (
      <div className="registry-duplicate-panel registry-duplicate-panel--clear">
        <ShieldCheck size={20} />
        <div>
          <strong>No duplicate candidates loaded</strong>
          <span>Run duplicate detection before registering sensitive taxpayer records.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="registry-duplicate-panel">
      <div className="registry-duplicate-panel__header">
        <AlertTriangle size={20} />
        <div>
          <strong>{candidates.length} possible duplicate{candidates.length === 1 ? "" : "s"}</strong>
          <span>Review matching identifiers, contacts, and name similarity before creating a new profile.</span>
        </div>
      </div>
      <div className="duplicate-list">
        {candidates.map((candidate) => (
          <article className="duplicate-card" key={candidate.subject_uid}>
            <div>
              <strong>{candidate.display_name_txt}</strong>
              <span>{candidate.subject_no}</span>
            </div>
            <StatusPill tone={candidate.duplicate_score >= 90 ? "danger" : "warning"}>{candidate.duplicate_score}%</StatusPill>
            <div className="chip-list">
              {candidate.duplicate_reasons?.map((reason) => (
                <span className="soft-chip" key={reason}>{reason}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
      <label className="check-control">
        <input type="checkbox" checked={acknowledged} onChange={(event) => onAcknowledged(event.target.checked)} />
        <span>I have reviewed the possible duplicate profiles.</span>
      </label>
    </div>
  );
}

function EmptyRegistryState({ title, text }) {
  return (
    <div className="empty-panel">
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
    </div>
  );
}

export default function RegistryPage() {
  const [activeTab, setActiveTab] = useState("search");
  const [summary, setSummary] = useState(null);
  const [searchForm, setSearchForm] = useState(initialSearch);
  const [subjects, setSubjects] = useState([]);
  const [page, setPage] = useState(null);
  const [selected, setSelected] = useState(null);
  const [subjectForm, setSubjectForm] = useState(initialSubject);
  const [duplicateCandidates, setDuplicateCandidates] = useState([]);
  const [duplicatesAcknowledged, setDuplicatesAcknowledged] = useState(false);
  const [nameForm, setNameForm] = useState(initialName);
  const [identifierForm, setIdentifierForm] = useState(initialIdentifier);
  const [contactForm, setContactForm] = useState(initialContact);
  const [addressForm, setAddressForm] = useState(initialAddress);
  const [activityForm, setActivityForm] = useState(initialActivity);
  const [relationshipForm, setRelationshipForm] = useState(initialRelationship);
  const [statusForm, setStatusForm] = useState(initialStatus);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedProfile = selected?.profile || null;
  const organisationMode = subjectForm.subject_class_cd === "ORGANISATION";
  const activeHolds = selected?.account_holds?.filter((hold) => hold.hold_state_cd === "ACTIVE") || [];
  const openDues = selected?.due_instances?.filter((due) => ["OPEN", "NOTIFIED", "OVERDUE"].includes(due.due_state_cd)) || [];
  const activeConcessions = selected?.concessions?.filter((concession) => concession.concession_state_cd === "ACTIVE") || [];
  const acceptedDeclarations = selected?.declarations?.filter((declaration) => declaration.declaration_state_cd === "ACCEPTED") || [];
  const openLiabilities = selected?.liability_notices?.filter((notice) => !["POSTED", "CANCELLED", "AMENDED"].includes(notice.liability_state_cd)) || [];
  const postedLiabilities = selected?.liability_notices?.filter((notice) => notice.liability_state_cd === "POSTED") || [];
  const latestClearance = selected?.clearance_snapshots?.[0] || null;
  const openLiabilityTotal = openLiabilities.reduce((total, notice) => total + Number(notice.net_liability_amt || 0), 0);

  const subjectOptions = useMemo(
    () => subjects.filter((subject) => subject.subject_uid !== selectedProfile?.subject_uid),
    [selectedProfile?.subject_uid, subjects]
  );

  async function loadSubjects(nextSearch = searchForm) {
    const query = buildQuery({ ...nextSearch, pageSize: 75 });
    const payload = await apiRequest(`/api/registry/subjects?${query}`);
    setSubjects(payload.rows || []);
    setPage(payload.page || null);
    return payload.rows || [];
  }

  async function loadSummary() {
    const payload = await apiRequest("/api/registry/summary");
    setSummary(payload.summary || null);
  }

  async function loadProfile(subjectUid) {
    const payload = await apiRequest(`/api/registry/subjects/${subjectUid}`);
    setSelected(payload.subject);
    setStatusForm({
      registry_state_cd: payload.subject?.profile?.registry_state_cd || "ACTIVE",
      reason_txt: "",
    });
    setActiveTab("profile");
  }

  async function refreshAll(nextSearch = searchForm) {
    setLoading(true);
    await Promise.all([loadSummary(), loadSubjects(nextSearch)]);
    setLoading(false);
  }

  useEffect(() => {
    void refreshAll().catch((loadError) => {
      setError(loadError.message);
      setLoading(false);
    });
  }, []);

  async function runDuplicateCheck(source = subjectForm) {
    const query = buildQuery({
      subject_class_cd: source.subject_class_cd,
      legal_name_txt: source.legal_name_txt,
      trading_name_txt: source.trading_name_txt,
      first_name_txt: source.first_name_txt,
      middle_name_txt: source.middle_name_txt,
      last_name_txt: source.last_name_txt,
      identifier_type_cd: source.identifier_type_cd,
      identifier_value_txt: source.identifier_value_txt,
      contact_value_txt: source.contact_value_txt,
      limit: 8,
    });
    const payload = await apiRequest(`/api/registry/subjects/duplicates?${query}`);
    setDuplicateCandidates(payload.duplicate_candidates || []);
    setDuplicatesAcknowledged(false);
    return payload.duplicate_candidates || [];
  }

  async function submitSubject(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const candidates = await runDuplicateCheck(subjectForm);
      if (candidates.length && !duplicatesAcknowledged) {
        setError("Possible duplicate taxpayer profiles were found. Review and acknowledge the matches before registration.");
        setActiveTab("register");
        return;
      }

      const payload = await apiRequest("/api/registry/subjects", {
        method: "POST",
        body: stripEmpty(subjectForm),
      });
      setSubjectForm(initialSubject);
      setDuplicateCandidates([]);
      setDuplicatesAcknowledged(false);
      await refreshAll(initialSearch);
      setSelected(payload.subject);
      setActiveTab("profile");
      setSuccess("Taxpayer profile registered with lifecycle and audit records.");
    } catch (submitError) {
      const candidates = submitError.payload?.details?.duplicate_candidates;
      if (candidates) {
        setDuplicateCandidates(candidates);
      }
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  async function addProfileRecord(endpoint, body, reset, message) {
    if (!selectedProfile?.subject_uid) return;
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await apiRequest(`/api/registry/subjects/${selectedProfile.subject_uid}/${endpoint}`, {
        method: "POST",
        body: stripEmpty(body),
      });
      reset();
      await Promise.all([loadProfile(selectedProfile.subject_uid), loadSummary(), loadSubjects(searchForm)]);
      setSuccess(message);
    } catch (submitError) {
      const candidates = submitError.payload?.details?.duplicate_candidates;
      if (candidates) {
        setDuplicateCandidates(candidates);
      }
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(event) {
    event.preventDefault();
    if (!selectedProfile?.subject_uid) return;
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const payload = await apiRequest(`/api/registry/subjects/${selectedProfile.subject_uid}/status`, {
        method: "PATCH",
        body: stripEmpty(statusForm),
      });
      setSelected(payload.subject);
      await Promise.all([loadSummary(), loadSubjects(searchForm)]);
      setStatusForm({ registry_state_cd: payload.subject?.profile?.registry_state_cd || "ACTIVE", reason_txt: "" });
      setSuccess("Registry lifecycle status updated.");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  const subjectColumns = [
    { key: "subject_no", label: "Taxpayer no." },
    { key: "display_name_txt", label: "Name" },
    { key: "subject_class_cd", label: "Class", render: (row) => compactCode(row.subject_class_cd) },
    { key: "primary_identifier_value_txt", label: "Identifier", render: (row) => row.primary_identifier_value_txt || "-" },
    { key: "primary_contact_txt", label: "Contact", render: (row) => row.primary_contact_txt || "-" },
    {
      key: "primary_activity_code",
      label: "Activity",
      render: (row) => row.primary_activity_code || "-",
    },
    {
      key: "registry_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={registryTone(row.registry_state_cd)}>{compactCode(row.registry_state_cd)}</StatusPill>,
    },
  ];

  const nameColumns = [
    { key: "name_role_cd", label: "Role", render: (row) => compactCode(row.name_role_cd) },
    {
      key: "legal_name_txt",
      label: "Name",
      render: (row) => row.legal_name_txt || row.trading_name_txt || [row.first_name_txt, row.middle_name_txt, row.last_name_txt].filter(Boolean).join(" "),
    },
    {
      key: "is_preferred_bool",
      label: "Preferred",
      render: (row) => <StatusPill tone={row.is_preferred_bool ? "success" : "neutral"}>{row.is_preferred_bool ? "Yes" : "No"}</StatusPill>,
    },
  ];

  const identifierColumns = [
    { key: "identifier_type_cd", label: "Type", render: (row) => compactCode(row.identifier_type_cd) },
    { key: "identifier_value_txt", label: "Value" },
    { key: "issuing_country_cd", label: "Country", render: (row) => row.issuing_country_cd || "-" },
    {
      key: "verification_state_cd",
      label: "Verification",
      render: (row) => <StatusPill tone={row.verification_state_cd === "VERIFIED" ? "success" : "warning"}>{compactCode(row.verification_state_cd)}</StatusPill>,
    },
  ];

  const contactColumns = [
    { key: "contact_type_cd", label: "Type", render: (row) => compactCode(row.contact_type_cd) },
    { key: "contact_value_txt", label: "Value" },
    { key: "usage_role_cd", label: "Usage", render: (row) => compactCode(row.usage_role_cd) },
    {
      key: "preferred_bool",
      label: "Preferred",
      render: (row) => <StatusPill tone={row.preferred_bool ? "success" : "neutral"}>{row.preferred_bool ? "Yes" : "No"}</StatusPill>,
    },
  ];

  const addressColumns = [
    { key: "address_role_cd", label: "Role", render: (row) => compactCode(row.address_role_cd) },
    { key: "line1_txt", label: "Address" },
    { key: "city_txt", label: "City", render: (row) => row.city_txt || "-" },
    { key: "country_cd", label: "Country", render: (row) => row.country_cd || "-" },
  ];

  const activityColumns = [
    { key: "activity_code", label: "Code" },
    { key: "activity_description_txt", label: "Description", render: (row) => row.activity_description_txt || "-" },
    { key: "sector_cd", label: "Sector", render: (row) => compactCode(row.sector_cd) },
    {
      key: "primary_bool",
      label: "Primary",
      render: (row) => <StatusPill tone={row.primary_bool ? "success" : "neutral"}>{row.primary_bool ? "Yes" : "No"}</StatusPill>,
    },
  ];

  const relationshipColumns = [
    { key: "relationship_type_cd", label: "Type", render: (row) => compactCode(row.relationship_type_cd) },
    {
      key: "related_display_name_txt",
      label: "Related taxpayer",
      render: (row) => (row.relationship_direction_cd === "OUTBOUND" ? row.related_display_name_txt : row.source_display_name_txt) || "-",
    },
    {
      key: "relationship_direction_cd",
      label: "Direction",
      render: (row) => compactCode(row.relationship_direction_cd),
    },
    { key: "ownership_percent", label: "Ownership", render: (row) => (row.ownership_percent ? `${Number(row.ownership_percent)}%` : "-") },
  ];

  const lifecycleColumns = [
    { key: "event_ts", label: "Time", render: (row) => formatDateTime(row.event_ts) },
    { key: "event_type_cd", label: "Event", render: (row) => compactCode(row.event_type_cd) },
    { key: "from_registry_state_cd", label: "From", render: (row) => compactCode(row.from_registry_state_cd) },
    { key: "to_registry_state_cd", label: "To", render: (row) => compactCode(row.to_registry_state_cd) },
    { key: "created_by_name_txt", label: "Officer", render: (row) => row.created_by_name_txt || "-" },
  ];

  const auditColumns = [
    { key: "event_ts", label: "Time", render: (row) => formatDateTime(row.event_ts) },
    { key: "event_type_cd", label: "Event", render: (row) => compactCode(row.event_type_cd) },
    { key: "action_cd", label: "Action", render: (row) => compactCode(row.action_cd) },
    { key: "display_name_txt", label: "Officer", render: (row) => row.display_name_txt || "-" },
  ];

  const obligationEnrolmentColumns = [
    { key: "enrolment_no", label: "Enrolment" },
    { key: "revenue_kind_name", label: "Revenue type" },
    { key: "period_rule_code", label: "Rule", render: (row) => row.period_rule_code || "-" },
    { key: "start_dt", label: "Start", render: (row) => formatDate(row.start_dt) },
    { key: "service_site_name", label: "Service site", render: (row) => row.service_site_name || "-" },
    {
      key: "enrolment_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={row.enrolment_state_cd === "ACTIVE" ? "success" : "warning"}>{compactCode(row.enrolment_state_cd)}</StatusPill>,
    },
  ];

  const obligationDueColumns = [
    { key: "due_dt", label: "Due date", render: (row) => formatDate(row.due_dt) },
    { key: "revenue_kind_name", label: "Revenue type" },
    { key: "period_label_txt", label: "Period", render: (row) => row.period_label_txt || "-" },
    { key: "due_event_cd", label: "Event", render: (row) => compactCode(row.due_event_cd) },
    { key: "amount_due_amt", label: "Amount", render: (row) => formatMoney(row.amount_due_amt || 0) },
    {
      key: "due_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={dueTone(row.due_state_cd)}>{compactCode(row.due_state_cd)}</StatusPill>,
    },
  ];

  const declarationColumns = [
    { key: "declaration_no", label: "Declaration" },
    { key: "revenue_kind_name", label: "Revenue type", render: (row) => row.revenue_kind_name || "-" },
    { key: "period_label_txt", label: "Period", render: (row) => row.period_label_txt || "-" },
    { key: "due_dt", label: "Due date", render: (row) => formatDate(row.due_dt) },
    { key: "declared_total_amt", label: "Declared", render: (row) => formatMoney(row.declared_total_amt || 0) },
    {
      key: "declaration_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={declarationTone(row.declaration_state_cd)}>{compactCode(row.declaration_state_cd)}</StatusPill>,
    },
    {
      key: "validation",
      label: "Validation",
      render: (row) =>
        Number(row.open_error_count || 0) ? (
          <StatusPill tone="danger">{formatNumber(row.open_error_count)} errors</StatusPill>
        ) : Number(row.open_warning_count || 0) ? (
          <StatusPill tone="warning">{formatNumber(row.open_warning_count)} warnings</StatusPill>
        ) : (
          <StatusPill tone="success">Clear</StatusPill>
        ),
    },
  ];

  const liabilityNoticeColumns = [
    { key: "liability_notice_no", label: "Notice" },
    { key: "declaration_no", label: "Declaration", render: (row) => row.declaration_no || "-" },
    { key: "revenue_kind_name", label: "Revenue type", render: (row) => row.revenue_kind_name || "-" },
    { key: "period_label_txt", label: "Period", render: (row) => row.period_label_txt || "-" },
    { key: "net_liability_amt", label: "Net liability", render: (row) => formatMoney(row.net_liability_amt || 0) },
    { key: "due_dt", label: "Due date", render: (row) => formatDate(row.due_dt) },
    {
      key: "liability_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={liabilityTone(row.liability_state_cd)}>{compactCode(row.liability_state_cd)}</StatusPill>,
    },
    {
      key: "posting_ready_bool",
      label: "Posting",
      render: (row) => <StatusPill tone={row.posting_ready_bool ? "success" : "neutral"}>{row.posting_ready_bool ? "Ready" : "Held"}</StatusPill>,
    },
  ];

  const clearanceColumns = [
    { key: "snapshot_ts", label: "Snapshot", render: (row) => formatDateTime(row.snapshot_ts) },
    { key: "outstanding_balance_amt", label: "Balance", render: (row) => formatMoney(row.outstanding_balance_amt || 0) },
    { key: "overdue_count_no", label: "Overdue", render: (row) => formatNumber(row.overdue_count_no) },
    { key: "active_hold_count_no", label: "Holds", render: (row) => formatNumber(row.active_hold_count_no) },
    { key: "open_liability_count_no", label: "Open liabilities", render: (row) => formatNumber(row.open_liability_count_no) },
    { key: "pending_dispute_count_no", label: "Disputes", render: (row) => formatNumber(row.pending_dispute_count_no) },
    {
      key: "clearance_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={clearanceTone(row.clearance_state_cd)}>{compactCode(row.clearance_state_cd)}</StatusPill>,
    },
  ];

  const accountHoldColumns = [
    { key: "hold_type_cd", label: "Type", render: (row) => compactCode(row.hold_type_cd) },
    { key: "revenue_kind_name", label: "Revenue type", render: (row) => row.revenue_kind_name || "All revenue" },
    { key: "hold_reason_txt", label: "Reason", render: (row) => row.hold_reason_txt || "-" },
    { key: "approval_ts", label: "Approved", render: (row) => formatDateTime(row.approval_ts) },
    {
      key: "hold_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={holdTone(row.hold_state_cd)}>{compactCode(row.hold_state_cd)}</StatusPill>,
    },
  ];

  const concessionColumns = [
    { key: "concession_reference_no", label: "Reference" },
    { key: "concession_type_cd", label: "Type", render: (row) => compactCode(row.concession_type_cd) },
    { key: "revenue_kind_name", label: "Revenue type", render: (row) => row.revenue_kind_name || "All revenue" },
    { key: "component_name", label: "Component", render: (row) => row.component_name || "-" },
    { key: "effective_from_dt", label: "From", render: (row) => formatDate(row.effective_from_dt) },
    {
      key: "concession_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={row.concession_state_cd === "ACTIVE" ? "success" : "neutral"}>{compactCode(row.concession_state_cd)}</StatusPill>,
    },
  ];

  const obligationLifecycleColumns = [
    { key: "event_ts", label: "Time", render: (row) => formatDateTime(row.event_ts) },
    { key: "event_type_cd", label: "Event", render: (row) => compactCode(row.event_type_cd) },
    { key: "event_reason_txt", label: "Reason", render: (row) => row.event_reason_txt || "-" },
    { key: "created_by_name_txt", label: "Officer", render: (row) => row.created_by_name_txt || "-" },
  ];

  const assessmentLifecycleColumns = [
    { key: "event_ts", label: "Time", render: (row) => formatDateTime(row.event_ts) },
    { key: "event_type_cd", label: "Event", render: (row) => compactCode(row.event_type_cd) },
    { key: "from_liability_state_cd", label: "From", render: (row) => compactCode(row.from_liability_state_cd) },
    { key: "to_liability_state_cd", label: "To", render: (row) => compactCode(row.to_liability_state_cd) },
    { key: "created_by_name_txt", label: "Officer", render: (row) => row.created_by_name_txt || "-" },
  ];

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Taxpayer registry"
        title="Taxpayer Registry"
        status={loading ? "Loading" : "Operational"}
        tone={loading ? "warning" : "success"}
      />

      <div className="metric-grid">
        <MetricTile icon={UsersRound} label="Taxpayers" value={formatNumber(summary?.subject_count)} />
        <MetricTile icon={UserRound} label="Individuals" value={formatNumber(summary?.individual_count)} />
        <MetricTile icon={Building2} label="Organisations" value={formatNumber(summary?.organisation_count)} />
        <MetricTile icon={AlertTriangle} label="Review queue" value={formatNumber(summary?.review_count)} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "search" ? (
        <div className="registry-search-grid">
          <section className="content-band registry-search-grid__filters">
            <div className="section-heading">
              <div>
                <span>Advanced search</span>
                <h2>Find Taxpayer</h2>
              </div>
              <Search size={22} />
            </div>
            <form
              className="registry-filter-form"
              onSubmit={(event) => {
                event.preventDefault();
                setError("");
                void refreshAll(searchForm).catch((submitError) => setError(submitError.message));
              }}
            >
              <Field label="Keyword">
                <input value={searchForm.q} onChange={(event) => setSearchForm({ ...searchForm, q: event.target.value })} />
              </Field>
              <SelectField label="Taxpayer class" value={searchForm.subject_class_cd} onChange={(value) => setSearchForm({ ...searchForm, subject_class_cd: value })}>
                <option value="">All classes</option>
                <option value="INDIVIDUAL">Individual</option>
                <option value="ORGANISATION">Organisation</option>
              </SelectField>
              <SelectField label="Registry state" value={searchForm.registry_state_cd} onChange={(value) => setSearchForm({ ...searchForm, registry_state_cd: value })}>
                <option value="">All states</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING_REVIEW">Pending review</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="DEREGISTERED">Deregistered</option>
                <option value="ARCHIVED">Archived</option>
              </SelectField>
              <Field label="Identifier type">
                <input value={searchForm.identifier_type_cd} onChange={(event) => setSearchForm({ ...searchForm, identifier_type_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Identifier value">
                <input value={searchForm.identifier_value_txt} onChange={(event) => setSearchForm({ ...searchForm, identifier_value_txt: event.target.value })} />
              </Field>
              <Field label="Contact">
                <input value={searchForm.contact_value_txt} onChange={(event) => setSearchForm({ ...searchForm, contact_value_txt: event.target.value })} />
              </Field>
              <Field label="Activity code">
                <input value={searchForm.activity_code} onChange={(event) => setSearchForm({ ...searchForm, activity_code: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Sector">
                <input value={searchForm.sector_cd} onChange={(event) => setSearchForm({ ...searchForm, sector_cd: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Registered from">
                <input type="date" value={searchForm.registered_from_dt} onChange={(event) => setSearchForm({ ...searchForm, registered_from_dt: event.target.value })} />
              </Field>
              <Field label="Registered to">
                <input type="date" value={searchForm.registered_to_dt} onChange={(event) => setSearchForm({ ...searchForm, registered_to_dt: event.target.value })} />
              </Field>
              <div className="form-actions full-span">
                <button className="primary-button" type="submit">Search registry</button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setSearchForm(initialSearch);
                    void refreshAll(initialSearch).catch((submitError) => setError(submitError.message));
                  }}
                >
                  Reset
                </button>
              </div>
            </form>
          </section>

          <section className="content-band registry-search-grid__results">
            <div className="section-heading">
              <div>
                <span>{formatNumber(page?.total)} result{page?.total === 1 ? "" : "s"}</span>
                <h2>Registry Index</h2>
              </div>
              <BadgeCheck size={22} />
            </div>
            <DataTable
              columns={subjectColumns}
              rows={subjects}
              keyField="subject_uid"
              selectedKey={selectedProfile?.subject_uid}
              onRowClick={(row) => loadProfile(row.subject_uid)}
              empty="No taxpayer records match the current filters"
            />
          </section>
        </div>
      ) : null}

      {activeTab === "register" ? (
        <div className="registry-registration-grid">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>New taxpayer</span>
                <h2>Register Profile</h2>
              </div>
              <Plus size={22} />
            </div>
            <form className="registry-create-form" onSubmit={submitSubject}>
              <SelectField label="Taxpayer class" value={subjectForm.subject_class_cd} onChange={(value) => setSubjectForm({ ...subjectForm, subject_class_cd: value })}>
                <option value="ORGANISATION">Organisation</option>
                <option value="INDIVIDUAL">Individual</option>
              </SelectField>

              {organisationMode ? (
                <>
                  <Field label="Legal name">
                    <input required value={subjectForm.legal_name_txt} onChange={(event) => setSubjectForm({ ...subjectForm, legal_name_txt: event.target.value })} />
                  </Field>
                  <Field label="Trading name">
                    <input value={subjectForm.trading_name_txt} onChange={(event) => setSubjectForm({ ...subjectForm, trading_name_txt: event.target.value })} />
                  </Field>
                  <Field label="Incorporation date">
                    <input type="date" value={subjectForm.incorporation_dt} onChange={(event) => setSubjectForm({ ...subjectForm, incorporation_dt: event.target.value })} />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="First name">
                    <input required value={subjectForm.first_name_txt} onChange={(event) => setSubjectForm({ ...subjectForm, first_name_txt: event.target.value })} />
                  </Field>
                  <Field label="Middle name">
                    <input value={subjectForm.middle_name_txt} onChange={(event) => setSubjectForm({ ...subjectForm, middle_name_txt: event.target.value })} />
                  </Field>
                  <Field label="Last name">
                    <input required value={subjectForm.last_name_txt} onChange={(event) => setSubjectForm({ ...subjectForm, last_name_txt: event.target.value })} />
                  </Field>
                  <Field label="Birth date">
                    <input type="date" value={subjectForm.birth_dt} onChange={(event) => setSubjectForm({ ...subjectForm, birth_dt: event.target.value })} />
                  </Field>
                </>
              )}

              <Field label="Tax residency">
                <input value={subjectForm.tax_residency_cd} onChange={(event) => setSubjectForm({ ...subjectForm, tax_residency_cd: event.target.value.toUpperCase() })} />
              </Field>

              <div className="registry-form-section full-span">
                <h3>Identifier And Contact</h3>
                <div className="compact-form">
                  <Field label="Identifier type">
                    <input value={subjectForm.identifier_type_cd} onChange={(event) => setSubjectForm({ ...subjectForm, identifier_type_cd: event.target.value.toUpperCase() })} />
                  </Field>
                  <Field label="Identifier value">
                    <input value={subjectForm.identifier_value_txt} onChange={(event) => setSubjectForm({ ...subjectForm, identifier_value_txt: event.target.value })} />
                  </Field>
                  <Field label="Contact type">
                    <input value={subjectForm.contact_type_cd} onChange={(event) => setSubjectForm({ ...subjectForm, contact_type_cd: event.target.value.toUpperCase() })} />
                  </Field>
                  <Field label="Contact value">
                    <input value={subjectForm.contact_value_txt} onChange={(event) => setSubjectForm({ ...subjectForm, contact_value_txt: event.target.value })} />
                  </Field>
                </div>
              </div>

              <div className="registry-form-section full-span">
                <h3>Registered Address</h3>
                <div className="compact-form">
                  <Field label="Address line">
                    <input value={subjectForm.line1_txt} onChange={(event) => setSubjectForm({ ...subjectForm, line1_txt: event.target.value })} />
                  </Field>
                  <Field label="Suburb">
                    <input value={subjectForm.suburb_txt} onChange={(event) => setSubjectForm({ ...subjectForm, suburb_txt: event.target.value })} />
                  </Field>
                  <Field label="City">
                    <input value={subjectForm.city_txt} onChange={(event) => setSubjectForm({ ...subjectForm, city_txt: event.target.value })} />
                  </Field>
                  <Field label="Country">
                    <input value={subjectForm.country_cd} onChange={(event) => setSubjectForm({ ...subjectForm, country_cd: event.target.value.toUpperCase() })} />
                  </Field>
                </div>
              </div>

              <div className="registry-form-section full-span">
                <h3>Business Activity</h3>
                <div className="compact-form">
                  <Field label="Activity code">
                    <input value={subjectForm.activity_code} onChange={(event) => setSubjectForm({ ...subjectForm, activity_code: event.target.value.toUpperCase() })} />
                  </Field>
                  <Field label="Activity description">
                    <input value={subjectForm.activity_description_txt} onChange={(event) => setSubjectForm({ ...subjectForm, activity_description_txt: event.target.value })} />
                  </Field>
                  <Field label="Sector">
                    <input value={subjectForm.sector_cd} onChange={(event) => setSubjectForm({ ...subjectForm, sector_cd: event.target.value.toUpperCase() })} />
                  </Field>
                  <Field label="Start date">
                    <input type="date" value={subjectForm.activity_start_dt} onChange={(event) => setSubjectForm({ ...subjectForm, activity_start_dt: event.target.value })} />
                  </Field>
                </div>
              </div>

              <label className="check-control full-span">
                <input
                  type="checkbox"
                  checked={subjectForm.confidential_profile_bool}
                  onChange={(event) => setSubjectForm({ ...subjectForm, confidential_profile_bool: event.target.checked })}
                />
                <span>Mark profile as confidential</span>
              </label>

              <div className="form-actions full-span">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setError("");
                    void runDuplicateCheck(subjectForm).catch((submitError) => setError(submitError.message));
                  }}
                >
                  Check duplicates
                </button>
                <button className="primary-button" type="submit" disabled={saving}>
                  {saving ? "Registering" : "Register taxpayer"}
                </button>
              </div>
            </form>
          </section>

          <aside className="content-band registry-registration-grid__side">
            <div className="section-heading">
              <div>
                <span>Duplicate detection</span>
                <h2>Risk Review</h2>
              </div>
              <Fingerprint size={22} />
            </div>
            <DuplicatePanel
              candidates={duplicateCandidates}
              acknowledged={duplicatesAcknowledged}
              onAcknowledged={setDuplicatesAcknowledged}
            />
          </aside>
        </div>
      ) : null}

      {activeTab === "profile" ? (
        <div className="registry-profile-grid">
          <section className="content-band registry-profile-grid__summary">
            <div className="section-heading">
              <div>
                <span>Taxpayer profile</span>
                <h2>{selectedProfile?.display_name_txt || "Select a taxpayer"}</h2>
              </div>
              {selectedProfile ? <StatusPill tone={registryTone(selectedProfile.registry_state_cd)}>{compactCode(selectedProfile.registry_state_cd)}</StatusPill> : null}
            </div>

            {selectedProfile ? (
              <div className="registry-profile-card">
                <div>
                  <span>Taxpayer number</span>
                  <strong>{selectedProfile.subject_no}</strong>
                </div>
                <div>
                  <span>Class</span>
                  <strong>{compactCode(selectedProfile.subject_class_cd)}</strong>
                </div>
                <div>
                  <span>Registered</span>
                  <strong>{formatDate(selectedProfile.registration_dt)}</strong>
                </div>
                <div>
                  <span>Primary identifier</span>
                  <strong>{selectedProfile.primary_identifier_value_txt || "-"}</strong>
                </div>
                <div>
                  <span>Primary contact</span>
                  <strong>{selectedProfile.primary_contact_txt || "-"}</strong>
                </div>
                <div>
                  <span>Duplicate candidates</span>
                  <strong>{formatNumber(selected.duplicate_candidates?.length)}</strong>
                </div>
                <div>
                  <span>Revenue enrolments</span>
                  <strong>{formatNumber(selected.enrolments?.length)}</strong>
                </div>
                <div>
                  <span>Open dues</span>
                  <strong>{formatNumber(openDues.length)}</strong>
                </div>
                <div>
                  <span>Active holds</span>
                  <strong>{formatNumber(activeHolds.length)}</strong>
                </div>
                <div>
                  <span>Concessions</span>
                  <strong>{formatNumber(activeConcessions.length)}</strong>
                </div>
                <div>
                  <span>Accepted filings</span>
                  <strong>{formatNumber(acceptedDeclarations.length)}</strong>
                </div>
                <div>
                  <span>Open liabilities</span>
                  <strong>{formatNumber(openLiabilities.length)}</strong>
                </div>
                <div>
                  <span>Open liability value</span>
                  <strong>{formatMoney(openLiabilityTotal)}</strong>
                </div>
                <div>
                  <span>Posted notices</span>
                  <strong>{formatNumber(postedLiabilities.length)}</strong>
                </div>
                <div>
                  <span>Clearance</span>
                  <strong>{latestClearance ? compactCode(latestClearance.clearance_state_cd) : "-"}</strong>
                </div>
              </div>
            ) : (
              <EmptyRegistryState title="No taxpayer selected" text="Choose a taxpayer from search results to open the full profile." />
            )}
          </section>

          <section className="content-band registry-profile-grid__status">
            <div className="section-heading">
              <div>
                <span>Lifecycle</span>
                <h2>Status Control</h2>
              </div>
              <History size={22} />
            </div>
            {selectedProfile ? (
              <form className="stacked-form" onSubmit={updateStatus}>
                <SelectField label="Registry state" value={statusForm.registry_state_cd} onChange={(value) => setStatusForm({ ...statusForm, registry_state_cd: value })}>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING_REVIEW">Pending review</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="DEREGISTERED">Deregistered</option>
                  <option value="ARCHIVED">Archived</option>
                </SelectField>
                <Field label="Reason">
                  <textarea value={statusForm.reason_txt} onChange={(event) => setStatusForm({ ...statusForm, reason_txt: event.target.value })} />
                </Field>
                <button className="primary-button" type="submit" disabled={saving}>Update lifecycle</button>
              </form>
            ) : (
              <EmptyRegistryState title="Lifecycle locked" text="Open a taxpayer profile before recording status changes." />
            )}
          </section>

          <section className="content-band registry-profile-grid__records">
            {selectedProfile ? (
              <div className="registry-record-stack">
                <div className="registry-record-panel registry-record-panel--operational">
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Operational position</span>
                      <h2>Revenue Standing</h2>
                    </div>
                    <BadgeCheck size={20} />
                  </div>
                  <div className="registry-operational-overview">
                    <div className="registry-operational-item">
                      <Landmark size={18} />
                      <span>Enrolments</span>
                      <strong>{formatNumber(selected.enrolments?.length)}</strong>
                    </div>
                    <div className="registry-operational-item">
                      <CalendarClock size={18} />
                      <span>Open dues</span>
                      <strong>{formatNumber(openDues.length)}</strong>
                    </div>
                    <div className="registry-operational-item">
                      <Hand size={18} />
                      <span>Active holds</span>
                      <strong>{formatNumber(activeHolds.length)}</strong>
                    </div>
                    <div className="registry-operational-item">
                      <ShieldCheck size={18} />
                      <span>Active concessions</span>
                      <strong>{formatNumber(activeConcessions.length)}</strong>
                    </div>
                    <div className="registry-operational-item">
                      <FileCheck2 size={18} />
                      <span>Accepted filings</span>
                      <strong>{formatNumber(acceptedDeclarations.length)}</strong>
                    </div>
                    <div className="registry-operational-item">
                      <BadgeDollarSign size={18} />
                      <span>Open liabilities</span>
                      <strong>{formatNumber(openLiabilities.length)}</strong>
                    </div>
                    <div className="registry-operational-item">
                      <ReceiptText size={18} />
                      <span>Clearance</span>
                      <strong>{latestClearance ? compactCode(latestClearance.clearance_state_cd) : "-"}</strong>
                    </div>
                  </div>
                </div>

                <div className="registry-record-panel">
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Revenue enrolment</span>
                      <h2>Registered Obligation Streams</h2>
                    </div>
                    <Landmark size={20} />
                  </div>
                  <DataTable columns={obligationEnrolmentColumns} rows={selected.enrolments || []} keyField="enrolment_uid" empty="No revenue enrolments recorded" />
                </div>

                <div className="registry-record-panel">
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Obligation calendar</span>
                      <h2>Filing And Payment Due Dates</h2>
                    </div>
                    <CalendarClock size={20} />
                  </div>
                  <DataTable columns={obligationDueColumns} rows={selected.due_instances || []} keyField="due_instance_uid" empty="No obligation due dates generated" />
                </div>

                <div className="registry-record-panel">
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Filing history</span>
                      <h2>Declarations And Validation Status</h2>
                    </div>
                    <FileCheck2 size={20} />
                  </div>
                  <DataTable columns={declarationColumns} rows={selected.declarations || []} keyField="declaration_uid" empty="No declarations recorded" />
                </div>

                <div className="registry-record-panel">
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Assessment and liability</span>
                      <h2>Notices And Liability Totals</h2>
                    </div>
                    <Scale size={20} />
                  </div>
                  <DataTable columns={liabilityNoticeColumns} rows={selected.liability_notices || []} keyField="liability_notice_uid" empty="No liability notices recorded" />
                </div>

                <div className="registry-record-panel">
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Clearance position</span>
                      <h2>Open Liabilities, Holds And Disputes</h2>
                    </div>
                    <ReceiptText size={20} />
                  </div>
                  <DataTable columns={clearanceColumns} rows={selected.clearance_snapshots || []} keyField="clearance_snapshot_uid" empty="No clearance snapshots recorded" />
                </div>

                <div className="registry-record-panel">
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Controls</span>
                      <h2>Holds And Concessions</h2>
                    </div>
                    <Hand size={20} />
                  </div>
                  <DataTable columns={accountHoldColumns} rows={selected.account_holds || []} keyField="account_hold_uid" empty="No account holds recorded" />
                  <DataTable columns={concessionColumns} rows={selected.concessions || []} keyField="concession_uid" empty="No concessions recorded" />
                </div>

                <div className="registry-record-panel">
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Revenue lifecycle</span>
                      <h2>Operational History</h2>
                    </div>
                    <History size={20} />
                  </div>
                  <DataTable columns={obligationLifecycleColumns} rows={selected.obligation_lifecycle_events || []} keyField="lifecycle_event_uid" empty="No obligation lifecycle events recorded" />
                  <DataTable columns={assessmentLifecycleColumns} rows={selected.assessment_lifecycle_events || []} keyField="lifecycle_event_uid" empty="No assessment lifecycle events recorded" />
                </div>

                <div className="registry-record-panel">
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Names</span>
                      <h2>Legal And Trading Names</h2>
                    </div>
                    <BookOpenCheck size={20} />
                  </div>
                  <form
                    className="compact-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void addProfileRecord("names", nameForm, () => setNameForm(initialName), "Name record added.");
                    }}
                  >
                    <Field label="Legal name">
                      <input value={nameForm.legal_name_txt} onChange={(event) => setNameForm({ ...nameForm, legal_name_txt: event.target.value })} />
                    </Field>
                    <Field label="Trading name">
                      <input value={nameForm.trading_name_txt} onChange={(event) => setNameForm({ ...nameForm, trading_name_txt: event.target.value })} />
                    </Field>
                    <Field label="First name">
                      <input value={nameForm.first_name_txt} onChange={(event) => setNameForm({ ...nameForm, first_name_txt: event.target.value })} />
                    </Field>
                    <Field label="Last name">
                      <input value={nameForm.last_name_txt} onChange={(event) => setNameForm({ ...nameForm, last_name_txt: event.target.value })} />
                    </Field>
                    <button className="secondary-button full-span" type="submit">Add name</button>
                  </form>
                  <DataTable columns={nameColumns} rows={selected.names || []} keyField="subject_name_uid" empty="No names recorded" />
                </div>

                <div className="registry-record-panel">
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Identifiers</span>
                      <h2>Identifier Management</h2>
                    </div>
                    <Fingerprint size={20} />
                  </div>
                  <form
                    className="compact-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void addProfileRecord("identifiers", identifierForm, () => setIdentifierForm(initialIdentifier), "Identifier added.");
                    }}
                  >
                    <Field label="Type">
                      <input required value={identifierForm.identifier_type_cd} onChange={(event) => setIdentifierForm({ ...identifierForm, identifier_type_cd: event.target.value.toUpperCase() })} />
                    </Field>
                    <Field label="Value">
                      <input required value={identifierForm.identifier_value_txt} onChange={(event) => setIdentifierForm({ ...identifierForm, identifier_value_txt: event.target.value })} />
                    </Field>
                    <Field label="Country">
                      <input value={identifierForm.issuing_country_cd} onChange={(event) => setIdentifierForm({ ...identifierForm, issuing_country_cd: event.target.value.toUpperCase() })} />
                    </Field>
                    <SelectField label="Verification" value={identifierForm.verification_state_cd} onChange={(value) => setIdentifierForm({ ...identifierForm, verification_state_cd: value })}>
                      <option value="UNVERIFIED">Unverified</option>
                      <option value="VERIFIED">Verified</option>
                      <option value="REJECTED">Rejected</option>
                    </SelectField>
                    <button className="secondary-button full-span" type="submit">Add identifier</button>
                  </form>
                  <DataTable columns={identifierColumns} rows={selected.identifiers || []} keyField="subject_identifier_uid" empty="No identifiers recorded" />
                </div>

                <div className="registry-record-panel">
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Contact points</span>
                      <h2>Email, Phone And Service Channels</h2>
                    </div>
                    <ContactRound size={20} />
                  </div>
                  <form
                    className="compact-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void addProfileRecord("contacts", contactForm, () => setContactForm(initialContact), "Contact added.");
                    }}
                  >
                    <Field label="Type">
                      <input required value={contactForm.contact_type_cd} onChange={(event) => setContactForm({ ...contactForm, contact_type_cd: event.target.value.toUpperCase() })} />
                    </Field>
                    <Field label="Value">
                      <input required value={contactForm.contact_value_txt} onChange={(event) => setContactForm({ ...contactForm, contact_value_txt: event.target.value })} />
                    </Field>
                    <Field label="Usage">
                      <input value={contactForm.usage_role_cd} onChange={(event) => setContactForm({ ...contactForm, usage_role_cd: event.target.value.toUpperCase() })} />
                    </Field>
                    <button className="secondary-button" type="submit">Add contact</button>
                  </form>
                  <DataTable columns={contactColumns} rows={selected.contacts || []} keyField="subject_contact_uid" empty="No contacts recorded" />
                </div>

                <div className="registry-record-panel">
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Addresses and premises</span>
                      <h2>Registered Locations</h2>
                    </div>
                    <MapPin size={20} />
                  </div>
                  <form
                    className="compact-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void addProfileRecord("addresses", addressForm, () => setAddressForm(initialAddress), "Address added.");
                    }}
                  >
                    <Field label="Role">
                      <input value={addressForm.address_role_cd} onChange={(event) => setAddressForm({ ...addressForm, address_role_cd: event.target.value.toUpperCase() })} />
                    </Field>
                    <Field label="Address line">
                      <input required value={addressForm.line1_txt} onChange={(event) => setAddressForm({ ...addressForm, line1_txt: event.target.value })} />
                    </Field>
                    <Field label="City">
                      <input value={addressForm.city_txt} onChange={(event) => setAddressForm({ ...addressForm, city_txt: event.target.value })} />
                    </Field>
                    <Field label="Country">
                      <input value={addressForm.country_cd} onChange={(event) => setAddressForm({ ...addressForm, country_cd: event.target.value.toUpperCase() })} />
                    </Field>
                    <button className="secondary-button full-span" type="submit">Add address</button>
                  </form>
                  <DataTable columns={addressColumns} rows={selected.addresses || []} keyField="subject_address_uid" empty="No addresses recorded" />
                </div>

                <div className="registry-record-panel">
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Business activity</span>
                      <h2>Industry And Turnover Profile</h2>
                    </div>
                    <Activity size={20} />
                  </div>
                  <form
                    className="compact-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void addProfileRecord("activities", activityForm, () => setActivityForm(initialActivity), "Business activity added.");
                    }}
                  >
                    <Field label="Activity code">
                      <input required value={activityForm.activity_code} onChange={(event) => setActivityForm({ ...activityForm, activity_code: event.target.value.toUpperCase() })} />
                    </Field>
                    <Field label="Description">
                      <input value={activityForm.activity_description_txt} onChange={(event) => setActivityForm({ ...activityForm, activity_description_txt: event.target.value })} />
                    </Field>
                    <Field label="Sector">
                      <input value={activityForm.sector_cd} onChange={(event) => setActivityForm({ ...activityForm, sector_cd: event.target.value.toUpperCase() })} />
                    </Field>
                    <Field label="Start date">
                      <input type="date" value={activityForm.start_dt} onChange={(event) => setActivityForm({ ...activityForm, start_dt: event.target.value })} />
                    </Field>
                    <button className="secondary-button full-span" type="submit">Add activity</button>
                  </form>
                  <DataTable columns={activityColumns} rows={selected.activities || []} keyField="subject_activity_uid" empty="No activities recorded" />
                </div>

                <div className="registry-record-panel">
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Relationships</span>
                      <h2>Directors, Agents, Employers And Related Parties</h2>
                    </div>
                    <Link2 size={20} />
                  </div>
                  <form
                    className="compact-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void addProfileRecord(
                        "relationships",
                        { ...relationshipForm, ownership_percent: relationshipForm.ownership_percent || null },
                        () => setRelationshipForm(initialRelationship),
                        "Relationship added."
                      );
                    }}
                  >
                    <SelectField label="Related taxpayer" value={relationshipForm.related_subject_uid} onChange={(value) => setRelationshipForm({ ...relationshipForm, related_subject_uid: value })} required>
                      <option value="">Select taxpayer</option>
                      {subjectOptions.map((subject) => (
                        <option key={subject.subject_uid} value={subject.subject_uid}>
                          {subject.display_name_txt}
                        </option>
                      ))}
                    </SelectField>
                    <Field label="Relationship type">
                      <input value={relationshipForm.relationship_type_cd} onChange={(event) => setRelationshipForm({ ...relationshipForm, relationship_type_cd: event.target.value.toUpperCase() })} />
                    </Field>
                    <Field label="Ownership %">
                      <input type="number" min="0" max="100" step="0.00001" value={relationshipForm.ownership_percent} onChange={(event) => setRelationshipForm({ ...relationshipForm, ownership_percent: event.target.value })} />
                    </Field>
                    <button className="secondary-button" type="submit">Add relationship</button>
                  </form>
                  <DataTable columns={relationshipColumns} rows={selected.relationships || []} keyField="relationship_uid" empty="No relationships recorded" />
                </div>

                <div className="registry-record-panel">
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Lifecycle history</span>
                      <h2>Status Events</h2>
                    </div>
                    <History size={20} />
                  </div>
                  <DataTable columns={lifecycleColumns} rows={selected.lifecycle_events || []} keyField="lifecycle_event_uid" empty="No lifecycle events recorded" />
                </div>

                <div className="registry-record-panel">
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Audit trail</span>
                      <h2>Record Activity</h2>
                    </div>
                    <ShieldCheck size={20} />
                  </div>
                  <DataTable columns={auditColumns} rows={selected.audit_events || []} keyField="audit_event_uid" empty="No audit events recorded" />
                </div>
              </div>
            ) : (
              <DataTable
                columns={subjectColumns}
                rows={subjects}
                keyField="subject_uid"
                onRowClick={(row) => loadProfile(row.subject_uid)}
                empty="Select a taxpayer from the registry index"
              />
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}
