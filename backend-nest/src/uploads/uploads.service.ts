import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { AppError } from '../common/errors/app-error';

const SAFE_IMAGE_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};
const SAFE_UPLOAD_RE = /^[a-f0-9]{32}\.(jpg|png|webp)$/;
const UPLOAD_PUBLIC_PREFIX = '/uploads/';

@Injectable()
export class UploadsService {
  constructor(private readonly config: AppConfigService) {}

  async ensureUploadDir(): Promise<void> {
    await fsPromises.mkdir(this.getUploadDir(), { recursive: true });
  }

  resolveUploadedFile(filename: string): { filePath: string; mime: string } {
    if (!SAFE_UPLOAD_RE.test(filename)) {
      throw new AppError('UPLOAD_NOT_FOUND', 404);
    }

    const ext = path.extname(filename).toLowerCase();
    const mime = SAFE_IMAGE_TYPES[ext];
    if (!mime) {
      throw new AppError('UPLOAD_NOT_FOUND', 404);
    }

    return {
      filePath: path.join(this.getUploadDir(), filename),
      mime,
    };
  }

  detectImageType(buffer: Buffer): { ext: string; mime: string } | null {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
      return null;
    }

    const isJpeg =
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;

    if (isJpeg) {
      return { ext: '.jpg', mime: SAFE_IMAGE_TYPES['.jpg'] };
    }

    const isPng =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a;

    if (isPng) {
      return { ext: '.png', mime: SAFE_IMAGE_TYPES['.png'] };
    }

    const isWebp =
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP';

    if (isWebp) {
      return { ext: '.webp', mime: SAFE_IMAGE_TYPES['.webp'] };
    }

    return null;
  }

  async persistImageFromBuffer(buffer: Buffer): Promise<{ publicPath: string; absolutePath: string; mime: string }> {
    const detectedType = this.detectImageType(buffer);
    if (!detectedType) {
      throw new AppError('INVALID_FILE_TYPE', 400);
    }

    await this.ensureUploadDir();

    const filename = `${crypto.randomBytes(16).toString('hex')}${detectedType.ext}`;
    const absolutePath = path.join(this.getUploadDir(), filename);

    await fsPromises.writeFile(absolutePath, buffer);

    return {
      publicPath: `${UPLOAD_PUBLIC_PREFIX}${filename}`,
      absolutePath,
      mime: detectedType.mime,
    };
  }

  resolveManagedUploadPath(publicPath: string | null | undefined): string | null {
    if (typeof publicPath !== 'string' || !publicPath.startsWith(UPLOAD_PUBLIC_PREFIX)) {
      return null;
    }

    const filename = publicPath.slice(UPLOAD_PUBLIC_PREFIX.length);
    if (!SAFE_UPLOAD_RE.test(filename)) {
      return null;
    }

    const absolutePath = path.resolve(this.getUploadDir(), filename);
    const relativePath = path.relative(this.getUploadDir(), absolutePath);

    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      return null;
    }

    return absolutePath;
  }

  async removeFile(absolutePath: string | null | undefined): Promise<void> {
    if (!absolutePath) {
      return;
    }

    await fsPromises.unlink(absolutePath).catch((error: NodeJS.ErrnoException) => {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    });
  }

  private getUploadDir(): string {
    const configuredPath = this.config.upload.path;
    if (path.isAbsolute(configuredPath)) {
      return configuredPath;
    }

    const cwdPath = path.resolve(process.cwd(), configuredPath);
    const workspacePath = path.resolve(process.cwd(), '..', configuredPath.replace(/^\.\//, ''));

    return fs.existsSync(workspacePath) ? workspacePath : cwdPath;
  }
}
