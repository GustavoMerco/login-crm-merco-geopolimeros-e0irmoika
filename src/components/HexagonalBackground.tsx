import React from 'react'

export const HexagonalLattice: React.FC = () => {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none opacity-85"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      <defs>
        {/* Repeating hexagonal molecular lattice pattern */}
        <pattern
          id="hex-lattice"
          width="112"
          height="194"
          patternUnits="userSpaceOnUse"
          patternTransform="scale(0.85)"
        >
          {/* Hexagon 1 (Top-Left) */}
          <polygon
            points="56,12 84,28 84,60 56,76 28,60 28,28"
            fill="none"
            stroke="rgba(52, 211, 153, 0.15)"
            strokeWidth="1.2"
          />
          {/* Hexagon 2 (Offset Center/Right) */}
          <polygon
            points="112,109 140,125 140,157 112,173 84,157 84,125"
            fill="none"
            stroke="rgba(52, 211, 153, 0.15)"
            strokeWidth="1.2"
          />
          {/* Hexagon 3 (Offset Left) */}
          <polygon
            points="0,109 28,125 28,157 0,173 -28,157 -28,125"
            fill="none"
            stroke="rgba(52, 211, 153, 0.15)"
            strokeWidth="1.2"
          />

          {/* Polymer bonding connecting lines */}
          <line
            x1="56"
            y1="76"
            x2="56"
            y2="109"
            stroke="rgba(52, 211, 153, 0.14)"
            strokeWidth="1.2"
          />
          <line
            x1="84"
            y1="60"
            x2="112"
            y2="44"
            stroke="rgba(52, 211, 153, 0.14)"
            strokeWidth="1.2"
          />
          <line
            x1="28"
            y1="60"
            x2="0"
            y2="44"
            stroke="rgba(52, 211, 153, 0.14)"
            strokeWidth="1.2"
          />
          <line
            x1="84"
            y1="125"
            x2="56"
            y2="109"
            stroke="rgba(52, 211, 153, 0.14)"
            strokeWidth="1.2"
          />
          <line
            x1="28"
            y1="125"
            x2="56"
            y2="109"
            stroke="rgba(52, 211, 153, 0.14)"
            strokeWidth="1.2"
          />

          {/* Regular emerald nodes */}
          <circle cx="56" cy="12" r="2.2" fill="rgba(52, 211, 153, 0.30)" />
          <circle cx="84" cy="28" r="2" fill="rgba(52, 211, 153, 0.25)" />
          <circle cx="28" cy="28" r="2" fill="rgba(52, 211, 153, 0.25)" />
          <circle cx="84" cy="60" r="2" fill="rgba(52, 211, 153, 0.25)" />
          <circle cx="28" cy="60" r="2" fill="rgba(52, 211, 153, 0.25)" />

          {/* Highlighted orange nodes (~1 in 6 nodes highlighted in orange rgba(249,115,22,0.25)) */}
          <circle cx="56" cy="76" r="3" fill="rgba(249, 115, 22, 0.35)" />
          <circle cx="56" cy="76" r="6" fill="rgba(249, 115, 22, 0.12)" />

          <circle cx="112" cy="109" r="2" fill="rgba(52, 211, 153, 0.25)" />
          <circle cx="84" cy="157" r="2" fill="rgba(52, 211, 153, 0.25)" />

          {/* Second orange node */}
          <circle cx="0" cy="173" r="3" fill="rgba(249, 115, 22, 0.35)" />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="url(#hex-lattice)" />
    </svg>
  )
}

interface FloatingParticlesProps {
  reducedCount?: boolean
}

export const FloatingHexagons: React.FC<FloatingParticlesProps> = ({ reducedCount = false }) => {
  const particles = [
    {
      id: 1,
      size: 40,
      top: '18%',
      left: '12%',
      stroke: 'rgba(110, 231, 183, 0.32)',
      animationClass: 'animate-drift-1',
      delay: '0s',
    },
    {
      id: 2,
      size: 24,
      top: '38%',
      left: '78%',
      stroke: 'rgba(251, 146, 60, 0.42)',
      animationClass: 'animate-drift-2',
      delay: '1.5s',
    },
    {
      id: 3,
      size: 32,
      top: '68%',
      left: '20%',
      stroke: 'rgba(110, 231, 183, 0.30)',
      animationClass: 'animate-drift-3',
      delay: '0.8s',
    },
    {
      id: 4,
      size: 18,
      top: '82%',
      left: '65%',
      stroke: 'rgba(251, 146, 60, 0.38)',
      animationClass: 'animate-drift-4',
      delay: '2.2s',
    },
    {
      id: 5,
      size: 48,
      top: '24%',
      left: '60%',
      stroke: 'rgba(110, 231, 183, 0.22)',
      animationClass: 'animate-drift-5',
      delay: '1.2s',
    },
    {
      id: 6,
      size: 28,
      top: '52%',
      left: '42%',
      stroke: 'rgba(251, 146, 60, 0.32)',
      animationClass: 'animate-drift-6',
      delay: '3s',
    },
  ]

  const items = reducedCount ? particles.slice(0, 3) : particles

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {items.map((p) => (
        <div
          key={p.id}
          className={`absolute ${p.animationClass}`}
          style={{
            top: p.top,
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: p.delay,
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 40 40" fill="none">
            <polygon
              points="20,2 35.58,11 35.58,29 20,38 4.42,29 4.42,11"
              stroke={p.stroke}
              strokeWidth="2"
              fill="none"
              strokeDasharray={p.id % 2 === 0 ? '4 3' : 'none'}
            />
          </svg>
        </div>
      ))}
    </div>
  )
}
