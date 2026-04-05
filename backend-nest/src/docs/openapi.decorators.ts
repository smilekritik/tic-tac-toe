import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorEnvelopeDto, ValidationErrorEnvelopeDto } from './openapi.models';

export function ApiValidationErrorResponse() {
  return ApiBadRequestResponse({
    description: 'Validation error',
    type: ValidationErrorEnvelopeDto,
  });
}

export function ApiUnauthorizedErrorResponse() {
  return ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing token',
    type: ErrorEnvelopeDto,
  });
}

export function ApiForbiddenErrorResponse() {
  return ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions',
    type: ErrorEnvelopeDto,
  });
}

export function ApiNotFoundErrorResponse() {
  return ApiNotFoundResponse({
    description: 'Resource not found',
    type: ErrorEnvelopeDto,
  });
}

export function ApiConflictErrorResponse() {
  return ApiConflictResponse({
    description: 'Conflict with existing resource',
    type: ErrorEnvelopeDto,
  });
}

export function ApiStandardProtectedResponses(): MethodDecorator {
  return applyDecorators(
    ApiUnauthorizedErrorResponse(),
  );
}
