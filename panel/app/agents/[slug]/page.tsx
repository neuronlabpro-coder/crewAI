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

  const rows = [
    { label: 'Slug', value: agent.slug },
    { label: 'Tipo', value: agent.agent_type },
    { label: 'Rol', value: agent.role },
    { label: 'Modelo LLM', value: agent.llm_model },
    { label: 'Max Tokens', value: agent.max_tokens?.toString() },
    { label: 'Temperature', value: agent.temperature?.toString() },
    { label: 'Colección Qdrant', value: agent.qdrant_collection },
    { label: 'Estado', value: agent.active !== false ? 'Activo' : 'Inactivo' },
    { label: 'Webhook URL', value: agent.webhook_url },
  ]

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-[#e2e8f0]">{agent.name}</h1>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
              agent.agent_type === 'teacher'
                ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800'
                : 'bg-blue-900/40 text-blue-400 border border-blue-800'
            }`}>
              {agent.agent_type === 'teacher' ? 'Teacher' : 'Expert'}
            </span>
            {agent.active === false && (
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-900/40 text-red-400 border border-red-800">
                Inactivo
              </span>
            )}
          </div>
          <p className="text-sm text-[#6b7884] font-mono">{agent.slug}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/agents/${slug}/playground`}
            className="px-4 py-2 bg-[#00ff88] text-[#0a0a0f] text-sm font-bold rounded-md hover:bg-[#00e67a] transition-colors"
          >
            ▶ Playground
          </Link>
          <Link
            href={`/agents/${slug}/edit`}
            className="px-4 py-2 border border-[#1a1a2e] text-[#6b7884] text-sm rounded-md hover:text-[#e2e8f0] hover:border-[#3a3a5e] transition-colors"
          >
            Editar
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Info */}
        <div className="rounded-lg border border-[#1a1a2e] bg-[#0f0f1a] p-5 space-y-3">
          <h2 className="text-xs font-semibold text-[#6b7884] uppercase tracking-wider">Información</h2>
          {rows.map(({ label, value }) => value && (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-[#6b7884]">{label}</span>
              <span className="text-[#e2e8f0] font-mono text-right max-w-[60%] break-all">{value}</span>
            </div>
          ))}
        </div>

        {/* Objetivo */}
        <div className="rounded-lg border border-[#1a1a2e] bg-[#0f0f1a] p-5">
          <h2 className="text-xs font-semibold text-[#6b7884] uppercase tracking-wider mb-3">Objetivo</h2>
          <p className="text-sm text-[#e2e8f0] leading-relaxed">{agent.goal}</p>
        </div>
      </div>

      {/* Backstory */}
      <div className="rounded-lg border border-[#1a1a2e] bg-[#0f0f1a] p-5">
        <h2 className="text-xs font-semibold text-[#6b7884] uppercase tracking-wider mb-3">System Prompt (Backstory)</h2>
        <pre className="text-sm text-[#e2e8f0] font-mono leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
          {agent.backstory}
        </pre>
      </div>

      {/* MCP Domains */}
      {agent.mcp_domains && agent.mcp_domains.length > 0 && (
        <div className="rounded-lg border border-[#1a1a2e] bg-[#0f0f1a] p-5">
          <h2 className="text-xs font-semibold text-[#6b7884] uppercase tracking-wider mb-3">MCP Domains</h2>
          <div className="flex flex-wrap gap-2">
            {agent.mcp_domains.map((d) => (
              <span key={d} className="px-2 py-1 rounded bg-[#1a1a2e] text-[#00a3b4] text-xs font-mono border border-[#2a2a4e]">
                {d}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
