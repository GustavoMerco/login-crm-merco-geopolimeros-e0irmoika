import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme, type ThemePreference } from '@/contexts/ThemeContext'
import { usePermissions } from '@/contexts/PermissionsContext'
import { ROLE_LABELS } from '@/lib/auth/permissions'
import { activeNavItemFor, homeForRole, navForRole, pageTitle } from '@/lib/navigation'
import { useCompositionDraft } from '@/contexts/CompositionDraftContext'
import { MercoLogo } from '@/components/MercoLogo'

// Casca do sistema no design system Mercogeo: barra lateral petróleo com o menu
// do perfil, topo com título e tema. O menu é organizado pelo trabalho; as
// funções técnicas legadas continuam em "Evidências e controles".
const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'system', label: 'Sistema' },
]

function ThemeSwitch() {
  const { preference, setPreference } = useTheme()
  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className="flex rounded-lg border border-mg-line bg-mg-surface-2 p-0.5"
    >
      {THEME_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={preference === option.value}
          onClick={() => setPreference(option.value)}
          className={`min-h-[32px] rounded-md px-2.5 text-[12px] font-semibold transition-colors duration-150 ${
            preference === option.value
              ? 'bg-mg-surface text-mg-ink shadow-sm'
              : 'text-mg-muted hover:text-mg-ink'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const { hasUnsavedChanges } = useCompositionDraft()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { can } = usePermissions()
  const groups = navForRole(user?.role, (module) => can(module, 'view'))
  const active = activeNavItemFor(location.pathname, location.search)

  const signOut = async () => {
    if (
      hasUnsavedChanges &&
      !window.confirm(
        'Há alterações não salvas na Biblioteca. Ao encerrar a sessão, elas serão perdidas. Deseja continuar?',
      )
    )
      return
    await logout()
    navigate('/', { replace: true })
  }

  const nav = (
    <nav aria-label="Navegação principal" className="flex-1 overflow-y-auto px-3 py-4">
      {groups.length === 0 && (
        <p className="px-3 text-sm text-mg-sidebar-ink">
          Nenhuma função disponível para o papel atual.
        </p>
      )}
      {groups.map((group) => (
        <div key={group.id} className="mb-5">
          <p className="mg-eyebrow px-3 pb-1.5 text-mg-sidebar-ink/80">{group.label}</p>
          <ul>
            {group.items.map((item) => {
              const isActive = active?.id === item.id
              return (
                <li key={item.id}>
                  <Link
                    to={item.url}
                    onClick={() => setOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`relative flex min-h-[40px] items-center rounded-lg px-3 text-[14px] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-accent ${
                      isActive
                        ? 'bg-white/10 font-bold text-white'
                        : 'font-medium text-mg-sidebar-ink hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-mg-accent"
                      />
                    )}
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )

  const footer = (
    <div className="border-t border-white/10 p-4">
      <p className="truncate text-sm font-semibold text-white">
        {user?.name || user?.email || 'Usuário'}
      </p>
      <p className="text-[12px] text-mg-sidebar-ink">
        {user?.role ? ROLE_LABELS[user.role] : 'Papel não definido'}
      </p>
      <button
        type="button"
        className="mt-3 min-h-[40px] w-full rounded-lg border border-white/15 px-3 text-left text-sm text-mg-sidebar-ink transition-colors hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-accent"
        onClick={() => void signOut()}
      >
        Encerrar sessão
      </button>
    </div>
  )

  const brand = (
    <Link
      to={homeForRole(user?.role)}
      aria-label="Merco Geopolímeros — início"
      className="block px-5 py-5"
      onClick={() => setOpen(false)}
    >
      <MercoLogo size={30} />
    </Link>
  )

  return (
    <div className="min-h-screen bg-mg-canvas text-mg-ink">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-mg-surface focus:p-2"
      >
        Pular para o conteúdo
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-mg-sidebar lg:flex">
        {brand}
        {nav}
        {footer}
      </aside>
      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-mg-line bg-mg-surface/90 px-4 py-2 backdrop-blur sm:px-6">
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger
              className="min-h-[40px] rounded-lg border border-mg-line px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-mg-brand lg:hidden"
              aria-label="Abrir menu de navegação"
            >
              Menu
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
              <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,90vw)] flex-col bg-mg-sidebar">
                <Dialog.Title className="sr-only">Navegação</Dialog.Title>
                <Dialog.Description className="sr-only">
                  Funções do seu perfil. Escape fecha o menu.
                </Dialog.Description>
                <div className="flex items-center justify-between pr-3">
                  {brand}
                  <Dialog.Close
                    aria-label="Fechar menu"
                    className="min-h-[40px] rounded-lg border border-white/15 px-3 text-sm text-white"
                  >
                    Fechar
                  </Dialog.Close>
                </div>
                {nav}
                {footer}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <h1 className="min-w-0 flex-1 truncate text-[17px] font-bold">
            {pageTitle(location.pathname, location.search)}
          </h1>
          <ThemeSwitch />
        </header>
        <main id="conteudo" className="min-w-0 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
