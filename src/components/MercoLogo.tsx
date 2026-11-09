import React from 'react'

export interface MercoLogoProps {
  /** Altura do símbolo em px. O conjunto escala proporcionalmente a partir do viewBox. */
  size?: number
  className?: string
  showWordmark?: boolean
  /** false = fundo escuro (teal claro + texto branco). true = fundo claro (teal escuro original). */
  lightTheme?: boolean
}

/**
 * Cores oficiais da marca Merco Geopolímeros.
 * Teal escuro para fundos claros; teal claro para manter contraste sobre fundo escuro.
 */
export const MERCO_TEAL_DARK = '#17677A'
export const MERCO_TEAL_LIGHT = '#4FB3C9'
export const MERCO_ORANGE = '#F97316'
export const MERCO_ORANGE_LIGHT = '#FB923C'

/**
 * Símbolo vetorial da marca: duas formas angulares inclinadas formando um "M"
 * estilizado, com um triângulo laranja sólido apontando para baixo entre elas.
 * Desenhado à mão em viewBox 0 0 100 100 (proporções fiéis à arte original).
 */
export const MercoMark: React.FC<{
  size?: number
  className?: string
  lightTheme?: boolean
  title?: string
}> = ({ size = 40, className = '', lightTheme = false, title }) => {
  const teal = lightTheme ? MERCO_TEAL_DARK : MERCO_TEAL_LIGHT
  const orange = lightTheme ? MERCO_ORANGE : MERCO_ORANGE_LIGHT
  const gradientSuffix = lightTheme ? 'light' : 'dark'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`flex-shrink-0 ${className}`}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={`merco-mark-sheen-${gradientSuffix}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={teal} />
          <stop offset="100%" stopColor={teal} stopOpacity="0.82" />
        </linearGradient>
      </defs>

      {/* Vértice angular esquerdo (metade externa do "M") */}
      <path d="M4 92 L25 8 L38 8 L17 92 Z" fill={`url(#merco-mark-sheen-${gradientSuffix})`} />

      {/* Vértice angular direito (metade externa do "M") */}
      <path d="M96 92 L75 8 L62 8 L83 92 Z" fill={`url(#merco-mark-sheen-${gradientSuffix})`} />

      {/* Triângulo laranja sólido apontando para baixo, entre as duas formas */}
      <path d="M32 26 L68 26 L50 78 Z" fill={orange} />
    </svg>
  )
}

/**
 * Logo completa: símbolo angular + wordmark "MERCO" com "GEOPOLÍMEROS" espaçado
 * abaixo, reproduzindo a arte oficial em SVG (viewBox 0 0 360 92).
 */
export const MercoLogo: React.FC<MercoLogoProps> = ({
  size = 40,
  className = '',
  showWordmark = true,
  lightTheme = false,
}) => {
  const height = size
  const width = showWordmark ? Math.round(size * 3.9) : size
  const teal = lightTheme ? MERCO_TEAL_DARK : MERCO_TEAL_LIGHT
  const orange = lightTheme ? MERCO_ORANGE : MERCO_ORANGE_LIGHT
  const wordColor = lightTheme ? MERCO_TEAL_DARK : '#FFFFFF'
  const gradientSuffix = lightTheme ? 'light' : 'dark'

  return (
    <svg
      width={width}
      height={height}
      viewBox={showWordmark ? '0 0 360 92' : '0 0 100 100'}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
      role="img"
      aria-label="Merco Geopolímeros"
    >
      <defs>
        <linearGradient id={`merco-logo-sheen-${gradientSuffix}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={teal} />
          <stop offset="100%" stopColor={teal} stopOpacity="0.82" />
        </linearGradient>
      </defs>

      <g transform={showWordmark ? undefined : 'translate(0,0) scale(1)'}>
        {/* Símbolo: duas formas angulares + triângulo laranja */}
        <g transform={showWordmark ? 'translate(0,0) scale(0.92)' : undefined}>
          <path d="M4 92 L25 8 L38 8 L17 92 Z" fill={`url(#merco-logo-sheen-${gradientSuffix})`} />
          <path d="M96 92 L75 8 L62 8 L83 92 Z" fill={`url(#merco-logo-sheen-${gradientSuffix})`} />
          <path d="M32 26 L68 26 L50 78 Z" fill={orange} />
        </g>

        {showWordmark && (
          <g transform="translate(96 0)">
            {/* Wordmark "MERCO" — desenho vetorial próprio (bold condensado) */}
            <g fill={wordColor}>
              {/* M */}
              <path d="M0 66 V10 H13 L22 33 L31 10 H44 V66 H34 V27 L25 50 H19 L10 27 V66 Z" />
              {/* E */}
              <path d="M52 66 V10 H80 V19 H62 V32 H77 V41 H62 V57 H80 V66 Z" />
              {/* R */}
              <path d="M88 66 V10 H107 C116 10 121 15 121 24 C121 30 118 34 113 36 L122 66 H111 L104 39 H98 V66 Z M98 19 V31 H105 C109 31 111 29 111 25 C111 21 109 19 105 19 Z" />
              {/* C */}
              <path d="M155 67 C144 67 138 60 138 48 V28 C138 16 144 9 155 9 C165 9 171 15 172 25 H162 C161 20 159 18 155 18 C151 18 148 21 148 27 V49 C148 55 151 58 155 58 C159 58 161 56 162 51 H172 C171 61 165 67 155 67 Z" />
              {/* O */}
              <path d="M197 67 C186 67 180 60 180 48 V28 C180 16 186 9 197 9 C208 9 214 16 214 28 V48 C214 60 208 67 197 67 Z M197 58 C202 58 204 55 204 49 V27 C204 21 202 18 197 18 C192 18 190 21 190 27 V49 C190 55 192 58 197 58 Z" />
            </g>

            {/* "GEOPOLÍMEROS" — espaçado, menor, alinhado sob "MERCO" */}
            <text
              x="0"
              y="88"
              fill={wordColor}
              fontSize="16"
              fontWeight="600"
              letterSpacing="5.2"
              style={{ fontFamily: 'Manrope, Arial, sans-serif' }}
            >
              GEOPOLÍMEROS
            </text>

            {/* Acento laranja discreto abaixo do wordmark, remete ao triângulo */}
            <rect x="0" y="76" width="34" height="3" fill={orange} opacity="0.9" />
          </g>
        )}
      </g>
    </svg>
  )
}

/**
 * Spinner de carregamento em formato hexagonal (usado nos estados de loading).
 * Herda a cor do contexto via `currentColor`.
 */
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

export default MercoLogo
