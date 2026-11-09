import React, { useState } from 'react'
import { HexagonSpinner } from './MercoLogo'
import { Mail, CheckCircle, AlertCircle, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  initialEmail?: string
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
}) => {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  if (!isOpen) return null

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email.trim()) {
      setErrorMessage('Informe seu e-mail cadastrado.')
      return
    }

    if (!validateEmail(email)) {
      setErrorMessage('Informe um e-mail válido.')
      return
    }

    setLoading(true)
    try {
      await requestPasswordReset(email)
      setIsSuccess(true)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setErrorMessage(
        errorObj?.message ||
          'Não foi possível solicitar a redefinição de senha no momento. Tente novamente.',
      )
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setErrorMessage(null)
    setIsSuccess(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 bg-mg-sidebar/55 backdrop-blur-[4px] transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        className="relative w-full max-w-[440px] bg-mg-surface rounded-[20px] p-6 sm:p-8 shadow-[0_12px_40px_rgba(2,44,34,0.16)] border border-mg-line z-10 animate-assemble"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-5 right-5 p-1.5 text-mg-muted hover:text-mg-ink hover:bg-mg-canvas rounded-full transition-colors"
          aria-label="Fechar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="flex flex-col items-center text-center py-3">
            <div className="w-14 h-14 rounded-full bg-mg-brand-fill/15 text-mg-brand flex items-center justify-center mb-4 animate-check-in">
              <CheckCircle className="w-8 h-8" />
            </div>

            <h3
              id="modal-title"
              className="text-2xl font-extrabold text-mg-ink tracking-tight mb-2"
            >
              Link enviado!
            </h3>

            <p className="text-[14px] text-mg-muted leading-relaxed mb-6 max-w-sm">
              Se o e-mail informado estiver cadastrado, você receberá as instruções para redefinir
              sua senha em instantes.
            </p>

            <button
              type="button"
              onClick={handleClose}
              className="w-full h-[48px] rounded-[12px] bg-mg-brand-fill hover:bg-mg-brand-fill/90 text-white font-semibold text-[15px] hover:shadow-[0_4px_16px_rgba(23,103,122,0.3)] transition-all active:scale-[0.98]"
            >
              Fechar
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-6 text-left">
              <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-mg-warn mb-1.5 block">
                RECUPERAÇÃO DE ACESSO
              </span>
              <h3
                id="modal-title"
                className="text-2xl font-extrabold text-mg-ink tracking-tight mb-2"
              >
                Recuperar senha
              </h3>
              <p className="text-[14px] text-mg-muted leading-relaxed">
                Informe o e-mail cadastrado na sua conta e enviaremos um link para redefinir sua
                senha.
              </p>
            </div>

            {errorMessage && (
              <div
                className="mb-5 p-3 rounded-[10px] bg-mg-crit-bg border-l-4 border-mg-crit text-mg-crit text-[13px] flex items-center gap-2 animate-shake"
                role="alert"
                aria-live="polite"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="recovery-email"
                  className="block text-[13px] font-semibold text-mg-ink mb-1.5"
                >
                  E-mail cadastrado
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-mg-muted">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    id="recovery-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@mercogeo.com.br"
                    autoComplete="email"
                    disabled={loading}
                    className="w-full h-[48px] pl-11 pr-4 rounded-[12px] border border-mg-line bg-mg-surface text-[15px] text-mg-ink placeholder:text-mg-muted/60 focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15 transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row-reverse gap-2.5">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:flex-1 h-[48px] rounded-[12px] bg-mg-brand-fill hover:bg-mg-brand-fill/90 text-white font-semibold text-[15px] hover:shadow-[0_4px_16px_rgba(23,103,122,0.3)] hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-75 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <HexagonSpinner size={18} className="text-white" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    'Enviar link de redefinição'
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="w-full sm:w-auto px-5 h-[48px] rounded-[12px] bg-transparent text-mg-muted hover:text-mg-ink hover:bg-mg-canvas font-semibold text-[14px] transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
