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
          <h1 className="font-display text-[2rem] font-medium text-ink leading-none tracking-[-0.03em]">
            Agentes
          </h1>
          <p className="text-sm text-dim mt-1">{agents.length} agentes registrados</p>
        </div>
        <Link
          href="/agents/new"
          className="px-5 py-2.5 bg-cta text-white text-sm font-display font-medium rounded-md hover:bg-cta-hi transition-colors"
        >
          Nuevo Agente
        </Link>
      </div>

      {error ? (
        <div className="p-4 rounded-lg border border-err/40 bg-err/10 text-err text-sm">
          {error}
        </div>
      ) : (
        <AgentTable agents={agents} />
      )}
    </div>
  )
}
