import type { BaseGameState, BoardCell, GameModeModule, WinResult } from './types';

const WINNING_LINES: Array<[number, number, number]> = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

type MovingWindowGameState = BaseGameState & {
  positionsBySymbol: {
    X: number[];
    O: number[];
  };
};

function initGame(): MovingWindowGameState {
  return {
    board: Array(9).fill(null),
    currentSymbol: 'X',
    moveCount: 0,
    positionsBySymbol: {
      X: [],
      O: [],
    },
  };
}

function validateMove(state: MovingWindowGameState, position: number): boolean {
  if (position < 0 || position > 8) {
    return false;
  }

  return state.board[position] === null;
}

function applyMove(state: MovingWindowGameState, position: number, symbol: 'X' | 'O'): MovingWindowGameState {
  const board = [...state.board];
  const positionsBySymbol = {
    X: [...state.positionsBySymbol.X],
    O: [...state.positionsBySymbol.O],
  };
  const symbolPositions = [...positionsBySymbol[symbol]];

  if (symbolPositions.length >= 3) {
    const removedPosition = symbolPositions.shift();
    if (removedPosition !== undefined) {
      board[removedPosition] = null;
    }
  }

  board[position] = symbol;
  symbolPositions.push(position);
  positionsBySymbol[symbol] = symbolPositions;

  return {
    ...state,
    board,
    positionsBySymbol,
    currentSymbol: symbol === 'X' ? 'O' : 'X',
    moveCount: state.moveCount + 1,
  };
}

function checkWinner(board: BoardCell[]): WinResult | null {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }

  return null;
}

function checkDraw(): boolean {
  return false;
}

function serializeState(state: MovingWindowGameState) {
  const currentPositions = state.positionsBySymbol[state.currentSymbol] || [];

  return {
    board: state.board,
    currentSymbol: state.currentSymbol,
    moveCount: state.moveCount,
    nextRemovalPosition: currentPositions.length >= 3 ? currentPositions[0] : null,
  };
}

const movingWindowMode: GameModeModule<MovingWindowGameState> = {
  initGame,
  validateMove,
  applyMove,
  checkWinner,
  checkDraw,
  serializeState,
};

export default movingWindowMode;
