import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAgent } from '@/lib/insforge'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function AgentDetailPage({ params }: Props) {
  const { slug } = await params
  const agent = await getAgent(slug)
  if (!agent) notFound()

  const infoRows = [
    { label: 'Slug',        value: agent.slug },
    { label: 'Tipo',        value: agent.agent_type },
    { label: 'Rol',         value: agent.role },
    { label: 'Modelo Dev',  value: agent.llm_model },
    { label: 'Modelo Prod', value: agent.llm_model_prod },
    { label: 'Max Tokens',  value: agent.max_tokens?.toString() },
    { label: 'Temperature', value: agent.temperature?.toString() },
    { label: 'Estado',      value: agent.active !== false ? 'Activo' : 'Inactivo' },
    { label: 'Webhook URL', value: agent.webhook_url },
  ]

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-[2rem] font-medium text-ink leading-none">
              {agent.name}
            </h1>
            <span className={`px-2 py-0.5 rounded-sm font-display text-[0.65rem] font-medium tracking-[0.10em] uppercase border ${
              agent.agent_type === 'teacher'
                ? 'bg-raised text-dim border-line'
                : 'bg-raised text-hi border-line'
            }`}>
              {agent.agent_type === 'teacher' ? 'Teacher' : 'Expert'}
            </span>
            {agent.active === false && (
              <span className="px-2 py-0.5 rounded-sm font-display text-[0.65rem] font-medium tracking-[0.10em] uppercase bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-[#ff4d4d] border border-red-200 dark:border-red-900/50">
                Inactivo
              </span>
            )}
          </div>
          <p className="text-sm text-dim font-mono">{agent.slug}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/agents/${slug}/playground`}
            className="px-5 py-2.5 bg-cta text-white text-sm font-display font-medium rounded-md hover:bg-cta-hi transition-colors"
          >
            Playground
          </Link>
          <Link
            href={`/agents/${slug}/edit`}
            className="px-5 py-2.5 border border-line text-dim text-sm rounded-md hover:text-ink hover:border-dim transition-colors"
          >
            Editar
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Información */}
        <div className="rounded-lg border border-line bg-panel p-6 space-y-3">
          <p className="font-display text-[0.72rem] font-medium tracking-[0.14em] uppercase text-dim mb-4">
            Información
          </p>
          {infoRows.map(({ label, value }) => value && (
            <div key={label} className="flex justify-between text-sm gap-4">
              <span className="text-dim shrink-0">{label}</span>
              <span className="text-ink font-mono text-right break-all">{value}</span>
            </div>
          ))}
        </div>

        {/* Objetivo */}
        <div className="rounded-lg border border-line bg-panel p-6">
          <p className="font-display text-[0.72rem] font-medium tracking-[0.14em] uppercase text-dim mb-4">
            Objetivo
          </p>
          <p className="text-sm text-ink leading-relaxed">{agent.goal}</p>
        </div>
      </div>

      {/* Backstory */}
      <div className="rounded-lg border border-line bg-panel p-6">
        <p className="font-display text-[0.72rem] font-medium tracking-[0.14em] uppercase text-dim mb-4">
          System Prompt
        </p>
        <pre className="text-sm text-ink font-mono leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
          {agent.backstory}
        </pre>
      </div>

      {/* MCP Domains */}
      {agent.mcp_domains && agent.mcp_domains.length > 0 && (
        <div className="rounded-lg border border-line bg-panel p-6">
          <p className="font-display text-[0.72rem] font-medium tracking-[0.14em] uppercase text-dim mb-4">
            MCP Domains
          </p>
          <div className="flex flex-wrap gap-2">
            {agent.mcp_domains.map((d) => (
              <span key={d} className="px-2.5 py-1 rounded-sm bg-raised text-ink text-xs font-mono border border-line">
                {d}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
