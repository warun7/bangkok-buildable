// Number and unit formatting helpers (tabular figures, thousands separators, explicit units).

export function fmtInt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString("en-US");
}

export function fmtDec(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtArea(m2: number, digits = 0): string {
  return `${digits > 0 ? fmtDec(m2, digits) : fmtInt(m2)} m²`;
}

export function fmtMetres(m: number, digits = 1): string {
  return `${fmtDec(m, digits)} m`;
}

export function fmtStoreys(n: number): string {
  return `${fmtInt(n)} ${Math.round(n) === 1 ? "storey" : "storeys"}`;
}

export function fmtPercent(pct: number, digits = 1): string {
  return `${fmtDec(pct, digits)} %`;
}
