import { normalizeOptionalText, normalizeText } from "@/lib/author-input";

export type BookBody = {
  title?: unknown;
  description?: unknown;
  isbn?: unknown;
  publishedYear?: unknown;
  genre?: unknown;
  pages?: unknown;
  authorId?: unknown;
};

export { normalizeOptionalText, normalizeText };

export function normalizeOptionalInteger(value: unknown) {
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
