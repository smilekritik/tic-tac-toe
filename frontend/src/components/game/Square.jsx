import XIcon from './XIcon';
import OIcon from './OIcon';
import { cn } from '../../lib/utils';

export default function Square({ value, onClick, isClickable, isWinning }) {
  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      style={{
        backgroundColor: isWinning ? '#bbf7d0' : '#f5f5f5',
        border: isWinning ? '1px solid #4ade80' : '1px solid #d4d4d4',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={(e) => { if (isClickable) e.currentTarget.style.backgroundColor = '#e5e5e5'; }}
      onMouseLeave={(e) => { if (isClickable) e.currentTarget.style.backgroundColor = isWinning ? '#bbf7d0' : '#f5f5f5'; }}
    >
      <div style={{ width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {value === 'X' && <XIcon size={52} />}
        {value === 'O' && <OIcon size={52} />}
      </div>
    </button>
  );
}
