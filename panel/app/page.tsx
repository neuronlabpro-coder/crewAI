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

  const total = agents.length
  const experts = agents.filter((a) => a.agent_type === 'expert').length
  const teachers = agents.filter((a) => a.agent_type === 'teacher').length
  const active = agents.filter((a) => a.active !== false).length

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Dashboard</h1>
          <p className="text-sm text-[#6b7884] mt-1">NeuronGuard AG Agents Platform</p>
        </div>
        <Link
          href="/agents/new"
          className="px-4 py-2 bg-[#00ff88] text-[#0a0a0f] text-sm font-bold rounded-md hover:bg-[#00e67a] transition-colors"
        >
          + Nuevo Agente
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Agentes', value: total, color: '#00ff88' },
          { label: 'Expert', value: experts, color: '#3b82f6' },
          { label: 'Teacher', value: teachers, color: '#10b981' },
          { label: 'Activos', value: active, color: '#00a3b4' },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-5 rounded-lg border border-[#1a1a2e] bg-[#0f0f1a]">
            <p className="text-xs text-[#6b7884] uppercase tracking-wider mb-2">{label}</p>
            <p className="text-3xl font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-[#6b7884] uppercase tracking-wider mb-4">
          Todos los Agentes
        </h2>
        {error ? (
          <div className="p-4 rounded-lg border border-red-800 bg-red-950/30 text-red-400 text-sm">
            {error}
          </div>
        ) : (
          <AgentTable agents={agents} />
        )}
      </div>
    </div>
  )
}
