// Usuário desativado na área de admin não entra nem renova a sessão.
onRecordAuthWithPasswordRequest((e) => {
  if (e.record && e.record.getBool('disabled')) {
    throw new BadRequestError('Este acesso foi desativado. Fale com o administrador do sistema.')
  }
  return e.next()
}, 'users')

onRecordAuthRefreshRequest((e) => {
  if (e.record && e.record.getBool('disabled')) {
    throw new ForbiddenError('Este acesso foi desativado. Fale com o administrador do sistema.')
  }
  return e.next()
}, 'users')
