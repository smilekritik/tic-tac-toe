import { createEngine } from '../../src/game/engine/game.engine';

describe('game engine factory', () => {
  it('creates an engine for classic mode code', () => {
    const engine = createEngine('classic');
    const state = engine.init();

    expect(state.board).toEqual(Array(9).fill(null));
    expect(engine.checkDraw(Array(9).fill('X'))).toBe(true);
  });

  it('creates an engine for moving-window mode code', () => {
    const engine = createEngine('moving-window');
    const state = engine.init();

    expect(state.positionsBySymbol).toEqual({ X: [], O: [] });
    expect(engine.checkDraw(state.board)).toBe(false);
  });

  it('falls back to classic mode for an unknown mode code', () => {
    const engine = createEngine('unknown-mode');
    const state = engine.init();

    expect(state).toEqual({
      board: Array(9).fill(null),
      currentSymbol: 'X',
      moveCount: 0,
    });
  });
});
