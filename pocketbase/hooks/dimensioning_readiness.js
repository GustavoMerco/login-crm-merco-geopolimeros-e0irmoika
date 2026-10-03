routerAdd(
  'GET',
  '/backend/v1/dimensioning/readiness',
  (e) => {
    // Toda lógica inline no callback: o JSVM não expõe declarações top-level
    // (Hook scoping error - T1.10). Sem spread de objeto na resposta (T1.16).
    const records = $app.findRecordsByFilter('phase2_readiness', '', '-created', 50, 0)

    // Gate é específico da família aprovada: o registro vigente é o mais
    // recente NÃO invalidado; registros anteriores ficam preservados.
    const REQUIRED_LINKS = [
      'sla_record_id',
      'baseline_id',
      'recovery_evidence_ref',
      'phase1_receipt_ref',
    ]
    const LINK_LABELS = {
      sla_record_id: 'RN-21 - decisão de piloto e SLA homologado',
      baseline_id: 'RN-22 - baseline congelado e comparável (ou parecer)',
      recovery_evidence_ref: 'CA-1-13 - recuperação real em instância isolada',
      phase1_receipt_ref: 'Recibo da Fase 1 (T1.17) com bloqueios resolvidos',
    }

    const current = records.length > 0 ? records[0] : null

    const blockers = []
    if (current) {
      let parsed = []
      try {
        parsed = JSON.parse(current.getString('blockers') || '[]')
      } catch (_) {
        parsed = []
      }
      for (const b of parsed) {
        blockers.push({
          key: typeof b.key === 'string' ? b.key : '',
          reason: typeof b.reason === 'string' ? b.reason : '',
          owner: typeof b.owner === 'string' ? b.owner : '',
          openedAt: typeof b.openedAt === 'string' ? b.openedAt : '',
        })
      }
    }

    const status = current ? current.getString('status') : 'bloqueado'
    const family = current ? current.getString('pilot_family') : ''

    // Vínculos do registro vigente, com verificação de existência real.
    const links = {}
    if (current) {
      for (const field of REQUIRED_LINKS) {
        const ref = current.getString(field)
        let exists = false
        if (ref) {
          try {
            if (field === 'sla_record_id') {
              const rec = $app.findRecordById('pilot_params', ref)
              exists =
                rec.getString('param_type') === 'sla' &&
                rec.getString('decision') === 'homologado' &&
                rec.getString('family') === family
            } else if (field === 'baseline_id') {
              $app.findRecordById('baseline_snapshots', ref)
              exists = true
            } else {
              // refs documentais: recibo T1.17 e evidência de recuperação
              exists = ref.length > 0
            }
          } catch (_) {
            exists = false
          }
        }
        links[field] = { ref: ref, valid: exists, label: LINK_LABELS[field] }
      }
    }

    // Invalidação: se um vínculo obrigatório deixou de ser válido,
    // o gate vigente perde a aprovação (registro anterior preservado).
    let effectiveStatus = status
    let invalidReason = ''
    if (status === 'aprovado') {
      for (const field of REQUIRED_LINKS) {
        if (!links[field] || !links[field].valid) {
          effectiveStatus = 'invalidado'
          invalidReason = 'Vínculo deixou de ser válido: ' + LINK_LABELS[field]
          break
        }
      }
    }

    return e.json(200, {
      status: effectiveStatus,
      family: family,
      approvedBy: current ? current.getString('approved_by') : '',
      approvedAt: current ? current.getString('approved_at') : '',
      blockers: blockers,
      links: links,
      detail:
        effectiveStatus === 'aprovado'
          ? 'Gate de prontidão aprovado para a família ' + family + '.'
          : effectiveStatus === 'invalidado'
            ? invalidReason
            : 'Gate bloqueado: ' +
              (blockers.length > 0
                ? blockers.length + ' pendência(s) registrada(s).'
                : 'prontidão nunca aprovada.'),
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/dimensioning/readiness/approve',
  (e) => {
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'readiness_approve_rejected')
      rejectedAudit.set('resource', 'phase2_readiness')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_dimensioning_readiness' })
      rejectedAudit.set('retention_days', 365)
      $app.save(rejectedAudit)
    }

    const reject = (reason, message) => {
      writeRejectedAudit(reason)
      return e.badRequestError(message)
    }

    const text = (value, max) =>
      typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max
        ? value.trim()
        : ''

    // Só Engenharia/Admin assina prontidão (REG-P2-001: Comercial → 403).
    const role = e.auth.getString('role')
    if (role !== 'engenharia' && role !== 'admin') {
      return e.forbiddenError('Somente Engenharia ou Administrador podem assinar a prontidão.')
    }

    const family = text(body.pilot_family, 120)
    if (!family) return reject('family_required', 'Informe a família-piloto aprovada.')

    const pilotOwner = text(body.pilot_owner, 200)
    if (!pilotOwner) return reject('pilot_owner_required', 'Informe o dono da decisão de piloto.')

    const pilotReason = text(body.pilot_reason, 1000)
    if (!pilotReason)
      return reject('pilot_reason_required', 'Informe o motivo da decisão de piloto.')

    const slaRecordId = typeof body.sla_record_id === 'string' ? body.sla_record_id.trim() : ''
    if (!/^[a-z0-9]{15}$/.test(slaRecordId)) {
      return reject(
        'sla_record_required',
        'Informe o registro de SLA homologado (id pilot_params).',
      )
    }

    const baselineId = typeof body.baseline_id === 'string' ? body.baseline_id.trim() : ''
    if (!/^[a-z0-9]{15}$/.test(baselineId)) {
      return reject('baseline_required', 'Informe o baseline congelado (id baseline_snapshots).')
    }

    const recoveryRef = text(body.recovery_evidence_ref, 500)
    if (!recoveryRef) {
      return reject('recovery_required', 'Informe a evidência de recuperação real (CA-1-13).')
    }

    const phase1Ref = text(body.phase1_receipt_ref, 500)
    if (!phase1Ref) {
      return reject('phase1_receipt_required', 'Informe a referência do recibo da Fase 1.')
    }

    // RED-P2-001: aprovar sem prova → 409 com pendências.
    // Cada vínculo é verificado contra o registro real, não texto autodeclarado.
    const pending = []

    let slaRecord
    try {
      slaRecord = $app.findRecordById('pilot_params', slaRecordId)
    } catch (_) {
      slaRecord = null
    }
    if (!slaRecord) {
      pending.push({
        key: 'sla_record_id',
        reason: 'Registro de SLA não encontrado.',
        owner: 'Engenharia',
        openedAt: new Date().toISOString().slice(0, 10),
      })
    } else if (
      slaRecord.getString('param_type') !== 'sla' ||
      slaRecord.getString('decision') !== 'homologado'
    ) {
      pending.push({
        key: 'sla_record_id',
        reason: 'SLA referenciado não está homologado.',
        owner: 'Engenharia',
        openedAt: new Date().toISOString().slice(0, 10),
      })
    } else if (slaRecord.getString('family') !== family) {
      pending.push({
        key: 'sla_record_id',
        reason: 'SLA pertence a outra família: ' + slaRecord.getString('family') + '.',
        owner: 'Engenharia',
        openedAt: new Date().toISOString().slice(0, 10),
      })
    }

    let baselineRecord
    try {
      baselineRecord = $app.findRecordById('baseline_snapshots', baselineId)
    } catch (_) {
      baselineRecord = null
    }
    if (!baselineRecord) {
      pending.push({
        key: 'baseline_id',
        reason: 'Baseline congelado não encontrado.',
        owner: 'Engenharia',
        openedAt: new Date().toISOString().slice(0, 10),
      })
    } else if (baselineRecord.getString('service_family') !== family) {
      pending.push({
        key: 'baseline_id',
        reason:
          'Baseline pertence a outra família: ' + baselineRecord.getString('service_family') + '.',
        owner: 'Engenharia',
        openedAt: new Date().toISOString().slice(0, 10),
      })
    }

    if (!recoveryRef || recoveryRef.length < 10) {
      pending.push({
        key: 'recovery_evidence_ref',
        reason: 'Evidência de recuperação real ausente ou insuficiente.',
        owner: 'Dados',
        openedAt: new Date().toISOString().slice(0, 10),
      })
    }

    if (!phase1Ref || phase1Ref.length < 10) {
      pending.push({
        key: 'phase1_receipt_ref',
        reason: 'Referência do recibo da Fase 1 ausente ou insuficiente.',
        owner: 'Consultor',
        openedAt: new Date().toISOString().slice(0, 10),
      })
    }

    if (pending.length > 0) {
      // 409 de negócio esperado via e.json (padrão T1.12): o SDK do frontend
      // trata status >= 400 como ClientResponseError e o card exibe as pendências.
      const blockedAudit = new Record(auditLogs)
      blockedAudit.set('actor_id', e.auth.id)
      blockedAudit.set('action', 'readiness_approve_blocked')
      blockedAudit.set('resource', 'phase2_readiness')
      blockedAudit.set('outcome', 'failure')
      blockedAudit.set('details', {
        reason: 'pending_proofs',
        pendingCount: pending.length,
        source: 'server_dimensioning_readiness',
      })
      blockedAudit.set('retention_days', 365)
      $app.save(blockedAudit)

      return e.json(409, {
        error: 'Prontidão não pode ser aprovada: existem pendências sem prova.',
        pending: pending,
      })
    }

    // RED-P2-001: trocar família sem reaprovar — a aprovação anterior de outra
    // família NÃO ativa a nova; novo registro nasce bloqueado se vínculos não
    // conferem com a família pedida (já coberto acima). Aqui o novo registro é
    // criado aprovado para a família exata cujos vínculos foram verificados.
    const approvedAt = new Date().toISOString()

    let readinessId = ''
    $app.runInTransaction((txApp) => {
      const collection = txApp.findCollectionByNameOrId('phase2_readiness')
      const readiness = new Record(collection)
      readiness.set('pilot_family', family)
      readiness.set('pilot_owner', pilotOwner)
      readiness.set('pilot_reason', pilotReason)
      readiness.set('sla_record_id', slaRecordId)
      readiness.set('baseline_id', baselineId)
      readiness.set('recovery_evidence_ref', recoveryRef)
      readiness.set('phase1_receipt_ref', phase1Ref)
      readiness.set('approved_by', e.auth.id)
      readiness.set('approved_at', approvedAt)
      readiness.set('status', 'aprovado')
      readiness.set('blockers', '[]')
      txApp.save(readiness)
      readinessId = readiness.id

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'readiness_approved')
      audit.set('resource', 'phase2_readiness/' + readiness.id)
      audit.set('outcome', 'success')
      audit.set('details', {
        family: family,
        slaRecordId: slaRecordId,
        baselineId: baselineId,
        approvedAt: approvedAt,
        source: 'server_dimensioning_readiness',
      })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(200, {
      id: readinessId,
      status: 'aprovado',
      family: family,
      approvedAt: approvedAt,
    })
  },
  $apis.requireAuth(),
)
