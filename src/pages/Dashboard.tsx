import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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
  createTimeQualityReview,
  getTimeQualityReviews,
  type TimeQualityReviewRecord,
} from '@/services/timeQuality'
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
import {
  approveProposalTemplate,
  createProposalTemplate,
  getProposalTemplates,
  proposalTemplateFileUrl,
  type ProposalTemplateRecord,
} from '@/services/proposalTemplates'
import {
  attemptProposalPreviewSend,
  createProposalPreview,
  formatProposalDate,
  getApprovedProposalTemplates,
  getProposalPreviews,
  proposalFamilyLabel,
  proposalFixedSystemCopy,
  type CreateProposalPreviewInput,
  type ProposalAreaRow,
  type ProposalPreviewRecord,
  type ProposalTemplateMatrixItem,
} from '@/services/proposalPreviews'
import { approveReadiness, getReadiness, type ReadinessStatus } from '@/services/dimensioning'

import { getErrorMessage } from '@/lib/pocketbase/errors'
import { hasPermission, ROLE_LABELS } from '@/lib/auth/permissions'
import { buildSlaOptions } from '@/lib/readinessOptions'
import { MercoLogo, MercoMark } from '@/components/MercoLogo'
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
  Plus,
  Printer,
  Scale,
  Send,
  ShieldCheck,
  Snowflake,
  Timer,
  Trash2,
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
  const [timeQualityReviews, setTimeQualityReviews] = useState<TimeQualityReviewRecord[]>([])
  const [timeQualityForm, setTimeQualityForm] = useState({
    week_start: '',
    week_end: '',
    criteria:
      'Timestamps server-side; sequência recebida→apta→pronta→enviada; intervalos encerrados com justificativa de pausa; demandas sem classe não entram na comparação.',
  })
  const [timeQualityError, setTimeQualityError] = useState<string | null>(null)
  const [timeQualityInfo, setTimeQualityInfo] = useState<string | null>(null)
  const [isSubmittingTimeQuality, setIsSubmittingTimeQuality] = useState(false)
  const [isLoadingTimeQuality, setIsLoadingTimeQuality] = useState(true)
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
  const [readinessStatus, setReadinessStatus] = useState<ReadinessStatus | null>(null)
  const [readinessError, setReadinessError] = useState<string | null>(null)
  const [readinessInfo, setReadinessInfo] = useState<string | null>(null)
  const [isLoadingReadiness, setIsLoadingReadiness] = useState(true)
  const [isApprovingReadiness, setIsApprovingReadiness] = useState(false)
  const [readinessForm, setReadinessForm] = useState({
    pilot_family: '',
    pilot_owner: '',
    pilot_reason: '',
    sla_record_id: '',
    baseline_id: '',
    recovery_evidence_ref: '',
    phase1_receipt_ref: '',
  })

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

  // T2.34: seleção por rótulos, sem digitar IDs. As opções vêm das consultas
  // seguras já existentes (pilot_params e baseline_snapshots); o ID vai por baixo
  // e o payload enviado continua exatamente o mesmo (backend revalida).
  const slaOptions = buildSlaOptions(pilotParams)
  const baselineOptions = baselines
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
  const [proposalTemplates, setProposalTemplates] = useState<ProposalTemplateRecord[]>([])
  const [proposalTemplateForm, setProposalTemplateForm] = useState({
    family: 'poliureia' as 'poliureia' | 'geotecnia',
    name: '',
    model_number: '',
    file: null as File | null,
  })
  const [proposalTemplateError, setProposalTemplateError] = useState<string | null>(null)
  const [proposalTemplateInfo, setProposalTemplateInfo] = useState<string | null>(null)
  const [isSubmittingProposalTemplate, setIsSubmittingProposalTemplate] = useState(false)
  const [isLoadingProposalTemplates, setIsLoadingProposalTemplates] = useState(true)
  const [approvedProposalTemplates, setApprovedProposalTemplates] = useState<
    ProposalTemplateMatrixItem[]
  >([])
  const [proposalPreviews, setProposalPreviews] = useState<ProposalPreviewRecord[]>([])
  const [activeProposalPreview, setActiveProposalPreview] = useState<ProposalPreviewRecord | null>(
    null,
  )
  const [proposalPreviewForm, setProposalPreviewForm] = useState<CreateProposalPreviewInput>({
    opportunity_id: '',
    template_id: '',
    family: 'poliureia',
    proposal_number: '',
    revision: 'REV 00',
    proposal_date: new Date().toISOString().slice(0, 10),
    city: '',
    customer_name: '',
    customer_cnpj: '',
    customer_address: '',
    contact_name: '',
    contact_email: '',
    local_obra: '',
    surface_type: '',
    solution_proposed: '',
    execution_start: '',
    execution_deadline: '',
    areas: [{ item: '01', local: '', area: '', pathology: '', solution: '' }],
  })
  const [proposalPreviewError, setProposalPreviewError] = useState<string | null>(null)
  const [proposalPreviewInfo, setProposalPreviewInfo] = useState<string | null>(null)
  const [isSubmittingProposalPreview, setIsSubmittingProposalPreview] = useState(false)
  const [isLoadingApprovedProposalTemplates, setIsLoadingApprovedProposalTemplates] = useState(true)
  const [isLoadingProposalPreviews, setIsLoadingProposalPreviews] = useState(false)

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

  const loadReadiness = async () => {
    setIsLoadingReadiness(true)
    try {
      const result = await getReadiness()
      setReadinessStatus(result)
      setReadinessError(null)
    } catch (error: unknown) {
      setReadinessError(getErrorMessage(error))
    } finally {
      setIsLoadingReadiness(false)
    }
  }

  useEffect(() => {
    void loadReadiness()
  }, [])

  const handleReadinessChange = (field: string, value: string) => {
    setReadinessForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleReadinessApprove = async (event: React.FormEvent) => {
    event.preventDefault()
    setReadinessError(null)
    setReadinessInfo(null)
    setIsApprovingReadiness(true)
    try {
      const result = await approveReadiness({
        pilot_family: readinessForm.pilot_family,
        pilot_owner: readinessForm.pilot_owner,
        pilot_reason: readinessForm.pilot_reason,
        sla_record_id: readinessForm.sla_record_id,
        baseline_id: readinessForm.baseline_id,
        recovery_evidence_ref: readinessForm.recovery_evidence_ref,
        phase1_receipt_ref: readinessForm.phase1_receipt_ref,
      })
      setReadinessInfo(
        'Prontidão aprovada para a família ' + result.family + ' em ' + result.approvedAt + '.',
      )
      void loadReadiness()
    } catch (error: unknown) {
      setReadinessError(getErrorMessage(error))
    } finally {
      setIsApprovingReadiness(false)
    }
  }

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
      const submittedOpportunity = {
        customer_name: opportunity.customer_name.trim(),
        contact_name: opportunity.contact_name.trim(),
        contact_email: opportunity.contact_email?.trim() || '',
        origin: opportunity.origin.trim(),
        service_family: opportunity.service_family.trim(),
        location: opportunity.location.trim(),
        demand_date: opportunity.demand_date,
        deadline_date: opportunity.deadline_date || '',
      }
      const result = await createOpportunity({
        ...submittedOpportunity,
        contact_email: submittedOpportunity.contact_email || undefined,
        deadline_date: submittedOpportunity.deadline_date || undefined,
      })
      const matchedFamily = matchingFamilyForOpportunity(submittedOpportunity.service_family)
      const family = matchedFamily || proposalPreviewForm.family
      const firstTemplate = approvedProposalTemplates.find((item) => item.family === family)
      setSelectedOpportunityId(result.id)
      setCreatedOpportunity(result)
      setProposalPreviewForm((current) => ({
        ...current,
        opportunity_id: result.id,
        family,
        template_id: firstTemplate?.id || '',
        customer_name: submittedOpportunity.customer_name,
        contact_name: submittedOpportunity.contact_name,
        contact_email: submittedOpportunity.contact_email,
        local_obra: submittedOpportunity.location,
      }))
      setProposalPreviewInfo(null)
      setProposalPreviewError(null)
      setOpportunity(emptyOpportunity)
      await loadOpportunities()
      await loadProposalPreviews(result.id)
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

  const loadTimeQualityReviews = async () => {
    setIsLoadingTimeQuality(true)
    try {
      const result = await getTimeQualityReviews()
      setTimeQualityReviews(result.items)
      setTimeQualityError(null)
    } catch (error: unknown) {
      setTimeQualityError(getErrorMessage(error))
    } finally {
      setIsLoadingTimeQuality(false)
    }
  }

  useEffect(() => {
    void loadTimeQualityReviews()
  }, [])

  const handleTimeQualityChange = (field: keyof typeof timeQualityForm, value: string) => {
    setTimeQualityForm((current) => ({ ...current, [field]: value }))
    setTimeQualityError(null)
    setTimeQualityInfo(null)
  }

  const handleTimeQualityReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTimeQualityError(null)
    setTimeQualityInfo(null)
    setIsSubmittingTimeQuality(true)
    try {
      const result = await createTimeQualityReview({
        week_start: timeQualityForm.week_start,
        week_end: timeQualityForm.week_end,
        criteria: timeQualityForm.criteria.trim(),
      })
      setTimeQualityInfo(
        result.status === 'aprovado'
          ? 'Revisão assinada e aprovada para comparação.'
          : result.status === 'sem_amostra'
            ? 'Revisão assinada sem amostra; nenhuma comparação foi liberada.'
            : 'Revisão assinada com pendências; a comparação permanece bloqueada.',
      )
      await loadTimeQualityReviews()
    } catch (error: unknown) {
      setTimeQualityError(getErrorMessage(error))
    } finally {
      setIsSubmittingTimeQuality(false)
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

  const loadProposalTemplates = async () => {
    setIsLoadingProposalTemplates(true)
    try {
      setProposalTemplates(await getProposalTemplates())
      setProposalTemplateError(null)
    } catch (error: unknown) {
      setProposalTemplateError(getErrorMessage(error))
    } finally {
      setIsLoadingProposalTemplates(false)
    }
  }

  useEffect(() => {
    void loadProposalTemplates()
  }, [])

  const handleProposalTemplateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setProposalTemplateError(null)
    setProposalTemplateInfo(null)
    if (!proposalTemplateForm.file) {
      setProposalTemplateError('Anexe o modelo DOCX real da Mercogeo.')
      return
    }
    if (
      proposalTemplateForm.file.type !==
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
      !proposalTemplateForm.file.name.toLowerCase().endsWith('.docx')
    ) {
      setProposalTemplateError('O modelo deve ser um arquivo DOCX.')
      return
    }
    setIsSubmittingProposalTemplate(true)
    try {
      const result = await createProposalTemplate({
        family: proposalTemplateForm.family,
        name: proposalTemplateForm.name.trim(),
        model_number: proposalTemplateForm.model_number.trim(),
        file: proposalTemplateForm.file,
        variable_fields: [
          'numero_proposta',
          'revisao',
          'data',
          'cidade',
          'cliente_nome',
          'cliente_cnpj',
          'cliente_endereco',
          'cliente_contato',
          'cliente_email',
          'local_obra',
          'tipo_superficie',
          'tabela_areas',
          'solucao_proposta',
          'prazo_execucao',
          'familia',
        ],
      })
      setProposalTemplateInfo(
        `Modelo enviado como ${result.status}. Aguarda aprovação de Engenharia/Admin.`,
      )
      setProposalTemplateForm({ family: 'poliureia', name: '', model_number: '', file: null })
      await loadProposalTemplates()
    } catch (error: unknown) {
      setProposalTemplateError(getErrorMessage(error))
    } finally {
      setIsSubmittingProposalTemplate(false)
    }
  }

  const handleProposalTemplateApprove = async (templateId: string) => {
    setProposalTemplateError(null)
    setProposalTemplateInfo(null)
    setIsSubmittingProposalTemplate(true)
    try {
      const result = await approveProposalTemplate(templateId)
      setProposalTemplateInfo(`Modelo aprovado às ${result.approvedAt}.`)
      await loadProposalTemplates()
    } catch (error: unknown) {
      setProposalTemplateError(getErrorMessage(error))
    } finally {
      setIsSubmittingProposalTemplate(false)
    }
  }

  const loadApprovedProposalTemplates = async () => {
    setIsLoadingApprovedProposalTemplates(true)
    try {
      const result = await getApprovedProposalTemplates()
      setApprovedProposalTemplates(result.items)
      setProposalPreviewError(null)
    } catch (error: unknown) {
      setProposalPreviewError(getErrorMessage(error))
    } finally {
      setIsLoadingApprovedProposalTemplates(false)
    }
  }

  const loadProposalPreviews = async (opportunityId?: string) => {
    setIsLoadingProposalPreviews(true)
    try {
      const result = await getProposalPreviews(opportunityId)
      setProposalPreviews(result.items)
      setProposalPreviewError(null)
    } catch (error: unknown) {
      setProposalPreviews([])
      setProposalPreviewError(getErrorMessage(error))
    } finally {
      setIsLoadingProposalPreviews(false)
    }
  }

  useEffect(() => {
    void loadApprovedProposalTemplates()
  }, [])

  const matchingFamilyForOpportunity = (serviceFamily: string) => {
    const normalized = serviceFamily.trim().toLowerCase()
    if (normalized.includes('geotecnia')) return 'geotecnia' as const
    if (normalized.includes('poliureia')) return 'poliureia' as const
    return null
  }

  const syncProposalFormWithOpportunity = (opportunityId: string) => {
    const selected = opportunities.find((item) => item.id === opportunityId)
    if (!selected) return
    const matchedFamily = matchingFamilyForOpportunity(selected.service_family)
    const family = matchedFamily || proposalPreviewForm.family
    const firstTemplate = approvedProposalTemplates.find((item) => item.family === family)
    setSelectedOpportunityId(opportunityId)
    setCreatedOpportunity({
      id: selected.id,
      receivedAt: selected.received_at,
      status: selected.status,
    })
    setProposalPreviewForm((current) => ({
      ...current,
      opportunity_id: selected.id,
      family,
      template_id: firstTemplate?.id || '',
      customer_name: selected.customer_name,
      contact_name: selected.contact_name,
      contact_email: selected.contact_email || '',
      local_obra: selected.location,
    }))
    setProposalPreviewInfo(null)
    setProposalPreviewError(null)
    void loadProposalPreviews(opportunityId)
  }

  const handleProposalPreviewFieldChange = (
    field: keyof Omit<CreateProposalPreviewInput, 'areas'>,
    value: string,
  ) => {
    setProposalPreviewForm((current) => ({ ...current, [field]: value }))
    setProposalPreviewError(null)
    setProposalPreviewInfo(null)
  }

  const handleProposalPreviewFamilyChange = (family: 'poliureia' | 'geotecnia') => {
    const firstTemplate = approvedProposalTemplates.find((item) => item.family === family)
    setProposalPreviewForm((current) => ({
      ...current,
      family,
      template_id: firstTemplate?.id || '',
    }))
    setProposalPreviewError(null)
    setProposalPreviewInfo(null)
  }

  const handleProposalPreviewAreaChange = (
    index: number,
    field: keyof ProposalAreaRow,
    value: string,
  ) => {
    setProposalPreviewForm((current) => ({
      ...current,
      areas: current.areas.map((area, areaIndex) =>
        areaIndex === index ? { ...area, [field]: value } : area,
      ),
    }))
    setProposalPreviewError(null)
  }

  const handleProposalPreviewAddArea = () => {
    setProposalPreviewForm((current) => ({
      ...current,
      areas: [
        ...current.areas,
        {
          item: String(current.areas.length + 1).padStart(2, '0'),
          local: '',
          area: '',
          pathology: '',
          solution: '',
        },
      ],
    }))
  }

  const handleProposalPreviewRemoveArea = (index: number) => {
    setProposalPreviewForm((current) => ({
      ...current,
      areas:
        current.areas.length <= 1
          ? current.areas
          : current.areas.filter((_, areaIndex) => areaIndex !== index),
    }))
  }

  const handleProposalPreviewSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setProposalPreviewError(null)
    setProposalPreviewInfo(null)
    if (!proposalPreviewForm.opportunity_id) {
      setProposalPreviewError('Selecione uma demanda antes de gerar a prévia.')
      return
    }
    if (!proposalPreviewForm.template_id) {
      setProposalPreviewError('Selecione um modelo aprovado da família escolhida.')
      return
    }
    setIsSubmittingProposalPreview(true)
    try {
      const result = await createProposalPreview({
        ...proposalPreviewForm,
        proposal_number: proposalPreviewForm.proposal_number.trim(),
        revision: proposalPreviewForm.revision.trim(),
        city: proposalPreviewForm.city.trim(),
        customer_name: proposalPreviewForm.customer_name.trim(),
        customer_cnpj: proposalPreviewForm.customer_cnpj.trim(),
        customer_address: proposalPreviewForm.customer_address.trim(),
        contact_name: proposalPreviewForm.contact_name.trim(),
        contact_email: proposalPreviewForm.contact_email?.trim() || undefined,
        local_obra: proposalPreviewForm.local_obra.trim(),
        surface_type: proposalPreviewForm.surface_type.trim(),
        solution_proposed: proposalPreviewForm.solution_proposed.trim(),
        execution_start: proposalPreviewForm.execution_start.trim(),
        execution_deadline: proposalPreviewForm.execution_deadline.trim(),
        areas: proposalPreviewForm.areas.map((area) => ({
          item: area.item.trim(),
          local: area.local.trim(),
          area: area.area.trim(),
          pathology: area.pathology.trim(),
          solution: area.solution.trim(),
        })),
      })
      setActiveProposalPreview(result)
      setProposalPreviewInfo(
        'Prévia criada. Ela está marcada SEM PREÇO — NÃO ENVIAR e não contém valores de faturamento.',
      )
      await loadProposalPreviews(proposalPreviewForm.opportunity_id)
    } catch (error: unknown) {
      setProposalPreviewError(getErrorMessage(error))
    } finally {
      setIsSubmittingProposalPreview(false)
    }
  }

  const handleProposalPreviewSendAttempt = async () => {
    if (!activeProposalPreview) return
    setProposalPreviewError(null)
    setProposalPreviewInfo(null)
    setIsSubmittingProposalPreview(true)
    try {
      const result = await attemptProposalPreviewSend(activeProposalPreview.id)
      setProposalPreviewInfo(result.errorDetail)
    } catch (error: unknown) {
      setProposalPreviewError(getErrorMessage(error))
    } finally {
      setIsSubmittingProposalPreview(false)
    }
  }

  const handleProposalPreviewPrint = () => {
    document.body.classList.add('printing-proposal-preview')
    window.print()
    window.setTimeout(() => document.body.classList.remove('printing-proposal-preview'), 500)
  }

  const formatDuration = (ms: number) => {
    if (!ms) return 'sem amostra'
    const hours = ms / 3600000
    if (hours >= 24) return `${(hours / 24).toFixed(1)} dias`
    if (hours >= 1) return `${hours.toFixed(1)} h`
    return `${Math.round(ms / 60000)} min`
  }

  const location = useLocation()
  const sectionKey = new URLSearchParams(location.search).get('secao')
  useEffect(() => {
    if (!sectionKey) return
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(`secao-${sectionKey}`)
      if (target) {
        target.scrollIntoView({ block: 'start' })
        target.focus({ preventScroll: true })
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [sectionKey, createdOpportunity])

  const rawName = user?.name || user?.email?.split('@')[0] || 'Usuário'
  const firstName = rawName.split(' ')[0]
  const initial = (firstName[0] || 'U').toUpperCase()
  const role = user?.role
  const localPermission = hasPermission(role, 'homologateCatalog')
  const canHomologateCatalog = serverPermission === 'allowed' && localPermission
  const localReadinessPermission = hasPermission(role, 'approveReadiness')
  const canApproveReadiness = serverPermission === 'allowed' && localReadinessPermission

  const permissionMessage =
    serverPermission === 'loading'
      ? 'Verificando a permissão no servidor...'
      : serverPermission === 'unavailable'
        ? 'Não foi possível verificar a permissão no servidor. Acesso bloqueado por segurança.'
        : canHomologateCatalog
          ? 'Seu papel permite homologar o catálogo.'
          : 'Acesso negado: somente Engenharia ou Administrador podem homologar.'

  // Cada seção abre como página própria: as outras ficam ocultas (antes todas
  // eram empilhadas numa tela só). O id vem de uma lista fechada, sem injeção.
  const KNOWN_SECTIONS = ['demanda', 'ficha', 'biblioteca', 'prontidao', 'catalogo', 'backup', 'modelos', 'previa', 'fontes', 'gates', 'sla', 'baseline', 'qualidade', 'tempo']
  const focusedSection = sectionKey && KNOWN_SECTIONS.includes(sectionKey) ? sectionKey : ''

  return (
    <div className="mg-legacy min-h-screen w-full bg-mg-canvas flex flex-col font-sans antialiased text-mg-ink">
      {focusedSection && (
        <style>{`.mg-legacy section:has(h2[id^="secao-"]):not(:has(#secao-${focusedSection})) { display: none; }`}</style>
      )}
      <header
        hidden
        style={{ display: 'none' }}
        className="w-full h-16 bg-mg-surface border-b border-mg-line px-4 sm:px-8 flex items-center justify-between shadow-xs sticky top-0 z-20"
      >
        <div className="flex items-center">
          <MercoLogo size={36} showWordmark={true} lightTheme={true} />
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-mg-brand-fill text-white flex items-center justify-center font-bold text-sm shadow-xs select-none">
              {initial}
            </div>
            <span className="hidden sm:inline-block text-[14px] font-semibold text-mg-ink">
              Olá, {firstName}
            </span>
          </div>

          <div className="h-5 w-[1px] bg-mg-line hidden sm:block" />

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-semibold text-mg-warn hover:bg-mg-action/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-mg-warn"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      <div className="flex-1 min-w-0">
        {sectionKey &&
          ![
            'demanda',
            'ficha',
            'biblioteca',
            'prontidao',
            'catalogo',
            'backup',
            'modelos',
            'previa',
            'fontes',
            'gates',
            'sla',
            'baseline',
            'qualidade',
            'tempo',
          ].includes(sectionKey) && (
            <p role="alert">
              Seção não encontrada.{' '}
              <Link className="underline" to="/dashboard">
                Voltar ao início
              </Link>
            </p>
          )}
        {!createdOpportunity && (sectionKey === 'ficha' || sectionKey === 'tempo') && (
          <section className="mb-6 rounded border bg-mg-surface p-4">
            <h2
              id={`secao-${sectionKey}`}
              tabIndex={-1}
              style={{ scrollMarginTop: '5rem' }}
              className="text-xl font-bold"
            >
              {sectionKey === 'ficha' ? 'Ficha técnica' : 'Marcos e tempo'}
            </h2>
            <p className="my-3">
              Esta função precisa de uma demanda selecionada no painel. Abra Oportunidades e
              selecione uma demanda existente ou registre uma demanda autorizada.
            </p>
            <Link
              className="inline-flex min-h-[44px] items-center underline text-mg-brand-strong"
              to="/painel-tecnico?secao=demanda"
            >
              Abrir Oportunidades
            </Link>
          </section>
        )}
        <div className="mx-auto w-full max-w-5xl grid gap-6">
          <section
            hidden
            style={{ display: 'none' }}
            className="bg-mg-surface rounded-[16px] p-6 sm:p-8 border border-mg-line shadow-[0_12px_40px_rgba(2,44,34,0.06)]"
          >
            <div className="w-16 h-16 mb-5 rounded-2xl bg-mg-sidebar p-3 flex items-center justify-center shadow-[0_8px_20px_rgba(2,44,34,0.18)]">
              <MercoMark size={40} lightTheme={false} />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mg-brand-fill/12 text-mg-brand text-[12px] font-bold uppercase tracking-wider mb-4">
              <ShieldCheck className="w-4 h-4 text-mg-brand" />
              <span>Acesso Autorizado</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-mg-ink tracking-tight mb-3">
              Olá, {user?.name || firstName}!
            </h1>

            <p className="text-[16px] font-semibold text-mg-brand mb-4">
              Seu acesso foi validado com sucesso.
            </p>

            <p className="text-[14px] sm:text-[15px] text-mg-muted leading-relaxed mb-6 max-w-md">
              Registre uma nova demanda técnico-comercial. O recebimento e o responsável serão
              definidos pelo servidor para manter a rastreabilidade.
            </p>

            <div className="bg-mg-canvas rounded-[12px] p-4 border border-mg-line mb-4 text-left flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-mg-surface border border-mg-line flex items-center justify-center text-mg-muted shrink-0">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-mg-ink truncate">
                    {user?.name || 'Usuário'}
                  </p>
                  <p className="text-[12px] text-mg-muted truncate">{user?.email}</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-mg-brand bg-mg-brand-fill/10 px-2.5 py-1 rounded-full shrink-0">
                {role ? ROLE_LABELS[role] : 'Papel não definido'}
              </span>
            </div>

            <div
              className={`rounded-[12px] p-4 border text-left ${
                canHomologateCatalog
                  ? 'border-mg-brand-soft-2 bg-mg-brand-soft'
                  : 'border-mg-warn-line bg-mg-warn-bg'
              }`}
            >
              <div className="flex items-start gap-3">
                {canHomologateCatalog ? (
                  <ShieldCheck className="w-5 h-5 text-mg-brand-strong mt-0.5 shrink-0" />
                ) : (
                  <LockKeyhole className="w-5 h-5 text-mg-warn mt-0.5 shrink-0" />
                )}
                <div>
                  <p className="text-[14px] font-bold text-mg-ink">Homologação de catálogo</p>
                  <p className="text-[13px] text-mg-muted mt-1">{permissionMessage}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-mg-surface rounded-[16px] p-6 sm:p-8 border border-mg-line shadow-[0_12px_40px_rgba(2,44,34,0.06)]">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-11 h-11 rounded-[12px] bg-mg-brand-soft text-mg-brand flex items-center justify-center shrink-0">
                <ClipboardPlus className="w-5 h-5" />
              </div>
              <div>
                <h2
                  id="secao-demanda"
                  tabIndex={-1}
                  style={{ scrollMarginTop: '5rem' }}
                  className="text-xl font-extrabold text-mg-ink"
                >
                  Nova demanda
                </h2>
                <p className="text-[13px] text-mg-muted mt-1">
                  Campos com * são necessários para registrar o recebimento.
                </p>
              </div>
            </div>

            {opportunityError && (
              <div
                className="mb-5 p-3.5 rounded-[12px] bg-mg-crit-bg border-l-4 border-mg-crit text-mg-crit text-[13px] font-medium flex items-start gap-2.5"
                role="alert"
                aria-live="assertive"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{opportunityError}</span>
              </div>
            )}

            {createdOpportunity && (
              <div
                className="mb-5 p-3.5 rounded-[12px] bg-mg-brand-soft border-l-4 border-mg-brand text-mg-brand text-[13px] font-medium flex items-start gap-2.5"
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
              <div className="mb-5 rounded-[12px] border border-mg-brand-soft-2 bg-mg-ok-bg p-4 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[14px] font-bold text-mg-ink">Checklist de aptidão</h3>
                    <p className="text-[12px] text-mg-muted mt-1">
                      A avaliação é feita pelo servidor e não escolhe a solução técnica.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleAptitudeEvaluation()}
                    disabled={isEvaluatingAptitude}
                    className="h-[38px] px-3 rounded-[9px] bg-mg-sidebar text-white text-[12px] font-semibold disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {isEvaluatingAptitude ? 'Avaliando...' : 'Avaliar aptidão'}
                  </button>
                </div>

                {aptitudeError && (
                  <div
                    className="mt-3 rounded-[9px] bg-mg-crit-bg border-l-4 border-mg-crit p-3 text-[12px] text-mg-crit"
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
                          ? 'bg-mg-warn-bg text-mg-warn'
                          : 'bg-mg-brand-soft text-mg-brand'
                      }`}
                    >
                      Estado:{' '}
                      {aptitudeResult.aptitudeStatus === 'blocked'
                        ? 'bloqueada'
                        : aptitudeResult.aptitudeStatus === 'apt'
                          ? 'apta'
                          : 'exceção autorizada'}
                    </div>

                    <div className="text-[12px] text-mg-muted">
                      <p className="font-semibold text-mg-ink">Checklist</p>
                      <ul className="mt-1 space-y-0.5">
                        {Object.entries(aptitudeResult.checklist).map(([field, complete]) => (
                          <li
                            key={field}
                            className={complete ? 'text-mg-brand' : 'text-mg-warn'}
                          >
                            {complete ? '✓' : '•'} {field}: {complete ? 'preenchido' : 'pendente'}
                          </li>
                        ))}
                      </ul>
                      {aptitudeResult.pendingItems.length > 0 ? (
                        <div className="mt-2">
                          <p className="font-semibold text-mg-warn">Pendências</p>
                          <ul className="list-disc pl-5 mt-1 space-y-0.5">
                            {aptitudeResult.pendingItems.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="mt-2 text-mg-brand">Nenhuma pendência encontrada.</p>
                      )}
                    </div>

                    {aptitudeResult.aptitudeStatus === 'blocked' &&
                      (role === 'engenharia' || role === 'admin') && (
                        <div className="space-y-2 pt-2 border-t border-mg-brand-soft-2">
                          <label className="block text-[12px] font-semibold text-mg-ink">
                            Justificativa da exceção
                            <textarea
                              minLength={10}
                              maxLength={1000}
                              value={exceptionJustification}
                              onChange={(event) => setExceptionJustification(event.target.value)}
                              className="mt-1.5 w-full min-h-[76px] rounded-[9px] border border-mg-line bg-mg-surface p-2.5 text-[12px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                              placeholder="Explique por que a oportunidade pode avançar apesar das pendências."
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => void handleAptitudeEvaluation(true)}
                            disabled={
                              isEvaluatingAptitude || exceptionJustification.trim().length < 10
                            }
                            className="h-[36px] px-3 rounded-[9px] bg-mg-action text-white text-[12px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                          >
                            Autorizar exceção e liberar
                          </button>
                        </div>
                      )}
                  </div>
                )}
              </div>
            )}

            <div className="mb-5 rounded-[12px] border border-mg-line bg-mg-canvas p-4 text-left">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-[14px] font-bold text-mg-ink">Demandas criadas</h3>
                  <p className="text-[12px] text-mg-muted mt-1">
                    Registros vinculados ao seu usuário.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadOpportunities()}
                  className="text-[12px] font-semibold text-mg-brand hover:underline"
                >
                  Atualizar
                </button>
              </div>
              {opportunitiesError && (
                <p className="text-[12px] text-mg-crit mb-2" role="alert">
                  {opportunitiesError}
                </p>
              )}
              {isLoadingOpportunities ? (
                <p className="text-[12px] text-mg-muted">Carregando demandas...</p>
              ) : opportunities.length === 0 ? (
                <p className="text-[12px] text-mg-muted">
                  Nenhuma demanda encontrada para este usuário.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {opportunities.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        syncProposalFormWithOpportunity(item.id)
                        setAptitudeResult(
                          item.aptitude_status && item.aptitude_status !== 'pending'
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
                        void loadProposalPreviews(item.id)
                      }}
                      className={`w-full rounded-[9px] border p-3 text-left transition-colors ${
                        selectedOpportunityId === item.id
                          ? 'border-mg-brand bg-mg-brand-soft'
                          : 'border-mg-line bg-mg-surface hover:border-mg-brand-soft-2'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-mg-ink truncate">
                          {item.customer_name}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-mg-brand">
                          {item.aptitude_status || item.status}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-x-3 gap-y-1 text-[11px] text-mg-muted sm:grid-cols-2">
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
                <label className="block text-[13px] font-semibold text-mg-ink">
                  Cliente *
                  <input
                    required
                    maxLength={200}
                    value={opportunity.customer_name}
                    onChange={(event) =>
                      handleOpportunityChange('customer_name', event.target.value)
                    }
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                    placeholder="Nome da empresa ou cliente"
                  />
                </label>
                <label className="block text-[13px] font-semibold text-mg-ink">
                  Contato *
                  <input
                    required
                    maxLength={200}
                    value={opportunity.contact_name}
                    onChange={(event) =>
                      handleOpportunityChange('contact_name', event.target.value)
                    }
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                    placeholder="Nome do contato"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-[13px] font-semibold text-mg-ink">
                  E-mail do contato
                  <input
                    type="email"
                    maxLength={200}
                    value={opportunity.contact_email}
                    onChange={(event) =>
                      handleOpportunityChange('contact_email', event.target.value)
                    }
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                    placeholder="contato@empresa.com"
                  />
                </label>
                <label className="block text-[13px] font-semibold text-mg-ink">
                  Origem da demanda *
                  <input
                    required
                    maxLength={120}
                    value={opportunity.origin}
                    onChange={(event) => handleOpportunityChange('origin', event.target.value)}
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                    placeholder="Indicação, portal, recorrência..."
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-[13px] font-semibold text-mg-ink">
                  Família de serviço *
                  <input
                    required
                    maxLength={120}
                    value={opportunity.service_family}
                    onChange={(event) =>
                      handleOpportunityChange('service_family', event.target.value)
                    }
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                    placeholder="Informe, sem presumir o piloto"
                  />
                </label>
                <label className="block text-[13px] font-semibold text-mg-ink">
                  Local do serviço *
                  <span className="relative block">
                    <MapPin
                      className="absolute left-3 top-3 w-4 h-4 text-mg-muted"
                      aria-hidden="true"
                    />
                    <input
                      required
                      maxLength={300}
                      value={opportunity.location}
                      onChange={(event) => handleOpportunityChange('location', event.target.value)}
                      className="mt-1.5 w-full h-[44px] pl-9 pr-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                      placeholder="Cidade, obra ou endereço"
                    />
                  </span>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-[13px] font-semibold text-mg-ink">
                  Data da demanda *
                  <input
                    required
                    type="date"
                    value={opportunity.demand_date}
                    onChange={(event) => handleOpportunityChange('demand_date', event.target.value)}
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  />
                </label>
                <label className="block text-[13px] font-semibold text-mg-ink">
                  Prazo informado
                  <input
                    type="date"
                    value={opportunity.deadline_date}
                    onChange={(event) =>
                      handleOpportunityChange('deadline_date', event.target.value)
                    }
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  />
                </label>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-[12px] text-mg-muted">
                  O recebimento será marcado pelo servidor no instante do cadastro.
                </p>
                <button
                  type="submit"
                  disabled={isSubmittingOpportunity}
                  className="h-[46px] px-5 rounded-[10px] bg-mg-brand-fill hover:bg-mg-brand-fill/90 text-white font-semibold text-[14px] hover:shadow-[0_4px_16px_rgba(23,103,122,0.3)] transition-all disabled:opacity-70 disabled:pointer-events-none inline-flex items-center justify-center gap-2 shrink-0"
                >
                  <ClipboardPlus className="w-4 h-4" />
                  {isSubmittingOpportunity ? 'Registrando...' : 'Registrar demanda'}
                </button>
              </div>
            </form>
          </section>
        </div>

        <section className="mx-auto w-full max-w-5xl mt-6 bg-mg-surface rounded-[16px] p-6 sm:p-8 border border-mg-line shadow-[0_12px_40px_rgba(2,44,34,0.06)]">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-11 h-11 rounded-[12px] bg-mg-brand-soft text-mg-brand flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="secao-prontidao"
                tabIndex={-1}
                style={{ scrollMarginTop: '5rem' }}
                className="text-xl font-extrabold text-mg-ink"
              >
                Prontidão da Fase 2
              </h2>
              <p className="text-[13px] text-mg-muted mt-1">
                Gate de prontidão por família: exibe pendências com motivo, dono e data. A aprovação
                exige vínculos verificáveis e só é assinada por Engenharia/Admin.
              </p>
            </div>
          </div>

          {readinessError && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-mg-crit-bg border-l-4 border-mg-crit text-mg-crit text-[13px] font-medium flex items-start gap-2.5"
              role="alert"
              aria-live="assertive"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{readinessError}</span>
            </div>
          )}

          {readinessInfo && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-mg-brand-soft border-l-4 border-mg-brand text-mg-brand text-[13px] font-medium"
              role="status"
              aria-live="polite"
            >
              {readinessInfo}
            </div>
          )}

          {isLoadingReadiness ? (
            <p className="text-[13px] text-mg-muted">Carregando prontidão...</p>
          ) : readinessStatus ? (
            <div className="mb-6 p-4 rounded-[12px] border border-mg-line bg-mg-surface-2">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    readinessStatus.status === 'aprovado'
                      ? 'bg-mg-brand-soft text-mg-brand'
                      : readinessStatus.status === 'invalidado'
                        ? 'bg-mg-crit-bg text-mg-crit'
                        : 'bg-mg-warn-bg text-mg-warn'
                  }`}
                >
                  {readinessStatus.status === 'aprovado'
                    ? 'APROVADO'
                    : readinessStatus.status === 'invalidado'
                      ? 'INVALIDADO'
                      : 'BLOQUEADO'}
                </span>{' '}
                {readinessStatus.family && (
                  <span className="text-[12px] font-semibold text-mg-ink">
                    Família: {readinessStatus.family}
                  </span>
                )}
              </div>
              <p className="text-[13px] text-mg-muted">{readinessStatus.detail}</p>
              {readinessStatus.blockers.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {readinessStatus.blockers.map((blocker, index) => (
                    <li key={index} className="text-[12px] text-mg-ink">
                      <span className="font-semibold">{blocker.key}</span> — {blocker.reason} ·
                      dono: {blocker.owner} · aberto em {blocker.openedAt}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {canApproveReadiness && (
            <form onSubmit={handleReadinessApprove} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-[13px] font-semibold text-mg-ink">
                  Família-piloto *
                  <input
                    required
                    maxLength={120}
                    value={readinessForm.pilot_family}
                    onChange={(event) => handleReadinessChange('pilot_family', event.target.value)}
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                    placeholder="Ex.: geotecnia"
                  />
                </label>
                <label className="block text-[13px] font-semibold text-mg-ink">
                  Dono da decisão de piloto *
                  <input
                    required
                    maxLength={200}
                    value={readinessForm.pilot_owner}
                    onChange={(event) => handleReadinessChange('pilot_owner', event.target.value)}
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                    placeholder="Quem decidiu o piloto"
                  />
                </label>
              </div>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Motivo da decisão de piloto *
                <textarea
                  required
                  maxLength={1000}
                  rows={2}
                  value={readinessForm.pilot_reason}
                  onChange={(event) => handleReadinessChange('pilot_reason', event.target.value)}
                  className="mt-1.5 w-full px-3 py-2.5 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="Justificativa da escolha da família"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-[13px] font-semibold text-mg-ink">
                  SLA homologado *
                  <select
                    required
                    value={readinessForm.sla_record_id}
                    onChange={(event) => handleReadinessChange('sla_record_id', event.target.value)}
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  >
                    <option value="">
                      {slaOptions.length === 0
                        ? 'Nenhum SLA homologado disponível'
                        : 'Selecione o SLA homologado'}
                    </option>
                    {slaOptions.map((param) => (
                      <option key={param.id} value={param.id}>
                        {param.family} — {param.value}
                        {param.unit ? ' ' + param.unit : ''} · fonte: {param.source}
                      </option>
                    ))}
                    {/* rótulo construído por slaOptionLabel — ver src/lib/readinessOptions.ts */}
                  </select>
                  {slaOptions.length === 0 && (
                    <span className="mt-1 block text-[12px] text-mg-warn">
                      Nenhum parâmetro de SLA homologado. Homologue em Administração → Regras e SLA
                      do piloto antes de assinar a prontidão.
                    </span>
                  )}
                </label>
                <label className="block text-[13px] font-semibold text-mg-ink">
                  Baseline congelado *
                  <select
                    required
                    value={readinessForm.baseline_id}
                    onChange={(event) => handleReadinessChange('baseline_id', event.target.value)}
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  >
                    <option value="">
                      {baselineOptions.length === 0
                        ? 'Nenhum baseline disponível'
                        : 'Selecione o baseline congelado'}
                    </option>
                    {baselineOptions.map((baseline) => (
                      <option key={baseline.id} value={baseline.id}>
                        {baseline.service_family} — janela {baseline.window_start} a{' '}
                        {baseline.window_end} · congelado em {baseline.frozen_at}
                      </option>
                    ))}
                  </select>
                  {baselineOptions.length === 0 && (
                    <span className="mt-1 block text-[12px] text-mg-warn">
                      Nenhum baseline congelado visível para você (a consulta mostra apenas os
                      seus). Congele um baseline em Administração → Baseline antes de assinar a
                      prontidão.
                    </span>
                  )}
                </label>
              </div>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Evidência de recuperação real (CA-1-13) *
                <input
                  required
                  maxLength={500}
                  value={readinessForm.recovery_evidence_ref}
                  onChange={(event) =>
                    handleReadinessChange('recovery_evidence_ref', event.target.value)
                  }
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="Referência da prova de restauração isolada"
                />
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Recibo da Fase 1 *
                <input
                  required
                  maxLength={500}
                  value={readinessForm.phase1_receipt_ref}
                  onChange={(event) =>
                    handleReadinessChange('phase1_receipt_ref', event.target.value)
                  }
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="Ex.: 05_entregas/fase-1/RECIBO-T1.17.md"
                />
              </label>
              <button
                type="submit"
                disabled={isApprovingReadiness}
                className="h-[44px] px-5 rounded-[10px] bg-mg-brand-fill text-white text-[13px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
              >
                {isApprovingReadiness ? 'Assinando...' : 'Assinar prontidão'}
              </button>
            </form>
          )}
        </section>

        <section className="mx-auto w-full max-w-5xl mt-6 bg-mg-surface rounded-[16px] p-6 sm:p-8 border border-mg-line shadow-[0_12px_40px_rgba(2,44,34,0.06)]">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-11 h-11 rounded-[12px] bg-mg-brand-soft text-mg-brand flex items-center justify-center shrink-0">
              <HardDriveDownload className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="secao-backup"
                tabIndex={-1}
                style={{ scrollMarginTop: '5rem' }}
                className="text-xl font-extrabold text-mg-ink"
              >
                Backup e exportação
              </h2>
              <p className="text-[13px] text-mg-muted mt-1">
                Demonstração com recibo auditado e hash de integridade: backup inválido bloqueia a
                restauração (falha segura); hash válido comprova a restauração.
              </p>
            </div>
          </div>

          {backupError && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-mg-crit-bg border-l-4 border-mg-crit text-mg-crit text-[13px] font-medium flex items-start gap-2.5"
              role="alert"
              aria-live="assertive"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{backupError}</span>
            </div>
          )}

          {backupInfo && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-mg-brand-soft border-l-4 border-mg-brand text-mg-brand text-[13px] font-medium"
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
              className="h-[46px] px-5 rounded-[10px] bg-mg-brand-fill hover:bg-mg-brand-fill/90 text-white font-semibold text-[14px] hover:shadow-[0_4px_16px_rgba(23,103,122,0.3)] transition-all disabled:opacity-70 disabled:pointer-events-none inline-flex items-center justify-center gap-2"
            >
              <HardDriveDownload className="w-4 h-4" />
              {isSubmittingBackup ? 'Gerando...' : 'Exportar / Gerar backup'}
            </button>
          </div>

          {backupHash && backupCounts && (
            <div className="mb-5 rounded-[12px] border border-mg-line bg-mg-canvas p-4">
              <h3 className="text-[13px] font-bold text-mg-ink">Snapshot atual</h3>
              <p className="text-[12px] text-mg-muted mt-1 break-all">
                Hash: <span className="font-mono">{backupHash}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(backupCounts).map(([name, count]) => (
                  <span
                    key={name}
                    className="text-[11px] bg-mg-surface border border-mg-line rounded-full px-2.5 py-1 text-mg-muted"
                  >
                    {name}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-[12px] border border-mg-line bg-mg-surface p-4 mb-5">
            <label className="block text-[13px] font-semibold text-mg-ink">
              Hash do backup
              <input
                value={backupInputHash}
                onChange={(event) => setBackupInputHash(event.target.value)}
                className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[13px] font-mono outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                placeholder="Cole o hash do backup (ou use o gerado acima)"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleBackupVerify()}
                disabled={isSubmittingBackup || !backupInputHash.trim()}
                className="h-[38px] px-4 rounded-[9px] bg-mg-sidebar text-white text-[12px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
              >
                Verificar integridade
              </button>
              <button
                type="button"
                onClick={() => void handleBackupRestore()}
                disabled={isSubmittingBackup || !backupInputHash.trim()}
                className="h-[38px] px-4 rounded-[9px] bg-mg-brand-fill text-white text-[12px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
              >
                Testar restauração
              </button>
            </div>
            <p className="mt-2 text-[12px] text-mg-muted">
              Dica: altere um caractere do hash para provar a falha segura (RED-012).
            </p>
          </div>

          <div className="rounded-[12px] border border-mg-line bg-mg-canvas p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-[14px] font-bold text-mg-ink">Recibos de demonstração</h3>
              <button
                type="button"
                onClick={() => void loadBackupReceipts()}
                className="text-[12px] font-semibold text-mg-brand hover:underline"
              >
                Atualizar
              </button>
            </div>
            {isLoadingBackup ? (
              <p className="text-[12px] text-mg-muted">Carregando recibos...</p>
            ) : backupReceipts.length === 0 ? (
              <p className="text-[12px] text-mg-muted">
                Nenhum recibo ainda — gere uma exportação para começar.
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {backupReceipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex items-center justify-between gap-2 rounded-[9px] border border-mg-line bg-mg-surface px-3 py-2"
                  >
                    <div className="min-w-0">
                      <span className="text-[12px] font-bold text-mg-ink capitalize">
                        {receipt.kind}
                      </span>
                      <span className="text-[11px] text-mg-muted ml-2">
                        {new Date(receipt.created).toLocaleString('pt-BR')}
                      </span>
                      {receipt.errorDetail && (
                        <p className="text-[11px] text-mg-warn truncate">{receipt.errorDetail}</p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        receipt.result === 'sucesso'
                          ? 'bg-mg-brand-soft text-mg-brand'
                          : 'bg-mg-crit-bg text-mg-crit'
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

        <section className="mx-auto w-full max-w-5xl mt-6 bg-mg-surface rounded-[16px] p-6 sm:p-8 border border-mg-line shadow-[0_12px_40px_rgba(2,44,34,0.06)]">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-11 h-11 rounded-[12px] bg-mg-brand-soft text-mg-brand flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="secao-modelos"
                tabIndex={-1}
                style={{ scrollMarginTop: '5rem' }}
                className="text-xl font-extrabold text-mg-ink"
              >
                Modelos reais de proposta
              </h2>
              <p className="text-[13px] text-mg-muted mt-1">
                T1.13 — envie os modelos DOCX reais da Mercogeo. Eles entram como rascunho; somente
                Engenharia/Admin aprova. Nenhum template é inventado e a T1.14 usará apenas modelos
                aprovados.
              </p>
            </div>
          </div>

          {proposalTemplateError && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-mg-crit-bg border-l-4 border-mg-crit text-mg-crit text-[13px] font-medium flex items-start gap-2.5"
              role="alert"
              aria-live="assertive"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{proposalTemplateError}</span>
            </div>
          )}

          {proposalTemplateInfo && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-mg-brand-soft border-l-4 border-mg-brand text-mg-brand text-[13px] font-medium"
              role="status"
              aria-live="polite"
            >
              {proposalTemplateInfo}
            </div>
          )}

          <form onSubmit={handleProposalTemplateSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-[13px] font-semibold text-mg-ink">
                Família *
                <select
                  value={proposalTemplateForm.family}
                  onChange={(event) =>
                    setProposalTemplateForm((current) => ({
                      ...current,
                      family: event.target.value as 'poliureia' | 'geotecnia',
                    }))
                  }
                  className="mt-1.5 w-full h-[44px] rounded-[10px] border border-mg-line bg-mg-surface px-3 text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                >
                  <option value="poliureia">Poliureia</option>
                  <option value="geotecnia">Geotecnia</option>
                </select>
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Nome do modelo *
                <input
                  required
                  maxLength={200}
                  value={proposalTemplateForm.name}
                  onChange={(event) =>
                    setProposalTemplateForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="Modelo real — Poliureia"
                />
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Nº do modelo
                <input
                  maxLength={60}
                  value={proposalTemplateForm.model_number}
                  onChange={(event) =>
                    setProposalTemplateForm((current) => ({
                      ...current,
                      model_number: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="NR..."
                />
              </label>
            </div>

            <label className="block text-[13px] font-semibold text-mg-ink">
              Arquivo DOCX real *
              <input
                required
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) =>
                  setProposalTemplateForm((current) => ({
                    ...current,
                    file: event.target.files?.[0] || null,
                  }))
                }
                className="mt-1.5 block w-full rounded-[10px] border border-mg-line bg-mg-surface px-3 py-2.5 text-[13px] font-normal file:mr-3 file:rounded-[7px] file:border-0 file:bg-mg-brand-soft file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-mg-brand"
              />
              <span className="mt-1 block text-[11px] font-normal text-mg-muted">
                O arquivo original é preservado; a prévia sem preço será uma etapa posterior.
              </span>
            </label>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-[12px] text-mg-muted">
                Campos mapeados: cliente, obra, áreas/patologias, solução, prazo, família e dados do
                cabeçalho.
              </p>
              <button
                type="submit"
                disabled={isSubmittingProposalTemplate}
                className="h-[46px] px-5 rounded-[10px] bg-mg-brand-fill hover:bg-mg-brand-fill/90 text-white font-semibold text-[14px] hover:shadow-[0_4px_16px_rgba(23,103,122,0.3)] transition-all disabled:opacity-70 disabled:pointer-events-none inline-flex items-center justify-center gap-2 shrink-0"
              >
                <FileText className="w-4 h-4" />
                {isSubmittingProposalTemplate ? 'Enviando...' : 'Enviar modelo como rascunho'}
              </button>
            </div>
          </form>

          <div className="mt-6 rounded-[12px] border border-mg-line bg-mg-canvas p-4 text-left">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-[14px] font-bold text-mg-ink">Modelos registrados</h3>
                <p className="text-[12px] text-mg-muted mt-1">
                  A aprovação é uma decisão explícita e auditada de Engenharia/Admin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadProposalTemplates()}
                className="text-[12px] font-semibold text-mg-brand hover:underline"
              >
                Atualizar
              </button>
            </div>
            {isLoadingProposalTemplates ? (
              <p className="text-[12px] text-mg-muted">Carregando modelos...</p>
            ) : proposalTemplates.length === 0 ? (
              <p className="text-[12px] text-mg-muted">
                Nenhum modelo registrado ainda. A T1.14 permanece bloqueada até aprovação.
              </p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {proposalTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="rounded-[9px] border border-mg-line bg-mg-surface p-3"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-mg-ink">
                        {template.name} · {template.family}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          template.status === 'aprovado'
                            ? 'bg-mg-brand-soft text-mg-brand'
                            : template.status === 'inativo'
                              ? 'bg-mg-warn-bg text-mg-warn'
                              : 'bg-mg-surface-2 text-mg-muted'
                        }`}
                      >
                        {template.status}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-x-3 gap-y-1 text-[11px] text-mg-muted sm:grid-cols-2">
                      <span>Modelo: {template.model_number || 'não informado'}</span>
                      <span>Versão: {template.version}</span>
                      <span>Arquivo: {template.file}</span>
                      <span>
                        Campos variáveis: cabeçalho, cliente, obra, áreas, solução e prazo
                      </span>
                      {template.approved_at && <span>Aprovado em: {template.approved_at}</span>}
                    </div>
                    {template.file && (
                      <a
                        href={proposalTemplateFileUrl(template)}
                        target="_blank"
                        rel="noreferrer"
                        download={template.file}
                        className="mt-3 inline-flex h-[34px] items-center gap-1.5 rounded-[8px] border border-mg-brand-soft-2 bg-mg-brand-soft px-3 text-[11px] font-semibold text-mg-brand hover:bg-mg-brand-soft-2"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Abrir / baixar DOCX
                      </a>
                    )}
                    {canHomologateCatalog && template.status === 'rascunho' && (
                      <button
                        type="button"
                        onClick={() => void handleProposalTemplateApprove(template.id)}
                        disabled={isSubmittingProposalTemplate}
                        className="mt-2 h-[30px] px-3 rounded-[8px] bg-mg-sidebar text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                      >
                        Aprovar modelo
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl mt-6 bg-mg-surface rounded-[16px] p-6 sm:p-8 border border-mg-line shadow-[0_12px_40px_rgba(2,44,34,0.06)]">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-11 h-11 rounded-[12px] bg-mg-warn-bg text-mg-warn flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="secao-previa"
                tabIndex={-1}
                style={{ scrollMarginTop: '5rem' }}
                className="text-xl font-extrabold text-mg-ink"
              >
                Prévia de proposta sem preço
              </h2>
              <p className="text-[13px] text-mg-muted mt-1">
                T1.14 — selecione uma demanda e um modelo aprovado, preencha os dados variáveis e
                gere uma prévia imprimível. O envio permanece bloqueado.
              </p>
            </div>
          </div>

          <div className="mb-5 rounded-[12px] border border-mg-warn-line bg-mg-warn-bg p-4" role="note">
            <p className="text-[14px] font-extrabold tracking-wide text-mg-warn">
              SEM PREÇO — NÃO ENVIAR
            </p>
            <p className="mt-1 text-[12px] text-mg-warn">
              Esta etapa não calcula nem aceita valores, faturamento, condições de pagamento ou
              envio ao cliente.
            </p>
          </div>

          {proposalPreviewError && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-mg-crit-bg border-l-4 border-mg-crit text-mg-crit text-[13px] font-medium flex items-start gap-2.5"
              role="alert"
              aria-live="assertive"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{proposalPreviewError}</span>
            </div>
          )}

          {proposalPreviewInfo && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-mg-brand-soft border-l-4 border-mg-brand text-mg-brand text-[13px] font-medium"
              role="status"
              aria-live="polite"
            >
              {proposalPreviewInfo}
            </div>
          )}

          <form onSubmit={handleProposalPreviewSubmit} className="space-y-5" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-semibold text-mg-ink">
                Demanda *
                <select
                  required
                  value={proposalPreviewForm.opportunity_id}
                  onChange={(event) => {
                    if (event.target.value) syncProposalFormWithOpportunity(event.target.value)
                  }}
                  className="mt-1.5 w-full h-[44px] rounded-[10px] border border-mg-line bg-mg-surface px-3 text-[13px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                >
                  <option value="">Selecione uma demanda registrada</option>
                  {opportunities.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.customer_name} · {item.service_family} · {item.location}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Modelo aprovado *
                <select
                  required
                  value={proposalPreviewForm.template_id}
                  onChange={(event) =>
                    setProposalPreviewForm((current) => ({
                      ...current,
                      template_id: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full h-[44px] rounded-[10px] border border-mg-line bg-mg-surface px-3 text-[13px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                >
                  <option value="">
                    {isLoadingApprovedProposalTemplates
                      ? 'Carregando modelos aprovados...'
                      : 'Selecione um modelo aprovado'}
                  </option>
                  {approvedProposalTemplates
                    .filter((item) => item.family === proposalPreviewForm.family)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.modelNumber || 'sem número'} · v{item.version}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <label className="block text-[13px] font-semibold text-mg-ink">
                Família *
                <select
                  value={proposalPreviewForm.family}
                  onChange={(event) =>
                    handleProposalPreviewFamilyChange(
                      event.target.value as 'poliureia' | 'geotecnia',
                    )
                  }
                  className="mt-1.5 w-full h-[44px] rounded-[10px] border border-mg-line bg-mg-surface px-3 text-[13px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                >
                  <option value="poliureia">Poliureia</option>
                  <option value="geotecnia">Geotecnia</option>
                </select>
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink sm:col-span-2">
                Número da proposta *
                <input
                  required
                  maxLength={60}
                  value={proposalPreviewForm.proposal_number}
                  onChange={(event) =>
                    handleProposalPreviewFieldChange('proposal_number', event.target.value)
                  }
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[13px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="Ex.: NR2026XXX"
                />
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Revisão *
                <input
                  required
                  maxLength={20}
                  value={proposalPreviewForm.revision}
                  onChange={(event) =>
                    handleProposalPreviewFieldChange('revision', event.target.value)
                  }
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[13px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="REV 00"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-[13px] font-semibold text-mg-ink">
                Data da proposta *
                <input
                  required
                  type="date"
                  value={proposalPreviewForm.proposal_date}
                  onChange={(event) =>
                    handleProposalPreviewFieldChange('proposal_date', event.target.value)
                  }
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[13px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                />
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink sm:col-span-2">
                Cidade *
                <input
                  required
                  maxLength={120}
                  value={proposalPreviewForm.city}
                  onChange={(event) => handleProposalPreviewFieldChange('city', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[13px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="São Paulo - SP"
                />
              </label>
            </div>

            <div className="rounded-[12px] border border-mg-line bg-mg-canvas p-4">
              <h3 className="text-[14px] font-bold text-mg-ink">Cliente e obra</h3>
              <p className="mt-1 text-[11px] text-mg-muted">
                Cliente, contato e e-mail vêm da demanda selecionada. O servidor confere que não
                sejam trocados por outra demanda.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-[13px] font-semibold text-mg-ink">
                  Cliente
                  <input
                    readOnly
                    value={proposalPreviewForm.customer_name}
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-brand-soft-2 bg-mg-brand-soft text-[13px] font-normal outline-none"
                  />
                </label>
                <label className="block text-[13px] font-semibold text-mg-ink">
                  Contato
                  <input
                    readOnly
                    value={proposalPreviewForm.contact_name}
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-brand-soft-2 bg-mg-brand-soft text-[13px] font-normal outline-none"
                  />
                </label>
                <label className="block text-[13px] font-semibold text-mg-ink">
                  CNPJ do cliente *
                  <input
                    required
                    maxLength={40}
                    value={proposalPreviewForm.customer_cnpj}
                    onChange={(event) =>
                      handleProposalPreviewFieldChange('customer_cnpj', event.target.value)
                    }
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[13px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                    placeholder="00.000.000/0000-00"
                  />
                </label>
                <label className="block text-[13px] font-semibold text-mg-ink">
                  E-mail do contato
                  <input
                    type="email"
                    maxLength={200}
                    readOnly
                    value={proposalPreviewForm.contact_email}
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-brand-soft-2 bg-mg-brand-soft text-[13px] font-normal outline-none"
                  />
                </label>
                <label className="block text-[13px] font-semibold text-mg-ink sm:col-span-2">
                  Endereço do cliente *
                  <input
                    required
                    maxLength={500}
                    value={proposalPreviewForm.customer_address}
                    onChange={(event) =>
                      handleProposalPreviewFieldChange('customer_address', event.target.value)
                    }
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[13px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                    placeholder="Rua, número, cidade, estado e CEP"
                  />
                </label>
                <label className="block text-[13px] font-semibold text-mg-ink sm:col-span-2">
                  Local da obra *
                  <input
                    required
                    maxLength={300}
                    value={proposalPreviewForm.local_obra}
                    onChange={(event) =>
                      handleProposalPreviewFieldChange('local_obra', event.target.value)
                    }
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[13px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                    placeholder="Nome da obra ou unidade"
                  />
                </label>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-semibold text-mg-ink">
                Tipo de superfície *
                <input
                  required
                  maxLength={120}
                  value={proposalPreviewForm.surface_type}
                  onChange={(event) =>
                    handleProposalPreviewFieldChange('surface_type', event.target.value)
                  }
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[13px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="Concreto, solo..."
                />
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Início da execução *
                <input
                  required
                  maxLength={200}
                  value={proposalPreviewForm.execution_start}
                  onChange={(event) =>
                    handleProposalPreviewFieldChange('execution_start', event.target.value)
                  }
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[13px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="Mobilização"
                />
              </label>
            </div>

            <label className="block text-[13px] font-semibold text-mg-ink">
              Prazo de execução *
              <input
                required
                maxLength={200}
                value={proposalPreviewForm.execution_deadline}
                onChange={(event) =>
                  handleProposalPreviewFieldChange('execution_deadline', event.target.value)
                }
                className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[13px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                placeholder="Em até ... dias úteis"
              />
            </label>

            <div className="rounded-[12px] border border-mg-line bg-mg-canvas p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-[14px] font-bold text-mg-ink">Áreas e ações</h3>
                  <p className="mt-1 text-[11px] text-mg-muted">
                    Não inclua preços, faturamento ou condições de pagamento nesta tabela.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleProposalPreviewAddArea}
                  disabled={proposalPreviewForm.areas.length >= 50}
                  className="inline-flex h-[34px] items-center gap-1.5 rounded-[8px] border border-mg-brand-soft-2 bg-mg-surface px-3 text-[11px] font-semibold text-mg-brand disabled:opacity-60"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar área
                </button>
              </div>
              <div className="space-y-3">
                {proposalPreviewForm.areas.map((area, index) => (
                  <div
                    key={`${area.item}-${index}`}
                    className="rounded-[10px] border border-mg-line bg-mg-surface p-3"
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[12px] font-bold text-mg-ink">Área {index + 1}</span>
                      {proposalPreviewForm.areas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleProposalPreviewRemoveArea(index)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-mg-crit hover:underline"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remover
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-5">
                      {(
                        [
                          ['item', 'Item', '01'],
                          ['local', 'Local', 'Área dos porta-paletes'],
                          ['area', 'Área / metragem', '1.000 m²'],
                          ['pathology', 'Patologia', 'Descreva a patologia'],
                          ['solution', 'Solução', 'Descreva a solução'],
                        ] as const
                      ).map(([field, label, placeholder]) => (
                        <label
                          key={field}
                          className="block text-[11px] font-semibold text-mg-ink"
                        >
                          {label} *
                          <input
                            required
                            maxLength={
                              field === 'item'
                                ? 30
                                : field === 'local'
                                  ? 300
                                  : field === 'area'
                                    ? 80
                                    : 1000
                            }
                            value={area[field]}
                            onChange={(event) =>
                              handleProposalPreviewAreaChange(index, field, event.target.value)
                            }
                            className="mt-1.5 w-full h-[38px] px-2.5 rounded-[8px] border border-mg-line bg-mg-surface text-[11px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                            placeholder={placeholder}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <label className="block text-[13px] font-semibold text-mg-ink">
              Solução proposta *
              <textarea
                required
                maxLength={5000}
                value={proposalPreviewForm.solution_proposed}
                onChange={(event) =>
                  handleProposalPreviewFieldChange('solution_proposed', event.target.value)
                }
                className="mt-1.5 w-full min-h-[110px] rounded-[10px] border border-mg-line bg-mg-surface p-3 text-[13px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                placeholder="Descreva a solução técnica para esta demanda, sem valores comerciais."
              />
            </label>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-[12px] text-mg-muted">
                O modelo e a demanda serão validados novamente pelo servidor.
              </p>
              <button
                type="submit"
                disabled={isSubmittingProposalPreview || isLoadingApprovedProposalTemplates}
                className="h-[46px] px-5 rounded-[10px] bg-mg-action hover:bg-mg-action-hover text-white font-semibold text-[14px] hover:shadow-[0_4px_16px_rgba(194,65,12,0.3)] transition-all disabled:opacity-70 disabled:pointer-events-none inline-flex items-center justify-center gap-2 shrink-0"
              >
                <FileText className="w-4 h-4" />
                {isSubmittingProposalPreview ? 'Gerando prévia...' : 'Gerar prévia sem preço'}
              </button>
            </div>
          </form>

          <div className="mt-6 rounded-[12px] border border-mg-line bg-mg-canvas p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-[14px] font-bold text-mg-ink">
                  Pré-visualizações desta demanda
                </h3>
                <p className="text-[11px] text-mg-muted mt-1">
                  Registros gerados sem preço e vinculados ao usuário.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  void loadProposalPreviews(proposalPreviewForm.opportunity_id || undefined)
                }
                className="text-[12px] font-semibold text-mg-brand hover:underline"
              >
                Atualizar
              </button>
            </div>
            {isLoadingProposalPreviews ? (
              <p className="text-[12px] text-mg-muted">Carregando prévias...</p>
            ) : proposalPreviews.length === 0 ? (
              <p className="text-[12px] text-mg-muted">
                Nenhuma prévia gerada para a demanda selecionada.
              </p>
            ) : (
              <div className="space-y-2">
                {proposalPreviews.map((preview) => (
                  <button
                    key={preview.id}
                    type="button"
                    onClick={() => setActiveProposalPreview(preview)}
                    className={`w-full rounded-[9px] border p-3 text-left ${
                      activeProposalPreview?.id === preview.id
                        ? 'border-mg-action bg-mg-warn-bg'
                        : 'border-mg-line bg-mg-surface hover:border-mg-warn-line'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-bold text-mg-ink">
                        {preview.proposalNumber} · {proposalFamilyLabel(preview.family)}
                      </span>
                      <span className="rounded-full bg-mg-warn-bg px-2 py-0.5 text-[10px] font-bold uppercase text-mg-warn">
                        SEM PREÇO
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-mg-muted">
                      Modelo: {preview.templateName} ·{' '}
                      {new Date(preview.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {activeProposalPreview && (
            <div
              id="proposal-preview-print"
              className="mt-6 rounded-[12px] border border-mg-line-strong bg-mg-surface p-5 text-left shadow-sm"
            >
              <div className="flex flex-col gap-3 border-b border-mg-line pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-mg-warn">
                    Prévia documental
                  </p>
                  <h3 className="mt-1 text-xl font-extrabold text-mg-ink">MERCO GEOPOLÍMEROS</h3>
                  <p className="mt-1 text-[12px] text-mg-muted">
                    {activeProposalPreview.templateName} ·{' '}
                    {activeProposalPreview.templateModelNumber || 'modelo aprovado'} · v
                    {activeProposalPreview.templateVersion}
                  </p>
                </div>
                <div className="rounded-[9px] border-2 border-mg-action px-3 py-2 text-center">
                  <p className="text-[12px] font-extrabold text-mg-warn">SEM PREÇO</p>
                  <p className="text-[10px] font-bold text-mg-warn">NÃO ENVIAR</p>
                </div>
              </div>
              <div className="mt-5 grid gap-x-5 gap-y-2 text-[12px] sm:grid-cols-2">
                <p>
                  <strong>Proposta:</strong> {activeProposalPreview.proposalNumber} ·{' '}
                  {activeProposalPreview.revision}
                </p>
                <p>
                  <strong>Data:</strong> {formatProposalDate(activeProposalPreview.proposalDate)} ·{' '}
                  {activeProposalPreview.city}
                </p>
                <p>
                  <strong>Cliente:</strong> {activeProposalPreview.customerName} ·{' '}
                  {activeProposalPreview.customerCnpj}
                </p>
                <p>
                  <strong>Contato:</strong> {activeProposalPreview.contactName}
                  {activeProposalPreview.contactEmail
                    ? ` · ${activeProposalPreview.contactEmail}`
                    : ''}
                </p>
                <p className="sm:col-span-2">
                  <strong>Endereço:</strong> {activeProposalPreview.customerAddress}
                </p>
                <p>
                  <strong>Local da obra:</strong> {activeProposalPreview.localObra}
                </p>
                <p>
                  <strong>Superfície:</strong> {activeProposalPreview.surfaceType}
                </p>
              </div>
              <div className="mt-5">
                <h4 className="text-[13px] font-extrabold text-mg-ink">
                  Descrição das áreas e ações
                </h4>
                <div className="mt-2 overflow-x-auto rounded-[8px] border border-mg-line">
                  <table className="w-full min-w-[680px] text-left text-[11px]">
                    <thead
                      className="bg-mg-canvas text-mg-muted
                      "
                    >
                      <tr>
                        <th className="p-2">Item</th>
                        <th className="p-2">Local</th>
                        <th className="p-2">Área</th>
                        <th className="p-2">Patologia</th>
                        <th className="p-2">Solução</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeProposalPreview.areas.map((area) => (
                        <tr key={area.item} className="border-t border-mg-line">
                          <td className="p-2">{area.item}</td>
                          <td className="p-2">{area.local}</td>
                          <td className="p-2">{area.area}</td>
                          <td className="p-2">{area.pathology}</td>
                          <td className="p-2">{area.solution}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mt-5">
                <h4 className="text-[13px] font-extrabold text-mg-ink">Solução proposta</h4>
                <p className="mt-2 whitespace-pre-wrap text-[12px] leading-6 text-mg-ink">
                  {activeProposalPreview.solutionProposed}
                </p>
              </div>
              <div className="mt-5">
                <h4 className="text-[13px] font-extrabold text-mg-ink">
                  Descrição do sistema — {proposalFamilyLabel(activeProposalPreview.family)}
                </h4>
                <div className="mt-2 space-y-2 text-[12px] leading-6 text-mg-ink">
                  {proposalFixedSystemCopy(activeProposalPreview.family).map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>
              <div className="mt-5 grid gap-3 rounded-[9px] bg-mg-canvas p-3 text-[12px] sm:grid-cols-2">
                <p>
                  <strong>Início:</strong> {activeProposalPreview.executionStart}
                </p>
                <p>
                  <strong>Prazo de execução:</strong> {activeProposalPreview.executionDeadline}
                </p>
              </div>
              <p className="mt-5 border-t border-mg-line pt-4 text-[11px] italic text-mg-muted">
                Esta prévia não contém preço, faturamento ou condições de pagamento. A tentativa de
                envio é bloqueada pelo servidor.
              </p>
              <div className="proposal-print-controls mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleProposalPreviewPrint}
                  className="inline-flex h-[38px] items-center gap-1.5 rounded-[8px] bg-mg-sidebar px-4 text-[12px] font-semibold text-white"
                >
                  <Printer className="w-4 h-4" /> Imprimir / salvar PDF
                </button>
                <button
                  type="button"
                  onClick={() => void handleProposalPreviewSendAttempt()}
                  disabled={isSubmittingProposalPreview}
                  className="inline-flex h-[38px] items-center gap-1.5 rounded-[8px] border border-mg-crit-line bg-mg-crit-bg px-4 text-[12px] font-semibold text-mg-crit disabled:opacity-60"
                >
                  <Send className="w-4 h-4" /> Tentar enviar (deve bloquear)
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="mx-auto w-full max-w-5xl mt-6 bg-mg-surface rounded-[16px] p-6 sm:p-8 border border-mg-line shadow-[0_12px_40px_rgba(2,44,34,0.06)]">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-11 h-11 rounded-[12px] bg-mg-brand-soft text-mg-brand flex items-center justify-center shrink-0">
              <DatabaseZap className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="secao-fontes"
                tabIndex={-1}
                style={{ scrollMarginTop: '5rem' }}
                className="text-xl font-extrabold text-mg-ink"
              >
                Auditoria VOBI/OMIE
              </h2>
              <p className="text-[13px] text-mg-muted mt-1">
                Cobertura, fonte de verdade, forma de acesso e decisão de fonte (integrar, importar
                ou não usar) — auditada antes de qualquer duplicação ou integração.
              </p>
            </div>
          </div>

          {sourceError && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-mg-crit-bg border-l-4 border-mg-crit text-mg-crit text-[13px] font-medium flex items-start gap-2.5"
              role="alert"
              aria-live="assertive"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{sourceError}</span>
            </div>
          )}

          {sourceInfo && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-mg-brand-soft border-l-4 border-mg-brand text-mg-brand text-[13px] font-medium"
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
                className="rounded-[12px] border border-mg-line bg-mg-canvas p-4"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[14px] font-bold text-mg-ink uppercase">
                    {item.system === 'vobi' ? 'VOBI' : 'OMIE'}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      item.decision === 'integrar'
                        ? 'bg-mg-brand-soft text-mg-brand'
                        : item.decision === 'importar'
                          ? 'bg-mg-brand-soft text-mg-brand'
                          : item.decision === 'nao_usar'
                            ? 'bg-mg-warn-bg text-mg-warn'
                            : 'bg-mg-surface-2 text-mg-muted'
                    }`}
                  >
                    {item.decision === 'nao_auditado'
                      ? 'não auditado'
                      : item.decision.replace('_', ' ')}
                  </span>
                </div>
                {item.decision !== 'nao_auditado' && (
                  <div className="mt-2 grid gap-x-3 gap-y-1 text-[11px] text-mg-muted">
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
                    className="mt-2 h-[30px] px-3 rounded-[8px] bg-mg-sidebar text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                  >
                    Atualizar decisão
                  </button>
                )}
                {item.id && sourceDecideTarget === item.id && (
                  <div className="mt-2 space-y-2 pt-2 border-t border-mg-line">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block text-[12px] font-semibold text-mg-ink">
                        Nova decisão *
                        <select
                          value={sourceDecideForm.decision}
                          onChange={(event) =>
                            setSourceDecideForm((current) => ({
                              ...current,
                              decision: event.target.value as 'integrar' | 'importar' | 'nao_usar',
                            }))
                          }
                          className="mt-1.5 w-full h-[36px] rounded-[8px] border border-mg-line bg-mg-surface px-2.5 text-[12px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                        >
                          <option value="integrar">Integrar</option>
                          <option value="importar">Importar</option>
                          <option value="nao_usar">Não usar</option>
                        </select>
                      </label>
                      <label className="block text-[12px] font-semibold text-mg-ink">
                        Dono *
                        <input
                          value={sourceDecideForm.decision_owner}
                          onChange={(event) =>
                            setSourceDecideForm((current) => ({
                              ...current,
                              decision_owner: event.target.value,
                            }))
                          }
                          className="mt-1.5 w-full h-[36px] px-2.5 rounded-[8px] border border-mg-line bg-mg-surface text-[12px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                          placeholder="Quem decide"
                        />
                      </label>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block text-[12px] font-semibold text-mg-ink">
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
                          className="mt-1.5 w-full h-[36px] px-2.5 rounded-[8px] border border-mg-line bg-mg-surface text-[12px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                        />
                      </label>
                      <label className="block text-[12px] font-semibold text-mg-ink">
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
                          className="mt-1.5 w-full h-[36px] px-2.5 rounded-[8px] border border-mg-line bg-mg-surface text-[12px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
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
                        className="h-[30px] px-3 rounded-[8px] bg-mg-sidebar text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                      >
                        Confirmar decisão
                      </button>
                      <button
                        type="button"
                        onClick={() => setSourceDecideTarget(null)}
                        className="h-[30px] px-3 rounded-[8px] bg-mg-surface border border-mg-line text-mg-muted text-[11px] font-semibold"
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
              <label className="block text-[13px] font-semibold text-mg-ink">
                Sistema *
                <select
                  value={sourceForm.system}
                  onChange={(event) => handleSourceChange('system', event.target.value)}
                  className="mt-1.5 w-full h-[44px] rounded-[10px] border border-mg-line bg-mg-surface px-3 text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                >
                  <option value="vobi">VOBI</option>
                  <option value="omie">OMIE</option>
                </select>
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Forma de acesso *
                <select
                  value={sourceForm.access_method}
                  onChange={(event) => handleSourceChange('access_method', event.target.value)}
                  className="mt-1.5 w-full h-[44px] rounded-[10px] border border-mg-line bg-mg-surface px-3 text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                >
                  <option value="manual">Manual</option>
                  <option value="exportacao">Exportação</option>
                  <option value="api">API</option>
                </select>
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Decisão de fonte *
                <select
                  value={sourceForm.decision}
                  onChange={(event) => handleSourceChange('decision', event.target.value)}
                  className="mt-1.5 w-full h-[44px] rounded-[10px] border border-mg-line bg-mg-surface px-3 text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                >
                  <option value="integrar">Integrar</option>
                  <option value="importar">Importar</option>
                  <option value="nao_usar">Não usar</option>
                </select>
              </label>
            </div>

            <label className="block text-[13px] font-semibold text-mg-ink">
              Cobertura *
              <input
                required
                maxLength={1000}
                value={sourceForm.coverage}
                onChange={(event) => handleSourceChange('coverage', event.target.value)}
                className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                placeholder="O que o sistema cobre hoje no processo"
              />
            </label>

            <label className="block text-[13px] font-semibold text-mg-ink">
              Fonte de verdade *
              <input
                required
                maxLength={500}
                value={sourceForm.source_of_truth}
                onChange={(event) => handleSourceChange('source_of_truth', event.target.value)}
                className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                placeholder="Qual dado vem daqui (ex.: orçamentos, clientes)"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-semibold text-mg-ink">
                Campos disponíveis
                <input
                  maxLength={2000}
                  value={sourceForm.fields_available}
                  onChange={(event) => handleSourceChange('fields_available', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="Campos relevantes que o sistema exporta"
                />
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Lacunas
                <input
                  maxLength={2000}
                  value={sourceForm.gaps}
                  onChange={(event) => handleSourceChange('gaps', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="O que falta ou não é confiável"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-[13px] font-semibold text-mg-ink">
                Justificativa da decisão *
                <input
                  required
                  minLength={10}
                  maxLength={1000}
                  value={sourceForm.decision_reason}
                  onChange={(event) => handleSourceChange('decision_reason', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="Por que integrar, importar ou não usar"
                />
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Dono da decisão *
                <input
                  required
                  maxLength={200}
                  value={sourceForm.decision_owner}
                  onChange={(event) => handleSourceChange('decision_owner', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="Quem decide"
                />
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Data da decisão *
                <input
                  required
                  type="date"
                  value={sourceForm.decision_date}
                  onChange={(event) => handleSourceChange('decision_date', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                />
              </label>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-[12px] text-mg-muted">
                Auditoria incompleta é negada (RED-011); a decisão é auditada e o histórico é
                preservado.
              </p>
              <button
                type="submit"
                disabled={isSubmittingSource}
                className="h-[46px] px-5 rounded-[10px] bg-mg-brand-fill hover:bg-mg-brand-fill/90 text-white font-semibold text-[14px] hover:shadow-[0_4px_16px_rgba(23,103,122,0.3)] transition-all disabled:opacity-70 disabled:pointer-events-none inline-flex items-center justify-center gap-2 shrink-0"
              >
                <DatabaseZap className="w-4 h-4" />
                {isSubmittingSource ? 'Registrando...' : 'Registrar auditoria'}
              </button>
            </div>
          </form>
        </section>

        <section className="mx-auto w-full max-w-5xl mt-6 bg-mg-surface rounded-[16px] p-6 sm:p-8 border border-mg-line shadow-[0_12px_40px_rgba(2,44,34,0.06)]">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-11 h-11 rounded-[12px] bg-mg-brand-soft text-mg-brand flex items-center justify-center shrink-0">
              <OctagonAlert className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="secao-gates"
                tabIndex={-1}
                style={{ scrollMarginTop: '5rem' }}
                className="text-xl font-extrabold text-mg-ink"
              >
                Gates e cortes
              </h2>
              <p className="text-[13px] text-mg-muted mt-1">
                Bloqueios críticos com dono e data-limite. Atraso aciona escalonamento; a ordem de
                corte do PRD é fixa e nunca editável.
              </p>
            </div>
          </div>

          {gateError && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-mg-crit-bg border-l-4 border-mg-crit text-mg-crit text-[13px] font-medium flex items-start gap-2.5"
              role="alert"
              aria-live="assertive"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{gateError}</span>
            </div>
          )}

          {gateInfo && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-mg-brand-soft border-l-4 border-mg-brand text-mg-brand text-[13px] font-medium"
              role="status"
              aria-live="polite"
            >
              {gateInfo}
            </div>
          )}

          <form onSubmit={handleGateSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-semibold text-mg-ink">
                Título do bloqueio *
                <input
                  required
                  maxLength={200}
                  value={gateForm.title}
                  onChange={(event) => handleGateChange('title', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="Ex.: Homologação da família-piloto"
                />
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Dono da decisão *
                <input
                  required
                  maxLength={200}
                  value={gateForm.owner}
                  onChange={(event) => handleGateChange('owner', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="Quem decide"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-semibold text-mg-ink">
                Data-limite de decisão *
                <input
                  required
                  type="date"
                  value={gateForm.decision_deadline}
                  onChange={(event) => handleGateChange('decision_deadline', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                />
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Descrição
                <input
                  maxLength={1000}
                  value={gateForm.description}
                  onChange={(event) => handleGateChange('description', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="Contexto do bloqueio"
                />
              </label>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-[12px] text-mg-muted">
                Bloqueio sem dono ou sem data é negado (CA-1-17); o registro é auditado.
              </p>
              <button
                type="submit"
                disabled={isSubmittingGate}
                className="h-[46px] px-5 rounded-[10px] bg-mg-brand-fill hover:bg-mg-brand-fill/90 text-white font-semibold text-[14px] hover:shadow-[0_4px_16px_rgba(23,103,122,0.3)] transition-all disabled:opacity-70 disabled:pointer-events-none inline-flex items-center justify-center gap-2 shrink-0"
              >
                <OctagonAlert className="w-4 h-4" />
                {isSubmittingGate ? 'Registrando...' : 'Registrar bloqueio'}
              </button>
            </div>
          </form>

          <div className="mt-6 rounded-[12px] border border-mg-line bg-mg-canvas p-4 text-left">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-[14px] font-bold text-mg-ink">Bloqueios registrados</h3>
                <p className="text-[12px] text-mg-muted mt-1">
                  Resolução aparece somente para quem tem permissão no servidor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadGates()}
                className="text-[12px] font-semibold text-mg-brand hover:underline"
              >
                Atualizar
              </button>
            </div>
            {isLoadingGates ? (
              <p className="text-[12px] text-mg-muted">Carregando bloqueios...</p>
            ) : gates.length === 0 ? (
              <p className="text-[12px] text-mg-muted">Nenhum bloqueio registrado ainda.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {gates.map((gate) => {
                  const statusInfo = gateStatus?.items.find((i) => i.id === gate.id)
                  const overdue = statusInfo?.overdue ?? false
                  return (
                    <div
                      key={gate.id}
                      className="rounded-[9px] border border-mg-line bg-mg-surface p-3"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[13px] font-bold text-mg-ink">{gate.title}</span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            gate.status === 'resolvido'
                              ? 'bg-mg-brand-soft text-mg-brand'
                              : gate.status === 'escalonado'
                                ? 'bg-mg-crit-bg text-mg-crit'
                                : overdue
                                  ? 'bg-mg-warn-bg text-mg-warn'
                                  : 'bg-mg-surface-2 text-mg-muted'
                          }`}
                        >
                          {gate.status === 'aberto' && overdue ? 'vencido' : gate.status}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-x-3 gap-y-1 text-[11px] text-mg-muted sm:grid-cols-2">
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
                          className="mt-2 h-[30px] px-3 rounded-[8px] bg-mg-crit text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                        >
                          Escalonar (atraso)
                        </button>
                      )}
                      {escalateTarget === gate.id && (
                        <div className="mt-2 space-y-2 pt-2 border-t border-mg-line">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <label className="block text-[12px] font-semibold text-mg-ink">
                              Quem está escalando *
                              <input
                                value={escalateName}
                                onChange={(event) => setEscalateName(event.target.value)}
                                className="mt-1.5 w-full h-[36px] px-2.5 rounded-[8px] border border-mg-line bg-mg-surface text-[12px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                                placeholder="Seu nome"
                              />
                            </label>
                            <label className="block text-[12px] font-semibold text-mg-ink">
                              Nota
                              <input
                                maxLength={1000}
                                value={escalateNote}
                                onChange={(event) => setEscalateNote(event.target.value)}
                                className="mt-1.5 w-full h-[36px] px-2.5 rounded-[8px] border border-mg-line bg-mg-surface text-[12px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                                placeholder="Contexto do escalonamento"
                              />
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => void handleEscalate(gate.id)}
                              disabled={isSubmittingGate || !escalateName.trim()}
                              className="h-[30px] px-3 rounded-[8px] bg-mg-crit text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                            >
                              Confirmar escalonamento
                            </button>
                            <button
                              type="button"
                              onClick={() => setEscalateTarget(null)}
                              className="h-[30px] px-3 rounded-[8px] bg-mg-surface border border-mg-line text-mg-muted text-[11px] font-semibold"
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
                            className="h-[30px] px-3 rounded-[8px] bg-mg-sidebar text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                          >
                            Resolver
                          </button>
                        </div>
                      )}
                      {resolveTarget === gate.id && (
                        <div className="mt-2 space-y-2 pt-2 border-t border-mg-line">
                          <label className="block text-[12px] font-semibold text-mg-ink">
                            Decisão de resolução *
                            <textarea
                              minLength={10}
                              maxLength={1000}
                              value={resolveText}
                              onChange={(event) => setResolveText(event.target.value)}
                              className="mt-1.5 w-full min-h-[60px] rounded-[9px] border border-mg-line bg-mg-surface p-2.5 text-[12px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                              placeholder="Como o bloqueio foi decidido."
                            />
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => void handleResolve(gate.id)}
                              disabled={isSubmittingGate || resolveText.trim().length < 10}
                              className="h-[30px] px-3 rounded-[8px] bg-mg-sidebar text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                            >
                              Confirmar resolução
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setResolveTarget(null)
                                setResolveText('')
                              }}
                              className="h-[30px] px-3 rounded-[8px] bg-mg-surface border border-mg-line text-mg-muted text-[11px] font-semibold"
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

          <div className="mt-4 rounded-[12px] border border-mg-line bg-mg-surface p-4 text-left">
            <h3 className="text-[14px] font-bold text-mg-ink">
              Ordem de corte (PRD, seção 11) — fixa
            </h3>
            <p className="text-[12px] text-mg-muted mt-1">
              Se a homologação da família-piloto atrasar, corta-se nesta ordem. Estes itens nunca se
              cortam: baseline, catálogo homologado, memória de cálculo, aprovação, documento
              completo, segurança e auditoria.
            </p>
            <ol className="mt-3 space-y-1.5">
              {(gateStatus?.cutOrder ?? []).map((cut) => (
                <li key={cut.position} className="flex items-start gap-2 text-[12px]">
                  <span
                    className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      cut.cuttable ? 'bg-mg-warn-bg text-mg-warn' : 'bg-mg-brand-soft text-mg-brand'
                    }`}
                  >
                    {cut.position}
                  </span>
                  <span
                    className={cut.cuttable ? 'text-mg-muted' : 'text-mg-brand font-semibold'}
                  >
                    {cut.item}
                    {!cut.cuttable && ' — nunca se corta'}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl mt-6 bg-mg-surface rounded-[16px] p-6 sm:p-8 border border-mg-line shadow-[0_12px_40px_rgba(2,44,34,0.06)]">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-11 h-11 rounded-[12px] bg-mg-brand-soft text-mg-brand flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="secao-sla"
                tabIndex={-1}
                style={{ scrollMarginTop: '5rem' }}
                className="text-xl font-extrabold text-mg-ink"
              >
                Regras e SLA do piloto
              </h2>
              <p className="text-[13px] text-mg-muted mt-1">
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
                  ? 'bg-mg-brand-soft border-l-4 border-mg-brand text-mg-brand'
                  : 'bg-mg-warn-bg border-l-4 border-mg-action text-mg-warn'
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
              className="mb-5 p-3.5 rounded-[12px] bg-mg-crit-bg border-l-4 border-mg-crit text-mg-crit text-[13px] font-medium flex items-start gap-2.5"
              role="alert"
              aria-live="assertive"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{paramError}</span>
            </div>
          )}

          {paramInfo && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-mg-brand-soft border-l-4 border-mg-brand text-mg-brand text-[13px] font-medium"
              role="status"
              aria-live="polite"
            >
              {paramInfo}
            </div>
          )}

          <form onSubmit={handleParamSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-semibold text-mg-ink">
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
                  className="mt-1.5 w-full h-[44px] rounded-[10px] border border-mg-line bg-mg-surface px-3 text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                >
                  <option value="bdi">BDI</option>
                  <option value="iss">ISS</option>
                  <option value="margem">Margem</option>
                  <option value="sla">SLA</option>
                  <option value="alcada">Alçada</option>
                  <option value="arredondamento">Arredondamento</option>
                </select>
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Família *
                <input
                  required
                  maxLength={120}
                  value={paramForm.family}
                  onChange={(event) => handleParamChange('family', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="Família do parâmetro, sem presumir o piloto"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-semibold text-mg-ink">
                Fonte da decisão *
                <input
                  required
                  maxLength={200}
                  value={paramForm.source}
                  onChange={(event) => handleParamChange('source', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="De onde vem a decisão (ata, e-mail, documento)"
                />
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Decisão *
                <select
                  value={paramForm.decision}
                  onChange={(event) =>
                    handleParamChange('decision', event.target.value as 'rascunho' | 'bloqueado')
                  }
                  className="mt-1.5 w-full h-[44px] rounded-[10px] border border-mg-line bg-mg-surface px-3 text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                >
                  <option value="rascunho">Rascunho (aguarda homologação)</option>
                  <option value="bloqueado">Bloqueado (com dono e data-limite)</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-semibold text-mg-ink">
                Valor (opcional no rascunho)
                <input
                  maxLength={200}
                  value={paramForm.value}
                  onChange={(event) => handleParamChange('value', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="Valor proposto, se houver"
                />
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Unidade
                <input
                  maxLength={40}
                  value={paramForm.unit}
                  onChange={(event) => handleParamChange('unit', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="Ex.: %, dias, R$"
                />
              </label>
            </div>

            {paramForm.decision === 'bloqueado' && (
              <div className="grid gap-4 sm:grid-cols-3 p-4 rounded-[12px] bg-mg-warn-bg border border-mg-warn-line">
                <label className="block text-[13px] font-semibold text-mg-ink">
                  Motivo do bloqueio *
                  <input
                    minLength={10}
                    maxLength={1000}
                    value={paramForm.blocked_reason}
                    onChange={(event) => handleParamChange('blocked_reason', event.target.value)}
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-warn-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-action focus:ring-4 focus:ring-mg-warn/15"
                    placeholder="Por que a decisão está bloqueada"
                  />
                </label>
                <label className="block text-[13px] font-semibold text-mg-ink">
                  Dono do desbloqueio *
                  <input
                    maxLength={200}
                    value={paramForm.blocked_owner}
                    onChange={(event) => handleParamChange('blocked_owner', event.target.value)}
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-warn-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-action focus:ring-4 focus:ring-mg-warn/15"
                    placeholder="Quem resolve"
                  />
                </label>
                <label className="block text-[13px] font-semibold text-mg-ink">
                  Data-limite *
                  <input
                    type="date"
                    value={paramForm.blocked_deadline}
                    onChange={(event) => handleParamChange('blocked_deadline', event.target.value)}
                    className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-warn-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-action focus:ring-4 focus:ring-mg-warn/15"
                  />
                </label>
              </div>
            )}

            <label className="block text-[13px] font-semibold text-mg-ink">
              Observações
              <input
                maxLength={1000}
                value={paramForm.notes}
                onChange={(event) => handleParamChange('notes', event.target.value)}
                className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                placeholder="Contexto adicional opcional"
              />
            </label>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-[12px] text-mg-muted">
                O registro é auditado; a homologação do valor é feita por Engenharia/Admin.
              </p>
              <button
                type="submit"
                disabled={isSubmittingParam}
                className="h-[46px] px-5 rounded-[10px] bg-mg-brand-fill hover:bg-mg-brand-fill/90 text-white font-semibold text-[14px] hover:shadow-[0_4px_16px_rgba(23,103,122,0.3)] transition-all disabled:opacity-70 disabled:pointer-events-none inline-flex items-center justify-center gap-2 shrink-0"
              >
                <Scale className="w-4 h-4" />
                {isSubmittingParam ? 'Registrando...' : 'Registrar parâmetro'}
              </button>
            </div>
          </form>

          <div className="mt-6 rounded-[12px] border border-mg-line bg-mg-canvas p-4 text-left">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-[14px] font-bold text-mg-ink">Parâmetros registrados</h3>
                <p className="text-[12px] text-mg-muted mt-1">
                  Homologação aparece somente para quem tem permissão no servidor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadPilotParams()}
                className="text-[12px] font-semibold text-mg-brand hover:underline"
              >
                Atualizar
              </button>
            </div>
            {isLoadingParams ? (
              <p className="text-[12px] text-mg-muted">Carregando parâmetros...</p>
            ) : pilotParams.length === 0 ? (
              <p className="text-[12px] text-mg-muted">Nenhum parâmetro registrado ainda.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {pilotParams.map((param) => (
                  <div
                    key={param.id}
                    className="rounded-[9px] border border-mg-line bg-mg-surface p-3"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-mg-ink">
                        {param.param_type} · {param.family}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          param.decision === 'homologado'
                            ? 'bg-mg-brand-soft text-mg-brand'
                            : param.decision === 'bloqueado'
                              ? 'bg-mg-warn-bg text-mg-warn'
                              : 'bg-mg-surface-2 text-mg-muted'
                        }`}
                      >
                        {param.decision}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-x-3 gap-y-1 text-[11px] text-mg-muted sm:grid-cols-2">
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
                          className="mt-2 h-[30px] px-3 rounded-[8px] bg-mg-sidebar text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                        >
                          Homologar valor
                        </button>
                        {homologateParamTarget === param.id && (
                          <div className="mt-2 space-y-2 pt-2 border-t border-mg-line">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <label className="block text-[12px] font-semibold text-mg-ink">
                                Valor homologado *
                                <input
                                  value={homologateParamValue}
                                  onChange={(event) => setHomologateParamValue(event.target.value)}
                                  className="mt-1.5 w-full h-[36px] px-2.5 rounded-[8px] border border-mg-line bg-mg-surface text-[12px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                                  placeholder="Valor decidido"
                                />
                              </label>
                              <label className="block text-[12px] font-semibold text-mg-ink">
                                Unidade
                                <input
                                  maxLength={40}
                                  value={homologateParamUnit}
                                  onChange={(event) => setHomologateParamUnit(event.target.value)}
                                  className="mt-1.5 w-full h-[36px] px-2.5 rounded-[8px] border border-mg-line bg-mg-surface text-[12px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                                  placeholder="Ex.: %, dias"
                                />
                              </label>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => void handleHomologateParam(param.id)}
                                disabled={isSubmittingParam || !homologateParamValue.trim()}
                                className="h-[30px] px-3 rounded-[8px] bg-mg-sidebar text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
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
                                className="h-[30px] px-3 rounded-[8px] bg-mg-surface border border-mg-line text-mg-muted text-[11px] font-semibold"
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

        <section className="mx-auto w-full max-w-5xl mt-6 bg-mg-surface rounded-[16px] p-6 sm:p-8 border border-mg-line shadow-[0_12px_40px_rgba(2,44,34,0.06)]">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-11 h-11 rounded-[12px] bg-mg-brand-soft text-mg-brand flex items-center justify-center shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="secao-catalogo"
                tabIndex={-1}
                style={{ scrollMarginTop: '5rem' }}
                className="text-xl font-extrabold text-mg-ink"
              >
                Catálogo
              </h2>
              <p className="text-[13px] text-mg-muted mt-1">
                Itens nascem em rascunho; somente Engenharia/Admin homologam ou inativam (com
                justificativa). Itens homologados/inativos são imutáveis e apenas homologados
                vigentes são utilizáveis.
              </p>
            </div>
          </div>

          {catalogError && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-mg-crit-bg border-l-4 border-mg-crit text-mg-crit text-[13px] font-medium flex items-start gap-2.5"
              role="alert"
              aria-live="assertive"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{catalogError}</span>
            </div>
          )}

          {catalogInfo && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-mg-brand-soft border-l-4 border-mg-brand text-mg-brand text-[13px] font-medium"
              role="status"
              aria-live="polite"
            >
              {catalogInfo}
            </div>
          )}

          <form onSubmit={handleCatalogSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-semibold text-mg-ink">
                Família de serviço *
                <input
                  required
                  maxLength={120}
                  value={catalogForm.family}
                  onChange={(event) => handleCatalogChange('family', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="Informe a família, sem presumir o piloto"
                />
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Tipo *
                <select
                  value={catalogForm.item_type}
                  onChange={(event) =>
                    handleCatalogChange(
                      'item_type',
                      event.target.value as 'servico' | 'composicao' | 'recurso',
                    )
                  }
                  className="mt-1.5 w-full h-[44px] rounded-[10px] border border-mg-line bg-mg-surface px-3 text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                >
                  <option value="servico">Serviço</option>
                  <option value="composicao">Composição</option>
                  <option value="recurso">Recurso</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-semibold text-mg-ink">
                Nome *
                <input
                  required
                  maxLength={200}
                  value={catalogForm.name}
                  onChange={(event) => handleCatalogChange('name', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="Nome do serviço, composição ou recurso"
                />
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Unidade *
                <input
                  required
                  maxLength={40}
                  value={catalogForm.unit}
                  onChange={(event) => handleCatalogChange('unit', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="Ex.: m², kg, un"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-semibold text-mg-ink">
                Fonte *
                <input
                  required
                  maxLength={200}
                  value={catalogForm.source}
                  onChange={(event) => handleCatalogChange('source', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="De onde vem a informação"
                />
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Coeficiente
                <input
                  maxLength={100}
                  value={catalogForm.coefficient}
                  onChange={(event) => handleCatalogChange('coefficient', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="Texto descritivo, sem cálculo nesta task"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-[13px] font-semibold text-mg-ink">
                Vigência - início *
                <input
                  required
                  type="date"
                  value={catalogForm.valid_from}
                  onChange={(event) => handleCatalogChange('valid_from', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                />
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Vigência - fim *
                <input
                  required
                  type="date"
                  value={catalogForm.valid_until}
                  onChange={(event) => handleCatalogChange('valid_until', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                />
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Descrição
                <input
                  maxLength={1000}
                  value={catalogForm.description}
                  onChange={(event) => handleCatalogChange('description', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="Detalhe opcional"
                />
              </label>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-[12px] text-mg-muted">
                O cadastro é auditado; o item entra como rascunho e só um homologador autorizado
                pode liberá-lo.
              </p>
              <button
                type="submit"
                disabled={isSubmittingCatalog}
                className="h-[46px] px-5 rounded-[10px] bg-mg-brand-fill hover:bg-mg-brand-fill/90 text-white font-semibold text-[14px] hover:shadow-[0_4px_16px_rgba(23,103,122,0.3)] transition-all disabled:opacity-70 disabled:pointer-events-none inline-flex items-center justify-center gap-2 shrink-0"
              >
                <Boxes className="w-4 h-4" />
                {isSubmittingCatalog ? 'Cadastrando...' : 'Cadastrar item'}
              </button>
            </div>
          </form>

          <div className="mt-6 rounded-[12px] border border-mg-line bg-mg-canvas p-4 text-left">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-[14px] font-bold text-mg-ink">Itens do catálogo</h3>
                <p className="text-[12px] text-mg-muted mt-1">
                  Homologação e inativação aparecem somente para quem tem permissão no servidor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadCatalog()}
                className="text-[12px] font-semibold text-mg-brand hover:underline"
              >
                Atualizar
              </button>
            </div>
            {isLoadingCatalog ? (
              <p className="text-[12px] text-mg-muted">Carregando itens...</p>
            ) : catalogItems.length === 0 ? (
              <p className="text-[12px] text-mg-muted">Nenhum item cadastrado ainda.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {catalogItems.map((item) => (
                  <div key={item.id} className="rounded-[9px] border border-mg-line bg-mg-surface p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-mg-ink">
                        {item.name} · {item.item_type}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          item.status === 'homologado'
                            ? 'bg-mg-brand-soft text-mg-brand'
                            : item.status === 'inativo'
                              ? 'bg-mg-warn-bg text-mg-warn'
                              : 'bg-mg-surface-2 text-mg-muted'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-x-3 gap-y-1 text-[11px] text-mg-muted sm:grid-cols-2">
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
                          className="h-[30px] px-3 rounded-[8px] bg-mg-sidebar text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                        >
                          Homologar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeactivateTarget(item.id)}
                          disabled={isSubmittingCatalog}
                          className="h-[30px] px-3 rounded-[8px] bg-mg-warn-bg text-mg-warn border border-mg-warn-line text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
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
                        className="mt-2 h-[30px] px-3 rounded-[8px] bg-mg-warn-bg text-mg-warn border border-mg-warn-line text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                      >
                        Inativar
                      </button>
                    )}
                    {deactivateTarget === item.id && (
                      <div className="mt-2 space-y-2 pt-2 border-t border-mg-line">
                        <label className="block text-[12px] font-semibold text-mg-ink">
                          Justificativa da inativação *
                          <textarea
                            minLength={10}
                            maxLength={1000}
                            value={deactivateReason}
                            onChange={(event) => setDeactivateReason(event.target.value)}
                            className="mt-1.5 w-full min-h-[60px] rounded-[9px] border border-mg-line bg-mg-surface p-2.5 text-[12px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                            placeholder="Explique por que o item está sendo inativado."
                          />
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleDeactivate(item.id)}
                            disabled={isSubmittingCatalog || deactivateReason.trim().length < 10}
                            className="h-[30px] px-3 rounded-[8px] bg-mg-action text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                          >
                            Confirmar inativação
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeactivateTarget(null)
                              setDeactivateReason('')
                            }}
                            className="h-[30px] px-3 rounded-[8px] bg-mg-surface border border-mg-line text-mg-muted text-[11px] font-semibold"
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

        <section className="mx-auto w-full max-w-5xl mt-6 bg-mg-surface rounded-[16px] p-6 sm:p-8 border border-mg-line shadow-[0_12px_40px_rgba(2,44,34,0.06)]">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-11 h-11 rounded-[12px] bg-mg-brand-soft text-mg-brand flex items-center justify-center shrink-0">
              <Snowflake className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="secao-baseline"
                tabIndex={-1}
                style={{ scrollMarginTop: '5rem' }}
                className="text-xl font-extrabold text-mg-ink"
              >
                Baseline
              </h2>
              <p className="text-[13px] text-mg-muted mt-1">
                Congela o "antes" por família e classe de complexidade, usando a timeline e o tempo
                ativo já registrados. Snapshots são imutáveis e comparáveis pela mesma fronteira.
              </p>
            </div>
          </div>

          {baselineError && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-mg-crit-bg border-l-4 border-mg-crit text-mg-crit text-[13px] font-medium flex items-start gap-2.5"
              role="alert"
              aria-live="assertive"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{baselineError}</span>
            </div>
          )}

          {baselineInfo && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-mg-brand-soft border-l-4 border-mg-brand text-mg-brand text-[13px] font-medium"
              role="status"
              aria-live="polite"
            >
              {baselineInfo}
            </div>
          )}

          <form onSubmit={handleBaselineFreeze} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-semibold text-mg-ink">
                Família de serviço *
                <input
                  required
                  maxLength={120}
                  value={baselineForm.service_family}
                  onChange={(event) => handleBaselineChange('service_family', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="Informe a família, sem presumir o piloto"
                />
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Classe de complexidade *
                <input
                  required
                  maxLength={120}
                  value={baselineForm.complexity_class}
                  onChange={(event) => handleBaselineChange('complexity_class', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="Ex.: baixa, média, alta"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-[13px] font-semibold text-mg-ink">
                Janela - início *
                <input
                  required
                  type="date"
                  value={baselineForm.window_start}
                  onChange={(event) => handleBaselineChange('window_start', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                />
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Janela - fim *
                <input
                  required
                  type="date"
                  value={baselineForm.window_end}
                  onChange={(event) => handleBaselineChange('window_end', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                />
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Calendário *
                <input
                  required
                  maxLength={120}
                  value={baselineForm.calendar}
                  onChange={(event) => handleBaselineChange('calendar', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                  placeholder="Ex.: dias úteis, 8h/dia"
                />
              </label>
            </div>

            <label className="block text-[13px] font-semibold text-mg-ink">
              Critérios de confiabilidade *
              <textarea
                required
                minLength={10}
                maxLength={2000}
                value={baselineForm.reliability_criteria}
                onChange={(event) =>
                  handleBaselineChange('reliability_criteria', event.target.value)
                }
                className="mt-1.5 w-full min-h-[70px] rounded-[9px] border border-mg-line bg-mg-surface p-2.5 text-[13px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                placeholder="Ex.: demandas com recebida e apta registradas; pausas justificadas excluídas"
              />
            </label>

            <label className="block text-[13px] font-semibold text-mg-ink">
              Motivo do congelamento *
              <textarea
                required
                minLength={10}
                maxLength={1000}
                value={baselineForm.freeze_reason}
                onChange={(event) => handleBaselineChange('freeze_reason', event.target.value)}
                className="mt-1.5 w-full min-h-[70px] rounded-[9px] border border-mg-line bg-mg-surface p-2.5 text-[13px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                placeholder="Ex.: congelar o antes antes de usar dimensionamento e preço"
              />
            </label>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-[12px] text-mg-muted">
                Os números são agregados pelo servidor a partir da timeline real; snapshots não
                podem ser editados.
              </p>
              <button
                type="submit"
                disabled={isSubmittingBaseline}
                className="h-[46px] px-5 rounded-[10px] bg-mg-brand-fill hover:bg-mg-brand-fill/90 text-white font-semibold text-[14px] hover:shadow-[0_4px_16px_rgba(23,103,122,0.3)] transition-all disabled:opacity-70 disabled:pointer-events-none inline-flex items-center justify-center gap-2 shrink-0"
              >
                <Snowflake className="w-4 h-4" />
                {isSubmittingBaseline ? 'Congelando...' : 'Congelar baseline'}
              </button>
            </div>
          </form>

          <div className="mt-6 rounded-[12px] border border-mg-line bg-mg-canvas p-4 text-left">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-[14px] font-bold text-mg-ink">Baselines congelados</h3>
                <p className="text-[12px] text-mg-muted mt-1">
                  Snapshots imutáveis; a comparação com o resultado entra nas próximas tasks.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadBaselines()}
                className="text-[12px] font-semibold text-mg-brand hover:underline"
              >
                Atualizar
              </button>
            </div>
            {isLoadingBaselines ? (
              <p className="text-[12px] text-mg-muted">Carregando baselines...</p>
            ) : baselines.length === 0 ? (
              <p className="text-[12px] text-mg-muted">Nenhum baseline congelado ainda.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {baselines.map((baseline) => (
                  <div
                    key={baseline.id}
                    className="rounded-[9px] border border-mg-line bg-mg-surface p-3"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-mg-ink">
                        {baseline.service_family} · {baseline.complexity_class}
                      </span>
                      <span className="text-[10px] font-semibold text-mg-muted">
                        congelado em {baseline.frozen_at}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-x-3 gap-y-1 text-[11px] text-mg-muted sm:grid-cols-2">
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
                    <p className="mt-2 text-[11px] text-mg-muted">
                      <span className="font-semibold text-mg-ink">Confiabilidade:</span>{' '}
                      {baseline.reliability_criteria}
                    </p>
                    <p className="mt-1 text-[11px] text-mg-muted">
                      <span className="font-semibold text-mg-ink">Motivo:</span>{' '}
                      {baseline.freeze_reason}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl mt-6 bg-mg-surface rounded-[16px] p-6 sm:p-8 border border-mg-line shadow-[0_12px_40px_rgba(2,44,34,0.06)]">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-11 h-11 rounded-[12px] bg-mg-brand-soft text-mg-brand flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="secao-qualidade"
                tabIndex={-1}
                style={{ scrollMarginTop: '5rem' }}
                className="text-xl font-extrabold text-mg-ink"
              >
                Revisão semanal da qualidade do tempo
              </h2>
              <p className="text-[13px] text-mg-muted mt-1">
                Relatório assinado pelo servidor: intervalos abertos ou inválidos e timelines não
                comparáveis ficam explícitos.
              </p>
            </div>
          </div>

          {timeQualityError && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-mg-crit-bg border-l-4 border-mg-crit text-mg-crit text-[13px] font-medium flex items-start gap-2.5"
              role="alert"
              aria-live="assertive"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{timeQualityError}</span>
            </div>
          )}

          {timeQualityInfo && (
            <div
              className="mb-5 p-3.5 rounded-[12px] bg-mg-brand-soft border-l-4 border-mg-brand text-mg-brand text-[13px] font-medium"
              role="status"
              aria-live="polite"
            >
              {timeQualityInfo}
            </div>
          )}

          <form onSubmit={handleTimeQualityReview} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-semibold text-mg-ink">
                Semana - início *
                <input
                  required
                  type="date"
                  value={timeQualityForm.week_start}
                  onChange={(event) => handleTimeQualityChange('week_start', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                />
              </label>
              <label className="block text-[13px] font-semibold text-mg-ink">
                Semana - fim *
                <input
                  required
                  type="date"
                  value={timeQualityForm.week_end}
                  onChange={(event) => handleTimeQualityChange('week_end', event.target.value)}
                  className="mt-1.5 w-full h-[44px] px-3 rounded-[10px] border border-mg-line bg-mg-surface text-[14px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                />
              </label>
            </div>
            <label className="block text-[13px] font-semibold text-mg-ink">
              Critérios usados na revisão *
              <textarea
                required
                minLength={10}
                maxLength={4000}
                value={timeQualityForm.criteria}
                onChange={(event) => handleTimeQualityChange('criteria', event.target.value)}
                className="mt-1.5 w-full min-h-[90px] rounded-[9px] border border-mg-line bg-mg-surface p-2.5 text-[13px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
              />
            </label>
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-[12px] text-mg-muted">
                O servidor calcula a revisão e grava uma assinatura; o relatório é imutável.
              </p>
              <button
                type="submit"
                disabled={isSubmittingTimeQuality}
                className="h-[46px] px-5 rounded-[10px] bg-mg-brand-fill hover:bg-mg-brand-fill/90 text-white font-semibold text-[14px] hover:shadow-[0_4px_16px_rgba(23,103,122,0.3)] transition-all disabled:opacity-70 disabled:pointer-events-none inline-flex items-center justify-center gap-2 shrink-0"
              >
                <ShieldCheck className="w-4 h-4" />
                {isSubmittingTimeQuality ? 'Revisando...' : 'Assinar revisão semanal'}
              </button>
            </div>
          </form>

          <div className="mt-6 rounded-[12px] border border-mg-line bg-mg-canvas p-4 text-left">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-[14px] font-bold text-mg-ink">Relatórios assinados</h3>
                <p className="text-[12px] text-mg-muted mt-1">
                  A comparação só é liberada quando a revisão não encontra bloqueios ou pendências.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadTimeQualityReviews()}
                className="text-[12px] font-semibold text-mg-brand hover:underline"
              >
                Atualizar
              </button>
            </div>
            {isLoadingTimeQuality ? (
              <p className="text-[12px] text-mg-muted">Carregando revisões...</p>
            ) : timeQualityReviews.length === 0 ? (
              <p className="text-[12px] text-mg-muted">Nenhuma revisão semanal assinada ainda.</p>
            ) : (
              <div className="space-y-3 max-h-[32rem] overflow-y-auto">
                {timeQualityReviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-[9px] border border-mg-line bg-mg-surface p-3"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-mg-ink">
                        {review.weekStart} a {review.weekEnd}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          review.status === 'aprovado'
                            ? 'bg-mg-brand-soft text-mg-brand'
                            : review.status === 'sem_amostra'
                              ? 'bg-mg-surface-2 text-mg-muted'
                              : 'bg-mg-warn-bg text-mg-warn'
                        }`}
                      >
                        {review.status === 'sem_amostra' ? 'sem amostra' : review.status}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-x-3 gap-y-1 text-[11px] text-mg-muted sm:grid-cols-2">
                      <span>Demandas revisadas: {review.reviewedOpportunities}</span>
                      <span>Elegíveis: {review.eligibleBaselineOpportunities}</span>
                      <span>Não comparáveis: {review.nonComparableOpportunities}</span>
                      <span>Tempos abertos: {review.openTimeEntries}</span>
                      <span>Tempos inválidos: {review.invalidTimeEntries}</span>
                      <span>Timelines incompletas: {review.incompleteTimelines}</span>
                    </div>
                    {review.findings.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-[11px] font-semibold text-mg-ink">Achados</p>
                        {review.findings.map((finding) => (
                          <p key={finding.code} className="text-[11px] text-mg-muted">
                            <span className="font-semibold text-mg-warn">{finding.count}×</span>{' '}
                            {finding.description}
                          </p>
                        ))}
                      </div>
                    )}
                    <p className="mt-3 text-[11px] text-mg-muted">
                      <span className="font-semibold text-mg-ink">Decisão:</span>{' '}
                      {review.decision}
                    </p>
                    <p className="mt-1 text-[10px] text-mg-muted break-all">
                      Assinado em {review.signedAt} · assinatura {review.signature.slice(0, 16)}…
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {createdOpportunity && (
          <section className="mx-auto w-full max-w-5xl mt-6 bg-mg-surface rounded-[16px] p-6 sm:p-8 border border-mg-line shadow-[0_12px_40px_rgba(2,44,34,0.06)]">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-11 h-11 rounded-[12px] bg-mg-brand-soft text-mg-brand flex items-center justify-center shrink-0">
                <Timer className="w-5 h-5" />
              </div>
              <div>
                <h2
                  id="secao-tempo"
                  tabIndex={-1}
                  style={{ scrollMarginTop: '5rem' }}
                  className="text-xl font-extrabold text-mg-ink"
                >
                  Marcos e tempo
                </h2>
                <p className="text-[13px] text-mg-muted mt-1">
                  Timeline com timestamps do servidor e tempo ativo por etapa; a pausa exige
                  justificativa.
                </p>
              </div>
            </div>

            {trackingError && (
              <div
                className="mb-5 p-3.5 rounded-[12px] bg-mg-crit-bg border-l-4 border-mg-crit text-mg-crit text-[13px] font-medium flex items-start gap-2.5"
                role="alert"
                aria-live="assertive"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{trackingError}</span>
              </div>
            )}

            {trackingInfo && (
              <div
                className="mb-5 p-3.5 rounded-[12px] bg-mg-brand-soft border-l-4 border-mg-brand text-mg-brand text-[13px] font-medium"
                role="status"
                aria-live="polite"
              >
                {trackingInfo}
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[12px] border border-mg-line bg-mg-canvas p-4 text-left">
                <h3 className="text-[14px] font-bold text-mg-ink mb-3">Timeline de marcos</h3>
                {events.length === 0 ? (
                  <p className="text-[12px] text-mg-muted">
                    Nenhum marco registrado para esta oportunidade.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {events.map((event) => (
                      <li key={event.id} className="flex items-start gap-2">
                        <span
                          className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                            event.milestone === 'sent'
                              ? 'bg-mg-brand-fill'
                              : event.milestone === 'ready'
                                ? 'bg-mg-brand-fill/90'
                                : event.milestone === 'apt'
                                  ? 'bg-mg-brand-fill'
                                  : 'bg-mg-muted'
                          }`}
                        />
                        <div>
                          <p className="text-[12px] font-semibold text-mg-ink">
                            {event.milestone === 'received'
                              ? 'Recebida'
                              : event.milestone === 'apt'
                                ? 'Apta'
                                : event.milestone === 'ready'
                                  ? 'Pronta'
                                  : 'Enviada'}
                            <span className="font-normal text-mg-muted">
                              {' '}
                              · {event.occurred_at}
                            </span>
                          </p>
                          {event.note && <p className="text-[11px] text-mg-muted">{event.note}</p>}
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
                    className="h-[34px] px-3 rounded-[9px] bg-mg-sidebar text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                  >
                    Marcar pronta
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRecordMilestone('sent')}
                    disabled={isSubmittingTracking}
                    className="h-[34px] px-3 rounded-[9px] bg-mg-brand-fill text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none"
                  >
                    Marcar enviada
                  </button>
                </div>
              </div>

              <div className="rounded-[12px] border border-mg-line bg-mg-canvas p-4 text-left">
                <h3 className="text-[14px] font-bold text-mg-ink mb-3">Tempo ativo</h3>
                {timeEntries.length === 0 ? (
                  <p className="text-[12px] text-mg-muted">
                    Nenhum registro de tempo para esta oportunidade.
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-40 overflow-y-auto">
                    {timeEntries.map((entry) => (
                      <li key={entry.id} className="text-[11px] text-mg-muted">
                        <span className="font-semibold text-mg-ink">{entry.stage}</span> · início{' '}
                        {entry.started_at}
                        {entry.ended_at ? ` · fim ${entry.ended_at}` : ' · em andamento'}
                        {entry.pause_reason && ` · pausa: ${entry.pause_reason}`}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 space-y-2">
                  <label className="block text-[12px] font-semibold text-mg-ink">
                    Etapa
                    <select
                      value={timeStage}
                      onChange={(event) => setTimeStage(event.target.value)}
                      disabled={!!openTimeEntry}
                      className="mt-1 w-full h-[38px] rounded-[9px] border border-mg-line bg-mg-surface px-2.5 text-[12px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15 disabled:opacity-60"
                    >
                      <option value="qualificacao">Qualificação</option>
                      <option value="portal">Portal</option>
                      <option value="ficha_tecnica">Ficha técnica</option>
                      <option value="revisao">Revisão</option>
                      <option value="outro">Outro</option>
                    </select>
                  </label>
                  {openTimeEntry && (
                    <label className="block text-[12px] font-semibold text-mg-ink">
                      Justificativa da pausa *
                      <textarea
                        maxLength={500}
                        value={pauseReason}
                        onChange={(event) => setPauseReason(event.target.value)}
                        className="mt-1 w-full min-h-[60px] rounded-[9px] border border-mg-line bg-mg-surface p-2.5 text-[12px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                        placeholder="Ex.: aguardando retorno do cliente"
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleStartStopTime()}
                    disabled={isSubmittingTracking}
                    className={`h-[34px] px-3 rounded-[9px] text-white text-[11px] font-semibold disabled:opacity-60 disabled:pointer-events-none ${
                      openTimeEntry ? 'bg-mg-action' : 'bg-mg-brand-fill'
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
          <section className="mx-auto w-full max-w-5xl mt-6 bg-mg-surface rounded-[16px] p-6 sm:p-8 border border-mg-line shadow-[0_12px_40px_rgba(2,44,34,0.06)]">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-11 h-11 rounded-[12px] bg-mg-brand-soft text-mg-brand flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2
                  id="secao-ficha"
                  tabIndex={-1}
                  style={{ scrollMarginTop: '5rem' }}
                  className="text-xl font-extrabold text-mg-ink"
                >
                  Ficha técnica
                </h2>
                <p className="text-[13px] text-mg-muted mt-1">
                  Cada salvamento cria uma nova versão com autor e origem definidos pelo servidor.
                  Versões anteriores permanecem intactas.
                </p>
              </div>
            </div>

            {techSheetError && (
              <div
                className="mb-5 p-3.5 rounded-[12px] bg-mg-crit-bg border-l-4 border-mg-crit text-mg-crit text-[13px] font-medium flex items-start gap-2.5"
                role="alert"
                aria-live="assertive"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{techSheetError}</span>
              </div>
            )}

            {techSheetCreated && (
              <div
                className="mb-5 p-3.5 rounded-[12px] bg-mg-brand-soft border-l-4 border-mg-brand text-mg-brand text-[13px] font-medium flex items-start gap-2.5"
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
                    className="rounded-[12px] border border-mg-line bg-mg-canvas p-4"
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[12px] font-bold uppercase tracking-wider text-mg-muted">
                        Parâmetro {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleTechSheetRemoveParameter(index)}
                        className="text-[11px] font-semibold text-mg-warn hover:underline"
                      >
                        Remover
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-[12px] font-semibold text-mg-ink">
                        Nome *
                        <input
                          required
                          maxLength={120}
                          value={parameter.name}
                          onChange={(event) =>
                            handleTechSheetParameterChange(index, 'name', event.target.value)
                          }
                          className="mt-1.5 w-full h-[40px] px-3 rounded-[9px] border border-mg-line bg-mg-surface text-[13px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                          placeholder="Ex.: espessura da camada"
                        />
                      </label>
                      <label className="block text-[12px] font-semibold text-mg-ink">
                        Valor *
                        <input
                          required
                          maxLength={200}
                          value={parameter.value}
                          onChange={(event) =>
                            handleTechSheetParameterChange(index, 'value', event.target.value)
                          }
                          className="mt-1.5 w-full h-[40px] px-3 rounded-[9px] border border-mg-line bg-mg-surface text-[13px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                          placeholder="Ex.: 3,0"
                        />
                      </label>
                      <label className="block text-[12px] font-semibold text-mg-ink">
                        Unidade *
                        <input
                          required
                          maxLength={40}
                          value={parameter.unit}
                          onChange={(event) =>
                            handleTechSheetParameterChange(index, 'unit', event.target.value)
                          }
                          className="mt-1.5 w-full h-[40px] px-3 rounded-[9px] border border-mg-line bg-mg-surface text-[13px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                          placeholder="Ex.: mm"
                        />
                      </label>
                      <label className="block text-[12px] font-semibold text-mg-ink">
                        Origem *
                        <input
                          required
                          maxLength={120}
                          value={parameter.origin}
                          onChange={(event) =>
                            handleTechSheetParameterChange(index, 'origin', event.target.value)
                          }
                          className="mt-1.5 w-full h-[40px] px-3 rounded-[9px] border border-mg-line bg-mg-surface text-[13px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
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
                className="text-[12px] font-semibold text-mg-brand hover:underline"
              >
                + Adicionar parâmetro
              </button>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-[13px] font-semibold text-mg-ink">
                  Pendências (uma por linha)
                  <textarea
                    maxLength={3000}
                    value={techSheetPending}
                    onChange={(event) => setTechSheetPending(event.target.value)}
                    className="mt-1.5 w-full min-h-[76px] rounded-[9px] border border-mg-line bg-mg-surface p-2.5 text-[13px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                    placeholder="Ex.: aguardando planta atualizada"
                  />
                </label>
                <label className="block text-[13px] font-semibold text-mg-ink">
                  Observações
                  <textarea
                    maxLength={2000}
                    value={techSheetNotes}
                    onChange={(event) => setTechSheetNotes(event.target.value)}
                    className="mt-1.5 w-full min-h-[76px] rounded-[9px] border border-mg-line bg-mg-surface p-2.5 text-[13px] font-normal outline-none focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/15"
                    placeholder="Contexto adicional da versão"
                  />
                </label>
              </div>

              <label className="block text-[13px] font-semibold text-mg-ink">
                Anexos (até 10 arquivos)
                <input
                  type="file"
                  multiple
                  onChange={(event) => setTechSheetFiles(Array.from(event.target.files ?? []))}
                  className="mt-1.5 w-full text-[13px] text-mg-muted file:mr-3 file:h-[38px] file:px-3 file:rounded-[9px] file:border-0 file:bg-mg-sidebar file:text-white file:text-[12px] file:font-semibold file:cursor-pointer"
                />
              </label>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-[12px] text-mg-muted">
                  O autor e o número da versão são definidos pelo servidor.
                </p>
                <button
                  type="submit"
                  disabled={isSubmittingTechSheet}
                  className="h-[46px] px-5 rounded-[10px] bg-mg-brand-fill hover:bg-mg-brand-fill/90 text-white font-semibold text-[14px] hover:shadow-[0_4px_16px_rgba(23,103,122,0.3)] transition-all disabled:opacity-70 disabled:pointer-events-none inline-flex items-center justify-center gap-2 shrink-0"
                >
                  <FileText className="w-4 h-4" />
                  {isSubmittingTechSheet ? 'Salvando...' : 'Salvar nova versão'}
                </button>
              </div>
            </form>

            <div className="mt-6 rounded-[12px] border border-mg-line bg-mg-canvas p-4 text-left">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-[14px] font-bold text-mg-ink">Histórico de versões</h3>
                  <p className="text-[12px] text-mg-muted mt-1">
                    Versões anteriores são imutáveis e mantêm autor e origem.
                  </p>
                </div>
                {createdOpportunity && (
                  <button
                    type="button"
                    onClick={() => void loadTechSheets(createdOpportunity.id)}
                    className="text-[12px] font-semibold text-mg-brand hover:underline"
                  >
                    Atualizar
                  </button>
                )}
              </div>
              {isLoadingTechSheets ? (
                <p className="text-[12px] text-mg-muted">Carregando histórico...</p>
              ) : techSheetHistory.length === 0 ? (
                <p className="text-[12px] text-mg-muted">
                  Nenhuma versão registrada para esta oportunidade.
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {techSheetHistory.map((sheet) => (
                    <div
                      key={sheet.id}
                      className="rounded-[9px] border border-mg-line bg-mg-surface p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-bold text-mg-ink">
                          Versão {sheet.version}
                        </span>
                        <span className="text-[10px] font-semibold text-mg-muted">
                          {sheet.createdAt}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-mg-muted">
                        <p className="font-semibold text-mg-ink">Parâmetros</p>
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
                            <p className="font-semibold text-mg-warn">Pendências</p>
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
                            <p className="font-semibold text-mg-ink">Anexos</p>
                            <ul className="mt-1 space-y-0.5">
                              {sheet.attachments.map((filename) => (
                                <li key={filename}>
                                  <a
                                    href={techSheetFileUrl(sheet, filename)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-mg-brand hover:underline break-all"
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
      </div>
    </div>
  )
}

export default Dashboard
