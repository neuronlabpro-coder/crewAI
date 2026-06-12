import Link from 'next/link'
import { getAgents, getUsageLogs, bucketByDay, topAgents } from '@/lib/insforge'
import AgentTable from '@/components/AgentTable'

export const dynamic = 'force-dynamic'

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}

export default async function Dashboard() {
  const [agents, usageLogs] = await Promise.all([
    getAgents().catch(() => []),
    getUsageLogs(7).catch(() => []),
  ])

  const total    = agents.length
  const experts  = agents.filter((a) => a.agent_type === 'expert').length
  const teachers = agents.filter((a) => a.agent_type === 'teacher').length
  const active   = agents.filter((a) => a.active !== false).length

  // Today's stats
  const todayStr     = new Date().toISOString().slice(0, 10)
  const todayLogs    = usageLogs.filter((l) => l.created_at.startsWith(todayStr))
  const reqToday     = todayLogs.length
  const tokensToday  = todayLogs.reduce((s, l) => s + (l.tokens_used ?? 0), 0)
  const reqWeek      = usageLogs.length
  const tokensWeek   = usageLogs.reduce((s, l) => s + (l.tokens_used ?? 0), 0)

  const agentStats = [
    { label: 'Total Agentes', value: total   },
    { label: 'Expert',        value: experts  },
    { label: 'Teacher',       value: teachers },
    { label: 'Activos',       value: active   },
  ]

  const usageStats = [
    { label: 'Solicitudes hoy',  value: fmtNum(reqToday)    },
    { label: 'Tokens hoy',       value: fmtNum(tokensToday) },
    { label: 'Solicitudes 7d',   value: fmtNum(reqWeek)     },
    { label: 'Tokens 7d',        value: fmtNum(tokensWeek)  },
  ]

  const daily  = bucketByDay(usageLogs, 7)
  const maxReq = Math.max(...daily.map((d) => d.requests), 1)
  const top    = topAgents(usageLogs, 6)
  const maxTop = Math.max(...top.map((t) => t.count), 1)

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[2rem] font-medium text-ink leading-none tracking-[-0.03em]">
            Dashboard
          </h1>
          <p className="text-sm text-dim mt-1">NeuronGuard AG Agents Platform</p>
        </div>
        <Link
          href="/agents/new"
          className="px-5 py-2.5 bg-cta text-white text-sm font-display font-medium rounded-md hover:bg-cta-hi transition-colors"
        >
          Nuevo Agente
        </Link>
      </div>

      {/* Agent stats */}
      <div>
        <p className="font-display text-[11px] font-semibold tracking-[0.88px] uppercase text-dim mb-3">
          Agentes
        </p>
        <div className="grid grid-cols-2 gap-4">
          {agentStats.map(({ label, value }) => (
            <div key={label} className="p-6 rounded-lg border border-line bg-panel">
              <p className="font-display text-[11px] font-semibold tracking-[0.88px] uppercase text-dim mb-3">
                {label}
              </p>
              <p className="font-display text-3xl font-medium text-ink">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Usage stats */}
      <div>
        <p className="font-display text-[11px] font-semibold tracking-[0.88px] uppercase text-dim mb-3">
          Uso
        </p>
        <div className="grid grid-cols-2 gap-4">
          {usageStats.map(({ label, value }) => (
            <div key={label} className="p-6 rounded-lg border border-line bg-panel">
              <p className="font-display text-[11px] font-semibold tracking-[0.88px] uppercase text-dim mb-3">
                {label}
              </p>
              <p className="font-display text-3xl font-medium text-ink">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Activity chart — requests last 7 days */}
      <div className="p-6 rounded-lg border border-line bg-panel">
        <p className="font-display text-[11px] font-semibold tracking-[0.88px] uppercase text-dim mb-5">
          Actividad — últimos 7 días
        </p>
        <div className="flex items-end gap-2 h-32">
          {daily.map((d) => {
            const heightPct = maxReq > 0 ? (d.requests / maxReq) * 100 : 0
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 group">
                <span className="text-[10px] text-dim opacity-0 group-hover:opacity-100 transition-opacity">
                  {d.requests}
                </span>
                <div
                  className="w-full rounded-t-sm bg-cta/70 group-hover:bg-cta transition-colors min-h-[2px]"
                  style={{ height: `${Math.max(heightPct, 2)}%` }}
                />
                <span className="text-[10px] text-dim whitespace-nowrap">
                  {fmtDate(d.date)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top agents */}
      {top.length > 0 && (
        <div className="p-6 rounded-lg border border-line bg-panel">
          <p className="font-display text-[11px] font-semibold tracking-[0.88px] uppercase text-dim mb-5">
            Agentes más usados (7d)
          </p>
          <div className="space-y-2.5">
            {top.map(({ slug, count }) => {
              const widthPct = (count / maxTop) * 100
              return (
                <div key={slug} className="flex items-center gap-3">
                  <span className="text-xs text-dim w-40 truncate shrink-0">{slug}</span>
                  <div className="flex-1 h-5 bg-line rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-cta/70 rounded-sm transition-all"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-ink w-6 text-right shrink-0">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Agents table */}
      <div>
        <p className="font-display text-[11px] font-semibold tracking-[0.88px] uppercase text-dim mb-4">
          Todos los Agentes
        </p>
        <AgentTable agents={agents} />
      </div>
    </div>
  )
}
