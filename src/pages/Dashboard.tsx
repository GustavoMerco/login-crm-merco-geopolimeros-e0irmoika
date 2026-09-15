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
import {
  createTechSheet,
  getTechSheets,
  techSheetFileUrl,
  type TechSheetParameter,
  type TechSheetRecord,
} from '@/services/techSheets'
import {
  getOpportunityEvents,
  getTimeEntries,
  recordMilestone,
  startTimeEntry,
  stopTimeEntry,
  type OpportunityEventRecord,
  type ActiveTimeEntryRecord,
} from '@/services/tracking'
import { freezeBaseline, getBaselines, type BaselineSnapshotRecord } from '@/services/baselines'
import {
  createCatalogItem,
  deactivateCatalogItem,
  getCatalogItems,
  homologateCatalogItem,
  type CatalogItemRecord,
} from '@/services/catalog'
import {
  createPilotParam,
  getPilotParams,
  getPilotParamsStatus,
  homologatePilotParam,
  type ParamStatusResponse,
  type PilotParamRecord,
} from '@/services/pilotParams'
import {
  createGate,
  escalateGate,
  getGates,
  getGatesStatus,
  resolveGate,
  type GateRecord,
  type GateStatusResponse,
} from '@/services/gates'
import {
  createSourceAudit,
  getSourceAuditMatrix,
  updateSourceDecision,
  type SourceAuditMatrixItem,
} from '@/services/sourceAudits'
import {
  exportBackup,
  getBackupReceipts,
  restoreCheck,
  verifyBackup,
  type BackupReceiptItem,
} from '@/services/backup'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { hasPermission, ROLE_LABELS } from '@/lib/auth/permissions'
import { MercoLogo } from '@/components/MercoLogo'
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ClipboardPlus,
  DatabaseZap,
  FileText,
  HardDriveDownload,
  LockKeyhole,
  LogOut,
  MapPin,
  OctagonAlert,
  Scale,
  ShieldCheck,
  Snowflake,
  Timer,
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
  const [techSheetForm, setTechSheetForm] = useState<TechSheetParameter[]>([
    { name: '', value: '', unit: '', origin: '' },
  ])
  const [techSheetPending, setTechSheetPending] = useState('')
  const [techSheetNotes, setTechSheetNotes] = useState('')
  const [techSheetFiles, setTechSheetFiles] = useState<File[]>([])
  const [techSheetHistory, setTechSheetHistory] = useState<TechSheetRecord[]>([])
  const [techSheetError, setTechSheetError] = useState<string | null>(null)
  const [techSheetCreated, setTechSheetCreated] = useState<{ version: number } | null>(null)
  const [isSubmittingTechSheet, setIsSubmittingTechSheet] = useState(false)
  const [isLoadingTechSheets, setIsLoadingTechSheets] = useState(false)
  const [events, setEvents] = useState<OpportunityEventRecord[]>([])
  const [timeEntries, setTimeEntries] = useState<ActiveTimeEntryRecord[]>([])
  const [openTimeEntry, setOpenTimeEntry] = useState<ActiveTimeEntryRecord | null>(null)
  const [timeStage, setTimeStage] = useState('qualificacao')
  const [pauseReason, setPauseReason] = useState('')
  const [trackingError, setTrackingError] = useState<string | null>(null)
  const [trackingInfo, setTrackingInfo] = useState<string | null>(null)
  const [isSubmittingTracking, setIsSubmittingTracking] = useState(false)
  const [baselines, setBaselines] = useState<BaselineSnapshotRecord[]>([])
  const [baselineForm, setBaselineForm] = useState({
    service_family: '',
    complexity_class: '',
    window_start: '',
    window_end: '',
    calendar: 'dias úteis, 8h/dia',
    reliability_criteria: '',
    freeze_reason: '',
  })
  const [baselineError, setBaselineError] = useState<string | null>(null)
  const [baselineInfo, setBaselineInfo] = useState<string | null>(null)
  const [isSubmittingBaseline, setIsSubmittingBaseline] = useState(false)
  const [isLoadingBaselines, setIsLoadingBaselines] = useState(true)
  const [catalogItems, setCatalogItems] = useState<CatalogItemRecord[]>([])
  const [catalogForm, setCatalogForm] = useState({
    family: '',
    item_type: 'servico' as 'servico' | 'composicao' | 'recurso',
    name: '',
    description: '',
    unit: '',
    coefficient: '',
    source: '',
    valid_from: '',
    valid_until: '',
  })
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [catalogInfo, setCatalogInfo] = useState<string | null>(null)
  const [isSubmittingCatalog, setIsSubmittingCatalog] = useState(false)
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true)
  const [deactivateTarget, setDeactivateTarget] = useState<string | null>(null)
  const [deactivateReason, setDeactivateReason] = useState('')
  const [pilotParams, setPilotParams] = useState<PilotParamRecord[]>([])
  const [paramStatus, setParamStatus] = useState<ParamStatusResponse | null>(null)
  const [paramForm, setParamForm] = useState({
    param_type: 'bdi' as 'bdi' | 'iss' | 'margem' | 'sla' | 'alcada' | 'arredondamento',
    family: '',
    value: '',
    unit: '',
    source: '',
    decision: 'rascunho' as 'rascunho' | 'bloqueado',
    blocked_reason: '',
    blocked_owner: '',
    blocked_deadline: '',
    notes: '',
  })
  const [paramError, setParamError] = useState<string | null>(null)
  const [paramInfo, setParamInfo] = useState<string | null>(null)
  const [isSubmittingParam, setIsSubmittingParam] = useState(false)
  const [isLoadingParams, setIsLoadingParams] = useState(true)
  const [homologateParamTarget, setHomologateParamTarget] = useState<string | null>(null)
  const [homologateParamValue, setHomologateParamValue] = useState('')
  const [homologateParamUnit, setHomologateParamUnit] = useState('')
  const [gates, setGates] = useState<GateRecord[]>([])
  const [gateStatus, setGateStatus] = useState<GateStatusResponse | null>(null)
  const [gateForm, setGateForm] = useState({
    title: '',
    description: '',
    owner: '',
    decision_deadline: '',
  })
  const [gateError, setGateError] = useState<string | null>(null)
  const [gateInfo, setGateInfo] = useState<string | null>(null)
  const [isSubmittingGate, setIsSubmittingGate] = useState(false)
  const [isLoadingGates, setIsLoadingGates] = useState(true)
  const [escalateTarget, setEscalateTarget] = useState<string | null>(null)
  const [escalateName, setEscalateName] = useState('')
  const [escalateNote, setEscalateNote] = useState('')
  const [resolveTarget, setResolveTarget] = useState<string | null>(null)
  const [resolveText, setResolveText] = useState('')
  const [sourceMatrix, setSourceMatrix] = useState<SourceAuditMatrixItem[]>([])
  const [sourceForm, setSourceForm] = useState({
    system: 'vobi' as 'vobi' | 'omie',
    coverage: '',
    source_of_truth: '',
    access_method: 'manual' as 'manual' | 'exportacao' | 'api',
    fields_available: '',
    gaps: '',
    decision: 'importar' as 'integrar' | 'importar' | 'nao_usar',
    decision_reason: '',
    decision_owner: '',
    decision_date: '',
  })
  const [sourceError, setSourceError] = useState<string | null>(null)
  const [sourceInfo, setSourceInfo] = useState<string | null>(null)
  const [isSubmittingSource, setIsSubmittingSource] = useState(false)
  const [isLoadingSource, setIsLoadingSource] = useState(true)
  const [sourceDecideTarget, setSourceDecideTarget] = useState<string | null>(null)
  const [sourceDecideForm, setSourceDecideForm] = useState({
    decision: 'importar' as 'integrar' | 'importar' | 'nao_usar',
    decision_reason: '',
    decision_owner: '',
    decision_date: '',
  })
  const [backupReceipts, setBackupReceipts] = useState<BackupReceiptItem[]>([])
  const [backupHash, setBackupHash] = useState<string | null>(null)
  const [backupCounts, setBackupCounts] = useState<Record<string, number> | null>(null)
  const [backupInputHash, setBackupInputHash] = useState('')
  const [backupError, setBackupError] = useState<string | null>(null)
  const [backupInfo, setBackupInfo] = useState<string | null>(null)
  const [isSubmittingBackup, setIsSubmittingBackup] = useState(false)
  const [isLoadingBackup, setIsLoadingBackup] = useState(true)

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

  const loadTechSheets = async (targetId: string) => {
    setIsLoadingTechSheets(true)
    try {
      const result = await getTechSheets(targetId)
      setTechSheetHistory(result.items)
      setTechSheetError(null)
    } catch (error: unknown) {
      setTechSheetHistory([])
      setTechSheetError(getErrorMessage(error))
    } finally {
      setIsLoadingTechSheets(false)
    }
  }

  const handleTechSheetParameterChange = (
    index: number,
    field: keyof TechSheetParameter,
    value: string,
  ) => {
    setTechSheetForm((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    )
    setTechSheetError(null)
    setTechSheetCreated(null)
  }

  const handleTechSheetAddParameter = () => {
    setTechSheetForm((current) => [...current, { name: '', value: '', unit: '', origin: '' }])
  }

  const handleTechSheetRemoveParameter = (index: number) => {
    setTechSheetForm((current) =>
      current.length <= 1
        ? [{ name: '', value: '', unit: '', origin: '' }]
        : current.filter((_, itemIndex) => itemIndex !== index),
    )
  }

  const handleTechSheetSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const targetId = selectedOpportunityId || createdOpportunity?.id
    if (!targetId) return

    setTechSheetError(null)
    setTechSheetCreated(null)
    setIsSubmittingTechSheet(true)

    try {
      const result = await createTechSheet({
        opportunity_id: targetId,
        parameters: techSheetForm.map((item) => ({
          name: item.name.trim(),
          value: item.value.trim(),
          unit: item.unit.trim(),
          origin: item.origin.trim(),
        })),
        pending_items:
          techSheetPending.trim().length > 0
            ? techSheetPending
                .split('\n')
                .map((item) => item.trim())
                .filter((item) => item.length > 0)
            : undefined,
        notes: techSheetNotes.trim() || undefined,
        attachments: techSheetFiles.length > 0 ? techSheetFiles : undefined,
      })
      setTechSheetCreated({ version: result.version })
      setTechSheetForm([{ name: '', value: '', unit: '', origin: '' }])
      setTechSheetPending('')
      setTechSheetNotes('')
      setTechSheetFiles([])
      await loadTechSheets(targetId)
    } catch (error: unknown) {
      setTechSheetError(getErrorMessage(error))
    } finally {
      setIsSubmittingTechSheet(false)
    }
  }

  const loadTracking = async (targetId: string) => {
    setIsSubmittingTracking(false)
    try {
      const [eventsResult, entriesResult] = await Promise.all([
        getOpportunityEvents(targetId),
        getTimeEntries(targetId),
      ])
      setEvents(eventsResult)
      setTimeEntries(entriesResult)
      const open = entriesResult.find((entry) => !entry.ended_at) || null
      setOpenTimeEntry(open)
      setTrackingError(null)
    } catch (error: unknown) {
      setEvents([])
      setTimeEntries([])
      setOpenTimeEntry(null)
      setTrackingError(getErrorMessage(error))
    }
  }

  const handleRecordMilestone = async (milestone: 'ready' | 'sent') => {
    const targetId = selectedOpportunityId || createdOpportunity?.id
    if (!targetId) return

    setTrackingError(null)
    setTrackingInfo(null)
    setIsSubmittingTracking(true)
    try {
      const result = await recordMilestone(targetId, milestone)
      setTrackingInfo(
        `Marco "${milestone === 'ready' ? 'pronta' : 'enviada'}" registrado às ${result.occurredAt}.`,
      )
      await loadTracking(targetId)
    } catch (error: unknown) {
      setTrackingError(getErrorMessage(error))
    } finally {
      setIsSubmittingTracking(false)
    }
  }

  const handleStartStopTime = async () => {
    const targetId = selectedOpportunityId || createdOpportunity?.id
    if (!targetId) return

    setTrackingError(null)
    setTrackingInfo(null)
    setIsSubmittingTracking(true)
    try {
      if (openTimeEntry) {
        if (pauseReason.trim().length < 3) {
          setTrackingError('A justificativa da pausa é obrigatória para encerrar o tempo.')
          return
        }
        const result = await stopTimeEntry(openTimeEntry.id, pauseReason.trim())
        setTrackingInfo(`Tempo encerrado às ${result.endedAt}.`)
        setPauseReason('')
      } else {
        const result = await startTimeEntry(targetId, timeStage)
        setTrackingInfo(`Tempo iniciado às ${result.startedAt} (etapa: ${result.stage}).`)
      }
      await loadTracking(targetId)
    } catch (error: unknown) {
      setTrackingError(getErrorMessage(error))
    } finally {
      setIsSubmittingTracking(false)
    }
  }

  const loadBaselines = async () => {
    setIsLoadingBaselines(true)
    try {
      setBaselines(await getBaselines())
      setBaselineError(null)
    } catch (error: unknown) {
      setBaselineError(getErrorMessage(error))
    } finally {
      setIsLoadingBaselines(false)
    }
  }

  useEffect(() => {
    void loadBaselines()
  }, [])

  const handleBaselineChange = (field: keyof typeof baselineForm, value: string) => {
    setBaselineForm((current) => ({ ...current, [field]: value }))
    setBaselineError(null)
    setBaselineInfo(null)
  }

  const handleBaselineFreeze = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBaselineError(null)
    setBaselineInfo(null)
    setIsSubmittingBaseline(true)
    try {
      const result = await freezeBaseline({
        service_family: baselineForm.service_family.trim(),
        complexity_class: baselineForm.complexity_class.trim(),
        window_start: baselineForm.window_start,
        window_end: baselineForm.window_end,
        calendar: baselineForm.calendar.trim(),
        reliability_criteria: baselineForm.reliability_criteria.trim(),
        freeze_reason: baselineForm.freeze_reason.trim(),
      })
      setBaselineInfo(
        result.alreadyFrozen
          ? 'Esta janela já possui um baseline congelado — o snapshot existente foi mantido.'
          : `Baseline congelado às ${result.frozenAt} com ${result.volume} demanda(s) na janela.`,
      )
      await loadBaselines()
    } catch (error: unknown) {
      setBaselineError(getErrorMessage(error))
    } finally {
      setIsSubmittingBaseline(false)
    }
  }

  const loadCatalog = async () => {
    setIsLoadingCatalog(true)
    try {
      setCatalogItems(await getCatalogItems())
      setCatalogError(null)
    } catch (error: unknown) {
      setCatalogError(getErrorMessage(error))
    } finally {
      setIsLoadingCatalog(false)
    }
  }

  useEffect(() => {
    void loadCatalog()
  }, [])

  const handleCatalogChange = (field: keyof typeof catalogForm, value: string) => {
    setCatalogForm((current) => ({ ...current, [field]: value }))
    setCatalogError(null)
    setCatalogInfo(null)
  }

  const handleCatalogSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCatalogError(null)
    setCatalogInfo(null)
    setIsSubmittingCatalog(true)
    try {
      const result = await createCatalogItem({
        family: catalogForm.family.trim(),
        item_type: catalogForm.item_type,
        name: catalogForm.name.trim(),
        description: catalogForm.description.trim() || undefined,
        unit: catalogForm.unit.trim(),
        coefficient: catalogForm.coefficient.trim() || undefined,
        source: catalogForm.source.trim(),
        valid_from: catalogForm.valid_from,
        valid_until: catalogForm.valid_until,
      })
      setCatalogInfo(`Item cadastrado como ${result.status}.`)
      setCatalogForm({
        family: '',
        item_type: 'servico',
        name: '',
        description: '',
        unit: '',
        coefficient: '',
        source: '',
        valid_from: '',
        valid_until: '',
      })
      await loadCatalog()
    } catch (error: unknown) {
      setCatalogError(getErrorMessage(error))
    } finally {
      setIsSubmittingCatalog(false)
    }
  }

  const handleHomologate = async (itemId: string) => {
    setCatalogError(null)
    setCatalogInfo(null)
    setIsSubmittingCatalog(true)
    try {
      const result = await homologateCatalogItem(itemId)
      setCatalogInfo(`Item homologado às ${result.homologatedAt}.`)
      await loadCatalog()
    } catch (error: unknown) {
      setCatalogError(getErrorMessage(error))
    } finally {
      setIsSubmittingCatalog(false)
    }
  }

  const handleDeactivate = async (itemId: string) => {
    setCatalogError(null)
    setCatalogInfo(null)
    if (deactivateReason.trim().length < 10) {
      setCatalogError('A justificativa da inativação deve ter pelo menos 10 caracteres.')
      return
    }
    setIsSubmittingCatalog(true)
    try {
      await deactivateCatalogItem(itemId, deactivateReason.trim())
      setCatalogInfo('Item inativado com justificativa registrada.')
      setDeactivateTarget(null)
      setDeactivateReason('')
      await loadCatalog()
    } catch (error: unknown) {
      setCatalogError(getErrorMessage(error))
    } finally {
      setIsSubmittingCatalog(false)
    }
  }

  const loadPilotParams = async () => {
    setIsLoadingParams(true)
    try {
      const [params, status] = await Promise.all([getPilotParams(), getPilotParamsStatus()])
      setPilotParams(params)
      setParamStatus(status)
      setParamError(null)
    } catch (error: unknown) {
      setParamError(getErrorMessage(error))
    } finally {
      setIsLoadingParams(false)
    }
  }

  useEffect(() => {
    void loadPilotParams()
  }, [])

  const handleParamChange = (field: keyof typeof paramForm, value: string) => {
    setParamForm((current) => ({ ...current, [field]: value }))
    setParamError(null)
    setParamInfo(null)
  }

  const handleParamSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setParamError(null)
    setParamInfo(null)
    if (paramForm.decision === 'bloqueado' && paramForm.blocked_reason.trim().length < 10) {
      setParamError('O bloqueio exige motivo explícito (pelo menos 10 caracteres).')
      return
    }
    setIsSubmittingParam(true)
    try {
      await createPilotParam({
        param_type: paramForm.param_type,
        family: paramForm.family.trim(),
        value: paramForm.value.trim() || undefined,
        unit: paramForm.unit.trim() || undefined,
        source: paramForm.source.trim(),
        decision: paramForm.decision,
        blocked_reason: paramForm.blocked_reason.trim() || undefined,
        blocked_owner: paramForm.blocked_owner.trim() || undefined,
        blocked_deadline: paramForm.blocked_deadline || undefined,
        notes: paramForm.notes.trim() || undefined,
      })
      setParamInfo(
        paramForm.decision === 'bloqueado'
          ? 'Parâmetro registrado como bloqueado, com dono e data-limite.'
          : 'Parâmetro registrado como rascunho; aguarda homologação.',
      )
      setParamForm({
        param_type: 'bdi',
        family: '',
        value: '',
        unit: '',
        source: '',
        decision: 'rascunho',
        blocked_reason: '',
        blocked_owner: '',
        blocked_deadline: '',
        notes: '',
      })
      await loadPilotParams()
    } catch (error: unknown) {
      setParamError(getErrorMessage(error))
    } finally {
      setIsSubmittingParam(false)
    }
  }

  const handleHomologateParam = async (paramId: string) => {
    setParamError(null)
    setParamInfo(null)
    if (!homologateParamValue.trim()) {
      setParamError('A homologação exige o valor decidido.')
      return
    }
    setIsSubmittingParam(true)
    try {
      const result = await homologatePilotParam(
        paramId,
        homologateParamValue.trim(),
        homologateParamUnit.trim() || undefined,
      )
      setParamInfo(`Parâmetro homologado às ${result.homologatedAt}.`)
      setHomologateParamTarget(null)
      setHomologateParamValue('')
      setHomologateParamUnit('')
      await loadPilotParams()
    } catch (error: unknown) {
      setParamError(getErrorMessage(error))
    } finally {
      setIsSubmittingParam(false)
    }
  }

  const loadGates = async () => {
    setIsLoadingGates(true)
    try {
      const [gateList, status] = await Promise.all([getGates(), getGatesStatus()])
      setGates(gateList)
      setGateStatus(status)
      setGateError(null)
    } catch (error: unknown) {
      setGateError(getErrorMessage(error))
    } finally {
      setIsLoadingGates(false)
    }
  }

  useEffect(() => {
    void loadGates()
  }, [])

  const handleGateChange = (field: keyof typeof gateForm, value: string) => {
    setGateForm((current) => ({ ...current, [field]: value }))
    setGateError(null)
    setGateInfo(null)
  }

  const handleGateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setGateError(null)
    setGateInfo(null)
    setIsSubmittingGate(true)
    try {
      await createGate({
        title: gateForm.title.trim(),
        description: gateForm.description.trim() || undefined,
        owner: gateForm.owner.trim(),
        decision_deadline: gateForm.decision_deadline,
      })
      setGateInfo('Bloqueio registrado no ledger de gates.')
      setGateForm({ title: '', description: '', owner: '', decision_deadline: '' })
      await loadGates()
    } catch (error: unknown) {
      setGateError(getErrorMessage(error))
    } finally {
      setIsSubmittingGate(false)
    }
  }

  const handleEscalate = async (gateId: string) => {
    setGateError(null)
    setGateInfo(null)
    if (!escalateName.trim()) {
      setGateError('Informe quem está escalando.')
      return
    }
    setIsSubmittingGate(true)
    try {
      await escalateGate(gateId, escalateName.trim(), escalateNote.trim() || undefined)
      setGateInfo('Gate escalonado: atraso aciona escalonamento (CA-1-17).')
      setEscalateTarget(null)
      setEscalateName('')
      setEscalateNote('')
      await loadGates()
    } catch (error: unknown) {
      setGateError(getErrorMessage(error))
    } finally {
      setIsSubmittingGate(false)
    }
  }

  const handleResolve = async (gateId: string) => {
    setGateError(null)
    setGateInfo(null)
    if (resolveText.trim().length < 10) {
      setGateError('A decisão de resolução é obrigatória (pelo menos 10 caracteres).')
      return
    }
    setIsSubmittingGate(true)
    try {
      await resolveGate(gateId, resolveText.trim())
      setGateInfo('Gate resolvido com decisão registrada.')
      setResolveTarget(null)
      setResolveText('')
      await loadGates()
    } catch (error: unknown) {
      setGateError(getErrorMessage(error))
    } finally {
      setIsSubmittingGate(false)
    }
  }

  const loadSourceAudits = async () => {
    setIsLoadingSource(true)
    try {
      const result = await getSourceAuditMatrix()
      setSourceMatrix(result.matrix)
      setSourceError(null)
    } catch (error: unknown) {
      setSourceError(getErrorMessage(error))
    } finally {
      setIsLoadingSource(false)
    }
  }

  useEffect(() => {
    void loadSourceAudits()
  }, [])

  const handleSourceChange = (field: keyof typeof sourceForm, value: string) => {
    setSourceForm((current) => ({ ...current, [field]: value }))
    setSourceError(null)
    setSourceInfo(null)
  }

  const handleSourceSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSourceError(null)
    setSourceInfo(null)
    setIsSubmittingSource(true)
    try {
      await createSourceAudit({
        system: sourceForm.system,
        coverage: sourceForm.coverage.trim(),
        source_of_truth: sourceForm.source_of_truth.trim(),
        access_method: sourceForm.access_method,
        fields_available: sourceForm.fields_available.trim() || undefined,
        gaps: sourceForm.gaps.trim() || undefined,
        decision: sourceForm.decision,
        decision_reason: sourceForm.decision_reason.trim(),
        decision_owner: sourceForm.decision_owner.trim(),
        decision_date: sourceForm.decision_date,
      })
      setSourceInfo('Auditoria registrada com decisão de fonte.')
      setSourceForm({
        system: 'vobi',
        coverage: '',
        source_of_truth: '',
        access_method: 'manual',
        fields_available: '',
        gaps: '',
        decision: 'importar',
        decision_reason: '',
        decision_owner: '',
        decision_date: '',
      })
      await loadSourceAudits()
    } catch (error: unknown) {
      setSourceError(getErrorMessage(error))
    } finally {
      setIsSubmittingSource(false)
    }
  }

  const handleSourceDecide = async (auditId: string) => {
    setSourceError(null)
    setSourceInfo(null)
    if (sourceDecideForm.decision_reason.trim().length < 10) {
      setSourceError('A nova decisão exige justificativa (pelo menos 10 caracteres).')
      return
    }
    setIsSubmittingSource(true)
    try {
      await updateSourceDecision(auditId, {
        decision: sourceDecideForm.decision,
        decision_reason: sourceDecideForm.decision_reason.trim(),
        decision_owner: sourceDecideForm.decision_owner.trim(),
        decision_date: sourceDecideForm.decision_date,
      })
      setSourceInfo('Decisão de fonte atualizada; histórico preservado.')
      setSourceDecideTarget(null)
      setSourceDecideForm({
        decision: 'importar',
        decision_reason: '',
        decision_owner: '',
        decision_date: '',
      })
      await loadSourceAudits()
    } catch (error: unknown) {
      setSourceError(getErrorMessage(error))
    } finally {
      setIsSubmittingSource(false)
    }
  }

  const loadBackupReceipts = async () => {
    setIsLoadingBackup(true)
    try {
      const result = await getBackupReceipts()
      setBackupReceipts(result.items)
      setBackupError(null)
    } catch (error: unknown) {
      setBackupError(getErrorMessage(error))
    } finally {
      setIsLoadingBackup(false)
    }
  }

  useEffect(() => {
    void loadBackupReceipts()
  }, [])

  const handleBackupExport = async () => {
    setBackupError(null)
    setBackupInfo(null)
    setIsSubmittingBackup(true)
    try {
      const result = await exportBackup()
      setBackupHash(result.hash)
      setBackupCounts(result.counts)
      setBackupInputHash(result.hash)
      setBackupInfo('Exportação gerada com hash de integridade; recibo registrado.')
      await loadBackupReceipts()
    } catch (error: unknown) {
      setBackupError(getErrorMessage(error))
    } finally {
      setIsSubmittingBackup(false)
    }
  }

  const handleBackupVerify = async () => {
    setBackupError(null)
    setBackupInfo(null)
    if (!backupInputHash.trim()) {
      setBackupError('Informe o hash a verificar.')
      return
    }
    setIsSubmittingBackup(true)
    try {
      const result = await verifyBackup(backupInputHash.trim())
      if (result.result === 'sucesso') {
        setBackupInfo('Verificação: hash confere com o estado atual.')
        setBackupHash(result.currentHash)
      } else {
        setBackupInfo(`Verificação: ${result.errorDetail}`)
      }
      await loadBackupReceipts()
    } catch (error: unknown) {
      setBackupError(getErrorMessage(error))
    } finally {
      setIsSubmittingBackup(false)
    }
  }

  const handleBackupRestore = async () => {
    setBackupError(null)
    setBackupInfo(null)
    if (!backupInputHash.trim()) {
      setBackupError('Informe o hash do backup a restaurar.')
      return
    }
    setIsSubmittingBackup(true)
    try {
      const result = await restoreCheck(backupInputHash.trim())
      if (result.result === 'sucesso') {
        setBackupInfo(result.detail ?? 'Restauração comprovada via recibo auditado.')
      } else {
        setBackupInfo(`Restauração bloqueada: ${result.errorDetail}`)
      }
      await loadBackupReceipts()
    } catch (error: unknown) {
      setBackupError(getErrorMessage(error))
    } finally {
      setIsSubmittingBackup(false)
    }
  }

  const formatDuration = (ms: number) => {
    if (!ms) return 'sem amostra'
    const hours = ms / 3600000
    if (hours >= 24) return `${(hours / 24).toFixed(1)} dias`
    if (hours >= 1) return `${hours.toFixed(1)} h`
    return `${Math.round(ms / 60000)} min`
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
                        setTechSheetCreated(null)
                        setTechSheetError(null)
                        setTrackingError(null)
                        setTrackingInfo(null)
                        setPauseReason('')
                        void loadTechSheets(item.id)
                        void loadTracking(item.id)
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

        <section className="mx-auto w-full max-w-5xl mt-6 bg-white rounded-[16px] p-6 sm:p-8 border border-[#E1E8E5] shadow-[0_12px_40px_rgba(2,44,34,0.06)]">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-11 h-11 rounded-[12px] bg-[#ECFDF5] text-[#047857] flex items-center justify-center shrink-0">
              <HardDriveDownload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#0F1F1C]">Backup e exportação</h2>
              <p className="text-[13px] text-[#5B6B66] mt-1">
                Demonstração com recibo auditado e hash de integridade: backup inválido bloqueia a
                restauração (falha segura); hash válido comprova a restauração.
              </p>
            </div>
          </div>

          {backupError && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-[#FEF2F2] border-l-4 border-[#DC2626] text-[#B91C1C] text-[13px] font-medium flex items-start gap-2.5"
              role="alert"
              aria-live="assertive"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{backupError}</span>
            </div>
          )}

          {backupInfo && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-[#ECFDF5] border-l-4 border-[#10B981] text-[#047857] text-[13px] font-medium"
              role="status"
              aria-live="polite"
            >
              {backupInfo}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <button
              type="button"
              onClick={() => void handleBackupExport()}
              disabled={isSubmittingBackup}
              className="h-[46px] px-5 rounded-[10px] bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-semibold text-[14px] hover:shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition-all disabled:opacity-70 disabled:pointer-events-none inline-flex items-center justify-center gap-2"
            >
              <HardDriveDownload className="w-4 h-4" />
              {isSubmittingBackup ? 'Gerando...' : 'Exportar / Gerar backup'}
            </button>
          </div>

          {backupHash && backupCounts && (
            <div className="mb-5 rounded-[12px] border border-[#E1E8E5] bg-[#F6F8F7] p-4">
              <h3 className="text-[13px] font-bold text-[#0F1F1C]">Snapshot atual</h3>
              <p className="text-[12px] text-[#5B6B66] mt-1 break-all">
                Hash: <span className="font-mono">{backupHash}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(backupCounts).map(([name, count]) => (
                  <span
                    key={name}
                    className="text-[11px] bg-white border border-[#E1E8E5] rounded-full px-2.5 py-1 text-[#5B6B66]"
                  >
                    {name}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-[12px] border border-[#E1E8E5] bg-white p-4 mb-5">
            <label className="block text-[13px] font-semibold text-[#0F1F1C]">
              Hash do backup
              <input
                value={backupInputHash}
                onChange={(event) => setBackupInputHash(event.target.value)}
                className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[13px] font-mono outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                placeholder="Cole o hash do backup (ou use o gerado acima)"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleBackupVerify()}
                disabled={isSubmittingBackup || !backupInputHash.trim()}
                className="h-[38px] px-4 rounded-[9px] bg-[#064E3B] text-white text-[12px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
              >
                Verificar integridade
              </button>
              <button
                type="button"
                onClick={() => void handleBackupRestore()}
                disabled={isSubmittingBackup || !backupInputHash.trim()}
                className="h-[38px] px-4 rounded-[9px] bg-[#1D4ED8] text-white text-[12px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
              >
                Testar restauração
              </button>
            </div>
            <p className="mt-2 text-[12px] text-[#5B6B66]">
              Dica: altere um caractere do hash para provar a falha segura (RED-012).
            </p>
          </div>

          <div className="rounded-[12px] border border-[#E1E8E5] bg-[#F6F8F7] p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-[14px] font-bold text-[#0F1F1C]">Recibos de demonstração</h3>
              <button
                type="button"
                onClick={() => void loadBackupReceipts()}
                className="text-[12px] font-semibold text-[#047857] hover:underline"
              >
                Atualizar
              </button>
            </div>
            {isLoadingBackup ? (
              <p className="text-[12px] text-[#5B6B66]">Carregando recibos...</p>
            ) : backupReceipts.length === 0 ? (
              <p className="text-[12px] text-[#5B6B66]">
                Nenhum recibo ainda — gere uma exportação para começar.
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {backupReceipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex items-center justify-between gap-2 rounded-[9px] border border-[#E1E8E5] bg-white px-3 py-2"
                  >
                    <div className="min-w-0">
                      <span className="text-[12px] font-bold text-[#0F1F1C] capitalize">
                        {receipt.kind}
                      </span>
                      <span className="text-[11px] text-[#5B6B66] ml-2">
                        {new Date(receipt.created).toLocaleString('pt-BR')}
                      </span>
                      {receipt.errorDetail && (
                        <p className="text-[11px] text-[#C2410C] truncate">{receipt.errorDetail}</p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        receipt.result === 'sucesso'
                          ? 'bg-[#ECFDF5] text-[#047857]'
                          : 'bg-[#FEF2F2] text-[#B91C1C]'
                      }`}
                    >
                      {receipt.result}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl mt-6 bg-white rounded-[16px] p-6 sm:p-8 border border-[#E1E8E5] shadow-[0_12px_40px_rgba(2,44,34,0.06)]">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-11 h-11 rounded-[12px] bg-[#ECFDF5] text-[#047857] flex items-center justify-center shrink-0">
              <DatabaseZap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#0F1F1C]">Auditoria VOBI/OMIE</h2>
              <p className="text-[13px] text-[#5B6B66] mt-1">
                Cobertura, fonte de verdade, forma de acesso e decisão de fonte (integrar, importar
                ou não usar) — auditada antes de qualquer duplicação ou integração.
              </p>
            </div>
          </div>

          {sourceError && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-[#FEF2F2] border-l-4 border-[#DC2626] text-[#B91C1C] text-[13px] font-medium flex items-start gap-2.5"
              role="alert"
              aria-live="assertive"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{sourceError}</span>
            </div>
          )}

          {sourceInfo && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-[#ECFDF5] border-l-4 border-[#10B981] text-[#047857] text-[13px] font-medium"
              role="status"
              aria-live="polite"
            >
              {sourceInfo}
            </div>
          )}

          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            {sourceMatrix.map((item) => (
              <div
                key={item.system}
                className="rounded-[12px] border border-[#E1E8E5] bg-[#F6F8F7] p-4"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[14px] font-bold text-[#0F1F1C] uppercase">
                    {item.system === 'vobi' ? 'VOBI' : 'OMIE'}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      item.decision === 'integrar'
                        ? 'bg-[#ECFDF5] text-[#047857]'
                        : item.decision === 'importar'
                          ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                          : item.decision === 'nao_usar'
                            ? 'bg-[#FFF7ED] text-[#C2410C]'
                            : 'bg-[#F1F5F4] text-[#5B6B66]'
                    }`}
                  >
                    {item.decision === 'nao_auditado'
                      ? 'não auditado'
                      : item.decision.replace('_', ' ')}
                  </span>
                </div>
                {item.decision !== 'nao_auditado' && (
                  <div className="mt-2 grid gap-x-3 gap-y-1 text-[11px] text-[#5B6B66]">
                    <span>Cobertura: {item.coverage}</span>
                    <span>Fonte de verdade: {item.sourceOfTruth}</span>
                    <span>Acesso: {item.accessMethod}</span>
                    {item.fieldsAvailable && <span>Campos: {item.fieldsAvailable}</span>}
                    <span>
                      Decisão: {item.decision?.replace('_', ' ')} em {item.decisionDate} por{' '}
                      {item.decisionOwner}
                    </span>
                    <span>Justificativa: {item.decisionReason}</span>
                    {item.gaps && <span>Histórico/lacunas: {item.gaps}</span>}
                  </div>
                )}
                {item.id && canHomologateCatalog && (
                  <button
                    type="button"
                    onClick={() => {
                      setSourceDecideTarget(item.id ?? null)
                      setSourceDecideForm({
                        decision:
                          item.decision === 'integrar'
                            ? 'integrar'
                            : item.decision === 'nao_usar'
                              ? 'nao_usar'
                              : 'importar',
                        decision_reason: '',
                        decision_owner: '',
                        decision_date: '',
                      })
                    }}
                    disabled={isSubmittingSource}
                    className="mt-2 h-[30px] px-3 rounded-[8px] bg-[#064E3B] text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                  >
                    Atualizar decisão
                  </button>
                )}
                {item.id && sourceDecideTarget === item.id && (
                  <div className="mt-2 space-y-2 pt-2 border-t border-[#E1E8E5]">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block text-[12px] font-semibold text-[#0F1F1C]">
                        Nova decisão *
                        <select
                          value={sourceDecideForm.decision}
                          onChange={(event) =>
                            setSourceDecideForm((current) => ({
                              ...current,
                              decision: event.target.value as 'integrar' | 'importar' | 'nao_usar',
                            }))
                          }
                          className="mt-1.5 w-full h-[36px] rounded-[8px] border border-[#E1E8E5] bg-white px-2.5 text-[12px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                        >
                          <option value="integrar">Integrar</option>
                          <option value="importar">Importar</option>
                          <option value="nao_usar">Não usar</option>
                        </select>
                      </label>
                      <label className="block text-[12px] font-semibold text-[#0F1F1C]">
                        Dono *
                        <input
                          value={sourceDecideForm.decision_owner}
                          onChange={(event) =>
                            setSourceDecideForm((current) => ({
                              ...current,
                              decision_owner: event.target.value,
                            }))
                          }
                          className="mt-1.5 w-full h-[36px] px-2.5 rounded-[8px] border border-[#E1E8E5] bg-white text-[12px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                          placeholder="Quem decide"
                        />
                      </label>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block text-[12px] font-semibold text-[#0F1F1C]">
                        Data *
                        <input
                          type="date"
                          value={sourceDecideForm.decision_date}
                          onChange={(event) =>
                            setSourceDecideForm((current) => ({
                              ...current,
                              decision_date: event.target.value,
                            }))
                          }
                          className="mt-1.5 w-full h-[36px] px-2.5 rounded-[8px] border border-[#E1E8E5] bg-white text-[12px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                        />
                      </label>
                      <label className="block text-[12px] font-semibold text-[#0F1F1C]">
                        Justificativa *
                        <input
                          minLength={10}
                          maxLength={1000}
                          value={sourceDecideForm.decision_reason}
                          onChange={(event) =>
                            setSourceDecideForm((current) => ({
                              ...current,
                              decision_reason: event.target.value,
                            }))
                          }
                          className="mt-1.5 w-full h-[36px] px-2.5 rounded-[8px] border border-[#E1E8E5] bg-white text-[12px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                          placeholder="Por que a decisão mudou"
                        />
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSourceDecide(item.id ?? '')}
                        disabled={
                          isSubmittingSource ||
                          sourceDecideForm.decision_reason.trim().length < 10 ||
                          !sourceDecideForm.decision_owner.trim() ||
                          !sourceDecideForm.decision_date
                        }
                        className="h-[30px] px-3 rounded-[8px] bg-[#064E3B] text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                      >
                        Confirmar decisão
                      </button>
                      <button
                        type="button"
                        onClick={() => setSourceDecideTarget(null)}
                        className="h-[30px] px-3 rounded-[8px] bg-white border border-[#E1E8E5] text-[#5B6B66] text-[11px] font-semibold"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSourceSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Sistema *
                <select
                  value={sourceForm.system}
                  onChange={(event) => handleSourceChange('system', event.target.value)}
                  className="mt-1.5 w-full h-[44px] rounded-[10px] border border-[#E1E8E5] bg-white px-3 text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                >
                  <option value="vobi">VOBI</option>
                  <option value="omie">OMIE</option>
                </select>
              </label>
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Forma de acesso *
                <select
                  value={sourceForm.access_method}
                  onChange={(event) => handleSourceChange('access_method', event.target.value)}
                  className="mt-1.5 w-full h-[44px] rounded-[10px] border border-[#E1E8E5] bg-white px-3 text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                >
                  <option value="manual">Manual</option>
                  <option value="exportacao">Exportação</option>
                  <option value="api">API</option>
                </select>
              </label>
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Decisão de fonte *
                <select
                  value={sourceForm.decision}
                  onChange={(event) => handleSourceChange('decision', event.target.value)}
                  className="mt-1.5 w-full h-[44px] rounded-[10px] border border-[#E1E8E5] bg-white px-3 text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                >
                  <option value="integrar">Integrar</option>
                  <option value="importar">Importar</option>
                  <option value="nao_usar">Não usar</option>
                </select>
              </label>
            </div>

            <label className="block text-[13px] font-semibold text-[#0F1F1C]">
              Cobertura *
              <input
                required
                maxLength={1000}
                value={sourceForm.coverage}
                onChange={(event) => handleSourceChange('coverage', event.target.value)}
                className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                placeholder="O que o sistema cobre hoje no processo"
              />
            </label>

            <label className="block text-[13px] font-semibold text-[#0F1F1C]">
              Fonte de verdade *
              <input
                required
                maxLength={500}
                value={sourceForm.source_of_truth}
                onChange={(event) => handleSourceChange('source_of_truth', event.target.value)}
                className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                placeholder="Qual dado vem daqui (ex.: orçamentos, clientes)"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Campos disponíveis
                <input
                  maxLength={2000}
                  value={sourceForm.fields_available}
                  onChange={(event) => handleSourceChange('fields_available', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                  placeholder="Campos relevantes que o sistema exporta"
                />
              </label>
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Lacunas
                <input
                  maxLength={2000}
                  value={sourceForm.gaps}
                  onChange={(event) => handleSourceChange('gaps', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                  placeholder="O que falta ou não é confiável"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Justificativa da decisão *
                <input
                  required
                  minLength={10}
                  maxLength={1000}
                  value={sourceForm.decision_reason}
                  onChange={(event) => handleSourceChange('decision_reason', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                  placeholder="Por que integrar, importar ou não usar"
                />
              </label>
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Dono da decisão *
                <input
                  required
                  maxLength={200}
                  value={sourceForm.decision_owner}
                  onChange={(event) => handleSourceChange('decision_owner', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                  placeholder="Quem decide"
                />
              </label>
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Data da decisão *
                <input
                  required
                  type="date"
                  value={sourceForm.decision_date}
                  onChange={(event) => handleSourceChange('decision_date', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                />
              </label>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-[12px] text-[#5B6B66]">
                Auditoria incompleta é negada (RED-011); a decisão é auditada e o histórico é
                preservado.
              </p>
              <button
                type="submit"
                disabled={isSubmittingSource}
                className="h-[46px] px-5 rounded-[10px] bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-semibold text-[14px] hover:shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition-all disabled:opacity-70 disabled:pointer-events-none inline-flex items-center justify-center gap-2 shrink-0"
              >
                <DatabaseZap className="w-4 h-4" />
                {isSubmittingSource ? 'Registrando...' : 'Registrar auditoria'}
              </button>
            </div>
          </form>
        </section>

        <section className="mx-auto w-full max-w-5xl mt-6 bg-white rounded-[16px] p-6 sm:p-8 border border-[#E1E8E5] shadow-[0_12px_40px_rgba(2,44,34,0.06)]">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-11 h-11 rounded-[12px] bg-[#ECFDF5] text-[#047857] flex items-center justify-center shrink-0">
              <OctagonAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#0F1F1C]">Gates e cortes</h2>
              <p className="text-[13px] text-[#5B6B66] mt-1">
                Bloqueios críticos com dono e data-limite. Atraso aciona escalonamento; a ordem de
                corte do PRD é fixa e nunca editável.
              </p>
            </div>
          </div>

          {gateError && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-[#FEF2F2] border-l-4 border-[#DC2626] text-[#B91C1C] text-[13px] font-medium flex items-start gap-2.5"
              role="alert"
              aria-live="assertive"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{gateError}</span>
            </div>
          )}

          {gateInfo && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-[#ECFDF5] border-l-4 border-[#10B981] text-[#047857] text-[13px] font-medium"
              role="status"
              aria-live="polite"
            >
              {gateInfo}
            </div>
          )}

          <form onSubmit={handleGateSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Título do bloqueio *
                <input
                  required
                  maxLength={200}
                  value={gateForm.title}
                  onChange={(event) => handleGateChange('title', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                  placeholder="Ex.: Homologação da família-piloto"
                />
              </label>
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Dono da decisão *
                <input
                  required
                  maxLength={200}
                  value={gateForm.owner}
                  onChange={(event) => handleGateChange('owner', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                  placeholder="Quem decide"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Data-limite de decisão *
                <input
                  required
                  type="date"
                  value={gateForm.decision_deadline}
                  onChange={(event) => handleGateChange('decision_deadline', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                />
              </label>
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Descrição
                <input
                  maxLength={1000}
                  value={gateForm.description}
                  onChange={(event) => handleGateChange('description', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                  placeholder="Contexto do bloqueio"
                />
              </label>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-[12px] text-[#5B6B66]">
                Bloqueio sem dono ou sem data é negado (CA-1-17); o registro é auditado.
              </p>
              <button
                type="submit"
                disabled={isSubmittingGate}
                className="h-[46px] px-5 rounded-[10px] bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-semibold text-[14px] hover:shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition-all disabled:opacity-70 disabled:pointer-events-none inline-flex items-center justify-center gap-2 shrink-0"
              >
                <OctagonAlert className="w-4 h-4" />
                {isSubmittingGate ? 'Registrando...' : 'Registrar bloqueio'}
              </button>
            </div>
          </form>

          <div className="mt-6 rounded-[12px] border border-[#E1E8E5] bg-[#F6F8F7] p-4 text-left">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-[14px] font-bold text-[#0F1F1C]">Bloqueios registrados</h3>
                <p className="text-[12px] text-[#5B6B66] mt-1">
                  Resolução aparece somente para quem tem permissão no servidor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadGates()}
                className="text-[12px] font-semibold text-[#047857] hover:underline"
              >
                Atualizar
              </button>
            </div>
            {isLoadingGates ? (
              <p className="text-[12px] text-[#5B6B66]">Carregando bloqueios...</p>
            ) : gates.length === 0 ? (
              <p className="text-[12px] text-[#5B6B66]">Nenhum bloqueio registrado ainda.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {gates.map((gate) => {
                  const statusInfo = gateStatus?.items.find((i) => i.id === gate.id)
                  const overdue = statusInfo?.overdue ?? false
                  return (
                    <div
                      key={gate.id}
                      className="rounded-[9px] border border-[#E1E8E5] bg-white p-3"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[13px] font-bold text-[#0F1F1C]">{gate.title}</span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            gate.status === 'resolvido'
                              ? 'bg-[#ECFDF5] text-[#047857]'
                              : gate.status === 'escalonado'
                                ? 'bg-[#FEF2F2] text-[#B91C1C]'
                                : overdue
                                  ? 'bg-[#FFF7ED] text-[#C2410C]'
                                  : 'bg-[#F1F5F4] text-[#5B6B66]'
                          }`}
                        >
                          {gate.status === 'aberto' && overdue ? 'vencido' : gate.status}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-x-3 gap-y-1 text-[11px] text-[#5B6B66] sm:grid-cols-2">
                        <span>Dono: {gate.owner}</span>
                        <span>Data-limite: {gate.decision_deadline.slice(0, 10)}</span>
                        {(statusInfo?.escalations ?? 0) > 0 && (
                          <span>Escalonamentos: {statusInfo?.escalations}</span>
                        )}
                        {gate.description && <span>Descrição: {gate.description}</span>}
                        {gate.resolution && <span>Decisão: {gate.resolution}</span>}
                        {gate.resolved_at && <span>Resolvido em: {gate.resolved_at}</span>}
                      </div>
                      {gate.status !== 'resolvido' && overdue && (
                        <button
                          type="button"
                          onClick={() => {
                            setEscalateTarget(gate.id)
                            setEscalateName('')
                            setEscalateNote('')
                          }}
                          disabled={isSubmittingGate}
                          className="mt-2 h-[30px] px-3 rounded-[8px] bg-[#B91C1C] text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                        >
                          Escalonar (atraso)
                        </button>
                      )}
                      {escalateTarget === gate.id && (
                        <div className="mt-2 space-y-2 pt-2 border-t border-[#E1E8E5]">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <label className="block text-[12px] font-semibold text-[#0F1F1C]">
                              Quem está escalando *
                              <input
                                value={escalateName}
                                onChange={(event) => setEscalateName(event.target.value)}
                                className="mt-1.5 w-full h-[36px] px-2.5 rounded-[8px] border border-[#E1E8E5] bg-white text-[12px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                                placeholder="Seu nome"
                              />
                            </label>
                            <label className="block text-[12px] font-semibold text-[#0F1F1C]">
                              Nota
                              <input
                                maxLength={1000}
                                value={escalateNote}
                                onChange={(event) => setEscalateNote(event.target.value)}
                                className="mt-1.5 w-full h-[36px] px-2.5 rounded-[8px] border border-[#E1E8E5] bg-white text-[12px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                                placeholder="Contexto do escalonamento"
                              />
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => void handleEscalate(gate.id)}
                              disabled={isSubmittingGate || !escalateName.trim()}
                              className="h-[30px] px-3 rounded-[8px] bg-[#B91C1C] text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                            >
                              Confirmar escalonamento
                            </button>
                            <button
                              type="button"
                              onClick={() => setEscalateTarget(null)}
                              className="h-[30px] px-3 rounded-[8px] bg-white border border-[#E1E8E5] text-[#5B6B66] text-[11px] font-semibold"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                      {canHomologateCatalog && gate.status !== 'resolvido' && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setResolveTarget(gate.id)
                              setResolveText('')
                            }}
                            disabled={isSubmittingGate}
                            className="h-[30px] px-3 rounded-[8px] bg-[#064E3B] text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                          >
                            Resolver
                          </button>
                        </div>
                      )}
                      {resolveTarget === gate.id && (
                        <div className="mt-2 space-y-2 pt-2 border-t border-[#E1E8E5]">
                          <label className="block text-[12px] font-semibold text-[#0F1F1C]">
                            Decisão de resolução *
                            <textarea
                              minLength={10}
                              maxLength={1000}
                              value={resolveText}
                              onChange={(event) => setResolveText(event.target.value)}
                              className="mt-1.5 w-full min-h-[60px] rounded-[9px] border border-[#E1E8E5] bg-white p-2.5 text-[12px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                              placeholder="Como o bloqueio foi decidido."
                            />
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => void handleResolve(gate.id)}
                              disabled={isSubmittingGate || resolveText.trim().length < 10}
                              className="h-[30px] px-3 rounded-[8px] bg-[#064E3B] text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                            >
                              Confirmar resolução
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setResolveTarget(null)
                                setResolveText('')
                              }}
                              className="h-[30px] px-3 rounded-[8px] bg-white border border-[#E1E8E5] text-[#5B6B66] text-[11px] font-semibold"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-[12px] border border-[#E1E8E5] bg-white p-4 text-left">
            <h3 className="text-[14px] font-bold text-[#0F1F1C]">
              Ordem de corte (PRD, seção 11) — fixa
            </h3>
            <p className="text-[12px] text-[#5B6B66] mt-1">
              Se a homologação da família-piloto atrasar, corta-se nesta ordem. Estes itens nunca se
              cortam: baseline, catálogo homologado, memória de cálculo, aprovação, documento
              completo, segurança e auditoria.
            </p>
            <ol className="mt-3 space-y-1.5">
              {(gateStatus?.cutOrder ?? []).map((cut) => (
                <li key={cut.position} className="flex items-start gap-2 text-[12px]">
                  <span
                    className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      cut.cuttable ? 'bg-[#FFF7ED] text-[#C2410C]' : 'bg-[#ECFDF5] text-[#047857]'
                    }`}
                  >
                    {cut.position}
                  </span>
                  <span
                    className={cut.cuttable ? 'text-[#5B6B66]' : 'text-[#047857] font-semibold'}
                  >
                    {cut.item}
                    {!cut.cuttable && ' — nunca se corta'}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl mt-6 bg-white rounded-[16px] p-6 sm:p-8 border border-[#E1E8E5] shadow-[0_12px_40px_rgba(2,44,34,0.06)]">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-11 h-11 rounded-[12px] bg-[#ECFDF5] text-[#047857] flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#0F1F1C]">Regras e SLA do piloto</h2>
              <p className="text-[13px] text-[#5B6B66] mt-1">
                BDI, ISS, margem, SLA, alçadas e arredondamento precisam de decisão homologada ou
                bloqueio explícito com dono e data. O SLA da família-piloto é obrigatório para
                liberar a Fase 2.
              </p>
            </div>
          </div>

          {paramStatus && (
            <div
              className={`mb-5 p-3.5 rounded-[12px] text-[13px] font-medium flex items-start gap-2.5 ${
                paramStatus.gate.open
                  ? 'bg-[#ECFDF5] border-l-4 border-[#10B981] text-[#047857]'
                  : 'bg-[#FFF7ED] border-l-4 border-[#EA580C] text-[#C2410C]'
              }`}
              role="status"
              aria-live="polite"
            >
              {paramStatus.gate.open ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>
                <strong>
                  Gate da Fase 2 ({paramStatus.gate.family || 'família ainda sem registro'}):
                </strong>{' '}
                {paramStatus.gate.detail}
              </span>
            </div>
          )}

          {paramError && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-[#FEF2F2] border-l-4 border-[#DC2626] text-[#B91C1C] text-[13px] font-medium flex items-start gap-2.5"
              role="alert"
              aria-live="assertive"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{paramError}</span>
            </div>
          )}

          {paramInfo && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-[#ECFDF5] border-l-4 border-[#10B981] text-[#047857] text-[13px] font-medium"
              role="status"
              aria-live="polite"
            >
              {paramInfo}
            </div>
          )}

          <form onSubmit={handleParamSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Parâmetro *
                <select
                  value={paramForm.param_type}
                  onChange={(event) =>
                    handleParamChange(
                      'param_type',
                      event.target.value as
                        | 'bdi'
                        | 'iss'
                        | 'margem'
                        | 'sla'
                        | 'alcada'
                        | 'arredondamento',
                    )
                  }
                  className="mt-1.5 w-full h-[44px] rounded-[10px] border border-[#E1E8E5] bg-white px-3 text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                >
                  <option value="bdi">BDI</option>
                  <option value="iss">ISS</option>
                  <option value="margem">Margem</option>
                  <option value="sla">SLA</option>
                  <option value="alcada">Alçada</option>
                  <option value="arredondamento">Arredondamento</option>
                </select>
              </label>
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Família *
                <input
                  required
                  maxLength={120}
                  value={paramForm.family}
                  onChange={(event) => handleParamChange('family', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                  placeholder="Família do parâmetro, sem presumir o piloto"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Fonte da decisão *
                <input
                  required
                  maxLength={200}
                  value={paramForm.source}
                  onChange={(event) => handleParamChange('source', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                  placeholder="De onde vem a decisão (ata, e-mail, documento)"
                />
              </label>
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Decisão *
                <select
                  value={paramForm.decision}
                  onChange={(event) =>
                    handleParamChange('decision', event.target.value as 'rascunho' | 'bloqueado')
                  }
                  className="mt-1.5 w-full h-[44px] rounded-[10px] border border-[#E1E8E5] bg-white px-3 text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                >
                  <option value="rascunho">Rascunho (aguarda homologação)</option>
                  <option value="bloqueado">Bloqueado (com dono e data-limite)</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Valor (opcional no rascunho)
                <input
                  maxLength={200}
                  value={paramForm.value}
                  onChange={(event) => handleParamChange('value', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                  placeholder="Valor proposto, se houver"
                />
              </label>
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Unidade
                <input
                  maxLength={40}
                  value={paramForm.unit}
                  onChange={(event) => handleParamChange('unit', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                  placeholder="Ex.: %, dias, R$"
                />
              </label>
            </div>

            {paramForm.decision === 'bloqueado' && (
              <div className="grid gap-4 sm:grid-cols-3 p-4 rounded-[12px] bg-[#FFF7ED] border border-[#FED7AA]">
                <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                  Motivo do bloqueio *
                  <input
                    minLength={10}
                    maxLength={1000}
                    value={paramForm.blocked_reason}
                    onChange={(event) => handleParamChange('blocked_reason', event.target.value)}
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#FED7AA] bg-white text-[14px] font-normal outline-none focus:border-[#EA580C] focus:ring-4 focus:ring-[#EA580C]/15"
                    placeholder="Por que a decisão está bloqueada"
                  />
                </label>
                <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                  Dono do desbloqueio *
                  <input
                    maxLength={200}
                    value={paramForm.blocked_owner}
                    onChange={(event) => handleParamChange('blocked_owner', event.target.value)}
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#FED7AA] bg-white text-[14px] font-normal outline-none focus:border-[#EA580C] focus:ring-4 focus:ring-[#EA580C]/15"
                    placeholder="Quem resolve"
                  />
                </label>
                <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                  Data-limite *
                  <input
                    type="date"
                    value={paramForm.blocked_deadline}
                    onChange={(event) => handleParamChange('blocked_deadline', event.target.value)}
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#FED7AA] bg-white text-[14px] font-normal outline-none focus:border-[#EA580C] focus:ring-4 focus:ring-[#EA580C]/15"
                  />
                </label>
              </div>
            )}

            <label className="block text-[13px] font-semibold text-[#0F1F1C]">
              Observações
              <input
                maxLength={1000}
                value={paramForm.notes}
                onChange={(event) => handleParamChange('notes', event.target.value)}
                className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                placeholder="Contexto adicional opcional"
              />
            </label>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-[12px] text-[#5B6B66]">
                O registro é auditado; a homologação do valor é feita por Engenharia/Admin.
              </p>
              <button
                type="submit"
                disabled={isSubmittingParam}
                className="h-[46px] px-5 rounded-[10px] bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-semibold text-[14px] hover:shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition-all disabled:opacity-70 disabled:pointer-events-none inline-flex items-center justify-center gap-2 shrink-0"
              >
                <Scale className="w-4 h-4" />
                {isSubmittingParam ? 'Registrando...' : 'Registrar parâmetro'}
              </button>
            </div>
          </form>

          <div className="mt-6 rounded-[12px] border border-[#E1E8E5] bg-[#F6F8F7] p-4 text-left">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-[14px] font-bold text-[#0F1F1C]">Parâmetros registrados</h3>
                <p className="text-[12px] text-[#5B6B66] mt-1">
                  Homologação aparece somente para quem tem permissão no servidor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadPilotParams()}
                className="text-[12px] font-semibold text-[#047857] hover:underline"
              >
                Atualizar
              </button>
            </div>
            {isLoadingParams ? (
              <p className="text-[12px] text-[#5B6B66]">Carregando parâmetros...</p>
            ) : pilotParams.length === 0 ? (
              <p className="text-[12px] text-[#5B6B66]">Nenhum parâmetro registrado ainda.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {pilotParams.map((param) => (
                  <div
                    key={param.id}
                    className="rounded-[9px] border border-[#E1E8E5] bg-white p-3"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-[#0F1F1C]">
                        {param.param_type} · {param.family}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          param.decision === 'homologado'
                            ? 'bg-[#ECFDF5] text-[#047857]'
                            : param.decision === 'bloqueado'
                              ? 'bg-[#FFF7ED] text-[#C2410C]'
                              : 'bg-[#F1F5F4] text-[#5B6B66]'
                        }`}
                      >
                        {param.decision}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-x-3 gap-y-1 text-[11px] text-[#5B6B66] sm:grid-cols-2">
                      {param.value && (
                        <span>
                          Valor: {param.value} {param.unit}
                        </span>
                      )}
                      <span>Fonte: {param.source}</span>
                      {param.blocked_reason && <span>Motivo: {param.blocked_reason}</span>}
                      {param.blocked_owner && <span>Dono: {param.blocked_owner}</span>}
                      {param.blocked_deadline && <span>Data-limite: {param.blocked_deadline}</span>}
                      {param.homologated_at && <span>Homologado em: {param.homologated_at}</span>}
                      {param.notes && <span>Obs.: {param.notes}</span>}
                    </div>
                    {canHomologateCatalog && param.decision === 'rascunho' && (
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setHomologateParamTarget(param.id)
                            setHomologateParamValue(param.value)
                            setHomologateParamUnit(param.unit)
                          }}
                          disabled={isSubmittingParam}
                          className="mt-2 h-[30px] px-3 rounded-[8px] bg-[#064E3B] text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                        >
                          Homologar valor
                        </button>
                        {homologateParamTarget === param.id && (
                          <div className="mt-2 space-y-2 pt-2 border-t border-[#E1E8E5]">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <label className="block text-[12px] font-semibold text-[#0F1F1C]">
                                Valor homologado *
                                <input
                                  value={homologateParamValue}
                                  onChange={(event) => setHomologateParamValue(event.target.value)}
                                  className="mt-1.5 w-full h-[36px] px-2.5 rounded-[8px] border border-[#E1E8E5] bg-white text-[12px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                                  placeholder="Valor decidido"
                                />
                              </label>
                              <label className="block text-[12px] font-semibold text-[#0F1F1C]">
                                Unidade
                                <input
                                  maxLength={40}
                                  value={homologateParamUnit}
                                  onChange={(event) => setHomologateParamUnit(event.target.value)}
                                  className="mt-1.5 w-full h-[36px] px-2.5 rounded-[8px] border border-[#E1E8E5] bg-white text-[12px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                                  placeholder="Ex.: %, dias"
                                />
                              </label>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => void handleHomologateParam(param.id)}
                                disabled={isSubmittingParam || !homologateParamValue.trim()}
                                className="h-[30px] px-3 rounded-[8px] bg-[#064E3B] text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                              >
                                Confirmar homologação
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setHomologateParamTarget(null)
                                  setHomologateParamValue('')
                                  setHomologateParamUnit('')
                                }}
                                className="h-[30px] px-3 rounded-[8px] bg-white border border-[#E1E8E5] text-[#5B6B66] text-[11px] font-semibold"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl mt-6 bg-white rounded-[16px] p-6 sm:p-8 border border-[#E1E8E5] shadow-[0_12px_40px_rgba(2,44,34,0.06)]">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-11 h-11 rounded-[12px] bg-[#ECFDF5] text-[#047857] flex items-center justify-center shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#0F1F1C]">Catálogo</h2>
              <p className="text-[13px] text-[#5B6B66] mt-1">
                Itens nascem em rascunho; somente Engenharia/Admin homologam ou inativam (com
                justificativa). Itens homologados/inativos são imutáveis e apenas homologados
                vigentes são utilizáveis.
              </p>
            </div>
          </div>

          {catalogError && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-[#FEF2F2] border-l-4 border-[#DC2626] text-[#B91C1C] text-[13px] font-medium flex items-start gap-2.5"
              role="alert"
              aria-live="assertive"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{catalogError}</span>
            </div>
          )}

          {catalogInfo && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-[#ECFDF5] border-l-4 border-[#10B981] text-[#047857] text-[13px] font-medium"
              role="status"
              aria-live="polite"
            >
              {catalogInfo}
            </div>
          )}

          <form onSubmit={handleCatalogSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Família de serviço *
                <input
                  required
                  maxLength={120}
                  value={catalogForm.family}
                  onChange={(event) => handleCatalogChange('family', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                  placeholder="Informe a família, sem presumir o piloto"
                />
              </label>
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Tipo *
                <select
                  value={catalogForm.item_type}
                  onChange={(event) =>
                    handleCatalogChange(
                      'item_type',
                      event.target.value as 'servico' | 'composicao' | 'recurso',
                    )
                  }
                  className="mt-1.5 w-full h-[44px] rounded-[10px] border border-[#E1E8E5] bg-white px-3 text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                >
                  <option value="servico">Serviço</option>
                  <option value="composicao">Composição</option>
                  <option value="recurso">Recurso</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Nome *
                <input
                  required
                  maxLength={200}
                  value={catalogForm.name}
                  onChange={(event) => handleCatalogChange('name', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                  placeholder="Nome do serviço, composição ou recurso"
                />
              </label>
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Unidade *
                <input
                  required
                  maxLength={40}
                  value={catalogForm.unit}
                  onChange={(event) => handleCatalogChange('unit', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                  placeholder="Ex.: m², kg, un"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Fonte *
                <input
                  required
                  maxLength={200}
                  value={catalogForm.source}
                  onChange={(event) => handleCatalogChange('source', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                  placeholder="De onde vem a informação"
                />
              </label>
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Coeficiente
                <input
                  maxLength={100}
                  value={catalogForm.coefficient}
                  onChange={(event) => handleCatalogChange('coefficient', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                  placeholder="Texto descritivo, sem cálculo nesta task"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Vigência - início *
                <input
                  required
                  type="date"
                  value={catalogForm.valid_from}
                  onChange={(event) => handleCatalogChange('valid_from', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                />
              </label>
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Vigência - fim *
                <input
                  required
                  type="date"
                  value={catalogForm.valid_until}
                  onChange={(event) => handleCatalogChange('valid_until', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                />
              </label>
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Descrição
                <input
                  maxLength={1000}
                  value={catalogForm.description}
                  onChange={(event) => handleCatalogChange('description', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                  placeholder="Detalhe opcional"
                />
              </label>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-[12px] text-[#5B6B66]">
                O cadastro é auditado; o item entra como rascunho e só um homologador autorizado
                pode liberá-lo.
              </p>
              <button
                type="submit"
                disabled={isSubmittingCatalog}
                className="h-[46px] px-5 rounded-[10px] bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-semibold text-[14px] hover:shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition-all disabled:opacity-70 disabled:pointer-events-none inline-flex items-center justify-center gap-2 shrink-0"
              >
                <Boxes className="w-4 h-4" />
                {isSubmittingCatalog ? 'Cadastrando...' : 'Cadastrar item'}
              </button>
            </div>
          </form>

          <div className="mt-6 rounded-[12px] border border-[#E1E8E5] bg-[#F6F8F7] p-4 text-left">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-[14px] font-bold text-[#0F1F1C]">Itens do catálogo</h3>
                <p className="text-[12px] text-[#5B6B66] mt-1">
                  Homologação e inativação aparecem somente para quem tem permissão no servidor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadCatalog()}
                className="text-[12px] font-semibold text-[#047857] hover:underline"
              >
                Atualizar
              </button>
            </div>
            {isLoadingCatalog ? (
              <p className="text-[12px] text-[#5B6B66]">Carregando itens...</p>
            ) : catalogItems.length === 0 ? (
              <p className="text-[12px] text-[#5B6B66]">Nenhum item cadastrado ainda.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {catalogItems.map((item) => (
                  <div key={item.id} className="rounded-[9px] border border-[#E1E8E5] bg-white p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-[#0F1F1C]">
                        {item.name} · {item.item_type}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          item.status === 'homologado'
                            ? 'bg-[#ECFDF5] text-[#047857]'
                            : item.status === 'inativo'
                              ? 'bg-[#FFF7ED] text-[#C2410C]'
                              : 'bg-[#F1F5F4] text-[#5B6B66]'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-x-3 gap-y-1 text-[11px] text-[#5B6B66] sm:grid-cols-2">
                      <span>Família: {item.family}</span>
                      <span>Unidade: {item.unit}</span>
                      <span>Fonte: {item.source}</span>
                      {item.coefficient && <span>Coeficiente: {item.coefficient}</span>}
                      <span>
                        Vigência: {item.valid_from} a {item.valid_until}
                      </span>
                      {item.homologated_at && <span>Homologado em: {item.homologated_at}</span>}
                      {item.inactive_reason && (
                        <span>Motivo da inativação: {item.inactive_reason}</span>
                      )}
                    </div>
                    {canHomologateCatalog && item.status === 'rascunho' && (
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleHomologate(item.id)}
                          disabled={isSubmittingCatalog}
                          className="h-[30px] px-3 rounded-[8px] bg-[#064E3B] text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                        >
                          Homologar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeactivateTarget(item.id)}
                          disabled={isSubmittingCatalog}
                          className="h-[30px] px-3 rounded-[8px] bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                        >
                          Inativar
                        </button>
                      </div>
                    )}
                    {canHomologateCatalog && item.status === 'homologado' && (
                      <button
                        type="button"
                        onClick={() => setDeactivateTarget(item.id)}
                        disabled={isSubmittingCatalog}
                        className="mt-2 h-[30px] px-3 rounded-[8px] bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                      >
                        Inativar
                      </button>
                    )}
                    {deactivateTarget === item.id && (
                      <div className="mt-2 space-y-2 pt-2 border-t border-[#E1E8E5]">
                        <label className="block text-[12px] font-semibold text-[#0F1F1C]">
                          Justificativa da inativação *
                          <textarea
                            minLength={10}
                            maxLength={1000}
                            value={deactivateReason}
                            onChange={(event) => setDeactivateReason(event.target.value)}
                            className="mt-1.5 w-full min-h-[60px] rounded-[9px] border border-[#E1E8E5] bg-white p-2.5 text-[12px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                            placeholder="Explique por que o item está sendo inativado."
                          />
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleDeactivate(item.id)}
                            disabled={isSubmittingCatalog || deactivateReason.trim().length < 10}
                            className="h-[30px] px-3 rounded-[8px] bg-[#EA580C] text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                          >
                            Confirmar inativação
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeactivateTarget(null)
                              setDeactivateReason('')
                            }}
                            className="h-[30px] px-3 rounded-[8px] bg-white border border-[#E1E8E5] text-[#5B6B66] text-[11px] font-semibold"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl mt-6 bg-white rounded-[16px] p-6 sm:p-8 border border-[#E1E8E5] shadow-[0_12px_40px_rgba(2,44,34,0.06)]">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-11 h-11 rounded-[12px] bg-[#ECFDF5] text-[#047857] flex items-center justify-center shrink-0">
              <Snowflake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#0F1F1C]">Baseline</h2>
              <p className="text-[13px] text-[#5B6B66] mt-1">
                Congela o "antes" por família e classe de complexidade, usando a timeline e o tempo
                ativo já registrados. Snapshots são imutáveis e comparáveis pela mesma fronteira.
              </p>
            </div>
          </div>

          {baselineError && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-[#FEF2F2] border-l-4 border-[#DC2626] text-[#B91C1C] text-[13px] font-medium flex items-start gap-2.5"
              role="alert"
              aria-live="assertive"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{baselineError}</span>
            </div>
          )}

          {baselineInfo && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-[#ECFDF5] border-l-4 border-[#10B981] text-[#047857] text-[13px] font-medium"
              role="status"
              aria-live="polite"
            >
              {baselineInfo}
            </div>
          )}

          <form onSubmit={handleBaselineFreeze} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Família de serviço *
                <input
                  required
                  maxLength={120}
                  value={baselineForm.service_family}
                  onChange={(event) => handleBaselineChange('service_family', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                  placeholder="Informe a família, sem presumir o piloto"
                />
              </label>
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Classe de complexidade *
                <input
                  required
                  maxLength={120}
                  value={baselineForm.complexity_class}
                  onChange={(event) => handleBaselineChange('complexity_class', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                  placeholder="Ex.: baixa, média, alta"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Janela - início *
                <input
                  required
                  type="date"
                  value={baselineForm.window_start}
                  onChange={(event) => handleBaselineChange('window_start', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                />
              </label>
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Janela - fim *
                <input
                  required
                  type="date"
                  value={baselineForm.window_end}
                  onChange={(event) => handleBaselineChange('window_end', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                />
              </label>
              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Calendário *
                <input
                  required
                  maxLength={120}
                  value={baselineForm.calendar}
                  onChange={(event) => handleBaselineChange('calendar', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-[#E1E8E5] bg-white text-[14px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                  placeholder="Ex.: dias úteis, 8h/dia"
                />
              </label>
            </div>

            <label className="block text-[13px] font-semibold text-[#0F1F1C]">
              Critérios de confiabilidade *
              <textarea
                required
                minLength={10}
                maxLength={2000}
                value={baselineForm.reliability_criteria}
                onChange={(event) =>
                  handleBaselineChange('reliability_criteria', event.target.value)
                }
                className="mt-1.5 w-full min-h-[70px] rounded-[9px] border border-[#E1E8E5] bg-white p-2.5 text-[13px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                placeholder="Ex.: demandas com recebida e apta registradas; pausas justificadas excluídas"
              />
            </label>

            <label className="block text-[13px] font-semibold text-[#0F1F1C]">
              Motivo do congelamento *
              <textarea
                required
                minLength={10}
                maxLength={1000}
                value={baselineForm.freeze_reason}
                onChange={(event) => handleBaselineChange('freeze_reason', event.target.value)}
                className="mt-1.5 w-full min-h-[70px] rounded-[9px] border border-[#E1E8E5] bg-white p-2.5 text-[13px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                placeholder="Ex.: congelar o antes antes de usar dimensionamento e preço"
              />
            </label>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-[12px] text-[#5B6B66]">
                Os números são agregados pelo servidor a partir da timeline real; snapshots não
                podem ser editados.
              </p>
              <button
                type="submit"
                disabled={isSubmittingBaseline}
                className="h-[46px] px-5 rounded-[10px] bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-semibold text-[14px] hover:shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition-all disabled:opacity-70 disabled:pointer-events-none inline-flex items-center justify-center gap-2 shrink-0"
              >
                <Snowflake className="w-4 h-4" />
                {isSubmittingBaseline ? 'Congelando...' : 'Congelar baseline'}
              </button>
            </div>
          </form>

          <div className="mt-6 rounded-[12px] border border-[#E1E8E5] bg-[#F6F8F7] p-4 text-left">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-[14px] font-bold text-[#0F1F1C]">Baselines congelados</h3>
                <p className="text-[12px] text-[#5B6B66] mt-1">
                  Snapshots imutáveis; a comparação com o resultado entra nas próximas tasks.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadBaselines()}
                className="text-[12px] font-semibold text-[#047857] hover:underline"
              >
                Atualizar
              </button>
            </div>
            {isLoadingBaselines ? (
              <p className="text-[12px] text-[#5B6B66]">Carregando baselines...</p>
            ) : baselines.length === 0 ? (
              <p className="text-[12px] text-[#5B6B66]">Nenhum baseline congelado ainda.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {baselines.map((baseline) => (
                  <div
                    key={baseline.id}
                    className="rounded-[9px] border border-[#E1E8E5] bg-white p-3"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-[#0F1F1C]">
                        {baseline.service_family} · {baseline.complexity_class}
                      </span>
                      <span className="text-[10px] font-semibold text-[#5B6B66]">
                        congelado em {baseline.frozen_at}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-x-3 gap-y-1 text-[11px] text-[#5B6B66] sm:grid-cols-2">
                      <span>
                        Janela: {baseline.window_start} a {baseline.window_end}
                      </span>
                      <span>Calendário: {baseline.calendar}</span>
                      <span>Volume: {baseline.volume} demanda(s)</span>
                      <span>Recebida→Apta: {formatDuration(baseline.received_to_apt_ms)}</span>
                      <span>Apta→Pronta: {formatDuration(baseline.apt_to_ready_ms)}</span>
                      <span>Pronta→Enviada: {formatDuration(baseline.ready_to_sent_ms)}</span>
                      <span>Tempo ativo somado: {formatDuration(baseline.active_time_ms)}</span>
                    </div>
                    <p className="mt-2 text-[11px] text-[#5B6B66]">
                      <span className="font-semibold text-[#0F1F1C]">Confiabilidade:</span>{' '}
                      {baseline.reliability_criteria}
                    </p>
                    <p className="mt-1 text-[11px] text-[#5B6B66]">
                      <span className="font-semibold text-[#0F1F1C]">Motivo:</span>{' '}
                      {baseline.freeze_reason}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {createdOpportunity && (
          <section className="mx-auto w-full max-w-5xl mt-6 bg-white rounded-[16px] p-6 sm:p-8 border border-[#E1E8E5] shadow-[0_12px_40px_rgba(2,44,34,0.06)]">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-11 h-11 rounded-[12px] bg-[#ECFDF5] text-[#047857] flex items-center justify-center shrink-0">
                <Timer className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[#0F1F1C]">Marcos e tempo</h2>
                <p className="text-[13px] text-[#5B6B66] mt-1">
                  Timeline com timestamps do servidor e tempo ativo por etapa; a pausa exige
                  justificativa.
                </p>
              </div>
            </div>

            {trackingError && (
              <div
                className="mb-5 p-3.5 rounded-[12px] bg-[#FEF2F2] border-l-4 border-[#DC2626] text-[#B91C1C] text-[13px] font-medium flex items-start gap-2.5"
                role="alert"
                aria-live="assertive"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{trackingError}</span>
              </div>
            )}

            {trackingInfo && (
              <div
                className="mb-5 p-3.5 rounded-[12px] bg-[#ECFDF5] border-l-4 border-[#10B981] text-[#047857] text-[13px] font-medium"
                role="status"
                aria-live="polite"
              >
                {trackingInfo}
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[12px] border border-[#E1E8E5] bg-[#F6F8F7] p-4 text-left">
                <h3 className="text-[14px] font-bold text-[#0F1F1C] mb-3">Timeline de marcos</h3>
                {events.length === 0 ? (
                  <p className="text-[12px] text-[#5B6B66]">
                    Nenhum marco registrado para esta oportunidade.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {events.map((event) => (
                      <li key={event.id} className="flex items-start gap-2">
                        <span
                          className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                            event.milestone === 'sent'
                              ? 'bg-[#10B981]'
                              : event.milestone === 'ready'
                                ? 'bg-[#059669]'
                                : event.milestone === 'apt'
                                  ? 'bg-[#0EA5E9]'
                                  : 'bg-[#5B6B66]'
                          }`}
                        />
                        <div>
                          <p className="text-[12px] font-semibold text-[#0F1F1C]">
                            {event.milestone === 'received'
                              ? 'Recebida'
                              : event.milestone === 'apt'
                                ? 'Apta'
                                : event.milestone === 'ready'
                                  ? 'Pronta'
                                  : 'Enviada'}
                            <span className="font-normal text-[#5B6B66]">
                              {' '}
                              · {event.occurred_at}
                            </span>
                          </p>
                          {event.note && <p className="text-[11px] text-[#5B6B66]">{event.note}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleRecordMilestone('ready')}
                    disabled={isSubmittingTracking}
                    className="h-[34px] px-3 rounded-[9px] bg-[#064E3B] text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                  >
                    Marcar pronta
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRecordMilestone('sent')}
                    disabled={isSubmittingTracking}
                    className="h-[34px] px-3 rounded-[9px] bg-[#10B981] text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                  >
                    Marcar enviada
                  </button>
                </div>
              </div>

              <div className="rounded-[12px] border border-[#E1E8E5] bg-[#F6F8F7] p-4 text-left">
                <h3 className="text-[14px] font-bold text-[#0F1F1C] mb-3">Tempo ativo</h3>
                {timeEntries.length === 0 ? (
                  <p className="text-[12px] text-[#5B6B66]">
                    Nenhum registro de tempo para esta oportunidade.
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-40 overflow-y-auto">
                    {timeEntries.map((entry) => (
                      <li key={entry.id} className="text-[11px] text-[#5B6B66]">
                        <span className="font-semibold text-[#0F1F1C]">{entry.stage}</span> · início{' '}
                        {entry.started_at}
                        {entry.ended_at ? ` · fim ${entry.ended_at}` : ' · em andamento'}
                        {entry.pause_reason && ` · pausa: ${entry.pause_reason}`}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 space-y-2">
                  <label className="block text-[12px] font-semibold text-[#0F1F1C]">
                    Etapa
                    <select
                      value={timeStage}
                      onChange={(event) => setTimeStage(event.target.value)}
                      disabled={!!openTimeEntry}
                      className="mt-1 w-full h-[38px] rounded-[9px] border border-[#E1E8E5] bg-white px-2.5 text-[12px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15 disabled:opacity-60"
                    >
                      <option value="qualificacao">Qualificação</option>
                      <option value="portal">Portal</option>
                      <option value="ficha_tecnica">Ficha técnica</option>
                      <option value="revisao">Revisão</option>
                      <option value="outro">Outro</option>
                    </select>
                  </label>
                  {openTimeEntry && (
                    <label className="block text-[12px] font-semibold text-[#0F1F1C]">
                      Justificativa da pausa *
                      <textarea
                        maxLength={500}
                        value={pauseReason}
                        onChange={(event) => setPauseReason(event.target.value)}
                        className="mt-1 w-full min-h-[60px] rounded-[9px] border border-[#E1E8E5] bg-white p-2.5 text-[12px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                        placeholder="Ex.: aguardando retorno do cliente"
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleStartStopTime()}
                    disabled={isSubmittingTracking}
                    className={`h-[34px] px-3 rounded-[9px] text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none ${
                      openTimeEntry ? 'bg-[#EA580C]' : 'bg-[#0EA5E9]'
                    }`}
                  >
                    {openTimeEntry ? 'Encerrar tempo com justificativa' : 'Iniciar tempo'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {createdOpportunity && (
          <section className="mx-auto w-full max-w-5xl mt-6 bg-white rounded-[16px] p-6 sm:p-8 border border-[#E1E8E5] shadow-[0_12px_40px_rgba(2,44,34,0.06)]">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-11 h-11 rounded-[12px] bg-[#ECFDF5] text-[#047857] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[#0F1F1C]">Ficha técnica</h2>
                <p className="text-[13px] text-[#5B6B66] mt-1">
                  Cada salvamento cria uma nova versão com autor e origem definidos pelo servidor.
                  Versões anteriores permanecem intactas.
                </p>
              </div>
            </div>

            {techSheetError && (
              <div
                className="mb-5 p-3.5 rounded-[12px] bg-[#FEF2F2] border-l-4 border-[#DC2626] text-[#B91C1C] text-[13px] font-medium flex items-start gap-2.5"
                role="alert"
                aria-live="assertive"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{techSheetError}</span>
              </div>
            )}

            {techSheetCreated && (
              <div
                className="mb-5 p-3.5 rounded-[12px] bg-[#ECFDF5] border-l-4 border-[#10B981] text-[#047857] text-[13px] font-medium flex items-start gap-2.5"
                role="status"
                aria-live="polite"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p>
                    Versão {techSheetCreated.version} registrada com autor e origem verificados.
                  </p>
                  <p className="font-normal mt-1">Versões anteriores permanecem inalteradas.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleTechSheetSubmit} className="space-y-4" noValidate>
              <div className="space-y-3">
                {techSheetForm.map((parameter, index) => (
                  <div
                    key={index}
                    className="rounded-[12px] border border-[#E1E8E5] bg-[#F6F8F7] p-4"
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[12px] font-bold uppercase tracking-wider text-[#5B6B66]">
                        Parâmetro {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleTechSheetRemoveParameter(index)}
                        className="text-[11px] font-semibold text-[#EA580C] hover:underline"
                      >
                        Remover
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-[12px] font-semibold text-[#0F1F1C]">
                        Nome *
                        <input
                          required
                          maxLength={120}
                          value={parameter.name}
                          onChange={(event) =>
                            handleTechSheetParameterChange(index, 'name', event.target.value)
                          }
                          className="mt-1.5 w-full h-[40px] px-3 rounded-[9px] border border-[#E1E8E5] bg-white text-[13px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                          placeholder="Ex.: espessura da camada"
                        />
                      </label>
                      <label className="block text-[12px] font-semibold text-[#0F1F1C]">
                        Valor *
                        <input
                          required
                          maxLength={200}
                          value={parameter.value}
                          onChange={(event) =>
                            handleTechSheetParameterChange(index, 'value', event.target.value)
                          }
                          className="mt-1.5 w-full h-[40px] px-3 rounded-[9px] border border-[#E1E8E5] bg-white text-[13px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                          placeholder="Ex.: 3,0"
                        />
                      </label>
                      <label className="block text-[12px] font-semibold text-[#0F1F1C]">
                        Unidade *
                        <input
                          required
                          maxLength={40}
                          value={parameter.unit}
                          onChange={(event) =>
                            handleTechSheetParameterChange(index, 'unit', event.target.value)
                          }
                          className="mt-1.5 w-full h-[40px] px-3 rounded-[9px] border border-[#E1E8E5] bg-white text-[13px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                          placeholder="Ex.: mm"
                        />
                      </label>
                      <label className="block text-[12px] font-semibold text-[#0F1F1C]">
                        Origem *
                        <input
                          required
                          maxLength={120}
                          value={parameter.origin}
                          onChange={(event) =>
                            handleTechSheetParameterChange(index, 'origin', event.target.value)
                          }
                          className="mt-1.5 w-full h-[40px] px-3 rounded-[9px] border border-[#E1E8E5] bg-white text-[13px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                          placeholder="Ex.: visita técnica, planta, cliente"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleTechSheetAddParameter}
                className="text-[12px] font-semibold text-[#047857] hover:underline"
              >
                + Adicionar parâmetro
              </button>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                  Pendências (uma por linha)
                  <textarea
                    maxLength={3000}
                    value={techSheetPending}
                    onChange={(event) => setTechSheetPending(event.target.value)}
                    className="mt-1.5 w-full min-h-[76px] rounded-[9px] border border-[#E1E8E5] bg-white p-2.5 text-[13px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                    placeholder="Ex.: aguardando planta atualizada"
                  />
                </label>
                <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                  Observações
                  <textarea
                    maxLength={2000}
                    value={techSheetNotes}
                    onChange={(event) => setTechSheetNotes(event.target.value)}
                    className="mt-1.5 w-full min-h-[76px] rounded-[9px] border border-[#E1E8E5] bg-white p-2.5 text-[13px] font-normal outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/15"
                    placeholder="Contexto adicional da versão"
                  />
                </label>
              </div>

              <label className="block text-[13px] font-semibold text-[#0F1F1C]">
                Anexos (até 10 arquivos)
                <input
                  type="file"
                  multiple
                  onChange={(event) => setTechSheetFiles(Array.from(event.target.files ?? []))}
                  className="mt-1.5 w-full text-[13px] text-[#5B6B66] file:mr-3 file:h-[38px] file:px-3 file:rounded-[9px] file:border-0 file:bg-[#064E3B] file:text-white file:text-[12px] file:font-semibold file:cursor-pointer"
                />
              </label>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-[12px] text-[#5B6B66]">
                  O autor e o número da versão são definidos pelo servidor.
                </p>
                <button
                  type="submit"
                  disabled={isSubmittingTechSheet}
                  className="h-[46px] px-5 rounded-[10px] bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-semibold text-[14px] hover:shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition-all disabled:opacity-70 disabled:pointer-events-none inline-flex items-center justify-center gap-2 shrink-0"
                >
                  <FileText className="w-4 h-4" />
                  {isSubmittingTechSheet ? 'Salvando...' : 'Salvar nova versão'}
                </button>
              </div>
            </form>

            <div className="mt-6 rounded-[12px] border border-[#E1E8E5] bg-[#F6F8F7] p-4 text-left">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-[14px] font-bold text-[#0F1F1C]">Histórico de versões</h3>
                  <p className="text-[12px] text-[#5B6B66] mt-1">
                    Versões anteriores são imutáveis e mantêm autor e origem.
                  </p>
                </div>
                {createdOpportunity && (
                  <button
                    type="button"
                    onClick={() => void loadTechSheets(createdOpportunity.id)}
                    className="text-[12px] font-semibold text-[#047857] hover:underline"
                  >
                    Atualizar
                  </button>
                )}
              </div>
              {isLoadingTechSheets ? (
                <p className="text-[12px] text-[#5B6B66]">Carregando histórico...</p>
              ) : techSheetHistory.length === 0 ? (
                <p className="text-[12px] text-[#5B6B66]">
                  Nenhuma versão registrada para esta oportunidade.
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {techSheetHistory.map((sheet) => (
                    <div
                      key={sheet.id}
                      className="rounded-[9px] border border-[#E1E8E5] bg-white p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-bold text-[#0F1F1C]">
                          Versão {sheet.version}
                        </span>
                        <span className="text-[10px] font-semibold text-[#5B6B66]">
                          {sheet.createdAt}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-[#5B6B66]">
                        <p className="font-semibold text-[#0F1F1C]">Parâmetros</p>
                        <ul className="mt-1 space-y-0.5">
                          {sheet.parameters.map((parameter, parameterIndex) => (
                            <li key={parameterIndex}>
                              {parameter.name}: {parameter.value} {parameter.unit} · origem:{' '}
                              {parameter.origin}
                            </li>
                          ))}
                        </ul>
                        {sheet.pendingItems.length > 0 && (
                          <div className="mt-2">
                            <p className="font-semibold text-[#C2410C]">Pendências</p>
                            <ul className="list-disc pl-5 mt-1 space-y-0.5">
                              {sheet.pendingItems.map((item, itemIndex) => (
                                <li key={itemIndex}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {sheet.notes && <p className="mt-2">Observações: {sheet.notes}</p>}
                        {sheet.attachments.length > 0 && (
                          <div className="mt-2">
                            <p className="font-semibold text-[#0F1F1C]">Anexos</p>
                            <ul className="mt-1 space-y-0.5">
                              {sheet.attachments.map((filename) => (
                                <li key={filename}>
                                  <a
                                    href={techSheetFileUrl(sheet, filename)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[#047857] hover:underline break-all"
                                  >
                                    {filename}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default Dashboard
