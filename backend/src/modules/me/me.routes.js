const router = require('express').Router();
const controller = require('./me.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const upload = require('../../middlewares/upload.middleware');

router.use(requireAuth);

router.get('/', controller.getMe);
router.patch('/profile', controller.updateProfile);
router.patch('/username', controller.updateUsername);
router.patch('/email', controller.requestEmailChange);
router.post('/avatar', upload.single('avatar'), controller.uploadAvatar);

module.exports = router;
