export default function Avatar({ src, size = 40, className = '' }) {
  return (
    <img
      src={src || '/default-avatar.png'}
      alt="avatar"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', background: '#222' }}
      onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
    />
  );
}
