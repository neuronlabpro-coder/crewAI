import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAgent, getAgentUsageLogs, bucketByDay } from '@/lib/insforge'

export const dynamic = 'force-dynamic'

const INSTALLABLE_SLUGS: Record<string, string> = {
  'server-scan':     'Análisis de Seguridad de Servidor',
  'log-analysis':    'Análisis de Logs',
  'secret-scan':     'Detección de Secretos',
  'container-audit': 'Auditoría Docker',
  'red-team':        'Red Team',
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
}

interface Props { params: Promise<{ slug: string }> }

export default async function AgentDetailPage({ params }: Props) {
  const { slug } = await params
  const [agent, usageLogs] = await Promise.all([
    getAgent(slug),
    getAgentUsageLogs(slug, 7).catch(() => []),
  ])
  if (!agent) notFound()

  const isInstallable = slug in INSTALLABLE_SLUGS

  // Analytics
  const totalRequests  = usageLogs.length
  const totalTokens    = usageLogs.reduce((s, l) => s + (l.tokens_used ?? 0), 0)
  const avgResponseMs  = totalRequests
    ? Math.round(usageLogs.reduce((s, l) => s + (l.response_time_ms ?? 0), 0) / totalRequests)
    : 0
  const lastSeen = usageLogs.length
    ? new Date(usageLogs[usageLogs.length - 1].created_at).toLocaleDateString('es-ES')
    : '—'

  const daily  = bucketByDay(usageLogs, 7)
  const maxReq = Math.max(...daily.map(d => d.requests), 1)

  const lbl = 'font-display text-[11px] font-semibold tracking-[0.88px] uppercase text-dim mb-4'

  return (
    <div className="p-8 space-y-6">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-[2rem] font-medium text-ink leading-none tracking-[-0.03em]">
              {agent.name}
            </h1>
            <span className={`px-2 py-0.5 rounded-sm font-display text-[0.65rem] font-medium tracking-[0.10em] uppercase border ${
              agent.agent_type === 'teacher'
                ? 'bg-raised text-dim border-line'
                : 'bg-raised text-cta border-line'
            }`}>
              {agent.agent_type === 'teacher' ? 'Teacher' : 'Expert'}
            </span>
            {isInstallable && (
              <span className="px-2 py-0.5 rounded-sm font-display text-[0.65rem] font-medium tracking-[0.10em] uppercase bg-ok/10 text-ok border border-ok/40">
                Instalable
              </span>
            )}
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

      {/* ── Analítica — 4 stats + mini chart ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stats 4 cards */}
        <div className="lg:col-span-1 grid grid-cols-2 gap-3 content-start">
          {[
            { label: 'Solicitudes (7d)', value: fmtNum(totalRequests) },
            { label: 'Tokens (7d)',      value: fmtNum(totalTokens)   },
            { label: 'Resp. media',      value: avgResponseMs ? `${avgResponseMs}ms` : '—' },
            { label: 'Última llamada',   value: lastSeen },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-line bg-panel p-4">
              <p className="font-display text-[10px] font-semibold tracking-[0.88px] uppercase text-dim mb-2">{label}</p>
              <p className="font-display text-xl font-medium text-ink">{value}</p>
            </div>
          ))}
        </div>

        {/* Mini bar chart */}
        <div className="lg:col-span-2 rounded-lg border border-line bg-panel p-6">
          <p className={lbl}>Actividad — últimos 7 días</p>
          <div className="flex items-end gap-2 h-24">
            {daily.map((d) => {
              const h = maxReq > 0 ? (d.requests / maxReq) * 100 : 0
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <span className="text-[10px] text-dim opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.requests}
                  </span>
                  <div
                    className="w-full rounded-t-sm bg-cta/60 group-hover:bg-cta transition-colors min-h-[2px]"
                    style={{ height: `${Math.max(h, 2)}%` }}
                  />
                  <span className="text-[9px] text-dim whitespace-nowrap">{fmtDate(d.date)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Script de instalación (solo agentes instalables) ── */}
      {isInstallable && (
        <div className="rounded-lg border border-ok/30 bg-ok/5 p-6">
          <p className={lbl + ' !text-ok'}>Script de instalación</p>
          <p className="text-sm text-dim mb-4">
            Ejecuta este script en el servidor que quieras analizar. Recoge los datos del sistema
            y los envía a este agente automáticamente. Requiere Python 3.8+ y el paquete{' '}
            <code className="font-mono text-xs bg-raised px-1 py-0.5 rounded">requests</code>.
          </p>
          <div className="bg-raised rounded-md p-4 font-mono text-xs text-dim mb-4 space-y-1">
            <p><span className="text-ok"># 1.</span> Descarga el script</p>
            <p><span className="text-ok"># 2.</span> Instala dependencias: <span className="text-body">pip install requests</span></p>
            <p><span className="text-ok"># 3.</span> Configura tu API key: <span className="text-body">export NEURONGUARD_API_KEY=tu_key</span></p>
            {slug === 'red-team' && (
              <p><span className="text-ok"># 4.</span> Ejecuta: <span className="text-body">python3 neuronguard_redteam.py &lt;target&gt;</span></p>
            )}
            {slug !== 'red-team' && (
              <p><span className="text-ok"># 4.</span> Ejecuta: <span className="text-body">python3 {`neuronguard_${slug.replace('-', '_')}.py`}</span></p>
            )}
          </div>
          <a
            href={`/api/installers/${slug}`}
            download
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-ok text-white text-sm font-display font-medium rounded-md hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Descargar script (.py)
          </a>
        </div>
      )}

      {/* ── Info + Rol/Objetivo ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-lg border border-line bg-panel p-6 space-y-3">
          <p className={lbl}>Configuración</p>
          {([
            ['Slug',             agent.slug],
            ['Tipo',             agent.agent_type],
            ['Modelo Dev',       agent.llm_model],
            ['Modelo Prod',      agent.llm_model_prod],
            ['Max Tokens',       agent.max_tokens?.toString()],
            ['Temperature',      agent.temperature?.toString()],
            ['Top P',            agent.top_p?.toString()],
            ['Max Iterations',   agent.max_iter?.toString()],
            ['Verbose',          agent.verbose ? 'Sí' : 'No'],
            ['Delegation',       agent.allow_delegation ? 'Sí' : 'No'],
            ['Estado',           agent.active !== false ? 'Activo' : 'Inactivo'],
          ] as [string, string | undefined][]).map(([label, value]) => value != null && (
            <div key={label} className="flex justify-between text-sm gap-4">
              <span className="text-dim shrink-0">{label}</span>
              <span className="text-body font-mono text-right break-all">{value}</span>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border border-line bg-panel p-6">
            <p className={lbl}>Rol</p>
            <p className="text-sm text-body leading-relaxed">{agent.role}</p>
          </div>
          <div className="rounded-lg border border-line bg-panel p-6">
            <p className={lbl}>Objetivo</p>
            <p className="text-sm text-body leading-relaxed">{agent.goal}</p>
          </div>
        </div>
      </div>

      {/* ── System Prompt ────────────────────────────────── */}
      <div className="rounded-lg border border-line bg-panel p-6">
        <p className={lbl}>System Prompt</p>
        <pre className="text-sm text-body font-mono leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
          {agent.backstory}
        </pre>
      </div>

      {/* ── MCP + RAG ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {agent.mcp_domains && agent.mcp_domains.length > 0 && (
          <div className="rounded-lg border border-line bg-panel p-6">
            <p className={lbl}>MCP Domains</p>
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
            <p className={lbl}>RAG / Qdrant</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-dim">Colección</span>
                <span className="text-body font-mono">{agent.qdrant_collection}</span>
              </div>
              {agent.webhook_url && (
                <div className="flex justify-between text-sm gap-4 pt-2 border-t border-line">
                  <span className="text-dim shrink-0">Endpoint</span>
                  <span className="text-body font-mono text-xs truncate">{agent.webhook_url}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
