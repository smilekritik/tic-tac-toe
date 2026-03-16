const router = require('express').Router();
const controller = require('./me.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { avatarUpload } = require('../../middlewares/upload.middleware');
const { validate, requireBodyObject } = require('../../middlewares/validate.middleware');
const meValidators = require('../../validators/me.validators');
const { uploadLimiter } = require('../../middlewares/rateLimit.middleware');

router.use(requireAuth);

router.get('/', controller.getMe);
router.patch('/profile', controller.updateProfile);
router.patch('/username', requireBodyObject, validate({ body: meValidators.updateUsernameBody }), controller.updateUsername);
router.patch('/email', requireBodyObject, validate({ body: meValidators.requestEmailChangeBody }), controller.requestEmailChange);
router.post('/avatar', uploadLimiter, avatarUpload, controller.uploadAvatar);

module.exports = router;
