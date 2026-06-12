'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Agent } from '@/lib/types'

interface Props {
  agents: Agent[]
  onRefresh?: () => void
}

export default function AgentTable({ agents, onRefresh }: Props) {
  const router = useRouter()
  const [search, setSearch]             = useState('')
  const [typeFilter, setTypeFilter]     = useState<'all' | 'expert' | 'teacher'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const filtered = agents.filter((a) => {
    const matchSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.slug.toLowerCase().includes(search.toLowerCase())
    const matchType   = typeFilter === 'all' || a.agent_type === typeFilter
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' ? a.active !== false : a.active === false)
    return matchSearch && matchType && matchStatus
  })

  async function handleDelete(slug: string) {
    if (!confirm(`Desactivar agente "${slug}"?`)) return
    await fetch(`/api/agents/${slug}`, { method: 'DELETE' })
    onRefresh?.()
    router.refresh()
  }

  /* Active filter btn: light → tertiary #00A3B4 bg | dark → primary #0007cd bg */
  const filterBtn = (active: boolean) =>
    `px-3 py-1 text-xs font-display font-medium rounded-md border transition-colors ${
      active
        ? 'bg-cta text-white border-cta'
        : 'bg-panel text-dim border-line hover:text-ink'
    }`

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Buscar por nombre o slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 px-3 text-sm rounded-md border border-line bg-panel text-ink placeholder:text-dim outline-none focus:border-cta max-w-xs w-full transition-colors"
        />
        <div className="flex gap-1">
          <button onClick={() => setTypeFilter('all')}     className={filterBtn(typeFilter === 'all')}>Todos</button>
          <button onClick={() => setTypeFilter('expert')}  className={filterBtn(typeFilter === 'expert')}>Expert</button>
          <button onClick={() => setTypeFilter('teacher')} className={filterBtn(typeFilter === 'teacher')}>Teacher</button>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setStatusFilter('all')}      className={filterBtn(statusFilter === 'all')}>Todos</button>
          <button onClick={() => setStatusFilter('active')}   className={filterBtn(statusFilter === 'active')}>Activo</button>
          <button onClick={() => setStatusFilter('inactive')} className={filterBtn(statusFilter === 'inactive')}>Inactivo</button>
        </div>
        <span className="font-display text-[0.72rem] tracking-[0.10em] text-dim ml-auto">
          {filtered.length} agentes
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-line overflow-hidden bg-panel">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-raised">
              {['Nombre', 'Slug', 'Tipo', 'Modelo Dev', 'Estado', ''].map((h) => (
                <th
                  key={h}
                  className={`px-4 py-3 font-display text-[0.65rem] font-medium tracking-[0.12em] uppercase text-dim ${h === '' ? 'text-right' : 'text-left'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-dim text-sm">
                  No hay agentes que coincidan
                </td>
              </tr>
            )}
            {filtered.map((agent) => (
              <tr key={agent.slug} className="border-b border-line last:border-0 hover:bg-raised transition-colors">
                {/* Nombre */}
                <td className="px-4 py-3 text-ink font-medium">{agent.name}</td>

                {/* Slug */}
                <td className="px-4 py-3">
                  <code className="text-body text-xs bg-raised px-2 py-0.5 rounded-sm border border-line">
                    {agent.slug}
                  </code>
                </td>

                {/* Tipo — badge-pill: bg=raised, text=ink per Composio badge-pill spec */}
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-sm font-display text-[0.65rem] font-medium tracking-[0.08em] uppercase border ${
                    agent.agent_type === 'teacher'
                      ? 'bg-raised text-dim border-line'
                      : 'bg-raised text-cta dark:text-ink border-line'
                  }`}>
                    {agent.agent_type === 'teacher' ? 'Teacher' : 'Expert'}
                  </span>
                </td>

                {/* Modelo */}
                <td className="px-4 py-3 text-dim text-xs font-mono">
                  {agent.llm_model?.split('/')[1] ?? '—'}
                </td>

                {/* Estado — ok = #00A3B4 light / #33d17a dark */}
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs ${
                    agent.active !== false ? 'text-ok' : 'text-dim'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      agent.active !== false ? 'bg-ok' : 'bg-line'
                    }`} />
                    {agent.active !== false ? 'Activo' : 'Inactivo'}
                  </span>
                </td>

                {/* Acciones */}
                <td className="px-4 py-3">
                  <div className="flex gap-3 justify-end text-xs text-dim">
                    <Link href={`/agents/${agent.slug}`} className="hover:text-ink transition-colors">
                      Ver
                    </Link>
                    <Link href={`/agents/${agent.slug}/edit`} className="hover:text-ink transition-colors">
                      Editar
                    </Link>
                    <Link href={`/agents/${agent.slug}/playground`} className="hover:text-ok transition-colors">
                      Playground
                    </Link>
                    <button
                      onClick={() => handleDelete(agent.slug)}
                      className="hover:text-err transition-colors"
                    >
                      Desactivar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
