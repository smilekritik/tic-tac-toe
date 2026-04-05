import { ApiProperty } from '@nestjs/swagger';

export class RegistrationDto {
  @ApiProperty({
    example: 'player@example.com',
    description: 'User email used for login, verification, and password recovery.',
  })
  email!: string;

  @ApiProperty({
    example: 'player_one',
    description: 'Public unique username.',
  })
  username!: string;

  @ApiProperty({
    example: 'StrongPassword123',
    description: 'Plain-text password sent during registration.',
  })
  password!: string;
}

export class LoginDto {
  @ApiProperty({
    example: 'player@example.com',
    description: 'Email or username used for login.',
  })
  login!: string;

  @ApiProperty({
    example: 'StrongPassword123',
    description: 'Plain-text password.',
  })
  password!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'player@example.com',
    description: 'Verified account email.',
  })
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    example: 'c4fca9d2-9f58-4d52-9136-3e40d262cb95',
    description: 'Password reset token received by email.',
  })
  token!: string;

  @ApiProperty({
    example: 'NewStrongPassword123',
    description: 'New plain-text password.',
  })
  password!: string;
}
