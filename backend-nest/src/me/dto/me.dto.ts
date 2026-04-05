export class UpdateProfileDto {
  preferredLanguage?: string;
  chatEnabledDefault?: boolean;
  publicProfileEnabled?: boolean;
}

export class UpdateUsernameDto {
  username!: string;
}

export class RequestEmailChangeDto {
  email!: string;
}

export class UpdateSettingsDto {
  username?: string;
  email?: string;
  preferredLanguage?: string;
  chatEnabledDefault?: boolean;
  publicProfileEnabled?: boolean;
}

export class ChangePasswordDto {
  currentPassword!: string;
  newPassword!: string;
}

export class DeleteAccountDto {
  password!: string;
}

export class UsernameAvailabilityQueryDto {
  username!: string;
}
