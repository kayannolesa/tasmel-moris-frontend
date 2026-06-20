import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  BadgeCheck,
  Banknote,
  BookOpenCheck,
  Building2,
  CalendarClock,
  ContactRound,
  FileCheck2,
  FileText,
  Fingerprint,
  Gavel,
  History,
  Hand,
  Landmark,
  Link2,
  MapPin,
  Plus,
  ReceiptText,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Scale,
  UserRound,
  UsersRound,
  WalletCards,
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

function financeTone(state) {
  if (["ALLOCATED", "PAID", "APPROVED", "RESOLVED", "POSTED"].includes(state)) return "success";
  if (["REQUESTED", "OPEN", "DRAFT"].includes(state)) return "warning";
  if (["REVERSED", "REJECTED", "CANCELLED"].includes(state)) return "danger";
  return "neutral";
}

function recoveryTone(state) {
  if (["CLOSED", "COMPLETED", "PAID", "LOW", "RELEASED", "APPROVED"].includes(state)) return "success";
  if (["OPEN", "UNDER_REVIEW", "INSTALMENT", "PENDING", "PROPOSED", "MEDIUM"].includes(state)) return "warning";
  if (["ENFORCEMENT", "LEGAL", "HIGH", "CRITICAL", "MISSED", "DEFAULTED", "UNRECOVERABLE"].includes(state)) return "danger";
  return "neutral";
}

function complianceTone(state) {
  if (["LOW", "CLOSED", "COMPLETED", "ACCEPTED", "RESOLVED", "SATISFIED"].includes(state)) return "success";
  if (["MEDIUM", "NORMAL", "OPEN", "DRAFT", "PLANNED", "ISSUED", "LODGED", "QUEUED", "IN_PROGRESS"].includes(state)) return "warning";
  if (["HIGH", "CRITICAL", "URGENT", "RESTRICTED", "ESCALATED", "REJECTED"].includes(state)) return "danger";
  return "neutral";
}

function disputeTone(state) {
  if (["DECIDED", "CLOSED", "UPHOLD", "UPHELD", "VARY", "VARIED", "NOTICE_ISSUED", "WITHDRAWN"].includes(state)) return "success";
  if (["LODGED", "UNDER_REVIEW", "IN_REVIEW", "OPEN", "FILED", "AWAITING_INFORMATION", "PENDING"].includes(state)) return "warning";
  if (["ESCALATED", "DECISION_DUE", "APPEALED", "REJECTED", "CANCELLED", "DISMISSED"].includes(state)) return "danger";
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
  const accountBalanceTotal = selected?.account_summaries?.reduce((total, account) => total + Number(account.balance_amt || 0), 0) || 0;
  const receiptTotal = selected?.receipts?.reduce((total, receipt) => total + Number(receipt.total_received_amt || 0), 0) || 0;
  const openSuspenseItems = selected?.suspense_items?.filter((item) => item.suspense_state_cd === "OPEN") || [];
  const pendingRefunds = selected?.refunds?.filter((refund) => ["REQUESTED", "APPROVED"].includes(refund.refund_state_cd)) || [];
  const activeRecoveryMatters = selected?.recovery_matters?.filter((matter) => ["OPEN", "UNDER_REVIEW", "INSTALMENT", "ENFORCEMENT", "LEGAL"].includes(matter.matter_state_cd)) || [];
  const activeEnforcementMeasures = selected?.enforcement_measures?.filter((measure) => ["PENDING", "APPROVED", "ACTIVE"].includes(measure.measure_state_cd)) || [];
  const activeInstalmentPlans = selected?.instalment_plans?.filter((plan) => ["PROPOSED", "APPROVED", "ACTIVE", "DEFAULTED"].includes(plan.plan_state_cd)) || [];
  const missedInstalments = selected?.instalment_lines?.filter((line) => line.line_state_cd === "MISSED") || [];
  const recoveryBalanceTotal = activeRecoveryMatters.reduce((total, matter) => total + Number(matter.balance_amt || 0), 0);
  const elevatedRiskProfiles = selected?.risk_profiles?.filter((profile) => ["HIGH", "CRITICAL"].includes(profile.risk_rating_cd)) || [];
  const openComplianceActions = selected?.compliance_actions?.filter((action) => ["OPEN", "ASSIGNED", "IN_PROGRESS", "ESCALATED"].includes(action.action_state_cd)) || [];
  const openAudits = selected?.audit_engagements?.filter((audit) => ["PLANNED", "OPEN", "IN_PROGRESS"].includes(audit.audit_state_cd)) || [];
  const openInvestigations = selected?.investigations?.filter((investigation) => ["OPEN", "UNDER_REVIEW", "ESCALATED"].includes(investigation.investigation_state_cd)) || [];
  const openInformationRequests = selected?.information_requests?.filter((request) => ["DRAFT", "ISSUED"].includes(request.request_state_cd)) || [];
  const openReviewFiles = selected?.review_files?.filter((review) => ["LODGED", "IN_REVIEW", "UNDER_REVIEW", "AWAITING_INFORMATION", "ESCALATED"].includes(review.review_state_cd) || ["LODGED", "UNDER_REVIEW", "AWAITING_INFORMATION", "DECISION_DUE", "ESCALATED"].includes(review.queue_state_cd)) || [];
  const openExternalAppeals = selected?.external_appeals?.filter((appeal) => ["FILED", "HEARING_SCHEDULED", "UNDER_REVIEW"].includes(appeal.appeal_state_cd)) || [];
  const disputedReviewTotal = selected?.review_issues?.reduce((total, issue) => total + Number(issue.disputed_amt || 0), 0) || 0;

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

  const accountSummaryColumns = [
    { key: "revenue_kind_name", label: "Revenue type", render: (row) => row.revenue_kind_name || "All revenue" },
    { key: "component_name", label: "Component", render: (row) => row.component_name || "-" },
    { key: "debit_total_amt", label: "Debit", render: (row) => formatMoney(row.debit_total_amt || 0) },
    { key: "credit_total_amt", label: "Credit", render: (row) => formatMoney(row.credit_total_amt || 0) },
    { key: "balance_amt", label: "Balance", render: (row) => formatMoney(row.balance_amt || 0) },
    { key: "last_posting_ts", label: "Last posting", render: (row) => formatDateTime(row.last_posting_ts) },
  ];

  const receiptColumns = [
    { key: "receipt_no", label: "Receipt" },
    { key: "received_ts", label: "Received", render: (row) => formatDateTime(row.received_ts) },
    { key: "total_received_amt", label: "Received", render: (row) => formatMoney(row.total_received_amt || 0) },
    { key: "allocated_amt", label: "Allocated", render: (row) => formatMoney(row.allocated_amt || 0) },
    { key: "suspense_amt", label: "Suspense", render: (row) => formatMoney(row.suspense_amt || 0) },
    {
      key: "receipt_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={financeTone(row.receipt_state_cd)}>{compactCode(row.receipt_state_cd)}</StatusPill>,
    },
  ];

  const suspenseColumns = [
    { key: "suspense_no", label: "Suspense" },
    { key: "receipt_no", label: "Receipt", render: (row) => row.receipt_no || "-" },
    { key: "suspense_amt", label: "Amount", render: (row) => formatMoney(row.suspense_amt || 0) },
    { key: "allocated_amt", label: "Allocated", render: (row) => formatMoney(row.allocated_amt || 0) },
    { key: "suspense_reason_txt", label: "Reason", render: (row) => row.suspense_reason_txt || "-" },
    {
      key: "suspense_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={financeTone(row.suspense_state_cd)}>{compactCode(row.suspense_state_cd)}</StatusPill>,
    },
  ];

  const refundColumns = [
    { key: "refund_request_no", label: "Refund" },
    { key: "revenue_kind_name", label: "Revenue type", render: (row) => row.revenue_kind_name || "All revenue" },
    { key: "requested_amt", label: "Requested", render: (row) => formatMoney(row.requested_amt || 0) },
    { key: "approved_amt", label: "Approved", render: (row) => formatMoney(row.approved_amt || 0) },
    {
      key: "refund_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={financeTone(row.refund_state_cd)}>{compactCode(row.refund_state_cd)}</StatusPill>,
    },
  ];

  const recoveryMatterColumns = [
    { key: "recovery_matter_no", label: "Matter" },
    { key: "revenue_kind_name", label: "Revenue type", render: (row) => row.revenue_kind_name || "All revenue" },
    { key: "liability_notice_no", label: "Notice", render: (row) => row.liability_notice_no || "-" },
    { key: "balance_amt", label: "Balance", render: (row) => formatMoney(row.balance_amt || 0) },
    { key: "overdue_days_no", label: "Overdue", render: (row) => `${formatNumber(row.overdue_days_no)} days` },
    {
      key: "priority_cd",
      label: "Priority",
      render: (row) => <StatusPill tone={recoveryTone(row.priority_cd)}>{compactCode(row.priority_cd)}</StatusPill>,
    },
    {
      key: "matter_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={recoveryTone(row.matter_state_cd)}>{compactCode(row.matter_state_cd)}</StatusPill>,
    },
  ];

  const recoveryActionColumns = [
    { key: "recovery_matter_no", label: "Matter" },
    { key: "action_type_cd", label: "Action", render: (row) => compactCode(row.action_type_cd) },
    { key: "scheduled_dt", label: "Scheduled", render: (row) => formatDate(row.scheduled_dt) },
    { key: "assigned_name", label: "Officer", render: (row) => row.assigned_name || "-" },
    { key: "outcome_cd", label: "Outcome", render: (row) => row.outcome_cd ? compactCode(row.outcome_cd) : "-" },
    {
      key: "action_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={recoveryTone(row.action_state_cd)}>{compactCode(row.action_state_cd)}</StatusPill>,
    },
  ];

  const instalmentPlanColumns = [
    { key: "plan_no", label: "Plan" },
    { key: "recovery_matter_no", label: "Matter", render: (row) => row.recovery_matter_no || "-" },
    { key: "total_plan_amt", label: "Amount", render: (row) => formatMoney(row.total_plan_amt || 0) },
    { key: "next_due_dt", label: "Next due", render: (row) => formatDate(row.next_due_dt) },
    { key: "missed_instalment_count_no", label: "Missed", render: (row) => formatNumber(row.missed_instalment_count_no) },
    {
      key: "plan_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={recoveryTone(row.plan_state_cd)}>{compactCode(row.plan_state_cd)}</StatusPill>,
    },
  ];

  const enforcementColumns = [
    { key: "recovery_matter_no", label: "Matter" },
    { key: "measure_type_cd", label: "Measure", render: (row) => compactCode(row.measure_type_cd) },
    { key: "restriction_scope_cd", label: "Scope", render: (row) => row.restriction_scope_cd ? compactCode(row.restriction_scope_cd) : "-" },
    { key: "amount_secured_amt", label: "Secured", render: (row) => formatMoney(row.amount_secured_amt || 0) },
    {
      key: "approval_state_cd",
      label: "Approval",
      render: (row) => <StatusPill tone={recoveryTone(row.approval_state_cd)}>{compactCode(row.approval_state_cd)}</StatusPill>,
    },
    {
      key: "measure_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={recoveryTone(row.measure_state_cd)}>{compactCode(row.measure_state_cd)}</StatusPill>,
    },
  ];

  const legalReferralColumns = [
    { key: "referral_no", label: "Referral" },
    { key: "recovery_matter_no", label: "Matter" },
    { key: "referred_to_txt", label: "Referred to" },
    { key: "legal_case_reference_txt", label: "Case reference", render: (row) => row.legal_case_reference_txt || row.solicitor_reference_txt || "-" },
    { key: "next_hearing_dt", label: "Next hearing", render: (row) => formatDate(row.next_hearing_dt) },
    {
      key: "referral_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={recoveryTone(row.referral_state_cd)}>{compactCode(row.referral_state_cd)}</StatusPill>,
    },
  ];

  const collectabilityColumns = [
    { key: "recovery_matter_no", label: "Matter" },
    { key: "review_dt", label: "Review", render: (row) => formatDate(row.review_dt) },
    {
      key: "collectability_cd",
      label: "Collectability",
      render: (row) => <StatusPill tone={recoveryTone(row.collectability_cd)}>{compactCode(row.collectability_cd)}</StatusPill>,
    },
    { key: "recommended_action_cd", label: "Recommendation", render: (row) => row.recommended_action_cd ? compactCode(row.recommended_action_cd) : "-" },
    { key: "reviewed_by_name", label: "Officer", render: (row) => row.reviewed_by_name || "-" },
  ];

  const documentColumns = [
    { key: "content_no", label: "Document" },
    { key: "document_title_txt", label: "Title", render: (row) => row.document_title_txt || row.file_name_txt || "-" },
    { key: "document_category_cd", label: "Category", render: (row) => compactCode(row.document_category_cd || row.content_type_cd) },
    { key: "issue_dt", label: "Issue date", render: (row) => formatDate(row.issue_dt) },
    { key: "storage_backend_cd", label: "Storage", render: (row) => compactCode(row.storage_backend_cd) },
    { key: "document_state_cd", label: "State", render: (row) => <StatusPill tone={row.document_state_cd === "ISSUED" || row.document_state_cd === "REGISTERED" ? "success" : "neutral"}>{compactCode(row.document_state_cd)}</StatusPill> },
  ];

  const messageColumns = [
    { key: "message_no", label: "Message" },
    { key: "subject_txt", label: "Subject", render: (row) => row.subject_txt || "-" },
    { key: "delivery_channel_cd", label: "Channel", render: (row) => compactCode(row.delivery_channel_cd) },
    { key: "sent_ts", label: "Sent", render: (row) => formatDateTime(row.sent_ts) },
    { key: "portal_visible_bool", label: "Portal", render: (row) => row.portal_visible_bool ? "Visible" : "Internal" },
    { key: "message_state_cd", label: "State", render: (row) => <StatusPill tone={row.message_state_cd === "READ" || row.message_state_cd === "DELIVERED" || row.message_state_cd === "SENT" ? "success" : "warning"}>{compactCode(row.message_state_cd)}</StatusPill> },
  ];

  const riskProfileColumns = [
    { key: "risk_scope_cd", label: "Scope", render: (row) => compactCode(row.risk_scope_cd) },
    { key: "risk_score_no", label: "Score", render: (row) => formatNumber(row.risk_score_no) },
    { key: "signal_count", label: "Signals", render: (row) => formatNumber(row.signal_count) },
    { key: "queue_state_cd", label: "Queue", render: (row) => <StatusPill tone={complianceTone(row.queue_state_cd)}>{compactCode(row.queue_state_cd)}</StatusPill> },
    { key: "risk_rating_cd", label: "Rating", render: (row) => <StatusPill tone={complianceTone(row.risk_rating_cd)}>{compactCode(row.risk_rating_cd)}</StatusPill> },
  ];

  const riskSignalColumns = [
    { key: "signal_name", label: "Signal" },
    { key: "signal_group_cd", label: "Group", render: (row) => compactCode(row.signal_group_cd || row.signal_source_cd) },
    { key: "signal_weight_no", label: "Weight", render: (row) => formatNumber(row.signal_weight_no) },
    { key: "signal_value_txt", label: "Value", render: (row) => row.signal_value_txt || "-" },
  ];

  const compliancePlanColumns = [
    { key: "plan_name", label: "Plan" },
    { key: "priority_cd", label: "Priority", render: (row) => <StatusPill tone={complianceTone(row.priority_cd)}>{compactCode(row.priority_cd)}</StatusPill> },
    { key: "target_completion_dt", label: "Target", render: (row) => formatDate(row.target_completion_dt || row.end_dt) },
    { key: "plan_state_cd", label: "State", render: (row) => <StatusPill tone={complianceTone(row.plan_state_cd)}>{compactCode(row.plan_state_cd)}</StatusPill> },
  ];

  const complianceActionColumns = [
    { key: "action_no", label: "Action" },
    { key: "plan_name", label: "Plan", render: (row) => row.plan_name || "-" },
    { key: "action_type_cd", label: "Type", render: (row) => compactCode(row.action_type_cd) },
    { key: "due_dt", label: "Due", render: (row) => formatDate(row.due_dt) },
    { key: "action_state_cd", label: "State", render: (row) => <StatusPill tone={complianceTone(row.action_state_cd)}>{compactCode(row.action_state_cd)}</StatusPill> },
  ];

  const complianceAuditColumns = [
    { key: "audit_no", label: "Audit" },
    { key: "scope_txt", label: "Scope", render: (row) => row.scope_txt || "-" },
    { key: "start_dt", label: "Start", render: (row) => formatDate(row.start_dt) },
    { key: "lead_name", label: "Lead", render: (row) => row.lead_name || "-" },
    { key: "audit_state_cd", label: "State", render: (row) => <StatusPill tone={complianceTone(row.audit_state_cd)}>{compactCode(row.audit_state_cd)}</StatusPill> },
  ];

  const informationRequestColumns = [
    { key: "request_no", label: "Request" },
    { key: "request_type_cd", label: "Type", render: (row) => compactCode(row.request_type_cd) },
    { key: "due_dt", label: "Due", render: (row) => formatDate(row.due_dt) },
    { key: "response_document_no", label: "Response", render: (row) => row.response_document_no || "-" },
    { key: "request_state_cd", label: "State", render: (row) => <StatusPill tone={complianceTone(row.request_state_cd)}>{compactCode(row.request_state_cd)}</StatusPill> },
  ];

  const investigationColumns = [
    { key: "investigation_no", label: "Investigation" },
    { key: "investigation_type_cd", label: "Type", render: (row) => compactCode(row.investigation_type_cd) },
    { key: "restriction_level_cd", label: "Restriction", render: (row) => compactCode(row.restriction_level_cd) },
    { key: "lead_name", label: "Lead", render: (row) => row.lead_name || "-" },
    { key: "investigation_state_cd", label: "State", render: (row) => <StatusPill tone={complianceTone(row.investigation_state_cd)}>{compactCode(row.investigation_state_cd)}</StatusPill> },
  ];

  const evidenceColumns = [
    { key: "evidence_no", label: "Evidence" },
    { key: "investigation_no", label: "Case", render: (row) => row.investigation_no || row.audit_no || "-" },
    { key: "evidence_type_cd", label: "Type", render: (row) => compactCode(row.evidence_type_cd) },
    { key: "file_name_txt", label: "Document", render: (row) => row.file_name_txt || row.content_no || "-" },
    { key: "custody_state_cd", label: "Custody", render: (row) => <StatusPill tone={complianceTone(row.custody_state_cd)}>{compactCode(row.custody_state_cd)}</StatusPill> },
  ];

  const disclosureColumns = [
    { key: "disclosure_no", label: "Disclosure" },
    { key: "estimated_liability_amt", label: "Estimate", render: (row) => formatMoney(row.estimated_liability_amt) },
    { key: "assessed_liability_amt", label: "Assessed", render: (row) => formatMoney(row.assessed_liability_amt) },
    { key: "relief_decision_cd", label: "Relief", render: (row) => compactCode(row.relief_decision_cd) },
    { key: "disclosure_state_cd", label: "State", render: (row) => <StatusPill tone={complianceTone(row.disclosure_state_cd)}>{compactCode(row.disclosure_state_cd)}</StatusPill> },
  ];

  const reviewFileColumns = [
    { key: "review_file_no", label: "Review" },
    { key: "liability_notice_no", label: "Notice", render: (row) => row.liability_notice_no || "-" },
    { key: "revenue_kind_name", label: "Revenue", render: (row) => row.revenue_kind_name || "All revenue" },
    { key: "decision_due_dt", label: "Due", render: (row) => formatDate(row.decision_due_dt) },
    { key: "disputed_amt", label: "Disputed", render: (row) => formatMoney(row.disputed_amt) },
    { key: "queue_state_cd", label: "Queue", render: (row) => <StatusPill tone={disputeTone(row.queue_state_cd)}>{compactCode(row.queue_state_cd)}</StatusPill> },
  ];

  const reviewIssueColumns = [
    { key: "review_file_no", label: "Review" },
    { key: "issue_type_cd", label: "Issue", render: (row) => compactCode(row.issue_type_cd) },
    { key: "disputed_amt", label: "Disputed", render: (row) => formatMoney(row.disputed_amt) },
    { key: "content_no", label: "Evidence", render: (row) => row.content_no || row.file_name_txt || "-" },
    { key: "issue_state_cd", label: "State", render: (row) => <StatusPill tone={disputeTone(row.issue_state_cd)}>{compactCode(row.issue_state_cd)}</StatusPill> },
  ];

  const reviewDecisionColumns = [
    { key: "review_file_no", label: "Review" },
    { key: "decision_cd", label: "Decision", render: (row) => <StatusPill tone={disputeTone(row.decision_cd)}>{compactCode(row.decision_cd)}</StatusPill> },
    { key: "decision_dt", label: "Date", render: (row) => formatDate(row.decision_dt) },
    { key: "financial_impact_amt", label: "Impact", render: (row) => formatMoney(row.financial_impact_amt) },
    { key: "decision_notice_no", label: "Notice", render: (row) => row.decision_notice_no || "-" },
    { key: "implementation_state_cd", label: "Implementation", render: (row) => <StatusPill tone={disputeTone(row.implementation_state_cd)}>{compactCode(row.implementation_state_cd)}</StatusPill> },
  ];

  const externalAppealColumns = [
    { key: "appeal_no", label: "Appeal" },
    { key: "review_file_no", label: "Review" },
    { key: "external_reference_no", label: "External ref", render: (row) => row.external_reference_no || "-" },
    { key: "court_or_tribunal_txt", label: "Body", render: (row) => row.court_or_tribunal_txt || row.appeal_body_txt || "-" },
    { key: "hearing_dt", label: "Hearing", render: (row) => formatDate(row.hearing_dt) },
    { key: "appeal_state_cd", label: "State", render: (row) => <StatusPill tone={disputeTone(row.appeal_state_cd)}>{compactCode(row.appeal_state_cd)}</StatusPill> },
  ];

  const reviewLinkColumns = [
    { key: "review_file_no", label: "Review", render: (row) => row.review_file_no || "-" },
    { key: "target_schema_cd", label: "Domain", render: (row) => compactCode(row.target_schema_cd) },
    { key: "target_table_cd", label: "Record", render: (row) => compactCode(row.target_table_cd) },
    { key: "target_role_cd", label: "Role", render: (row) => compactCode(row.target_role_cd) },
  ];

  const reviewLifecycleColumns = [
    { key: "event_ts", label: "Time", render: (row) => formatDateTime(row.event_ts) },
    { key: "review_file_no", label: "Review" },
    { key: "event_type_cd", label: "Event", render: (row) => compactCode(row.event_type_cd) },
    { key: "to_review_state_cd", label: "State", render: (row) => <StatusPill tone={disputeTone(row.to_review_state_cd)}>{compactCode(row.to_review_state_cd)}</StatusPill> },
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
                <div>
                  <span>Account balance</span>
                  <strong>{formatMoney(accountBalanceTotal)}</strong>
                </div>
                <div>
                  <span>Receipt total</span>
                  <strong>{formatMoney(receiptTotal)}</strong>
                </div>
                <div>
                  <span>Open suspense</span>
                  <strong>{formatNumber(openSuspenseItems.length)}</strong>
                </div>
                <div>
                  <span>Pending refunds</span>
                  <strong>{formatNumber(pendingRefunds.length)}</strong>
                </div>
                <div>
                  <span>Active recovery</span>
                  <strong>{formatNumber(activeRecoveryMatters.length)}</strong>
                </div>
                <div>
                  <span>Recovery balance</span>
                  <strong>{formatMoney(recoveryBalanceTotal)}</strong>
                </div>
                <div>
                  <span>Enforcement</span>
                  <strong>{formatNumber(activeEnforcementMeasures.length)}</strong>
                </div>
                <div>
                  <span>Instalment plans</span>
                  <strong>{formatNumber(activeInstalmentPlans.length)}</strong>
                </div>
                <div>
                  <span>Missed instalments</span>
                  <strong>{formatNumber(missedInstalments.length)}</strong>
                </div>
                <div>
                  <span>Official documents</span>
                  <strong>{formatNumber(selected.documents?.length)}</strong>
                </div>
                <div>
                  <span>Messages</span>
                  <strong>{formatNumber(selected.messages?.length)}</strong>
                </div>
                <div>
                  <span>Risk profiles</span>
                  <strong>{formatNumber(selected.risk_profiles?.length)}</strong>
                </div>
                <div>
                  <span>Elevated risk</span>
                  <strong>{formatNumber(elevatedRiskProfiles.length)}</strong>
                </div>
                <div>
                  <span>Compliance actions</span>
                  <strong>{formatNumber(openComplianceActions.length)}</strong>
                </div>
                <div>
                  <span>Open audits</span>
                  <strong>{formatNumber(openAudits.length)}</strong>
                </div>
                <div>
                  <span>Investigations</span>
                  <strong>{formatNumber(openInvestigations.length)}</strong>
                </div>
                <div>
                  <span>Info requests</span>
                  <strong>{formatNumber(openInformationRequests.length)}</strong>
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
                    <div className="registry-operational-item">
                      <Banknote size={18} />
                      <span>Balance</span>
                      <strong>{formatMoney(accountBalanceTotal)}</strong>
                    </div>
                    <div className="registry-operational-item">
                      <WalletCards size={18} />
                      <span>Suspense</span>
                      <strong>{formatNumber(openSuspenseItems.length)}</strong>
                    </div>
                    <div className="registry-operational-item">
                      <Gavel size={18} />
                      <span>Recovery</span>
                      <strong>{formatNumber(activeRecoveryMatters.length)}</strong>
                    </div>
                    <div className="registry-operational-item">
                      <ShieldAlert size={18} />
                      <span>Enforcement</span>
                      <strong>{formatNumber(activeEnforcementMeasures.length)}</strong>
                    </div>
                    <div className="registry-operational-item">
                      <CalendarClock size={18} />
                      <span>Instalments</span>
                      <strong>{formatNumber(activeInstalmentPlans.length)}</strong>
                    </div>
                    <div className="registry-operational-item">
                      <AlertTriangle size={18} />
                      <span>Elevated risk</span>
                      <strong>{formatNumber(elevatedRiskProfiles.length)}</strong>
                    </div>
                    <div className="registry-operational-item">
                      <ShieldAlert size={18} />
                      <span>Compliance actions</span>
                      <strong>{formatNumber(openComplianceActions.length)}</strong>
                    </div>
                    <div className="registry-operational-item">
                      <Gavel size={18} />
                      <span>Open audits</span>
                      <strong>{formatNumber(openAudits.length)}</strong>
                    </div>
                    <div className="registry-operational-item">
                      <FileText size={18} />
                      <span>Evidence</span>
                      <strong>{formatNumber(selected.evidence_records?.length)}</strong>
                    </div>
                    <div className="registry-operational-item">
                      <Scale size={18} />
                      <span>Open reviews</span>
                      <strong>{formatNumber(openReviewFiles.length)}</strong>
                    </div>
                    <div className="registry-operational-item">
                      <BadgeDollarSign size={18} />
                      <span>Disputed</span>
                      <strong>{formatMoney(disputedReviewTotal)}</strong>
                    </div>
                    <div className="registry-operational-item">
                      <Gavel size={18} />
                      <span>Appeals</span>
                      <strong>{formatNumber(openExternalAppeals.length)}</strong>
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
                      <span>Finance position</span>
                      <h2>Account Balances And Receipts</h2>
                    </div>
                    <Banknote size={20} />
                  </div>
                  <DataTable columns={accountSummaryColumns} rows={selected.account_summaries || []} keyField="account_summary_uid" empty="No account summaries recorded" />
                  <DataTable columns={receiptColumns} rows={selected.receipts || []} keyField="receipt_event_uid" empty="No receipts recorded" />
                </div>

                <div className="registry-record-panel">
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Financial controls</span>
                      <h2>Suspense And Refunds</h2>
                    </div>
                    <WalletCards size={20} />
                  </div>
                  <DataTable columns={suspenseColumns} rows={selected.suspense_items || []} keyField="suspense_item_uid" empty="No suspense items recorded" />
                  <DataTable columns={refundColumns} rows={selected.refunds || []} keyField="refund_request_uid" empty="No refund requests recorded" />
                </div>

                <div className="registry-record-panel">
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Collections position</span>
                      <h2>Recovery Matters And Actions</h2>
                    </div>
                    <Gavel size={20} />
                  </div>
                  <DataTable columns={recoveryMatterColumns} rows={selected.recovery_matters || []} keyField="recovery_matter_uid" empty="No recovery matters recorded" />
                  <DataTable columns={recoveryActionColumns} rows={selected.recovery_actions || []} keyField="recovery_action_uid" empty="No recovery actions recorded" />
                </div>

                <div className="registry-record-panel">
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Recovery arrangements</span>
                      <h2>Instalments, Enforcement And Legal</h2>
                    </div>
                    <ShieldAlert size={20} />
                  </div>
                  <DataTable columns={instalmentPlanColumns} rows={selected.instalment_plans || []} keyField="instalment_plan_uid" empty="No instalment plans recorded" />
                  <DataTable columns={enforcementColumns} rows={selected.enforcement_measures || []} keyField="enforcement_measure_uid" empty="No enforcement measures recorded" />
                  <DataTable columns={legalReferralColumns} rows={selected.legal_referrals || []} keyField="legal_referral_uid" empty="No legal referrals recorded" />
                </div>

                <div className="registry-record-panel">
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Recoverability</span>
                      <h2>Collectability Reviews</h2>
                    </div>
                    <Landmark size={20} />
                  </div>
                  <DataTable columns={collectabilityColumns} rows={selected.collectability_reviews || []} keyField="collectability_review_uid" empty="No collectability reviews recorded" />
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
                      <span>Official records</span>
                      <h2>Documents And Correspondence</h2>
                    </div>
                    <FileText size={20} />
                  </div>
                  <DataTable columns={documentColumns} rows={selected.documents || []} keyField="content_record_uid" empty="No official documents recorded" />
                  <DataTable columns={messageColumns} rows={selected.messages || []} keyField="message_envelope_uid" empty="No correspondence recorded" />
                </div>

                <div className="registry-record-panel">
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Compliance risk</span>
                      <h2>Risk Profiles, Signals And Plans</h2>
                    </div>
                    <AlertTriangle size={20} />
                  </div>
                  <DataTable columns={riskProfileColumns} rows={selected.risk_profiles || []} keyField="risk_profile_uid" empty="No compliance risk profiles recorded" />
                  <DataTable columns={riskSignalColumns} rows={selected.risk_signals || []} keyField="risk_signal_uid" empty="No risk signals recorded" />
                  <DataTable columns={compliancePlanColumns} rows={selected.compliance_plans || []} keyField="compliance_plan_uid" empty="No compliance plans recorded" />
                  <DataTable columns={complianceActionColumns} rows={selected.compliance_actions || []} keyField="compliance_action_uid" empty="No compliance actions recorded" />
                </div>

                <div className="registry-record-panel">
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Audit and investigation</span>
                      <h2>Requests, Evidence And Disclosures</h2>
                    </div>
                    <Gavel size={20} />
                  </div>
                  <DataTable columns={complianceAuditColumns} rows={selected.audit_engagements || []} keyField="audit_engagement_uid" empty="No audit engagements recorded" />
                  <DataTable columns={informationRequestColumns} rows={selected.information_requests || []} keyField="information_request_uid" empty="No information requests recorded" />
                  <DataTable columns={investigationColumns} rows={selected.investigations || []} keyField="investigation_file_uid" empty="No investigations recorded" />
                  <DataTable columns={evidenceColumns} rows={selected.evidence_records || []} keyField="evidence_uid" empty="No evidence records registered" />
                  <DataTable columns={disclosureColumns} rows={selected.voluntary_disclosures || []} keyField="disclosure_uid" empty="No voluntary disclosures recorded" />
                </div>

                <div className="registry-record-panel">
                  <div className="section-heading section-heading--compact">
                    <div>
                      <span>Reviews and appeals</span>
                      <h2>Disputes, Decision Outcomes And Evidence</h2>
                    </div>
                    <Scale size={20} />
                  </div>
                  <DataTable columns={reviewFileColumns} rows={selected.review_files || []} keyField="review_file_uid" empty="No review files recorded" />
                  <DataTable columns={reviewIssueColumns} rows={selected.review_issues || []} keyField="review_issue_uid" empty="No review issues recorded" />
                  <DataTable columns={reviewDecisionColumns} rows={selected.review_decisions || []} keyField="decision_outcome_uid" empty="No review decisions recorded" />
                  <DataTable columns={externalAppealColumns} rows={selected.external_appeals || []} keyField="external_appeal_uid" empty="No external appeals recorded" />
                  <DataTable columns={reviewLinkColumns} rows={selected.review_record_links || []} keyField="review_record_link_uid" empty="No linked review evidence recorded" />
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
                  <DataTable columns={reviewLifecycleColumns} rows={selected.review_lifecycle_events || []} keyField="lifecycle_event_uid" empty="No review lifecycle events recorded" />
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
