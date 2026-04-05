export type GameSymbol = 'X' | 'O';

export type BoardCell = GameSymbol | null;

export type WinResult = {
  winner: GameSymbol;
  line: [number, number, number];
};

export type SerializedGameState = {
  board: BoardCell[];
  currentSymbol: GameSymbol;
  moveCount: number;
  nextRemovalPosition?: number | null;
};

export type BaseGameState = {
  board: BoardCell[];
  currentSymbol: GameSymbol;
  moveCount: number;
  positionsBySymbol?: {
    X: number[];
    O: number[];
  };
};

export interface GameModeModule<TState extends BaseGameState = BaseGameState> {
  initGame(): TState;
  validateMove(state: TState, position: number): boolean;
  applyMove(state: TState, position: number, symbol: GameSymbol): TState;
  checkWinner(board: BoardCell[]): WinResult | null;
  checkDraw(board: BoardCell[]): boolean;
  serializeState(state: TState): SerializedGameState;
}
