interface OrbProps {
  size?: number;
  className?: string;
  thinking?: boolean;
}

/** Animated holographic AI orb — layered rotating gradient rings + glowing core. */
export function Orb({ size = 120, className = '', thinking = false }: OrbProps) {
  return (
    <div
      className={`relative ${thinking ? 'animate-glow-pulse' : ''} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* outer rotating conic ring */}
      <div
        className="absolute inset-0 rounded-full animate-orb-rotate"
        style={{
          background:
            'conic-gradient(from 0deg, rgba(118,43,255,0.0), rgba(118,43,255,0.85), rgba(0,217,255,0.85), rgba(255,66,179,0.7), rgba(118,43,255,0.0))',
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))',
          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))',
          filter: 'blur(0.4px)',
        }}
      />
      {/* mid counter-rotating ring */}
      <div
        className="absolute inset-[14%] rounded-full animate-spin-rev"
        style={{
          background:
            'conic-gradient(from 180deg, rgba(38,99,255,0.0), rgba(0,217,255,0.8), rgba(38,99,255,0.0))',
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
        }}
      />
      {/* glow halo */}
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-70 animate-orb-pulse"
        style={{ background: 'radial-gradient(circle at 50% 50%, rgba(118,43,255,0.55), rgba(0,217,255,0.25) 55%, transparent 70%)' }}
      />
      {/* core sphere */}
      <div
        className="absolute inset-[26%] rounded-full animate-orb-float"
        style={{
          background:
            'radial-gradient(circle at 35% 30%, #ffffff 0%, #c7b8ff 18%, #762bff 45%, #1b1f6b 80%, #050616 100%)',
          boxShadow:
            'inset -6px -8px 18px rgba(0,0,0,0.6), inset 6px 6px 14px rgba(255,255,255,0.25), 0 0 26px rgba(118,43,255,0.6)',
        }}
      >
        {/* sheen */}
        <div
          className="absolute rounded-full"
          style={{
            top: '14%',
            left: '20%',
            width: '34%',
            height: '26%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.85), transparent 70%)',
            filter: 'blur(2px)',
          }}
        />
      </div>
      {/* orbiting particles */}
      <div className="absolute inset-0 animate-orb-rotate">
        <span
          className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
          style={{ background: '#00d9ff', boxShadow: '0 0 10px #00d9ff' }}
        />
      </div>
      <div className="absolute inset-0 animate-spin-rev">
        <span
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
          style={{ background: '#ff42b3', boxShadow: '0 0 10px #ff42b3' }}
        />
      </div>
    </div>
  );
}
