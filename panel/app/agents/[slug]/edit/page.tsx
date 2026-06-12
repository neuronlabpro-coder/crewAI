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
        <div className="p-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-[#ff4d4d] text-sm">
          {error}
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="p-8 flex items-center gap-2 text-dim text-sm">
        <span className="animate-pulse text-hi">▸</span> Cargando agente…
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-[2rem] font-medium text-ink leading-none">
          Editar Agente
        </h1>
        <p className="text-sm text-dim mt-1 font-mono">{agent.slug}</p>
      </div>
      <AgentForm initialData={agent} onSubmit={handleSubmit} submitLabel="Guardar Cambios" />
    </div>
  )
}
