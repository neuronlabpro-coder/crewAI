import type { Agent, AgentFormData } from '@/lib/types'

const INSFORGE_URL = process.env.INSFORGE_URL!
const INSFORGE_API_KEY = process.env.INSFORGE_API_KEY!

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${INSFORGE_API_KEY}`,
    Prefer: 'return=representation',
  }
}

export async function getAgents(): Promise<Agent[]> {
  const res = await fetch(`${INSFORGE_URL}/ag_agents?order=name.asc`, {
    headers: headers(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`InsForge error ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function getAgent(slug: string): Promise<Agent | null> {
  const res = await fetch(
    `${INSFORGE_URL}/ag_agents?slug=eq.${encodeURIComponent(slug)}&limit=1`,
    { headers: headers(), cache: 'no-store' }
  )
  if (!res.ok) throw new Error(`InsForge error ${res.status}: ${await res.text()}`)
  const data: Agent[] = await res.json()
  return data[0] ?? null
}

export async function createAgent(data: AgentFormData): Promise<Agent> {
  const payload = {
    ...data,
    webhook_url: `https://api-agents.shyntai.com/agent/${data.slug}`,
    qdrant_collection: data.qdrant_collection || `ag_${data.slug}`,
    mcp_domains: data.mcp_domains ?? [],
  }
  const res = await fetch(`${INSFORGE_URL}/ag_agents`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`InsForge error ${res.status}: ${await res.text()}`)
  const result: Agent[] = await res.json()
  return result[0]
}

export async function updateAgent(slug: string, data: Partial<AgentFormData>): Promise<Agent> {
  const payload = { ...data, updated_at: new Date().toISOString() }
  const res = await fetch(
    `${INSFORGE_URL}/ag_agents?slug=eq.${encodeURIComponent(slug)}`,
    {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(payload),
    }
  )
  if (!res.ok) throw new Error(`InsForge error ${res.status}: ${await res.text()}`)
  const result: Agent[] = await res.json()
  return result[0]
}

export async function deactivateAgent(slug: string): Promise<void> {
  const res = await fetch(
    `${INSFORGE_URL}/ag_agents?slug=eq.${encodeURIComponent(slug)}`,
    {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ active: false, updated_at: new Date().toISOString() }),
    }
  )
  if (!res.ok) throw new Error(`InsForge error ${res.status}: ${await res.text()}`)
}
