routerAdd(
  'POST',
  '/backend/v1/units',
  (e) => {
    // Toda lógica inline no callback (JSVM não expõe top-level - T1.10).
    // JSON via texto + parse (T1.5). Auditoria em toda mutação.
    const body = e.requestInfo().body || {}
    const auditLogs = $app.findCollectionByNameOrId('audit_logs')

    const writeRejectedAudit = (reason) => {
      const rejectedAudit = new Record(auditLogs)
      rejectedAudit.set('actor_id', e.auth.id)
      rejectedAudit.set('action', 'unit_create_rejected')
      rejectedAudit.set('resource', 'units')
      rejectedAudit.set('outcome', 'failure')
      rejectedAudit.set('details', { reason, source: 'server_units_create' })
      rejectedAudit.set('retention_days', 365)
      $app.save(rejectedAudit)
    }

    const reject = (reason, message) => {
      writeRejectedAudit(reason)
      return e.badRequestError(message)
    }

    // CA-2-12 / UX-007-UN: só Engenharia/Admin cria; Comercial → 403.
    const role = e.auth.getString('role')
    if (role !== 'engenharia' && role !== 'admin') {
      return e.forbiddenError('Somente Engenharia ou Administrador podem cadastrar unidades.')
    }

    const code = typeof body.code === 'string' ? body.code.trim() : ''
    if (!/^[a-z0-9/]{1,20}$/.test(code)) {
      return reject(
        'code_invalid',
        'Informe o código da unidade: 1–20 caracteres, minúsculas, números ou barra (ex.: m2, kg, kg/m2).',
      )
    }

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name || name.length > 120) {
      return reject('name_required', 'Informe o nome da unidade (até 120 caracteres).')
    }

    const DIMENSIONS = [
      'area',
      'massa',
      'comprimento',
      'volume',
      'massa/area',
      'tempo',
      'adimensional',
    ]
    const dimension = typeof body.dimension === 'string' ? body.dimension.trim() : ''
    if (!DIMENSIONS.includes(dimension)) {
      return reject(
        'dimension_invalid',
        'Selecione a dimensão da unidade entre as homologadas pela Engenharia.',
      )
    }

    // Unicidade do código (índice único também protege; aqui o motivo é legível).
    const existing = $app.findRecordsByFilter(
      'units',
      'code = "' + code.replace(/"/g, '') + '"',
      '',
      1,
      0,
    )
    if (existing.length > 0) {
      return e.json(409, {
        error: 'Código de unidade já existe; reutilizar código exige nova decisão da Engenharia.',
        reason: 'code_duplicated',
      })
    }

    let unitId = ''
    $app.runInTransaction((txApp) => {
      const collection = txApp.findCollectionByNameOrId('units')
      const unit = new Record(collection)
      unit.set('code', code)
      unit.set('name', name)
      unit.set('dimension', dimension)
      unit.set('status', 'rascunho')
      unit.set('created_by', e.auth.id)
      txApp.save(unit)
      unitId = unit.id

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'unit_created')
      audit.set('resource', 'units/' + unit.id)
      audit.set('outcome', 'success')
      audit.set('details', { code, dimension, source: 'server_units_create' })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(201, { id: unitId, code: code, status: 'rascunho' })
  },
  $apis.requireAuth(),
)
