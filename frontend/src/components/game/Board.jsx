import Square from './Square';

export default function Board({ squares, onMove, currentSymbol, mySymbol, winLine, gameEnded }) {
  return (
    <div
      className="grid grid-cols-3 gap-[2px] bg-[#333] p-0 rounded-xl overflow-hidden"
      style={{ width: '306px', height: '306px' }}
    >
      {squares.map((value, i) => (
        <div key={i} style={{ width: '100px', height: '100px' }}>
          <Square
            value={value}
            isClickable={!gameEnded && !value && currentSymbol === mySymbol}
            isWinning={winLine?.includes(i)}
            onClick={() => onMove(i)}
          />
        </div>
      ))}
    </div>
  );
}
