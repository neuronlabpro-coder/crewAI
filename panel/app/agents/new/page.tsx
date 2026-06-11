'use client'

import { useRouter } from 'next/navigation'
import AgentForm from '@/components/AgentForm'
import type { AgentFormData } from '@/lib/types'

export default function NewAgentPage() {
  const router = useRouter()

  async function handleSubmit(data: AgentFormData) {
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? 'Error creando agente')
    }
    const agent = await res.json()
    router.push(`/agents/${agent.slug}`)
    router.refresh()
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#e2e8f0]">Nuevo Agente</h1>
        <p className="text-sm text-[#6b7884] mt-1">
          Configura un nuevo agente para la plataforma NeuronGuard
        </p>
      </div>
      <AgentForm onSubmit={handleSubmit} submitLabel="Crear Agente" />
    </div>
  )
}
