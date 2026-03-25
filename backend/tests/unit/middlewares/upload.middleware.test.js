const path = require('path');
const {
  detectImageType,
  resolveUploadedFile,
} = require('../../../src/middlewares/upload.middleware');

describe('upload middleware helpers', () => {
  it('detects JPEG buffers', () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06]);

    expect(detectImageType(buffer)).toEqual({ ext: '.jpg', mime: 'image/jpeg' });
  });

  it('detects PNG buffers', () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

    expect(detectImageType(buffer)).toEqual({ ext: '.png', mime: 'image/png' });
  });

  it('detects WEBP buffers', () => {
    const buffer = Buffer.from('52494646AAAAAAAA57454250', 'hex');

    expect(detectImageType(buffer)).toEqual({ ext: '.webp', mime: 'image/webp' });
  });

  it('rejects unsupported buffers', () => {
    expect(detectImageType(Buffer.from('plain-text'))).toBeNull();
  });

  it('rejects buffers that are too short to identify safely', () => {
    expect(detectImageType(Buffer.from([0x89, 0x50, 0x4e]))).toBeNull();
  });

  it('resolves a safe uploaded filename', () => {
    const resolved = resolveUploadedFile('0123456789abcdef0123456789abcdef.jpg');

    expect(resolved.mime).toBe('image/jpeg');
    expect(path.basename(resolved.filePath)).toBe('0123456789abcdef0123456789abcdef.jpg');
  });

  it('rejects dangerous or malformed filenames', () => {
    expect(() => resolveUploadedFile('../evil.jpg')).toThrow('UPLOAD_NOT_FOUND');
    expect(() => resolveUploadedFile('not-a-file.png')).toThrow('UPLOAD_NOT_FOUND');
    expect(() => resolveUploadedFile('0123456789abcdef0123456789abcdef.JPG')).toThrow('UPLOAD_NOT_FOUND');
    expect(() => resolveUploadedFile('0123456789abcdef0123456789abcdef.jpg.exe')).toThrow('UPLOAD_NOT_FOUND');
  });
});
