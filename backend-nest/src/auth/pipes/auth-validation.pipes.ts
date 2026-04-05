import { Injectable, PipeTransform } from '@nestjs/common';
import { createValidationError } from '../../common/validation/validation.helpers';
import { ForgotPasswordDto, LoginDto, RegistrationDto, ResetPasswordDto } from '../dto/auth.dto';
import {
  parseForgotPasswordBody,
  parseLoginBody,
  parseRegistrationBody,
  parseResetPasswordBody,
} from '../validators/auth.validators';

@Injectable()
export class RegistrationValidationPipe implements PipeTransform<unknown, RegistrationDto> {
  transform(value: unknown): RegistrationDto {
    const result = parseRegistrationBody(value);
    if (result.errors.length) {
      throw createValidationError(result.errors);
    }

    return result.value;
  }
}

@Injectable()
export class LoginValidationPipe implements PipeTransform<unknown, LoginDto> {
  transform(value: unknown): LoginDto {
    const result = parseLoginBody(value);
    if (result.errors.length) {
      throw createValidationError(result.errors);
    }

    return result.value;
  }
}

@Injectable()
export class ForgotPasswordValidationPipe implements PipeTransform<unknown, ForgotPasswordDto> {
  transform(value: unknown): ForgotPasswordDto {
    const result = parseForgotPasswordBody(value);
    if (result.errors.length) {
      throw createValidationError(result.errors);
    }

    return result.value;
  }
}

@Injectable()
export class ResetPasswordValidationPipe implements PipeTransform<unknown, ResetPasswordDto> {
  transform(value: unknown): ResetPasswordDto {
    const result = parseResetPasswordBody(value);
    if (result.errors.length) {
      throw createValidationError(result.errors);
    }

    return result.value;
  }
}
