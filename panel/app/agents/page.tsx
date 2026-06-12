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
          <h1 className="font-display text-[2rem] font-medium text-ink leading-none">
            Agentes
          </h1>
          <p className="text-sm text-dim mt-1">{agents.length} agentes registrados</p>
        </div>
        <Link
          href="/agents/new"
          className="px-5 py-3 bg-cta text-white text-sm font-display font-medium rounded-md hover:bg-cta-hi transition-colors"
        >
          Nuevo Agente
        </Link>
      </div>

      {error ? (
        <div className="p-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-[#ff4d4d] text-sm">
          {error}
        </div>
      ) : (
        <AgentTable agents={agents} />
      )}
    </div>
  )
}
