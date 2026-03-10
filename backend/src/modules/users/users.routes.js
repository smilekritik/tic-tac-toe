const router = require('express').Router();
const controller = require('./users.controller');

router.get('/:username', controller.getPublicProfile);

module.exports = router;
