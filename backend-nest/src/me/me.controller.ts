import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import {
  ChangePasswordDto,
  DeleteAccountDto,
  RequestEmailChangeDto,
  UpdateProfileDto,
  UpdateSettingsDto,
  UpdateUsernameDto,
  UsernameAvailabilityQueryDto,
} from './dto/me.dto';
import { MeService } from './me.service';
import {
  ChangePasswordValidationPipe,
  DeleteAccountValidationPipe,
  RequestEmailChangeValidationPipe,
  UpdateSettingsValidationPipe,
  UpdateUsernameValidationPipe,
  UsernameAvailabilityValidationPipe,
} from './pipes/me-validation.pipes';
import { AppError } from '../common/errors/app-error';

@Controller('api/me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get('email/confirm/:token')
  async confirmEmailChange(@Param('token') token: string): Promise<{ message: string }> {
    return this.meService.confirmEmailChange(token);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user?: AuthenticatedUser): Promise<Record<string, unknown>> {
    return this.meService.getMe(this.getUserId(user));
  }

  @Get('username-availability')
  @UseGuards(JwtAuthGuard)
  async checkUsernameAvailability(
    @CurrentUser() user?: AuthenticatedUser,
    @Query(new UsernameAvailabilityValidationPipe()) query?: UsernameAvailabilityQueryDto,
  ): Promise<{ username: string; available: boolean }> {
    return this.meService.checkUsernameAvailability(this.getUserId(user), query?.username || '');
  }

  @Patch('settings')
  @UseGuards(JwtAuthGuard)
  async updateSettings(
    @CurrentUser() user?: AuthenticatedUser,
    @Body(new UpdateSettingsValidationPipe()) body?: UpdateSettingsDto,
  ): Promise<Record<string, unknown>> {
    return this.meService.updateSettings(this.getUserId(user), body || {});
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user?: AuthenticatedUser,
    @Body() body?: UpdateProfileDto,
  ) {
    return this.meService.updateProfile(this.getUserId(user), body || {});
  }

  @Patch('username')
  @UseGuards(JwtAuthGuard)
  async updateUsername(
    @CurrentUser() user?: AuthenticatedUser,
    @Body(new UpdateUsernameValidationPipe()) body?: UpdateUsernameDto,
  ) {
    return this.meService.updateUsername(this.getUserId(user), body?.username || '');
  }

  @Patch('email')
  @UseGuards(JwtAuthGuard)
  async requestEmailChange(
    @CurrentUser() user?: AuthenticatedUser,
    @Body(new RequestEmailChangeValidationPipe()) body?: RequestEmailChangeDto,
  ): Promise<{ message: string }> {
    return this.meService.requestEmailChange(this.getUserId(user), body?.email || '');
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user?: AuthenticatedUser,
    @Body(new ChangePasswordValidationPipe()) body?: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.meService.changePassword(this.getUserId(user), body as ChangePasswordDto);
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar', {
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 2 * 1024 * 1024,
      files: 1,
    },
  }))
  async uploadAvatar(
    @CurrentUser() user?: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<{ avatarPath: string | null }> {
    if (!file?.buffer) {
      throw new AppError('NO_FILE', 400);
    }

    return this.meService.uploadAvatar(this.getUserId(user), file.buffer);
  }

  @Delete()
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async deleteAccount(
    @CurrentUser() user?: AuthenticatedUser,
    @Body(new DeleteAccountValidationPipe()) body?: DeleteAccountDto,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<void> {
    await this.meService.deleteAccount(this.getUserId(user), body?.password || '');
    res?.clearCookie('refreshToken');
    res?.status(204);
  }

  private getUserId(user?: AuthenticatedUser): string {
    const userId = user?.sub || user?.id;
    if (!userId) {
      throw new AppError('UNAUTHORIZED', 401);
    }

    return userId;
  }
}
