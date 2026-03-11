const router = require('express').Router();
const controller = require('./auth.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');

router.post('/registration', controller.register);
router.post('/login', controller.login);
router.post('/logout', controller.logout);
router.get('/activate/:token', controller.verifyEmail);
router.get('/refresh', controller.refresh);
router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password', controller.resetPassword);
router.post('/resend-verification', requireAuth, controller.resendVerification);

module.exports = router;
