import path from 'node:path';
import { UploadsService } from '../../src/uploads/uploads.service';
import { AppError } from '../../src/common/errors/app-error';

describe('uploads service helpers', () => {
  const service = new UploadsService({
    upload: {
      path: './tests/.tmp-uploads',
      maxFileSize: 2 * 1024 * 1024,
    },
  } as never);

  it('detects JPEG buffers', () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06]);
    expect(service.detectImageType(buffer)).toEqual({ ext: '.jpg', mime: 'image/jpeg' });
  });

  it('detects PNG buffers', () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    expect(service.detectImageType(buffer)).toEqual({ ext: '.png', mime: 'image/png' });
  });

  it('detects WEBP buffers', () => {
    const buffer = Buffer.from('52494646AAAAAAAA57454250', 'hex');
    expect(service.detectImageType(buffer)).toEqual({ ext: '.webp', mime: 'image/webp' });
  });

  it('rejects unsupported or too short buffers', () => {
    expect(service.detectImageType(Buffer.from('plain-text'))).toBeNull();
    expect(service.detectImageType(Buffer.from([0x89, 0x50, 0x4e]))).toBeNull();
  });

  it('resolves a safe uploaded filename', () => {
    const resolved = service.resolveUploadedFile('0123456789abcdef0123456789abcdef.jpg');
    expect(resolved.mime).toBe('image/jpeg');
    expect(path.basename(resolved.filePath)).toBe('0123456789abcdef0123456789abcdef.jpg');
  });

  it('rejects dangerous or malformed filenames', () => {
    expect(() => service.resolveUploadedFile('../evil.jpg')).toThrow(AppError);
    expect(() => service.resolveUploadedFile('not-a-file.png')).toThrow(AppError);
    expect(() => service.resolveUploadedFile('0123456789abcdef0123456789abcdef.JPG')).toThrow(AppError);
    expect(() => service.resolveUploadedFile('0123456789abcdef0123456789abcdef.jpg.exe')).toThrow(AppError);
  });

  it('resolves only managed upload paths', () => {
    expect(service.resolveManagedUploadPath('/uploads/0123456789abcdef0123456789abcdef.png')).toContain('.tmp-uploads');
    expect(service.resolveManagedUploadPath('/not-uploads/file.png')).toBeNull();
  });
});
