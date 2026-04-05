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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
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

@ApiTags('Me')
@Controller('api/me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get('email/confirm/:token')
  @ApiOperation({ summary: 'Confirm pending email change' })
  @ApiParam({ name: 'token', description: 'Email change confirmation token.' })
  @ApiOkResponse({ description: 'Email address updated successfully.' })
  async confirmEmailChange(@Param('token') token: string): Promise<{ message: string }> {
    return this.meService.confirmEmailChange(token);
  }

  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Returns current user profile, settings, and ratings.' })
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user?: AuthenticatedUser): Promise<Record<string, unknown>> {
    return this.meService.getMe(this.getUserId(user));
  }

  @Get('username-availability')
  @ApiOperation({ summary: 'Check whether a username is available' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'username', description: 'Username to validate.' })
  @ApiOkResponse({ description: 'Returns requested username and availability flag.' })
  @UseGuards(JwtAuthGuard)
  async checkUsernameAvailability(
    @CurrentUser() user?: AuthenticatedUser,
    @Query(new UsernameAvailabilityValidationPipe()) query?: UsernameAvailabilityQueryDto,
  ): Promise<{ username: string; available: boolean }> {
    return this.meService.checkUsernameAvailability(this.getUserId(user), query?.username || '');
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update current user settings' })
  @ApiBearerAuth()
  @ApiBody({ type: UpdateSettingsDto })
  @ApiOkResponse({ description: 'Returns updated current user profile payload.' })
  @UseGuards(JwtAuthGuard)
  async updateSettings(
    @CurrentUser() user?: AuthenticatedUser,
    @Body(new UpdateSettingsValidationPipe()) body?: UpdateSettingsDto,
  ): Promise<Record<string, unknown>> {
    return this.meService.updateSettings(this.getUserId(user), body || {});
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update profile visibility and UI preferences' })
  @ApiBearerAuth()
  @ApiBody({ type: UpdateProfileDto })
  @ApiOkResponse({ description: 'Returns updated current user profile payload.' })
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user?: AuthenticatedUser,
    @Body() body?: UpdateProfileDto,
  ) {
    return this.meService.updateProfile(this.getUserId(user), body || {});
  }

  @Patch('username')
  @ApiOperation({ summary: 'Change current username' })
  @ApiBearerAuth()
  @ApiBody({ type: UpdateUsernameDto })
  @ApiOkResponse({ description: 'Returns updated current user profile payload.' })
  @UseGuards(JwtAuthGuard)
  async updateUsername(
    @CurrentUser() user?: AuthenticatedUser,
    @Body(new UpdateUsernameValidationPipe()) body?: UpdateUsernameDto,
  ) {
    return this.meService.updateUsername(this.getUserId(user), body?.username || '');
  }

  @Patch('email')
  @ApiOperation({ summary: 'Request email change confirmation flow' })
  @ApiBearerAuth()
  @ApiBody({ type: RequestEmailChangeDto })
  @ApiOkResponse({ description: 'Confirmation email was sent to the new address.' })
  @UseGuards(JwtAuthGuard)
  async requestEmailChange(
    @CurrentUser() user?: AuthenticatedUser,
    @Body(new RequestEmailChangeValidationPipe()) body?: RequestEmailChangeDto,
  ): Promise<{ message: string }> {
    return this.meService.requestEmailChange(this.getUserId(user), body?.email || '');
  }

  @Patch('password')
  @ApiOperation({ summary: 'Change current password' })
  @ApiBearerAuth()
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({ description: 'Password changed and refresh sessions revoked as needed.' })
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user?: AuthenticatedUser,
    @Body(new ChangePasswordValidationPipe()) body?: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.meService.changePassword(this.getUserId(user), body as ChangePasswordDto);
  }

  @Post('avatar')
  @ApiOperation({ summary: 'Upload avatar image' })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['avatar'],
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file. Max size 2 MB.',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Returns the stored avatar path.' })
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
  @ApiOperation({ summary: 'Delete current account' })
  @ApiBearerAuth()
  @ApiBody({ type: DeleteAccountDto })
  @ApiNoContentResponse({ description: 'Account deleted and refresh cookie cleared.' })
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
