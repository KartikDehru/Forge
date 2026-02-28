/**
 * Minimal Result type. Domain functions never throw for expected failures;
 * they return `Err` with a typed `DomainError` so callers must handle it.
 */
export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E = DomainError> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

export function mapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  return result.ok ? fn(result.value) : result;
}

export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback;
}

export type DomainErrorCode =
  | "NOT_FOUND"
  | "VALIDATION"
  | "FORBIDDEN"
  | "INVALID_TRANSITION"
  | "ASSIGNEE_REQUIRED"
  | "CONFLICT"
  | "BLOCK_BOUNDARY"
  | "BLOCK_DEPTH"
  | "BLOCK_CYCLE";

export interface DomainError {
  readonly code: DomainErrorCode;
  readonly message: string;
  /** Optional field name for validation errors. */
  readonly field?: string;
}

export function domainError(
  code: DomainErrorCode,
  message: string,
  field?: string
): DomainError {
  return field ? { code, message, field } : { code, message };
}
