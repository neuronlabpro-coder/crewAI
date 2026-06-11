'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AgentForm from '@/components/AgentForm'
import type { Agent, AgentFormData } from '@/lib/types'

export default function EditAgentPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/agents/${slug}`)
      .then((r) => r.json())
      .then(setAgent)
      .catch(() => setError('Error cargando agente'))
  }, [slug])

  async function handleSubmit(data: AgentFormData) {
    const res = await fetch(`/api/agents/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? 'Error actualizando agente')
    }
    router.push(`/agents/${slug}`)
    router.refresh()
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 rounded-lg border border-red-800 bg-red-950/30 text-red-400 text-sm">{error}</div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="p-8 flex items-center gap-2 text-[#6b7884] text-sm">
        <span className="animate-pulse">▸</span> Cargando agente…
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#e2e8f0]">Editar Agente</h1>
        <p className="text-sm text-[#6b7884] mt-1 font-mono">{agent.slug}</p>
      </div>
      <AgentForm initialData={agent} onSubmit={handleSubmit} submitLabel="Guardar Cambios" />
    </div>
  )
}
