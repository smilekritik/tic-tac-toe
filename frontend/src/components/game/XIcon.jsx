export default function XIcon({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <line x1="15" y1="15" x2="85" y2="85" stroke="#ef4444" strokeWidth="12" strokeLinecap="round" />
      <line x1="85" y1="15" x2="15" y2="85" stroke="#ef4444" strokeWidth="12" strokeLinecap="round" />
    </svg>
  );
}
