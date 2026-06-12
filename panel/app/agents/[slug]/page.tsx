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

  return (
    <div className="p-8 space-y-6">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-[2rem] font-medium text-ink leading-none tracking-[-0.03em]">
              {agent.name}
            </h1>
            <span className={`px-2 py-0.5 rounded-sm font-display text-[0.65rem] font-medium tracking-[0.10em] uppercase border ${
              agent.agent_type === 'teacher'
                ? 'bg-raised text-dim border-line'
                : 'bg-raised text-cta dark:text-ink border-line'
            }`}>
              {agent.agent_type === 'teacher' ? 'Teacher' : 'Expert'}
            </span>
            {agent.active === false && (
              <span className="px-2 py-0.5 rounded-sm font-display text-[0.65rem] font-medium tracking-[0.10em] uppercase bg-err/10 text-err border border-err/40">
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
            className="px-5 py-2.5 border border-line text-dim text-sm rounded-md hover:text-ink transition-colors"
          >
            Editar
          </Link>
        </div>
      </div>

      {/* ── Top grid: info + objetivo ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Información — 1 col */}
        <div className="rounded-lg border border-line bg-panel p-6 space-y-3">
          <p className="font-display text-[11px] font-semibold tracking-[0.88px] uppercase text-dim mb-4">
            Información
          </p>
          {[
            { label: 'Slug',              value: agent.slug },
            { label: 'Tipo',              value: agent.agent_type },
            { label: 'Modelo Dev',        value: agent.llm_model },
            { label: 'Modelo Prod',       value: agent.llm_model_prod },
            { label: 'Max Tokens',        value: agent.max_tokens?.toString() },
            { label: 'Temperature',       value: agent.temperature?.toString() },
            { label: 'Top P',             value: agent.top_p?.toString() },
            { label: 'Max Iterations',    value: agent.max_iter?.toString() },
            { label: 'Verbose',           value: agent.verbose ? 'Sí' : 'No' },
            { label: 'Allow Delegation',  value: agent.allow_delegation ? 'Sí' : 'No' },
            { label: 'Estado',            value: agent.active !== false ? 'Activo' : 'Inactivo' },
          ].map(({ label, value }) => value !== undefined && value !== null && (
            <div key={label} className="flex justify-between text-sm gap-4">
              <span className="text-dim shrink-0">{label}</span>
              <span className="text-body font-mono text-right break-all">{value}</span>
            </div>
          ))}
        </div>

        {/* Rol + Objetivo — 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border border-line bg-panel p-6">
            <p className="font-display text-[11px] font-semibold tracking-[0.88px] uppercase text-dim mb-4">
              Rol
            </p>
            <p className="text-sm text-body leading-relaxed">{agent.role}</p>
          </div>
          <div className="rounded-lg border border-line bg-panel p-6">
            <p className="font-display text-[11px] font-semibold tracking-[0.88px] uppercase text-dim mb-4">
              Objetivo
            </p>
            <p className="text-sm text-body leading-relaxed">{agent.goal}</p>
          </div>
        </div>
      </div>

      {/* ── System Prompt ─────────────────────────────── */}
      <div className="rounded-lg border border-line bg-panel p-6">
        <p className="font-display text-[11px] font-semibold tracking-[0.88px] uppercase text-dim mb-4">
          System Prompt
        </p>
        <pre className="text-sm text-body font-mono leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
          {agent.backstory}
        </pre>
      </div>

      {/* ── Bottom grid: MCP + Webhook ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {agent.mcp_domains && agent.mcp_domains.length > 0 && (
          <div className="rounded-lg border border-line bg-panel p-6">
            <p className="font-display text-[11px] font-semibold tracking-[0.88px] uppercase text-dim mb-4">
              MCP Domains
            </p>
            <div className="flex flex-wrap gap-2">
              {agent.mcp_domains.map((d) => (
                <span key={d} className="px-2.5 py-1 rounded-sm bg-raised text-body text-xs font-mono border border-line">
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {agent.qdrant_collection && (
          <div className="rounded-lg border border-line bg-panel p-6">
            <p className="font-display text-[11px] font-semibold tracking-[0.88px] uppercase text-dim mb-4">
              RAG / Qdrant
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-dim">Colección</span>
                <span className="text-body font-mono">{agent.qdrant_collection}</span>
              </div>
              {agent.webhook_url && (
                <div className="flex justify-between text-sm gap-4 pt-2 border-t border-line">
                  <span className="text-dim shrink-0">Webhook</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-body font-mono text-xs truncate">{agent.webhook_url}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(agent.webhook_url!)}
                      className="text-dim hover:text-ink text-xs shrink-0 transition-colors"
                    >
                      copiar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
