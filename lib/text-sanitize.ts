import "server-only";

const NULL_CHARACTER_PATTERN = /\u0000/g;

export function sanitizeTextForDatabase(value: string) {
  return value.replace(NULL_CHARACTER_PATTERN, "");
}

export function sanitizeTextArrayForDatabase(values: string[]) {
  return values.map((value) => sanitizeTextForDatabase(value));
}
