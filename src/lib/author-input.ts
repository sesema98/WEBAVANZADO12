export type AuthorBody = {
  name?: unknown;
  email?: unknown;
  bio?: unknown;
  nationality?: unknown;
  birthYear?: unknown;
};

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeOptionalText(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue || null;
}

export function normalizeBirthYear(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? value : Number.NaN;
  }

  if (typeof value !== "string") {
    return Number.NaN;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  return Number.parseInt(trimmedValue, 10);
}
