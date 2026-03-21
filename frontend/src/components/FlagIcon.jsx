export default function FlagIcon({ code, size = 20 }) {
  return (
    <img
      src={`/flags/${code}.png`}
      alt={code}
      style={{
        width: size,
        height: size * 0.65,
        objectFit: 'cover',
        borderRadius: 2,
        display: 'block',
      }}
    />
  );
}
