export class RegistrationDto {
  email!: string;
  username!: string;
  password!: string;
}

export class LoginDto {
  login!: string;
  password!: string;
}

export class ForgotPasswordDto {
  email!: string;
}

export class ResetPasswordDto {
  token!: string;
  password!: string;
}
