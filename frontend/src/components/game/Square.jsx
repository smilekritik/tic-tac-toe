import XIcon from './XIcon';
import OIcon from './OIcon';
import { cn } from '../../lib/utils';

export default function Square({ value, onClick, isClickable, isWinning }) {
  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isWinning ? '#bbf7d0' : '#f5f5f5',
        border: isWinning ? '1px solid #4ade80' : '1px solid #d4d4d4',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'background-color 0.15s',
        padding: 0,
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => { if (isClickable) e.currentTarget.style.backgroundColor = '#e5e5e5'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isWinning ? '#bbf7d0' : '#f5f5f5'; }}
    >
      {value === 'X' && (
        <svg viewBox="0 0 100 100" style={{ position: 'absolute', width: '60%', height: '60%' }}>
          <line x1="15" y1="15" x2="85" y2="85" stroke="#ef4444" strokeWidth="12" strokeLinecap="round" />
          <line x1="85" y1="15" x2="15" y2="85" stroke="#ef4444" strokeWidth="12" strokeLinecap="round" />
        </svg>
      )}
      {value === 'O' && (
        <svg viewBox="0 0 100 100" style={{ position: 'absolute', width: '60%', height: '60%' }}>
          <circle cx="50" cy="50" r="38" stroke="#3b82f6" strokeWidth="12" fill="none" />
        </svg>
      )}
    </button>
  );
}
