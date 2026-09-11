import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { checkPermission } from '@/services/security'
import {
  createOpportunity,
  evaluateOpportunityAptitude,
  getOpportunities,
  type CreateOpportunityInput,
  type AptitudeResult,
  type OpportunityRecord,
} from '@/services/opportunities'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { hasPermission, ROLE_LABELS } from '@/lib/auth/permissions'
import { MercoLogo } from '@/components/MercoLogo'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPlus,
  LockKeyhole,
  LogOut,
  MapPin,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react'

type ServerPermissionState = 'loading' | 'allowed' | 'denied' | 'unavailable'

type OpportunityForm = CreateOpportunityInput

const emptyOpportunity: OpportunityForm = {
  customer_name: '',
  contact_name: '',
  contact_email: '',
  origin: '',
  service_family: '',
  location: '',
  demand_date: '',
  deadline_date: '',
}

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [serverPermission, setServerPermission] = useState<ServerPermissionState>('loading')
  const [opportunity, setOpportunity] = useState<OpportunityForm>(emptyOpportunity)
  const [isSubmittingOpportunity, setIsSubmittingOpportunity] = useState(false)
  const [opportunityError, setOpportunityError] = useState<string | null>(null)
  const [createdOpportunity, setCreatedOpportunity] = useState<{
    id: string
    receivedAt: string
    status: string
  } | null>(null)
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null)
  const [opportunitiesError, setOpportunitiesError] = useState<string | null>(null)
  const [isLoadingOpportunities, setIsLoadingOpportunities] = useState(true)
  const [aptitudeResult, setAptitudeResult] = useState<AptitudeResult | null>(null)
  const [aptitudeError, setAptitudeError] = useState<string | null>(null)
  const [exceptionJustification, setExceptionJustification] = useState('')
  const [isEvaluatingAptitude, setIsEvaluatingAptitude] = useState(false)

  useEffect(() => {
    let active = true

    const loadPermission = async () => {
      try {
        const result = await checkPermission('homologateCatalog')
        if (active) setServerPermission(result.allowed ? 'allowed' : 'denied')
      } catch {
        if (active) setServerPermission('unavailable')
      }
    }

    void loadPermission()
    return () => {
      active = false
    }
  }, [])

  const loadOpportunities = async () => {
    setIsLoadingOpportunities(true)
    try {
      const result = await getOpportunities()
      setOpportunities(result.items)
      setOpportunitiesError(null)
    } catch (error: unknown) {
      setOpportunitiesError(getErrorMessage(error))
    } finally {
      setIsLoadingOpportunities(false)
    }
  }

  useEffect(() => {
    void loadOpportunities()
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  const handleOpportunityChange = (field: keyof OpportunityForm, value: string) => {
    setOpportunity((current) => ({ ...current, [field]: value }))
    setOpportunityError(null)
    setCreatedOpportunity(null)
    setAptitudeResult(null)
    setAptitudeError(null)
  }

  const handleOpportunitySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setOpportunityError(null)
    setCreatedOpportunity(null)
    setAptitudeResult(null)
    setAptitudeError(null)
    setIsSubmittingOpportunity(true)

    try {
      const result = await createOpportunity({
        customer_name: opportunity.customer_name.trim(),
        contact_name: opportunity.contact_name.trim(),
        contact_email: opportunity.contact_email?.trim() || undefined,
        origin: opportunity.origin.trim(),
        service_family: opportunity.service_family.trim(),
        location: opportunity.location.trim(),
        demand_date: opportunity.demand_date,
        deadline_date: opportunity.deadline_date || undefined,
      })
      setCreatedOpportunity(result)
      setOpportunity(emptyOpportunity)
      await loadOpportunities()
    } catch (error: unknown) {
      setOpportunityError(getErrorMessage(error))
    } finally {
      setIsSubmittingOpportunity(false)
    }
  }

  const handleAptitudeEvaluation = async (allowException = false) => {
    const targetId = selectedOpportunityId || createdOpportunity?.id
    if (!targetId) return

    setAptitudeError(null)
    setIsEvaluatingAptitude(true)
    try {
      const result = await evaluateOpportunityAptitude(targetId, {
        allowException,
        exceptionJustification: allowException ? exceptionJustification : undefined,
      })
      setAptitudeResult(result)
      setOpportunities((current) =>
        current.map((item) =>
          item.id === targetId
            ? {
                ...item,
                status: result.status,
                aptitude_status: result.aptitudeStatus,
                checklist: result.checklist,
                pending_items: result.pendingItems,
                aptitude_evaluated_at: result.evaluatedAt,
              }
            : item,
        ),
      )
      if (result.aptitudeStatus !== 'exception_approved') {
        setExceptionJustification('')
      }
    } catch (error: unknown) {
      setAptitudeError(getErrorMessage(error))
    } finally {
      setIsEvaluatingAptitude(false)
    }
  }

  const rawName = user?.name || user?.email?.split('@')[0] || 'Usuário'
  const firstName = rawName.split(' ')[0]
  const initial = (firstName[0] || 'U').toUpperCase()
  const role = user?.role
  const localPermission = hasPermission(role, 'homologateCatalog')
  const canHomologateCatalog = serverPermission === 'allowed' && localPermission
  const permissionMessage =
    serverPermission === 'loading'
      ? 'Verificando a permissão no servidor...'
      : serverPermission === 'unavailable'
        ? 'Não foi possível verificar a permissão no servidor. Acesso bloqueado por segurança.'
        : canHomologateCatalog
          ? 'Seu papel permite homologar o catálogo.'
          : 'Acesso negado: somente Engenharia ou Administrador podem homologar.'

  return (
    <div className="min-h-screen w-full bg-[#F6F8F7] flex flex-col font-sans antialiased text-[#0F1F1C]">
      <header className="w-full h-16 bg-white border-b border-[#E1E8E5] px-4 sm:px-8 flex items-center justify-between shadow-xs sticky top-0 z-20">
        <div className="flex items-center">
          <MercoLogo size={36} showWordmark={true} lightTheme={true} />
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#10B981] text-white flex items-center justify-center font-bold text-sm shadow-xs select-none">
              {initial}
            </div>
            <span className="hidden sm:inline-block text-[14px] font-semibold text-[#0F1F1C]">
              Olá, {firstName}
            </span>
          </div>

          <div className="h-5 w-[1px] bg-[#E1E8E5] hidden sm:block" />

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-semibold text-[#EA580C] hover:bg-[#EA580C]/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 lg:p-10">
        <div className="mx-auto w-full max-w-5xl grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <section className="bg-white rounded-[16px] p-6 sm:p-8 border border-[#E1E8E5] shadow-[0_12px_40px_rgba(2,44,34,0.06)]">
            <div className="w-16 h-16 mb-5 rounded-2xl bg-gradient-to-b from-[#064E3B] to-[#022C22] p-3 flex items-center justify-center shadow-[0_8px_20px_rgba(2,44,34,0.18)]">
              <MercoLogo size={40} showWordmark={false} />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981]/12 text-[#047857] text-[12px] font-bold uppercase tracking-wider mb-4">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              <span>Acesso Autorizado</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F1F1C] tracking-tight mb-3">
              Olá, {user?.name || firstName}!
            </h1>

            <p className="text-[16px] font-semibold text-[#10B981] mb-4">
              Seu acesso foi validado com sucesso.
            </p>

            <p className="text-[14px] sm:text-[15px] text-[#5B6B66] leading-relaxed mb-6 max-w-md">
              Registre uma nova demanda técnico-comercial. O recebimento e o responsável serão
              definidos pelo servidor para manter a rastreabilidade.
            </p>

            <div className="bg-[#F6F8F7] rounded-[12px] p-4 border border-[#E1E8E5] mb-4 text-left flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-white border border-[#E1E8E5] flex items-center justify-center text-[#5B6B66] shrink-0">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-[#0F1F1C] truncate">
                    {user?.name || 'Usuário'}
                  </p>
                  <p className="text-[12px] text-[#5B6B66] truncate">{user?.email}</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#10B981] bg-[#10B981]/10 px-2.5 py-1 rounded-full shrink-0">
                {role ? ROLE_LABELS[role] : 'Papel não definido'}
              </span>
            </div>

            <div
              className={`rounded-[12px] p-4 border text-left ${
                canHomologateCatalog
                  ? 'border-[#A7F3D0] bg-[#ECFDF5]'
                  : 'border-[#FED7AA] bg-[#FFF7ED]'
              }`}
            >
              <div className="flex items-start gap-3">
                {canHomologateCatalog ? (
                  <ShieldCheck className="w-5 h-5 text-[#059669] mt-0.5 shrink-0" />
                ) : (
                  <LockKeyhole className="w-5 h-5 text-[#EA580C] mt-0.5 shrink-0" />
                )}
                <div>
                  <p className="text-[14px] font-bold text-[#0F1F1C]">Homologação de catálogo</p>
                  <p className="text-[13px] text-[#5B6B66] mt-1">{permissionMessage}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-[16px] p-6 sm:p-8 border border-[#E1E8E5] shadow-[0_12px_40px_rgba(2,44,34,0.06)]">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-11 h-11 rounded-[12px] bg-[#ECFDF5] text-[#047857] flex items-center justify-center shrink-0">
                <ClipboardPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[#0F1F1C]">Nova demanda</h2>
                <p className="text-[13px] text-[#5B6B66] mt-1">
                  Campos com * são necessários para registrar o recebimento.
                </p>
              </div>
            </div>

            {opportunityError && (
              <div
                className="mb-5 p-3.5 rounded-[12px] bg-[#FEF2F2] border-l-4 border-[#DC2626] text-[#B91C1C] text-[13px] font-medium flex items-start gap-2.5"
                role="alert"
                aria-live="assertive"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{opportunityError}</span>
              </div>
            )}

            {createdOpportunity && (
              <div
                className="mb-5 p-3.5 rounded-[12px] bg-[#ECFDF5] border-l-4 border-[#10B981] text-[#047857] text-[13px] font-medium flex items-start gap-2.5"
                role="status"
                aria-live="polite"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p>Demanda registrada com recebimento verificável.</p>
                  <p className="font-normal mt-1">Status: recebida · ID: {createdOpportunity.id}</p>
                </div>
              </div>
            )}

            {createdOpportunity && (
              <div className="mb-5 rounded-[12px] border border-[#D1FAE5] bg-[#F0FDF4] p-4 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[14px] font-bold text-[#0F1F1C]">Checklist de aptidão</h3>
                    <p className="text-[12px] text-[#5B6B66] mt-1">
                      A avaliação é feita pelo servidor e não escolhe a solução técnica.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleAptitudeEvaluation()}
                    disabled={isEvaluatingAptitude}
                    className="h-[38px] px-3 rounded-[9px] bg-[#064E3B] text-white text-[12px] font-semibold disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {isEvaluatingAptitude ? 'Avaliando...' : 'Avaliar aptidão'}
                  </button>
                </div>

                {aptitudeError && (
                  <div
                    className="mt-3 rounded-[9px] bg-[#FEF2F2] border-l-4 border-[#DC2626] p-3 text-[12px] text-[#B91C1C]"
                    role="alert"
                  >
                    {aptitudeError}
                  </div>
                )}

                {aptitudeResult && (
                  <div className="mt-3 space-y-3">
                    <div
                      className={`rounded-[9px] p-3 text-[13px] font-semibold ${
                        aptitudeResult.aptitudeStatus === 'blocked'
                          ? 'bg-[#FFF7ED] text-[#C2410C]'
                          : 'bg-[#ECFDF5] text-[#047857]'
                      }`}
                    >
                      Estado:{' '}
                      {aptitudeResult.aptitudeStatus === 'blocked'
                        ? 'bloqueada'
                        : aptitudeResult.aptitudeStatus === 'apt'
                          ? 'apta'
                          : 'exceção autorizada'}
                    </div>

                    <div className="text-[12px] text-[#5B6B66]">
                      <p className="font-semibold text-[#0F1F1C]">Checklist</p>
                      <ul className="mt-1 space-y-0.5">
                        {Object.entries(aptitudeResult.checklist).map(([field, complete]) => (
                          <li
                            key={field}
                            className={complete ? 'text-[#047857]' : 'text-[#C2410C]'}
                          >
                            {complete ? '✓' : '•'} {field}: {complete ? 'preenchido' : 'pendente'}
                          </li>
                        ))}
                      </ul>
                      {aptitudeResult.pendingItems.length > 0 ? (
                        <div className="mt-2">
                          <p className="font-semibold text-[#C2410C]">Pendências</p>
                          <ul className="list-disc pl-5 mt-1 space-y-0.5">
                            {aptitudeResult.pendingItems.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="mt-2 text-[#047857]">Nenhuma pendência encontrada.</p>
                      )}
                    </div>

                    {aptitudeResult.aptitudeStatus === 'blocked' &&
                      (role === 'engenharia' || role === 'admin') && (
                        <div className="space-y-2 pt-2 border-t border-[#D1FAE5]">
                          <label className="block text-[12px] font-semibold text-[#0F1F1C]">
                            Justificativa da exceção
                            <textarea
                              minLength={10}
                              maxLength={1000}
                              value={exceptionJustification}
                              onChange={(event) => setExceptionJustification(event.target.value)}
                              className="mt-1.5 w-full min-h-[76px] rounded-[9px] border border-[#E1E8E5] bg-white p-2.5 text-[12px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                              placeholder="Explique por que a oportunidade pode avançar apesar das pendências."
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => void handleAptitudeEvaluation(true)}
                            disabled={
                              isEvaluatingAptitude || exceptionJustification.trim().length < 10
                            }
                            className="h-[36px] px-3 rounded-[9px] bg-[#EA580C] text-white text-[12px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                          >
                            Autorizar exceção e liberar
                          </button>
                        </div>
                      )}
                  </div>
                )}
              </div>
            )}

            <div className="mb-5 rounded-[12px] border border-[#E1E8E5] bg-[#F6F8F7] p-4 text-left">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-[14px] font-bold text-[#0F1F1C]">Demandas criadas</h3>
                  <p className="text-[12px] text-[#5B6B66] mt-1">
                    Registros vinculados ao seu usuário.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadOpportunities()}
                  className="text-[12px] font-semibold text-[#047857] hover:underline"
                >
                  Atualizar
                </button>
              </div>
              {opportunitiesError && (
                <p className="text-[12px] text-[#B91C1C] mb-2" role="alert">
                  {opportunitiesError}
                </p>
              )}
              {isLoadingOpportunities ? (
                <p className="text-[12px] text-[#5B6B66]">Carregando demandas...</p>
              ) : opportunities.length === 0 ? (
                <p className="text-[12px] text-[#5B6B66]">
                  Nenhuma demanda encontrada para este usuário.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {opportunities.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        setSelectedOpportunityId(item.id)
                        setCreatedOpportunity({
                          id: item.id,
                          receivedAt: item.received_at,
                          status: item.status,
                        })
                        setAptitudeResult(
                          item.aptitude_status
                            ? {
                                id: item.id,
                                aptitudeStatus: item.aptitude_status,
                                status: item.status === 'blocked' ? 'blocked' : 'apt',
                                checklist: item.checklist || {},
                                pendingItems: item.pending_items || [],
                                evaluatedAt: item.aptitude_evaluated_at || '',
                              }
                            : null,
                        )
                        setAptitudeError(null)
                      }}
                      className={`w-full rounded-[9px] border p-3 text-left transition-colors ${
                        selectedOpportunityId === item.id
                          ? 'border-[#10B981] bg-[#ECFDF5]'
                          : 'border-[#E1E8E5] bg-white hover:border-[#A7F3D0]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-[#0F1F1C] truncate">
                          {item.customer_name}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-[#047857]">
                          {item.aptitude_status || item.status}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-x-3 gap-y-1 text-[11px] text-[#5B6B66] sm:grid-cols-2">
                        <span>Contato: {item.contact_name}</span>
                        <span>Origem: {item.origin}</span>
                        <span>Família: {item.service_family}</span>
                        <span>Local: {item.location}</span>
                        <span>Demanda: {item.demand_date}</span>
                        <span>Recebida: {item.received_at}</span>
                        {item.deadline_date && <span>Prazo: {item.deadline_date}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleOpportunitySubmit} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                  Cliente *
                  <input
                    required
                    maxLength={200}
                    value={opportunity.customer_name}
                    onChange={(event) =>
                      handleOpportunityChange('customer_name', event.target.value)
                    }
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                    placeholder="Nome da empresa ou cliente"
                  />
                </label>
                <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                  Contato *
                  <input
                    required
                    maxLength={200}
                    value={opportunity.contact_name}
                    onChange={(event) =>
                      handleOpportunityChange('contact_name', event.target.value)
                    }
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                    placeholder="Nome do contato"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                  E-mail do contato
                  <input
                    type="email"
                    maxLength={200}
                    value={opportunity.contact_email}
                    onChange={(event) =>
                      handleOpportunityChange('contact_email', event.target.value)
                    }
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                    placeholder="contato@empresa.com"
                  />
                </label>
                <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                  Origem da demanda *
                  <input
                    required
                    maxLength={120}
                    value={opportunity.origin}
                    onChange={(event) => handleOpportunityChange('origin', event.target.value)}
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                    placeholder="Indicação, portal, recorrência..."
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                  Família de serviço *
                  <input
                    required
                    maxLength={120}
                    value={opportunity.service_family}
                    onChange={(event) =>
                      handleOpportunityChange('service_family', event.target.value)
                    }
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                    placeholder="Informe, sem presumir o piloto"
                  />
                </label>
                <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                  Local do serviço *
                  <span className="relative block">
                    <MapPin
                      className="absolute left-3 top-3 w-4 h-4 text-[#5B6B66]"
                      aria-hidden="true"
                    />
                    <input
                      required
                      maxLength={300}
                      value={opportunity.location}
                      onChange={(event) => handleOpportunityChange('location', event.target.value)}
                      className="mt-1.5 w-full h-[44px] pl-9 pr-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                      placeholder="Cidade, obra ou endereço"
                    />
                  </span>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                  Data da demanda *
                  <input
                    required
                    type="date"
                    value={opportunity.demand_date}
                    onChange={(event) => handleOpportunityChange('demand_date', event.target.value)}
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                  />
                </label>
                <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                  Prazo informado
                  <input
                    type="date"
                    value={opportunity.deadline_date}
                    onChange={(event) =>
                      handleOpportunityChange('deadline_date', event.target.value)
                    }
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                  />
                </label>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-[12px] text-[#5B6B66]">
                  O recebimento será marcado pelo servidor no instante do cadastro.
                </p>
                <button
                  type="submit"
                  disabled={isSubmittingOpportunity}
                  className="h-[46px] px-5 rounded-[10px] bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-semibold text-[14px] hover:shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition-all disabled:opacity-70 disabled:pointer-events-none inline-flex items-center justify-center gap-2 shrink-0"
                >
                  <ClipboardPlus className="w-4 h-4" />
                  {isSubmittingOpportunity ? 'Registrando...' : 'Registrar demanda'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
