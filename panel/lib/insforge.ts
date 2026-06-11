import type { Agent, AgentFormData } from '@/lib/types'

function getConfig() {
  const url = process.env.INSFORGE_URL
  const key = process.env.INSFORGE_API_KEY
  if (!url) throw new Error('INSFORGE_URL env var is not set')
  if (!key) throw new Error('INSFORGE_API_KEY env var is not set')
  const db = `${url.replace(/\/$/, '')}/api/database/records`
  return { url, key, db }
}

function headers(key: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
    Prefer: 'return=representation',
  }
}

export async function getAgents(): Promise<Agent[]> {
  const { db, key } = getConfig()
  const res = await fetch(`${db}/ag_agents?order=name.asc`, {
    headers: headers(key),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`InsForge error ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function getAgent(slug: string): Promise<Agent | null> {
  const { db, key } = getConfig()
  const res = await fetch(
    `${db}/ag_agents?slug=eq.${encodeURIComponent(slug)}&limit=1`,
    { headers: headers(key), cache: 'no-store' }
  )
  if (!res.ok) throw new Error(`InsForge error ${res.status}: ${await res.text()}`)
  const data: Agent[] = await res.json()
  return data[0] ?? null
}

export async function createAgent(data: AgentFormData): Promise<Agent> {
  const { db, key } = getConfig()
  const payload = {
    ...data,
    webhook_url: `https://api-agents.shyntai.com/agent/${data.slug}`,
    qdrant_collection: data.qdrant_collection || `ag_${data.slug}`,
    mcp_domains: data.mcp_domains ?? [],
  }
  const res = await fetch(`${db}/ag_agents`, {
    method: 'POST',
    headers: headers(key),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`InsForge error ${res.status}: ${await res.text()}`)
  const result: Agent[] = await res.json()
  return result[0]
}

export async function updateAgent(slug: string, data: Partial<AgentFormData>): Promise<Agent> {
  const { db, key } = getConfig()
  const payload = { ...data, updated_at: new Date().toISOString() }
  const res = await fetch(
    `${db}/ag_agents?slug=eq.${encodeURIComponent(slug)}`,
    {
      method: 'PATCH',
      headers: headers(key),
      body: JSON.stringify(payload),
    }
  )
  if (!res.ok) throw new Error(`InsForge error ${res.status}: ${await res.text()}`)
  const result: Agent[] = await res.json()
  return result[0]
}

export async function deactivateAgent(slug: string): Promise<void> {
  const { db, key } = getConfig()
  const res = await fetch(
    `${db}/ag_agents?slug=eq.${encodeURIComponent(slug)}`,
    {
      method: 'PATCH',
      headers: headers(key),
      body: JSON.stringify({ active: false, updated_at: new Date().toISOString() }),
    }
  )
  if (!res.ok) throw new Error(`InsForge error ${res.status}: ${await res.text()}`)
}
