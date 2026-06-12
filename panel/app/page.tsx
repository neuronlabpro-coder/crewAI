import Link from 'next/link'
import { getAgents } from '@/lib/insforge'
import AgentTable from '@/components/AgentTable'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  let agents: Awaited<ReturnType<typeof getAgents>> = []
  let error = ''
  try {
    agents = await getAgents()
  } catch (err) {
    error = err instanceof Error ? err.message : 'Error cargando agentes'
  }

  const total    = agents.length
  const experts  = agents.filter((a) => a.agent_type === 'expert').length
  const teachers = agents.filter((a) => a.agent_type === 'teacher').length
  const active   = agents.filter((a) => a.active !== false).length

  const stats = [
    { label: 'Total Agentes', value: total   },
    { label: 'Expert',        value: experts  },
    { label: 'Teacher',       value: teachers },
    { label: 'Activos',       value: active   },
  ]

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {/* display-md: 32px/500 light | 32px/500/-0.96px dark */}
          <h1 className="font-display text-[2rem] font-medium text-ink leading-none tracking-[-0.03em]">
            Dashboard
          </h1>
          <p className="text-sm text-dim mt-1">NeuronGuard AG Agents Platform</p>
        </div>
        {/* button-primary: bg=tertiary/#00A3B4 light | bg=primary/#0007cd dark */}
        <Link
          href="/agents/new"
          className="px-5 py-2.5 bg-cta text-white text-sm font-display font-medium rounded-md hover:bg-cta-hi transition-colors"
        >
          Nuevo Agente
        </Link>
      </div>

      {/* Stats — card: surface/white light | surface-card/#181818 dark */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map(({ label, value }) => (
          <div key={label} className="p-6 rounded-lg border border-line bg-panel">
            {/* caption-uppercase: 11px/600/0.88px */}
            <p className="font-display text-[11px] font-semibold tracking-[0.88px] uppercase text-dim mb-3">
              {label}
            </p>
            <p className="font-display text-3xl font-medium text-ink">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div>
        <p className="font-display text-[11px] font-semibold tracking-[0.88px] uppercase text-dim mb-4">
          Todos los Agentes
        </p>
        {error ? (
          <div className="p-4 rounded-lg border border-err/40 bg-err/10 text-err text-sm">
            {error}
          </div>
        ) : (
          <AgentTable agents={agents} />
        )}
      </div>
    </div>
  )
}
