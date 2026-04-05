import { getModeModule } from './game-modes';
import type { BaseGameState, GameModeModule } from './types';

function resolveMode(modeOrCode: string | GameModeModule): GameModeModule {
  if (typeof modeOrCode === 'string') {
    return getModeModule(modeOrCode);
  }

  return modeOrCode;
}

export function createEngine(mode: string | GameModeModule) {
  const resolvedMode = resolveMode(mode);

  return {
    init: (): BaseGameState => resolvedMode.initGame(),
    validateMove: (state: BaseGameState, position: number): boolean => resolvedMode.validateMove(state, position),
    applyMove: (state: BaseGameState, position: number, symbol: 'X' | 'O'): BaseGameState =>
      resolvedMode.applyMove(state, position, symbol),
    checkWinner: resolvedMode.checkWinner,
    checkDraw: resolvedMode.checkDraw,
    serialize: (state: BaseGameState) => resolvedMode.serializeState(state),
  };
}
