// Emenda de UX (D-UX-01, 09/11/2026):
// 1) Desfecho mínimo (RF-22/RN-17): marcos "won" (ganha) e "lost" (perdida).
//    O registro passa pela rota /backend/v1/opportunities/outcome (motivo de
//    perda obrigatório); CRUD direto continua negado.
// 2) Visibilidade do time (RF-24/RF-17): Gestão, Aprovador e Administrador
//    passam a LER todas as oportunidades, marcos e fichas. Escrita não muda:
//    continua com o responsável e com as rotas server-side.
//    Usuário desativado (users.disabled, migration 0051) não lê nada.
migrate(
  (app) => {
    const TEAM = '(@request.auth.role = "gestao" || @request.auth.role = "aprovador" || @request.auth.role = "admin")'
    const ACTIVE = '@request.auth.id != "" && @request.auth.disabled != true'

    const events = app.findCollectionByNameOrId('opportunity_events')
    const milestone = events.fields.getByName('milestone')
    milestone.values = ['received', 'apt', 'ready', 'sent', 'won', 'lost']
    events.listRule = ACTIVE + ' && (opportunity_id.responsible_user_id = @request.auth.id || ' + TEAM + ')'
    events.viewRule = events.listRule
    app.save(events)

    const opportunities = app.findCollectionByNameOrId('opportunities')
    opportunities.listRule = ACTIVE + ' && (responsible_user_id = @request.auth.id || ' + TEAM + ')'
    opportunities.viewRule = opportunities.listRule
    app.save(opportunities)

    const sheets = app.findCollectionByNameOrId('tech_sheets')
    sheets.listRule = ACTIVE + ' && (opportunity_id.responsible_user_id = @request.auth.id || ' + TEAM + ')'
    sheets.viewRule = sheets.listRule
    app.save(sheets)
  },
  (app) => {
    const events = app.findCollectionByNameOrId('opportunity_events')
    events.fields.getByName('milestone').values = ['received', 'apt', 'ready', 'sent']
    events.listRule = "@request.auth.id != '' && opportunity_id.responsible_user_id = @request.auth.id"
    events.viewRule = events.listRule
    app.save(events)

    const opportunities = app.findCollectionByNameOrId('opportunities')
    opportunities.listRule = '@request.auth.id != "" && responsible_user_id = @request.auth.id'
    opportunities.viewRule = opportunities.listRule
    app.save(opportunities)

    const sheets = app.findCollectionByNameOrId('tech_sheets')
    sheets.listRule = "@request.auth.id != '' && opportunity_id.responsible_user_id = @request.auth.id"
    sheets.viewRule = sheets.listRule
    app.save(sheets)
  },
)
