const { getModeModule } = require('./game-modes');

function resolveMode(modeOrCode) {
  if (typeof modeOrCode === 'string') {
    return getModeModule(modeOrCode);
  }

  return modeOrCode;
}

function createEngine(mode) {
  const resolvedMode = resolveMode(mode);

  return {
    init: () => resolvedMode.initGame(),
    validateMove: (state, position) => resolvedMode.validateMove(state, position),
    applyMove: (state, position, symbol) => resolvedMode.applyMove(state, position, symbol),
    checkWinner: (board) => resolvedMode.checkWinner(board),
    checkDraw: (board) => resolvedMode.checkDraw(board),
    serialize: (state) => resolvedMode.serializeState(state),
  };
}

module.exports = { createEngine };
