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

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('registration')
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
  async activate(@Param('token') token: string): Promise<{ message: string }> {
    return this.authService.verifyEmail(token);
  }

  @Post('forgot-password')
  @UsePipes(ForgotPasswordValidationPipe)
  async forgotPassword(@Body() body: ForgotPasswordDto): Promise<{ message: string }> {
    await this.authService.forgotPassword(body.email);
    return { message: 'If that email exists, a reset link was sent.' };
  }

  @Post('reset-password')
  @UsePipes(ResetPasswordValidationPipe)
  async resetPassword(@Body() body: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.resetPassword(body.token, body.password);
    return { message: 'Password updated' };
  }

  @Post('resend-verification')
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
