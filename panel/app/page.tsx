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
          <h1 className="font-display text-[2rem] font-medium text-ink leading-none">
            Dashboard
          </h1>
          <p className="text-sm text-dim mt-1">NeuronGuard AG Agents Platform</p>
        </div>
        <Link
          href="/agents/new"
          className="px-5 py-3 bg-cta text-white text-sm font-display font-medium rounded-md hover:bg-cta-hi transition-colors"
        >
          Nuevo Agente
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value }) => (
          <div key={label} className="p-6 rounded-lg border border-line bg-panel">
            <p className="font-display text-[0.72rem] font-medium tracking-[0.14em] uppercase text-dim mb-3">
              {label}
            </p>
            <p className="font-display text-3xl font-medium text-ink">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div>
        <p className="font-display text-[0.72rem] font-medium tracking-[0.14em] uppercase text-dim mb-4">
          Todos los Agentes
        </p>
        {error ? (
          <div className="p-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-[#ff4d4d] text-sm">
            {error}
          </div>
        ) : (
          <AgentTable agents={agents} />
        )}
      </div>
    </div>
  )
}
