import classicMode from '../../src/game/engine/classic.mode';

describe('classic mode', () => {
  it('creates an empty initial state', () => {
    expect(classicMode.initGame()).toEqual({
      board: Array(9).fill(null),
      currentSymbol: 'X',
      moveCount: 0,
    });
  });

  it('accepts a valid move', () => {
    expect(classicMode.validateMove(classicMode.initGame(), 4)).toBe(true);
  });

  it('rejects a move into an occupied cell', () => {
    const state = classicMode.applyMove(classicMode.initGame(), 4, 'X');
    expect(classicMode.validateMove(state, 4)).toBe(false);
  });

  it('rejects moves outside the board', () => {
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

  it('detects a win on rows, columns and diagonals', () => {
    expect(classicMode.checkWinner(['X', 'X', 'X', null, null, null, null, null, null])).toEqual({
      winner: 'X',
      line: [0, 1, 2],
    });
    expect(classicMode.checkWinner(['O', null, null, 'O', null, null, 'O', null, null])).toEqual({
      winner: 'O',
      line: [0, 3, 6],
    });
    expect(classicMode.checkWinner(['X', null, null, null, 'X', null, null, null, 'X'])).toEqual({
      winner: 'X',
      line: [0, 4, 8],
    });
  });

  it('detects draws correctly', () => {
    expect(classicMode.checkDraw(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'])).toBe(true);
    expect(classicMode.checkDraw(['X', 'O', null, 'X', 'O', 'O', 'O', 'X', 'X'])).toBe(false);
  });
});
