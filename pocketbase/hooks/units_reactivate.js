routerAdd(
  'POST',
  '/backend/v1/units/reactivate',
  (e) => {
    // T2.37 (D-T2.16): reativação de unidade inativa com auditoria.
    // Transição única: inativo → homologado. Código permanece único e imutável;
    // versões já homologadas não mudam (nenhuma coleção de composição é tocada).
    // C14: além do papel, a rota confere a matriz role_permissions (módulo "unidades").
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'unit_reactivate_rejected')
      rejectedAudit.set('resource', 'units')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_units_reactivate' })
      rejectedAudit.set('retention_days', 365)
      $app.save(rejectedAudit)
    }

    const reject = (reason, message) => {
      writeRejectedAudit(reason)
      return e.badRequestError(message)
    }

    const role = e.auth.getString('role')
    if (role !== 'engenharia' && role !== 'admin') {
      return e.forbiddenError('Somente Engenharia ou Administrador podem reativar unidades.')
    }

    // C14: a matriz de permissões (Admin → Usuários e permissões) é conferida
    // além do papel; negar aqui é o piso, a matriz pode negar mais.
    if (role !== 'admin') {
      const rows = $app.findRecordsByFilter(
        'role_permissions',
        'role = {:role} && module = "unidades"',
        '',
        1,
        0,
        { role: role },
      )
      const canEdit = rows.length > 0 && rows[0].getBool('can_edit')
      if (!canEdit) {
        return e.forbiddenError(
          'Seu perfil não tem permissão de edição em Unidades (matriz de permissões).',
        )
      }
    }

    const unitId = typeof body.id === 'string' ? body.id.trim() : ''
    if (!/^[a-z0-9]{15}$/.test(unitId)) {
      return reject('unit_id_required', 'Informe a unidade a ser reativada.')
    }

    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) : ''
    if (!reason) {
      return reject('reason_required', 'A reativação exige justificativa.')
    }

    let unit
    try {
      unit = $app.findRecordById('units', unitId)
    } catch (_) {
      return reject('unit_not_found', 'Unidade não encontrada.')
    }

    if (unit.getString('status') !== 'inativo') {
      return reject(
        'unit_not_inactive',
        'Somente unidade inativa pode ser reativada; unidade em rascunho segue pelo fluxo de homologação.',
      )
    }

    const reactivatedAt = new Date().toISOString()

    $app.runInTransaction((txApp) => {
      const current = txApp.findRecordById('units', unitId)
      current.set('status', 'homologado')
      current.set('homologated_by', e.auth.id)
      current.set('homologated_at', reactivatedAt)
      txApp.save(current)

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'unit_reactivated')
      audit.set('resource', 'units/' + unitId)
      audit.set('outcome', 'success')
      audit.set('details', {
        code: current.getString('code'),
        reason: reason,
        reactivatedAt: reactivatedAt,
        source: 'server_units_reactivate',
      })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(200, { id: unitId, status: 'homologado', reactivatedAt: reactivatedAt })
  },
  $apis.requireAuth(),
)
