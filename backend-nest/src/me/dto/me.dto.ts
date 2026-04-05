import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'en',
    description: 'Preferred UI language. Supported values currently include en, uk, pl.',
  })
  preferredLanguage?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Default chat visibility/enabled preference for matches.',
  })
  chatEnabledDefault?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the public profile page is visible to other users.',
  })
  publicProfileEnabled?: boolean;
}

export class UpdateUsernameDto {
  @ApiProperty({
    example: 'player_one',
    description: 'New unique username.',
  })
  username!: string;
}

export class RequestEmailChangeDto {
  @ApiProperty({
    example: 'new-email@example.com',
    description: 'New email address to confirm via email link.',
  })
  email!: string;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({
    example: 'player_one',
    description: 'Optional new username.',
  })
  username?: string;

  @ApiPropertyOptional({
    example: 'player@example.com',
    description: 'Optional new email address.',
  })
  email?: string;

  @ApiPropertyOptional({
    example: 'en',
    description: 'Preferred UI language.',
  })
  preferredLanguage?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Default chat preference for new matches.',
  })
  chatEnabledDefault?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the profile is visible to other users.',
  })
  publicProfileEnabled?: boolean;
}

export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldStrongPassword123',
    description: 'Current account password.',
  })
  currentPassword!: string;

  @ApiProperty({
    example: 'NewStrongPassword123',
    description: 'New account password.',
  })
  newPassword!: string;
}

export class DeleteAccountDto {
  @ApiProperty({
    example: 'StrongPassword123',
    description: 'Current password confirmation required before deleting the account.',
  })
  password!: string;
}

export class UsernameAvailabilityQueryDto {
  @ApiProperty({
    example: 'future_name',
    description: 'Username to validate.',
  })
  username!: string;
}
