routerAdd(
  'GET',
  '/backend/v1/source-audits',
  (e) => {
    const audits = $app.findRecordsByFilter('source_audits', '', '-updated', 100, 0)

    // Matriz sempre com os dois sistemas, mesmo sem auditoria registrada
    const matrix = []
    for (const system of ['vobi', 'omie']) {
      const found = audits.find((a) => a.getString('system') === system)
      if (found) {
        matrix.push({
          id: found.id,
          system,
          coverage: found.getString('coverage'),
          sourceOfTruth: found.getString('source_of_truth'),
          accessMethod: found.getString('access_method'),
          fieldsAvailable: found.getString('fields_available'),
          gaps: found.getString('gaps'),
          decision: found.getString('decision'),
          decisionReason: found.getString('decision_reason'),
          decisionOwner: found.getString('decision_owner'),
          decisionDate: found.getString('decision_date').slice(0, 10),
        })
      } else {
        matrix.push({ system, decision: 'nao_auditado' })
      }
    }

    return e.json(200, { matrix })
  },
  $apis.requireAuth(),
)
