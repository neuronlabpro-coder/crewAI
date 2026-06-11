import Link from 'next/link'
import { getAgents } from '@/lib/insforge'
import AgentTable from '@/components/AgentTable'

export const dynamic = 'force-dynamic'

export default async function AgentsPage() {
  let agents: Awaited<ReturnType<typeof getAgents>> = []
  let error = ''
  try {
    agents = await getAgents()
  } catch (err) {
    error = err instanceof Error ? err.message : 'Error cargando agentes'
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Agentes</h1>
          <p className="text-sm text-[#6b7884] mt-1">{agents.length} agentes registrados</p>
        </div>
        <Link
          href="/agents/new"
          className="px-4 py-2 bg-[#00ff88] text-[#0a0a0f] text-sm font-bold rounded-md hover:bg-[#00e67a] transition-colors"
        >
          + Nuevo Agente
        </Link>
      </div>

      {error ? (
        <div className="p-4 rounded-lg border border-red-800 bg-red-950/30 text-red-400 text-sm">
          {error}
        </div>
      ) : (
        <AgentTable agents={agents} />
      )}
    </div>
  )
}
