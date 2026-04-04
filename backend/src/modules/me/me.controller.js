const meService = require('./me.service');

async function getMe(req, res, next) {
  try {
    const user = await meService.getMe(req.user.sub);
    res.json(user);
  } catch (err) { next(err); }
}

async function updateProfile(req, res, next) {
  try {
    const profile = await meService.updateProfile(req.user.sub, req.body);
    res.json(profile);
  } catch (err) { next(err); }
}

async function updateUsername(req, res, next) {
  try {
    const user = await meService.updateUsername(req.user.sub, req.body.username);
    res.json(user);
  } catch (err) { next(err); }
}

async function checkUsernameAvailability(req, res, next) {
  try {
    const result = await meService.checkUsernameAvailability(req.user.sub, req.query.username);
    res.json(result);
  } catch (err) { next(err); }
}

async function requestEmailChange(req, res, next) {
  try {
    const result = await meService.requestEmailChange(req.user.sub, req.body.email);
    res.json(result);
  } catch (err) { next(err); }
}

async function confirmEmailChange(req, res, next) {
  try {
    const result = await meService.confirmEmailChange(req.params.token);
    res.json(result);
  } catch (err) { next(err); }
}

async function updateSettings(req, res, next) {
  try {
    const result = await meService.updateSettings(req.user.sub, req.body);
    res.json(result);
  } catch (err) { next(err); }
}

async function changePassword(req, res, next) {
  try {
    const result = await meService.changePassword(req.user.sub, req.body);
    res.json(result);
  } catch (err) { next(err); }
}

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) {
      const err = new Error('NO_FILE');
      err.code = 'NO_FILE';
      err.status = 400;
      return next(err);
    }
    const filePath = `/uploads/${req.file.filename}`;
    const result = await meService.uploadAvatar(req.user.sub, filePath);
    res.json(result);
  } catch (err) { next(err); }
}

async function deleteAccount(req, res, next) {
  try {
    await meService.deleteAccount(req.user.sub, req.body.password);
    res.clearCookie('refreshToken');
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = {
  getMe,
  updateProfile,
  updateUsername,
  checkUsernameAvailability,
  requestEmailChange,
  confirmEmailChange,
  updateSettings,
  changePassword,
  uploadAvatar,
  deleteAccount,
};
