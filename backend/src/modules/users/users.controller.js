const usersService = require('./users.service');

async function getPublicProfile(req, res, next) {
  try {
    const user = await usersService.getPublicProfile(req.params.username);
    res.json(user);
  } catch (err) { next(err); }
}

module.exports = { getPublicProfile };
