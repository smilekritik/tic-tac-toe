const WINNING_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

function initGame() {
  return {
    board: Array(9).fill(null),
    currentSymbol: 'X',
    moveCount: 0,
  };
}

function validateMove(state, position) {
  if (position < 0 || position > 8) return false;
  if (state.board[position] !== null) return false;
  return true;
}

function applyMove(state, position, symbol) {
  const board = [...state.board];
  board[position] = symbol;
  return {
    ...state,
    board,
    currentSymbol: symbol === 'X' ? 'O' : 'X',
    moveCount: state.moveCount + 1,
  };
}

function checkWinner(board) {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  return null;
}

function checkDraw(board) {
  return board.every((cell) => cell !== null);
}

function serializeState(state) {
  return {
    board: state.board,
    currentSymbol: state.currentSymbol,
    moveCount: state.moveCount,
  };
}

module.exports = { initGame, validateMove, applyMove, checkWinner, checkDraw, serializeState };
