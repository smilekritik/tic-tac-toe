export const AVATAR_EDITOR = Object.freeze({
  cropSize: 240,
  outputSize: 512,
  maskRatio: 0.72,
  previewSize: 88,
});

export const AVATAR_MASK_SIZE = AVATAR_EDITOR.cropSize * AVATAR_EDITOR.maskRatio;
export const AVATAR_MASK_OFFSET =
  (AVATAR_EDITOR.cropSize - AVATAR_MASK_SIZE) / 2;
