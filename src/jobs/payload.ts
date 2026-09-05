// src/jobs/payload.ts — BUILD §11
//
// Reading the fields a job's own idempotency key names out of an event
// payload. An at-least-once platform can deliver anything; a job that read
// `data.scanId` as `unknown` and passed it on would push a malformed
// subject into the engine. These two readers refuse instead.
import type { JobInput } from "./types";

export function requiredString(input: JobInput, field: string): string {
  const value = input.data[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`src/jobs/payload.ts: event payload is missing a string "${field}".`);
  }
  return value;
}

export function requiredNumber(input: JobInput, field: string): number {
  const value = input.data[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`src/jobs/payload.ts: event payload is missing a number "${field}".`);
  }
  return value;
}

export function oneOf<T extends string>(
  input: JobInput,
  field: string,
  allowed: readonly T[]
): T {
  const value = requiredString(input, field);
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(
      `src/jobs/payload.ts: event payload field "${field}" is not one of ${allowed.join(", ")}.`
    );
  }
  return value as T;
}
