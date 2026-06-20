import StatusPill from "./StatusPill.jsx";

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
  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows?.length ? (
            rows.map((row, index) => {
              const key = row[keyField] || index;
              return (
                <tr
                  className={selectedKey && selectedKey === key ? "is-selected" : ""}
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <td key={column.key} data-label={column.label}>
                      {column.render ? column.render(row) : row[column.key] ?? "-"}
                    </td>
                  ))}
                </tr>
              );
            })
          ) : (
            <tr>
              <td className="empty-cell" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
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
