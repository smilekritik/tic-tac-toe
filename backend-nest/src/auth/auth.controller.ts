import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AppError } from '../common/errors/app-error';
import { CurrentUser } from './current-user.decorator';
import { ForgotPasswordDto, LoginDto, RegistrationDto, ResetPasswordDto } from './dto/auth.dto';
import type { AuthenticatedRequest, AuthenticatedUser } from './interfaces/authenticated-request.interface';
import {
  ForgotPasswordValidationPipe,
  LoginValidationPipe,
  RegistrationValidationPipe,
  ResetPasswordValidationPipe,
} from './pipes/auth-validation.pipes';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

const REFRESH_COOKIE = 'refreshToken';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('registration')
  @ApiOperation({ summary: 'Register a new account' })
  @ApiBody({ type: RegistrationDto })
  @ApiOkResponse({ description: 'Registration accepted. Verification email was sent.' })
  @UsePipes(RegistrationValidationPipe)
  async register(
    @Body() body: RegistrationDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<{ message: string }> {
    const lang = acceptLanguage?.split(',')[0]?.split('-')[0] || 'en';
    const safeLang = ['en', 'uk', 'pl'].includes(lang) ? lang : 'en';
    await this.authService.register({
      ...body,
      lang: safeLang,
    });
    return { message: 'Registered. Check your email to verify your account.' };
  }

  @Post('login')
  @ApiOperation({ summary: 'Log in with email or username' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'Returns access token and sets refreshToken cookie.' })
  @UsePipes(LoginValidationPipe)
  async login(
    @Body() body: LoginDto,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string; user: { id: string; username: string; role: string } }> {
    const result = await this.authService.login({
      ...body,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.cookie(REFRESH_COOKIE, result.refreshToken, this.getCookieOptions());
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Get('refresh')
  @ApiOperation({ summary: 'Refresh access token using refreshToken cookie' })
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOkResponse({ description: 'Returns a fresh access token and rotates refresh cookie.' })
  async refresh(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string } | { error: { message: string } }> {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) {
      res.status(401);
      return { error: { message: 'No refresh token' } };
    }

    const result = await this.authService.refresh(
      token,
      req.ip,
      req.headers['user-agent'],
    );
    res.cookie(REFRESH_COOKIE, result.refreshToken, this.getCookieOptions());
    return { accessToken: result.accessToken };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Log out and clear refresh token cookie' })
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOkResponse({ description: 'Clears refreshToken cookie if present.' })
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (token) {
      await this.authService.logout(token);
    }

    res.clearCookie(REFRESH_COOKIE);
    return { message: 'Logged out' };
  }

  @Get('activate/:token')
  @ApiOperation({ summary: 'Activate account by email verification token' })
  @ApiParam({ name: 'token', description: 'Verification token from email.' })
  @ApiOkResponse({ description: 'Email confirmed successfully.' })
  async activate(@Param('token') token: string): Promise<{ message: string }> {
    return this.authService.verifyEmail(token);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({ description: 'Always returns a generic success message.' })
  @UsePipes(ForgotPasswordValidationPipe)
  async forgotPassword(@Body() body: ForgotPasswordDto): Promise<{ message: string }> {
    await this.authService.forgotPassword(body.email);
    return { message: 'If that email exists, a reset link was sent.' };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using email token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ description: 'Password was updated successfully.' })
  @UsePipes(ResetPasswordValidationPipe)
  async resetPassword(@Body() body: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.resetPassword(body.token, body.password);
    return { message: 'Password updated' };
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend verification email for the current user' })
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Verification email resend accepted.' })
  @UseGuards(JwtAuthGuard)
  async resendVerification(@CurrentUser() user?: AuthenticatedUser): Promise<{ message: string }> {
    const userId = user?.sub || user?.id;
    if (!userId) {
      throw new AppError('UNAUTHORIZED', 401);
    }

    return this.authService.resendVerification(userId);
  }

  private getCookieOptions(): {
    httpOnly: boolean;
    sameSite: 'strict';
    secure: boolean;
    maxAge: number;
  } {
    return {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }
}
