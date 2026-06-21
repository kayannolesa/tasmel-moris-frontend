import { useEffect, useMemo, useRef, useState } from "react";
import StatusPill from "./StatusPill.jsx";

function renderCell(column, row) {
  return column.render ? column.render(row) : row?.[column.key] ?? "-";
}

function DataRecordModal({ row, columns, title, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!row) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, row]);

  if (!row) return null;

  return (
    <div className="data-record-modal" role="dialog" aria-modal="true" aria-labelledby="data-record-modal-title">
      <button type="button" className="data-record-modal__backdrop" onClick={onClose} aria-label="Close record details" />
      <section className="data-record-modal__panel">
        <header className="data-record-modal__header">
          <div>
            <span>Record details</span>
            <h3 id="data-record-modal-title">{title}</h3>
          </div>
          <button ref={closeRef} type="button" className="data-record-modal__close" onClick={onClose}>
            Close
          </button>
        </header>
        <dl className="data-record-modal__body">
          {columns.map((column) => (
            <div key={column.key}>
              <dt>{column.label}</dt>
              <dd>{renderCell(column, row)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

export function PageHeader({ eyebrow, title, status, tone = "neutral", children }) {
  return (
    <div className="page-heading">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      <div className="heading-actions">
        {children}
        {status ? <StatusPill tone={tone}>{status}</StatusPill> : null}
      </div>
    </div>
  );
}

export function MetricTile({ icon: Icon, label, value, sublabel }) {
  return (
    <article className="metric-tile">
      {Icon ? <Icon size={22} /> : null}
      <span>{label}</span>
      <strong>{value}</strong>
      {sublabel ? <small>{sublabel}</small> : null}
    </article>
  );
}

export function DataTable({ columns, rows, keyField, empty = "No records", onRowClick, selectedKey }) {
  const [activeRow, setActiveRow] = useState(null);
  const safeRows = rows || [];
  const summaryColumns = useMemo(() => columns.slice(0, Math.min(columns.length, 4)), [columns]);
  const activeTitle = activeRow ? renderCell(columns[0], activeRow) : "";

  return (
    <div className="data-card-shell">
      {safeRows.length ? (
        <div className="data-card-list">
          {safeRows.map((row, index) => {
            const key = row?.[keyField] || index;
            const selected = selectedKey && selectedKey === key;
            return (
              <article className={`data-card${selected ? " is-selected" : ""}`} key={key} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                <header className="data-card__header">
                  <div className="data-card__identity">
                    <span>{columns[0]?.label || "Record"}</span>
                    <strong>{renderCell(columns[0], row)}</strong>
                  </div>
                  <div className="data-card__actions">
                    {onRowClick ? (
                      <button
                        type="button"
                        className="secondary-button secondary-button--compact"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRowClick(row);
                        }}
                      >
                        Select
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="primary-button primary-button--compact"
                      aria-haspopup="dialog"
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveRow(row);
                      }}
                    >
                      View details
                    </button>
                  </div>
                </header>
                <dl className="data-card__grid">
                  {summaryColumns.slice(1).map((column) => (
                    <div key={column.key}>
                      <dt>{column.label}</dt>
                      <dd>{renderCell(column, row)}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-cell">{empty}</div>
      )}
      <DataRecordModal row={activeRow} columns={columns} title={activeTitle} onClose={() => setActiveRow(null)} />
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function SelectField({ label, value, onChange, children, required = false }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select required={required} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

export function ModuleTabs({ tabs, activeTab, onChange }) {
  return (
    <div className="module-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          className={activeTab === tab.id ? "is-active" : ""}
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function FormAlert({ error, success }) {
  if (error) return <div className="form-alert">{error}</div>;
  if (success) return <div className="form-success">{success}</div>;
  return null;
}
