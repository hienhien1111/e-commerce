export type ApplicationErrorKind =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE'
  | 'UNAVAILABLE';

/**
 * A stable, transport-agnostic error raised by an application use case.
 *
 * Presentation adapters are responsible for translating this error to the
 * protocol used by their caller. HTTP mapping lives in the global filter.
 */
export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly kind: ApplicationErrorKind,
    public readonly retryable = false,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}
