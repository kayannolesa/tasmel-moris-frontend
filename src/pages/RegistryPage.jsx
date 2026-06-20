import { Building2, ContactRound, MapPin, Search, UsersRound } from "lucide-react";
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
import { compactCode, formatDate, formatNumber } from "../utils/format.js";

const tabs = [
  { id: "register", label: "Register" },
  { id: "profile", label: "Profile" },
];

const initialSubject = {
  subject_class_cd: "ORGANISATION",
  legal_name_txt: "",
  trading_name_txt: "",
  first_name_txt: "",
  last_name_txt: "",
  identifier_type_cd: "TIN",
  identifier_value_txt: "",
  contact_type_cd: "EMAIL",
  contact_value_txt: "",
  line1_txt: "",
  city_txt: "Apia",
  country_cd: "WS",
  activity_code: "",
  activity_description_txt: "",
};

const initialContact = { contact_type_cd: "EMAIL", usage_role_cd: "PRIMARY", contact_value_txt: "", preferred_bool: true };
const initialAddress = { address_role_cd: "REGISTERED", line1_txt: "", city_txt: "Apia", country_cd: "WS", preferred_bool: true };
const initialActivity = { activity_code: "", activity_description_txt: "", sector_cd: "", turnover_band_cd: "", primary_bool: true };
const initialRelationship = { related_subject_uid: "", relationship_type_cd: "OWNER", ownership_percent: "" };

export default function RegistryPage() {
  const [activeTab, setActiveTab] = useState("register");
  const [search, setSearch] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [page, setPage] = useState(null);
  const [selected, setSelected] = useState(null);
  const [subjectForm, setSubjectForm] = useState(initialSubject);
  const [contactForm, setContactForm] = useState(initialContact);
  const [addressForm, setAddressForm] = useState(initialAddress);
  const [activityForm, setActivityForm] = useState(initialActivity);
  const [relationshipForm, setRelationshipForm] = useState(initialRelationship);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedProfile = selected?.profile;
  const organisationMode = subjectForm.subject_class_cd === "ORGANISATION";

  async function loadSubjects(q = search) {
    const payload = await apiRequest(`/api/registry/subjects?pageSize=50${q ? `&q=${encodeURIComponent(q)}` : ""}`);
    setSubjects(payload.rows || []);
    setPage(payload.page || null);
    return payload.rows || [];
  }

  async function loadProfile(subjectUid) {
    const payload = await apiRequest(`/api/registry/subjects/${subjectUid}`);
    setSelected(payload.subject);
    setActiveTab("profile");
  }

  useEffect(() => {
    void loadSubjects().catch((loadError) => setError(loadError.message));
  }, []);

  const subjectOptions = useMemo(() => subjects.filter((subject) => subject.subject_uid !== selectedProfile?.subject_uid), [selectedProfile?.subject_uid, subjects]);

  async function submitSubject(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      const payload = await apiRequest("/api/registry/subjects", { method: "POST", body: subjectForm });
      setSubjectForm(initialSubject);
      await loadSubjects("");
      setSelected(payload.subject);
      setActiveTab("profile");
      setSuccess("Taxpayer profile registered");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function addProfileRecord(endpoint, body, reset, message) {
    if (!selectedProfile?.subject_uid) return;
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/registry/subjects/${selectedProfile.subject_uid}/${endpoint}`, { method: "POST", body });
      reset();
      await loadProfile(selectedProfile.subject_uid);
      setSuccess(message);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  const subjectColumns = [
    { key: "subject_no", label: "Taxpayer no." },
    { key: "display_name_txt", label: "Name" },
    { key: "subject_class_cd", label: "Class", render: (row) => compactCode(row.subject_class_cd) },
    { key: "primary_identifier_value_txt", label: "Identifier" },
    {
      key: "registry_state_cd",
      label: "State",
      render: (row) => <StatusPill tone={row.registry_state_cd === "ACTIVE" ? "success" : "warning"}>{compactCode(row.registry_state_cd)}</StatusPill>,
    },
  ];

  const simpleColumns = [
    { key: "contact_type_cd", label: "Type", render: (row) => compactCode(row.contact_type_cd || row.address_role_cd || row.activity_code || row.relationship_type_cd) },
    { key: "contact_value_txt", label: "Value", render: (row) => row.contact_value_txt || row.line1_txt || row.activity_description_txt || row.related_display_name_txt || "-" },
    { key: "usage_role_cd", label: "Role", render: (row) => compactCode(row.usage_role_cd || row.sector_cd || row.relationship_type_cd || row.city_txt) },
  ];

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Taxpayer registry" title="Subject Registration And Profile" status="Operational" tone="success" />

      <div className="metric-grid">
        <MetricTile icon={UsersRound} label="Registry records" value={formatNumber(page?.total)} />
        <MetricTile icon={Building2} label="Organisations" value={formatNumber(subjects.filter((subject) => subject.subject_class_cd === "ORGANISATION").length)} />
        <MetricTile icon={ContactRound} label="Selected contacts" value={formatNumber(selected?.contacts?.length)} />
        <MetricTile icon={MapPin} label="Selected addresses" value={formatNumber(selected?.addresses?.length)} />
      </div>

      <ModuleTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <FormAlert error={error} success={success} />

      {activeTab === "register" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>New taxpayer</span>
                <h2>Register Subject</h2>
              </div>
            </div>
            <form className="action-form" onSubmit={submitSubject}>
              <SelectField label="Subject class" value={subjectForm.subject_class_cd} onChange={(value) => setSubjectForm({ ...subjectForm, subject_class_cd: value })}>
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
                </>
              ) : (
                <div className="compact-form">
                  <Field label="First name">
                    <input required value={subjectForm.first_name_txt} onChange={(event) => setSubjectForm({ ...subjectForm, first_name_txt: event.target.value })} />
                  </Field>
                  <Field label="Last name">
                    <input required value={subjectForm.last_name_txt} onChange={(event) => setSubjectForm({ ...subjectForm, last_name_txt: event.target.value })} />
                  </Field>
                </div>
              )}

              <div className="compact-form">
                <Field label="Identifier type">
                  <input value={subjectForm.identifier_type_cd} onChange={(event) => setSubjectForm({ ...subjectForm, identifier_type_cd: event.target.value.toUpperCase() })} />
                </Field>
                <Field label="Identifier value">
                  <input value={subjectForm.identifier_value_txt} onChange={(event) => setSubjectForm({ ...subjectForm, identifier_value_txt: event.target.value })} />
                </Field>
              </div>

              <div className="compact-form">
                <Field label="Contact type">
                  <input value={subjectForm.contact_type_cd} onChange={(event) => setSubjectForm({ ...subjectForm, contact_type_cd: event.target.value.toUpperCase() })} />
                </Field>
                <Field label="Contact value">
                  <input value={subjectForm.contact_value_txt} onChange={(event) => setSubjectForm({ ...subjectForm, contact_value_txt: event.target.value })} />
                </Field>
              </div>

              <Field label="Registered address">
                <input value={subjectForm.line1_txt} onChange={(event) => setSubjectForm({ ...subjectForm, line1_txt: event.target.value })} />
              </Field>

              <div className="compact-form">
                <Field label="Business activity code">
                  <input value={subjectForm.activity_code} onChange={(event) => setSubjectForm({ ...subjectForm, activity_code: event.target.value.toUpperCase() })} />
                </Field>
                <Field label="Activity description">
                  <input value={subjectForm.activity_description_txt} onChange={(event) => setSubjectForm({ ...subjectForm, activity_description_txt: event.target.value })} />
                </Field>
              </div>

              <button className="primary-button" type="submit">Register taxpayer</button>
            </form>
          </section>

          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Search</span>
                <h2>Registry Index</h2>
              </div>
              <Search size={22} />
            </div>
            <form
              className="compact-form"
              onSubmit={(event) => {
                event.preventDefault();
                void loadSubjects(search);
              }}
            >
              <Field label="Search taxpayers">
                <input value={search} onChange={(event) => setSearch(event.target.value)} />
              </Field>
              <button className="secondary-button" type="submit">Search</button>
            </form>
            <br />
            <DataTable columns={subjectColumns} rows={subjects} keyField="subject_uid" onRowClick={(row) => loadProfile(row.subject_uid)} empty="No taxpayer records" />
          </section>
        </div>
      ) : null}

      {activeTab === "profile" ? (
        <div className="module-workbench">
          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Taxpayer profile</span>
                <h2>{selectedProfile?.display_name_txt || "No taxpayer selected"}</h2>
              </div>
              {selectedProfile ? <StatusPill tone="success">{compactCode(selectedProfile.registry_state_cd)}</StatusPill> : null}
            </div>

            {selectedProfile ? (
              <div className="record-panel">
                <div className="record-grid">
                  <div>
                    <span>Taxpayer no.</span>
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
                    <span>Primary contact</span>
                    <strong>{selectedProfile.primary_contact_txt || "-"}</strong>
                  </div>
                </div>

                <form
                  className="compact-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void loadSubjects(search);
                  }}
                >
                  <Field label="Search taxpayers">
                    <input value={search} onChange={(event) => setSearch(event.target.value)} />
                  </Field>
                  <button className="secondary-button" type="submit">Refresh index</button>
                </form>
                <DataTable columns={subjectColumns} rows={subjects} keyField="subject_uid" selectedKey={selectedProfile.subject_uid} onRowClick={(row) => loadProfile(row.subject_uid)} empty="No taxpayer records" />
              </div>
            ) : (
              <DataTable columns={subjectColumns} rows={subjects} keyField="subject_uid" onRowClick={(row) => loadProfile(row.subject_uid)} empty="No taxpayer records" />
            )}
          </section>

          <section className="content-band">
            <div className="section-heading">
              <div>
                <span>Profile additions</span>
                <h2>Contacts, Addresses And Activity</h2>
              </div>
            </div>

            {selectedProfile ? (
              <div className="split-list">
                <form
                  className="compact-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void addProfileRecord("contacts", contactForm, () => setContactForm(initialContact), "Contact added");
                  }}
                >
                  <Field label="Contact type">
                    <input value={contactForm.contact_type_cd} onChange={(event) => setContactForm({ ...contactForm, contact_type_cd: event.target.value.toUpperCase() })} />
                  </Field>
                  <Field label="Contact value">
                    <input required value={contactForm.contact_value_txt} onChange={(event) => setContactForm({ ...contactForm, contact_value_txt: event.target.value })} />
                  </Field>
                  <button className="secondary-button full-span" type="submit">Add contact</button>
                </form>

                <form
                  className="compact-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void addProfileRecord("addresses", addressForm, () => setAddressForm(initialAddress), "Address added");
                  }}
                >
                  <Field label="Address line">
                    <input required value={addressForm.line1_txt} onChange={(event) => setAddressForm({ ...addressForm, line1_txt: event.target.value })} />
                  </Field>
                  <Field label="City">
                    <input value={addressForm.city_txt} onChange={(event) => setAddressForm({ ...addressForm, city_txt: event.target.value })} />
                  </Field>
                  <button className="secondary-button full-span" type="submit">Add address</button>
                </form>

                <form
                  className="compact-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void addProfileRecord("activities", activityForm, () => setActivityForm(initialActivity), "Business activity added");
                  }}
                >
                  <Field label="Activity code">
                    <input required value={activityForm.activity_code} onChange={(event) => setActivityForm({ ...activityForm, activity_code: event.target.value.toUpperCase() })} />
                  </Field>
                  <Field label="Description">
                    <input value={activityForm.activity_description_txt} onChange={(event) => setActivityForm({ ...activityForm, activity_description_txt: event.target.value })} />
                  </Field>
                  <button className="secondary-button full-span" type="submit">Add activity</button>
                </form>

                <form
                  className="compact-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void addProfileRecord(
                      "relationships",
                      { ...relationshipForm, ownership_percent: relationshipForm.ownership_percent || null },
                      () => setRelationshipForm(initialRelationship),
                      "Relationship added"
                    );
                  }}
                >
                  <SelectField label="Related taxpayer" value={relationshipForm.related_subject_uid} onChange={(value) => setRelationshipForm({ ...relationshipForm, related_subject_uid: value })}>
                    <option value="">Select taxpayer</option>
                    {subjectOptions.map((subject) => (
                      <option key={subject.subject_uid} value={subject.subject_uid}>
                        {subject.display_name_txt}
                      </option>
                    ))}
                  </SelectField>
                  <Field label="Relationship">
                    <input value={relationshipForm.relationship_type_cd} onChange={(event) => setRelationshipForm({ ...relationshipForm, relationship_type_cd: event.target.value.toUpperCase() })} />
                  </Field>
                  <button className="secondary-button full-span" type="submit">Add relationship</button>
                </form>

                <DataTable columns={simpleColumns} rows={[...(selected.contacts || []), ...(selected.addresses || []), ...(selected.activities || []), ...(selected.relationships || [])]} keyField="subject_contact_uid" empty="No profile additions" />
              </div>
            ) : (
              <DataTable columns={subjectColumns} rows={subjects} keyField="subject_uid" onRowClick={(row) => loadProfile(row.subject_uid)} empty="Select a taxpayer" />
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}
