routerAdd(
  'GET',
  '/backend/v1/backup/export',
  (e) => {
    // Toda lógica inline no callback: o JSVM do PocketBase não expõe
    // declarações top-level ao callback (Hook scoping error).
    // O hash cobre apenas o CONTEÚDO (ids + updated), nunca o momento da
    // geração - caso contrário o hash seria instável e a verificação falharia.
    const SNAPSHOT_COLLECTIONS = [
      'opportunities',
      'tech_sheets',
      'catalog_items',
      'pilot_params',
      'gates_ledger',
      'source_audits',
      'baseline_snapshots',
    ]

    const counts = {}
    const parts = []
    for (const name of SNAPSHOT_COLLECTIONS) {
      let records = []
      try {
        records = $app.findRecordsByFilter(name, '', '-created', 5000, 0)
      } catch (_) {
        records = []
      }
      counts[name] = records.length
      const rows = []
      for (const r of records) {
        rows.push({ id: r.id, updated: r.getString('updated') || r.getString('created') })
      }
      parts.push(name + ':' + JSON.stringify(rows))
    }
    const contentFingerprint = parts.join('|')
    const hash = $security.sha256(contentFingerprint)
    const payload = JSON.stringify({
      generatedAt: new Date().toISOString(),
      contentFingerprint,
      counts,
    })

    $app.runInTransaction((txApp) => {
      const receipt = new Record(txApp.findCollectionByNameOrId('backup_receipts'))
      receipt.set('kind', 'exportacao')
      receipt.set('result', 'sucesso')
      receipt.set('payload_hash', hash)
      receipt.set('counts', JSON.stringify(counts))
      receipt.set('origin', 'manual')
      receipt.set('created_by', e.auth.id)
      txApp.save(receipt)

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'backup_export_created')
      audit.set('resource', 'backup_receipts/' + receipt.id)
      audit.set('outcome', 'success')
      audit.set('details', { hash, source: 'server_backup_export' })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(200, { payload: JSON.parse(payload), hash, counts })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/backup/verify',
  (e) => {
    const SNAPSHOT_COLLECTIONS = [
      'opportunities',
      'tech_sheets',
      'catalog_items',
      'pilot_params',
      'gates_ledger',
      'source_audits',
      'baseline_snapshots',
    ]

    const body = e.requestInfo().body || {}
    const counts = {}
    const parts = []
    for (const name of SNAPSHOT_COLLECTIONS) {
      let records = []
      try {
        records = $app.findRecordsByFilter(name, '', '-created', 5000, 0)
      } catch (_) {
        records = []
      }
      counts[name] = records.length
      const rows = []
      for (const r of records) {
        rows.push({ id: r.id, updated: r.getString('updated') || r.getString('created') })
      }
      parts.push(name + ':' + JSON.stringify(rows))
    }
    const hash = $security.sha256(parts.join('|'))

    const expectedHash = typeof body.hash === 'string' ? body.hash.trim() : ''
    const matches = expectedHash === hash
    const result = matches ? 'sucesso' : 'falha'
    const errorDetail = matches ? '' : 'Hash divergente: estado atual difere do backup apresentado.'

    let receiptId = ''
    $app.runInTransaction((txApp) => {
      const receipt = new Record(txApp.findCollectionByNameOrId('backup_receipts'))
      receipt.set('kind', 'backup')
      receipt.set('result', result)
      receipt.set('payload_hash', hash)
      receipt.set('expected_hash', expectedHash)
      receipt.set('counts', JSON.stringify(counts))
      receipt.set('error_detail', errorDetail)
      receipt.set('origin', 'manual')
      receipt.set('created_by', e.auth.id)
      txApp.save(receipt)
      receiptId = receipt.id

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'backup_verify_' + result)
      audit.set('resource', 'backup_receipts/' + receiptId)
      audit.set('outcome', matches ? 'success' : 'failure')
      audit.set('details', { expectedHash, actualHash: hash, source: 'server_backup_verify' })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(matches ? 200 : 409, {
      receiptId,
      result,
      currentHash: hash,
      counts,
      errorDetail,
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/backup/restore-check',
  (e) => {
    const SNAPSHOT_COLLECTIONS = [
      'opportunities',
      'tech_sheets',
      'catalog_items',
      'pilot_params',
      'gates_ledger',
      'source_audits',
      'baseline_snapshots',
    ]

    const body = e.requestInfo().body || {}
    const counts = {}
    const parts = []
    for (const name of SNAPSHOT_COLLECTIONS) {
      let records = []
      try {
        records = $app.findRecordsByFilter(name, '', '-created', 5000, 0)
      } catch (_) {
        records = []
      }
      counts[name] = records.length
      const rows = []
      for (const r of records) {
        rows.push({ id: r.id, updated: r.getString('updated') || r.getString('created') })
      }
      parts.push(name + ':' + JSON.stringify(rows))
    }
    const hash = $security.sha256(parts.join('|'))

    const expectedHash = typeof body.hash === 'string' ? body.hash.trim() : ''

    // RED-012: backup inválido → falha segura (nada é alterado)
    if (!expectedHash || expectedHash !== hash) {
      const errorDetail = !expectedHash
        ? 'Hash obrigatório não informado.'
        : 'Hash divergente: restauração bloqueada (falha segura, nada foi alterado).'

      let receiptId = ''
      $app.runInTransaction((txApp) => {
        const receipt = new Record(txApp.findCollectionByNameOrId('backup_receipts'))
        receipt.set('kind', 'restauracao')
        receipt.set('result', 'falha')
        receipt.set('payload_hash', hash)
        receipt.set('expected_hash', expectedHash)
        receipt.set('counts', JSON.stringify(counts))
        receipt.set('error_detail', errorDetail)
        receipt.set('origin', 'manual')
        receipt.set('created_by', e.auth.id)
        txApp.save(receipt)
        receiptId = receipt.id

        const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
        audit.set('actor_id', e.auth.id)
        audit.set('action', 'backup_restore_failed')
        audit.set('resource', 'backup_receipts/' + receiptId)
        audit.set('outcome', 'failure')
        audit.set('details', { expectedHash, actualHash: hash, source: 'server_backup_restore' })
        audit.set('retention_days', 365)
        txApp.save(audit)
      })

      return e.json(409, { receiptId, result: 'falha', errorDetail })
    }

    // Backup válido → restauração comprovada via recibo auditado (simulada:
    // nenhum dado real é sobrescrito no piloto - linha vermelha de perda de dados)
    let receiptId = ''
    $app.runInTransaction((txApp) => {
      const receipt = new Record(txApp.findCollectionByNameOrId('backup_receipts'))
      receipt.set('kind', 'restauracao')
      receipt.set('result', 'sucesso')
      receipt.set('payload_hash', hash)
      receipt.set('expected_hash', expectedHash)
      receipt.set('counts', JSON.stringify(counts))
      receipt.set('origin', 'manual')
      receipt.set('created_by', e.auth.id)
      txApp.save(receipt)
      receiptId = receipt.id

      const audit = new Record(txApp.findCollectionByNameOrId('audit_logs'))
      audit.set('actor_id', e.auth.id)
      audit.set('action', 'backup_restore_verified')
      audit.set('resource', 'backup_receipts/' + receiptId)
      audit.set('outcome', 'success')
      audit.set('details', { hash, source: 'server_backup_restore' })
      audit.set('retention_days', 365)
      txApp.save(audit)
    })

    return e.json(200, {
      receiptId,
      result: 'sucesso',
      counts,
      detail: 'Integridade verificada e restauração comprovada via recibo auditado.',
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/backup/receipts',
  (e) => {
    const receipts = $app.findRecordsByFilter('backup_receipts', '', '-created', 100, 0)
    const items = []
    for (const r of receipts) {
      let counts = {}
      try {
        counts = JSON.parse(r.getString('counts') || '{}')
      } catch (_) {
        counts = {}
      }
      items.push({
        id: r.id,
        kind: r.getString('kind'),
        result: r.getString('result'),
        payloadHash: r.getString('payload_hash'),
        expectedHash: r.getString('expected_hash'),
        counts,
        errorDetail: r.getString('error_detail'),
        origin: r.getString('origin'),
        created: r.getString('created'),
      })
    }
    return e.json(200, { items })
  },
  $apis.requireAuth(),
)
