const router = require('express').Router();
const controller = require('./auth.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { validate, requireBodyObject } = require('../../middlewares/validate.middleware');
const authValidators = require('../../validators/auth.validators');
const { authLimiter, loginLimiter } = require('../../middlewares/rateLimit.middleware');

router.use(authLimiter);

router.post('/registration', requireBodyObject, validate({ body: authValidators.registrationBody }), controller.register);
router.post('/login', loginLimiter, requireBodyObject, validate({ body: authValidators.loginBody }), controller.login);
router.post('/logout', controller.logout);
router.get('/activate/:token', controller.verifyEmail);
router.get('/refresh', controller.refresh);
router.post('/forgot-password', requireBodyObject, validate({ body: authValidators.forgotPasswordBody }), controller.forgotPassword);
router.post('/reset-password', requireBodyObject, validate({ body: authValidators.resetPasswordBody }), controller.resetPassword);
router.post('/resend-verification', requireAuth, controller.resendVerification);

module.exports = router;
