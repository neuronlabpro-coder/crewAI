'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Agent } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  agents: Agent[]
  onRefresh?: () => void
}

export default function AgentTable({ agents, onRefresh }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'expert' | 'teacher'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const filtered = agents.filter((a) => {
    const matchSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.slug.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || a.agent_type === typeFilter
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

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Buscar por nombre o slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs bg-[#0f0f1a] border-[#1a1a2e] text-[#e2e8f0] placeholder:text-[#4a5568]"
        />
        <div className="flex gap-1">
          {(['all', 'expert', 'teacher'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                typeFilter === t
                  ? 'bg-[#00ff88] text-[#0a0a0f]'
                  : 'bg-[#0f0f1a] text-[#6b7884] border border-[#1a1a2e] hover:border-[#00ff88]'
              }`}
            >
              {t === 'all' ? 'Todos' : t === 'expert' ? 'Expert' : 'Teacher'}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['all', 'active', 'inactive'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                statusFilter === s
                  ? 'bg-[#00ff88] text-[#0a0a0f]'
                  : 'bg-[#0f0f1a] text-[#6b7884] border border-[#1a1a2e] hover:border-[#00ff88]'
              }`}
            >
              {s === 'all' ? 'Todos' : s === 'active' ? 'Activo' : 'Inactivo'}
            </button>
          ))}
        </div>
        <span className="text-xs text-[#4a5568] ml-auto">{filtered.length} agentes</span>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[#1a1a2e] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1a1a2e] bg-[#0f0f1a]">
              <th className="text-left px-4 py-3 text-[#6b7884] font-medium uppercase tracking-wider text-xs">Nombre</th>
              <th className="text-left px-4 py-3 text-[#6b7884] font-medium uppercase tracking-wider text-xs">Slug</th>
              <th className="text-left px-4 py-3 text-[#6b7884] font-medium uppercase tracking-wider text-xs">Tipo</th>
              <th className="text-left px-4 py-3 text-[#6b7884] font-medium uppercase tracking-wider text-xs">Modelo Dev</th>
              <th className="text-left px-4 py-3 text-[#6b7884] font-medium uppercase tracking-wider text-xs">Estado</th>
              <th className="text-right px-4 py-3 text-[#6b7884] font-medium uppercase tracking-wider text-xs">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-[#4a5568]">
                  No hay agentes que coincidan con los filtros
                </td>
              </tr>
            )}
            {filtered.map((agent) => (
              <tr
                key={agent.slug}
                className="border-b border-[#1a1a2e] hover:bg-[#0f0f1a] transition-colors"
              >
                <td className="px-4 py-3 text-[#e2e8f0] font-medium">{agent.name}</td>
                <td className="px-4 py-3">
                  <code className="text-[#00ff88] text-xs bg-[#0a0a0f] px-2 py-1 rounded">
                    {agent.slug}
                  </code>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    className={
                      agent.agent_type === 'teacher'
                        ? 'bg-emerald-900/40 text-emerald-400 border-emerald-700'
                        : 'bg-blue-900/40 text-blue-400 border-blue-700'
                    }
                  >
                    {agent.agent_type === 'teacher' ? 'Teacher' : 'Expert'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-[#6b7884] text-xs">
                  {agent.llm_model?.split('/')[1] ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                      agent.active !== false ? 'text-[#00ff88]' : 'text-red-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        agent.active !== false ? 'bg-[#00ff88]' : 'bg-red-400'
                      }`}
                    />
                    {agent.active !== false ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <Link href={`/agents/${agent.slug}`}>
                      <Button size="sm" variant="ghost" className="text-xs text-[#6b7884] hover:text-[#e2e8f0] h-7 px-2">
                        Ver
                      </Button>
                    </Link>
                    <Link href={`/agents/${agent.slug}/edit`}>
                      <Button size="sm" variant="ghost" className="text-xs text-[#6b7884] hover:text-[#00ff88] h-7 px-2">
                        Editar
                      </Button>
                    </Link>
                    <Link href={`/agents/${agent.slug}/playground`}>
                      <Button size="sm" variant="ghost" className="text-xs text-[#6b7884] hover:text-purple-400 h-7 px-2">
                        ▶ Play
                      </Button>
                    </Link>
                    {agent.webhook_url && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-[#6b7884] hover:text-[#00a3b4] h-7 px-2"
                        onClick={() => copyUrl(agent.webhook_url!)}
                      >
                        Copiar URL
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-[#6b7884] hover:text-red-400 h-7 px-2"
                      onClick={() => handleDelete(agent.slug)}
                    >
                      Desactivar
                    </Button>
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
