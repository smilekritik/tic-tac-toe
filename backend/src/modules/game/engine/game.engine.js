function createEngine(mode) {
  return {
    init: () => mode.initGame(),
    validateMove: (state, position) => mode.validateMove(state, position),
    applyMove: (state, position, symbol) => mode.applyMove(state, position, symbol),
    checkWinner: (board) => mode.checkWinner(board),
    checkDraw: (board) => mode.checkDraw(board),
    serialize: (state) => mode.serializeState(state),
  };
}

module.exports = { createEngine };
