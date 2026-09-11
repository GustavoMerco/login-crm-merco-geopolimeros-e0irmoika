cronAdd('audit_retention_365_days', '0 3 * * *', () => {
  const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
  let removed = 0
  let batch = $app.findRecordsByFilter('audit_logs', 'created < {:cutoff}', 'created', 500, 0, {
    cutoff,
  })

  while (batch.length > 0) {
    for (const record of batch) {
      $app.delete(record)
      removed += 1
    }
    batch = $app.findRecordsByFilter('audit_logs', 'created < {:cutoff}', 'created', 500, 0, {
      cutoff,
    })
  }

  $app.logger().info('Audit retention cleanup completed', 'removed', removed, 'retentionDays', 365)
})
