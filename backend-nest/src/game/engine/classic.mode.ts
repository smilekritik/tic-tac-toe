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

type ClassicGameState = BaseGameState;

function initGame(): ClassicGameState {
  return {
    board: Array(9).fill(null),
    currentSymbol: 'X',
    moveCount: 0,
  };
}

function validateMove(state: ClassicGameState, position: number): boolean {
  if (position < 0 || position > 8) {
    return false;
  }

  return state.board[position] === null;
}

function applyMove(state: ClassicGameState, position: number, symbol: 'X' | 'O'): ClassicGameState {
  const board = [...state.board];
  board[position] = symbol;

  return {
    ...state,
    board,
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

function checkDraw(board: BoardCell[]): boolean {
  return board.every((cell) => cell !== null);
}

function serializeState(state: ClassicGameState) {
  return {
    board: state.board,
    currentSymbol: state.currentSymbol,
    moveCount: state.moveCount,
  };
}

const classicMode: GameModeModule<ClassicGameState> = {
  initGame,
  validateMove,
  applyMove,
  checkWinner,
  checkDraw,
  serializeState,
};

export default classicMode;
