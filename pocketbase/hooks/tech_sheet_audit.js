onRecordAfterCreateSuccess((e) => {
  const record = e.record
  const audit = new Record($app.findCollectionByNameOrId('audit_logs'))
  audit.set('actor_id', record.getString('created_by'))
  audit.set('action', 'tech_sheet_created')
  audit.set('resource', 'tech_sheets/' + record.id)
  audit.set('outcome', 'success')
  audit.set('details', {
    opportunityId: record.getString('opportunity_id'),
    version: record.getInt('version'),
    parameterCount: (record.get('parameters') || []).length,
    pendingCount: (record.get('pending_items') || []).length,
    attachmentCount: (record.get('attachments') || []).length,
    source: 'server_tech_sheet_create',
  })
  audit.set('retention_days', 365)
  $app.save(audit)
  return e.next()
}, 'tech_sheets')
