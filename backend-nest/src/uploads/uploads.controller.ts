import fs from 'node:fs';
import path from 'node:path';
import { Controller, Get, Next, Param, Res } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiProduces, ApiTags } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { AppError } from '../common/errors/app-error';
import { ErrorEnvelopeDto } from '../docs/openapi.models';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get(':filename')
  @ApiOperation({ summary: 'Stream uploaded file by filename' })
  @ApiParam({ name: 'filename', description: 'Stored upload filename.' })
  @ApiProduces('image/png', 'image/jpeg', 'image/webp', 'image/gif')
  @ApiOkResponse({ description: 'Returns uploaded file content with detected mime type.' })
  @ApiNotFoundResponse({ description: 'Uploaded file was not found.', type: ErrorEnvelopeDto })
  getUploadedFile(
    @Param('filename') filename: string,
    @Res() res: Response,
    @Next() next: NextFunction,
  ): void {
    try {
      const { filePath, mime } = this.uploadsService.resolveUploadedFile(filename);

      if (!fs.existsSync(filePath)) {
        throw new AppError('UPLOAD_NOT_FOUND', 404);
      }

      res.setHeader('Content-Type', mime);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  }
}
