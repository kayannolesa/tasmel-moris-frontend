export function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "-";
  return new Intl.NumberFormat("en-WS").format(Number(value));
}

export function formatMoney(value, currency = "WST") {
  if (value === null || value === undefined || value === "") return "-";
  return new Intl.NumberFormat("en-WS", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(Number(value));
}

export function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-WS", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-WS", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function compactCode(value) {
  return String(value || "-").replace(/_/g, " ");
}
