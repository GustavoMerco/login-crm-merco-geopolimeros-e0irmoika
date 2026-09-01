import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MercoLogo, HexagonSpinner } from '@/components/MercoLogo'
import { HexagonalLattice, FloatingHexagons } from '@/components/HexagonalBackground'
import { ForgotPasswordModal } from '@/components/ForgotPasswordModal'
import { useAuth } from '@/contexts/AuthContext'
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertTriangle, Check } from 'lucide-react'

export const Index: React.FC = () => {
  const { user, login, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [shakeKey, setShakeKey] = useState(0)

  // Forgot password modal
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, authLoading, navigate])

  const validateEmailFormat = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (emailError) {
      if (e.target.value.trim() && validateEmailFormat(e.target.value)) {
        setEmailError(null)
      }
    }
    if (authError) {
      setAuthError(null)
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    if (authError) {
      setAuthError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)

    let hasValidationError = false

    if (!email.trim()) {
      setEmailError('Informe um e-mail válido.')
      hasValidationError = true
    } else if (!validateEmailFormat(email)) {
      setEmailError('Informe um e-mail válido.')
      hasValidationError = true
    } else {
      setEmailError(null)
    }

    if (!password) {
      hasValidationError = true
    }

    if (hasValidationError) {
      setShakeKey((prev) => prev + 1)
      if (!email.trim() || !validateEmailFormat(email)) {
        // already set
      } else if (!password) {
        setAuthError('E-mail ou senha inválidos. Verifique os dados e tente novamente.')
      }
      return
    }

    setIsSubmitting(true)

    try {
      await login(email, password, rememberMe)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setAuthError('E-mail ou senha inválidos. Verifique os dados e tente novamente.')
      setShakeKey((prev) => prev + 1)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-[#022C22] flex flex-col items-center justify-center text-white z-50">
        <MercoLogo size={56} showWordmark={true} className="animate-fade-in mb-6" />
        <div className="flex items-center gap-3 text-[#34D399] text-sm font-medium">
          <HexagonSpinner size={22} className="text-[#34D399]" />
          <span>Iniciando ambiente seguro...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F6F8F7] font-sans antialiased selection:bg-[#10B981]/25 selection:text-[#064E3B]">
      {/* ========================================================================= */}
      {/* BRANDING PANEL (LEFT): ~55% on desktop, compact on mobile */}
      {/* ========================================================================= */}
      <div className="relative w-full lg:w-[55%] min-h-[220px] lg:min-h-screen bg-gradient-to-b from-[#064E3B] to-[#022C22] overflow-hidden flex flex-col justify-between p-6 sm:p-10 lg:p-16 text-white select-none">
        {/* Animated Radial Glows */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 lg:w-[500px] lg:h-[500px] rounded-full bg-[#10B981]/25 blur-[90px] pointer-events-none animate-glow-drift"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 lg:w-[500px] lg:h-[500px] rounded-full bg-[#F97316]/18 blur-[90px] pointer-events-none animate-glow-drift"
          aria-hidden="true"
        />

        {/* SVG Hexagonal Lattice Pattern */}
        <HexagonalLattice />

        {/* Floating Ambient Particles (6 on desktop, 3 on tablet, hidden on mobile) */}
        <div className="hidden sm:block lg:block">
          <div className="hidden lg:block">
            <FloatingHexagons reducedCount={false} />
          </div>
          <div className="block lg:hidden">
            <FloatingHexagons reducedCount={true} />
          </div>
        </div>

        {/* Top Bar / Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="mx-auto sm:mx-0">
            <MercoLogo size={42} showWordmark={true} />
          </div>
        </div>

        {/* Centered Content Block (Desktop & Tablet) */}
        <div className="relative z-10 my-auto py-8 hidden sm:flex flex-col max-w-lg">
          {/* Overline */}
          <span
            className="text-[11px] font-bold tracking-[0.20em] uppercase text-[#FB923C] mb-3 inline-block"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            CRM MERCO GEOPOLÍMEROS
          </span>

          {/* Headline */}
          <h1 className="text-3xl lg:text-[40px] font-extrabold text-white tracking-tight leading-[1.18] mb-4">
            Construa relações <span className="text-[#34D399]">sólidas.</span>
          </h1>

          {/* Support Text */}
          <p className="text-[15px] lg:text-[16px] text-white/75 leading-relaxed mb-8 max-w-md">
            Acesse o CRM da Merco Geopolímeros e acompanhe clientes, propostas e projetos em um só
            lugar.
          </p>

          {/* Thin Divider with Center Orange Hexagon */}
          <div className="flex items-center gap-3 w-full max-w-xs" aria-hidden="true">
            <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-[#34D399]/30 to-transparent" />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <polygon
                points="12,2 21,7.2 21,17.6 12,22.8 3,17.6 3,7.2"
                fill="#FB923C"
                opacity="0.9"
              />
            </svg>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-[#34D399]/30 to-transparent" />
          </div>
        </div>

        {/* Mobile-Only Compact Headline */}
        <div className="relative z-10 sm:hidden text-center mt-2 mb-2">
          <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#FB923C] block mb-1">
            CRM MERCO GEOPOLÍMEROS
          </span>
          <h1 className="text-[22px] font-extrabold text-white leading-tight">
            Construa relações <span className="text-[#34D399]">sólidas.</span>
          </h1>
        </div>

        {/* Footer info (Desktop only) */}
        <div className="relative z-10 hidden lg:block">
          <p className="text-[12px] text-white/45 tracking-wide">
            © 2025 Merco Geopolímeros — Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FORM PANEL (RIGHT): ~45% on desktop, centered column */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center items-center px-6 sm:px-10 lg:px-16 py-10 sm:py-14 bg-[#F6F8F7]">
        <div className="w-full max-w-[400px] flex flex-col">
          {/* Header */}
          <div className="mb-7 animate-assemble" style={{ animationDelay: '0ms' }}>
            <span
              className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#EA580C] mb-2 block"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              ACESSO RESTRITO
            </span>
            <h2 className="text-[28px] font-extrabold text-[#0F1F1C] tracking-tight leading-tight mb-1.5">
              Bem-vindo de volta
            </h2>
            <p className="text-[14px] text-[#5B6B66] leading-normal">
              Acesse sua conta para continuar.
            </p>
          </div>

          {/* Error Alert Banner */}
          {authError && (
            <div
              key={`alert-${shakeKey}`}
              className="mb-6 p-3.5 rounded-[12px] bg-[#FEF2F2] border-l-4 border-[#DC2626] text-[#DC2626] text-[13px] font-medium flex items-start gap-2.5 animate-shake shadow-[0_2px_8px_rgba(220,38,38,0.08)]"
              role="alert"
              aria-live="assertive"
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#DC2626]" />
              <div className="leading-snug">{authError}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Field: E-mail */}
            <div
              className={`animate-assemble ${authError ? 'animate-shake' : ''}`}
              style={{ animationDelay: '80ms' }}
            >
              <label
                htmlFor="email-input"
                className="block text-[13px] font-semibold text-[#0F1F1C] mb-1.5"
              >
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5B6B66]">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="voce@mercogeo.com.br"
                  autoComplete="email"
                  disabled={isSubmitting}
                  aria-invalid={!!emailError || !!authError}
                  aria-describedby={emailError ? 'email-error-text' : undefined}
                  className={`w-full h-[48px] pl-11 pr-4 rounded-[12px] bg-white text-[15px] text-[#0F1F1C] placeholder:text-[#5B6B66]/60 transition-all duration-200 outline-none ${
                    emailError || authError
                      ? 'border border-[#DC2626] focus:border-[#DC2626] focus:ring-4 focus:ring-[#DC2626]/15'
                      : 'border border-[#E1E8E5] focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/18'
                  }`}
                />
              </div>
              {emailError && (
                <p
                  id="email-error-text"
                  className="mt-1.5 text-[12px] font-medium text-[#DC2626] flex items-center gap-1"
                  role="alert"
                  aria-live="polite"
                >
                  {emailError}
                </p>
              )}
            </div>

            {/* Field: Senha */}
            <div
              className={`animate-assemble ${authError ? 'animate-shake' : ''}`}
              style={{ animationDelay: '160ms' }}
            >
              <label
                htmlFor="password-input"
                className="block text-[13px] font-semibold text-[#0F1F1C] mb-1.5"
              >
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5B6B66]">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  aria-invalid={!!authError}
                  className={`w-full h-[48px] pl-11 pr-11 rounded-[12px] bg-white text-[15px] text-[#0F1F1C] placeholder:text-[#5B6B66]/60 transition-all duration-200 outline-none ${
                    authError
                      ? 'border border-[#DC2626] focus:border-[#DC2626] focus:ring-4 focus:ring-[#DC2626]/15'
                      : 'border border-[#E1E8E5] focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/18'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#5B6B66] hover:text-[#EA580C] transition-colors focus:outline-none"
                  tabIndex={0}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 transition-transform duration-150" />
                  ) : (
                    <Eye className="w-5 h-5 transition-transform duration-150" />
                  )}
                </button>
              </div>
            </div>

            {/* Controls Row: Lembrar de mim & Esqueceu sua senha? */}
            <div
              className="flex items-center justify-between pt-1 animate-assemble"
              style={{ animationDelay: '240ms' }}
            >
              <label className="inline-flex items-center gap-2.5 cursor-pointer select-none group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-[18px] h-[18px] rounded-[5px] border border-[#E1E8E5] bg-white peer-checked:bg-[#10B981] peer-checked:border-[#10B981] peer-focus-visible:ring-2 peer-focus-visible:ring-[#10B981] transition-all flex items-center justify-center shadow-xs">
                    {rememberMe && (
                      <Check className="w-3.5 h-3.5 text-white stroke-[3] animate-check-in" />
                    )}
                  </div>
                </div>
                <span className="text-[13px] font-medium text-[#0F1F1C] group-hover:text-[#064E3B] transition-colors">
                  Lembrar de mim
                </span>
              </label>

              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="text-[13px] font-semibold text-[#EA580C] hover:underline hover:text-[#C2410C] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C] rounded"
              >
                Esqueceu sua senha?
              </button>
            </div>

            {/* Submit Button */}
            <div className="pt-2 animate-assemble" style={{ animationDelay: '320ms' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full h-[50px] rounded-[12px] bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-semibold text-[15px] shadow-[0_4px_14px_rgba(16,185,129,0.25)] hover:shadow-[0_0_0_1px_rgba(249,115,22,0.35),0_10px_24px_rgba(16,185,129,0.35)] hover:-translate-y-[1px] active:scale-[0.98] transition-all duration-150 disabled:opacity-80 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2.5">
                    <HexagonSpinner size={20} className="text-white" />
                    <span>Entrando...</span>
                  </div>
                ) : (
                  <>
                    <span>Entrar</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer Note */}
          <div
            className="mt-8 pt-6 border-t border-[#E1E8E5]/70 text-center animate-assemble"
            style={{ animationDelay: '400ms' }}
          >
            <p className="text-[13px] text-[#5B6B66]">
              Problemas para acessar? Fale com o{' '}
              <span className="font-semibold text-[#EA580C]">administrador</span> do sistema.
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        initialEmail={email}
      />
    </div>
  )
}

export default Index
