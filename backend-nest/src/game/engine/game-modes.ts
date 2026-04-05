import classicMode from './classic.mode';
import movingWindowMode from './moving-window.mode';
import type { GameModeModule } from './types';

const GAME_MODE_MODULES: Record<string, GameModeModule> = {
  classic: classicMode,
  'moving-window': movingWindowMode,
};

export function getModeModule(modeCode: string): GameModeModule {
  return GAME_MODE_MODULES[modeCode] || classicMode;
}

export function isSupportedMode(modeCode: string): boolean {
  return Boolean(GAME_MODE_MODULES[modeCode]);
}
