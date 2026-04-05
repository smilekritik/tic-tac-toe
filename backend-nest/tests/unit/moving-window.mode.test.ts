import movingWindowMode from '../../src/game/engine/moving-window.mode';

describe('moving-window mode', () => {
  it('applies initial moves correctly', () => {
    let state = movingWindowMode.initGame();
    state = movingWindowMode.applyMove(state, 0, 'X');
    state = movingWindowMode.applyMove(state, 1, 'O');
    state = movingWindowMode.applyMove(state, 4, 'X');

    expect(state.board).toEqual(['X', 'O', null, null, 'X', null, null, null, null]);
    expect(state.positionsBySymbol).toEqual({ X: [0, 4], O: [1] });
    expect(state.currentSymbol).toBe('O');
    expect(state.moveCount).toBe(3);
  });

  it('removes the oldest move after the symbol exceeds the limit', () => {
    let state = movingWindowMode.initGame();
    state = movingWindowMode.applyMove(state, 0, 'X');
    state = movingWindowMode.applyMove(state, 1, 'O');
    state = movingWindowMode.applyMove(state, 2, 'X');
    state = movingWindowMode.applyMove(state, 3, 'O');
    state = movingWindowMode.applyMove(state, 4, 'X');
    state = movingWindowMode.applyMove(state, 5, 'O');
    state = movingWindowMode.applyMove(state, 6, 'X');

    expect(state.positionsBySymbol?.X).toEqual([2, 4, 6]);
    expect(state.board[0]).toBeNull();
    expect(state.board[6]).toBe('X');
  });

  it('reports nextRemovalPosition for the current symbol', () => {
    let state = movingWindowMode.initGame();
    state = movingWindowMode.applyMove(state, 0, 'X');
    state = movingWindowMode.applyMove(state, 1, 'O');
    state = movingWindowMode.applyMove(state, 2, 'X');
    state = movingWindowMode.applyMove(state, 3, 'O');
    state = movingWindowMode.applyMove(state, 4, 'X');
    state = movingWindowMode.applyMove(state, 5, 'O');

    expect(movingWindowMode.serializeState(state).nextRemovalPosition).toBe(0);
  });

  it('never reports draw', () => {
    expect(movingWindowMode.checkDraw(movingWindowMode.initGame().board)).toBe(false);
  });

  it('evaluates wins on the current board only', () => {
    let state = movingWindowMode.initGame();
    state = movingWindowMode.applyMove(state, 0, 'X');
    state = movingWindowMode.applyMove(state, 3, 'O');
    state = movingWindowMode.applyMove(state, 1, 'X');
    state = movingWindowMode.applyMove(state, 4, 'O');
    state = movingWindowMode.applyMove(state, 2, 'X');
    state = movingWindowMode.applyMove(state, 7, 'O');
    state = movingWindowMode.applyMove(state, 6, 'X');

    expect(movingWindowMode.checkWinner(state.board)).toBeNull();
  });
});
