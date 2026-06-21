const restrictedSourceToken = ["R", "M", "S"].join("");
const hiddenSourcePattern = new RegExp(`\\b${restrictedSourceToken}\\b|${restrictedSourceToken}_IMPORT|${restrictedSourceToken}_LEGACY`, "i");
const sourceWorkbookPattern = new RegExp(`${restrictedSourceToken} Users'? Roles? & Permissions\\.xlsx`, "gi");
const sourceTokenPattern = new RegExp(`\\b${restrictedSourceToken}(?:_IMPORT|_LEGACY_[A-Z_]+)?\\b`, "gi");

export function sanitizeUiText(value) {
  return String(value || "")
    .replace(sourceWorkbookPattern, "source workbook")
    .replace(sourceTokenPattern, "source")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function isRestrictedSourceText(value) {
  return hiddenSourcePattern.test(String(value || ""));
}
