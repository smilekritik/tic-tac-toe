import { Injectable, PipeTransform } from '@nestjs/common';
import { createValidationError } from '../../common/validation/validation.helpers';
import {
  ChangePasswordDto,
  DeleteAccountDto,
  RequestEmailChangeDto,
  UpdateSettingsDto,
  UpdateUsernameDto,
  UsernameAvailabilityQueryDto,
} from '../dto/me.dto';
import {
  parseChangePasswordBody,
  parseDeleteAccountBody,
  parseRequestEmailChangeBody,
  parseUpdateSettingsBody,
  parseUpdateUsernameBody,
  parseUsernameAvailabilityQuery,
} from '../validators/me.validators';

@Injectable()
export class UpdateUsernameValidationPipe implements PipeTransform<unknown, UpdateUsernameDto> {
  transform(value: unknown): UpdateUsernameDto {
    const result = parseUpdateUsernameBody(value);
    if (result.errors.length) {
      throw createValidationError(result.errors);
    }

    return result.value;
  }
}

@Injectable()
export class RequestEmailChangeValidationPipe implements PipeTransform<unknown, RequestEmailChangeDto> {
  transform(value: unknown): RequestEmailChangeDto {
    const result = parseRequestEmailChangeBody(value);
    if (result.errors.length) {
      throw createValidationError(result.errors);
    }

    return result.value;
  }
}

@Injectable()
export class UsernameAvailabilityValidationPipe implements PipeTransform<unknown, UsernameAvailabilityQueryDto> {
  transform(value: unknown): UsernameAvailabilityQueryDto {
    const result = parseUsernameAvailabilityQuery(value);
    if (result.errors.length) {
      throw createValidationError(result.errors);
    }

    return result.value;
  }
}

@Injectable()
export class UpdateSettingsValidationPipe implements PipeTransform<unknown, UpdateSettingsDto> {
  transform(value: unknown): UpdateSettingsDto {
    const result = parseUpdateSettingsBody(value);
    if (result.errors.length) {
      throw createValidationError(result.errors);
    }

    return result.value as UpdateSettingsDto;
  }
}

@Injectable()
export class ChangePasswordValidationPipe implements PipeTransform<unknown, ChangePasswordDto> {
  transform(value: unknown): ChangePasswordDto {
    const result = parseChangePasswordBody(value);
    if (result.errors.length) {
      throw createValidationError(result.errors);
    }

    return result.value;
  }
}

@Injectable()
export class DeleteAccountValidationPipe implements PipeTransform<unknown, DeleteAccountDto> {
  transform(value: unknown): DeleteAccountDto {
    const result = parseDeleteAccountBody(value);
    if (result.errors.length) {
      throw createValidationError(result.errors);
    }

    return result.value;
  }
}
