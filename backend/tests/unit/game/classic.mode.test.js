const classicMode = require('../../../src/modules/game/engine/classic.mode');

describe('classic mode', () => {
  it('creates an empty initial state', () => {
    expect(classicMode.initGame()).toEqual({
      board: Array(9).fill(null),
      currentSymbol: 'X',
      moveCount: 0,
    });
  });

  it('accepts a valid move', () => {
    const state = classicMode.initGame();

    expect(classicMode.validateMove(state, 4)).toBe(true);
  });

  it('rejects a move into an occupied cell', () => {
    const state = classicMode.applyMove(classicMode.initGame(), 4, 'X');

    expect(classicMode.validateMove(state, 4)).toBe(false);
  });

  it('rejects a move outside the board', () => {
    const state = classicMode.initGame();

    expect(classicMode.validateMove(state, -1)).toBe(false);
    expect(classicMode.validateMove(state, 9)).toBe(false);
  });

  it('applies a move and updates board, symbol and move count', () => {
    const nextState = classicMode.applyMove(classicMode.initGame(), 0, 'X');

    expect(nextState.board).toEqual(['X', null, null, null, null, null, null, null, null]);
    expect(nextState.currentSymbol).toBe('O');
    expect(nextState.moveCount).toBe(1);
  });

  it('detects a win on rows', () => {
    const board = ['X', 'X', 'X', null, null, null, null, null, null];

    expect(classicMode.checkWinner(board)).toEqual({ winner: 'X', line: [0, 1, 2] });
  });

  it('detects a win on columns', () => {
    const board = ['O', null, null, 'O', null, null, 'O', null, null];

    expect(classicMode.checkWinner(board)).toEqual({ winner: 'O', line: [0, 3, 6] });
  });

  it('detects a win on diagonals', () => {
    const board = ['X', null, null, null, 'X', null, null, null, 'X'];

    expect(classicMode.checkWinner(board)).toEqual({ winner: 'X', line: [0, 4, 8] });
  });

  it('detects a draw on a full board', () => {
    const board = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];

    expect(classicMode.checkDraw(board)).toBe(true);
  });

  it('does not mark a partial board as draw', () => {
    const board = ['X', 'O', null, 'X', 'O', 'O', 'O', 'X', 'X'];

    expect(classicMode.checkDraw(board)).toBe(false);
  });
});
