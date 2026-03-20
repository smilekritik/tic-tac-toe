const classicMode = require('./classic.mode');
const movingWindowMode = require('./moving-window.mode');

const GAME_MODE_MODULES = {
  classic: classicMode,
  'moving-window': movingWindowMode,
};

function getModeModule(modeCode) {
  return GAME_MODE_MODULES[modeCode] || classicMode;
}

function isSupportedMode(modeCode) {
  return Boolean(GAME_MODE_MODULES[modeCode]);
}

module.exports = {
  getModeModule,
  isSupportedMode,
};
