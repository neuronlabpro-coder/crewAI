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

// ── Usage / Analytics ────────────────────────────────────────────────────────

export interface UsageLog {
  log_id:           string
  session_id:       string
  agent_slug:       string
  client_id:        string | null
  tokens_used:      number
  model_used:       string
  response_time_ms: number
  created_at:       string
}

/** Usage logs for a specific agent (last N days). */
export async function getAgentUsageLogs(slug: string, days = 7): Promise<UsageLog[]> {
  const { db, key } = getConfig()
  const since = new Date(Date.now() - days * 86_400_000).toISOString()
  try {
    const res = await fetch(
      `${db}/ag_usage_logs?agent_slug=eq.${encodeURIComponent(slug)}&created_at=gte.${encodeURIComponent(since)}&order=created_at.asc`,
      { headers: headers(key), cache: 'no-store' }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

/** Logs from the last N days (default 7). Returns [] if table doesn't exist yet. */
export async function getUsageLogs(days = 7): Promise<UsageLog[]> {
  const { db, key } = getConfig()
  const since = new Date(Date.now() - days * 86_400_000).toISOString()
  try {
    const res = await fetch(
      `${db}/ag_usage_logs?created_at=gte.${encodeURIComponent(since)}&order=created_at.asc`,
      { headers: headers(key), cache: 'no-store' }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export interface DailyBucket { date: string; requests: number; tokens: number }

/** Aggregate usage logs into daily buckets for the last N days. */
export function bucketByDay(logs: UsageLog[], days = 7): DailyBucket[] {
  const buckets: Record<string, DailyBucket> = {}
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000)
    const key = d.toISOString().slice(0, 10)
    buckets[key] = { date: key, requests: 0, tokens: 0 }
  }
  for (const log of logs) {
    const day = log.created_at.slice(0, 10)
    if (buckets[day]) {
      buckets[day].requests += 1
      buckets[day].tokens   += log.tokens_used ?? 0
    }
  }
  return Object.values(buckets)
}

/** Top N most-called agents from the logs. */
export function topAgents(logs: UsageLog[], n = 5): { slug: string; count: number }[] {
  const counts: Record<string, number> = {}
  for (const log of logs) {
    counts[log.agent_slug] = (counts[log.agent_slug] ?? 0) + 1
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([slug, count]) => ({ slug, count }))
}
