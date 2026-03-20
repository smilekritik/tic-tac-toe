import Square from './Square';

export default function Board({
  squares,
  onMove,
  currentSymbol,
  mySymbol,
  winLine,
  gameEnded,
  previewRemovalPosition,
  size = 'min(60vh, 80vw)',
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 3,
      background: '#333',
      padding: 3,
      borderRadius: 12,
      overflow: 'hidden',
      width: size,
      height: size,
    }}>
      {squares.map((value, i) => (
        <Square
          key={i}
          value={value}
          isClickable={!gameEnded && !value && currentSymbol === mySymbol}
          isWinning={winLine?.includes(i)}
          isRemovalPreview={!gameEnded && previewRemovalPosition === i}
          onClick={() => onMove(i)}
        />
      ))}
    </div>
  );
}
