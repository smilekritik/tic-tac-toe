export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 500,
    public readonly meta?: Record<string, unknown>,
  ) {
    super(code);
    this.name = 'AppError';
  }
}
