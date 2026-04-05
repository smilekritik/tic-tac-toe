import { AppError } from '../errors/app-error';

export type ValidationFieldError = {
  field: string;
  message: string;
  location?: string;
};

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function createValidationError(errors: ValidationFieldError[]): AppError {
  return new AppError('VALIDATION_ERROR', 400, {
    message: errors[0]?.message || 'Validation failed',
    fields: errors,
  });
}
