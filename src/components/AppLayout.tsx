import React, { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_LABELS } from '@/lib/auth/permissions'
import { sectionsForRole, sectionUrl } from '@/lib/navigation'
import * as Dialog from '@radix-ui/react-dialog'

export default function AppLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const sections = sectionsForRole(user?.role)
  const active = new URLSearchParams(location.search).get('secao')
  const title =
    location.pathname === '/dashboard'
      ? 'Central de trabalho técnico'
      : sections.find(([id]) => id === active)?.[1] || 'Painel técnico'
  const nav = (
    <nav aria-label="Navegação principal" className="flex-1 overflow-y-auto p-3">
      <Link
        className="block min-h-[44px] rounded p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-300"
        to="/dashboard"
        onClick={() => setOpen(false)}
      >
        Início
      </Link>
      {sections.map(([id, label], index) => (
        <React.Fragment key={id}>
          {index === 4 && (
            <p className="mt-4 px-3 text-sm font-semibold text-white">Administração e evidências</p>
          )}
          <Link
            aria-current={active === id ? 'page' : undefined}
            className={`block min-h-[44px] rounded p-3 text-sm hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-300 ${active === id ? 'border-l-4 border-orange-300 bg-emerald-800 font-bold' : ''}`}
            to={sectionUrl(id)}
            onClick={() => setOpen(false)}
          >
            {label}
          </Link>
        </React.Fragment>
      ))}
    </nav>
  )
  const signOut = async () => {
    await logout()
    navigate('/', { replace: true })
  }
  const footer = (
    <div className="border-t border-emerald-700 p-3">
      <p className="px-3 text-sm">{user?.role ? ROLE_LABELS[user.role] : 'Papel não definido'}</p>
      <button
        className="mt-2 min-h-[44px] w-full rounded border border-emerald-600 p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-300"
        onClick={() => void signOut()}
      >
        Encerrar sessão
      </button>
    </div>
  )
  return (
    <div className="min-h-screen bg-[#F6F8F7] text-[#0F1F1C]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-[#064E3B] text-white lg:flex">
        <p className="border-b border-emerald-700 p-5 font-bold">Merco Geopolímeros</p>
        {nav}
        {footer}
      </aside>
      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b bg-white px-4 py-2">
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger
              className="min-h-[44px] min-w-[44px] rounded border px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 lg:hidden"
              aria-label="Abrir menu de navegação"
            >
              Menu
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
              <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,90vw)] flex-col bg-[#064E3B] text-white">
                <div className="flex items-center justify-between border-b border-emerald-700 p-3">
                  <Dialog.Title className="font-bold">Navegação</Dialog.Title>
                  <Dialog.Close
                    aria-label="Fechar menu"
                    className="min-h-[44px] min-w-[44px] rounded border px-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-300"
                  >
                    Fechar
                  </Dialog.Close>
                </div>
                <Dialog.Description className="sr-only">
                  Funções existentes conforme o papel. Escape fecha o menu.
                </Dialog.Description>
                {nav}
                {footer}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <h1 className="min-w-0 text-lg font-bold">{title}</h1>
        </header>
        <main id="conteudo" className="min-w-0 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
