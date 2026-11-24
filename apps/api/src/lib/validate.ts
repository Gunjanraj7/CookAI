import type { z } from "zod";
import { HttpError } from "./http-error.js";

/** Parses `data` with `schema`, turning failures into a 400 with per-field messages. */
export function parseOr400<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_";
    fields[key] ??= issue.message;
  }
  const first = Object.entries(fields)[0];
  const message = first ? `${first[0] === "_" ? "" : `${first[0]}: `}${first[1]}` : "Invalid request";
  throw new HttpError(400, "validation_failed", message, fields);
}
