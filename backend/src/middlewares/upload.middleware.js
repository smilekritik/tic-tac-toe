const fs = require('fs/promises');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');

const UPLOAD_DIR = path.resolve(process.cwd(), env.upload.path);
const SAFE_IMAGE_TYPES = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};
const SAFE_UPLOAD_RE = /^[a-f0-9]{32}\.(jpg|png|webp)$/;

function createUploadError(code, status = 400) {
  const err = new Error(code);
  err.code = code;
  err.status = status;
  return err;
}

function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.upload.maxFileSize,
    files: 1,
  },
});

async function persistUploadedImage(req, res, next) {
  try {
    if (!req.file) return next();

    const detectedType = detectImageType(req.file.buffer);
    if (!detectedType) {
      return next(createUploadError('INVALID_FILE_TYPE'));
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const filename = `${crypto.randomBytes(16).toString('hex')}${detectedType.ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    await fs.writeFile(filePath, req.file.buffer);

    req.file.filename = filename;
    req.file.path = filePath;
    req.file.mimetype = detectedType.mime;
    delete req.file.buffer;

    return next();
  } catch (err) {
    return next(err);
  }
}

function resolveUploadedFile(filename) {
  if (!SAFE_UPLOAD_RE.test(filename)) {
    throw createUploadError('UPLOAD_NOT_FOUND', 404);
  }

  const ext = path.extname(filename).toLowerCase();
  const mime = SAFE_IMAGE_TYPES[ext];
  if (!mime) {
    throw createUploadError('UPLOAD_NOT_FOUND', 404);
  }

  return {
    filePath: path.join(UPLOAD_DIR, filename),
    mime,
  };
}

const avatarUpload = [upload.single('avatar'), persistUploadedImage];

module.exports = {
  avatarUpload,
  detectImageType,
  resolveUploadedFile,
};
