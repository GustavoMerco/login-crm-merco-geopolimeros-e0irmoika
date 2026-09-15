migrate(
  (app) => {
    // Retroalimenta a timeline das oportunidades criadas antes da instrumentação
    // da T1.6, usando os timestamps server-side já existentes nos registros.
    const usersId = app.findCollectionByNameOrId('_pb_users_auth_').id

    const opportunities = app.findRecordsByFilter('opportunities', '', '-received_at', 500, 0)
    for (const opportunity of opportunities) {
      const opportunityId = opportunity.id

      const hasEvent = (milestone) => {
        const found = app.findRecordsByFilter(
          'opportunity_events',
          'opportunity_id = "' + opportunityId + '" && milestone = "' + milestone + '"',
          '',
          1,
          0,
        )
        return found.length > 0
      }

      if (!hasEvent('received')) {
        const event = new Record(app.findCollectionByNameOrId('opportunity_events'))
        event.set('opportunity_id', opportunityId)
        event.set('milestone', 'received')
        event.set('note', 'registro retroativo da instrumentação')
        event.set('occurred_at', opportunity.getString('received_at'))
        event.set('created_by', opportunity.getString('responsible_user_id') || usersId)
        app.save(event)
      }

      const aptitudeStatus = opportunity.getString('aptitude_status')
      const evaluatedAt = opportunity.getString('aptitude_evaluated_at')
      if (
        (aptitudeStatus === 'apt' || aptitudeStatus === 'exception_approved') &&
        evaluatedAt &&
        !hasEvent('apt')
      ) {
        const event = new Record(app.findCollectionByNameOrId('opportunity_events'))
        event.set('opportunity_id', opportunityId)
        event.set('milestone', 'apt')
        event.set('note', 'registro retroativo da instrumentação')
        event.set('occurred_at', evaluatedAt)
        event.set('created_by', opportunity.getString('responsible_user_id') || usersId)
        app.save(event)
      }
    }
  },
  (app) => {
    // Down intencionalmente vazio: eventos retroativos são históricos legítimos.
  },
)
