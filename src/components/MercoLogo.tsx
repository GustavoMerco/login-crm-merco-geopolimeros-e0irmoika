import React from 'react'

interface MercoLogoProps {
  className?: string
  size?: number
  showWordmark?: boolean
  lightTheme?: boolean
}

export const MercoLogo: React.FC<MercoLogoProps> = ({
  className = '',
  size = 40,
  showWordmark = true,
  lightTheme = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Molecular cluster mark with 3 interlocking hexagons and center orange bond */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="merco-hex-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <filter id="merco-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="1.5"
              floodColor="#F97316"
              floodOpacity="0.4"
            />
          </filter>
        </defs>

        {/* Central orange bond connecting the three molecular nodes */}
        <path
          d="M32 20 L22 38 M32 20 L42 38 M22 38 L42 38"
          stroke="#FB923C"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#merco-glow)"
        />

        {/* Central orange core atom */}
        <circle cx="32" cy="32" r="3.2" fill="#F97316" />

        {/* Top Hexagon */}
        <polygon
          points="32,7 41,12.2 41,22.6 32,27.8 23,22.6 23,12.2"
          fill="none"
          stroke="url(#merco-hex-grad)"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <circle cx="32" cy="17.4" r="1.8" fill="#34D399" />

        {/* Bottom Left Hexagon */}
        <polygon
          points="21,26 30,31.2 30,41.6 21,46.8 12,41.6 12,31.2"
          fill="none"
          stroke="url(#merco-hex-grad)"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <circle cx="21" cy="36.4" r="1.8" fill="#10B981" />

        {/* Bottom Right Hexagon */}
        <polygon
          points="43,26 52,31.2 52,41.6 43,46.8 34,41.6 34,31.2"
          fill="none"
          stroke="url(#merco-hex-grad)"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <circle cx="43" cy="36.4" r="1.8" fill="#10B981" />

        {/* Secondary node highlights */}
        <circle cx="32" cy="7" r="1.5" fill="#FB923C" />
        <circle cx="12" cy="41.6" r="1.5" fill="#34D399" />
        <circle cx="52" cy="41.6" r="1.5" fill="#34D399" />
      </svg>

      {showWordmark && (
        <div className="flex flex-col justify-center text-left">
          <span
            className={`font-extrabold tracking-tight text-xl leading-none ${
              lightTheme ? 'text-[#0F1F1C]' : 'text-white'
            }`}
          >
            Merco
          </span>
          <span
            className="text-[10px] font-bold tracking-[0.24em] uppercase text-[#FB923C] leading-tight mt-1"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            GEOPOLÍMEROS
          </span>
        </div>
      )}
    </div>
  )
}

export const HexagonSpinner: React.FC<{ size?: number; className?: string }> = ({
  size = 20,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`animate-spin-hex ${className}`}
      aria-hidden="true"
    >
      <polygon
        points="12,2 20.66,7 20.66,17 12,22 3.34,17 3.34,7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="40 15"
      />
    </svg>
  )
}
