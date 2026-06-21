import { AlertTriangle, CalendarClock, FilePenLine, ListChecks } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api.js";
import { DataTable, Field, GovernanceShell, ReasonField, SelectField, StatePill, commonColumns, compactCode, formatMoney, optionLabel, runMutation, safeJson } from "./GovernanceShared.jsx";

export default function FilingGovernancePanel() {
  const [lodgements, setLodgements] = useState([]);
  const [declarations, setDeclarations] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lodgement, setLodgement] = useState({ lodgement_package_uid: "", lodgement_channel_cd: "", lodgement_state_cd: "", metadata_note_txt: "", reason_txt: "" });
  const [item, setItem] = useState({ declaration_item_uid: "", item_code: "", item_value_txt: "", item_value_num: "", validation_state_cd: "", reason_txt: "" });
  const [retireItem, setRetireItem] = useState({ declaration_item_uid: "", reason_txt: "" });
  const [schedule, setSchedule] = useState({ declaration_uid: "", schedule_code: "", row_no: 1, line_total_amt: "", schedule_payload_txt: "{}", reason_txt: "" });
  const [scheduleUpdate, setScheduleUpdate] = useState({ schedule_record_uid: "", schedule_code: "", row_no: "", line_total_amt: "", schedule_state_cd: "ACTIVE", schedule_payload_txt: "{}", reason_txt: "" });
  const [validation, setValidation] = useState({ validation_outcome_uid: "", outcome_level_cd: "", outcome_message_txt: "", resolved_bool: false, reason_txt: "" });

  async function load() {
    setLoading(true);
    const [lodgementPayload, declarationPayload] = await Promise.all([
      apiRequest("/api/filing/lodgements?pageSize=140"),
      apiRequest("/api/filing/declarations?pageSize=140"),
    ]);
    setLodgements(lodgementPayload.rows || []);
    setDeclarations(declarationPayload.rows || []);
    setLoading(false);
  }

  async function loadDeclaration(uid) {
    if (!uid) {
      setDetail(null);
      setSchedule((current) => ({ ...current, declaration_uid: "" }));
      return;
    }
    const payload = await apiRequest(`/api/filing/declarations/${uid}`);
    setDetail(payload.declaration || null);
    setSchedule((current) => ({ ...current, declaration_uid: uid }));
  }

  useEffect(() => {
    void load().catch((loadError) => { setError(loadError.message); setLoading(false); });
  }, []);

  async function mutate(endpoint, method, body, message) {
    await runMutation({ endpoint, method, body, setError, setSuccess, setSaving, successMessage: message, reload: async () => { await load(); if (detail?.declaration?.declaration_uid) await loadDeclaration(detail.declaration.declaration_uid); } });
  }

  function syncItem(uid) {
    const row = detail?.items?.find((entry) => entry.declaration_item_uid === uid);
    setItem({ declaration_item_uid: uid, item_code: row?.item_code || "", item_value_txt: row?.item_value_txt || "", item_value_num: row?.item_value_num ?? "", validation_state_cd: row?.validation_state_cd || "", reason_txt: "" });
    setRetireItem({ declaration_item_uid: uid, reason_txt: "" });
  }

  function syncSchedule(uid) {
    const row = detail?.schedules?.find((entry) => entry.schedule_record_uid === uid);
    setScheduleUpdate({ schedule_record_uid: uid, schedule_code: row?.schedule_code || "", row_no: row?.row_no || "", line_total_amt: row?.line_total_amt ?? "", schedule_state_cd: row?.schedule_state_cd || "ACTIVE", schedule_payload_txt: JSON.stringify(row?.schedule_payload_jsn || {}, null, 2), reason_txt: "" });
  }

  function syncValidation(uid) {
    const row = detail?.validation_outcomes?.find((entry) => entry.validation_outcome_uid === uid);
    setValidation({ validation_outcome_uid: uid, outcome_level_cd: row?.outcome_level_cd || "", outcome_message_txt: row?.outcome_message_txt || "", resolved_bool: Boolean(row?.resolved_bool), reason_txt: "" });
  }

  const declarationColumns = [
    { key: "declaration_no", label: "Declaration" },
    { key: "taxpayer", label: "Taxpayer", render: (row) => row.display_name_txt || "-" },
    { key: "period", label: "Period", render: (row) => row.period_label_txt || "-" },
    commonColumns.money("declared_total_amt", "Declared"),
    commonColumns.state("declaration_state_cd", "State"),
  ];
  const itemColumns = [
    { key: "item_code", label: "Item" },
    { key: "value", label: "Value", render: (row) => row.item_value_txt || row.item_value_num || row.item_value_dt || "-" },
    { key: "state", label: "Validation", render: (row) => compactCode(row.validation_state_cd) },
  ];
  const scheduleColumns = [
    { key: "schedule_code", label: "Schedule" },
    { key: "row_no", label: "Row" },
    commonColumns.money("line_total_amt", "Total"),
    commonColumns.state("schedule_state_cd", "State"),
  ];
  const validationColumns = [
    { key: "outcome_code", label: "Code" },
    { key: "outcome_level_cd", label: "Level", render: (row) => <StatePill value={row.outcome_level_cd} /> },
    { key: "outcome_message_txt", label: "Message" },
    { key: "resolved", label: "Resolved", render: (row) => (row.resolved_bool ? "Yes" : "No") },
  ];

  return (
    <GovernanceShell error={error} success={success}>
      <section className="content-band">
        <div className="section-heading"><div><span>Declaration context</span><h2>Draft Items And Schedules</h2></div><FilePenLine size={22} /></div>
        <DataTable columns={declarationColumns} rows={declarations} keyField="declaration_uid" onRowClick={(row) => void loadDeclaration(row.declaration_uid)} selectedKey={detail?.declaration?.declaration_uid} empty={loading ? "Loading declarations" : "No declarations"} />
      </section>

      <section className="content-band">
        <div className="section-heading"><div><span>Lodgement metadata</span><h2>Correct Package Details</h2></div><CalendarClock size={22} /></div>
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/filing/lodgements/${lodgement.lodgement_package_uid}`, "PATCH", { lodgement_channel_cd: lodgement.lodgement_channel_cd, lodgement_state_cd: lodgement.lodgement_state_cd, lodgement_metadata_jsn: lodgement.metadata_note_txt ? { correction_note: lodgement.metadata_note_txt } : undefined, reason_txt: lodgement.reason_txt }, "Lodgement metadata updated."); }}>
          <SelectField label="Lodgement" required value={lodgement.lodgement_package_uid} onChange={(value) => {
            const row = lodgements.find((entry) => entry.lodgement_package_uid === value);
            setLodgement({ lodgement_package_uid: value, lodgement_channel_cd: row?.lodgement_channel_cd || "", lodgement_state_cd: row?.lodgement_state_cd || "", metadata_note_txt: "", reason_txt: "" });
          }}>
            <option value="">Select lodgement</option>
            {lodgements.map((row) => <option key={row.lodgement_package_uid} value={row.lodgement_package_uid}>{optionLabel(row.lodgement_no, row.display_name_txt, compactCode(row.lodgement_state_cd))}</option>)}
          </SelectField>
          <div className="compact-form"><Field label="Channel"><input value={lodgement.lodgement_channel_cd} onChange={(event) => setLodgement({ ...lodgement, lodgement_channel_cd: event.target.value.toUpperCase() })} /></Field><Field label="State"><input value={lodgement.lodgement_state_cd} onChange={(event) => setLodgement({ ...lodgement, lodgement_state_cd: event.target.value.toUpperCase() })} /></Field></div>
          <Field label="Metadata note"><textarea value={lodgement.metadata_note_txt} onChange={(event) => setLodgement({ ...lodgement, metadata_note_txt: event.target.value })} /></Field>
          <ReasonField value={lodgement.reason_txt} onChange={(value) => setLodgement({ ...lodgement, reason_txt: value })} />
          <button className="secondary-button" type="submit" disabled={saving || !lodgement.lodgement_package_uid}>Update lodgement</button>
        </form>
      </section>

      <section className="content-band">
        <div className="section-heading"><div><span>Declaration items</span><h2>Edit Or Retire Wrong Items</h2></div><ListChecks size={22} /></div>
        <DataTable columns={itemColumns} rows={detail?.items || []} keyField="declaration_item_uid" onRowClick={(row) => syncItem(row.declaration_item_uid)} selectedKey={item.declaration_item_uid} empty="Select a declaration to view items" />
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/filing/declaration-items/${item.declaration_item_uid}`, "PATCH", item, "Declaration item corrected."); }}>
          <div className="compact-form"><Field label="Item code"><input value={item.item_code} onChange={(event) => setItem({ ...item, item_code: event.target.value.toUpperCase() })} /></Field><Field label="Numeric value"><input type="number" step="0.01" value={item.item_value_num} onChange={(event) => setItem({ ...item, item_value_num: event.target.value })} /></Field></div>
          <Field label="Text value"><input value={item.item_value_txt} onChange={(event) => setItem({ ...item, item_value_txt: event.target.value })} /></Field>
          <Field label="Validation state"><input value={item.validation_state_cd} onChange={(event) => setItem({ ...item, validation_state_cd: event.target.value.toUpperCase() })} /></Field>
          <ReasonField value={item.reason_txt} onChange={(value) => setItem({ ...item, reason_txt: value })} />
          <button className="secondary-button" type="submit" disabled={saving || !item.declaration_item_uid}>Save item correction</button>
        </form>
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/filing/declaration-items/${retireItem.declaration_item_uid}/retire`, "PATCH", retireItem, "Declaration item retired."); }}>
          <ReasonField label="Retirement reason" value={retireItem.reason_txt} onChange={(value) => setRetireItem({ ...retireItem, reason_txt: value })} />
          <button className="danger-button" type="submit" disabled={saving || !retireItem.declaration_item_uid}>Retire wrong item</button>
        </form>
      </section>

      <section className="content-band">
        <div className="section-heading"><div><span>Schedules</span><h2>Manage Supporting Records</h2></div><ListChecks size={22} /></div>
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); let body; try { body = { ...schedule, schedule_payload_jsn: safeJson(schedule.schedule_payload_txt), schedule_payload_txt: undefined }; } catch { setError("Schedule payload must be valid JSON."); return; } void mutate(`/api/filing/declarations/${schedule.declaration_uid}/schedules`, "POST", body, "Schedule record saved."); }}>
          <div className="compact-form"><Field label="Schedule code"><input required value={schedule.schedule_code} onChange={(event) => setSchedule({ ...schedule, schedule_code: event.target.value.toUpperCase() })} /></Field><Field label="Row"><input type="number" min="1" value={schedule.row_no} onChange={(event) => setSchedule({ ...schedule, row_no: event.target.value })} /></Field><Field label="Line total"><input type="number" step="0.01" value={schedule.line_total_amt} onChange={(event) => setSchedule({ ...schedule, line_total_amt: event.target.value })} /></Field></div>
          <Field label="Payload JSON"><textarea value={schedule.schedule_payload_txt} onChange={(event) => setSchedule({ ...schedule, schedule_payload_txt: event.target.value })} /></Field>
          <Field label="Reason"><textarea value={schedule.reason_txt} onChange={(event) => setSchedule({ ...schedule, reason_txt: event.target.value })} /></Field>
          <button className="secondary-button" type="submit" disabled={saving || !schedule.declaration_uid}>Save schedule</button>
        </form>
        <DataTable columns={scheduleColumns} rows={detail?.schedules || []} keyField="schedule_record_uid" onRowClick={(row) => syncSchedule(row.schedule_record_uid)} selectedKey={scheduleUpdate.schedule_record_uid} empty="No schedule records" />
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); let body; try { body = { ...scheduleUpdate, schedule_payload_jsn: safeJson(scheduleUpdate.schedule_payload_txt), schedule_payload_txt: undefined }; } catch { setError("Schedule update payload must be valid JSON."); return; } void mutate(`/api/filing/schedules/${scheduleUpdate.schedule_record_uid}`, "PATCH", body, "Schedule record corrected."); }}>
          <div className="compact-form"><Field label="Schedule code"><input value={scheduleUpdate.schedule_code} onChange={(event) => setScheduleUpdate({ ...scheduleUpdate, schedule_code: event.target.value.toUpperCase() })} /></Field><SelectField label="State" value={scheduleUpdate.schedule_state_cd} onChange={(value) => setScheduleUpdate({ ...scheduleUpdate, schedule_state_cd: value })}><option value="ACTIVE">Active</option><option value="RETIRED">Retired</option><option value="CANCELLED">Cancelled</option></SelectField></div>
          <ReasonField value={scheduleUpdate.reason_txt} onChange={(value) => setScheduleUpdate({ ...scheduleUpdate, reason_txt: value })} />
          <button className="secondary-button" type="submit" disabled={saving || !scheduleUpdate.schedule_record_uid}>Update schedule</button>
        </form>
      </section>

      <section className="content-band">
        <div className="section-heading"><div><span>Validation outcomes</span><h2>Reopen Or Correct Findings</h2></div><AlertTriangle size={22} /></div>
        <DataTable columns={validationColumns} rows={detail?.validation_outcomes || []} keyField="validation_outcome_uid" onRowClick={(row) => syncValidation(row.validation_outcome_uid)} selectedKey={validation.validation_outcome_uid} empty="No validation outcomes" />
        <form className="stacked-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/api/filing/validation-outcomes/${validation.validation_outcome_uid}`, "PATCH", validation, "Validation outcome corrected."); }}>
          <div className="compact-form"><Field label="Level"><input value={validation.outcome_level_cd} onChange={(event) => setValidation({ ...validation, outcome_level_cd: event.target.value.toUpperCase() })} /></Field><Field label="Resolved"><input type="checkbox" checked={validation.resolved_bool} onChange={(event) => setValidation({ ...validation, resolved_bool: event.target.checked })} /></Field></div>
          <Field label="Message"><textarea value={validation.outcome_message_txt} onChange={(event) => setValidation({ ...validation, outcome_message_txt: event.target.value })} /></Field>
          <ReasonField value={validation.reason_txt} onChange={(value) => setValidation({ ...validation, reason_txt: value })} />
          <button className="secondary-button" type="submit" disabled={saving || !validation.validation_outcome_uid}>Correct validation outcome</button>
        </form>
      </section>
    </GovernanceShell>
  );
}
