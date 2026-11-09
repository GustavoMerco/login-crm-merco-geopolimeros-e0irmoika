import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionsContext'
import { ROLES, ROLE_LABELS, type UserRole } from '@/lib/auth/permissions'
import {
  ACCESS_ACTIONS,
  ACCESS_MODULES,
  ACTION_LABELS,
  DEFAULT_MATRIX,
  isLocked,
  matrixToRows,
  rowsToMatrix,
  summarize,
  toggleFlag,
  type AccessModule,
  type RoleMatrix,
} from '@/lib/auth/accessMatrix'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import {
  createUser,
  generatePassword,
  getPermissionMatrix,
  listUsers,
  savePermissionMatrix,
  updateUser,
  type AdminUser,
  type CreateUserInput,
} from '@/services/admin'
import { Button, Notice, PageHeader, Panel, Pill } from '@/components/crm/ui'

// Admin → Usuários e permissões. Criar usuário, definir perfil, desativar
// (no lugar de apagar) e configurar o que cada perfil pode ver, criar, editar
// e apagar em cada módulo. Tudo validado e auditado no servidor.
type Tab = 'usuarios' | 'permissoes'

const inputClass =
  'mt-1.5 min-h-[40px] w-full rounded-lg border border-mg-line-strong bg-mg-surface px-3 text-sm font-normal text-mg-ink outline-none placeholder:text-mg-muted focus:border-mg-brand focus:ring-4 focus:ring-mg-brand/20'
const labelClass = 'block text-[13px] font-semibold text-mg-ink'

const ROLE_HINTS: Record<UserRole, string> = {
  comercial: 'Recebe demandas, acompanha prazos e registra o envio.',
  engenharia: 'Ficha técnica, composições e dimensionamento.',
  financeiro: 'Parâmetros de custo, BDI e preço.',
  aprovador: 'Decide exceções de preço e aprova propostas.',
  gestao: 'Acompanha indicadores e evidências.',
  admin: 'Acesso total, incluindo usuários e permissões.',
}

function UsersTab() {
  const { user: me } = useAuth()
  const { can } = usePermissions()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState<CreateUserInput>({ name: '', email: '', role: 'comercial', password: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await listUsers()
      setUsers(result.items)
      setError(null)
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    try {
      const created = await createUser(form)
      setInfo(`Usuário ${created.name} criado. Envie a senha inicial por um canal seguro; ele pode trocá-la em "Esqueci a senha".`)
      setForm({ name: '', email: '', role: 'comercial', password: '' })
      setIsFormOpen(false)
      await load()
    } catch (err: unknown) {
      setFormError(getErrorMessage(err))
    }
  }

  const change = async (target: AdminUser, input: { role?: UserRole; disabled?: boolean }, success: string) => {
    setBusyId(target.id)
    setError(null)
    setInfo(null)
    try {
      await updateUser(target.id, input)
      setInfo(success)
      await load()
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setBusyId('')
    }
  }

  const canCreate = can('usuarios', 'create')
  const canEdit = can('usuarios', 'edit')
  const canDisable = can('usuarios', 'delete')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-mg-muted">
          {users.length} usuário(s). Desativar corta o acesso na hora e preserva o histórico de quem fez o quê.
        </p>
        {canCreate && (
          <Button variant="primary" onClick={() => setIsFormOpen((open) => !open)} aria-expanded={isFormOpen}>
            {isFormOpen ? 'Fechar cadastro' : 'Novo usuário'}
          </Button>
        )}
      </div>

      {isFormOpen && (
        <Panel title="Novo usuário">
          <form onSubmit={(event) => void submit(event)} className="grid gap-4 sm:grid-cols-2" noValidate>
            <label className={labelClass}>
              Nome
              <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={120} />
            </label>
            <label className={labelClass}>
              E-mail
              <input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </label>
            <label className={labelClass}>
              Perfil
              <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[12px] font-normal text-mg-muted">{ROLE_HINTS[form.role]}</span>
            </label>
            <label className={labelClass}>
              Senha inicial
              <span className="mt-1.5 flex gap-2">
                <input
                  className={`${inputClass} mg-num mt-0`}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  minLength={10}
                  required
                />
                <Button onClick={() => setForm({ ...form, password: generatePassword() })}>Gerar</Button>
              </span>
              <span className="mt-1 block text-[12px] font-normal text-mg-muted">Mínimo de 10 caracteres.</span>
            </label>
            {formError && (
              <div className="sm:col-span-2">
                <Notice tone="crit">{formError}</Notice>
              </div>
            )}
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                className="inline-flex min-h-[40px] items-center rounded-lg bg-mg-action px-4 text-sm font-semibold text-white hover:bg-mg-action-hover"
              >
                Criar usuário
              </button>
              <Button variant="quiet" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Panel>
      )}

      {error && <Notice tone="crit">{error}</Notice>}
      {info && <Notice tone="neutral">{info}</Notice>}

      {isLoading ? (
        <p role="status" className="text-sm text-mg-muted">
          Carregando usuários…
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-mg-line bg-mg-surface">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Usuários do sistema</caption>
            <thead className="border-b border-mg-line bg-mg-surface-2">
              <tr>
                {['Nome', 'E-mail', 'Perfil', 'Situação', ''].map((head) => (
                  <th key={head} scope="col" className="mg-eyebrow px-4 py-3 text-mg-muted">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-mg-line">
              {users.map((item) => {
                const isMe = item.id === me?.id
                return (
                  <tr key={item.id} className={item.disabled ? 'opacity-60' : ''}>
                    <td className="px-4 py-3 font-semibold text-mg-ink">
                      {item.name || '—'} {isMe && <span className="ml-1 text-[12px] font-normal text-mg-muted">(você)</span>}
                    </td>
                    <td className="mg-num px-4 py-3 text-[13px] text-mg-muted">{item.email}</td>
                    <td className="px-4 py-3">
                      <select
                        aria-label={`Perfil de ${item.name || item.email}`}
                        className="min-h-[36px] rounded-lg border border-mg-line-strong bg-mg-surface px-2 text-sm text-mg-ink disabled:opacity-60"
                        value={item.role}
                        disabled={!canEdit || isMe || busyId === item.id}
                        onChange={(e) => void change(item, { role: e.target.value as UserRole }, `Perfil de ${item.name} alterado para ${ROLE_LABELS[e.target.value as UserRole]}.`)}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">{item.disabled ? <Pill tone="neutral">Desativado</Pill> : <Pill tone="ok">Ativo</Pill>}</td>
                    <td className="px-4 py-3 text-right">
                      {canDisable && !isMe && (
                        <Button
                          variant="quiet"
                          disabled={busyId === item.id}
                          onClick={() =>
                            void change(
                              item,
                              { disabled: !item.disabled },
                              item.disabled ? `${item.name} reativado.` : `${item.name} desativado; as sessões abertas foram encerradas.`,
                            )
                          }
                        >
                          {item.disabled ? 'Reativar' : 'Desativar'}
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PermissionsTab() {
  const { can, refresh } = usePermissions()
  const [saved, setSaved] = useState<Record<UserRole, RoleMatrix> | null>(null)
  const [draft, setDraft] = useState<Record<UserRole, RoleMatrix> | null>(null)
  const [role, setRole] = useState<UserRole>('comercial')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const canEdit = can('usuarios', 'edit')

  const load = useCallback(async () => {
    try {
      const result = await getPermissionMatrix()
      const matrix = rowsToMatrix(result.items)
      setSaved(matrix)
      setDraft(JSON.parse(JSON.stringify(matrix)))
      setError(null)
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const dirty = useMemo(() => JSON.stringify(saved) !== JSON.stringify(draft), [saved, draft])

  const toggle = (module: AccessModule, action: (typeof ACCESS_ACTIONS)[number]) => {
    if (!draft || !canEdit || isLocked(role, module)) return
    setDraft({ ...draft, [role]: { ...draft[role], [module]: toggleFlag(role, module, draft[role][module], action) } })
    setInfo(null)
  }

  const save = async () => {
    if (!draft) return
    setIsSaving(true)
    setError(null)
    try {
      const result = await savePermissionMatrix(matrixToRows(draft))
      setInfo(result.changed > 0 ? `${result.changed} permissão(ões) atualizada(s). Vale no próximo carregamento de cada usuário.` : 'Nada mudou.')
      await load()
      await refresh()
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setIsSaving(false)
    }
  }

  if (!draft) {
    return error ? <Notice tone="crit">{error}</Notice> : <p role="status" className="text-sm text-mg-muted">Carregando permissões…</p>
  }

  return (
    <div className="space-y-6">
      <div role="radiogroup" aria-label="Perfil" className="flex flex-wrap gap-2">
        {ROLES.map((item) => (
          <button
            key={item}
            type="button"
            role="radio"
            aria-checked={role === item}
            onClick={() => setRole(item)}
            className={`min-h-[36px] rounded-full border px-4 text-[13px] font-semibold transition-colors ${
              role === item ? 'border-mg-brand-fill bg-mg-brand-fill text-white' : 'border-mg-line-strong bg-mg-surface text-mg-ink hover:bg-mg-brand-soft'
            }`}
          >
            {ROLE_LABELS[item]}
          </button>
        ))}
      </div>
      <p className="-mt-3 text-sm text-mg-muted">{ROLE_HINTS[role]}</p>

      <div className="overflow-x-auto rounded-xl border border-mg-line bg-mg-surface">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Permissões do perfil {ROLE_LABELS[role]}</caption>
          <thead className="border-b border-mg-line bg-mg-surface-2">
            <tr>
              <th scope="col" className="mg-eyebrow px-4 py-3 text-mg-muted">
                Módulo
              </th>
              {ACCESS_ACTIONS.map((action) => (
                <th key={action} scope="col" className="mg-eyebrow px-4 py-3 text-center text-mg-muted">
                  {ACTION_LABELS[action]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-mg-line">
            {ACCESS_MODULES.map((module) => {
              const flags = draft[role][module.id]
              const locked = isLocked(role, module.id)
              return (
                <tr key={module.id}>
                  <th scope="row" className="px-4 py-3 font-normal">
                    <span className="block font-semibold text-mg-ink">{module.label}</span>
                    <span className="block text-[12px] text-mg-muted">{locked ? 'Fixo: o Administrador sempre administra usuários.' : module.description}</span>
                  </th>
                  {ACCESS_ACTIONS.map((action) => (
                    <td key={action} className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        aria-label={`${ACTION_LABELS[action]} — ${module.label}`}
                        checked={flags[action]}
                        disabled={!canEdit || locked}
                        onChange={() => toggle(module.id, action)}
                        className="h-5 w-5 cursor-pointer rounded border-mg-line-strong accent-[rgb(var(--mg-brand-fill))] disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {error && <Notice tone="crit">{error}</Notice>}
      {info && <Notice tone="neutral">{info}</Notice>}

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" disabled={!dirty || isSaving} onClick={() => void save()}>
            {isSaving ? 'Salvando…' : 'Salvar permissões'}
          </Button>
          <Button disabled={!dirty} onClick={() => saved && setDraft(JSON.parse(JSON.stringify(saved)))}>
            Descartar alterações
          </Button>
          <Button variant="quiet" onClick={() => setDraft({ ...draft, [role]: JSON.parse(JSON.stringify(DEFAULT_MATRIX[role])) })}>
            Restaurar padrão deste perfil
          </Button>
        </div>
      )}

      <Panel title="Resumo de todos os perfis" eyebrow="Leitura rápida">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <caption className="sr-only">Resumo das permissões por perfil e módulo</caption>
            <thead>
              <tr>
                <th scope="col" className="py-2 pr-3 text-mg-muted">
                  Módulo
                </th>
                {ROLES.map((item) => (
                  <th key={item} scope="col" className="px-2 py-2 text-mg-muted">
                    {ROLE_LABELS[item]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-mg-line">
              {ACCESS_MODULES.map((module) => (
                <tr key={module.id}>
                  <th scope="row" className="py-2 pr-3 font-semibold text-mg-ink">
                    {module.label}
                  </th>
                  {ROLES.map((item) => {
                    const label = summarize(draft[item][module.id])
                    const tone = label === 'Sem acesso' ? 'text-mg-muted' : label === 'Só ver' ? 'text-mg-ink' : 'font-semibold text-mg-brand'
                    return (
                      <td key={item} className={`px-2 py-2 ${tone}`}>
                        {label}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}

export default function AdminAccess() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: Tab = searchParams.get('aba') === 'permissoes' ? 'permissoes' : 'usuarios'
  const go = (next: Tab) => setSearchParams(next === 'usuarios' ? {} : { aba: next }, { replace: true })

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Administração"
        title="Usuários e permissões"
        description="Quem acessa o sistema, com qual perfil, e o que cada perfil pode ver, criar, editar e apagar."
      />
      <div role="tablist" aria-label="Administração de acesso" className="mb-6 flex gap-1 border-b border-mg-line">
        {(
          [
            ['usuarios', 'Usuários'],
            ['permissoes', 'Perfis e permissões'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => go(id)}
            className={`relative min-h-[44px] px-4 text-[14px] font-semibold ${tab === id ? 'text-mg-ink' : 'text-mg-muted hover:text-mg-ink'}`}
          >
            {label}
            {tab === id && <span aria-hidden="true" className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-mg-accent" />}
          </button>
        ))}
      </div>
      {tab === 'usuarios' ? <UsersTab /> : <PermissionsTab />}
    </div>
  )
}
