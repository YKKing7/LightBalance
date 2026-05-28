export function formatDateTime(value: string | Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("zh-CN", options).format(new Date(value));
}

export function formatDateOnly(value: string) {
  return formatDateTime(`${value}T00:00:00`, {
    month: "2-digit",
    day: "2-digit"
  });
}

export function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.max(numberValue, 0) : fallback;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function safePercent(value: number, target: number) {
  if (!Number.isFinite(value) || !Number.isFinite(target) || target <= 0) {
    return 0;
  }

  return Math.min(Math.max((Math.max(value, 0) / target) * 100, 0), 100);
}

export function formatSigned(value: number, unit: string, digits = 1) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(digits)} ${unit}`;
}

export function formatIntegerSigned(value: number, unit: string) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${Math.round(value)} ${unit}`;
}
