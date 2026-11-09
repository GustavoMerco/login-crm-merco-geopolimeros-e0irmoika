import React from 'react'
import { Link } from 'react-router-dom'
import type { DeadlineInfo, StageId } from '@/lib/pipeline'
import { JOURNEY, stageLabel } from '@/lib/pipeline'

// Componentes do design system Mercogeo ("Laje nivelada").
// Ver docs/design-system/DESIGN-mercogeo.md.

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mg-eyebrow text-mg-brand">{eyebrow}</p>}
        <h2 className="mt-1 text-2xl font-bold tracking-[-0.01em] text-mg-ink">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-mg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

const buttonBase =
  'inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60'

export function PrimaryLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className={`${buttonBase} bg-mg-action text-white hover:bg-mg-action-hover`}>
      {children}
    </Link>
  )
}

export function SecondaryLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className={`${buttonBase} border border-mg-brand bg-mg-surface text-mg-brand hover:bg-mg-brand-soft`}>
      {children}
    </Link>
  )
}

export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' }) {
  const styles = {
    primary: 'bg-mg-action text-white hover:bg-mg-action-hover',
    secondary: 'border border-mg-brand bg-mg-surface text-mg-brand hover:bg-mg-brand-soft',
    quiet: 'text-mg-neutral hover:bg-mg-brand-soft',
  }[variant]
  return <button type="button" className={`${buttonBase} ${styles} ${className}`} {...props} />
}

export function Panel({
  title,
  eyebrow,
  children,
  className = '',
  actions,
}: {
  title?: string
  eyebrow?: string
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
}) {
  return (
    <section className={`rounded-xl border border-mg-line bg-mg-surface p-5 ${className}`} aria-label={title}>
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {eyebrow && <p className="mg-eyebrow text-mg-muted">{eyebrow}</p>}
            {title && <h3 className="text-[15px] font-bold text-mg-ink">{title}</h3>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

type Tone = 'ok' | 'warn' | 'crit' | 'neutral' | 'brand'

const TONE: Record<Tone, { pill: string; dot: string; bar: string }> = {
  ok: { pill: 'bg-mg-ok-bg text-mg-ok', dot: 'bg-mg-ok', bar: 'bg-mg-ok' },
  warn: { pill: 'bg-mg-warn-bg text-mg-warn', dot: 'bg-mg-warn', bar: 'bg-mg-accent' },
  crit: { pill: 'bg-mg-crit-bg text-mg-crit', dot: 'bg-mg-crit', bar: 'bg-mg-crit' },
  neutral: { pill: 'bg-mg-neutral-bg text-mg-neutral', dot: 'bg-mg-neutral', bar: 'bg-mg-line-strong' },
  brand: { pill: 'bg-mg-brand-soft text-mg-brand', dot: 'bg-mg-brand', bar: 'bg-mg-brand' },
}

export function Pill({ tone, children, mono = false }: { tone: Tone; children: React.ReactNode; mono?: boolean }) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-bold leading-snug ${TONE[tone].pill} ${mono ? 'mg-num font-medium' : ''}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE[tone].dot}`} />
      {children}
    </span>
  )
}

export function deadlineTone(deadline: DeadlineInfo): Tone {
  switch (deadline.state) {
    case 'vencido':
    case 'atrasado':
      return 'crit'
    case 'hoje':
    case 'proximo':
      return 'warn'
    case 'cumprido':
      return 'ok'
    case 'ok':
      return 'brand'
    default:
      return 'neutral'
  }
}

export function deadlineBar(deadline: DeadlineInfo): string {
  return TONE[deadlineTone(deadline)].bar
}

export function DeadlinePill({ deadline }: { deadline: DeadlineInfo }) {
  return (
    <Pill tone={deadlineTone(deadline)} mono>
      {deadline.label}
    </Pill>
  )
}

const STAGE_TONE: Record<StageId, Tone> = {
  recebida: 'neutral',
  qualificacao: 'warn',
  apta: 'brand',
  engenharia: 'brand',
  pronta: 'brand',
  enviada: 'ok',
}

export function StagePill({ stage }: { stage: StageId }) {
  return <Pill tone={STAGE_TONE[stage]}>{stageLabel(stage)}</Pill>
}

export function Kpi({ label, value, hint, unit }: { label: string; value: string; hint: string; unit?: string }) {
  return (
    <div className="rounded-xl border border-mg-line bg-mg-surface p-5">
      <p className="mg-eyebrow text-mg-muted">{label}</p>
      <p className="mt-2 flex items-baseline gap-1.5 text-mg-ink">
        <span className="mg-num text-[30px] font-semibold leading-none">{value}</span>
        {unit && <span className="mg-num text-sm text-mg-muted">{unit}</span>}
      </p>
      <p className="mt-2 text-[13px] leading-snug text-mg-muted">{hint}</p>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-mg-line-strong bg-mg-surface px-6 py-10 text-center">
      <svg aria-hidden="true" width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-mg-brand">
        <path d="M4 28h32M8 28l6-10 6 6 8-14 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M20 4l3 5h-6z" fill="rgb(var(--mg-accent))" />
      </svg>
      <p className="mt-3 font-bold text-mg-ink">{title}</p>
      <p className="mt-1 max-w-md text-sm text-mg-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Notice({ tone, children }: { tone: 'warn' | 'crit' | 'neutral'; children: React.ReactNode }) {
  return (
    <div role={tone === 'crit' ? 'alert' : 'status'} className={`rounded-lg px-4 py-3 text-sm ${TONE[tone].pill}`}>
      {children}
    </div>
  )
}

// Régua da jornada completa: etapas não construídas aparecem tracejadas com a fase.
export function JourneyRuler({ currentIndex }: { currentIndex: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2" aria-label="Jornada da proposta">
      {JOURNEY.map((step, index) => {
        const done = step.available && index < currentIndex
        const current = index === currentIndex
        const base = 'flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-semibold'
        const style = !step.available
          ? 'border-dashed border-mg-line-strong text-mg-muted'
          : current
            ? 'border-mg-accent bg-mg-surface text-mg-ink ring-2 ring-mg-accent/30'
            : done
              ? 'border-mg-brand-fill bg-mg-brand-fill text-white'
              : 'border-mg-line text-mg-muted'
        return (
          <li key={step.id} className="flex items-center gap-1" aria-current={current ? 'step' : undefined}>
            <span className={`${base} ${style}`}>
              {step.label}
              {!step.available && <span className="mg-num text-[10px] font-medium">{step.phase}</span>}
            </span>
            {index < JOURNEY.length - 1 && <span aria-hidden="true" className="h-px w-3 bg-mg-line-strong" />}
          </li>
        )
      })}
    </ol>
  )
}
